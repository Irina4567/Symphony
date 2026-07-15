import type { Quiz } from "../types";

export const controlStructuresQuiz: Quiz = {
  id: "control-structures",
  title: "Проверь себя: циклы и условия",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Как перебрать массив в Twig?",
      options: [
        "{% for item in items %}...{% endfor %}",
        "{% each items as item %}",
        "{% foreach item in items %}",
        "Только через PHP-код прямо в контроллере, в шаблоне нельзя",
      ],
      correctIndex: 0,
      explanation: "{% for item in items %}...{% endfor %} — единственный и синтаксически простой способ цикла в Twig.",
    },
    {
      id: "q2",
      type: "single",
      question:
        "Что выведет {% for book in books %}...{% else %}Нет книг{% endfor %}, если books — пустой массив?",
      options: [
        '"Нет книг" — ветка else сработает, если коллекция для перебора пуста',
        "Ничего не выведется",
        "Будет выброшена ошибка",
        "Тело цикла выполнится один раз с book = null",
      ],
      correctIndex: 0,
      explanation:
        "{% for %}...{% else %}...{% endfor %} — удобная замена ручной проверке {% if books is empty %} перед циклом.",
    },
    {
      id: "q3",
      type: "single",
      question: "Как получить порядковый номер текущей итерации внутри {% for %}?",
      options: [
        "loop.index (считает с 1) или loop.index0 (считает с 0)",
        "$index, как в обычном PHP-цикле",
        "iteration.number",
        "Twig не поддерживает нумерацию итераций",
      ],
      correctIndex: 0,
      explanation:
        "Специальная переменная loop доступна внутри {% for %} и даёт index/index0, first, last, length и revindex.",
    },
    {
      id: "q4",
      type: "single",
      question: "Как записать условие if/else в Twig?",
      options: [
        "{% if cond %}...{% else %}...{% endif %}",
        "{% if cond %}...{% endif %} — ветки else в Twig не существует",
        "if(cond) { ... } как в чистом PHP",
        "<?php if (cond): ?> прямо внутри .twig-файла",
      ],
      correctIndex: 0,
      explanation: "Синтаксис условий в Twig похож на PHP-alternative syntax (if/endif), но с {% %} вместо <?php ?>.",
    },
  ],
};
