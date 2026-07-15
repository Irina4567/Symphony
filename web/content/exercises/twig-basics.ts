import type { Exercise } from "../types";

export const twigBasicsExercise: Exercise = {
  id: "twig-basics",
  mode: "symfony-app",
  title: "Первый шаблон: переменные и фильтры",
  description:
    "Контроллер для этого маршрута уже написан и передаёт в шаблон name и price. Допиши шаблон: выведи имя в верхнем регистре и цену с двумя знаками после запятой.",
  targetPath: "templates/exercises/basics.html.twig",
  contextFiles: [
    {
      path: "src/Controller/TwigExerciseController.php",
      description: "какие переменные контроллер передаёт в шаблон",
    },
  ],
  starterCode: `{# TODO: выведи name в верхнем регистре через фильтр |upper #}

{# TODO: выведи price, отформатированную как число с 2 знаками после запятой через |number_format(2) #}
`,
  solution: `{{ name|upper }}

{{ price|number_format(2) }}
`,
  requests: [{ id: "r1", method: "GET", path: "/exercises/twig-basics" }],
  checks: [
    { type: "http-status", requestId: "r1", expectedStatus: 200, description: "Страница рендерится без ошибок → 200" },
    { type: "http-body-contains", requestId: "r1", value: "ANNA", description: 'Имя выведено в верхнем регистре ("ANNA")' },
    {
      type: "http-body-contains",
      requestId: "r1",
      value: "99.50",
      description: 'Цена отформатирована с двумя знаками после запятой ("99.50")',
    },
  ],
  hint: "Фильтры в Twig применяются через | : {{ значение|фильтр }}. Некоторые фильтры принимают аргументы: |number_format(2).",
};
