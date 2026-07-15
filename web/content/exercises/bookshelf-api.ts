import type { Exercise } from "../types";

export const bookshelfApiExercise: Exercise = {
  id: "bookshelf-api",
  mode: "symfony-app",
  title: "BookShelf: JSON API каталога книг",
  description:
    "Три действия в одном контроллере: список книг, книга по id (с 404, если не найдена) и создание книги из JSON-тела запроса (с 400, если не хватает полей). Реальная база данных появится в блоке про Doctrine — пока книги живут в PHP-массиве прямо в контроллере.",
  targetPath: "src/Controller/BookController.php",
  starterCode: `<?php

namespace App\\Controller;

use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookController
{
    /** @var array<int, array{id:int,title:string,author:string,year:int}> */
    private array $books = [
        1 => ['id' => 1, 'title' => '1984', 'author' => 'George Orwell', 'year' => 1949],
        2 => ['id' => 2, 'title' => 'Clean Code', 'author' => 'Robert C. Martin', 'year' => 2008],
        3 => ['id' => 3, 'title' => 'Dune', 'author' => 'Frank Herbert', 'year' => 1965],
    ];

    #[Route('/api/books', name: 'books_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        // TODO: верни JsonResponse со списком всех книг: array_values($this->books)
    }

    #[Route('/api/books/{id}', name: 'books_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        // TODO: если книга с таким id есть в $this->books — верни её JsonResponse(...)
        // если нет — верни JsonResponse(['error' => 'Book not found'], 404)
    }

    #[Route('/api/books', name: 'books_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // TODO: если нет title или author — верни JsonResponse(['error' => 'title and author are required'], 400)
        // иначе — верни JsonResponse($data + ['id' => count($this->books) + 1], 201)
        // (это учебная имитация "создания" — реальное сохранение придёт в блоке про Doctrine)
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookController
{
    /** @var array<int, array{id:int,title:string,author:string,year:int}> */
    private array $books = [
        1 => ['id' => 1, 'title' => '1984', 'author' => 'George Orwell', 'year' => 1949],
        2 => ['id' => 2, 'title' => 'Clean Code', 'author' => 'Robert C. Martin', 'year' => 2008],
        3 => ['id' => 3, 'title' => 'Dune', 'author' => 'Frank Herbert', 'year' => 1965],
    ];

    #[Route('/api/books', name: 'books_list', methods: ['GET'])]
    public function list(): JsonResponse
    {
        return new JsonResponse(array_values($this->books));
    }

    #[Route('/api/books/{id}', name: 'books_show', methods: ['GET'])]
    public function show(int $id): JsonResponse
    {
        if (!isset($this->books[$id])) {
            return new JsonResponse(['error' => 'Book not found'], 404);
        }

        return new JsonResponse($this->books[$id]);
    }

    #[Route('/api/books', name: 'books_create', methods: ['POST'])]
    public function create(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data['title']) || empty($data['author'])) {
            return new JsonResponse(['error' => 'title and author are required'], 400);
        }

        return new JsonResponse($data + ['id' => count($this->books) + 1], 201);
    }
}
`,
  requests: [
    { id: "list", method: "GET", path: "/api/books" },
    { id: "show-found", method: "GET", path: "/api/books/2" },
    { id: "show-missing", method: "GET", path: "/api/books/999" },
    {
      id: "create-ok",
      method: "POST",
      path: "/api/books",
      body: '{"title":"The Pragmatic Programmer","author":"Andrew Hunt"}',
    },
    { id: "create-invalid", method: "POST", path: "/api/books", body: '{"title":"Без автора"}' },
  ],
  checks: [
    { type: "http-status", requestId: "list", expectedStatus: 200, description: "GET /api/books → 200" },
    { type: "http-body-contains", requestId: "list", value: '"title":"1984"', description: "Список содержит книгу 1984" },
    { type: "http-body-contains", requestId: "list", value: "Clean Code", description: "Список содержит книгу Clean Code" },
    { type: "http-status", requestId: "show-found", expectedStatus: 200, description: "GET /api/books/2 → 200" },
    {
      type: "http-body-contains",
      requestId: "show-found",
      value: "Robert C. Martin",
      description: "Найденная книга содержит верного автора",
    },
    { type: "http-status", requestId: "show-missing", expectedStatus: 404, description: "GET /api/books/999 → 404" },
    {
      type: "http-body-contains",
      requestId: "show-missing",
      value: "Book not found",
      description: "Ответ на несуществующий id содержит понятную ошибку",
    },
    { type: "http-status", requestId: "create-ok", expectedStatus: 201, description: "POST с валидными данными → 201" },
    {
      type: "http-body-contains",
      requestId: "create-ok",
      value: "The Pragmatic Programmer",
      description: "Созданная книга возвращается в ответе",
    },
    { type: "http-status", requestId: "create-invalid", expectedStatus: 400, description: "POST без author → 400" },
    {
      type: "http-body-contains",
      requestId: "create-invalid",
      value: "title and author are required",
      description: "Ответ на невалидный POST содержит понятную ошибку",
    },
  ],
  hint: "empty($data['author']) вернёт true и если ключа нет, и если значение пустая строка — надёжнее, чем просто isset(), когда важно ещё и непустое значение.",
};
