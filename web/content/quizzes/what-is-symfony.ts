import type { Quiz } from "../types";

export const whatIsSymfonyQuiz: Quiz = {
  id: "what-is-symfony",
  title: "Проверь себя: что такое Symfony",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Symfony — это...",
      options: [
        "Только CMS для создания сайтов",
        "Набор переиспользуемых PHP-компонентов и full-stack framework, построенный на их основе",
        "Язык программирования, альтернатива PHP",
        "Расширение PHP, устанавливаемое через PECL",
      ],
      correctIndex: 1,
      explanation:
        "Symfony — это экосистема: десятки независимых компонентов (HttpFoundation, Routing, Console и т.д.) и full-stack framework, который собирает их вместе.",
    },
    {
      id: "q2",
      type: "single",
      question: "Какие известные проекты используют отдельные компоненты Symfony?",
      options: ["Laravel и Drupal", "Node.js и Express", "Django и Flask", "React и Vue"],
      correctIndex: 0,
      explanation:
        "Компоненты Symfony (Console, HttpFoundation, EventDispatcher и др.) используются в Laravel, Drupal, phpBB и множестве других PHP-проектов — Symfony часто называют «framework для фреймворков».",
    },
    {
      id: "q3",
      type: "multi",
      question:
        "Что из перечисленного является отдельным независимым компонентом Symfony, который можно подключить в проект без всего фреймворка целиком?",
      options: ["Routing", "HttpFoundation", "Console", "Laravel Eloquent"],
      correctIndexes: [0, 1, 2],
      explanation:
        "Routing, HttpFoundation и Console — самостоятельные composer-пакеты Symfony. Eloquent — ORM из экосистемы Laravel и к Symfony отношения не имеет.",
    },
  ],
};
