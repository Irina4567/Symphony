import type { Quiz } from "../types";

export const votersQuiz: Quiz = {
  id: "voters",
  title: "Проверь себя: Voters",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Зачем нужен Voter, если уже есть проверка по ролям?",
      options: [
        "Роли не различают конкретные объекты — у всех пользователей с ROLE_USER одна и та же роль, а Voter может разрешить действие только владельцу конкретной записи",
        "Voter работает быстрее, чем access_control",
        "Voter — это просто более новый синтаксис для того же самого, что делает роль",
        "Roles нельзя использовать вместе с Doctrine Entity",
      ],
      correctIndex: 0,
      explanation: "Правило 'редактировать может только автор записи' невозможно выразить одной ролью — нужна проверка, привязанная к конкретному объекту, а не только к факту наличия роли.",
    },
    {
      id: "q2",
      type: "single",
      question: "Что делает supports() в Voter?",
      options: [
        "Определяет, участвует ли этот Voter вообще в проверке данного атрибута на данном объекте",
        "Возвращает список всех ролей пользователя",
        "Сохраняет решение о доступе в кэш",
        "Проверяет, залогинен ли пользователь вообще",
      ],
      correctIndex: 0,
      explanation: "Если supports() вернул false, voteOnAttribute() для этого Voter'а не вызывается — Symfony просто перейдёт к другим зарегистрированным Voter'ам (если они есть).",
    },
    {
      id: "q3",
      type: "single",
      question: "Нужно ли регистрировать класс, наследующий Voter, в security.yaml вручную?",
      options: [
        "Нет — Symfony находит его автоматически благодаря autoconfigure: true, включённому по умолчанию",
        "Да, обязательно добавить его в секцию providers",
        "Да, обязательно добавить его в custom_authenticators",
        "Да, но только если в проекте больше одного Voter'а",
      ],
      correctIndex: 0,
      explanation: "В отличие от custom_authenticators (их приходится перечислять явно), Voter'ы подхватываются автоматически через autoconfigure — их достаточно просто создать как класс, наследующий Voter.",
    },
    {
      id: "q4",
      type: "single",
      question: "В чём разница между isGranted() и denyAccessUnlessGranted()?",
      options: [
        "isGranted() возвращает true/false и не прерывает выполнение, denyAccessUnlessGranted() бросает AccessDeniedException при отказе",
        "isGranted() работает только с ролями, а denyAccessUnlessGranted() — только с Voter'ами",
        "Это два названия одного и того же метода, оставленные для обратной совместимости",
        "denyAccessUnlessGranted() нельзя использовать с subject (вторым аргументом)",
      ],
      correctIndex: 0,
      explanation: "isGranted() удобен, когда нужно просто узнать ответ (например, чтобы показать или скрыть кнопку 'Редактировать'), а denyAccessUnlessGranted() — когда нужно прямо оборвать выполнение метода при отказе.",
    },
  ],
};
