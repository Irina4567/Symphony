// Второй стратегия рекомендации (по году издания) и "тегированная" версия интерфейса —
// то, что появляется по мере того, как блок про DI раскрывает всё новые механизмы. Базовая
// фикстура docker/symfony-app/fixtures/src/Service/RecommendationStrategyInterface.php не
// помечена тегом (состояние уроков 2-3), и в образе есть только одна реализация —
// RandomBookStrategy (состояние урока 2). Более "поздние" версии подставляются через
// fixtureOverrides только тем упражнениям, которые их уже разбирают — как и с constrainedBookPhp
// в Блоке 4 или security.yaml в Блоке 5.

// Вторая реализация — появляется начиная с урока 3 ("явное связывание").
export const latestYearBookStrategyPhp = `<?php

namespace App\\Service;

use App\\Entity\\Book;

class LatestYearBookStrategy implements RecommendationStrategyInterface
{
    public function name(): string
    {
        return 'latest-year';
    }

    public function recommend(array $books): ?Book
    {
        if ($books === []) {
            return null;
        }

        usort($books, static fn (Book $a, Book $b) => $b->getYear() <=> $a->getYear());

        return $books[0];
    }
}
`;

// Тегированная версия интерфейса — появляется начиная с урока 4 ("теги сервисов").
export const taggedRecommendationStrategyInterfacePhp = `<?php

namespace App\\Service;

use App\\Entity\\Book;
use Symfony\\Component\\DependencyInjection\\Attribute\\AutoconfigureTag;

#[AutoconfigureTag('app.recommendation_strategy')]
interface RecommendationStrategyInterface
{
    public function name(): string;

    /** @param Book[] $books */
    public function recommend(array $books): ?Book;
}
`;
