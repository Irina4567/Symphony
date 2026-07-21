import type { Exercise } from "../types";

export const bookshelfTestSuiteExercise: Exercise = {
  id: "bookshelf-test-suite",
  mode: "symfony-phpunit",
  title: "BookShelf, часть 8: набор тестов на API каталога",
  description:
    "Напиши полноценный набор тестов для TestableBookApiController: список книг, книга по id (успех и 404), создание книги и то, что созданная книга появляется в последующем списке. Пять тестов, каждый — отдельная, независимая от других проверка.",
  targetPath: "tests/Controller/TestableBookApiControllerTest.php",
  setupCommands: ["APP_ENV=test php bin/console doctrine:schema:create", "APP_ENV=test php bin/console app:seed-books"],
  contextFiles: [
    {
      path: "src/Controller/TestableBookApiController.php",
      description: "стабильный API: список, книга по id, создание",
    },
  ],
  starterCode: `<?php

namespace App\\Tests\\Controller;

use Symfony\\Bundle\\FrameworkBundle\\Test\\WebTestCase;
use Symfony\\Bundle\\FrameworkBundle\\KernelBrowser;

class TestableBookApiControllerTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    public function testListReturnsSeededBooks(): void
    {
        // TODO: GET /api/testable-books, assertResponseIsSuccessful()
        // TODO: разбери JSON, убедись что среди title есть 'Dune'
    }

    public function testShowReturnsBookDetails(): void
    {
        // TODO: GET /api/testable-books/3 (в сидинге это Dune, 1965 — см. SeedBooksCommand)
        // TODO: assertResponseIsSuccessful(), проверь title и year в ответе
    }

    public function testShowMissingBookReturns404(): void
    {
        // TODO: GET /api/testable-books/999, assertResponseStatusCodeSame(404)
    }

    public function testCreateBookReturns201(): void
    {
        // TODO: POST /api/testable-books с {"title": "Foundation", "year": 1951}
        // TODO: assertResponseStatusCodeSame(201), проверь title в ответе
    }

    public function testCreatedBookAppearsInSubsequentList(): void
    {
        // TODO: POST книгу с уникальным title (например, "Hyperion")
        // TODO: GET /api/testable-books, убедись что 'Hyperion' есть в списке title
    }
}
`,
  solution: `<?php

namespace App\\Tests\\Controller;

use Symfony\\Bundle\\FrameworkBundle\\Test\\WebTestCase;
use Symfony\\Bundle\\FrameworkBundle\\KernelBrowser;

class TestableBookApiControllerTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    public function testListReturnsSeededBooks(): void
    {
        $this->client->request('GET', '/api/testable-books');
        $this->assertResponseIsSuccessful();

        $books = json_decode($this->client->getResponse()->getContent(), true);
        $titles = array_column($books, 'title');

        $this->assertContains('Dune', $titles);
    }

    public function testShowReturnsBookDetails(): void
    {
        $this->client->request('GET', '/api/testable-books/3');
        $this->assertResponseIsSuccessful();

        $book = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertSame('Dune', $book['title']);
        $this->assertSame(1965, $book['year']);
    }

    public function testShowMissingBookReturns404(): void
    {
        $this->client->request('GET', '/api/testable-books/999');
        $this->assertResponseStatusCodeSame(404);
    }

    public function testCreateBookReturns201(): void
    {
        $this->client->request(
            'POST',
            '/api/testable-books',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['title' => 'Foundation', 'year' => 1951])
        );
        $this->assertResponseStatusCodeSame(201);

        $book = json_decode($this->client->getResponse()->getContent(), true);
        $this->assertSame('Foundation', $book['title']);
    }

    public function testCreatedBookAppearsInSubsequentList(): void
    {
        $this->client->request(
            'POST',
            '/api/testable-books',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['title' => 'Hyperion', 'year' => 1989])
        );

        $this->client->request('GET', '/api/testable-books');
        $books = json_decode($this->client->getResponse()->getContent(), true);
        $titles = array_column($books, 'title');

        $this->assertContains('Hyperion', $titles);
    }
}
`,
  hint: "Порядок сидинга в SeedBooksCommand: 1984 (id 1), Clean Code (id 2), Dune (id 3) — можно смело опираться на id=3 для Dune, эта команда всегда сидирует одни и те же три книги в одном и том же порядке.",
};
