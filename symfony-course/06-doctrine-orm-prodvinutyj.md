# Модуль 06. Doctrine ORM — продвинутый уровень

> Предыдущий модуль: [05 — Doctrine ORM: основы](05-doctrine-orm-osnovy.md)

---

## 6.1. Lifecycle Callbacks — реакция на события сущности

Иногда нужно выполнить логику прямо перед/после сохранения конкретной сущности — например, автоматически проставить `updatedAt`.

```php
#[ORM\Entity]
#[ORM\HasLifecycleCallbacks]
class Book
{
    // ...
    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    #[ORM\PreUpdate]
    public function updateTimestamp(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }
}
```

Доступные хуки: `#[ORM\PrePersist]`, `#[ORM\PostPersist]`, `#[ORM\PreUpdate]`, `#[ORM\PostUpdate]`, `#[ORM\PreRemove]`, `#[ORM\PostRemove]`, `#[ORM\PostLoad]`.

**Важное ограничение:** внутри Lifecycle Callback **нельзя** внедрить сервисы (нет DI) — это простой метод самой сущности, у него нет доступа к контейнеру. Если нужна логика с зависимостями (например, отправить событие через `EventDispatcher` или обратиться к другому сервису) — используйте **Doctrine Event Listener/Subscriber** (следующий раздел), а не Lifecycle Callback.

---

## 6.2. Doctrine Event Listeners/Subscribers

Более мощный механизм — слушатели на уровне `EntityManager`, у которых **есть** доступ к DI:

```php
<?php

namespace App\EventListener;

use App\Entity\Order;
use Doctrine\Bundle\DoctrineBundle\Attribute\AsEntityListener;
use Doctrine\ORM\Event\PostPersistEventArgs;
use Psr\Log\LoggerInterface;

#[AsEntityListener(event: 'postPersist', entity: Order::class)]
class OrderCreatedListener
{
    public function __construct(private LoggerInterface $logger) {}

    public function postPersist(Order $order, PostPersistEventArgs $args): void
    {
        $this->logger->info(sprintf('Создан заказ #%d на сумму %d коп.', $order->getId(), $order->getTotalKopecks()));
        // здесь же можно диспатчить доменное событие (см. модуль 14)
    }
}
```

**Когда использовать что:**
- **Lifecycle Callback** — простая логика внутри самой сущности без внешних зависимостей (проставить дату, посчитать slug).
- **Doctrine Listener** — логика, требующая сервисов (логирование, отправка событий, обращение к внешнему API).
- **Доменное событие через EventDispatcher** (модуль 14) — если реакция должна быть отделена от слоя персистентности вообще (рекомендуется для серьёзной бизнес-логики — не смешивайте "правила предметной области" с деталями ORM).

---

## 6.3. Кастомные типы Doctrine (Custom DBAL Types)

Если нужен value object вместо примитива (например, `Email`, `Money`, `Slug`), Doctrine позволяет создать собственный тип колонки:

```php
<?php

namespace App\Doctrine;

use App\ValueObject\Money;
use Doctrine\DBAL\Platforms\AbstractPlatform;
use Doctrine\DBAL\Types\Type;

class MoneyType extends Type
{
    public function getSQLDeclaration(array $column, AbstractPlatform $platform): string
    {
        return 'INT';
    }

    public function convertToPHPValue($value, AbstractPlatform $platform): ?Money
    {
        return $value === null ? null : Money::fromKopecks((int) $value);
    }

    public function convertToDatabaseValue($value, AbstractPlatform $platform): ?int
    {
        return $value === null ? null : $value->toKopecks();
    }

    public function getName(): string
    {
        return 'money';
    }
}
```

Регистрация:
```yaml
# config/packages/doctrine.yaml
doctrine:
    dbal:
        types:
            money: App\Doctrine\MoneyType
```

```php
#[ORM\Column(type: 'money')]
private Money $price;
```

Это продвинутая техника (Value Objects в связке с Doctrine) — используйте, когда простого `int`/`string` уже не хватает для выражения бизнес-правил (например, `Money` умеет сама себя валидировать, обеспечивать неизменность валюты при сложении и т.д.).

---

## 6.4. Транзакции

Doctrine автоматически оборачивает каждый `flush()` в транзакцию БД. Но если нужно объединить **несколько** flush'ей или выполнить нативный SQL в рамках одной атомарной операции — используйте explicit-транзакции:

```php
$em->wrapInTransaction(function (EntityManagerInterface $em) use ($order, $items) {
    $em->persist($order);
    foreach ($items as $item) {
        $em->persist($item);
    }
    $em->flush();
    // если внутри колбэка выбросится исключение — Doctrine сама сделает ROLLBACK
});
```

Либо вручную:
```php
$em->getConnection()->beginTransaction();
try {
    // ...
    $em->flush();
    $em->getConnection()->commit();
} catch (\Throwable $e) {
    $em->getConnection()->rollBack();
    throw $e;
}
```

`wrapInTransaction` предпочтительнее — меньше шансов забыть `rollBack()` в `catch`.

---

## 6.5. Производительность: батчинг больших объёмов данных

