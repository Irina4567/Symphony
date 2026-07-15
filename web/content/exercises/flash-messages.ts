import type { Exercise } from "../types";

export const flashMessagesExercise: Exercise = {
  id: "flash-messages",
  mode: "symfony-app",
  title: "Flash-сообщение после успешного действия",
  description:
    "После условного сохранения книги добавь flash-сообщение и сделай редирект на страницу, которая его покажет.",
  targetPath: "src/Controller/BookFlashController.php",
  contextFiles: [
    {
      path: "src/Controller/FormExerciseController.php",
      description: "маршрут exercise_flash_show, на который нужно сослаться",
    },
  ],
  starterCode: `<?php

namespace App\\Controller;

use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\RedirectResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookFlashController extends AbstractController
{
    #[Route('/exercises/flash-set', name: 'exercise_flash_set', methods: ['POST'])]
    public function set(): RedirectResponse
    {
        // TODO: добавь flash-сообщение категории 'success' с текстом 'Книга добавлена!'
        // через $this->addFlash(...)
        // TODO: верни редирект на маршрут 'exercise_flash_show' через $this->redirectToRoute(...)
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\RedirectResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookFlashController extends AbstractController
{
    #[Route('/exercises/flash-set', name: 'exercise_flash_set', methods: ['POST'])]
    public function set(): RedirectResponse
    {
        $this->addFlash('success', 'Книга добавлена!');

        return $this->redirectToRoute('exercise_flash_show');
    }
}
`,
  requests: [
    { id: "set", method: "POST", path: "/exercises/flash-set" },
    { id: "show", method: "GET", path: "/exercises/flash-show" },
  ],
  checks: [
    { type: "http-status", requestId: "set", expectedStatus: 302, description: "POST выполняет редирект (302), а не рендерит страницу напрямую" },
    { type: "http-body-contains", requestId: "show", value: "Книга добавлена!", description: "Flash-сообщение доступно на следующей странице после редиректа" },
  ],
  hint: "Flash-сообщение живёт в сессии ровно один следующий запрос — оно 'сгорает' сразу после первого чтения. Именно поэтому эта пара запросов работает только благодаря общей cookie-сессии между ними, как в настоящем браузере.",
};
