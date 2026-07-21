import type { Exercise } from "../types";

export const bookLookupCommandExercise: Exercise = {
  id: "book-lookup-command",
  mode: "symfony-console",
  title: "SymfonyStyle и коды возврата: app:book-lookup",
  description:
    "Найди книгу по названию: если нашлась — $io->success() и Command::SUCCESS, если нет — $io->error() и Command::FAILURE. Разные коды возврата для разных исходов — то, что отличает консольную команду от обычного метода.",
  targetPath: "src/Command/BookLookupCommand.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-books"],
  contextFiles: [
    { path: "src/Entity/Book.php", description: "Entity, по которой ищет команда" },
    { path: "src/Command/SeedBooksCommand.php", description: "сидирует 3 книги перед запуском (setupCommand), включая «1984»" },
  ],
  invocations: [
    { id: "found", args: ["app:book-lookup", "1984"] },
    { id: "missing", args: ["app:book-lookup", "Nonexistent"] },
  ],
  starterCode: `<?php

namespace App\\Command;

use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Component\\Console\\Attribute\\AsCommand;
use Symfony\\Component\\Console\\Command\\Command;
use Symfony\\Component\\Console\\Input\\InputArgument;
use Symfony\\Component\\Console\\Input\\InputInterface;
use Symfony\\Component\\Console\\Output\\OutputInterface;
use Symfony\\Component\\Console\\Style\\SymfonyStyle;

#[AsCommand(name: 'app:book-lookup')]
class BookLookupCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('title', InputArgument::REQUIRED, 'Название книги для поиска');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $title = $input->getArgument('title');

        // TODO: найди книгу через $this->em->getRepository(Book::class)->findOneBy(['title' => $title])
        // TODO: если нашлась — $io->success("Найдена: {$book->getTitle()} ({$book->getYear()})"), верни Command::SUCCESS
        // TODO: если нет — $io->error("Книга не найдена: {$title}"), верни Command::FAILURE
    }
}
`,
  solution: `<?php

namespace App\\Command;

use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Component\\Console\\Attribute\\AsCommand;
use Symfony\\Component\\Console\\Command\\Command;
use Symfony\\Component\\Console\\Input\\InputArgument;
use Symfony\\Component\\Console\\Input\\InputInterface;
use Symfony\\Component\\Console\\Output\\OutputInterface;
use Symfony\\Component\\Console\\Style\\SymfonyStyle;

#[AsCommand(name: 'app:book-lookup')]
class BookLookupCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('title', InputArgument::REQUIRED, 'Название книги для поиска');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $title = $input->getArgument('title');

        $book = $this->em->getRepository(Book::class)->findOneBy(['title' => $title]);

        if (!$book) {
            $io->error("Книга не найдена: {$title}");
            return Command::FAILURE;
        }

        $io->success("Найдена: {$book->getTitle()} ({$book->getYear()})");
        return Command::SUCCESS;
    }
}
`,
  checks: [
    { type: "console-exit-code", invocationId: "found", expectedExitCode: 0, description: "Существующая книга → код 0 (Command::SUCCESS)" },
    { type: "console-output-contains", invocationId: "found", value: "Найдена: 1984", description: "Вывод содержит найденную книгу" },
    { type: "console-exit-code", invocationId: "missing", expectedExitCode: 1, description: "Несуществующая книга → код 1 (Command::FAILURE)" },
    { type: "console-output-contains", invocationId: "missing", value: "не найдена", description: "Вывод объясняет причину неудачи" },
  ],
  hint: "Command::FAILURE — это просто int(1), а Command::SUCCESS — int(0). Именно этот код увидит shell-скрипт, который вызовет твою команду (через $? в bash), поэтому его нельзя путать с текстом сообщения — они проверяются независимо.",
};
