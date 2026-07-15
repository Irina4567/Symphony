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
}

export type HttpCheck =
  | { type: "http-status"; requestId: string; expectedStatus: number; description: string }
  | { type: "http-body-contains"; requestId: string; value: string; description: string }
  | { type: "http-body-not-contains"; requestId: string; value: string; description: string }
  | { type: "http-body-matches"; requestId: string; pattern: string; flags?: string; description: string };

interface ExerciseBase {
  id: string;
  title: string;
  description: string;
  starterCode: string;
  solution: string;
  hint?: string;
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
