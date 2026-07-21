import type { Exercise } from "../types";

export const helloCommandExercise: Exercise = {
  id: "hello-command",
  mode: "symfony-console",
  title: "Первая команда: app:hello",
  description:
    "Допиши execute(): выведи строку в $output и верни код завершения. Имя команды (app:hello) уже задано атрибутом #[AsCommand] — фокус на самом методе execute().",
  targetPath: "src/Command/HelloCommand.php",
  invocations: [{ id: "run1", args: ["app:hello"] }],
  starterCode: `<?php

namespace App\\Command;

use Symfony\\Component\\Console\\Attribute\\AsCommand;
use Symfony\\Component\\Console\\Command\\Command;
use Symfony\\Component\\Console\\Input\\InputInterface;
use Symfony\\Component\\Console\\Output\\OutputInterface;

#[AsCommand(name: 'app:hello')]
class HelloCommand extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        // TODO: выведи через $output->writeln() строку "Привет из консоли Symfony!"
        // TODO: верни Command::SUCCESS
    }
}
`,
  solution: `<?php

namespace App\\Command;

use Symfony\\Component\\Console\\Attribute\\AsCommand;
use Symfony\\Component\\Console\\Command\\Command;
use Symfony\\Component\\Console\\Input\\InputInterface;
use Symfony\\Component\\Console\\Output\\OutputInterface;

#[AsCommand(name: 'app:hello')]
class HelloCommand extends Command
{
    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Привет из консоли Symfony!');

        return Command::SUCCESS;
    }
}
`,
  checks: [
    { type: "console-exit-code", invocationId: "run1", expectedExitCode: 0, description: "Команда завершается с кодом 0 (Command::SUCCESS)" },
    {
      type: "console-output-contains",
      invocationId: "run1",
      value: "Привет из консоли Symfony!",
      description: "Вывод содержит приветствие",
    },
  ],
  hint: "execute() — обычный метод класса, никакого HTTP или роутинга: $output->writeln('...') печатает строку, а return Command::SUCCESS (это просто int(0)) сообщает консоли, что всё прошло успешно.",
};
