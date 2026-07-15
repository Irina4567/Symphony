# Модуль 05. Doctrine ORM — основы

> Предыдущий модуль: [04 — Dependency Injection](04-dependency-injection.md)

---

## 5.1. Что такое Doctrine и как он соотносится с Symfony

**Doctrine ORM** — не часть Symfony, а отдельная независимая библиотека (аналог Eloquent в Laravel, но устроена принципиально иначе — по паттерну **Data Mapper**, а не **Active Record**).

- **Active Record** (Eloquent): сущность сама умеет себя сохранять — `$user->save()`.
- **Data Mapper** (Doctrine): сущность — простой PHP-объект (POPO/POJO-style), ничего не знает о базе данных. Сохранением занимается отдельный объект — **EntityManager**.

Это архитектурное отличие имеет важные следствия: сущности Doctrine легче тестировать (не нужна БД, чтобы создать объект и проверить его логику), они лучше подходят под DDD-подходы, но требуют немного больше кода для сохранения (`$em->persist($entity); $em->flush();`).

Установка (если не ставили в webapp-режиме):
```bash
composer require doctrine
composer require --dev doctrine/doctrine-fixtures-bundle symfony/maker-bundle
```

---

## 5.2. Entity — сущность

Сущность — PHP-класс, представляющий строку в таблице БД. Маппинг (соответствие свойств класса и колонок таблицы) в Symfony 7 задаётся через **атрибуты PHP 8**.

Создадим первую сущность генератором:

```bash
php bin/console make:entity Book
```

Мастер задаст вопросы интерактивно (имя поля, тип, nullable). Разберём итоговый файл вручную и дополним:

```php
<?php

namespace App\Entity;

use App\Repository\BookRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BookRepository::class)]
#[ORM\Table(name: 'books')]
class Book
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $title;

    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $description = null;

    #[ORM\Column]
    private int $priceKopecks = 0;

    #[ORM\Column]
    private bool $isAvailable = true;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;
        return $this;
    }

    public function getDescription(): ?string
    {
        return $this->description;
    }

    public function setDescription(?string $description): static
    {
        $this->description = $description;
        return $this;
    }

    public function getPriceKopecks(): int
    {
        return $this->priceKopecks;
    }

    public function setPriceKopecks(int $priceKopecks): static
    {
        $this->priceKopecks = $priceKopecks;
        return $this;
    }

    public function isAvailable(): bool
    {
        return $this->isAvailable;
    }

    public function setIsAvailable(bool $isAvailable): static
    {
        $this->isAvailable = $isAvailable;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
```

Обратите внимание на **fluent interface** (`return $this;` в сеттерах) — это конвенция генератора `make:entity`, удобная для цепочек вызовов: `(new Book())->setTitle('...')->setPriceKopecks(1000)`.

### Почему `DateTimeImmutable`, а не `DateTime`

`DateTime` — мутируемый объект: `$date->modify('+1 day')` меняет сам объект. Это источник неочевидных багов, когда объект передаётся по ссылке и меняется "где-то там". `DateTimeImmutable` при любой модификации возвращает **новый** объект, исходный остаётся неизменным — предсказуемое поведение. Doctrine и весь современный Symfony-код по умолчанию используют `DateTimeImmutable`.

### Почему цена в копейках (int), а не рубли (float)

Классическое правило работы с деньгами: **никогда не хранить деньги как float**. Из-за особенностей представления чисел с плавающей точкой `0.1 + 0.2 !== 0.3` в двоичной арифметике, и после десятков операций накапливается погрешность. Храним минимальную неделимую единицу (копейки/центы) как `int`, форматируем в рубли только на этапе вывода (см. модуль 02, Twig-фильтр `price`).

---

## 5.3. Миграции: как схема БД синхронизируется с сущностями

**Doctrine Migrations** — отдельный бандл, который сравнивает текущее состояние сущностей (маппинг) с реальной схемой БД и генерирует SQL для приведения БД в соответствие.

