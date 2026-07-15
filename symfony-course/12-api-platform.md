# Модуль 12. API Platform

> Предыдущий модуль: [11 — Serializer и REST API](11-serializer-i-rest-api.md)

---

## 12.1. Что такое API Platform и когда его использовать

**API Platform** — надстройка над Symfony (использует Serializer, Validator, Doctrine из предыдущих модулей "под капотом"), которая **автоматически** генерирует REST и/или GraphQL API прямо из Doctrine-сущностей, включая:

- CRUD-операции без единой строчки контроллера,
- автогенерируемую документацию (OpenAPI/Swagger UI),
- фильтрацию, сортировку, пагинацию из коробки,
- content negotiation (JSON-LD, HAL, JSON:API, обычный JSON),
- интеграцию с Security (voters работают точно так же, как мы разобрали в модуле 10),
- валидацию (тот же Validator из модуля 08).

**Когда использовать:** когда у вас классический CRUD над сущностями и вы хотите получить полноценный, документированный API за минимум кода. **Когда НЕ стоит:** если API — это в основном нестандартные бизнес-операции (не CRUD), где "ручной" подход из модуля 11 будет прозрачнее и проще для новичков в проекте.

```bash
composer require api
```

---

## 12.2. Первый ресурс: `#[ApiResource]`

Самое впечатляющее в API Platform — то, насколько мало кода нужно для полноценного API:

```php
<?php

namespace App\Entity;

use ApiPlatform\Metadata\ApiResource;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity(repositoryClass: BookRepository::class)]
#[ApiResource]
class Book
{
    // ... те же поля, что и раньше
}
```

Всё. После этого атрибута доступны:
```
GET    /api/books
GET    /api/books/{id}
POST   /api/books
PUT    /api/books/{id}
PATCH  /api/books/{id}
DELETE /api/books/{id}
```

А также автоматически сгенерированная документация на `/api` (Swagger UI) и `/api/docs.json` (OpenAPI-спецификация).

---

## 12.3. Ограничение доступных операций

По умолчанию `#[ApiResource]` включает все CRUD-операции. Часто нужно ограничить (например, публичному API не нужен `DELETE`):

```php
use ApiPlatform\Metadata\{ApiResource, Get, GetCollection, Post};

#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN')"),
    ]
)]
class Book { /* ... */ }
```

Каждая операция может иметь собственные настройки — `security`, группы сериализации, кастомный путь, кастомный контроллер и т.д.

---

## 12.4. Группы сериализации в API Platform

Работает поверх того же Serializer из модуля 11, но настраивается прямо в `#[ApiResource]`:

```php
#[ApiResource(
    normalizationContext: ['groups' => ['book:read']],
    denormalizationContext: ['groups' => ['book:write']],
)]
class Book
{
    #[Groups(['book:read'])]
    private ?int $id = null;

    #[Groups(['book:read', 'book:write'])]
    private string $title;

    #[Groups(['book:read', 'book:write'])]
    private int $priceKopecks;

    #[Groups(['book:read'])]
    private ?Author $author = null;
}
```

Можно задавать группы и **на конкретную операцию** (например, список показывает меньше полей, чем детальная карточка):

```php
#[ApiResource(
    operations: [
        new GetCollection(normalizationContext: ['groups' => ['book:list']]),
        new Get(normalizationContext: ['groups' => ['book:read', 'book:details']]),
    ]
)]
```

---

## 12.5. Фильтры

API Platform предоставляет готовые фильтры для query-параметров без ручного кода:

```php
use ApiPlatform\Doctrine\Orm\Filter\{SearchFilter, RangeFilter, OrderFilter, BooleanFilter};

#[ApiResource]
#[ApiFilter(SearchFilter::class, properties: ['title' => 'partial', 'author.fullName' => 'partial'])]
#[ApiFilter(RangeFilter::class, properties: ['priceKopecks'])]
#[ApiFilter(OrderFilter::class, properties: ['priceKopecks', 'createdAt'])]
#[ApiFilter(BooleanFilter::class, properties: ['isAvailable'])]
class Book { /* ... */ }
```

