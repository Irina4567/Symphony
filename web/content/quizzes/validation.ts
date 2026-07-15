import type { Quiz } from "../types";

export const validationQuiz: Quiz = {
  id: "validation",
  title: "Проверь себя: Validator и constraints",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Где принято размещать constraints в современном Symfony-проекте?",
      options: [
        "Прямо на свойствах Entity через PHP-атрибуты (#[Assert\\...]) — единый источник правды независимо от того, как данные попали в объект",
        "Только внутри класса FormType",
        "Только в контроллере, вручную через if",
        "Constraints работают только на стороне JavaScript",
      ],
      correctIndex: 0,
      explanation:
        "Так объект остаётся валидным по одним и тем же правилам, откуда бы он ни пришёл — из формы, из JSON API, из консольной команды импорта.",
    },
    {
      id: "q2",
      type: "single",
      question: "Что делает #[Assert\\NotBlank]?",
      options: [
        "Требует, чтобы значение не было пустым (не null и не пустая строка)",
        "Ограничивает максимальную длину строки",
        "Проверяет формат email",
        "Делает поле необязательным для заполнения",
      ],
      correctIndex: 0,
      explanation: "NotBlank — одно из самых частых ограничений. Для email есть отдельный #[Assert\\Email], для длины — #[Assert\\Length].",
    },
    {
      id: "q3",
      type: "single",
      question: "Как вручную проверить объект на соответствие constraints без формы?",
      options: [
        "$validator->validate($object) — вернёт список нарушений (violations)",
        "Constraints работают только внутри форм, отдельно не проверяются",
        "Через $object->isValid()",
        "Через SQL CHECK constraint в базе данных",
      ],
      correctIndex: 0,
      explanation:
        "ValidatorInterface можно внедрить в любой сервис или контроллер и проверить объект напрямую — именно так устроен harness-маршрут в упражнениях этого урока.",
    },
    {
      id: "q4",
      type: "single",
      question: "Что вернёт $validator->validate($book), если все ограничения соблюдены?",
      options: ["Пустой список нарушений (count() === 0)", "null", "true", "Исключение"],
      correctIndex: 0,
      explanation: "validate() всегда возвращает ConstraintViolationList — просто пустой, если нарушений нет. Проверка идёт через count().",
    },
  ],
};
