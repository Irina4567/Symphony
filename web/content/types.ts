export type Check =
  | { type: "stdout-contains"; value: string; description: string }
  | { type: "stdout-exact"; value: string; description: string }
  | { type: "stdout-matches"; pattern: string; flags?: string; description: string };

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequestSpec {
  id: string;
  method: HttpMethod;
  path: string;
  body?: string;
  /** По умолчанию application/json. Для отправки формы — "application/x-www-form-urlencoded". */
  contentType?: string;
}

export type HttpCheck =
  | { type: "http-status"; requestId: string; expectedStatus: number; description: string }
  | { type: "http-body-contains"; requestId: string; value: string; description: string }
  | { type: "http-body-not-contains"; requestId: string; value: string; description: string }
  | { type: "http-body-matches"; requestId: string; pattern: string; flags?: string; description: string };

export interface ConsoleInvocationSpec {
  id: string;
  /** Аргументы для bin/console, начиная с имени команды, например
   *  ["app:import-books", "var/data/books.csv"]. */
  args: string[];
}

/** Проверяются по объединённому выводу (stdout + stderr) конкретного вызова консоли —
 *  SymfonyStyle пишет success()/error() в разные потоки, а для ученика это один и тот же
 *  видимый вывод команды. */
export type ConsoleCheck =
  | { type: "console-exit-code"; invocationId: string; expectedExitCode: number; description: string }
  | { type: "console-output-contains"; invocationId: string; value: string; description: string }
  | { type: "console-output-not-contains"; invocationId: string; value: string; description: string }
  | { type: "console-output-matches"; invocationId: string; pattern: string; flags?: string; description: string };

interface ExerciseBase {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  solution: string;
  hint?: string;
}

export interface ContextFile {
  /** Путь внутри Symfony-скелета песочницы, например src/Entity/Book.php. */
  path: string;
  /** Короткая пометка, зачем этот файл нужен именно для этого упражнения. */
  description?: string;
}

export type Exercise =
  | (ExerciseBase & { mode: "plain-php"; checks: Check[] })
  | (ExerciseBase & {
      mode: "symfony-app";
      /** Путь внутри Symfony-скелета, куда положить код ученика, например src/Controller/BookController.php */
      targetPath: string;
      requests: HttpRequestSpec[];
      checks: HttpCheck[];
      /** Консольные команды (например, doctrine:schema:create), выполняются до старта сервера. */
      setupCommands?: string[];
      /** Уже существующие в песочнице файлы, которые полезно увидеть перед тем, как писать код
       *  (например, Entity или FormType, зашитые в образ, — то, на что опирается это упражнение). */
      contextFiles?: ContextFile[];
      /** Переопределяет содержимое обычно-статичной фикстуры только для этого упражнения —
       *  и при запуске в песочнице, и при показе в "Файлы проекта". Нужно, когда упражнению
       *  функционально требуется более "поздняя" версия файла (например, Entity с constraints
       *  из следующего блока), а базовая фикстура, которую видят более ранние уроки, должна
       *  оставаться в границах уже пройденного материала. */
      fixtureOverrides?: (ContextFile & { content: string })[];
    })
  | (ExerciseBase & {
      mode: "symfony-phpunit";
      /** Путь внутри Symfony-скелета, куда положить PHPUnit-тест ученика,
       *  например tests/Service/BookFormatterServiceTest.php */
      targetPath: string;
      /** Консольные команды (например, создание тестовой БД), выполняются до запуска phpunit. */
      setupCommands?: string[];
      contextFiles?: ContextFile[];
      fixtureOverrides?: (ContextFile & { content: string })[];
      /** Явных checks нет: результат — это pass/fail каждого метода теста, который написал
       *  сам ученик, взятый из отчёта PHPUnit. Имя метода становится описанием проверки. */
    })
  | (ExerciseBase & {
      mode: "symfony-console";
      /** Путь внутри Symfony-скелета, куда положить класс команды ученика,
       *  например src/Command/ImportBooksCommand.php */
      targetPath: string;
      /** Консольные команды (например, doctrine:schema:create или сидинг), выполняются один
       *  раз до всех invocations. */
      setupCommands?: string[];
      /** Последовательность запусков bin/console — каждый со своим именем команды и
       *  аргументами; результат каждого доступен для checks по его id. */
      invocations: ConsoleInvocationSpec[];
      checks: ConsoleCheck[];
      contextFiles?: ContextFile[];
      fixtureOverrides?: (ContextFile & { content: string })[];
    });

interface QuizQuestionBase {
  id: string;
  question: string;
  options: string[];
  explanation: string;
}

export type QuizQuestion =
  | (QuizQuestionBase & { type: "single"; correctIndex: number })
  | (QuizQuestionBase & { type: "multi"; correctIndexes: number[] });

export interface Quiz {
  id: string;
  title: string;
  questions: QuizQuestion[];
}

export interface MiniProjectStep {
  id: string;
  title: string;
  description: string;
  /** Команда для терминала, которую можно скопировать одной кнопкой. */
  command?: string;
  /** Что должно произойти / что должно быть в выводе — помогает понять, что шаг выполнен верно. */
  expectedResult?: string;
}

export interface MiniProject {
  title: string;
  description: string;
  /** Почему шаги нельзя проверить автоматически (выполняются на машине ученика) + что делать, если застрял. */
  note: string;
  steps: MiniProjectStep[];
  /** id упражнения из content/exercises — практическая часть, которую можно проверить прямо в песочнице. */
  practiceExerciseId?: string;
}

export interface LessonManifestEntry {
  slug: string;
  title: string;
  estimatedMinutes: number;
}

export interface BlockManifestEntry {
  slug: string;
  title: string;
  description: string;
  lessons: LessonManifestEntry[];
  miniProject: MiniProject;
}
