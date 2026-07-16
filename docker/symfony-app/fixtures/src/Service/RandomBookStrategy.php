<?php

namespace App\Service;

use App\Entity\Book;

class RandomBookStrategy implements RecommendationStrategyInterface
{
    public function name(): string
    {
        return 'random';
    }

    public function recommend(array $books): ?Book
    {
        if ($books === []) {
            return null;
        }

        return $books[array_rand($books)];
    }
}
