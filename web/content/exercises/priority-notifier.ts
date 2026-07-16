import type { Exercise } from "../types";
import { auditLogListenerPhp, bookCreatedEventPhp, bookCreatedNotifierPhp } from "./shared/event-fixtures";

export const priorityNotifierExercise: Exercise = {
  id: "priority-notifier",
  mode: "symfony-app",
  title: "Упорядочи слушателей через priority",
  description:
    "В кодовой базе уже есть AuditLogListener — он тоже подписан на BookCreatedEvent и пишет в лог. Напиши ещё одного слушателя, который должен сработать РАНЬШЕ него, и докажи это через приоритет.",
  targetPath: "src/EventListener/PriorityNotifier.php",
  contextFiles: [
    { path: "src/Event/BookCreatedEvent.php", description: "готовое событие" },
    { path: "src/EventListener/BookCreatedNotifier.php", description: "слушатель из прошлого урока" },
    { path: "src/EventListener/AuditLogListener.php", description: "уже существующий слушатель с приоритетом по умолчанию (0)" },
    {
      path: "src/Controller/EventDemoController.php",
      description: "создаёт книгу, оборачивает в BookCreatedEvent и публикует результат",
    },
  ],
  fixtureOverrides: [
    { path: "src/Event/BookCreatedEvent.php", content: bookCreatedEventPhp },
    { path: "src/EventListener/BookCreatedNotifier.php", content: bookCreatedNotifierPhp },
    { path: "src/EventListener/AuditLogListener.php", content: auditLogListenerPhp },
  ],
  starterCode: `<?php

namespace App\\EventListener;

use App\\Event\\BookCreatedEvent;
use Symfony\\Component\\EventDispatcher\\Attribute\\AsEventListener;

class PriorityNotifier
{
    // TODO: добавь атрибут #[AsEventListener(event: BookCreatedEvent::class, priority: ...)]
    // с приоритетом ВЫШЕ, чем у AuditLogListener (у него приоритет по умолчанию — 0)
    public function onBookCreated(BookCreatedEvent $event): void
    {
        // TODO: вызови $event->log('priority-first')
    }
}
`,
  solution: `<?php

namespace App\\EventListener;

use App\\Event\\BookCreatedEvent;
use Symfony\\Component\\EventDispatcher\\Attribute\\AsEventListener;

class PriorityNotifier
{
    #[AsEventListener(event: BookCreatedEvent::class, priority: 10)]
    public function onBookCreated(BookCreatedEvent $event): void
    {
        $event->log('priority-first');
    }
}
`,
  requests: [{ id: "created", method: "GET", path: "/events/book-created" }],
  checks: [
    { type: "http-status", requestId: "created", expectedStatus: 200, description: "GET /events/book-created → 200" },
    { type: "http-body-contains", requestId: "created", value: '"notified":true', description: "BookCreatedNotifier по-прежнему срабатывает" },
    {
      type: "http-body-matches",
      requestId: "created",
      pattern: '"log":\\["priority-first","audit"\\]',
      description: "Твой слушатель отработал ПЕРВЫМ — именно в таком порядке записи попали в лог",
    },
  ],
  hint: "Чем выше число в priority, тем раньше слушатель сработает. У AuditLogListener приоритет не указан — значит, он равен 0 (значение по умолчанию атрибута). Любое положительное число поставит твой слушатель раньше.",
};
