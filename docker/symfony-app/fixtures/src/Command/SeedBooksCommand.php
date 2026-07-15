<?php

namespace App\Command;

use App\Entity\Author;
use App\Entity\Book;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

/**
 * Сидирует ту же тройку книг, что и в предыдущих блоках (Block 1/2), чтобы данные в
 * упражнениях этого блока были узнаваемы. Запускается через setupCommands упражнения.
 */
#[AsCommand(name: 'app:seed-books')]
class SeedBooksCommand extends Command
{
    public function __construct(private readonly EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $orwell = new Author();
        $orwell->setName('George Orwell');
        $this->em->persist($orwell);

        $martin = new Author();
        $martin->setName('Robert C. Martin');
        $this->em->persist($martin);

        $herbert = new Author();
        $herbert->setName('Frank Herbert');
        $this->em->persist($herbert);

        $book1984 = new Book();
        $book1984->setTitle('1984')->setYear(1949)->setAuthor($orwell);
        $this->em->persist($book1984);

        $cleanCode = new Book();
        $cleanCode->setTitle('Clean Code')->setYear(2008)->setAuthor($martin);
        $this->em->persist($cleanCode);

        $dune = new Book();
        $dune->setTitle('Dune')->setYear(1965)->setAuthor($herbert);
        $this->em->persist($dune);

        $this->em->flush();

        $output->writeln('Seeded 3 books.');

        return Command::SUCCESS;
    }
}
