import type { Exercise } from "../types";
import { latestYearBookStrategyPhp, taggedRecommendationStrategyInterfacePhp } from "./shared/recommendation-strategies";

export const allRecommendationsControllerExercise: Exercise = {
  id: "all-recommendations-controller",
  mode: "symfony-app",
  title: "Собери сразу все реализации",
  description:
    "Интерфейс пометили тегом — теперь можно получить сразу ВСЕ его реализации одним параметром, без перечисления каждой по отдельности. Напиши контроллер, который возвращает список имён всех доступных стратегий.",
  targetPath: "src/Controller/AllController.php",
  contextFiles: [
    {
      path: "src/Service/RecommendationStrategyInterface.php",
      description: "интерфейс теперь помечен #[AutoconfigureTag]",
    },
    { path: "src/Service/RandomBookStrategy.php", description: "первая реализация" },
    { path: "src/Service/LatestYearBookStrategy.php", description: "вторая реализация" },
  ],
  fixtureOverrides: [
    { path: "src/Service/LatestYearBookStrategy.php", content: latestYearBookStrategyPhp },
    { path: "src/Service/RecommendationStrategyInterface.php", content: taggedRecommendationStrategyInterfacePhp },
  ],
  starterCode: `<?php

namespace App\\Controller;

use App\\Service\\RecommendationStrategyInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\DependencyInjection\\Attribute\\AutowireIterator;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class AllController extends AbstractController
{
    #[Route('/books/recommend-all', methods: ['GET'])]
    public function __invoke(/* TODO: добавь параметр #[AutowireIterator('app.recommendation_strategy')] iterable $strategies */): JsonResponse
    {
        $names = [];
        // TODO: пройдись циклом по $strategies, для каждого вызови ->name() и добавь в $names

        return new JsonResponse(['strategies' => $names]);
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Service\\RecommendationStrategyInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\DependencyInjection\\Attribute\\AutowireIterator;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;

class AllController extends AbstractController
{
    #[Route('/books/recommend-all', methods: ['GET'])]
    public function __invoke(#[AutowireIterator('app.recommendation_strategy')] iterable $strategies): JsonResponse
    {
        $names = [];
        foreach ($strategies as $strategy) {
            /** @var RecommendationStrategyInterface $strategy */
            $names[] = $strategy->name();
        }

        return new JsonResponse(['strategies' => $names]);
    }
}
`,
  requests: [{ id: "all", method: "GET", path: "/books/recommend-all" }],
  checks: [
    { type: "http-status", requestId: "all", expectedStatus: 200, description: "GET /books/recommend-all → 200" },
    { type: "http-body-contains", requestId: "all", value: "random", description: "Список содержит стратегию random" },
    { type: "http-body-contains", requestId: "all", value: "latest-year", description: "Список содержит стратегию latest-year" },
  ],
  hint: "Тег в #[AutowireIterator('app.recommendation_strategy')] должен совпадать со строкой в #[AutoconfigureTag('app.recommendation_strategy')] над интерфейсом — это просто одна и та же метка, по которой контейнер находит нужные сервисы.",
};
