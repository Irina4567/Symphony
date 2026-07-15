import type { Quiz } from "../types";

export const jsonApiQuiz: Quiz = {
  id: "json-api",
  title: "Проверь себя: JSON API",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Чем JsonResponse отличается от обычного Response?",
      options: [
        "Автоматически сериализует переданные данные в JSON и выставляет заголовок Content-Type: application/json",
        "Ничем, это просто алиас класса Response",
        "Работает только с плоскими массивами без вложенности",
        "У него нельзя задать код ответа",
      ],
      correctIndex: 0,
      explanation:
        "new JsonResponse($data, $status) сам вызывает json_encode($data) и проставляет правильный заголовок — не нужно делать это вручную через Response.",
    },
    {
      id: "q2",
      type: "single",
      question: "Как превратить JSON-тело POST-запроса в обычный PHP-массив?",
      options: [
        "json_decode($request->getContent(), true)",
        "$request->request->all() — там уже лежит распарсенный JSON",
        "json_parse($request)",
        "Symfony делает это автоматически, массив сразу доступен как аргумент метода",
      ],
      correctIndex: 0,
      explanation:
        "getContent() даёт сырую строку, json_decode(..., true) — превращает её в ассоциативный массив (второй аргумент true — иначе получишь stdClass).",
    },
    {
      id: "q3",
      type: "multi",
      question:
        "Что стоит проверить перед тем, как считать тело JSON-запроса валидным — до подключения компонента Validator (будет в отдельном блоке)?",
      options: [
        "Что json_decode не вернул null (то есть строка была валидным JSON)",
        "Что обязательные поля присутствуют",
        "Что типы полей соответствуют ожидаемым",
        "Что запрос пришёл именно из браузера Chrome",
      ],
      correctIndexes: [0, 1, 2],
      explanation:
        "Ручная защита простого API: валидный JSON → обязательные поля на месте → базовые типы совпадают. Браузер клиента к валидации данных отношения не имеет.",
    },
    {
      id: "q4",
      type: "single",
      question: "Как json_encode (а значит и JsonResponse) по умолчанию обрабатывает не-ASCII символы вроде кириллицы?",
      options: [
        "Экранирует их в виде \\uXXXX-последовательностей",
        "Оставляет как есть, в UTF-8",
        "Выбрасывает исключение",
        "Конвертирует в Base64",
      ],
      correctIndex: 0,
      explanation:
        'По умолчанию json_encode() экранирует не-ASCII символы (например, "Дюна" превращается в "\\u0414\\u044e\\u043d\\u0430"). Валидный JSON, но не то, что ожидаешь увидеть глазами. Флаг JSON_UNESCAPED_UNICODE отключает это поведение — пригодится, когда понадобится отдавать читаемый JSON с кириллицей.',
    },
  ],
};
