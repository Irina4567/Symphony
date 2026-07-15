# Модуль 27. Event Sourcing и полноценный CQRS

> Предыдущий модуль: [26 — Продвинутая аутентификация](26-prodvinutaya-autentifikaciya.md)
>
> В модуле 18 мы разобрали "CQRS-light" — простое разделение команд и запросов внутри обычной CRUD-архитектуры. Здесь — полноценные паттерны для действительно сложных доменов, где важна не только текущая, но и **историческая** картина изменений (аудит, финансы, логистика).

---

## 27.1. Проблема, которую решает Event Sourcing

Классический подход (модули 5-6): в БД хранится **текущее** состояние объекта. `UPDATE orders SET status = 'shipped'` — а какой был статус до этого, кто и когда его изменил, какие были промежуточные состояния — эта информация **потеряна**, если явно не логировалась отдельно.

**Event Sourcing** переворачивает модель: вместо хранения текущего состояния хранится **последовательность событий**, которые к нему привели. Текущее состояние — это просто результат "проигрывания" (replay) всех событий по порядку.

```
Традиционный подход:            Event Sourcing:
┌─────────────────┐            ┌─────────────────────────────┐
│ orders           │            │ event_store                  │
│ id | status       │            │ OrderPlaced(id=1)             │
│ 1  | shipped       │            │ OrderPaid(id=1)                │
└─────────────────┘            │ OrderShipped(id=1)              │
                                │ → replay → status = shipped   │
                                └─────────────────────────────┘
```

### Когда это оправдано

Event Sourcing — мощный, но **дорогой** архитектурно паттерн. Оправдан, когда:
- Требуется полный аудит изменений "из коробки" (финансы, юридически значимые операции).
- Нужна возможность "проиграть" историю заново с другой бизнес-логикой (например, пересчитать аналитику задним числом).
- Domain явно "событийный" по своей природе (банкинг, логистика, биллинг).

**Не оправдан** для большинства обычных CRUD-приложений — избыточная сложность без соразмерной выгоды. BookNest как учебный e-commerce проект не требует полноценного Event Sourcing для всей системы — но применим точечно, например, именно к домену заказов, где аудит важен.

---

## 27.2. Event Store — что это и как устроено

**Event Store** — специализированное хранилище неизменяемых (append-only) событий. Можно реализовать поверх обычной реляционной БД (простой вариант, чего обычно достаточно) или специализированного решения (EventStoreDB, Kafka как event log).

```php
#[ORM\Entity]
#[ORM\Table(name: 'event_store')]
class StoredEvent
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 36)]
    private string $aggregateId;

    #[ORM\Column(length: 255)]
    private string $eventType;

    #[ORM\Column(type: Types::JSON)]
    private array $payload;

    #[ORM\Column]
    private int $version;   // порядковый номер события для данного агрегата — критично для конкурентной записи

    #[ORM\Column]
    private \DateTimeImmutable $occurredAt;
}
```

**Важный инвариант**: события **никогда не изменяются и не удаляются** после записи — это лог фактов ("это произошло"), а не текущее состояние ("это есть сейчас"). Если нужно "исправить ошибку" — записывается новое компенсирующее событие, а не правится старое.

---

## 27.3. Aggregate — доменный объект, восстанавливаемый из событий

```php
<?php

namespace App\Domain\Order;

final class OrderAggregate
{
    private string $id;
    private string $status = 'draft';
    private array $items = [];
    private array $uncommittedEvents = [];
    private int $version = 0;

    public static function place(string $id, string $customerEmail, array $items): self
    {
        $aggregate = new self();
        $aggregate->apply(new OrderPlaced($id, $customerEmail, $items));
        return $aggregate;
    }

    public function pay(): void
    {
        if ($this->status !== 'draft') {
            throw new \DomainException("Нельзя оплатить заказ в статусе {$this->status}");
        }
        $this->apply(new OrderPaid($this->id));
    }

    public function ship(): void
    {
        if ($this->status !== 'paid') {
            throw new \DomainException("Нельзя отправить неоплаченный заказ");
        }
        $this->apply(new OrderShipped($this->id));
    }

    // Применение события — единственное место, где меняется состояние агрегата
    private function apply(object $event, bool $isNew = true): void
    {
        match (true) {
            $event instanceof OrderPlaced => $this->onOrderPlaced($event),
            $event instanceof OrderPaid   => $this->onOrderPaid($event),
            $event instanceof OrderShipped => $this->onOrderShipped($event),
        };

        $this->version++;
        if ($isNew) {
            $this->uncommittedEvents[] = $event;
        }
    }

    private function onOrderPlaced(OrderPlaced $event): void
    {
        $this->id = $event->orderId;
        $this->items = $event->items;
        $this->status = 'draft';
    }

    private function onOrderPaid(OrderPaid $event): void
    {
        $this->status = 'paid';
    }

    private function onOrderShipped(OrderShipped $event): void
    {
        $this->status = 'shipped';
    }

    // Восстановление агрегата из истории событий (реплей)
    public static function reconstituteFromEvents(iterable $events): self
    {
        $aggregate = new self();
        foreach ($events as $event) {
            $aggregate->apply($event, isNew: false);
        }
        return $aggregate;
    }

    public function pullUncommittedEvents(): array
    {
        $events = $this->uncommittedEvents;
        $this->uncommittedEvents = [];
        return $events;
    }

    public function getVersion(): int
    {
        return $this->version;
    }
}
```

