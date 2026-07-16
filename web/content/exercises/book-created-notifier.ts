import type { Exercise } from "../types";
import { bookCreatedEventPhp } from "./shared/event-fixtures";

export const bookCreatedNotifierExercise: Exercise = {
  id: "book-created-notifier",
  mode: "symfony-app",
  title: "Напиши слушателя события",
  description:
    "BookCreatedEvent готово (см. прошлый урок). Напиши слушателя, который реагирует на это событие и отмечает его как обработанное — так, чтобы код, опубликовавший событие, мог убедиться, что уведомление сработало.",
  targetPath: "src/EventListener/BookCreatedNotifier.php",
  contextFiles: [
    { path: "src/Event/BookCreatedEvent.php", description: "готовое событие из прошлого урока" },
    {
      path: "src/Controller/EventDemoController.php",
      description: "создаёт книгу, оборачивает в BookCreatedEvent и публикует результат",
    },
  ],
  fixtureOverrides: [{ path: "src/Event/BookCreatedEvent.php", content: bookCreatedEventPhp }],
  starterCode: `<?php

namespace App\\EventListener;

use App\\Event\\BookCreatedEvent;
use Symfony\\Component\\EventDispatcher\\Attribute\\AsEventListener;

class BookCreatedNotifier
{
    // TODO: добавь атрибут #[AsEventListener(event: BookCreatedEvent::class)] над методом ниже
    public function onBookCreated(BookCreatedEvent $event): void
    {
        // TODO: вызови $event->markNotified()
    }
}
`,
  solution: `<?php

namespace App\\EventListener;

use App\\Event\\BookCreatedEvent;
use Symfony\\Component\\EventDispatcher\\Attribute\\AsEventListener;

class BookCreatedNotifier
{
    #[AsEventListener(event: BookCreatedEvent::class)]
    public function onBookCreated(BookCreatedEvent $event): void
    {
        $event->markNotified();
    }
}
`,
  requests: [{ id: "created", method: "GET", path: "/events/book-created" }],
  checks: [
    { type: "http-status", requestId: "created", expectedStatus: 200, description: "GET /events/book-created → 200" },
    {
      type: "http-body-contains",
      requestId: "created",
      value: '"notified":true',
      description: "Слушатель сработал и отметил событие как обработанное",
    },
  ],
  hint: "Метод не обязан называться именно onBookCreated — имя метода вообще не важно для Symfony. Важна только связка: атрибут #[AsEventListener(event: ...)] над методом и тип параметра, совпадающий с классом события.",
};
