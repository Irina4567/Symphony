import type { Exercise } from "../types";
import { auditLogListenerPhp, bookCreatedEventPhp, bookCreatedNotifierPhp } from "./shared/event-fixtures";

export const bookshelfNotifyExercise: Exercise = {
  id: "bookshelf-notify",
  mode: "symfony-app",
  title: "BookShelf, часть 7: событие при создании книги",
  description:
    "Собери маршрут создания книги, который по-настоящему сохраняет её в базу и публикует BookCreatedEvent сразу после сохранения. Событие и оба слушателя (уведомление и аудит-лог) уже готовы — фокус на контроллере.",
  targetPath: "src/Controller/BookNotifyController.php",
  setupCommands: ["php bin/console doctrine:schema:create"],
  contextFiles: [
    { path: "src/Event/BookCreatedEvent.php", description: "готовое событие" },
    { path: "src/EventListener/BookCreatedNotifier.php", description: "отмечает событие как обработанное" },
    { path: "src/EventListener/AuditLogListener.php", description: "пишет запись в лог события" },
  ],
  fixtureOverrides: [
    { path: "src/Event/BookCreatedEvent.php", content: bookCreatedEventPhp },
    { path: "src/EventListener/BookCreatedNotifier.php", content: bookCreatedNotifierPhp },
    { path: "src/EventListener/AuditLogListener.php", content: auditLogListenerPhp },
  ],
  starterCode: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Event\\BookCreatedEvent;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\EventDispatcher\\EventDispatcherInterface;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookNotifyController extends AbstractController
{
    #[Route('/books/notify', methods: ['POST'])]
    public function __invoke(
        Request $request,
        EntityManagerInterface $em,
        EventDispatcherInterface $dispatcher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        // TODO: создай Book, заполни title/year из $data, сохрани (persist + flush)
        // TODO: создай BookCreatedEvent с этой книгой и опубликуй через $dispatcher->dispatch()
        // TODO: верни 201 с {id, title, notified, log}
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Event\\BookCreatedEvent;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\EventDispatcher\\EventDispatcherInterface;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookNotifyController extends AbstractController
{
    #[Route('/books/notify', methods: ['POST'])]
    public function __invoke(
        Request $request,
        EntityManagerInterface $em,
        EventDispatcherInterface $dispatcher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);

        $book = new Book();
        $book->setTitle($data['title'] ?? '')->setYear((int) ($data['year'] ?? 0));
        $em->persist($book);
        $em->flush();

        $event = new BookCreatedEvent($book);
        $dispatcher->dispatch($event);

        return new JsonResponse([
            'id' => $book->getId(),
            'title' => $book->getTitle(),
            'notified' => $event->isNotified(),
            'log' => $event->getLog(),
        ], 201);
    }
}
`,
  requests: [{ id: "create", method: "POST", path: "/books/notify", body: JSON.stringify({ title: "Dune", year: 1965 }) }],
  checks: [
    { type: "http-status", requestId: "create", expectedStatus: 201, description: "POST /books/notify → 201" },
    { type: "http-body-contains", requestId: "create", value: '"title":"Dune"', description: "Книга сохранена и возвращена в ответе" },
    { type: "http-body-contains", requestId: "create", value: '"notified":true', description: "BookCreatedNotifier сработал" },
    { type: "http-body-contains", requestId: "create", value: '"audit"', description: "AuditLogListener тоже сработал" },
  ],
  hint: "Порядок важен: сначала persist()+flush() (книге нужен id из базы для ответа), и только потом — создание события и dispatch(). Событие описывает уже случившийся факт, а не запрос на его создание.",
};
