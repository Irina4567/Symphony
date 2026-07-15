# Модуль 11. Serializer и REST API вручную

> Предыдущий модуль: [10 — Security: авторизация](10-security-avtorizaciya.md)

---

## 11.1. Зачем строить API "руками", если есть API Platform

В модуле 12 мы разберём API Platform — мощный инструмент автогенерации CRUD API. Но чтобы осознанно им пользоваться (и понимать, что происходит "под капотом", когда что-то идёт не так), важно сначала научиться строить REST API вручную на компонентах Serializer + обычных контроллерах. Это также единственный путь, когда нужен **не совсем CRUD** API — сложные бизнес-операции, агрегации, специфичные форматы ответа.

```bash
composer require symfony/serializer symfony/property-access
```

---

## 11.2. Компонент Serializer: Normalizer + Encoder

Serializer решает две раздельные задачи:

1. **Normalization** — превращение объекта PHP в "простую" структуру (массив/скаляры) и обратно.
2. **Encoding** — превращение простой структуры в конкретный формат (JSON, XML, CSV) и обратно.

```
Object ⇄ (Normalizer) ⇄ Array ⇄ (Encoder) ⇄ JSON/XML/CSV string
```

```php
use Symfony\Component\Serializer\SerializerInterface;

class BookApiController extends AbstractController
{
    #[Route('/api/books/{id}', name: 'api_book_show', methods: ['GET'])]
    public function show(Book $book, SerializerInterface $serializer): Response
    {
        $json = $serializer->serialize($book, 'json', ['groups' => ['book:read']]);

        return new Response($json, Response::HTTP_OK, ['Content-Type' => 'application/json']);
    }
}
```

Или проще, через shortcut `AbstractController::json()`, который сам использует Serializer внутри:
```php
return $this->json($book, context: ['groups' => ['book:read']]);
```

---

## 11.3. Управление тем, что попадает в JSON: Serialization Groups

По умолчанию Serializer выведет **все** публичные свойства/геттеры сущности — включая то, что вы, вероятно, не хотите показывать в API (например, пароль пользователя или служебные поля). Управление тем, что сериализуется — через **группы**:

```php
<?php

namespace App\Entity;

use Symfony\Component\Serializer\Attribute\Groups;

#[ORM\Entity]
class Book
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    #[Groups(['book:read'])]
    private ?int $id = null;

    #[ORM\Column]
    #[Groups(['book:read', 'book:write'])]
    private string $title;

    #[ORM\Column]
    #[Groups(['book:read', 'book:write'])]
    private int $priceKopecks;

    #[ORM\ManyToOne(targetEntity: Author::class)]
    #[Groups(['book:read'])]
    private ?Author $author = null;

    // это поле НЕ помечено группой — никогда не попадёт в JSON, даже случайно
    #[ORM\Column]
    private ?string $internalNotes = null;
}
```

`book:read` — то, что отдаём наружу; `book:write` — то, что принимаем при создании/обновлении (обычно пересекается с `book:read`, но, например, `id` не должен быть "writable").

```php
$serializer->serialize($book, 'json', ['groups' => 'book:read']);
```

**Важное правило безопасности:** относитесь к сериализации по принципу "белого списка" — поле должно быть **явно** помечено группой, чтобы попасть в вывод. Никогда не полагайтесь на "по умолчанию всё выводится, кроме..." — так рано или поздно утечёт что-то чувствительное при добавлении нового свойства в сущность.

---

## 11.4. Десериализация: JSON → объект

```php
#[Route('/api/books', name: 'api_book_create', methods: ['POST'])]
public function create(
    Request $request,
    SerializerInterface $serializer,
    ValidatorInterface $validator,
    EntityManagerInterface $em,
): Response {
    $book = $serializer->deserialize(
        $request->getContent(),
        Book::class,
        'json',
        ['groups' => 'book:write'],
    );

    $errors = $validator->validate($book);
    if (count($errors) > 0) {
        return $this->json(['errors' => $this->formatErrors($errors)], Response::HTTP_UNPROCESSABLE_ENTITY);
    }

    $em->persist($book);
    $em->flush();

    return $this->json($book, Response::HTTP_CREATED, [], ['groups' => 'book:read']);
}

private function formatErrors(ConstraintViolationListInterface $errors): array
{
    $result = [];
    foreach ($errors as $error) {
        $result[$error->getPropertyPath()] = $error->getMessage();
    }
    return $result;
}
```