Теперь автоматически работают запросы вида:
```
GET /api/books?title=симфони
GET /api/books?priceKopecks[gte]=50000&priceKopecks[lte]=200000
GET /api/books?order[priceKopecks]=asc
GET /api/books?isAvailable=true
GET /api/books?author.fullName=Мартин
```

### Пагинация

Работает автоматически:
```
GET /api/books?page=2
```
Настройки размера страницы:
```php
#[ApiResource(paginationItemsPerPage: 20, paginationMaximumItemsPerPage: 100)]
```

---

## 12.6. Валидация

Точно те же constraints из модуля 08 — API Platform их просто использует:

```php
#[ORM\Column]
#[Assert\Positive]
#[Groups(['book:write'])]
private int $priceKopecks;
```

При нарушении API Platform вернёт `422` со стандартизированным телом ошибки (формат `application/problem+json` — RFC 7807):
```json
{
    "@context": "/api/contexts/ConstraintViolationList",
    "@type": "ConstraintViolationList",
    "hydra:title": "An error occurred",
    "violations": [
        {"propertyPath": "priceKopecks", "message": "Цена должна быть положительным числом"}
    ]
}
```

---

## 12.7. Security на уровне ресурса и операции

Синтаксис похож на `access_control`, но использует Expression Language прямо в атрибуте, с доступом к текущему объекту через `object`:

```php
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN')"),
        new Put(security: "is_granted('ROLE_ADMIN') or object.getAuthor() == user"),
        new Delete(security: "is_granted('ROLE_ADMIN')"),
    ],
    security: "is_granted('ROLE_USER')", // применяется ко ВСЕМ операциям как базовое правило
)]
class Book { /* ... */ }
```

Voters из модуля 10 продолжают работать точно так же — можно и нужно использовать их внутри `security`-выражений:
```php
new Get(security: "is_granted('ORDER_VIEW', object)")
```

---

## 12.8. Кастомные операции и бизнес-логика

Когда операция — не просто CRUD (например, "отменить заказ" — это не `PATCH` произвольного поля, а осмысленное бизнес-действие), используется кастомный **State Processor**:

```php
#[ApiResource(
    operations: [
        new Get(),
        new Post(
            uriTemplate: '/orders/{id}/cancel',
            controller: CancelOrderController::class,
            name: 'cancel_order',
        ),
    ]
)]
class Order { /* ... */ }
```

```php
<?php

namespace App\Controller\Api;

use App\Entity\Order;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\Response;

class CancelOrderController extends AbstractController
{
    public function __invoke(Order $order, EntityManagerInterface $em): Order
    {
        if (!in_array($order->getStatus(), ['new', 'paid'], true)) {
            throw new \DomainException('Этот заказ уже нельзя отменить');
        }

        $order->setStatus('cancelled');
        $em->flush();

        return $order; // API Platform сам сериализует возвращённый объект
    }
}
```

Начиная с новых версий API Platform, рекомендуемый паттерн — **State Provider** (для чтения данных не из Doctrine напрямую) и **State Processor** (для записи с кастомной логикой) — более гибкая архитектура, разделяющая "откуда данные" и "как они трансформируются", но идея использования кастомного PHP-класса вместо голого CRUD остаётся той же.

---

## 12.9. DTO вместо сущности (Input/Output classes)

Если контракт API должен отличаться от структуры Doctrine-сущности:

```php
#[ApiResource(
    input: CreateBookInput::class,
    output: BookOutput::class,
)]
class Book { /* ... */ }
```

Это тот же принцип, что мы обсуждали в модуле 11 (раздел 11.5), но с "родной" интеграцией в API Platform — не нужно вручную писать контроллеры для маппинга DTO ↔ Entity, есть точки расширения (State Processor) для этой трансформации.

---

## 12.10. GraphQL (кратко)

API Platform умеет генерировать не только REST, но и GraphQL-эндпоинт из тех же ресурсов:

```bash
composer require webonyx/graphql-php
```

```php
#[ApiResource(
    graphQlOperations: [
        new QueryCollection(),
        new Query(),
        new Mutation(name: 'create'),
    ]
)]
class Book { /* ... */ }
```

Единая точка входа `/api/graphql`, запросы вида:
```graphql
query {
  books(first: 10) {
    edges {
      node {
        id
        title
        author { fullName }
      }
    }
  }
}
```

