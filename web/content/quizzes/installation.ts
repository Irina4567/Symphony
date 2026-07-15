import type { Quiz } from "../types";

export const installationQuiz: Quiz = {
  id: "installation",
  title: "Проверь себя: установка и структура проекта",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Какой командой создать новый full-stack проект через Symfony CLI?",
      options: [
        "symfony new my_project --webapp",
        "composer new my_project",
        "npx create-symfony-app",
        "php symfony create my_project",
      ],
      correctIndex: 0,
      explanation:
        "symfony new my_project --webapp создаёт полноценный проект со всеми стандартными пакетами (Twig, форма, security и т.д.). Без --webapp CLI создаст минимальный skeleton.",
    },
    {
      id: "q2",
      type: "single",
      question: "За что отвечает каталог src/ в проекте Symfony?",
      options: [
        "Скомпилированные ассеты (CSS/JS)",
        "PHP-код приложения: контроллеры, сервисы, сущности",
        "Кэш и логи",
        "Публично доступные файлы (точка входа)",
      ],
      correctIndex: 1,
      explanation:
        "src/ — это весь код, который пишете вы: контроллеры, сервисы, сущности Doctrine, репозитории и т.д.",
    },
    {
      id: "q3",
      type: "single",
      question:
        "Какой каталог является единственной точкой входа, доступной напрямую из браузера (document root веб-сервера)?",
      options: ["src/", "config/", "public/", "var/"],
      correctIndex: 2,
      explanation:
        "public/ содержит index.php — фронт-контроллер, через который проходят все HTTP-запросы. Остальные каталоги веб-серверу отдавать нельзя из соображений безопасности.",
    },
    {
      id: "q4",
      type: "multi",
      question: "Что обычно хранится в var/?",
      options: ["Кэш (var/cache)", "Логи (var/log)", "Исходный код контроллеров", "Twig-шаблоны"],
      correctIndexes: [0, 1],
      explanation:
        "var/ — это генерируемые данные: скомпилированный кэш и логи. Код и шаблоны туда никогда не попадают — они живут в src/ и templates/.",
    },
  ],
};
