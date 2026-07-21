<?php

namespace App\Command;

use App\Entity\Book;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Постоянная, всегда одинаковая команда — второй шаг проверки в упражнениях этого блока: после
 * того как команда ученика что-то поменяла в базе, app:list-books подтверждает это независимым
 * запросом, тем же принципом, что и повторный GET после POST в мини-проектах прошлых блоков.
 */
#[AsCommand(name: 'app:list-books')]
class ListBooksCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $books = $this->em->getRepository(Book::class)->findBy([], ['id' => 'ASC']);

        foreach ($books as $book) {
            $author = $book->getAuthor()?->getName() ?? 'без автора';
            $output->writeln(sprintf('%d: %s (%d) — %s', $book->getId(), $book->getTitle(), $book->getYear(), $author));
        }

        return Command::SUCCESS;
    }
}
