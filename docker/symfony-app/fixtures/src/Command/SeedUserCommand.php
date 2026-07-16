<?php

namespace App\Command;

use App\Entity\User;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(name: 'app:seed-user')]
class SeedUserCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $reader = new User();
        $reader->setEmail('reader@bookshelf.test');
        $reader->setRoles([]);
        $reader->setPassword($this->hasher->hashPassword($reader, 'secret123'));
        $this->em->persist($reader);

        $admin = new User();
        $admin->setEmail('admin@bookshelf.test');
        $admin->setRoles(['ROLE_ADMIN']);
        $admin->setPassword($this->hasher->hashPassword($admin, 'secret123'));
        $this->em->persist($admin);

        $this->em->flush();

        $output->writeln('Seeded 2 users.');

        return Command::SUCCESS;
    }
}
