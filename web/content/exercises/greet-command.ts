import type { Exercise } from "../types";

export const greetCommandExercise: Exercise = {
  id: "greet-command",
  mode: "symfony-console",
  title: "Аргумент и опция: app:greet",
  description:
    "configure() уже объявляет обязательный аргумент name и опцию --shout — допиши execute(): собери приветствие и, если передан --shout, переведи его в верхний регистр.",
  targetPath: "src/Command/GreetCommand.php",
  invocations: [
    { id: "plain", args: ["app:greet", "Ada"] },
    { id: "shout", args: ["app:greet", "Ada", "--shout"] },
  ],
  starterCode: `<?php

namespace App\\Command;

use Symfony\\Component\\Console\\Attribute\\AsCommand;
use Symfony\\Component\\Console\\Command\\Command;
use Symfony\\Component\\Console\\Input\\InputArgument;
use Symfony\\Component\\Console\\Input\\InputInterface;
use Symfony\\Component\\Console\\Input\\InputOption;
use Symfony\\Component\\Console\\Output\\OutputInterface;

#[AsCommand(name: 'app:greet')]
class GreetCommand extends Command
{
    protected function configure(): void
    {
        $this
            ->addArgument('name', InputArgument::REQUIRED, 'Кого поприветствовать')
            ->addOption('shout', null, InputOption::VALUE_NONE, 'Вывести приветствие капсом');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        // TODO: получи аргумент name через $input->getArgument('name')
        // TODO: собери строку "Привет, {name}!"
        // TODO: если $input->getOption('shout') — переведи строку в верхний регистр (mb_strtoupper)
        // TODO: выведи через $output->writeln() и верни Command::SUCCESS
    }
}
`,
  solution: `<?php

namespace App\\Command;

use Symfony\\Component\\Console\\Attribute\\AsCommand;
use Symfony\\Component\\Console\\Command\\Command;
use Symfony\\Component\\Console\\Input\\InputArgument;
use Symfony\\Component\\Console\\Input\\InputInterface;
use Symfony\\Component\\Console\\Input\\InputOption;
use Symfony\\Component\\Console\\Output\\OutputInterface;

#[AsCommand(name: 'app:greet')]
class GreetCommand extends Command
{
    protected function configure(): void
    {
        $this
            ->addArgument('name', InputArgument::REQUIRED, 'Кого поприветствовать')
            ->addOption('shout', null, InputOption::VALUE_NONE, 'Вывести приветствие капсом');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $name = $input->getArgument('name');
        $greeting = "Привет, {$name}!";

        if ($input->getOption('shout')) {
            $greeting = mb_strtoupper($greeting);
        }

        $output->writeln($greeting);

        return Command::SUCCESS;
    }
}
`,
  checks: [
    { type: "console-exit-code", invocationId: "plain", expectedExitCode: 0, description: "Без --shout команда завершается с кодом 0" },
    { type: "console-output-contains", invocationId: "plain", value: "Привет, Ada!", description: "Без --shout выводится обычное приветствие" },
    { type: "console-exit-code", invocationId: "shout", expectedExitCode: 0, description: "С --shout команда тоже завершается с кодом 0" },
    { type: "console-output-contains", invocationId: "shout", value: "ПРИВЕТ, ADA!", description: "С --shout приветствие выводится капсом" },
  ],
  hint: "InputArgument::REQUIRED и InputOption::VALUE_NONE уже объявлены в configure() — тебе остаётся только читать их значения в execute() через $input->getArgument()/$input->getOption(), это уже пройдено в теории урока.",
};
