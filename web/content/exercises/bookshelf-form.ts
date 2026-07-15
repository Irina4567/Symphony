import type { Exercise } from "../types";
import { constrainedBookPhp } from "./shared/constrained-book";

export const bookshelfFormExercise: Exercise = {
  id: "bookshelf-form",
  mode: "symfony-app",
  title: "BookShelf: форма добавления книги",
  description:
    "Собери три действия: список книг, пустая форма добавления и её обработка — с сохранением при успехе (и редиректом по паттерну Post/Redirect/Get) или повторным показом формы с ошибками при провале.",
  targetPath: "src/Controller/BookFormController.php",
  setupCommands: ["php bin/console doctrine:schema:create"],
  contextFiles: [
    { path: "src/Form/BookFormType.php", description: "готовая форма" },
    { path: "src/Entity/Book.php", description: "готовая сущность с constraints из прошлых уроков" },
    { path: "templates/exercises/book_form.html.twig", description: "шаблон, который рендерит форму" },
  ],
  fixtureOverrides: [{ path: "src/Entity/Book.php", content: constrainedBookPhp }],
  starterCode: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Form\\BookFormType;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\HttpFoundation\\Response;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookFormController extends AbstractController
{
    #[Route('/books', name: 'books_index', methods: ['GET'])]
    public function index(EntityManagerInterface $em): JsonResponse
    {
        // TODO: верни JsonResponse со списком всех книг: [['id' => ..., 'title' => ...], ...]
    }

    #[Route('/books/new', name: 'books_new', methods: ['GET'])]
    public function new(): Response
    {
        // TODO: создай форму (createForm(BookFormType::class, new Book()))
        // верни $this->render('exercises/book_form.html.twig', ['form' => $form])
    }

    #[Route('/books/new', name: 'books_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): Response
    {
        // TODO: создай форму, handleRequest($request)
        // если валидна — сохрани книгу, добавь flash 'success', сделай redirectToRoute('books_index')
        // если невалидна — верни $this->render(...) с той же формой (покажет ошибки автоматически)
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use App\\Form\\BookFormType;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\HttpFoundation\\Response;
use Symfony\\Component\\Routing\\Attribute\\Route;

class BookFormController extends AbstractController
{
    #[Route('/books', name: 'books_index', methods: ['GET'])]
    public function index(EntityManagerInterface $em): JsonResponse
    {
        $books = $em->getRepository(Book::class)->findAll();

        return new JsonResponse(array_map(
            static fn (Book $b) => ['id' => $b->getId(), 'title' => $b->getTitle()],
            $books
        ));
    }

    #[Route('/books/new', name: 'books_new', methods: ['GET'])]
    public function new(): Response
    {
        $form = $this->createForm(BookFormType::class, new Book());

        return $this->render('exercises/book_form.html.twig', ['form' => $form]);
    }

    #[Route('/books/new', name: 'books_create', methods: ['POST'])]
    public function create(Request $request, EntityManagerInterface $em): Response
    {
        $form = $this->createForm(BookFormType::class, new Book());
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $book = $form->getData();
            $em->persist($book);
            $em->flush();

            $this->addFlash('success', 'Книга добавлена!');

            return $this->redirectToRoute('books_index');
        }

        return $this->render('exercises/book_form.html.twig', ['form' => $form]);
    }
}
`,
  requests: [
    { id: "index-before", method: "GET", path: "/books" },
    { id: "new", method: "GET", path: "/books/new" },
    {
      id: "create-valid",
      method: "POST",
      path: "/books/new",
      body: "book_form[title]=Dune&book_form[year]=1965&book_form[save]=",
      contentType: "application/x-www-form-urlencoded",
    },
    { id: "index-after", method: "GET", path: "/books" },
    {
      id: "create-invalid",
      method: "POST",
      path: "/books/new",
      body: "book_form[title]=A&book_form[year]=1965&book_form[save]=",
      contentType: "application/x-www-form-urlencoded",
    },
  ],
  checks: [
    { type: "http-status", requestId: "index-before", expectedStatus: 200, description: "GET /books → 200" },
    { type: "http-status", requestId: "new", expectedStatus: 200, description: "GET /books/new → 200" },
    { type: "http-body-contains", requestId: "new", value: 'name="book_form[title]"', description: "Форма отрендерена с полем title" },
    { type: "http-status", requestId: "create-valid", expectedStatus: 302, description: "Успешная отправка → редирект (Post/Redirect/Get)" },
    {
      type: "http-body-contains",
      requestId: "index-after",
      value: "Dune",
      description: "Список книг после редиректа содержит только что созданную книгу",
    },
    {
      type: "http-status",
      requestId: "create-invalid",
      expectedStatus: 422,
      description: "Невалидная отправка → 422 Unprocessable Entity (Symfony проставляет его автоматически при рендере невалидной формы)",
    },
    {
      type: "http-body-contains",
      requestId: "create-invalid",
      value: "too short",
      description: "Невалидная отправка повторно показывает форму с сообщением об ошибке",
    },
  ],
  hint: "Post/Redirect/Get: после успешной отправки формы не рендери страницу с результатом напрямую — сделай редирект. Если пользователь потом обновит страницу (F5), браузер повторит только последний GET, а не повторную отправку формы.",
};
