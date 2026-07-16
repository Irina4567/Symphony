import type { Exercise } from "../types";

export const bookCreatedEventExercise: Exercise = {
  id: "book-created-event",
  mode: "symfony-app",
  title: "Напиши своё событие: BookCreatedEvent",
  description:
    "Напиши класс события, который несёт в себе только что созданную книгу. Слушателей пока нет вообще — просто убедись, что событие корректно хранит книгу и умеет сообщать о себе (пока пусто, это нормально — этим займутся следующие уроки).",
  targetPath: "src/Event/BookCreatedEvent.php",
  contextFiles: [
    {
      path: "src/Controller/EventDemoController.php",
      description: "создаёт книгу, оборачивает в BookCreatedEvent и публикует результат",
    },
  ],
  starterCode: `<?php

namespace App\\Event;

use App\\Entity\\Book;

class BookCreatedEvent
{
    // TODO: приватное свойство bool $notified = false
    // TODO: приватный массив string[] $log = []

    public function __construct(/* TODO: private readonly Book $book */)
    {
    }

    public function getBook(): Book
    {
        // TODO: верни книгу
    }

    public function markNotified(): void
    {
        // TODO: выставь $notified в true
    }

    public function isNotified(): bool
    {
        // TODO: верни $notified
    }

    public function log(string $entry): void
    {
        // TODO: добавь $entry в $log
    }

    /** @return string[] */
    public function getLog(): array
    {
        // TODO: верни $log
    }
}
`,
  solution: `<?php

namespace App\\Event;

use App\\Entity\\Book;

class BookCreatedEvent
{
    private bool $notified = false;

    /** @var string[] */
    private array $log = [];

    public function __construct(private readonly Book $book)
    {
    }

    public function getBook(): Book
    {
        return $this->book;
    }

    public function markNotified(): void
    {
        $this->notified = true;
    }

    public function isNotified(): bool
    {
        return $this->notified;
    }

    public function log(string $entry): void
    {
        $this->log[] = $entry;
    }

    /** @return string[] */
    public function getLog(): array
    {
        return $this->log;
    }
}
`,
  requests: [{ id: "created", method: "GET", path: "/events/book-created" }],
  checks: [
    { type: "http-status", requestId: "created", expectedStatus: 200, description: "GET /events/book-created → 200" },
    { type: "http-body-contains", requestId: "created", value: '"title":"Dune"', description: "Событие корректно хранит и возвращает книгу" },
    {
      type: "http-body-contains",
      requestId: "created",
      value: '"notified":false',
      description: "Слушателей пока нет — isNotified() честно возвращает false",
    },
    { type: "http-body-contains", requestId: "created", value: '"log":[]', description: "Лог пуст — ничего его ещё не заполняло" },
  ],
  hint: "markNotified()/isNotified() и log()/getLog() — это не то, что нужно только что созданной книге для полноценной жизни, а способ для БУДУЩИХ слушателей (следующие два урока) сообщить о себе. Дизайн события — это дизайн интерфейса общения с его слушателями.",
};
