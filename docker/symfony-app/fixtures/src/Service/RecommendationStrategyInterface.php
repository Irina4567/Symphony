<?php

namespace App\Service;

use App\Entity\Book;

interface RecommendationStrategyInterface
{
    public function name(): string;

    /** @param Book[] $books */
    public function recommend(array $books): ?Book;
}
