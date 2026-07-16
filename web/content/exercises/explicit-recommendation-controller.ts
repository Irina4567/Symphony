import type { Exercise } from "../types";
import { latestYearBookStrategyPhp } from "./shared/recommendation-strategies";

export const explicitRecommendationControllerExercise: Exercise = {
  id: "explicit-recommendation-controller",
  mode: "symfony-app",
  title: "Явно укажи нужную реализацию",
  description:
    "Появилась вторая стратегия — LatestYearBookStrategy. Теперь просто типизировать параметр интерфейсом недостаточно: автовайринг не знает, какую из двух реализаций выбрать. Укажи явно через #[Autowire(service: ...)].",
  targetPath: "src/Controller/ExplicitController.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-books"],
  contextFiles: [
    { path: "src/Service/RecommendationStrategyInterface.php", description: "контракт стратегии рекомендации" },
    { path: "src/Service/RandomBookStrategy.php", description: "первая реализация" },
    { path: "src/Service/LatestYearBookStrategy.php", description: "вторая реализация — теперь их две" },
  ],
  fixtureOverrides: [{ path: "src/Service/LatestYearBookStrategy.php", content: latestYearBookStrategyPhp }],
  starterCode: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Service\\LatestYearBookStrategy;
use App\\Service\\RecommendationStrategyInterface;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\DependencyInjection\\Attribute\\Autowire;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class ExplicitController extends AbstractController
{
    #[Route('/books/recommend-explicit', methods: ['GET'])]
    public function __invoke(
        EntityManagerInterface $em,
        RecommendationStrategyInterface $strategy // TODO: добавь атрибут #[Autowire(service: LatestYearBookStrategy::class)] перед этим параметром
    ): JsonResponse {
        $books = $em->getRepository(Book::class)->findAll();
        $book = $strategy->recommend($books);

        return new JsonResponse(['strategy' => $strategy->name(), 'title' => $book?->getTitle()]);
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Service\\LatestYearBookStrategy;
use App\\Service\\RecommendationStrategyInterface;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\DependencyInjection\\Attribute\\Autowire;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class ExplicitController extends AbstractController
{
    #[Route('/books/recommend-explicit', methods: ['GET'])]
    public function __invoke(
        EntityManagerInterface $em,
        #[Autowire(service: LatestYearBookStrategy::class)] RecommendationStrategyInterface $strategy
    ): JsonResponse {
        $books = $em->getRepository(Book::class)->findAll();
        $book = $strategy->recommend($books);

        return new JsonResponse(['strategy' => $strategy->name(), 'title' => $book?->getTitle()]);
    }
}
`,
  requests: [{ id: "recommend", method: "GET", path: "/books/recommend-explicit" }],
  checks: [
    { type: "http-status", requestId: "recommend", expectedStatus: 200, description: "GET /books/recommend-explicit → 200" },
    { type: "http-body-contains", requestId: "recommend", value: '"strategy":"latest-year"', description: "Внедрена именно LatestYearBookStrategy, а не первая попавшаяся" },
    { type: "http-body-contains", requestId: "recommend", value: "Clean Code", description: "Рекомендована книга с максимальным годом издания (2008)" },
  ],
  hint: "#[Autowire(service: ...)] — это атрибут именно над параметром, не над классом. Он говорит контейнеру: 'для этого конкретного параметра не пытайся угадывать — вот точный сервис, который нужно подставить'.",
};
