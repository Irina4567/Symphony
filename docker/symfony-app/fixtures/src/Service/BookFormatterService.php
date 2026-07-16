<?php

namespace App\Service;

use App\Entity\Book;

class BookFormatterService
{
    public function format(Book $book): string
    {
        return sprintf('%s (%d)', $book->getTitle(), $book->getYear());
    }
}