Если вы вставляете 100 000 записей одним циклом `persist()` + один `flush()` в конце — Doctrine накопит все 100 000 объектов в памяти (Unit of Work), что приведёт к утечке памяти и деградации производительности `flush()`, который пытается вычислить diff по всей огромной куче объектов разом.

**Правильный подход — периодический flush + clear:**

```php
$batchSize = 500;
$i = 0;

foreach ($csvRows as $row) {
    $book = new Book();
    $book->setTitle($row['title'])->setPriceKopecks((int) $row['price']);
    $em->persist($book);

    if (++$i % $batchSize === 0) {
        $em->flush();
        $em->clear();   // очищает Unit of Work — все MANAGED-сущности "отсоединяются"
    }
}
$em->flush(); // финальный неполный батч
```

`$em->clear()` отсоединяет **все** отслеживаемые сущности от EntityManager — будьте внимательны, если после батча вам нужны ссылки на ранее сохранённые объекты (например, `$author`, использованный во всех итерациях) — после `clear()` они станут `DETACHED`, и повторное использование в новых `persist()`-цепочках потребует `$em->merge()` или повторной загрузки через `find()`.

Для по-настоящему больших объёмов (миллионы строк) часто эффективнее **массовые SQL-запросы напрямую через DBAL** (`INSERT ... VALUES (...), (...), (...)`), минуя ORM-гидратацию — Doctrine ORM не предназначен для bulk-операций такого масштаба.

---

## 6.6. Индексы и оптимизация схемы

Индексы задаются прямо на сущности:

```php
#[ORM\Entity]
#[ORM\Table(name: 'books')]
#[ORM\Index(columns: ['title'], name: 'idx_book_title')]
#[ORM\Index(columns: ['is_available', 'created_at'], name: 'idx_book_available_created')]
class Book
{
    // ...
}
```

Полезные правила:
- Индексируйте колонки, по которым часто фильтруете (`WHERE`) или сортируете (`ORDER BY`).
- Составной индекс `(is_available, created_at)` эффективен для запроса `WHERE is_available = true ORDER BY created_at DESC`, но **не** поможет запросу, фильтрующему только по `created_at` без `is_available` (порядок колонок в составном индексе имеет значение).
- Уникальные ограничения — через `#[ORM\UniqueConstraint]` или `unique: true` на колонке:
```php
#[ORM\Column(length: 255, unique: true)]
private string $slug;
```

---

## 6.7. Каскады и orphanRemoval

```php
#[ORM\OneToMany(mappedBy: 'order', targetEntity: OrderItem::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
private Collection $items;
```

- **`cascade: ['persist']`** — при `persist($order)` автоматически `persist()` вызовется и для всех `OrderItem` в коллекции (не нужно вызывать `persist()` на каждом отдельно).
- **`cascade: ['remove']`** — при удалении `Order` удалятся и все связанные `OrderItem`.
- **`orphanRemoval: true`** — если элемент **убрали из коллекции** (`$order->getItems()->removeElement($item)`), но сам `$order` не удаляли, Doctrine всё равно удалит "осиротевший" `OrderItem` из БД при следующем `flush()`. Это отличается от `cascade: remove`, который срабатывает только при удалении родителя целиком.

**Осторожно с каскадами:** избыточное использование `cascade: ['persist', 'remove']` "по умолчанию" на всех связях может привести к неожиданным массовым удалениям — включайте только там, где это действительно отражает бизнес-смысл "часть-целое" (Composition), а не просто ассоциацию.

---

## 6.8. Embeddable — встраиваемые объекты

Когда несколько полей логически образуют одну структуру (например, адрес доставки), но не заслуживают отдельной таблицы:

```php
#[ORM\Embeddable]
class Address
{
    #[ORM\Column(length: 255)]
    private string $city;

    #[ORM\Column(length: 255)]
    private string $street;

    #[ORM\Column(length: 20)]
    private string $postalCode;
    // геттеры/сеттеры
}
```

```php
#[ORM\Entity]
class Order
{
    #[ORM\Embedded(class: Address::class)]
    private Address $deliveryAddress;
}
```

В БД это по-прежнему одна таблица `orders` с колонками `delivery_address_city`, `delivery_address_street` и т.д. — но в PHP-коде это удобный целостный объект.

---

## 6.9. Постраничная навигация (Pagination)

Ручной вариант через QueryBuilder (уже видели в модуле 5), либо специализированный компонент **Doctrine Paginator**, который правильно считает `COUNT(*)` при наличии `JOIN`-ов (простой `count($result)` после `LIMIT` даст неверную цифру):

```php
use Doctrine\ORM\Tools\Pagination\Paginator;

public function paginate(int $page, int $limit): Paginator
{
    $query = $this->createQueryBuilder('b')
        ->setFirstResult(($page - 1) * $limit)
        ->setMaxResults($limit)
        ->getQuery();

    return new Paginator($query, fetchJoinCollection: true);
}
```

```php
$paginator = $bookRepository->paginate($page, 12);
$total = count($paginator);          // корректный total даже с JOIN'ами
$books = iterator_to_array($paginator);
```