```bash
# Создать БД (если ещё не создана)
php bin/console doctrine:database:create

# Сгенерировать миграцию на основе разницы между сущностями и текущей схемой БД
php bin/console make:migration

# Применить все накопленные миграции к БД
php bin/console doctrine:migrations:migrate

# Откатить последнюю миграцию
php bin/console doctrine:migrations:migrate prev
```

Сгенерированный файл миграции (`migrations/VersionXXXXXXXXXXXXXX.php`) выглядит так:

```php
final class Version20260101120000 extends AbstractMigration
{
    public function up(Schema $schema): void
    {
        $this->addSql('CREATE TABLE books (id SERIAL NOT NULL, title VARCHAR(255) NOT NULL, description TEXT DEFAULT NULL, price_kopecks INT NOT NULL, is_available BOOLEAN NOT NULL, created_at TIMESTAMP(0) NOT NULL, PRIMARY KEY(id))');
    }

    public function down(Schema $schema): void
    {
        $this->addSql('DROP TABLE books');
    }
}
```

**Ключевое правило продакшена: миграции коммитятся в Git и накатываются на боевой БД как часть деплоя** — никогда не используйте `doctrine:schema:update --force` (прямая синхронизация схемы без истории миграций) в production, только для быстрого прототипирования локально. Причины: миграции — это версионируемая история изменений схемы, их можно откатить, они проходят код-ревью, они безопасно применяются на уже наполненной данными БД (в отличие от `schema:update`, который может решить "проще удалить и создать колонку заново", потеряв данные).

```bash
# ТОЛЬКО для локальной разработки/прототипирования — никогда на shared/prod БД
php bin/console doctrine:schema:update --force
php bin/console doctrine:schema:update --dump-sql   # посмотреть SQL без применения
```

---

## 5.4. EntityManager — сердце Doctrine

`EntityManager` (`EntityManagerInterface`) — сервис, который управляет жизненным циклом сущностей: отслеживает изменения (Unit of Work), сохраняет, удаляет, кэширует identity map.

```php
use Doctrine\ORM\EntityManagerInterface;

class BookAdminController extends AbstractController
{
    #[Route('/admin/books/new', name: 'admin_book_new', methods: ['POST'])]
    public function new(Request $request, EntityManagerInterface $em): Response
    {
        $book = new Book();
        $book->setTitle($request->request->get('title'));
        $book->setPriceKopecks((int) $request->request->get('price'));

        $em->persist($book);   // "поставить в очередь на сохранение" — SQL ещё НЕ выполнен
        $em->flush();          // здесь Doctrine реально выполняет INSERT/UPDATE

        return $this->redirectToRoute('catalog_show', ['id' => $book->getId()]);
    }
}
```

### persist() vs flush()

Это ключевое различие, которое обязательно нужно понять:

- **`persist($entity)`** — сообщает EntityManager'у "начни отслеживать эту новую сущность", но **не выполняет никакого SQL**. Сущность переходит в состояние `MANAGED`.
- **`flush()`** — вычисляет разницу между тем, что менеджер отслеживает, и текущим состоянием базы, и выполняет **все накопленные** SQL-запросы одной пачкой (обычно в одной транзакции).

Это значит, что можно "накопить" много изменений и отправить их в базу одним вызовом `flush()` — эффективнее, чем дёргать базу после каждого изменения:

```php
foreach ($csvRows as $row) {
    $book = new Book();
    $book->setTitle($row['title'])->setPriceKopecks($row['price']);
    $em->persist($book);
}
$em->flush(); // один flush на все 1000 книг (но см. модуль 06 про батчинг для больших объёмов)
```

### Состояния сущности (жизненный цикл)

```
NEW (new Book())
  │  persist()
  ▼
MANAGED  ── flush() ──▶  строка в БД, дальнейшие изменения свойств
  │                       отслеживаются автоматически (dirty checking)
  │  remove()
  ▼
REMOVED  ── flush() ──▶  DELETE FROM
```

**Важно:** для `MANAGED` сущностей `flush()` **сам обнаруживает изменения** (dirty checking) — не нужно повторно вызывать `persist()`, если вы просто поменяли значение через сеттер уже загруженной сущности:

