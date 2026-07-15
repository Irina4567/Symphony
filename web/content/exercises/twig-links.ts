import type { Exercise } from "../types";

export const twigLinksExercise: Exercise = {
  id: "twig-links",
  mode: "symfony-app",
  title: "Ссылка по имени маршрута: path()",
  description:
    'Контроллер передаёт в шаблон bookId = 42. Сгенерируй ссылку на маршрут book_show_page функцией path(), а не хардкодом строки.',
  targetPath: "templates/exercises/links.html.twig",
  contextFiles: [
    {
      path: "src/Controller/TwigExerciseController.php",
      description: "откуда взялся bookId и как называется маршрут book_show_page",
    },
  ],
  starterCode: `{# TODO: замени "#" на path('book_show_page', {id: bookId}) #}
<a href="#">Открыть книгу</a>
`,
  solution: `<a href="{{ path('book_show_page', {id: bookId}) }}">Открыть книгу</a>
`,
  requests: [{ id: "r1", method: "GET", path: "/exercises/twig-links" }],
  checks: [
    {
      type: "http-body-contains",
      requestId: "r1",
      value: 'href="/books/42"',
      description: "Ссылка сгенерирована через path() и указывает на /books/42",
    },
  ],
  hint: "path('имя_маршрута', {параметр: значение}) — фигурные скобки внутри {{ }} здесь означают Twig-хэш (аналог ассоциативного массива), а не блок Twig.",
};