**Важный нюанс:** десериализация напрямую в Doctrine-сущность из внешнего JSON-запроса — потенциально рискованная практика (можно случайно "проставить" через сериализатор поле `id` или `isAdmin`, если группы настроены небрежно). Более безопасный и гибкий подход в серьёзных проектах — использовать промежуточные **DTO** (см. следующий раздел).

---

## 11.5. DTO вместо прямой (де)сериализации сущностей

**DTO (Data Transfer Object)** — простой объект, описывающий именно контракт API-запроса/ответа, отдельно от структуры БД. Это развязывает "форму данных снаружи" и "форму данных в базе" — они могут меняться независимо.

```php
final readonly class CreateBookRequest
{
    public function __construct(
        #[Assert\NotBlank]
        public string $title,

        #[Assert\Positive]
        public int $priceKopecks,

        #[Assert\NotNull]
        public int $authorId,
    ) {}
}
```

```php
#[Route('/api/books', methods: ['POST'])]
public function create(
    #[MapRequestPayload] CreateBookRequest $dto,
    AuthorRepository $authorRepository,
    EntityManagerInterface $em,
): Response {
    $author = $authorRepository->find($dto->authorId)
        ?? throw $this->createNotFoundException('Автор не найден');

    $book = (new Book())
        ->setTitle($dto->title)
        ->setPriceKopecks($dto->priceKopecks)
        ->setAuthor($author);

    $em->persist($book);
    $em->flush();

    return $this->json($book, Response::HTTP_CREATED, [], ['groups' => 'book:read']);
}
```

`#[MapRequestPayload]` (Symfony 6.3+) — атрибут аргумента контроллера, который автоматически десериализует тело запроса в DTO **и** запускает валидацию, а при ошибке валидации сам возвращает `422 Unprocessable Entity` с деталями — избавляет от ручного разбора JSON и ручного вызова Validator в каждом экшене.

Аналогично для query-параметров есть `#[MapQueryString]`:
```php
public function list(#[MapQueryString] BookFilterRequest $filter): Response { /* ... */ }
```

---

## 11.6. Кастомизация вывода: ObjectNormalizer, Circular Reference, Max Depth

### Проблема циклических ссылок

Если `Book` ссылается на `Author`, а `Author` содержит коллекцию `Book` (двусторонняя связь), простая сериализация уйдёт в бесконечную рекурсию: `book → author → books → author → ...`. Решения:

**1. Ограничить группами** (как показано выше — если у `Author` группа `book:read` не включает поле `books`, рекурсии не будет). Это самый частый и предсказуемый подход.

**2. `#[MaxDepth]` + контекст `enable_max_depth`:**
```php
#[Groups(['book:read'])]
#[MaxDepth(1)]
private ?Author $author = null;
```

**3. Circular Reference Handler** — на крайний случай, когда структура данных объективно рекурсивная:
```php
$context = [
    AbstractNormalizer::CIRCULAR_REFERENCE_HANDLER => fn(object $object) => $object->getId(),
];
```

---

## 11.7. Кастомный Normalizer

Когда нужна логика вывода, не выражаемая группами (например, добавить вычисляемое поле, которого нет в сущности):

```php
<?php

namespace App\Serializer;

use App\Entity\Book;
use App\Service\PriceCalculator;
use Symfony\Component\Serializer\Normalizer\NormalizerInterface;
use Symfony\Component\Serializer\Normalizer\ObjectNormalizer;

class BookNormalizer implements NormalizerInterface
{
    public function __construct(
        private ObjectNormalizer $objectNormalizer,
        private PriceCalculator $priceCalculator,
    ) {}

    public function normalize(mixed $data, ?string $format = null, array $context = []): array
    {
        /** @var Book $data */
        $normalized = $this->objectNormalizer->normalize($data, $format, $context);
        $normalized['priceWithTax'] = $this->priceCalculator->calculateWithTax($data->getPriceKopecks());

        return $normalized;
    }

    public function supportsNormalization(mixed $data, ?string $format = null, array $context = []): bool
    {
        return $data instanceof Book;
    }

    public function getSupportedTypes(?string $format): array
    {
        return [Book::class => true];
    }
}
```

