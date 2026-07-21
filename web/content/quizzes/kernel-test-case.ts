import type { Quiz } from "../types";

export const kernelTestCaseQuiz: Quiz = {
  id: "kernel-test-case",
  title: "Проверь себя: KernelTestCase",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Что делает self::bootKernel()?",
      options: [
        "Собирает и загружает DI-контейнер приложения — так же, как это происходит при настоящем HTTP-запросе",
        "Запускает встроенный PHP-сервер для теста",
        "Создаёт новую тестовую базу данных с нуля",
        "Компилирует все контроллеры проекта",
      ],
      correctIndex: 0,
      explanation: "После bootKernel() приложение 'собрано' так же, как для реального запроса, и его сервисы доступны через self::getContainer().",
    },
    {
      id: "q2",
      type: "single",
      question: "Что произойдёт при вызове self::getContainer() ДО self::bootKernel()?",
      options: [
        "Будет выброшено исключение — контейнер ещё не собран",
        "Вернётся пустой контейнер без единого сервиса",
        "Symfony автоматически вызовет bootKernel() сам",
        "Ничего, getContainer() не зависит от bootKernel()",
      ],
      correctIndex: 0,
      explanation: "Порядок вызовов важен: контейнер физически не существует, пока его не собрали через bootKernel().",
    },
    {
      id: "q3",
      type: "single",
      question: "Почему тесты используют отдельную базу данных (APP_ENV=test), а не ту же, что и обычная разработка?",
      options: [
        "Чтобы тесты не портили рабочие данные, а рабочие данные не влияли на результат тестов",
        "Потому что PHPUnit технически не умеет работать с той же базой",
        "Это ускоряет выполнение тестов вдвое",
        "SQLite не поддерживает несколько окружений одновременно",
      ],
      correctIndex: 0,
      explanation: "Изоляция окружений — важный принцип: тестовые данные должны быть предсказуемыми и не зависеть от того, что происходит в dev-окружении, и наоборот.",
    },
    {
      id: "q4",
      type: "single",
      question: "Чем KernelTestCase принципиально отличается от WebTestCase (тема следующего урока)?",
      options: [
        "KernelTestCase даёт доступ к сервисам контейнера, но не умеет делать HTTP-запросы к контроллерам — WebTestCase расширяет его именно этой возможностью",
        "KernelTestCase работает быстрее, но не поддерживает Doctrine",
        "Это два независимых, никак не связанных класса",
        "WebTestCase не может использовать EntityManager",
      ],
      correctIndex: 0,
      explanation: "WebTestCase наследуется от KernelTestCase и добавляет self::createClient() для HTTP-подобных запросов — весь функционал KernelTestCase остаётся доступен.",
    },
  ],
};
