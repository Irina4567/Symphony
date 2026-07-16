import type { Exercise } from "../types";
import { latestYearBookStrategyPhp, taggedRecommendationStrategyInterfacePhp } from "./shared/recommendation-strategies";

export const bookshelfRecommendExercise: Exercise = {
  id: "bookshelf-recommend",
  mode: "symfony-app",
  title: "BookShelf, часть 6: сервис рекомендаций",
  description:
    "Собери один маршрут GET /books/recommend?strategy=..., который выбирает нужную стратегию рекомендации по имени из query-параметра среди ВСЕХ зарегистрированных стратегий и возвращает рекомендованную книгу — либо понятную ошибку, если такой стратегии нет.",
  targetPath: "src/Controller/BookRecommendController.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-books"],
  contextFiles: [
    { path: "src/Service/RecommendationStrategyInterface.php", description: "тегированный контракт стратегии" },
    { path: "src/Service/RandomBookStrategy.php", description: "стратегия random" },
    { path: "src/Service/LatestYearBookStrategy.php", description: "стратегия latest-year" },
  ],
  fixtureOverrides: [
    { path: "src/Service/LatestYearBookStrategy.php", content: latestYearBookStrategyPhp },
    { path: "src/Service/RecommendationStrategyInterface.php", content: taggedRecommendationStrategyInterfacePhp },
  ],
  starterCode: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Service\\RecommendationStrategyInterface;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\DependencyInjection\\Attribute\\AutowireIterator;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookRecommendController extends AbstractController
{
    #[Route('/books/recommend', methods: ['GET'])]
    public function __invoke(
        Request $request,
        EntityManagerInterface $em
        // TODO: добавь параметр #[AutowireIterator('app.recommendation_strategy')] iterable $strategies
    ): JsonResponse {
        $strategyName = $request->query->get('strategy', '');

        // TODO: пройдись по $strategies, найди ту, чьё name() совпадает с $strategyName
        // если не нашёл — верни 400 с {"error": "...", "available": [...список всех имён...]}

        // TODO: получи все книги через EntityManager, вызови $matched->recommend($books)
        // верни JsonResponse(['strategy' => ..., 'title' => ..., 'year' => ...])
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Service\\RecommendationStrategyInterface;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\DependencyInjection\\Attribute\\AutowireIterator;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookRecommendController extends AbstractController
{
    #[Route('/books/recommend', methods: ['GET'])]
    public function __invoke(
        Request $request,
        EntityManagerInterface $em,
        #[AutowireIterator('app.recommendation_strategy')] iterable $strategies
    ): JsonResponse {
        $strategyName = $request->query->get('strategy', '');

        $matched = null;
        $available = [];
        foreach ($strategies as $strategy) {
            /** @var RecommendationStrategyInterface $strategy */
            $available[] = $strategy->name();
            if ($strategy->name() === $strategyName) {
                $matched = $strategy;
            }
        }

        if ($matched === null) {
            return new JsonResponse(['error' => 'Unknown strategy', 'available' => $available], 400);
        }

        $books = $em->getRepository(Book::class)->findAll();
        $book = $matched->recommend($books);

        return new JsonResponse(['strategy' => $matched->name(), 'title' => $book?->getTitle(), 'year' => $book?->getYear()]);
    }
}
`,
  requests: [
    { id: "latest", method: "GET", path: "/books/recommend?strategy=latest-year" },
    { id: "random", method: "GET", path: "/books/recommend?strategy=random" },
    { id: "unknown", method: "GET", path: "/books/recommend?strategy=bogus" },
  ],
  checks: [
    { type: "http-status", requestId: "latest", expectedStatus: 200, description: "strategy=latest-year → 200" },
    { type: "http-body-contains", requestId: "latest", value: "Clean Code", description: "Рекомендована книга с максимальным годом (2008)" },
    { type: "http-status", requestId: "random", expectedStatus: 200, description: "strategy=random → 200" },
    { type: "http-status", requestId: "unknown", expectedStatus: 400, description: "Неизвестная стратегия → 400" },
    { type: "http-body-contains", requestId: "unknown", value: '"available"', description: "Ошибка подсказывает список доступных стратегий" },
  ],
  hint: "Это ровно та же связка, что и в прошлом уроке (#[AutowireIterator]) — только теперь имя стратегии выбирается не жёстко в коде, а по значению из query-параметра запроса.",
};