Ключевая идея: **весь публичный API агрегата — это методы-команды** (`pay()`, `ship()`), которые внутри себя проверяют инварианты и порождают события. Состояние никогда не меняется напрямую (нет сеттеров) — только через `apply()`.

---

## 27.4. Repository для агрегатов на Event Store

```php
class EventSourcedOrderRepository
{
    public function __construct(private Connection $connection) {}

    public function save(OrderAggregate $aggregate, int $expectedVersion): void
    {
        $events = $aggregate->pullUncommittedEvents();

        $this->connection->transactional(function () use ($aggregate, $events, $expectedVersion) {
            // оптимистичная конкурентная проверка — предотвращает "потерянные" изменения
            $currentVersion = $this->getCurrentVersion($aggregate->getId());
            if ($currentVersion !== $expectedVersion) {
                throw new ConcurrencyException('Агрегат был изменён параллельно, повторите операцию');
            }

            foreach ($events as $i => $event) {
                $this->connection->insert('event_store', [
                    'aggregate_id' => $aggregate->getId(),
                    'event_type' => get_class($event),
                    'payload' => json_encode($event),
                    'version' => $expectedVersion + $i + 1,
                    'occurred_at' => (new \DateTimeImmutable())->format('Y-m-d H:i:s'),
                ]);
            }
        });
    }

    public function load(string $aggregateId): OrderAggregate
    {
        $rows = $this->connection->fetchAllAssociative(
            'SELECT * FROM event_store WHERE aggregate_id = ? ORDER BY version ASC',
            [$aggregateId],
        );

        $events = array_map(fn($row) => $this->deserializeEvent($row), $rows);

        return OrderAggregate::reconstituteFromEvents($events);
    }
}
```

Проверка `$currentVersion !== $expectedVersion` — это применение принципа **optimistic concurrency control** (похоже на `#[ORM\Version]` в обычном Doctrine) к событийной модели: если между загрузкой агрегата и сохранением кто-то другой уже записал новое событие, сохранение отклоняется, а не молча перезаписывает состояние.

---

## 27.5. Projections — построение read-моделей из событий

"Проигрывать" все события агрегата при каждом чтении (для отображения списка заказов) — дорого. **Projection (проекция)** — асинхронно (обычно через тот же Messenger/EventDispatcher) поддерживаемая "плоская" read-модель, оптимизированная под конкретный запрос:

```php
#[AsEventListener(event: OrderPaid::class)]
class OrderListProjectionUpdater
{
    public function __construct(private Connection $connection) {}

    public function __invoke(OrderPaid $event): void
    {
        // обновляем "плоскую" денормализованную таблицу для быстрого чтения списков
        $this->connection->update('order_list_projection',
            ['status' => 'paid'],
            ['order_id' => $event->orderId],
        );
    }
}
```

Это и есть настоящий **CQRS**: команды (`OrderAggregate::pay()`) работают с Event Store (source of truth), а запросы (`GET /admin/orders`) читают из отдельной, специально оптимизированной под чтение проекции — потенциально даже из другой БД (документной, поисковой — Elasticsearch для полнотекстового поиска по заказам).

### Пересборка проекции с нуля

Поскольку Event Store хранит **всю** историю, при изменении структуры проекции (новое поле, новый отчёт) её можно **пересобрать заново**, проиграв все исторические события — то, что невозможно в традиционной модели, где промежуточные состояния уже потеряны:

```php
#[AsCommand(name: 'app:rebuild-order-projection')]
class RebuildOrderProjectionCommand extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $this->connection->executeStatement('TRUNCATE order_list_projection');

        foreach ($this->eventStore->getAllEventsOrderedByTime() as $event) {
            $this->projectionUpdater->apply($event);
        }

        return Command::SUCCESS;
    }
}
```

---

## 27.6. Snapshots — оптимизация долгих агрегатов

