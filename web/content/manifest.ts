import type { BlockManifestEntry } from "./types";

// Единый источник правды о порядке блоков и уроков курса.
// Чтобы добавить урок: (1) положить .mdx в content/blocks/<block>/<lesson>.mdx,
// (2) добавить запись сюда. Порядок в массиве = порядок в сайдбаре и навигации.
export const manifest: BlockManifestEntry[] = [
  {
    slug: "intro",
    title: "Блок 0. Введение в Symfony",
    description:
      "С чего начинается Symfony: что это такое, как устроена экосистема, как поднять первый проект и на чём всё это работает изнутри.",
    lessons: [
      {
        slug: "what-is-symfony",
        title: "Что такое Symfony",
        estimatedMinutes: 8,
      },
      {
        slug: "installation",
        title: "Установка и структура проекта",
        estimatedMinutes: 10,
      },
      {
        slug: "console-and-environments",
        title: "bin/console и окружения",
        estimatedMinutes: 8,
      },
      {
        slug: "oop-warmup",
        title: "ООП-разминка: классы, namespace, автозагрузка",
        estimatedMinutes: 12,
      },
    ],
    miniProject: {
      title: "Установи Symfony и исследуй структуру проекта",
      description:
        "Разверни новый проект Symfony локально с помощью Symfony CLI или Composer, запусти встроенный веб-сервер и пройдись по структуре каталогов. Цель — своими руками увидеть то, о чём говорилось в теории, прежде чем переходить к роутингу и контроллерам.",
      note: "Эти шаги выполняются на твоей машине (нужны PHP, Composer и, желательно, Symfony CLI) — сайт не может проверить их автоматически, поэтому отмечай чекбоксы вручную по мере выполнения. Застрял на каком-то шаге? Перечитай урок «Установка и структура проекта» — там разобран каждый термин из списка ниже. А в самом конце — отдельное практическое задание, которое можно выполнить и проверить прямо здесь, в браузере.",
      steps: [
        {
          id: "install-cli",
          title: "Установи Symfony CLI",
          description:
            "Symfony CLI — это отдельный бинарник (не PHP-пакет), который умеет создавать проекты, поднимать локальный сервер и проверять, готово ли твоё окружение. Установи его по инструкции с symfony.com/download для своей ОС, затем проверь требования.",
          command: "symfony check:requirements",
          expectedResult:
            "Команда должна отработать без фатальных ошибок (предупреждения — не страшно) и вывести версию PHP и список расширений.",
        },
        {
          id: "create-project",
          title: "Создай новый проект",
          description:
            "Флаг --webapp ставит полный набор пакетов (Twig, security, forms и т.д.) — то, о чём говорилось в уроке про установку. Если Symfony CLI поставить не удалось, тот же результат даёт composer create-project symfony/webapp-skeleton my_project.",
          command: "symfony new my_project --webapp",
          expectedResult: "Появился каталог my_project/ с готовым composer.json, папками src/, config/, public/ и т.д.",
        },
        {
          id: "run-server",
          title: "Запусти встроенный сервер",
          description:
            "Зайди в каталог проекта и запусти локальный сервер. Открой адрес, который он выведет в консоли — должна появиться приветственная страница Symfony.",
          command: "cd my_project && symfony serve",
          expectedResult: "В браузере на https://127.0.0.1:8000 открывается страница приветствия Symfony.",
        },
        {
          id: "explore-structure",
          title: "Изучи структуру каталогов",
          description:
            "Открой my_project в редакторе и пройдись по src/, config/, public/, templates/, var/. Для каждого каталога вспомни (или подсмотри в уроке «Установка и структура проекта»), за что он отвечает — это пригодится в практическом задании ниже.",
          command: "ls -la my_project",
          expectedResult:
            "Ты можешь без подглядывания объяснить своими словами, что лежит в src/, public/, config/ и var/.",
        },
        {
          id: "run-console",
          title: "Выполни команду bin/console",
          description:
            "bin/console — это CLI-приложение твоего проекта. Посмотри список доступных команд, а затем — сводку о самом проекте (версия Symfony, окружение, PHP).",
          command: "php bin/console list && php bin/console about",
          expectedResult: "about выводит таблицу с версией Symfony, окружением (dev) и версией PHP.",
        },
        {
          id: "env-files",
          title: "Найди .env и пойми окружения",
          description:
            "Открой .env в корне проекта — там задан APP_ENV=dev по умолчанию. Вспомни (или перечитай урок «bin/console и окружения»), чем dev отличается от prod по поведению кэша и отображению ошибок.",
          command: "cat .env",
          expectedResult:
            "Ты можешь объяснить, почему в dev включён профайлер и подробные ошибки, а в prod — нет.",
        },
      ],
      practiceExerciseId: "intro-project-structure-map",
    },
  },
  {
    slug: "routing",
    title: "Блок 1. Роутинг и контроллеры",
    description:
      "Первый настоящий Symfony-код: как запрос находит нужный метод контроллера, что такое Response, как читать Request и как отдавать JSON. Здесь же стартует BookShelf — сквозной проект, который дорастёт до полноценного приложения к концу курса.",
    lessons: [
      {
        slug: "routing-basics",
        title: "Роутинг: атрибуты, параметры, генерация URL",
        estimatedMinutes: 12,
      },
      {
        slug: "controllers-and-response",
        title: "Контроллеры и Response",
        estimatedMinutes: 10,
      },
      {
        slug: "request-and-query",
        title: "Request, query-параметры и коды ответа",
        estimatedMinutes: 10,
      },
      {
        slug: "json-api",
        title: "JSON API: JsonResponse",
        estimatedMinutes: 12,
      },
    ],
    miniProject: {
      title: "BookShelf, часть 1: JSON API каталога книг",
      description:
        "Собери первую часть BookShelf — API из трёх маршрутов: список книг, книга по id (с честным 404) и создание книги с валидацией обязательных полей. Реальная база данных появится позже, в блоке про Doctrine — сейчас книги живут в PHP-массиве прямо в контроллере.",
      note: "В отличие от мини-проекта Блока 0, этот проект проверяется полностью автоматически — 11 HTTP-проверок прямо в браузере, без установки чего-либо на свою машину. Шаги ниже — не команды терминала, а чек-лист самопроверки перед тем, как садиться за код: собеседования на Symfony-позиции часто начинаются именно с «сначала опиши контракт, потом пиши код».",
      steps: [
        {
          id: "understand-contract",
          title: "Пойми контракт API",
          description:
            "Прежде чем открывать редактор, распиши для себя (на бумаге или в голове): что должен принимать и возвращать каждый из трёх маршрутов, и какие коды ответа для каких случаев — 200, 201, 400 или 404.",
        },
        {
          id: "implement-read",
          title: "Реализуй чтение: GET /api/books и GET /api/books/{id}",
          description:
            "Начни с более простой части — чтения. Не забудь про случай, когда книги с таким id нет: это не ошибка сервера, а штатный 404 с понятным телом ответа.",
        },
        {
          id: "implement-write",
          title: "Реализуй создание: POST /api/books с валидацией",
          description:
            "Сначала отсеки невалидный случай (нет title или author) и верни 400 — и только потом обрабатывай успешный путь. Так проще ничего не забыть.",
        },
        {
          id: "green-checks",
          title: "Прогони все проверки",
          description: "Нажми «Запустить» в задании ниже и добейся, чтобы все 11 проверок стали зелёными.",
          expectedResult: "Каждый пункт в блоке проверок отмечен галочкой, а не крестиком.",
        },
      ],
      practiceExerciseId: "bookshelf-api",
    },
  },
  {
    slug: "twig",
    title: "Блок 2. Twig и шаблоны",
    description:
      "От JSON к HTML: синтаксис Twig, циклы и условия, наследование шаблонов и генерация ссылок по имени маршрута. BookShelf обрастает человекочитаемой HTML-витриной поверх того же каталога книг.",
    lessons: [
      {
        slug: "twig-basics",
        title: "Twig: синтаксис и переменные",
        estimatedMinutes: 10,
      },
      {
        slug: "control-structures",
        title: "Управляющие конструкции: for, if",
        estimatedMinutes: 10,
      },
      {
        slug: "template-inheritance",
        title: "Наследование шаблонов: extends, block",
        estimatedMinutes: 10,
      },
      {
        slug: "links-and-assets",
        title: "Ссылки и статика: path(), url(), asset()",
        estimatedMinutes: 8,
      },
    ],
    miniProject: {
      title: "BookShelf, часть 2: HTML-витрина каталога",
      description:
        "Собери HTML-страницу каталога книг: общий макет через наследование, список с переходом на страницу каждой книги, честная обработка пустого каталога. Контроллер и маршруты для этой части уже готовы и зашиты в песочницу — фокус полностью на шаблоне.",
      note: "Как и мини-проект Блока 1, этот тоже проверяется полностью автоматически прямо в браузере — 6 проверок на страницу. Шаги ниже — чек-лист самопроверки, а не команды терминала.",
      steps: [
        {
          id: "understand-scope",
          title: "Пойми, что уже готово",
          description:
            "Контроллер, который рендерит этот шаблон и передаёт в него список книг, уже написан (см. пример в уроке «Twig: синтаксис и переменные») — тебе нужно написать только .twig-файл.",
        },
        {
          id: "extend-layout",
          title: "Расширь базовый макет",
          description:
            "Начни с {% extends %} и переопредели оба блока — title и content. Без этого проверки на заголовок страницы не пройдут.",
        },
        {
          id: "render-list",
          title: "Выведи список со ссылками",
          description:
            "Цикл по книгам с веткой else на случай пустого каталога, и ссылка на каждую книгу через path(), а не хардкод URL.",
        },
        {
          id: "green-checks",
          title: "Прогони все проверки",
          description: "Нажми «Запустить» в задании ниже и добейся, чтобы все 6 проверок стали зелёными.",
          expectedResult: "Каждый пункт в блоке проверок отмечен галочкой, а не крестиком.",
        },
      ],
      practiceExerciseId: "bookshelf-catalog",
    },
  },
  {
    slug: "doctrine",
    title: "Блок 3. Doctrine ORM",
    description:
      "От PHP-массива к настоящей базе данных: Entity и маппинг, EntityManager, QueryBuilder и связи между сущностями. BookShelf наконец получает реальную персистентность — созданная книга переживает границу HTTP-запроса.",
    lessons: [
      {
        slug: "entity-basics",
        title: "Entity: маппинг класса на таблицу",
        estimatedMinutes: 12,
      },
      {
        slug: "entity-manager",
        title: "EntityManager: persist, flush, find",
        estimatedMinutes: 10,
      },
      {
        slug: "query-builder",
        title: "QueryBuilder и репозитории",
        estimatedMinutes: 10,
      },
      {
        slug: "relations",
        title: "Связи между сущностями: ManyToOne",
        estimatedMinutes: 10,
      },
    ],
    miniProject: {
      title: "BookShelf, часть 3: JSON API на настоящей базе данных",
      description:
        "Тот же контракт API, что и в Блоке 1 (список, книга по id, создание) — но PHP-массив заменяется на настоящую SQLite-базу через Doctrine. Entity Book/Author и сидинг трёх книг уже готовы — фокус на контроллере.",
      note: "Проверяется полностью автоматически прямо в браузере — 10 проверок, включая ту самую, ради которой всё затевалось: книга, созданная через POST, действительно появляется в следующем GET-списке.",
      steps: [
        {
          id: "understand-scope",
          title: "Пойми, что уже готово",
          description:
            "Entity Book и Author, а также сидинг трёх книг (1984, Clean Code, Dune) уже зашиты в песочницу — тебе нужно написать только контроллер поверх них, как в мини-проекте Блока 1.",
        },
        {
          id: "implement-read",
          title: "Реализуй чтение через репозиторий",
          description:
            "findAll() для списка, find($id) для одной книги — плюс честный 404, если книги с таким id нет.",
        },
        {
          id: "implement-write",
          title: "Реализуй создание с поиском/созданием автора",
          description:
            "Сначала проверь обязательные поля (400 при их отсутствии), затем найди автора по имени или создай нового — и только потом создавай книгу.",
        },
        {
          id: "green-checks",
          title: "Прогони все проверки",
          description:
            "Нажми «Запустить» и обрати внимание на последнюю проверку — список книг запрашивается ещё раз ПОСЛЕ создания новой, чтобы убедиться, что она реально сохранилась.",
          expectedResult: "Все 10 проверок зелёные, включая появление новой книги в повторном списке.",
        },
      ],
      practiceExerciseId: "bookshelf-doctrine",
    },
  },
  {
    slug: "forms",
    title: "Блок 4. Формы и валидация",
    description:
      "От JSON-запросов к настоящей HTML-форме: FormType, ограничения (constraints) на Entity, обработка отправки и flash-сообщения с редиректом. BookShelf получает страницу добавления книги, которую можно открыть в браузере.",
    lessons: [
      {
        slug: "form-basics",
        title: "FormType: строим и рендерим форму",
        estimatedMinutes: 10,
      },
      {
        slug: "validation",
        title: "Validator: ограничения на данные",
        estimatedMinutes: 10,
      },
      {
        slug: "form-handling",
        title: "Обработка отправки: handleRequest, isValid",
        estimatedMinutes: 10,
      },
      {
        slug: "flash-and-redirect",
        title: "Flash-сообщения и Post/Redirect/Get",
        estimatedMinutes: 8,
      },
    ],
    miniProject: {
      title: "BookShelf, часть 4: форма добавления книги",
      description:
        "Собери три действия: список книг, пустая форма и её обработка — с сохранением и редиректом при успехе или повторным показом формы с ошибками при провале. Entity, FormType и шаблон формы уже готовы — фокус на контроллере.",
      note: "Проверяется полностью автоматически прямо в браузере — 7 проверок, включая полный цикл: список пуст → форма отрисована → успешная отправка (редирект) → книга появилась в списке → невалидная отправка повторно показывает форму с ошибкой.",
      steps: [
        {
          id: "understand-scope",
          title: "Пойми, что уже готово",
          description:
            "BookFormType, Entity Book (с constraints) и шаблон exercises/book_form.html.twig уже зашиты в песочницу — тебе нужно написать только контроллер с тремя действиями.",
        },
        {
          id: "implement-index-and-new",
          title: "Реализуй index и new",
          description: "index — список книг в JSON. new — просто создать форму и отрендерить шаблон.",
        },
        {
          id: "implement-create",
          title: "Реализуй create с Post/Redirect/Get",
          description:
            "handleRequest → если валидна, сохрани и сделай addFlash + redirectToRoute('books_index'); если нет — верни ту же форму (страница сама покажет ошибки).",
        },
        {
          id: "green-checks",
          title: "Прогони все проверки",
          description: "Нажми «Запустить» и обрати внимание на статус 422 у невалидной отправки — это не баг, а поведение Symfony по умолчанию.",
          expectedResult: "Все 7 проверок зелёные.",
        },
      ],
      practiceExerciseId: "bookshelf-form",
    },
  },
  {
    slug: "security",
    title: "Блок 5. Security: аутентификация и авторизация",
    description:
      "Кто ты и что тебе разрешено: Entity-пользователь и хэширование паролей, кастомный Authenticator, роли и access_control, Voter для проверок на уровне конкретного объекта. BookShelf получает вход по паролю и правило «редактировать может только тот, кто добавил книгу».",
    lessons: [
      {
        slug: "user-entity",
        title: "Пользователь: Entity и хэширование паролей",
        estimatedMinutes: 10,
      },
      {
        slug: "authentication",
        title: "Аутентификация: кастомный Authenticator",
        estimatedMinutes: 12,
      },
      {
        slug: "authorization-roles",
        title: "Авторизация: роли и access_control",
        estimatedMinutes: 10,
      },
      {
        slug: "voters",
        title: "Voters: авторизация на уровне объекта",
        estimatedMinutes: 10,
      },
    ],
    miniProject: {
      title: "BookShelf, часть 5: защити каталог",
      description:
        "Собери три действия: публичный список книг, создание книги вошедшим пользователем (создатель становится владельцем) и редактирование, доступное только владельцу конкретной книги. Login, Authenticator и Voter уже готовы и зашиты в песочницу — фокус на контроллере.",
      note: "Проверяется полностью автоматически прямо в браузере — 7 проверок, включая полный жизненный цикл: анонимная попытка создать книгу отклоняется, вошедший пользователь создаёт книгу и редактирует свою, но не может отредактировать чужую.",
      steps: [
        {
          id: "understand-scope",
          title: "Пойми, что уже готово",
          description:
            "User, ApiLoginAuthenticator и BookVoter уже зашиты в песочницу и работают — тебе нужно написать только контроллер с тремя действиями, как в предыдущих мини-проектах.",
        },
        {
          id: "implement-index",
          title: "Реализуй index",
          description: "Список всех книг в JSON, включая email владельца каждой — этот маршрут публичный, вход не нужен.",
        },
        {
          id: "implement-create",
          title: "Реализуй create с проверкой роли",
          description:
            "Защити маршрут через #[IsGranted('ROLE_USER')] и сделай текущего пользователя ($this->getUser()) владельцем новой книги.",
        },
        {
          id: "implement-update",
          title: "Реализуй update с проверкой через Voter",
          description:
            "Сначала найди книгу (404, если её нет), потом denyAccessUnlessGranted('EDIT', $book) — и только потом меняй данные.",
        },
        {
          id: "green-checks",
          title: "Прогони все проверки",
          description:
            "Нажми «Запустить» и обрати внимание на последовательность: один и тот же маршрут PATCH сначала отвечает 200 (владельцу), затем 403 (постороннему), хотя код один и тот же — решает именно Voter.",
          expectedResult: "Все 7 проверок зелёные.",
        },
      ],
      practiceExerciseId: "bookshelf-secure",
    },
  },
];

export function getBlock(blockSlug: string): BlockManifestEntry | undefined {
  return manifest.find((block) => block.slug === blockSlug);
}

export function getLessonMeta(blockSlug: string, lessonSlug: string) {
  const block = getBlock(blockSlug);
  return block?.lessons.find((lesson) => lesson.slug === lessonSlug);
}

export function getAllLessonParams() {
  return manifest.flatMap((block) =>
    block.lessons.map((lesson) => ({ block: block.slug, lesson: lesson.slug }))
  );
}

export function getAdjacentLessons(blockSlug: string, lessonSlug: string) {
  const block = getBlock(blockSlug);
  if (!block) return { prev: null, next: null };
  const index = block.lessons.findIndex((lesson) => lesson.slug === lessonSlug);
  const prev = index > 0 ? { block: block.slug, lesson: block.lessons[index - 1] } : null;
  const next =
    index >= 0 && index < block.lessons.length - 1
      ? { block: block.slug, lesson: block.lessons[index + 1] }
      : null;
  return { prev, next };
}
