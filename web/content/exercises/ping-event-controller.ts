import type { Exercise } from "../types";

export const pingEventControllerExercise: Exercise = {
  id: "ping-event-controller",
  mode: "symfony-app",
  title: "Отправь своё первое событие",
  description:
    "PingEvent и слушатель, который на него реагирует, уже готовы. Напиши контроллер, который создаёт событие и отправляет его через EventDispatcherInterface — а потом убедись, что слушатель успел его изменить.",
  targetPath: "src/Controller/PingController.php",
  contextFiles: [
    { path: "src/Event/PingEvent.php", description: "простое событие с одним публичным полем" },
    { path: "src/EventListener/PingEventListener.php", description: "слушатель, дописывающий текст в событие" },
  ],
  starterCode: `<?php

namespace App\\Controller;

use App\\Event\\PingEvent;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\EventDispatcher\\EventDispatcherInterface;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class PingController extends AbstractController
{
    #[Route('/events/ping', methods: ['GET'])]
    public function __invoke(EventDispatcherInterface $dispatcher): JsonResponse
    {
        // TODO: создай new PingEvent('hello')
        // TODO: отправь его через $dispatcher->dispatch($event)
        // TODO: верни JsonResponse(['message' => $event->message])
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Event\\PingEvent;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\EventDispatcher\\EventDispatcherInterface;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class PingController extends AbstractController
{
    #[Route('/events/ping', methods: ['GET'])]
    public function __invoke(EventDispatcherInterface $dispatcher): JsonResponse
    {
        $event = new PingEvent('hello');
        $dispatcher->dispatch($event);

        return new JsonResponse(['message' => $event->message]);
    }
}
`,
  requests: [{ id: "ping", method: "GET", path: "/events/ping" }],
  checks: [
    { type: "http-status", requestId: "ping", expectedStatus: 200, description: "GET /events/ping → 200" },
    {
      type: "http-body-contains",
      requestId: "ping",
      value: "hello (heard!)",
      description: "Слушатель успел дописать текст в событие до того, как контроллер прочитал его обратно",
    },
  ],
  hint: "dispatch() выполняет всех подписанных слушателей синхронно, прямо во время вызова — к моменту, когда dispatch() вернёт управление, $event уже мог быть изменён любым из них.",
};
