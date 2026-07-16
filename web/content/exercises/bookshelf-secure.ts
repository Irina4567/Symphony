import type { Exercise } from "../types";
import { bookWithOwnerPhp } from "./shared/book-with-owner";
import { securityFullYaml } from "./shared/security-configs";
import { solvedApiLoginAuthenticatorPhp, solvedBookVoterPhp } from "./shared/solved-auth";

export const bookshelfSecureExercise: Exercise = {
  id: "bookshelf-secure",
  mode: "symfony-app",
  title: "BookShelf, часть 5: защити каталог",
  description:
    "Собери три действия: публичный список книг, создание книги (только для вошедших пользователей — создатель автоматически становится владельцем) и редактирование (только для владельца конкретной книги). Login, Authenticator и Voter уже готовы — фокус на контроллере.",
  targetPath: "src/Controller/BookSecureController.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-user"],
  contextFiles: [
    { path: "src/Entity/Book.php", description: "книга с полем owner" },
    { path: "src/Entity/User.php", description: "готовая сущность пользователя" },
    { path: "src/Security/ApiLoginAuthenticator.php", description: "рабочий вход из урока про аутентификацию" },
    { path: "src/Security/BookVoter.php", description: "рабочий Voter из прошлого урока: EDIT разрешён только владельцу" },
  ],
  fixtureOverrides: [
    { path: "src/Entity/Book.php", content: bookWithOwnerPhp },
    { path: "config/packages/security.yaml", content: securityFullYaml },
    { path: "src/Security/ApiLoginAuthenticator.php", content: solvedApiLoginAuthenticatorPhp },
    { path: "src/Security/BookVoter.php", content: solvedBookVoterPhp },
  ],
  starterCode: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;
use Symfony\\Component\\Security\\Http\\Attribute\\IsGranted;

class BookSecureController extends AbstractController
{
    #[Route('/books/secure', name: 'books_secure_index', methods: ['GET'])]
    public function index(EntityManagerInterface $em): JsonResponse
    {
        // TODO: верни JsonResponse со списком всех книг: [['id', 'title', 'owner' => email владельца или null], ...]
        // Этот маршрут публичный — доступен без входа.
    }

    #[Route('/books/secure', name: 'books_secure_create', methods: ['POST'])]
    // TODO: добавь #[IsGranted('ROLE_USER')] — создавать книги может только вошедший пользователь
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        // TODO: разбери JSON {title, year}, создай Book, владельцем сделай $this->getUser()
        // сохрани (persist + flush), верни 201 с {id, title}
    }

    #[Route('/books/secure/{id}', name: 'books_secure_update', methods: ['PATCH'])]
    public function update(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        // TODO: найди книгу по id, если не найдена — верни 404 {"error": "..."}
        // TODO: $this->denyAccessUnlessGranted('EDIT', $book) — редактировать может только владелец
        // TODO: обнови title из JSON-тела, flush(), верни {id, title}
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;
use Symfony\\Component\\Security\\Http\\Attribute\\IsGranted;

class BookSecureController extends AbstractController
{
    #[Route('/books/secure', name: 'books_secure_index', methods: ['GET'])]
    public function index(EntityManagerInterface $em): JsonResponse
    {
        $books = $em->getRepository(Book::class)->findAll();

        return new JsonResponse(array_map(
            static fn (Book $b) => [
                'id' => $b->getId(),
                'title' => $b->getTitle(),
                'owner' => $b->getOwner()?->getUserIdentifier(),
            ],
            $books
        ));
    }

    #[Route('/books/secure', name: 'books_secure_create', methods: ['POST'])]
    #[IsGranted('ROLE_USER')]
    public function create(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $book = new Book();
        $book->setTitle($data['title'] ?? '');
        $book->setYear((int) ($data['year'] ?? 0));
        $book->setOwner($this->getUser());

        $em->persist($book);
        $em->flush();

        return new JsonResponse(['id' => $book->getId(), 'title' => $book->getTitle()], 201);
    }

    #[Route('/books/secure/{id}', name: 'books_secure_update', methods: ['PATCH'])]
    public function update(int $id, Request $request, EntityManagerInterface $em): JsonResponse
    {
        $book = $em->getRepository(Book::class)->find($id);
        if (!$book) {
            return new JsonResponse(['error' => 'Книга не найдена'], 404);
        }

        $this->denyAccessUnlessGranted('EDIT', $book);

        $data = json_decode($request->getContent(), true);
        $book->setTitle($data['title'] ?? $book->getTitle());
        $em->flush();

        return new JsonResponse(['id' => $book->getId(), 'title' => $book->getTitle()]);
    }
}
`,
  requests: [
    {
      id: "anon-create",
      method: "POST",
      path: "/books/secure",
      body: JSON.stringify({ title: "Dune", year: 1965 }),
    },
    {
      id: "login-reader",
      method: "POST",
      path: "/login",
      body: JSON.stringify({ email: "reader@bookshelf.test", password: "secret123" }),
    },
    {
      id: "create",
      method: "POST",
      path: "/books/secure",
      body: JSON.stringify({ title: "Dune", year: 1965 }),
    },
    {
      id: "update-own",
      method: "PATCH",
      path: "/books/secure/1",
      body: JSON.stringify({ title: "Dune (revised edition)" }),
    },
    {
      id: "login-admin",
      method: "POST",
      path: "/login",
      body: JSON.stringify({ email: "admin@bookshelf.test", password: "secret123" }),
    },
    {
      id: "update-foreign",
      method: "PATCH",
      path: "/books/secure/1",
      body: JSON.stringify({ title: "hijacked" }),
    },
    { id: "list", method: "GET", path: "/books/secure" },
  ],
  checks: [
    { type: "http-status", requestId: "anon-create", expectedStatus: 401, description: "Анонимное создание книги → 401" },
    { type: "http-status", requestId: "create", expectedStatus: 201, description: "reader вошёл → создание книги → 201" },
    { type: "http-status", requestId: "update-own", expectedStatus: 200, description: "Владелец редактирует свою книгу → 200" },
    { type: "http-body-contains", requestId: "update-own", value: "revised edition", description: "Название обновилось" },
    {
      type: "http-status",
      requestId: "update-foreign",
      expectedStatus: 403,
      description: "admin вошёл, но не владеет этой книгой → 403 (сработал Voter)",
    },
    { type: "http-status", requestId: "list", expectedStatus: 200, description: "Публичный список доступен без входа → 200" },
    { type: "http-body-contains", requestId: "list", value: "reader@bookshelf.test", description: "В списке виден владелец книги" },
  ],
  hint: "denyAccessUnlessGranted('EDIT', $book) нужно вызывать ПОСЛЕ того, как книга уже найдена (иначе нечего передать вторым аргументом) — но ДО того, как её менять.",
};
