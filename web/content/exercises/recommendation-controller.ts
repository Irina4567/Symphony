import type { Exercise } from "../types";

export const recommendationControllerExercise: Exercise = {
  id: "recommendation-controller",
  mode: "symfony-app",
  title: "Внедри интерфейс, а не класс",
  description:
    "Готова стратегия рекомендации RandomBookStrategy, реализующая интерфейс RecommendationStrategyInterface. Напиши контроллер, который зависит от ИНТЕРФЕЙСА, а не от конкретного класса — и убедись, что автовайринг сам находит единственную реализацию.",
  targetPath: "src/Controller/RecommendController.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-books"],
  contextFiles: [
    { path: "src/Service/RecommendationStrategyInterface.php", description: "контракт стратегии рекомендации" },
    { path: "src/Service/RandomBookStrategy.php", description: "единственная пока реализация" },
  ],
  starterCode: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Service\\RecommendationStrategyInterface;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class RecommendController extends AbstractController
{
    #[Route('/books/recommend-single', methods: ['GET'])]
    public function __invoke(EntityManagerInterface $em /* TODO: добавь RecommendationStrategyInterface $strategy */): JsonResponse
    {
        $books = $em->getRepository(Book::class)->findAll();

        // TODO: получи книгу через $strategy->recommend($books)
        // верни JsonResponse(['strategy' => $strategy->name(), 'title' => $book?->getTitle()])
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Service\\RecommendationStrategyInterface;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class RecommendController extends AbstractController
{
    #[Route('/books/recommend-single', methods: ['GET'])]
    public function __invoke(EntityManagerInterface $em, RecommendationStrategyInterface $strategy): JsonResponse
    {
        $books = $em->getRepository(Book::class)->findAll();
        $book = $strategy->recommend($books);

        return new JsonResponse(['strategy' => $strategy->name(), 'title' => $book?->getTitle()]);
    }
}
`,
  requests: [{ id: "recommend", method: "GET", path: "/books/recommend-single" }],
  checks: [
    { type: "http-status", requestId: "recommend", expectedStatus: 200, description: "GET /books/recommend-single → 200" },
    { type: "http-body-contains", requestId: "recommend", value: '"strategy":"random"', description: "Автовайринг сам нашёл единственную реализацию — RandomBookStrategy" },
  ],
  hint: "Типизируй параметр интерфейсом RecommendationStrategyInterface, а не классом RandomBookStrategy напрямую. Раз в контейнере зарегистрирована только одна реализация этого интерфейса, Symfony создаёт для неё автоматический алиас — конкретный класс контроллеру знать не нужно.",
};
