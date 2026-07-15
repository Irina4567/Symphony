<?php

namespace App\Repository;

use App\Entity\Book;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * Постоянная фикстура (пустой репозиторий без кастомных методов) — используется уроками 2 и
 * мини-проектом как есть. Урок 3 просит написать метод с QueryBuilder — в том упражнении
 * targetPath указывает на этот же путь и подменяет собой эту фикстуру.
 */
class BookRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Book::class);
    }
}
