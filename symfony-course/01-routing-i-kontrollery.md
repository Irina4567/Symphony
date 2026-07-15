# Модуль 01. Routing и контроллеры

> Предыдущий модуль: [00 — Введение и подготовка](00-vvedenie-i-podgotovka.md)

---

## 1.1. Что такое маршрутизация

Роутинг — это сопоставление **URL + HTTP-метод** → **контроллер** (PHP-метод, который обработает запрос). Symfony хранит все маршруты в едином реестре (`RouteCollection`), который компилируется в оптимизированный PHP-код и кэшируется — поэтому даже при тысячах маршрутов поиск нужного происходит за микросекунды.

Маршрут можно описать тремя способами:

1. **Атрибуты PHP 8** (рекомендуется, используется по умолчанию с Symfony 6.4+/7.x) — `#[Route(...)]` прямо над методом контроллера.
2. **YAML** — в `config/routes.yaml`, удобно, когда роуты хочется видеть отдельно от кода.
3. **XML** — используется редко, в основном для legacy или библиотек.

В этом курсе мы используем атрибуты — это стандарт де-факто в современном Symfony.

---

## 1.2. Первый контроллер

Создадим контроллер через генератор:

```bash
php bin/console make:controller BookController
```

Это создаст `src/Controller/BookController.php` и шаблон `templates/book/index.html.twig`. Разберём вручную, что получилось (и допишем):

```php
<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class BookController extends AbstractController
{
    #[Route('/books', name: 'book_index', methods: ['GET'])]
    public function index(): Response
    {
        return $this->render('book/index.html.twig', [
            'controller_name' => 'BookController',
        ]);
    }
}
```

Разбор атрибута:

- `'/books'` — путь (path). Может содержать плейсхолдеры: `/books/{id}`.
- `name: 'book_index'` — **имя маршрута**, уникальный идентификатор. Используется для генерации URL (`generateUrl('book_index')`), никогда не хардкодьте пути строками!
- `methods: ['GET']` — ограничение по HTTP-методу. Без этого параметра маршрут отвечает на любой метод.

`AbstractController` — базовый класс с набором удобных shortcut-методов (`render()`, `redirectToRoute()`, `json()`, `getUser()`, `denyAccessUnlessGranted()` и др.). Это **не обязательный** родитель — контроллер может быть простым классом или даже замыканием, но `AbstractController` экономит массу кода.

---

## 1.3. Параметры маршрута

```php
#[Route('/books/{id}', name: 'book_show', methods: ['GET'])]
public function show(int $id): Response
{
    // $id уже автоматически приведён к int благодаря requirements/типу параметра
    return new Response("Книга #$id");
}
```

Symfony автоматически "пробрасывает" параметры маршрута в аргументы метода контроллера **по имени** — это называется **ArgumentResolver**. Имя `{id}` в пути должно совпадать с именем параметра `$id` в методе.

### Ограничения параметров (requirements)

```php
#[Route('/books/{id}', name: 'book_show', requirements: ['id' => '\d+'])]
public function show(int $id): Response { /* ... */ }
```

Без `requirements` параметр `{id}` матчится любой непустой строкой без слэша — маршрут `/books/hello` тоже сработает и Symfony попытается привести `"hello"` к `int`, что вызовет ошибку. Явные `requirements` — хорошая практика: они не только валидируют, но и ускоряют матчинг, отсекая заведомо неподходящие URL раньше.

Есть и компактный синтаксис через `#[Route]` с inline-условием (Symfony 6.1+):

```php
#[Route('/books/{id<\d+>}', name: 'book_show')]
```

### Необязательные параметры и значения по умолчанию

```php
#[Route('/books/{page}', name: 'book_list', requirements: ['page' => '\d+'])]
public function list(int $page = 1): Response { /* ... */ }
```

Если параметру метода задано значение по умолчанию, он становится необязательным и в самом URL.

### Параметры-объекты: ParamConverter / EntityValueResolver

Одна из самых приятных фич — Symfony может **сам подгрузить сущность из базы** по параметру маршрута:

```php
use App\Entity\Book;

#[Route('/books/{id}', name: 'book_show')]
public function show(Book $book): Response
{
    // Symfony сам сделал $bookRepository->find($id) и передал объект.
    // Если книга не найдена — автоматически вернётся 404 Not Found.
    return $this->render('book/show.html.twig', ['book' => $book]);
}
```

Это работает благодаря `EntityValueResolver` (часть `DoctrineBundle`), который "видит", что тип аргумента — Doctrine-сущность, и по имени параметра маршрута (`id`), совпадающему с полем сущности, находит запись. Разберём подробнее в модуле 05, когда введём Doctrine.

---

## 1.4. Более сложные маршруты

### Множество методов и приоритет

```php
#[Route('/books/{id}', name: 'book_update', methods: ['PUT', 'PATCH'])]
```

