import type { Exercise } from "../types";
import { constrainedBookPhp } from "./shared/constrained-book";

export const formSubmitExercise: Exercise = {
  id: "form-submit",
  mode: "symfony-app",
  title: "Обработай отправку формы",
  description:
    "FormType готов, а Entity Book уже пополнилась constraints, которые ты написал в прошлом уроке. Прими отправленную форму, проверь её валидность и либо сохрани книгу, либо верни ошибки.",
  targetPath: "src/Controller/BookSubmitController.php",
  setupCommands: ["php bin/console doctrine:schema:create"],
  contextFiles: [
    { path: "src/Form/BookFormType.php", description: "готовая форма, которую нужно обработать" },
    { path: "src/Entity/Book.php", description: "constraints из прошлого урока, из-за которых форма может быть невалидной" },
  ],
  fixtureOverrides: [{ path: "src/Entity/Book.php", content: constrainedBookPhp }],
  starterCode: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Form\\BookFormType;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookSubmitController extends AbstractController
{
    #[Route('/exercises/form-submit', name: 'exercise_form_submit', methods: ['POST'])]
    public function submit(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $form = $this->createForm(BookFormType::class, new Book());
        $form->handleRequest($request);

        // TODO: если $form->isSubmitted() && $form->isValid():
        //   получи книгу через $form->getData(), сохрани (persist + flush)
        //   верни JsonResponse(['ok' => true, 'id' => ..., 'title' => ...], 201)
        // иначе:
        //   собери сообщения ошибок из $form->getErrors(true) (каждый $error->getMessage())
        //   верни JsonResponse(['ok' => false, 'errors' => $errors], 400)
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Form\\BookFormType;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookSubmitController extends AbstractController
{
    #[Route('/exercises/form-submit', name: 'exercise_form_submit', methods: ['POST'])]
    public function submit(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $form = $this->createForm(BookFormType::class, new Book());
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $book = $form->getData();
            $em->persist($book);
            $em->flush();

            return new JsonResponse(['ok' => true, 'id' => $book->getId(), 'title' => $book->getTitle()], 201);
        }

        $errors = [];
        foreach ($form->getErrors(true) as $error) {
            $errors[] = $error->getMessage();
        }

        return new JsonResponse(['ok' => false, 'errors' => $errors], 400);
    }
}
`,
  requests: [
    {
      id: "valid",
      method: "POST",
      path: "/exercises/form-submit",
      body: "book_form[title]=Dune&book_form[year]=1965&book_form[save]=",
      contentType: "application/x-www-form-urlencoded",
    },
    {
      id: "invalid",
      method: "POST",
      path: "/exercises/form-submit",
      body: "book_form[title]=A&book_form[year]=1965&book_form[save]=",
      contentType: "application/x-www-form-urlencoded",
    },
  ],
  checks: [
    { type: "http-status", requestId: "valid", expectedStatus: 201, description: "Валидная отправка → 201" },
    { type: "http-body-contains", requestId: "valid", value: "Dune", description: "Созданная книга возвращается в ответе" },
    { type: "http-status", requestId: "invalid", expectedStatus: 400, description: "Невалидная отправка (title из 1 символа) → 400" },
    {
      type: "http-body-contains",
      requestId: "invalid",
      value: "too short",
      description: "Тело ответа содержит сообщение об ошибке валидации",
    },
  ],
  hint: "handleRequest() сам разбирает form-urlencoded тело запроса (то же самое form_data, что отправил бы обычный HTML-браузер) и заполняет объект Book — искать поля вручную через $request->request не нужно.",
};
