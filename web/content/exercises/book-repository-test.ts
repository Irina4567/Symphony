import type { Exercise } from "../types";

export const bookRepositoryTestExercise: Exercise = {
  id: "book-repository-test",
  mode: "symfony-phpunit",
  title: "KernelTestCase: тестируем с реальным контейнером",
  description:
    "Напиши тест, который загружает настоящий DI-контейнер приложения (как в реальном запросе) и через него получает EntityManager — чтобы проверить, что книга действительно сохраняется в базу и находится обратно.",
  targetPath: "tests/Repository/BookRepositoryTest.php",
  setupCommands: ["APP_ENV=test php bin/console doctrine:schema:create"],
  contextFiles: [
    { path: "src/Entity/Book.php", description: "сущность, которую сохраняем" },
    { path: "src/Entity/Author.php", description: "связанная сущность" },
  ],
  starterCode: `<?php

namespace App\\Tests\\Repository;

use App\\Entity\\Author;
use App\\Entity\\Book;
use Symfony\\Bundle\\FrameworkBundle\\Test\\KernelTestCase;

class BookRepositoryTest extends KernelTestCase
{
    public function testPersistAndFindBook(): void
    {
        // TODO: self::bootKernel() — поднимает контейнер приложения
        // TODO: получи EntityManager: self::getContainer()->get('doctrine')->getManager()
        // TODO: создай Author('Frank Herbert'), сохрани (persist)
        // TODO: создай Book(title: 'Dune', year: 1965, author: $author), сохрани и flush()
        // TODO: найди книгу через $em->getRepository(Book::class)->findOneBy(['title' => 'Dune'])
        // TODO: assertNotNull($found), assertSame(1965, $found->getYear())
    }

    public function testFindReturnsNullForMissingBook(): void
    {
        // TODO: то же bootKernel() + получение EntityManager
        // TODO: найди книгу с несуществующим title, assertNull(...)
    }
}
`,
  solution: `<?php

namespace App\\Tests\\Repository;

use App\\Entity\\Author;
use App\\Entity\\Book;
use Symfony\\Bundle\\FrameworkBundle\\Test\\KernelTestCase;

class BookRepositoryTest extends KernelTestCase
{
    public function testPersistAndFindBook(): void
    {
        self::bootKernel();
        $em = self::getContainer()->get('doctrine')->getManager();

        $author = new Author();
        $author->setName('Frank Herbert');
        $em->persist($author);

        $book = new Book();
        $book->setTitle('Dune')->setYear(1965)->setAuthor($author);
        $em->persist($book);
        $em->flush();

        $found = $em->getRepository(Book::class)->findOneBy(['title' => 'Dune']);
        $this->assertNotNull($found);
        $this->assertSame(1965, $found->getYear());
    }

    public function testFindReturnsNullForMissingBook(): void
    {
        self::bootKernel();
        $em = self::getContainer()->get('doctrine')->getManager();

        $found = $em->getRepository(Book::class)->findOneBy(['title' => 'Заведомо несуществующая книга']);
        $this->assertNull($found);
    }
}
`,
  hint: "self::getContainer() доступен только после self::bootKernel() (или self::createClient() в WebTestCase, который тоже загружает контейнер) — вызов до этого выбросит исключение.",
};
