import type { Exercise } from "../types";

export const bookFormatterTestExercise: Exercise = {
  id: "book-formatter-test",
  mode: "symfony-phpunit",
  title: "Первый юнит-тест: BookFormatterService",
  description:
    "BookFormatterService (из Блока 6) — простой сервис без зависимостей от фреймворка. Напиши для него юнит-тест: создай книгу вручную, вызови сервис, сравни результат с ожидаемым.",
  targetPath: "tests/Service/BookFormatterServiceTest.php",
  contextFiles: [{ path: "src/Service/BookFormatterService.php", description: "сервис, который нужно протестировать" }],
  starterCode: `<?php

namespace App\\Tests\\Service;

use App\\Entity\\Book;
use App\\Service\\BookFormatterService;
use PHPUnit\\Framework\\TestCase;

class BookFormatterServiceTest extends TestCase
{
    public function testFormatsTitleAndYear(): void
    {
        // TODO: создай Book с title='Dune', year=1965
        // TODO: создай BookFormatterService
        // TODO: assertSame('Dune (1965)', $formatter->format($book))
    }

    public function testFormatsDifferentBook(): void
    {
        // TODO: то же самое для книги title='1984', year=1949
        // TODO: assertSame('1984 (1949)', ...)
    }
}
`,
  solution: `<?php

namespace App\\Tests\\Service;

use App\\Entity\\Book;
use App\\Service\\BookFormatterService;
use PHPUnit\\Framework\\TestCase;

class BookFormatterServiceTest extends TestCase
{
    public function testFormatsTitleAndYear(): void
    {
        $book = new Book();
        $book->setTitle('Dune')->setYear(1965);

        $formatter = new BookFormatterService();

        $this->assertSame('Dune (1965)', $formatter->format($book));
    }

    public function testFormatsDifferentBook(): void
    {
        $book = new Book();
        $book->setTitle('1984')->setYear(1949);

        $formatter = new BookFormatterService();

        $this->assertSame('1984 (1949)', $formatter->format($book));
    }
}
`,
  hint: "Никакого Symfony-контейнера, никакого EntityManager — обычный TestCase из PHPUnit и обычный new. Это и есть юнит-тест: проверяем один класс в полной изоляции от остального приложения.",
};