### Условия (condition) — expression language

```php
#[Route('/api/books', name: 'api_books', condition: "context.getMethod() === 'GET' and request.headers.get('Accept') matches '/json/'")]
```

Условия используются редко и стоят дороже по производительности (вычисляются как выражение), поэтому применяйте `methods` и `requirements`, где это возможно, вместо `condition`.

### Формат и Content negotiation

```php
#[Route('/books/{id}.{_format}', name: 'book_show', defaults: ['_format' => 'html'], requirements: ['_format' => 'html|json'])]
```

### Группировка маршрутов через атрибут на классе

Symfony 7 позволяет задать общий префикс и имя для всех маршрутов контроллера:

```php
#[Route('/admin/books', name: 'admin_book_')]
class AdminBookController extends AbstractController
{
    #[Route('', name: 'index', methods: ['GET'])]         // итоговое имя: admin_book_index, путь: /admin/books
    public function index(): Response { /* ... */ }

    #[Route('/{id}/edit', name: 'edit', methods: ['GET', 'POST'])] // admin_book_edit, /admin/books/{id}/edit
    public function edit(int $id): Response { /* ... */ }
}
```

Это отлично подходит для организации админ-панели — что мы и сделаем в BookNest.

---

## 1.5. Генерация URL

Никогда не пишите пути руками (`"/books/" . $id`) — используйте генерацию по имени маршрута, чтобы при изменении структуры URL не пришлось искать хардкод по всему проекту.

**В контроллере:**
```php
$url = $this->generateUrl('book_show', ['id' => $book->getId()]);
// или сразу редирект
return $this->redirectToRoute('book_show', ['id' => $book->getId()]);
```

**В Twig:**
```twig
<a href="{{ path('book_show', {id: book.id}) }}">{{ book.title }}</a>
<a href="{{ url('book_show', {id: book.id}) }}">Абсолютная ссылка</a>
```

`path()` генерирует относительный URL (`/books/5`), `url()` — абсолютный (`https://booknest.test/books/5`), нужен, например, для email-рассылок.

**В сервисе (не контроллере)** — внедрите `UrlGeneratorInterface`:
```php
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;

class NotificationMailer
{
    public function __construct(private UrlGeneratorInterface $urlGenerator) {}

    public function buildOrderLink(int $orderId): string
    {
        return $this->urlGenerator->generate('order_show', ['id' => $orderId], UrlGeneratorInterface::ABSOLUTE_URL);
    }
}
```

---

## 1.6. Request и Response в контроллере

Symfony может внедрить объект `Request` прямо как аргумент — не нужно писать `Request::createFromGlobals()` самим:

```php
use Symfony\Component\HttpFoundation\Request;

#[Route('/search', name: 'book_search', methods: ['GET'])]
public function search(Request $request): Response
{
    $query = $request->query->get('q', '');       // GET-параметр ?q=...
    $page  = $request->query->getInt('page', 1);   // с приведением типа и дефолтом

    return $this->render('book/search.html.twig', [
        'query' => $query,
        'page'  => $page,
    ]);
}
```

Полезные методы `Request`:

```php
$request->isMethod('POST');
$request->getContent();              // сырое тело запроса (для API/webhook'ов)
$request->toArray();                 // распарсить JSON-тело в массив
$request->headers->get('X-Api-Key');
$request->getClientIp();
$request->isXmlHttpRequest();        // AJAX-запрос (по заголовку X-Requested-With)
```

### Виды Response

```php
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

return new Response('текст', 200);
return $this->json(['status' => 'ok']);                 // shortcut для JsonResponse
return $this->redirectToRoute('book_index');
return $this->redirect('https://external.example.com'); // произвольный внешний URL
return $this->file('/path/to/invoice.pdf');              // отдать файл на скачивание
return new Response(null, Response::HTTP_NO_CONTENT);    // 204
```

---

## 1.7. Флеш-сообщения

Флеш — сообщение, которое "живёт" ровно один следующий запрос (обычно после редиректа) — классический паттерн "Заказ оформлен!" после POST → Redirect → GET.

```php
#[Route('/books/{id}/buy', name: 'book_buy', methods: ['POST'])]
public function buy(int $id): Response
{
    // ... логика покупки ...
    $this->addFlash('success', 'Книга добавлена в корзину!');

    return $this->redirectToRoute('book_show', ['id' => $id]);
}
```

В шаблоне:
```twig
{% for message in app.flashes('success') %}
    <div class="alert alert-success">{{ message }}</div>
{% endfor %}
```

---

## 1.8. Начинаем BookNest: каталог книг

Сгенерируем контроллер каталога (сущности Book/Author появятся в модуле 05, пока используем моковые данные в самом контроллере — так студенты видят Routing изолированно от Doctrine):

```bash
php bin/console make:controller CatalogController
```