```php
$book = $bookRepository->find(1);
$book->setPriceKopecks(99900);  // Doctrine "видит" это изменение
$em->flush();                    // выполнится UPDATE — persist() здесь не нужен
```

### Обновление существующей записи

```php
#[Route('/admin/books/{id}/edit', name: 'admin_book_edit', methods: ['POST'])]
public function edit(Book $book, Request $request, EntityManagerInterface $em): Response
{
    $book->setTitle($request->request->get('title'));
    // $em->persist($book) НЕ нужен — сущность уже MANAGED (загружена через EntityValueResolver)
    $em->flush();

    return $this->redirectToRoute('catalog_show', ['id' => $book->getId()]);
}
```

### Удаление

```php
$em->remove($book);
$em->flush();
```

---

## 5.5. Repository — где искать данные

**Repository** — объект, инкапсулирующий логику поиска сущностей определённого типа. Каждая сущность по умолчанию получает свой репозиторий (указан в `#[ORM\Entity(repositoryClass: ...)]`).

```php
<?php

namespace App\Repository;

use App\Entity\Book;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

class BookRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Book::class);
    }

    /** @return Book[] */
    public function findAvailable(): array
    {
        return $this->createQueryBuilder('b')
            ->andWhere('b.isAvailable = true')
            ->orderBy('b.createdAt', 'DESC')
            ->getQuery()
            ->getResult();
    }
}
```

Базовые методы, доступные "из коробки" на любом `ServiceEntityRepository` (наследуются от `EntityRepository`):

```php
$bookRepository->find(5);                                      // по первичному ключу
$bookRepository->findAll();                                     // все записи
$bookRepository->findBy(['isAvailable' => true], ['title' => 'ASC'], 10, 0); // критерии, сортировка, лимит, оффсет
$bookRepository->findOneBy(['title' => 'Чистый код']);
$bookRepository->count(['isAvailable' => true]);
```

**Внедрение репозитория в контроллер/сервис** — просто через autowiring, как любой сервис:

```php
class CatalogController extends AbstractController
{
    #[Route('/catalog', name: 'catalog_index')]
    public function index(BookRepository $bookRepository): Response
    {
        return $this->render('catalog/index.html.twig', [
            'books' => $bookRepository->findAvailable(),
        ]);
    }
}
```

---

## 5.6. QueryBuilder и DQL

**DQL (Doctrine Query Language)** — язык запросов, похожий на SQL, но оперирующий **классами и свойствами сущностей**, а не таблицами и колонками. Doctrine транслирует DQL в реальный SQL под конкретную СУБД.

```php
// Через DQL напрямую
$query = $em->createQuery(
    'SELECT b FROM App\Entity\Book b WHERE b.priceKopecks < :maxPrice ORDER BY b.createdAt DESC'
)->setParameter('maxPrice', 200000);
$books = $query->getResult();
```

**QueryBuilder** — тот же DQL, но собираемый программно через fluent-интерфейс, что удобнее для динамических условий:

```php
public function search(?string $term, ?int $maxPriceKopecks, int $page, int $limit): array
{
    $qb = $this->createQueryBuilder('b')
        ->andWhere('b.isAvailable = true');

    if ($term !== null) {
        $qb->andWhere('b.title LIKE :term')
           ->setParameter('term', '%' . $term . '%');
    }

    if ($maxPriceKopecks !== null) {
        $qb->andWhere('b.priceKopecks <= :maxPrice')
           ->setParameter('maxPrice', $maxPriceKopecks);
    }

    return $qb->orderBy('b.createdAt', 'DESC')
        ->setFirstResult(($page - 1) * $limit)
        ->setMaxResults($limit)
        ->getQuery()
        ->getResult();
}
```

**Важно про безопасность:** всегда используйте `setParameter()` вместо конкатенации строк в условиях — это защищает от SQL-инъекций точно так же, как подготовленные выражения (prepared statements) в чистом SQL/PDO.

```php
// НИКОГДА так не делайте:
$qb->andWhere("b.title LIKE '%$term%'"); // SQL-инъекция!
```

### getResult() vs getOneOrNullResult() vs getSingleScalarResult()

