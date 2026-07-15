<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Постоянный "харнесс" для упражнений блока про Twig: контроллеры уже написаны и зашиты
 * в образ песочницы, ученик пишет только сами .twig-шаблоны, которые эти маршруты рендерят.
 */
class TwigExerciseController extends AbstractController
{
    #[Route('/exercises/twig-basics', name: 'exercise_twig_basics', methods: ['GET'])]
    public function basics(): Response
    {
        return $this->render('exercises/basics.html.twig', [
            'name' => 'anna',
            'price' => 99.5,
        ]);
    }

    #[Route('/exercises/twig-loop', name: 'exercise_twig_loop', methods: ['GET'])]
    public function loop(): Response
    {
        return $this->render('exercises/loop.html.twig', [
            'books' => [
                ['title' => '1984'],
                ['title' => 'Dune'],
                ['title' => 'Clean Code'],
            ],
        ]);
    }

    #[Route('/exercises/twig-loop-empty', name: 'exercise_twig_loop_empty', methods: ['GET'])]
    public function loopEmpty(): Response
    {
        return $this->render('exercises/loop.html.twig', ['books' => []]);
    }

    #[Route('/exercises/twig-child', name: 'exercise_twig_child', methods: ['GET'])]
    public function child(): Response
    {
        return $this->render('exercises/child.html.twig');
    }

    #[Route('/exercises/twig-links', name: 'exercise_twig_links', methods: ['GET'])]
    public function links(): Response
    {
        return $this->render('exercises/links.html.twig', ['bookId' => 42]);
    }

    #[Route('/books/{id}', name: 'book_show_page', methods: ['GET'])]
    public function bookShowPage(int $id): Response
    {
        return new Response("Книга #{$id}");
    }

    #[Route('/exercises/bookshelf-catalog', name: 'exercise_bookshelf_catalog', methods: ['GET'])]
    public function catalog(): Response
    {
        return $this->render('exercises/bookshelf_catalog.html.twig', [
            'books' => [
                ['id' => 1, 'title' => '1984', 'author' => 'George Orwell'],
                ['id' => 2, 'title' => 'Clean Code', 'author' => 'Robert C. Martin'],
                ['id' => 3, 'title' => 'Dune', 'author' => 'Frank Herbert'],
            ],
        ]);
    }

    #[Route('/exercises/bookshelf-catalog-empty', name: 'exercise_bookshelf_catalog_empty', methods: ['GET'])]
    public function catalogEmpty(): Response
    {
        return $this->render('exercises/bookshelf_catalog.html.twig', ['books' => []]);
    }
}
