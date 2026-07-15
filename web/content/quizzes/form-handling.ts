import type { Quiz } from "../types";

export const formHandlingQuiz: Quiz = {
  id: "form-handling",
  title: "Проверь себя: обработка отправки формы",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Что делает $form->handleRequest($request)?",
      options: [
        "Если метод запроса совпадает с методом формы (обычно POST) — заполняет форму данными из запроса и помечает её как отправленную",
        "Отправляет HTTP-запрос на другой сервер",
        "Сразу валидирует форму — это тот же шаг, что и isValid()",
        "Всегда сохраняет данные формы в базу",
      ],
      correctIndex: 0,
      explanation:
        "На GET-запросе (обычно — показ пустой формы) handleRequest() ничего не делает с данными формы, isSubmitted() останется false.",
    },
    {
      id: "q2",
      type: "single",
      question: "Чем isSubmitted() отличается от isValid()?",
      options: [
        "isSubmitted() — была ли форма вообще отправлена в этом запросе; isValid() — прошли ли данные все constraints",
        "Это полные синонимы",
        "isValid() всегда возвращает true после isSubmitted()",
        "isSubmitted() проверяет только GET-запросы",
      ],
      correctIndex: 0,
      explanation:
        "Классическая проверка — if ($form->isSubmitted() && $form->isValid()): форма и отправлена, и данные корректны.",
    },
    {
      id: "q3",
      type: "single",
      question: "Как получить заполненный объект после успешной отправки формы?",
      options: ["$form->getData()", "$request->getData()", "Напрямую из $_POST", "$form->getObject()"],
      correctIndex: 0,
      explanation: "getData() возвращает тот самый объект (Book), который был передан в createForm() — уже с обновлёнными через сеттеры значениями.",
    },
    {
      id: "q4",
      type: "single",
      question: "Что вернёт $this->render() с невалидной формой в актуальной версии Symfony?",
      options: [
        "HTML-страницу с формой и сообщениями об ошибках, автоматически с кодом 422 Unprocessable Entity",
        "Всегда код 200 независимо от валидности формы",
        "Исключение, которое обязательно нужно ловить вручную",
        "Пустую страницу без содержимого",
      ],
      correctIndex: 0,
      explanation:
        "Современный Symfony сам проставляет 422 при рендере невалидной отправленной формы — семантически корректный код для «запрос понятен, но данные не прошли проверку», а не просто 200 или 400.",
    },
  ],
};
