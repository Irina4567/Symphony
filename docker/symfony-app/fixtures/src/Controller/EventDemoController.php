<?php

namespace App\Controller;

use App\Entity\Book;
use App\Event\BookCreatedEvent;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\EventDispatcher\EventDispatcherInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

// Харнесс для уроков 2-4 блока про EventDispatcher: создаёт книгу (без сохранения в БД — тут
// не о персистентности), оборачивает в BookCreatedEvent и печатает результат. Сама BookCreatedEvent
// и её слушатели приходят через fixtureOverrides конкретных упражнений — этот контроллер к ним
// не привязан жёстко (App\Event\BookCreatedEvent используется только внутри тела метода, поэтому
// безопасно существовать в образе ещё до того, как класс события будет написан).
class EventDemoController extends AbstractController
{
    #[Route('/events/book-created', methods: ['GET'])]
    public function __invoke(EventDispatcherInterface $dispatcher): JsonResponse
    {
        $book = new Book();
        $book->setTitle('Dune')->setYear(1965);

        $event = new BookCreatedEvent($book);
        $dispatcher->dispatch($event);

        return new JsonResponse([
            'title' => $event->getBook()->getTitle(),
            'notified' => $event->isNotified(),
            'log' => $event->getLog(),
        ]);
    }
}
