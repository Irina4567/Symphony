// BookCreatedEvent и её слушатели — то, что появляется по мере того, как блок про EventDispatcher
// раскрывает всё новые механизмы. Ни один из этих файлов не запечён в образ по умолчанию: сама
// BookCreatedEvent — то, что ученик пишет в уроке 2 (см. упражнение book-created-event), а её
// слушатели — в уроках 3-4. Более "поздним" упражнениям, которым эти файлы нужны уже рабочими,
// они передаются через fixtureOverrides — как и constrainedBookPhp в Блоке 4 или solvedAuth в
// Блоке 5.

// Версия события, которую ученик пишет в уроке 2 — используется как fixtureOverride
// во всех последующих упражнениях этого блока, которым нужно рабочее событие.
export const bookCreatedEventPhp = `<?php

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
`;

// Слушатель, который ученик пишет в уроке 3 — используется как fixtureOverride в уроке 4
// и мини-проекте, которым нужен уже рабочий "основной" слушатель.
export const bookCreatedNotifierPhp = `<?php

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
`;

// "Уже существующий в кодовой базе" слушатель с приоритетом по умолчанию (0) — появляется
// в уроке 4 как второй подписчик, относительно которого ученик должен явно упорядочить
// свой собственный листенер через priority. Не запечён в образ по умолчанию — иначе он начал
// бы срабатывать, как только появляется BookCreatedEvent, ещё до того, как в уроке 3
// разбираются слушатели вообще.
export const auditLogListenerPhp = `<?php

namespace App\\EventListener;

use App\\Event\\BookCreatedEvent;
use Symfony\\Component\\EventDispatcher\\Attribute\\AsEventListener;

class AuditLogListener
{
    #[AsEventListener(event: BookCreatedEvent::class)]
    public function onBookCreated(BookCreatedEvent $event): void
    {
        $event->log('audit');
    }
}
`;
