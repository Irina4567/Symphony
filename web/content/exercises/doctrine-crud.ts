import type { Exercise } from "../types";

export const doctrineCrudExercise: Exercise = {
  id: "doctrine-crud",
  mode: "symfony-app",
  title: "EntityManager: создать и сохранить книгу",
  description:
    "Entity Book уже готова (и зашита в песочницу). Допиши контроллер: создай новую книгу из JSON-тела запроса и сохрани её через EntityManager.",
  targetPath: "src/Controller/BookCrudController.php",
  setupCommands: ["php bin/console doctrine:schema:create"],
  contextFiles: [{ path: "src/Entity/Book.php", description: "готовая Entity, с которой работает EntityManager" }],
  starterCode: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookCrudController
{
    #[Route('/exercises/doctrine-crud', name: 'exercise_doctrine_crud', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // TODO: создай новый Book, заполни title и year из $data,
        // сохрани через $em->persist() + $em->flush()
        // верни JsonResponse(['id' => ..., 'title' => ...], 201)
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookCrudController
{
    #[Route('/exercises/doctrine-crud', name: 'exercise_doctrine_crud', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $book = new Book();
        $book->setTitle($data['title']);
        $book->setYear($data['year']);
        $em->persist($book);
        $em->flush();

        return new JsonResponse(['id' => $book->getId(), 'title' => $book->getTitle()], 201);
    }
}
`,
  requests: [{ id: "r1", method: "POST", path: "/exercises/doctrine-crud", body: '{"title":"Dune","year":1965}' }],
  checks: [
    { type: "http-status", requestId: "r1", expectedStatus: 201, description: "POST с валидными данными → 201" },
    { type: "http-body-contains", requestId: "r1", value: "Dune", description: "Тело ответа содержит созданную книгу" },
    { type: "http-body-contains", requestId: "r1", value: '"id":1', description: "База была пустой — новой книге присвоен id 1" },
  ],
  hint: "persist() только помечает объект к сохранению (INSERT ещё не выполнен). Реальный SQL-запрос отправляется в базу только при вызове flush() — и только тогда у объекта появляется настоящий id.",
};
