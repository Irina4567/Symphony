import type { Exercise } from "../types";

export const introProjectStructureMapExercise: Exercise = {
  id: "intro-project-structure-map",
  mode: "plain-php",
  title: "Практика: закрепи структуру проекта кодом",
  description:
    "Ты только что своими руками прошёлся по каталогам реального Symfony-проекта. Допиши функцию classifyDirectory(), чтобы она возвращала верное назначение каталога — так же, как ты объяснял бы это на собеседовании.",
  starterCode: `<?php

function classifyDirectory(string $dir): string
{
    // TODO: верни назначение каталога по его имени
    // src         -> "PHP-код приложения"
    // public      -> "точка входа для веб-сервера"
    // config      -> "конфигурация сервисов и роутов"
    // var         -> "кэш и логи"
    // templates   -> "Twig-шаблоны"
}

foreach (['src', 'public', 'config', 'var', 'templates'] as $dir) {
    echo classifyDirectory($dir) . "\\n";
}
`,
  solution: `<?php

function classifyDirectory(string $dir): string
{
    return match ($dir) {
        'src' => 'PHP-код приложения',
        'public' => 'точка входа для веб-сервера',
        'config' => 'конфигурация сервисов и роутов',
        'var' => 'кэш и логи',
        'templates' => 'Twig-шаблоны',
        default => 'неизвестный каталог',
    };
}

foreach (['src', 'public', 'config', 'var', 'templates'] as $dir) {
    echo classifyDirectory($dir) . "\\n";
}
`,
  checks: [
    {
      type: "stdout-exact",
      value:
        "PHP-код приложения\nточка входа для веб-сервера\nконфигурация сервисов и роутов\nкэш и логи\nTwig-шаблоны",
      description:
        "Вывод должен построчно перечислять назначение src, public, config, var, templates — в этом порядке",
    },
  ],
  hint: "Удобнее всего через match($dir) { 'src' => '...', 'public' => '...', ... }. Не забудь default-ветку — match() без неё бросит исключение на незнакомом значении.",
};