```php
$query->getResult();              // массив сущностей (или пустой массив)
$query->getOneOrNullResult();     // одна сущность или null, исключение при >1 результате
$query->getSingleScalarResult();  // одно скалярное значение, напр. для COUNT(*)
$query->getArrayResult();         // массив массивов (не гидратируется в объекты — быстрее для read-only отчётов)
```

---

## 5.7. Связи между сущностями (Associations)

Добавим `Author` и `Category`, свяжем с `Book`.

### ManyToOne / OneToMany — "у книги один автор, у автора много книг"

```php
// src/Entity/Author.php
#[ORM\Entity(repositoryClass: AuthorRepository::class)]
class Author
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private string $fullName;

    #[ORM\OneToMany(mappedBy: 'author', targetEntity: Book::class)]
    private Collection $books;

    public function __construct()
    {
        $this->books = new ArrayCollection();
    }
    // геттеры/сеттеры...
}
```

```php
// src/Entity/Book.php — добавляем связь
#[ORM\ManyToOne(targetEntity: Author::class, inversedBy: 'books')]
#[ORM\JoinColumn(nullable: false)]
private ?Author $author = null;

public function getAuthor(): ?Author
{
    return $this->author;
}

public function setAuthor(?Author $author): static
{
    $this->author = $author;
    return $this;
}
```

**Владеющая сторона (owning side) vs обратная (inverse side).** Это критически важное понятие в Doctrine: физически в БД внешний ключ (`author_id`) хранится только в таблице `books`. Сторона с `#[ORM\JoinColumn]` (или `#[ORM\ManyToOne]` без `mappedBy`) — **владеющая**, именно её изменения записываются в БД. Сторона с `mappedBy` — **обратная**, она только *отражает* связь для удобства чтения из PHP, но сама по себе изменения не сохраняет.

**Частая ошибка:** установить связь только на обратной стороне и удивляться, что в БД ничего не сохранилось:
```php
$author->getBooks()->add($book); // НЕ сработает само по себе для сохранения FK!
$em->flush();
// правильно:
$book->setAuthor($author); // это владеющая сторона — именно так проставляется FK
$em->flush();
```

### ManyToMany — "у книги много категорий, у категории много книг"

```php
// src/Entity/Book.php
#[ORM\ManyToMany(targetEntity: Category::class, inversedBy: 'books')]
#[ORM\JoinTable(name: 'book_category')]
private Collection $categories;

public function __construct()
{
    $this->categories = new ArrayCollection();
    // ...
}

public function addCategory(Category $category): static
{
    if (!$this->categories->contains($category)) {
        $this->categories->add($category);
    }
    return $this;
}

public function removeCategory(Category $category): static
{
    $this->categories->removeElement($category);
    return $this;
}
```

Doctrine автоматически создаёт промежуточную таблицу `book_category` с двумя внешними ключами — вручную создавать сущность для неё не нужно (если только в этой связующей таблице не требуются дополнительные поля, например `created_at` — тогда это уже отдельная полноценная сущность-связка, паттерн "ассоциативная сущность").

### OneToOne

```php
#[ORM\OneToOne(targetEntity: BookMetadata::class, cascade: ['persist', 'remove'])]
#[ORM\JoinColumn(nullable: true)]
private ?BookMetadata $metadata = null;
```

### N+1 проблема и её решение

Классическая ловушка ORM: если вывести список из 20 книг и для каждой обратиться к `$book->getAuthor()->getFullName()`, Doctrine выполнит **1 запрос на список книг + 20 запросов на авторов** — потому что по умолчанию связи загружаются **лениво** (lazy loading), при первом реальном обращении к свойству.

Решение — **eager loading через JOIN** прямо в исходном запросе:

```php
public function findAllWithAuthors(): array
{
    return $this->createQueryBuilder('b')
        ->addSelect('a')                  // важно: добавляем author в SELECT, иначе JOIN будет, а гидрации не будет
        ->innerJoin('b.author', 'a')
        ->getQuery()
        ->getResult();
}
```

Теперь это **один** SQL-запрос с `JOIN authors`, и `$book->getAuthor()` уже не требует дополнительного похода в базу — объект `Author` был гидратирован сразу вместе с книгой.

