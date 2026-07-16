<?php

namespace App\Controller;

use App\Entity\Book;
use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

// Харнесс для упражнения про Voter: создаёт книгу с владельцем и проверяет доступ через
// isGranted('EDIT', $book) — сам BookVoter пишет ученик, этот контроллер только его использует.
class VoterExerciseController extends AbstractController
{
    #[Route('/exercises/voter-setup', methods: ['POST'])]
    public function setup(EntityManagerInterface $em): JsonResponse
    {
        $owner = $em->getRepository(User::class)->findOneBy(['email' => 'reader@bookshelf.test']);

        $book = new Book();
        $book->setTitle('Dune');
        $book->setYear(1965);
        $book->setOwner($owner);

        $em->persist($book);
        $em->flush();

        return new JsonResponse(['id' => $book->getId()]);
    }

    #[Route('/exercises/voter-check/{id}', methods: ['GET'])]
    public function check(int $id, EntityManagerInterface $em): JsonResponse
    {
        $book = $em->getRepository(Book::class)->find($id);

        return new JsonResponse(['canEdit' => $this->isGranted('EDIT', $book)]);
    }
}
