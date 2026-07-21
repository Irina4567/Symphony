import type { Quiz } from "../types";

export const commandBasicsQuiz: Quiz = {
  id: "command-basics",
  title: "Проверь себя: базовая структура команды",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Что делает атрибут #[AsCommand(name: 'app:hello')]?",
      options: [
        "Регистрирует класс как консольную команду с именем app:hello, под которым её можно вызвать через bin/console",
        "Создаёт маршрут /app/hello, доступный по HTTP",
        "Просто документирует класс — имя команды всё равно нужно задавать отдельно в configure()",
        "Ограничивает команду только dev-окружением",
      ],
      correctIndex: 0,
      explanation: "#[AsCommand] — это регистрация в консольном приложении, аналог #[Route] для HTTP: он превращает обычный класс в команду, доступную по конкретному имени.",
    },
    {
      id: "q2",
      type: "single",
      question: "Какой метод класса Command содержит саму логику команды — то, что выполняется при запуске?",
      options: [
        "execute(InputInterface $input, OutputInterface $output)",
        "configure()",
        "__invoke()",
        "run()",
      ],
      correctIndex: 0,
      explanation: "execute() — обязательный метод, который вызывается при запуске команды; configure() отвечает за объявление аргументов/опций, а не за саму логику.",
    },
    {
      id: "q3",
      type: "single",
      question: "Что означает return Command::SUCCESS в конце execute()?",
      options: [
        "Команда завершилась с кодом выхода 0 — успешно, с точки зрения shell и $?",
        "Команда вывела хотя бы одну строку в $output",
        "Команда обязана была что-то сохранить в базу данных",
        "Ничего — код возврата на что-либо влияет только в тестах",
      ],
      correctIndex: 0,
      explanation: "Command::SUCCESS — это просто int(0), тот самый код выхода, который проверяют shell-скрипты и CI-пайплайны через $?.",
    },
    {
      id: "q4",
      type: "single",
      question: "Чем OutputInterface $output в консольной команде концептуально похож на Response в контроллере?",
      options: [
        "Это тоже способ вернуть результат работы вовне — только текстом в терминал, а не HTTP-ответом",
        "Он тоже принимает код HTTP-статуса",
        "Через него можно установить cookie",
        "Он ничем не похож — это просто логгер",
      ],
      correctIndex: 0,
      explanation: "И Response, и OutputInterface — это выходной канал для результата: контроллер отдаёт HTTP-ответ браузеру, команда — текст в терминал того, кто её вызвал.",
    },
  ],
};
