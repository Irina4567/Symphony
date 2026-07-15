import type { Quiz } from "../types";

export const routingBasicsQuiz: Quiz = {
  id: "routing-basics",
  title: "Проверь себя: основы роутинга",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Как объявить маршрут для метода контроллера в современном Symfony?",
      options: [
        "PHP-атрибутом #[Route(path: ..., name: ...)] прямо над методом",
        "Обязательно вручную прописать в routes.yaml для каждого метода",
        "Через .htaccess",
        "Комментарием вида // @route в теле метода",
      ],
      correctIndex: 0,
      explanation:
        "Атрибут #[Route(...)] над методом контроллера — стандартный способ объявления маршрута. Symfony сам находит такие методы благодаря автоконфигурации сервисов из src/.",
    },
    {
      id: "q2",
      type: "single",
      question:
        "Что произойдёт, если путь запроса совпал с маршрутом, но HTTP-метод не входит в methods: [...] этого маршрута?",
      options: [
        "Symfony поищет другой подходящий маршрут, а если не найдёт — вернёт 405 Method Not Allowed",
        "Будет исключение при старте приложения",
        "Выполнится первый по порядку объявления маршрут независимо от метода",
        "Оба маршрута выполнятся одновременно",
      ],
      correctIndex: 0,
      explanation:
        "methods — это дополнительное условие сопоставления, а не жёсткая привязка одного пути к одному маршруту. При несовпадении метода — 405.",
    },
    {
      id: "q3",
      type: "single",
      question: "Как сгенерировать URL по имени маршрута (а не склеивать строку руками)?",
      options: [
        "Через UrlGeneratorInterface::generate() (в AbstractController — $this->generateUrl())",
        "Только вручную конкатенировать строку из $_SERVER",
        "Через $request->getUri() всегда возвращает нужный URL",
        "Symfony не умеет генерировать URL по имени маршрута",
      ],
      correctIndex: 0,
      explanation:
        "generateUrl('route_name', ['param' => $value]) — идиоматичный способ, не завязанный на то, как именно выглядит путь. Изменишь путь в #[Route] — все сгенерированные ссылки обновятся автоматически.",
    },
    {
      id: "q4",
      type: "multi",
      question: "Что можно указать в атрибуте #[Route(...)]?",
      options: ["name", "methods", "requirements для параметров пути", "database"],
      correctIndexes: [0, 1, 2],
      explanation:
        "name, methods и requirements (регулярка-ограничение на параметр, например {id<\\d+>}) — реальные опции Route. database к роутингу отношения не имеет.",
    },
  ],
};