`ObjectNormalizer` внедряется с явным алиасом на встроенный сервис `serializer.normalizer.object` — так наш кастомный normalizer "оборачивает" стандартную логику, а не переписывает её с нуля.

---

## 11.8. Проектирование REST API: конвенции

Хороший REST API следует предсказуемым конвенциям:

```
GET    /api/books           — список (с пагинацией, фильтрами)
GET    /api/books/{id}      — одна запись
POST   /api/books           — создание, тело запроса = данные новой записи
PUT    /api/books/{id}      — полная замена записи
PATCH  /api/books/{id}      — частичное обновление
DELETE /api/books/{id}      — удаление
```

Статус-коды:
```
200 OK               — успешный GET/PUT/PATCH
201 Created          — успешный POST, с заголовком Location: /api/books/42
204 No Content        — успешный DELETE (тело ответа пустое)
400 Bad Request        — некорректный синтаксис запроса
401 Unauthorized       — не аутентифицирован
403 Forbidden          — аутентифицирован, но нет прав
404 Not Found           — ресурс не существует
422 Unprocessable Entity — синтаксически корректно, но не прошло валидацию
429 Too Many Requests    — превышен rate limit
500 Internal Server Error — ошибка сервера
```

### Формат ошибок (единообразный контракт)

```php
return $this->json([
    'error' => [
        'code' => 'VALIDATION_FAILED',
        'message' => 'Некоторые поля заполнены некорректно',
        'details' => $this->formatErrors($errors),
    ],
], Response::HTTP_UNPROCESSABLE_ENTITY);
```

Единообразие формата ошибок критично для клиентов API (фронтенд/мобильные приложения) — не должно быть ситуации, когда одна ошибка возвращается как строка, другая — как массив, третья — как объект с другими ключами.

### Глобальная обработка исключений API через Exception Listener

Чтобы не дублировать `try/catch` в каждом экшене, используется подписчик на `kernel.exception` (детально разберём в модуле 14), фильтрующий по префиксу пути `/api`:

```php
#[AsEventListener(event: 'kernel.exception')]
class ApiExceptionListener
{
    public function __invoke(ExceptionEvent $event): void
    {
        if (!str_starts_with($event->getRequest()->getPathInfo(), '/api')) {
            return; // не наш случай — пусть обрабатывает стандартный механизм (HTML-страница ошибки)
        }

        $exception = $event->getThrowable();
        $status = $exception instanceof HttpExceptionInterface ? $exception->getStatusCode() : 500;

        $event->setResponse(new JsonResponse([
            'error' => ['message' => $exception->getMessage()],
        ], $status));
    }
}
```

---

## 11.9. Пагинация API-ответа

```php
#[Route('/api/books', methods: ['GET'])]
public function list(Request $request, BookRepository $bookRepository): Response
{
    $page = max(1, $request->query->getInt('page', 1));
    $limit = min(50, $request->query->getInt('limit', 20));

    $paginator = $bookRepository->paginate($page, $limit);

    return $this->json([
        'data' => iterator_to_array($paginator),
        'meta' => [
            'page' => $page,
            'limit' => $limit,
            'total' => count($paginator),
            'pages' => (int) ceil(count($paginator) / $limit),
        ],
    ], context: ['groups' => 'book:read']);
}
```

---

## 11.10. Практика: REST API каталога BookNest

Соберём вместе: список книг с фильтрами, одна книга, создание (для админов).

