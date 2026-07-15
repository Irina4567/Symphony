import type { Exercise } from "../types";

export const oopWarmupExercise: Exercise = {
  id: "oop-warmup",
  mode: "plain-php",
  title: "Класс-сервис BookService",
  description:
    "В Symfony почти вся бизнес-логика живёт в классах-сервисах — обычных PHP-классах с методами, которые потом подключаются через контейнер зависимостей. Допиши метод formatTitle(), чтобы он возвращал заголовок книги в верхнем регистре с восклицательным знаком в конце.",
  starterCode: `<?php

class BookService
{
    public function formatTitle(string $title): string
    {
        // TODO: верни $title в верхнем регистре с "!" в конце
    }
}

$service = new BookService();
echo $service->formatTitle("война и мир");
`,
  solution: `<?php

class BookService
{
    public function formatTitle(string $title): string
    {
        return mb_strtoupper($title) . "!";
    }
}

$service = new BookService();
echo $service->formatTitle("война и мир");
`,
  checks: [
    {
      type: "stdout-exact",
      value: "ВОЙНА И МИР!",
      description: 'Вывод должен быть точно "ВОЙНА И МИР!"',
    },
  ],
  hint: "Используй mb_strtoupper() вместо strtoupper() — обычный strtoupper() не умеет работать с кириллицей в UTF-8.",
};
