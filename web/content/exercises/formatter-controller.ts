import type { Exercise } from "../types";

export const formatterControllerExercise: Exercise = {
  id: "formatter-controller",
  mode: "symfony-app",
  title: "Внедри сервис через конструктор",
  description:
    "BookFormatterService уже готов. Напиши контроллер, который находит книгу по id и форматирует её через этот сервис — сервис нужно получить не через `new`, а через внедрение зависимости в конструктор.",
  targetPath: "src/Controller/FormatterController.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-books"],
  contextFiles: [{ path: "src/Service/BookFormatterService.php", description: "готовый сервис форматирования" }],
  starterCode: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Service\\BookFormatterService;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class FormatterController extends AbstractController
{
    #[Route('/books/formatted/{id}', methods: ['GET'])]
    public function __invoke(int $id, EntityManagerInterface $em /* TODO: добавь параметр BookFormatterService $formatter */): JsonResponse
    {
        $book = $em->getRepository(Book::class)->find($id);
        if (!$book) {
            return new JsonResponse(['error' => 'Not found'], 404);
        }

        // TODO: верни JsonResponse(['formatted' => $formatter->format($book)])
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Service\\BookFormatterService;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class FormatterController extends AbstractController
{
    #[Route('/books/formatted/{id}', methods: ['GET'])]
    public function __invoke(int $id, EntityManagerInterface $em, BookFormatterService $formatter): JsonResponse
    {
        $book = $em->getRepository(Book::class)->find($id);
        if (!$book) {
            return new JsonResponse(['error' => 'Not found'], 404);
        }

        return new JsonResponse(['formatted' => $formatter->format($book)]);
    }
}
`,
  requests: [
    { id: "found", method: "GET", path: "/books/formatted/1" },
    { id: "missing", method: "GET", path: "/books/formatted/999" },
  ],
  checks: [
    { type: "http-status", requestId: "found", expectedStatus: 200, description: "GET /books/formatted/1 → 200" },
    { type: "http-body-contains", requestId: "found", value: "1984 (1949)", description: "Книга отформатирована через сервис" },
    { type: "http-status", requestId: "missing", expectedStatus: 404, description: "Несуществующий id → 404" },
  ],
  hint: "Просто добавь ещё один параметр в сигнатуру метода с типом BookFormatterService — регистрировать его в конфиге не нужно: services.yaml по умолчанию автовайрит всё, что лежит в src/.",
};