Если у агрегата накопились тысячи событий (например, у клиента с многолетней историей заказов, если бы весь "аккаунт" был одним агрегатом — на практике так обычно не делают, но представим гипотетический долгоживущий агрегат), восстановление через полный replay становится медленным. **Snapshot** — периодически сохраняемый "снимок" состояния агрегата на определённой версии, чтобы не переигрывать всю историю с нуля:

```php
public function load(string $aggregateId): OrderAggregate
{
    $snapshot = $this->snapshotStore->findLatest($aggregateId);

    $fromVersion = $snapshot?->getVersion() ?? 0;
    $events = $this->eventStore->getEventsAfterVersion($aggregateId, $fromVersion);

    $aggregate = $snapshot
        ? OrderAggregate::fromSnapshot($snapshot)
        : new OrderAggregate();

    foreach ($events as $event) {
        $aggregate->apply($event, isNew: false);
    }

    return $aggregate;
}
```

---

## 27.7. Trade-offs — честная оценка сложности

**Плюсы:**
- Полный, неизменяемый аудит "что и когда произошло" — бесплатно, это встроено в саму модель.
- Возможность строить сколько угодно разных read-моделей (проекций) под разные нужды из одного источника истины.
- "Путешествие во времени" — можно восстановить состояние на любой момент прошлого.
- Естественная интеграция с событийной архитектурой (модуль 14) — агрегат и так уже "думает" событиями.

**Минусы:**
- Существенно выше порог входа для команды — обычный CRUD-разработчик первое время путается в новой ментальной модели.
- Схема событий должна поддерживать эволюцию (версионирование событий) — что делать, если структура `OrderPlaced` меняется через год, а старые события в базе — старого формата?
- Больше движущихся частей — Event Store, проекции, механизм их асинхронного обновления, необходимость догонять "eventual consistency" между записью события и обновлением проекции.
- Отладка сложнее — баг может быть не в текущем коде, а в том, как исторические события были записаны и интерпретированы.

**Правило senior-разработчика:** применяйте Event Sourcing **точечно**, к конкретному bounded context, где это оправдано (в BookNest — разумно для домена заказов, где важен аудит финансовых операций), а не ко всему приложению целиком "потому что это модно". Большая часть системы (каталог, авторы, категории) прекрасно продолжает жить на обычном CRUD из модулей 5-6.

---

## 27.8. Практика модуля 27

**Задание 1.** Реализуйте `OrderAggregate` с событиями `OrderPlaced`, `OrderPaid`, `OrderShipped`, `OrderCancelled`, включая проверку допустимых переходов внутри самих команд агрегата.

**Задание 2.** Реализуйте `EventSourcedOrderRepository::save()`/`load()` поверх простой SQL-таблицы `event_store`, включая проверку `expectedVersion` для конкурентного доступа.

**Задание 3.** Постройте проекцию `order_list_projection` для быстрого отображения списка заказов администратору, обновляемую подписчиками на события агрегата.

**Задание 4.** Напишите консольную команду пересборки проекции с нуля и продемонстрируйте, что после изменения структуры проекции (добавления нового столбца, например `total_kopecks`) её можно корректно заполнить из полной истории событий.

---

## 27.9. Частые ошибки

1. **Применяют Event Sourcing ко всему приложению**, включая простые справочники (категории, авторы) — неоправданное усложнение.
2. **Позволяют изменять/удалять уже записанные события** — нарушает фундаментальный инвариант append-only лога.
3. **Не версионируют события** — структура `OrderPlaced` меняется, старые записи в Event Store становится невозможно корректно десериализовать без миграции событий или explicit upgrade-логики.
4. **Забывают про eventual consistency** проекций — читают проекцию сразу после записи события, не учитывая, что обновление проекции может быть асинхронным и ещё не успеть примениться.
5. **Не реализуют оптимистичную блокировку по версии** при сохранении — при параллельном изменении одного агрегата события могут записаться в неверном порядке или конфликтующим образом.

---

## Чек-лист "Я умею" — Модуль 27

- [ ] Объяснить принципиальное отличие Event Sourcing от хранения текущего состояния
- [ ] Реализовывать Aggregate с командами, порождающими события, и защитой инвариантов
- [ ] Строить Event Store поверх реляционной БД с контролем версий (optimistic concurrency)
- [ ] Строить и пересобирать Projections (read-модели) из истории событий
- [ ] Понимать назначение Snapshots для длинных агрегатов
- [ ] Честно оценивать trade-off Event Sourcing и применять его точечно, а не повсеместно

**Дальше:** [Модуль 28 — Создание и публикация переиспользуемых бандлов](28-sozdanie-bandlov.md)
