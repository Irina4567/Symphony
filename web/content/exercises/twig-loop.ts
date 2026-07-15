import type { Exercise } from "../types";

export const twigLoopExercise: Exercise = {
  id: "twig-loop",
  mode: "symfony-app",
  title: "Цикл по книгам: for и else",
  description:
    "Один и тот же шаблон рендерится дважды: со списком книг и с пустым списком. Выведи каждую книгу в <li>, а для пустого случая — сообщение об этом.",
  targetPath: "templates/exercises/loop.html.twig",
  starterCode: `<ul>
{% for book in books %}
    {# TODO: выведи <li>{{ book.title }}</li> #}
{% else %}
    {# TODO: выведи <li>Книг пока нет</li> — сработает, если books пуст #}
{% endfor %}
</ul>
`,
  solution: `<ul>
{% for book in books %}
    <li>{{ book.title }}</li>
{% else %}
    <li>Книг пока нет</li>
{% endfor %}
</ul>
`,
  requests: [
    { id: "filled", method: "GET", path: "/exercises/twig-loop" },
    { id: "empty", method: "GET", path: "/exercises/twig-loop-empty" },
  ],
  checks: [
    { type: "http-body-contains", requestId: "filled", value: "<li>1984</li>", description: "Список содержит книгу 1984" },
    { type: "http-body-contains", requestId: "filled", value: "<li>Dune</li>", description: "Список содержит книгу Dune" },
    {
      type: "http-body-contains",
      requestId: "filled",
      value: "<li>Clean Code</li>",
      description: "Список содержит книгу Clean Code",
    },
    {
      type: "http-body-contains",
      requestId: "empty",
      value: "<li>Книг пока нет</li>",
      description: "Пустой список показывает сообщение через ветку else",
    },
  ],
  hint: "{% for %}...{% else %}...{% endfor %} — ветка else сработает автоматически, если коллекция для перебора пуста, без дополнительного {% if %}.",
};
