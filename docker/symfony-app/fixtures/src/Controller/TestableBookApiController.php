<?php

namespace App\Controller;

use App\Entity\Book;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

// Харнесс для Блока 8 "Тестирование": стабильный, всегда одинаковый API, который ученик
// тестирует, а не пишет сам — фокус блока на самих тестах, а не на очередном контроллере.
class TestableBookApiController extends AbstractController
{
    #[Route('/api/testable-books', methods: ['GET'])]
    public function index(EntityManagerInterface $em): JsonResponse
    {
        $books = $em->getRepository(Book::class)->findAll();

        return new JsonResponse(array_map(
            static fn (Book $b) => ['id' => $b->getId(), 'title' => $b->getTitle()],
            $books
        ));
    }

    #[Route('/api/testable-books/{id}', methods: ['GET'])]
    public function show(int $id, EntityManagerInterface $em): JsonResponse
    {
        $book = $em->getRepository(Book::class)->find($id);
        if (!$book) {
            return new JsonResponse(['error' => 'Not found'], 404);
        }

        return new JsonResponse(['id' => $book->getId(), 'title' => $book->getTitle(), 'year' => $book->getYear()]);
    }

    #[Route('/api/testable-books', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $book = new Book();
        $book->setTitle($data['title'] ?? '')->setYear((int) ($data['year'] ?? 0));
        $em->persist($book);
        $em->flush();

        return new JsonResponse(['id' => $book->getId(), 'title' => $book->getTitle()], 201);
    }
}