**Инструмент диагностики N+1**: Symfony Profiler (Doctrine-панель) в dev-окружении показывает количество и время SQL-запросов на странице — если видите десятки одинаковых по структуре запросов, отличающихся только параметром `id`, это она — проблема N+1.

---

## 5.8. Фикстуры (тестовые данные)

```bash
composer require --dev doctrine/doctrine-fixtures-bundle
php bin/console make:fixtures BookFixtures
```

```php
<?php

namespace App\DataFixtures;

use App\Entity\Author;
use App\Entity\Book;
use Doctrine\Bundle\FixturesBundle\Fixture;
use Doctrine\Persistence\ObjectManager;

class BookFixtures extends Fixture
{
    public function load(ObjectManager $manager): void
    {
        $author = (new Author())->setFullName('Роберт Мартин');
        $manager->persist($author);

        for ($i = 1; $i <= 20; $i++) {
            $book = (new Book())
                ->setTitle("Тестовая книга $i")
                ->setPriceKopecks(random_int(50000, 300000))
                ->setAuthor($author);
            $manager->persist($book);
        }

        $manager->flush();
    }
}
```

```bash
php bin/console doctrine:fixtures:load   # ВНИМАНИЕ: по умолчанию очищает БД перед загрузкой!
```

---

## 5.9. Практика модуля 5

**Задание 1.** Создайте сущность `Category` (`name`, `slug`) и настройте `ManyToMany` связь с `Book`. Сгенерируйте и примените миграцию.

**Задание 2.** Напишите метод `BookRepository::findByCategory(Category $category): array` с использованием QueryBuilder и `JOIN`.

**Задание 3.** Продемонстрируйте N+1 проблему: выведите 10 книг с авторами в Twig без `addSelect('a')`, посмотрите количество запросов в профайлере (`/_profiler`), затем исправьте через eager loading и сравните количество запросов до/после.

**Задание 4.** Напишите фикстуры, создающие 5 авторов и 30 книг со случайным распределением по 3 категориям.

### Решения

<details>
<summary>Решение задания 2</summary>

```php
public function findByCategory(Category $category): array
{
    return $this->createQueryBuilder('b')
        ->innerJoin('b.categories', 'c')
        ->andWhere('c = :category')
        ->setParameter('category', $category)
        ->orderBy('b.title', 'ASC')
        ->getQuery()
        ->getResult();
}
```
</details>

---

## 5.10. Частые ошибки новичков

1. **Забывают `flush()`** после `persist()`/`remove()` — изменения "теряются" (на самом деле просто не отправлены в БД).
2. **Устанавливают связь только на inverse-стороне** (`mappedBy`) и удивляются, что FK не сохранился (см. раздел 5.7).
3. **Хранят деньги как `float`.** Через несколько операций умножения/деления накапливается погрешность округления.
4. **Не замечают N+1-проблему**, пока приложение не начинает "тормозить" под реальной нагрузкой с сотнями записей.
5. **Используют `doctrine:schema:update --force` на проде.** Это может уничтожить данные — только миграции.
6. **Забывают `setParameter()`** и конкатенируют пользовательский ввод прямо в DQL/QueryBuilder — SQL-инъекция.
7. **Путают `getResult()` и `getOneOrNullResult()`** — используют `getResult()[0] ?? null` вместо специально предназначенного метода.

---

## Чек-лист "Я умею" — Модуль 5

- [ ] Объяснить разницу между Data Mapper (Doctrine) и Active Record
- [ ] Создавать сущности с атрибутами маппинга, генерировать и применять миграции
- [ ] Понимать разницу `persist()`/`flush()`/dirty checking
- [ ] Писать методы репозитория через QueryBuilder с безопасными параметрами
- [ ] Настраивать связи OneToMany/ManyToOne/ManyToMany, понимать owning/inverse side
- [ ] Диагностировать и решать проблему N+1 через eager loading (`addSelect` + `join`)
- [ ] Наполнять БД тестовыми данными через фикстуры

**Дальше:** [Модуль 06 — Doctrine ORM: продвинутый уровень](06-doctrine-orm-prodvinutyj.md)