```php
<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/catalog', name: 'catalog_')]
class CatalogController extends AbstractController
{
    private const BOOKS = [
        1 => ['id' => 1, 'title' => 'Чистый код', 'price' => 1200],
        2 => ['id' => 2, 'title' => 'Рефакторинг', 'price' => 1500],
        3 => ['id' => 3, 'title' => 'Symfony на практике', 'price' => 1800],
    ];

    #[Route('', name: 'index', methods: ['GET'])]
    public function index(): Response
    {
        return $this->render('catalog/index.html.twig', [
            'books' => self::BOOKS,
        ]);
    }

    #[Route('/{id}', name: 'show', requirements: ['id' => '\d+'], methods: ['GET'])]
    public function show(int $id): Response
    {
        if (!isset(self::BOOKS[$id])) {
            throw $this->createNotFoundException('Книга не найдена');
        }

        return $this->render('catalog/show.html.twig', [
            'book' => self::BOOKS[$id],
        ]);
    }
}
```

`createNotFoundException()` — shortcut, который бросает `NotFoundHttpException`, а фреймворк перехватывает её и превращает в аккуратный ответ 404 (в prod — красивую страницу, в dev — подробный debug-экран).

Шаблоны напишем в следующем модуле (Twig).

---

## 1.9. Практика модуля 1

**Задание 1.** Добавьте в `CatalogController` маршрут `POST /catalog/{id}/reviews`, принимающий JSON `{"text": "...", "rating": 5}` через `$request->toArray()`, и возвращающий `$this->json([...], 201)`.

**Задание 2.** Сделайте так, чтобы `GET /catalog?sort=price_asc` сортировал моковый массив книг по цене — используйте `$request->query->get('sort')`.

**Задание 3.** Добавьте `requirements` для параметра `{id}`, чтобы `/catalog/abc` возвращал 404, а не ошибку приведения типа.

**Задание 4.** Выполните `php bin/console debug:router` и убедитесь, что видите все объявленные маршруты с правильными путями и именами.

### Решения

<details>
<summary>Решение задания 1</summary>

```php
#[Route('/{id}/reviews', name: 'add_review', requirements: ['id' => '\d+'], methods: ['POST'])]
public function addReview(int $id, Request $request): Response
{
    if (!isset(self::BOOKS[$id])) {
        throw $this->createNotFoundException();
    }

    $data = $request->toArray();
    // здесь в реальном приложении данные валидируются (см. модуль 08) и сохраняются

    return $this->json([
        'bookId' => $id,
        'text'   => $data['text'] ?? null,
        'rating' => $data['rating'] ?? null,
    ], Response::HTTP_CREATED);
}
```
</details>

<details>
<summary>Решение задания 2</summary>

```php
#[Route('', name: 'index', methods: ['GET'])]
public function index(Request $request): Response
{
    $books = self::BOOKS;
    if ($request->query->get('sort') === 'price_asc') {
        usort($books, fn($a, $b) => $a['price'] <=> $b['price']);
    }

    return $this->render('catalog/index.html.twig', ['books' => $books]);
}
```
</details>

---

## 1.10. Частые ошибки новичков

1. **Забывают `methods: ['POST']`** на изменяющих операциях — в итоге форма удаления книги случайно срабатывает по GET-запросу от бота-краулера.
2. **Хардкодят URL** вместо `path()`/`generateUrl()` — при малейшем изменении структуры сайта приходится искать строки по всему проекту.
3. **Путают имя параметра маршрута и имя аргумента метода.** `{bookId}` в пути ≠ `$id` в методе — Symfony не свяжет их без явного `#[MapEntity]` или совпадения имён.
4. **Не задают `requirements`** — маршрут `/books/{id}` может случайно "перехватить" `/books/create`, если `create` объявлен ниже по порядку и оба паттерна совпадают. **Порядок объявления маршрутов имеет значение**: Symfony проверяет их сверху вниз (в порядке регистрации) и использует первый подходящий.
5. **Возвращают из контроллера что попало.** Метод контроллера должен возвращать `Response` (или объект, который `kernel.view`-слушатель сможет превратить в `Response`, как в API Platform). Простой `return ['id' => 1]` без специальной настройки вызовет ошибку.

---

## Чек-лист "Я умею" — Модуль 1

- [ ] Объявлять маршруты через атрибут `#[Route]` с именем, requirements и methods
- [ ] Извлекать параметры пути, query-параметры и тело запроса из `Request`
- [ ] Генерировать URL по имени маршрута в контроллере, Twig и произвольном сервисе
- [ ] Использовать флеш-сообщения для паттерна POST → Redirect → GET
- [ ] Возвращать разные виды `Response` (обычный, JSON, редирект, файл)
- [ ] Понимать, как EntityValueResolver автоматически подгружает сущности по параметру маршрута

**Дальше:** [Модуль 02 — Twig, шаблонизатор](02-twig-shablonizator.md)
