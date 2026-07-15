import type { Quiz } from "../types";

export const controllersAndResponseQuiz: Quiz = {
  id: "controllers-and-response",
  title: "Проверь себя: контроллеры и Response",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Что обязательно должен вернуть метод-экшн контроллера?",
      options: [
        "Объект Response (или наследник — например, JsonResponse)",
        "Обычный PHP-массив",
        "Строку с HTML — всегда",
        "Ничего, void — Symfony сам решит, что ответить",
      ],
      correctIndex: 0,
      explanation:
        "HttpKernel ожидает на выходе именно объект Response — это его контракт. JsonResponse, RedirectResponse, BinaryFileResponse и т.д. — все наследники Response.",
    },
    {
      id: "q2",
      type: "single",
      question:
        "От какого класса обычно наследуют контроллеры, чтобы получить доступ к хелперам вроде render(), redirectToRoute(), createNotFoundException()?",
      options: ["AbstractController", "HttpKernel", "EventDispatcher", "RequestHandler"],
      correctIndex: 0,
      explanation:
        "AbstractController — это набор шорткатов поверх контейнера сервисов. Наследование не обязательно (контроллер может быть и простым классом, как в упражнениях этого блока), но на практике почти всегда используется.",
    },
    {
      id: "q3",
      type: "single",
      question: "Как явно задать код ответа, например 201 Created?",
      options: [
        "new Response($body, 201) — вторым аргументом конструктора (или именованной константой Response::HTTP_CREATED)",
        "Response всегда возвращает 200, код нельзя переопределить",
        "Через $response->setError(201)",
        "Кодом ответа можно управлять только в routes.yaml",
      ],
      correctIndex: 0,
      explanation:
        "Второй позиционный аргумент конструктора Response — HTTP-код. Именованные константы вроде Response::HTTP_CREATED (=201) делают код читаемее голых чисел.",
    },
    {
      id: "q4",
      type: "multi",
      question: "Какие из этих кодов ответа осмысленно возвращать из обычного JSON API?",
      options: ["200 OK", "201 Created", "404 Not Found", "999 Custom"],
      correctIndexes: [0, 1, 2],
      explanation:
        "200/201/404 — часть стандарта HTTP с чётко определённой семантикой. 999 не входит в стандарт и не будет понятен ни клиентам, ни другим разработчикам.",
    },
  ],
};
