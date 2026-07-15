import type { Quiz } from "../types";

export const requestAndQueryQuiz: Quiz = {
  id: "request-and-query",
  title: "Проверь себя: Request, query-параметры",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Как получить значение query-параметра из /search?lang=en в контроллере?",
      options: [
        "$request->query->get('lang')",
        "$request->lang",
        "Единственный способ — читать суперглобальный $_GET напрямую",
        "$request->getParameter('lang')",
      ],
      correctIndex: 0,
      explanation:
        "$request->query — это ParameterBag для строки запроса (после ?). У него есть get('ключ', 'значение по умолчанию'), has(), all() и т.д.",
    },
    {
      id: "q2",
      type: "single",
      question: "Чем query-параметры (?lang=en) отличаются от параметров пути ({id} в /books/{id})?",
      options: [
        "Query-параметры необязательны и идут после ?, path-параметры — часть самого пути и обычно обязательны для совпадения маршрута",
        "Они полностью взаимозаменяемы, разницы нет",
        "Query-параметры работают только в POST-запросах",
        "Path-параметры нельзя ограничить типом/паттерном",
      ],
      correctIndex: 0,
      explanation:
        "Path-параметр — часть структуры URL и участвует в сопоставлении маршрута (без него запрос вообще не попадёт в этот контроллер). Query-параметр — необязательное уточнение поверх уже определённого маршрута.",
    },
    {
      id: "q3",
      type: "single",
      question: "Как прочитать сырое тело запроса (например, JSON, который прислал клиент)?",
      options: [
        "$request->getContent()",
        "$request->query->all() — тело запроса тоже там",
        "$_POST всегда содержит сырое тело как есть",
        "$request->body",
      ],
      correctIndex: 0,
      explanation:
        "getContent() возвращает raw body запроса строкой — то, что нужно передать в json_decode() для JSON API. $request->request — это распарсенные form-data поля, не JSON.",
    },
    {
      id: "q4",
      type: "single",
      question: "Какой код ответа принято возвращать, если клиент прислал невалидные данные?",
      options: ["400 Bad Request", "500 Internal Server Error", "200 OK с текстом ошибки внутри", "302 Redirect"],
      correctIndex: 0,
      explanation:
        "400 — код именно для ошибок на стороне клиента (невалидный запрос). 500 сигнализирует о поломке на сервере, что вводит в заблуждение при обычной ошибке валидации.",
    },
  ],
};
