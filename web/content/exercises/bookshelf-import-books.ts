import type { Exercise } from "../types";

export const bookshelfImportBooksExercise: Exercise = {
  id: "bookshelf-import-books",
  mode: "symfony-console",
  title: "BookShelf, часть 9: импорт книг из CSV одной командой",
  description:
    "Напиши ImportBooksCommand: обязательный аргумент file с путём к CSV, парсинг строк, поиск-или-создание автора по имени, создание книги, один flush() в конце и SymfonyStyle-отчёт о результате.",
  targetPath: "src/Command/ImportBooksCommand.php",
  setupCommands: ["php bin/console doctrine:schema:create"],
  contextFiles: [
    { path: "src/Entity/Author.php", description: "Entity автора — ищется по имени или создаётся заново" },
    { path: "src/Entity/Book.php", description: "Entity книги, которую создаёт импорт" },
    { path: "src/Command/ListBooksCommand.php", description: "стабильная команда app:list-books — вторым шагом подтверждает, что импорт реально сохранился" },
    { path: "var/data/books.csv", description: "CSV-файл с тремя книгами, который импортирует команда" },
  ],
  invocations: [
    { id: "import", args: ["app:import-books", "var/data/books.csv"] },
    { id: "list", args: ["app:list-books"] },
  ],
  starterCode: `<?php

namespace App\\Command;

use App\\Entity\\Author;
use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Component\\Console\\Attribute\\AsCommand;
use Symfony\\Component\\Console\\Command\\Command;
use Symfony\\Component\\Console\\Input\\InputArgument;
use Symfony\\Component\\Console\\Input\\InputInterface;
use Symfony\\Component\\Console\\Output\\OutputInterface;
use Symfony\\Component\\Console\\Style\\SymfonyStyle;

#[AsCommand(name: 'app:import-books', description: 'Импортирует книги из CSV-файла')]
class ImportBooksCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('file', InputArgument::REQUIRED, 'Путь к CSV-файлу с книгами (title,author,year)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $path = $input->getArgument('file');

        if (!is_file($path)) {
            $io->error("Файл не найден: {$path}");
            return Command::FAILURE;
        }

        $handle = fopen($path, 'r');
        fgetcsv($handle, escape: '\\\\'); // пропускаем заголовок title,author,year
        $imported = 0;

        // TODO: пока есть строки (fgetcsv($handle, escape: '\\\\') !== false):
        //   - разложи строку в [$title, $authorName, $year]
        //   - найди автора через $this->em->getRepository(Author::class)->findOneBy(['name' => $authorName])
        //     если не нашёлся — создай новый Author, заполни имя, persist()
        //   - создай новый Book, заполни title/year/author, persist()
        //   - увеличь $imported

        fclose($handle);

        // TODO: один $this->em->flush() после цикла — не на каждой строке
        // TODO: $io->success("Импортировано книг: {$imported}")
        // TODO: верни Command::SUCCESS
    }
}
`,
  solution: `<?php

namespace App\\Command;

use App\\Entity\\Author;
use App\\Entity\\Book;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Component\\Console\\Attribute\\AsCommand;
use Symfony\\Component\\Console\\Command\\Command;
use Symfony\\Component\\Console\\Input\\InputArgument;
use Symfony\\Component\\Console\\Input\\InputInterface;
use Symfony\\Component\\Console\\Output\\OutputInterface;
use Symfony\\Component\\Console\\Style\\SymfonyStyle;

#[AsCommand(name: 'app:import-books', description: 'Импортирует книги из CSV-файла')]
class ImportBooksCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('file', InputArgument::REQUIRED, 'Путь к CSV-файлу с книгами (title,author,year)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $path = $input->getArgument('file');

        if (!is_file($path)) {
            $io->error("Файл не найден: {$path}");
            return Command::FAILURE;
        }

        $handle = fopen($path, 'r');
        fgetcsv($handle, escape: '\\\\'); // пропускаем заголовок title,author,year
        $imported = 0;

        while (($row = fgetcsv($handle, escape: '\\\\')) !== false) {
            [$title, $authorName, $year] = $row;

            $author = $this->em->getRepository(Author::class)->findOneBy(['name' => $authorName]);
            if (!$author) {
                $author = new Author();
                $author->setName($authorName);
                $this->em->persist($author);
            }

            $book = new Book();
            $book->setTitle($title)->setYear((int) $year)->setAuthor($author);
            $this->em->persist($book);
            $imported++;
        }

        fclose($handle);

        $this->em->flush();

        $io->success("Импортировано книг: {$imported}");
        return Command::SUCCESS;
    }
}
`,
  checks: [
    { type: "console-exit-code", invocationId: "import", expectedExitCode: 0, description: "Импорт завершается с кодом 0" },
    { type: "console-output-contains", invocationId: "import", value: "Импортировано книг: 3", description: "Команда сообщает верное количество импортированных книг" },
    { type: "console-output-contains", invocationId: "list", value: "1984", description: "app:list-books подтверждает: «1984» сохранилась в базе" },
    { type: "console-output-contains", invocationId: "list", value: "Clean Code", description: "app:list-books подтверждает: «Clean Code» сохранилась в базе" },
    { type: "console-output-contains", invocationId: "list", value: "Dune", description: "app:list-books подтверждает: «Dune» сохранилась в базе" },
  ],
  hint: "flush() один раз после цикла, а не на каждой итерации — Doctrine сам батчит все persist() в одну транзакцию, это быстрее и на трёх книгах, и на трёх тысячах. Второй запуск (app:list-books) — не часть твоей команды, а независимая проверка, что данные реально долетели до базы, а не только до памяти PHP.",
};
