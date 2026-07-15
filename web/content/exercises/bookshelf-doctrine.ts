import type { Exercise } from "../types";

export const bookshelfDoctrineExercise: Exercise = {
  id: "bookshelf-doctrine",
  mode: "symfony-app",
  title: "BookShelf: JSON API на настоящей базе данных",
  description:
    "Тот же контракт API, что и в Блоке 1 (список, книга по id, создание) — но на этот раз книги по-настоящему сохраняются в SQLite через Doctrine. Entity Book/Author и сидинг трёх книг уже готовы.",
  targetPath: "src/Controller/BookController.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-books"],
  starterCode: `<?php

namespace App\\Controller;

use App\\Entity\\Author;
use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookController
{
    #[Route('/api/books', name: 'books_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em): JsonResponse
    {
        // TODO: получи все книги через $em->getRepository(Book::class)->findAll()
        // верни JsonResponse с массивом [id, title, author (имя автора), year] для каждой книги
    }

    #[Route('/api/books/{id}', name: 'books_show', methods: ['GET'])]
    public function show(int $id, EntityManagerInterface $em): JsonResponse
    {
        // TODO: найди книгу через $em->getRepository(Book::class)->find($id)
        // если не найдена — JsonResponse(['error' => 'Book not found'], 404)
        // если найдена — верни её [id, title, author, year]
    }

    #[Route('/api/books', name: 'books_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data['title']) || empty($data['author'])) {
            return new JsonResponse(['error' => 'title and author are required'], 400);
        }

        // TODO: найди автора по имени через findOneBy(['name' => $data['author']]);
        // если не найден — создай нового Author и persist() его
        // затем создай Book (title, year, author), persist() + flush()
        // верни JsonResponse со свежесозданной книгой, код 201
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Entity\\Author;
use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookController
{
    #[Route('/api/books', name: 'books_list', methods: ['GET'])]
    public function list(EntityManagerInterface $em): JsonResponse
    {
        $books = $em->getRepository(Book::class)->findAll();

        return new JsonResponse(array_map(
            static fn (Book $b) => [
                'id' => $b->getId(),
                'title' => $b->getTitle(),
                'author' => $b->getAuthor()?->getName(),
                'year' => $b->getYear(),
            ],
            $books
        ));
    }

    #[Route('/api/books/{id}', name: 'books_show', methods: ['GET'])]
    public function show(int $id, EntityManagerInterface $em): JsonResponse
    {
        $book = $em->getRepository(Book::class)->find($id);
        if (!$book) {
            return new JsonResponse(['error' => 'Book not found'], 404);
        }

        return new JsonResponse([
            'id' => $book->getId(),
            'title' => $book->getTitle(),
            'author' => $book->getAuthor()?->getName(),
            'year' => $book->getYear(),
        ]);
    }

    #[Route('/api/books', name: 'books_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data['title']) || empty($data['author'])) {
            return new JsonResponse(['error' => 'title and author are required'], 400);
        }

        $author = $em->getRepository(Author::class)->findOneBy(['name' => $data['author']]);
        if (!$author) {
            $author = new Author();
            $author->setName($data['author']);
            $em->persist($author);
        }

        $book = new Book();
        $book->setTitle($data['title']);
        $book->setYear($data['year'] ?? 0);
        $book->setAuthor($author);
        $em->persist($book);
        $em->flush();

        return new JsonResponse([
            'id' => $book->getId(),
            'title' => $book->getTitle(),
            'author' => $author->getName(),
            'year' => $book->getYear(),
        ], 201);
    }
}
`,
  requests: [
    { id: "list-before", method: "GET", path: "/api/books" },
    { id: "show-found", method: "GET", path: "/api/books/2" },
    { id: "show-missing", method: "GET", path: "/api/books/999" },
    {
      id: "create-ok",
      method: "POST",
      path: "/api/books",
      body: '{"title":"The Pragmatic Programmer","author":"Andrew Hunt","year":1999}',
    },
    { id: "create-invalid", method: "POST", path: "/api/books", body: '{"title":"Без автора"}' },
    { id: "list-after", method: "GET", path: "/api/books" },
  ],
  checks: [
    { type: "http-status", requestId: "list-before", expectedStatus: 200, description: "GET /api/books → 200" },
    { type: "http-body-contains", requestId: "list-before", value: "1984", description: "Список содержит засеянную книгу 1984" },
    { type: "http-status", requestId: "show-found", expectedStatus: 200, description: "GET /api/books/2 → 200" },
    {
      type: "http-body-contains",
      requestId: "show-found",
      value: "Robert C. Martin",
      description: "Найденная книга содержит имя автора (через связь, а не строкой)",
    },
    { type: "http-status", requestId: "show-missing", expectedStatus: 404, description: "GET /api/books/999 → 404" },
    { type: "http-body-contains", requestId: "show-missing", value: "Book not found", description: "Ответ на несуществующий id содержит понятную ошибку" },
    { type: "http-status", requestId: "create-ok", expectedStatus: 201, description: "POST с валидными данными → 201" },
    { type: "http-body-contains", requestId: "create-ok", value: "The Pragmatic Programmer", description: "Созданная книга возвращается в ответе" },
    { type: "http-status", requestId: "create-invalid", expectedStatus: 400, description: "POST без author → 400" },
    {
      type: "http-body-contains",
      requestId: "list-after",
      value: "The Pragmatic Programmer",
      description: "Новая книга появилась в общем списке — теперь это настоящая персистентность, не как в Блоке 1",
    },
  ],
  hint: "В Блоке 1 мы честно предупреждали: POST не появится в GET, потому что каждый запрос — новый PHP-процесс без общей памяти. Теперь общая память и не нужна — данные лежат в файле SQLite, который переживает границы запроса.",
};
