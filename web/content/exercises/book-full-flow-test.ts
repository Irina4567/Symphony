import type { Exercise } from "../types";

export const bookFullFlowTestExercise: Exercise = {
  id: "book-full-flow-test",
  mode: "symfony-phpunit",
  title: "setUp(): не повторяй подготовку в каждом тесте",
  description:
    "Оба теста в этом файле начинаются с одного и того же — создания клиента. Вынеси это в setUp(), а затем напиши тесты, которые не зависят от результатов друг друга: каждый создаёт СВОИ уникальные данные, а не полагается на то, что уже есть в базе.",
  targetPath: "tests/Controller/TestableBookApiControllerTest.php",
  setupCommands: ["APP_ENV=test php bin/console doctrine:schema:create"],
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
        // TODO: $this->client = static::createClient()
    }

    public function testCreatedBookAppearsInList(): void
    {
        // TODO: POST /api/testable-books с {"title": "Neuromancer", "year": 1984}
        // TODO: assertResponseStatusCodeSame(201)
        // TODO: GET /api/testable-books, разбери JSON-список
        // TODO: убедись, что среди title в списке есть 'Neuromancer' (assertContains)
    }

    public function testCreateAndShowReturnSameTitle(): void
    {
        // TODO: POST /api/testable-books с {"title": "Snow Crash", "year": 1992}
        // TODO: возьми id из ответа создания
        // TODO: GET /api/testable-books/{id}, убедись что title === 'Snow Crash'
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

    public function testCreatedBookAppearsInList(): void
    {
        $this->client->request(
            'POST',
            '/api/testable-books',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['title' => 'Neuromancer', 'year' => 1984])
        );
        $this->assertResponseStatusCodeSame(201);

        $this->client->request('GET', '/api/testable-books');
        $books = json_decode($this->client->getResponse()->getContent(), true);
        $titles = array_column($books, 'title');

        $this->assertContains('Neuromancer', $titles);
    }

    public function testCreateAndShowReturnSameTitle(): void
    {
        $this->client->request(
            'POST',
            '/api/testable-books',
            server: ['CONTENT_TYPE' => 'application/json'],
            content: json_encode(['title' => 'Snow Crash', 'year' => 1992])
        );
        $created = json_decode($this->client->getResponse()->getContent(), true);

        $this->client->request('GET', '/api/testable-books/' . $created['id']);
        $shown = json_decode($this->client->getResponse()->getContent(), true);

        $this->assertSame('Snow Crash', $shown['title']);
    }
}
`,
  hint: "setUp() выполняется заново перед КАЖДЫМ тест-методом — это не 'выполнить один раз для всего класса', а 'подготовить чистый старт для этого конкретного теста'. Поэтому оба теста создают свои собственные уникальные книги, а не полагаются на то, что уже есть в базе от другого теста — порядок выполнения тестов не гарантирован.",
};
