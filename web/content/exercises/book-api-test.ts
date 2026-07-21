import type { Exercise } from "../types";

export const bookApiTestExercise: Exercise = {
  id: "book-api-test",
  mode: "symfony-phpunit",
  title: "WebTestCase: тестируем HTTP через клиент",
  description:
    "TestableBookApiController уже готов и всегда доступен по /api/testable-books. Напиши тест, который делает запросы к нему через встроенный тестовый HTTP-клиент — без единого curl и без реального сервера.",
  targetPath: "tests/Controller/TestableBookApiControllerTest.php",
  setupCommands: ["APP_ENV=test php bin/console doctrine:schema:create", "APP_ENV=test php bin/console app:seed-books"],
  contextFiles: [
    {
      path: "src/Controller/TestableBookApiController.php",
      description: "стабильный API: список, книга по id (с 404), создание",
    },
  ],
  starterCode: `<?php

namespace App\\Tests\\Controller;

use Symfony\\Bundle\\FrameworkBundle\\Test\\WebTestCase;

class TestableBookApiControllerTest extends WebTestCase
{
    public function testShowExistingBook(): void
    {
        // TODO: $client = static::createClient()
        // TODO: $client->request('GET', '/api/testable-books/2')
        // TODO: $this->assertResponseIsSuccessful()
        // TODO: разбери JSON из $client->getResponse()->getContent(), проверь title === 'Clean Code'
    }

    public function testShowMissingBookReturns404(): void
    {
        // TODO: запрос к /api/testable-books/999
        // TODO: $this->assertResponseStatusCodeSame(404)
    }
}
`,
  solution: `<?php

namespace App\\Tests\\Controller;

use Symfony\\Bundle\\FrameworkBundle\\Test\\WebTestCase;

class TestableBookApiControllerTest extends WebTestCase
{
    public function testShowExistingBook(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/testable-books/2');

        $this->assertResponseIsSuccessful();
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('Clean Code', $data['title']);
    }

    public function testShowMissingBookReturns404(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/testable-books/999');

        $this->assertResponseStatusCodeSame(404);
    }
}
`,
  hint: "static::createClient() сам вызывает bootKernel() внутри себя — вручную его вызывать не нужно (в отличие от прошлого урока). $client->request() не делает настоящий HTTP-запрос по сети — всё происходит в одном процессе, поэтому тесты выполняются быстро.",
};