```php
#[Route('/api/books', name: 'api_book_')]
class BookApiController extends AbstractController
{
    #[Route('', name: 'list', methods: ['GET'])]
    public function list(#[MapQueryString] BookFilterRequest $filter, BookRepository $repo): Response
    {
        $books = $repo->search($filter->term, $filter->maxPriceKopecks, $filter->page, 20);
        return $this->json($books, context: ['groups' => 'book:read']);
    }

    #[Route('/{id}', name: 'show', methods: ['GET'])]
    public function show(Book $book): Response
    {
        return $this->json($book, context: ['groups' => 'book:read']);
    }

    #[Route('', name: 'create', methods: ['POST'])]
    #[IsGranted('ROLE_ADMIN')]
    public function create(#[MapRequestPayload] CreateBookRequest $dto, /* ... */): Response
    {
        // см. раздел 11.5
    }
}
```

```php
final readonly class BookFilterRequest
{
    public function __construct(
        public ?string $term = null,
        public ?int $maxPriceKopecks = null,
        public int $page = 1,
    ) {}
}
```

---

## 11.11. Практика модуля 11

**Задание 1.** Настройте группы сериализации так, чтобы `book:read` не включал внутреннее поле `internalNotes`, а `Author` внутри `Book` выводил только `id` и `fullName` (не полный список его книг — избегаем циклов).

**Задание 2.** Реализуйте `PATCH /api/books/{id}` для частичного обновления (используйте `deserialize` с `context: [AbstractNormalizer::OBJECT_TO_POPULATE => $existingBook]`, чтобы не создавать новый объект, а обновить существующий).

**Задание 3.** Добавьте `ApiExceptionListener`, приводящий все ошибки на `/api/*` к единому JSON-формату.

**Задание 4.** Напишите кастомный Normalizer, добавляющий в JSON книги вычисляемое поле `inStock: bool` на основе некоего гипотетического поля `stockQuantity`.

### Решения

<details>
<summary>Решение задания 2 (ключевая идея)</summary>

```php
use Symfony\Component\Serializer\Normalizer\AbstractNormalizer;

#[Route('/{id}', methods: ['PATCH'])]
public function patch(Book $book, Request $request, SerializerInterface $serializer, EntityManagerInterface $em): Response
{
    $serializer->deserialize(
        $request->getContent(),
        Book::class,
        'json',
        [
            AbstractNormalizer::OBJECT_TO_POPULATE => $book, // не создаём новый объект, обновляем этот
            'groups' => 'book:write',
        ],
    );

    $em->flush();
    return $this->json($book, context: ['groups' => 'book:read']);
}
```
</details>

---

## 11.12. Частые ошибки новичков

1. **Сериализуют сущность целиком без групп** — пароли, внутренние поля, циклические связи "утекают" в API-ответ.
2. **Десериализуют JSON прямо в Doctrine-сущность без ограничения групп/DTO** — риск "mass assignment"-подобной уязвимости (клиент присылает `"roles": ["ROLE_ADMIN"]`, и если поле помечено writable-группой — оно применится).
3. **Не обрабатывают ошибки десериализации** (`NotEncodableValueException` при невалидном JSON) — приложение падает с 500 вместо аккуратного 400.
4. **Смешивают HTML-контроллеры и API-контроллеры в одном классе** — усложняет и рендеринг ошибок, и тестирование.
5. **Используют неправильные статус-коды** (например, 200 для ошибки валидации) — клиенты API не могут надёжно обрабатывать ответы программно.
6. **Забывают лимитировать `limit` в пагинации** — клиент может запросить `?limit=999999` и положить базу тяжёлым запросом.

---

## Чек-лист "Я умею" — Модуль 11

- [ ] Объяснить разницу Normalization/Encoding в Serializer
- [ ] Управлять составом полей вывода через Serialization Groups
- [ ] Использовать DTO + `#[MapRequestPayload]`/`#[MapQueryString]` для безопасного приёма данных
- [ ] Решать проблему циклических ссылок при сериализации
- [ ] Писать кастомный Normalizer для вычисляемых полей
- [ ] Проектировать REST API по конвенциям (методы, статус-коды, единый формат ошибок)
- [ ] Реализовывать пагинацию API-ответа

**Дальше:** [Модуль 12 — API Platform](12-api-platform.md)