В реальных проектах часто используют готовый бандл `KnpPaginatorBundle` — но важно понимать, что он делает "под капотом" именно то, что мы только что разобрали.

---

## 6.10. Практика: расширяем BookNest

Добавим `Order`/`OrderItem` с каскадами и Doctrine Listener для логирования.

```php
#[ORM\Entity]
class Order
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 20)]
    private string $status = 'new';

    #[ORM\OneToMany(mappedBy: 'order', targetEntity: OrderItem::class, cascade: ['persist'], orphanRemoval: true)]
    private Collection $items;

    #[ORM\Embedded(class: Address::class)]
    private Address $deliveryAddress;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->items = new ArrayCollection();
        $this->createdAt = new \DateTimeImmutable();
    }

    public function addItem(OrderItem $item): static
    {
        if (!$this->items->contains($item)) {
            $this->items->add($item);
            $item->setOrder($this);
        }
        return $this;
    }

    public function getTotalKopecks(): int
    {
        return array_sum(array_map(
            fn(OrderItem $item) => $item->getPriceKopecks() * $item->getQuantity(),
            $this->items->toArray(),
        ));
    }
    // остальные геттеры/сеттеры...
}
```

```php
#[ORM\Entity]
class OrderItem
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Order::class, inversedBy: 'items')]
    #[ORM\JoinColumn(nullable: false)]
    private ?Order $order = null;

    #[ORM\ManyToOne(targetEntity: Book::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?Book $book = null;

    #[ORM\Column]
    private int $priceKopecks;   // цена на момент покупки — фиксируем, чтобы будущее изменение цены книги не влияло на историю заказов

    #[ORM\Column]
    private int $quantity = 1;
    // геттеры/сеттеры...
}
```

Обратите внимание: `OrderItem` хранит `priceKopecks` **на момент покупки**, а не ссылается на текущую цену `Book`. Это важное архитектурное решение для e-commerce — исторические данные заказа не должны "плыть" при изменении каталога.

---

## 6.11. Практика модуля 6

**Задание 1.** Добавьте Lifecycle Callback `#[ORM\PrePersist]` на `Order`, который проставляет `createdAt`, если он ещё не задан (альтернатива инициализации в конструкторе).

**Задание 2.** Реализуйте批 импорт 10 000 книг из массива с батчингом `flush()`/`clear()` каждые 500 записей, замерьте время выполнения с батчингом и без (через `microtime(true)`).

**Задание 3.** Добавьте составной индекс на `OrderItem` по `(order_id, book_id)` и объясните, для какого запроса он был бы полезен.

**Задание 4.** Реализуйте `orphanRemoval` сценарий: удалите `OrderItem` из коллекции `Order::$items` без прямого вызова `$em->remove()`, убедитесь, что запись удалилась из БД после `flush()`.

### Решения

<details>
<summary>Решение задания 2 (набросок)</summary>

```php
$start = microtime(true);
$i = 0;
foreach ($rows as $row) {
    $book = (new Book())->setTitle($row['title'])->setPriceKopecks($row['price']);
    $em->persist($book);
    if (++$i % 500 === 0) {
        $em->flush();
        $em->clear();
    }
}
$em->flush();
echo microtime(true) - $start;
```

Без батчинга (`flush()` только в самом конце для всех 10 000 объектов) время выполнения и потребление памяти будут заметно выше — Unit of Work вынужден отслеживать все объекты одновременно и вычислять diff по всей куче разом при единственном `flush()`.
</details>

---

## 6.12. Частые ошибки новичков

1. **Пытаются внедрить сервис в Lifecycle Callback** — там нет DI, нужен Doctrine Event Listener.
2. **Забывают `$em->clear()` при батч-импорте** — программа "падает" по памяти на больших объёмах данных.
3. **Ссылаются на detached-сущности после `clear()`** — получают `EntityNotFoundException` или дубли в БД.
4. **Ставят `cascade: ['remove']` "на всякий случай"** — потом случайно удаляют связанные записи, которые должны были остаться (например, случайно удаляют `Author` вместе с `Book`, хотя автор используется в других книгах).
5. **Считают `count($result)` вместо `Paginator`** при пагинации с JOIN — получают неверное общее количество страниц.
6. **Хранят в `OrderItem` ссылку на актуальную цену `Book`** вместо цены на момент покупки — история заказов "плывёт" при изменении каталога.

---

## Чек-лист "Я умею" — Модуль 6

- [ ] Различать Lifecycle Callbacks и Doctrine Event Listeners, знать, когда что применять
- [ ] Работать с транзакциями через `wrapInTransaction`
- [ ] Батчить большие объёмы вставок (`flush()`/`clear()`)
- [ ] Настраивать индексы и понимать, когда составной индекс полезен
- [ ] Использовать `cascade` и `orphanRemoval` осознанно, понимая риски
- [ ] Работать с Embeddable-объектами
- [ ] Правильно пагинировать выборки с JOIN через `Doctrine Paginator`

**Дальше:** [Модуль 07 — Формы](07-formy.md)
