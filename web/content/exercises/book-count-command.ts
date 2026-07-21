import type { Exercise } from "../types";

export const bookCountCommandExercise: Exercise = {
  id: "book-count-command",
  mode: "symfony-console",
  title: "Сервис в команде: app:book-count",
  description:
    "EntityManagerInterface уже приходит в конструктор через автовайринг — ровно как в контроллерах (Блок 6). Допиши execute(): посчитай книги в базе и выведи их количество.",
  targetPath: "src/Command/BookCountCommand.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-books"],
  contextFiles: [
    { path: "src/Entity/Book.php", description: "Entity, которую считает команда" },
    { path: "src/Command/SeedBooksCommand.php", description: "уже знакомая команда — сидирует 3 книги перед запуском (setupCommand)" },
  ],
  starterCode: `<?php

namespace App\\Command;

use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Component\\Console\\Attribute\\AsCommand;
use Symfony\\Component\\Console\\Command\\Command;
use Symfony\\Component\\Console\\Input\\InputInterface;
use Symfony\\Component\\Console\\Output\\OutputInterface;

#[AsCommand(name: 'app:book-count')]
class BookCountCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        // TODO: получи количество книг через $this->em->getRepository(Book::class)->count([])
        // TODO: выведи "Книг в каталоге: N"
        // TODO: верни Command::SUCCESS
    }
}
`,
  solution: `<?php

namespace App\\Command;

use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Component\\Console\\Attribute\\AsCommand;
use Symfony\\Component\\Console\\Command\\Command;
use Symfony\\Component\\Console\\Input\\InputInterface;
use Symfony\\Component\\Console\\Output\\OutputInterface;

#[AsCommand(name: 'app:book-count')]
class BookCountCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $count = $this->em->getRepository(Book::class)->count([]);
        $output->writeln("Книг в каталоге: {$count}");

        return Command::SUCCESS;
    }
}
`,
  checks: [
    { type: "console-exit-code", invocationId: "run1", expectedExitCode: 0, description: "Команда завершается с кодом 0" },
    { type: "console-output-contains", invocationId: "run1", value: "Книг в каталоге: 3", description: "Выведено верное количество книг" },
  ],
  invocations: [{ id: "run1", args: ["app:book-count"] }],
  hint: "Команда — обычный класс с обычным конструктором: EntityManagerInterface в параметре конструктора автовайрится точно так же, как в контроллере. count([]) на репозитории — то же самое count(*) по таблице, без загрузки всех строк в память.",
};
