<?php

namespace App\Controller;

use App\Entity\Author;
use App\Entity\Book;
use App\Repository\BookRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Постоянный "харнесс" для упражнений блока про Doctrine: маршруты уже написаны и зашиты
 * в образ песочницы. Ученик пишет Entity/Repository, которые эти маршруты используют
 * (targetPath конкретного упражнения подменяет собой соответствующую фикстуру).
 */
class DoctrineExerciseController
{
    #[Route('/exercises/doctrine-entity', name: 'exercise_doctrine_entity', methods: ['POST'])]
    public function entity(EntityManagerInterface $em): JsonResponse
    {
        $book = new Book();
        $book->setTitle('1984');
        $book->setAuthor('George Orwell');
        $book->setYear(1949);
        $em->persist($book);
        $em->flush();

        $id = $book->getId();
        $em->clear();

        $found = $em->getRepository(Book::class)->find($id);

        return new JsonResponse([
            'id' => $found?->getId(),
            'title' => $found?->getTitle(),
            'author' => $found?->getAuthor(),
            'year' => $found?->getYear(),
        ]);
    }

    #[Route('/exercises/doctrine-query', name: 'exercise_doctrine_query', methods: ['GET'])]
    public function query(BookRepository $repo): JsonResponse
    {
        $books = $repo->findPublishedAfter(1950);

        return new JsonResponse(array_map(
            static fn (Book $book) => ['title' => $book->getTitle(), 'year' => $book->getYear()],
            $books
        ));
    }

    #[Route('/exercises/doctrine-relation', name: 'exercise_doctrine_relation', methods: ['POST'])]
    public function relation(EntityManagerInterface $em): JsonResponse
    {
        $author = new Author();
        $author->setName('Frank Herbert');
        $em->persist($author);

        $book = new Book();
        $book->setTitle('Dune');
        $book->setYear(1965);
        $book->setAuthor($author);
        $em->persist($book);
        $em->flush();

        $id = $book->getId();
        $em->clear();

        $found = $em->getRepository(Book::class)->find($id);

        return new JsonResponse([
            'title' => $found?->getTitle(),
            'authorName' => $found?->getAuthor()?->getName(),
        ]);
    }
}
