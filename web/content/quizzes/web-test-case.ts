import type { Quiz } from "../types";

export const webTestCaseQuiz: Quiz = {
  id: "web-test-case",
  title: "Проверь себя: WebTestCase",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Делает ли $client->request() настоящий HTTP-запрос по сети?",
      options: [
        "Нет — запрос проходит прямо через ядро приложения (роутинг, контроллер и весь стек) в одном процессе, без реального сокета",
        "Да, клиент поднимает временный сервер на случайном порту",
        "Да, но только если явно указать base_uri",
        "Это зависит от того, GET это запрос или POST",
      ],
      correctIndex: 0,
      explanation: "Именно поэтому тесты WebTestCase выполняются так быстро — сетевого оверхеда просто нет, при этом весь код приложения реально выполняется.",
    },
    {
      id: "q2",
      type: "single",
      question: "Нужно ли вызывать self::bootKernel() перед static::createClient()?",
      options: [
        "Нет — createClient() сам вызывает bootKernel() внутри себя",
        "Да, обязательно, иначе createClient() выбросит исключение",
        "Да, но только для POST-запросов",
        "Это зависит от того, используется ли Doctrine",
      ],
      correctIndex: 0,
      explanation: "В отличие от прошлого урока с 'голым' KernelTestCase, WebTestCase инкапсулирует загрузку ядра внутри createClient().",
    },
    {
      id: "q3",
      type: "single",
      question: "Как проверить конкретное значение внутри JSON-тела ответа?",
      options: [
        "Разобрать тело вручную через json_decode() и сравнить нужное поле обычным assertSame()",
        "Через встроенный assertJsonContains(), доступный в любой версии WebTestCase",
        "JSON нельзя проверить напрямую, только через DomCrawler",
        "Через $client->getJson()",
      ],
      correctIndex: 0,
      explanation: "В этой версии WebTestAssertionsTrait нет специальной JSON-проверки — обычный json_decode() плюс стандартные assert-методы работают отлично.",
    },
    {
      id: "q4",
      type: "single",
      question: "Нужно ли контроллеру, который тестируют через WebTestCase, что-то знать о том, что его тестируют?",
      options: [
        "Нет — с точки зрения кода приложения тестовый запрос неотличим от настоящего",
        "Да, контроллер должен реализовывать TestableControllerInterface",
        "Да, нужен отдельный метод-обработчик специально для тестов",
        "Да, маршрут должен быть помечен атрибутом #[Testable]",
      ],
      correctIndex: 0,
      explanation: "Это ключевое преимущество WebTestCase: тестируется тот же самый код, что обрабатывает реальные запросы, без каких-либо специальных условностей внутри контроллера.",
    },
  ],
};