GraphQL — отдельная большая тема; здесь достаточно знать, что API Platform даёт его "почти бесплатно" поверх тех же ресурсов, если он нужен проекту (обычно оправдано для сложных клиентов с гибкими требованиями к выборке полей — мобильные приложения, SPA с богатым UI).

---

## 12.11. Практика: API Platform для каталога BookNest

```php
#[ORM\Entity(repositoryClass: BookRepository::class)]
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
        new Post(security: "is_granted('ROLE_ADMIN')"),
        new Patch(security: "is_granted('ROLE_ADMIN')"),
        new Delete(security: "is_granted('ROLE_ADMIN')"),
    ],
    normalizationContext: ['groups' => ['book:read']],
    denormalizationContext: ['groups' => ['book:write']],
    paginationItemsPerPage: 20,
)]
#[ApiFilter(SearchFilter::class, properties: ['title' => 'partial'])]
#[ApiFilter(RangeFilter::class, properties: ['priceKopecks'])]
class Book
{
    // поля с #[Groups] как в разделе 12.4
}
```

Готово — полноценное, документированное, отфильтрованное, авторизованное API каталога без единого контроллера.

---

## 12.12. Практика модуля 12

**Задание 1.** Настройте `#[ApiResource]` для `Author` с операциями только на чтение (`GetCollection`, `Get`) — авторов нельзя создавать через публичный API.

**Задание 2.** Добавьте кастомную операцию `POST /api/books/{id}/add-review`, принимающую DTO с `text` и `rating`, реализуйте через кастомный контроллер.

**Задание 3.** Настройте security-выражение для `Order`, чтобы `GET /api/orders/{id}` был доступен только владельцу заказа или администратору (используйте voter из модуля 10 внутри `security`).

**Задание 4.** Откройте `/api` в браузере и изучите автоматически сгенерированный Swagger UI — попробуйте выполнить запрос прямо оттуда ("Try it out").

### Решения

<details>
<summary>Решение задания 1</summary>

```php
#[ApiResource(
    operations: [
        new GetCollection(),
        new Get(),
    ]
)]
class Author { /* ... */ }
```
</details>

<details>
<summary>Решение задания 3</summary>

```php
#[ApiResource(
    operations: [
        new Get(security: "is_granted('ORDER_VIEW', object)"),
        new GetCollection(security: "is_granted('ROLE_USER')"),
    ]
)]
class Order { /* ... */ }
```

Voter `OrderVoter` из модуля 10 переиспользуется здесь без изменений — это и есть основное преимущество построения авторизации через voters с самого начала.
</details>

---

## 12.13. Частые ошибки новичков

1. **Открывают все CRUD-операции по умолчанию**, не ограничивая `security` — любой может создать/удалить любую сущность через публичный API.
2. **Забывают про `normalizationContext`/`denormalizationContext`** и получают в ответе либо всё подряд, либо ничего.
3. **Пытаются впихнуть сложную бизнес-логику в стандартный `PATCH`** вместо кастомной операции — получают "резиновые" сущности с полями-флагами вида `isCancelled`, `isShipped`, вместо осмысленных операций.
4. **Не проверяют автогенерируемую документацию** — не замечают, что случайно "засветили" внутреннее поле в публичном API.
5. **Путают API Platform ресурсы и обычные Symfony-контроллеры** в одном проекте без чёткого разделения зон ответственности — усложняет отладку, откуда обрабатывается конкретный запрос.

---

## Чек-лист "Я умею" — Модуль 12

- [ ] Объявлять `#[ApiResource]` и ограничивать список доступных операций
- [ ] Настраивать группы сериализации на уровне ресурса и операции
- [ ] Подключать встроенные фильтры (Search, Range, Order, Boolean) и пагинацию
- [ ] Настраивать security-выражения на уровне ресурса и операции, переиспользуя Voters
- [ ] Писать кастомные операции для нестандартной бизнес-логики
- [ ] Понимать, когда использовать DTO (`input`/`output`) вместо прямой сущности
- [ ] Иметь общее представление о GraphQL-поддержке API Platform

**Дальше:** [Модуль 13 — Тестирование](13-testirovanie.md)
