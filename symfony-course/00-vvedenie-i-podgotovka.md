# Модуль 00. Введение в курс, философия Symfony и подготовка окружения

> Курс: **Symfony с 0 до PRO**. Модуль 0 из 19 (+ финальный проект).
> Уровень входа: вы уже пишете на PHP (ООП, composer, базовый SQL), но раньше не работали с Symfony.

---

## 0.1. Как устроен этот курс

Курс построен по принципу "теория → мини-практика → сквозной проект".

1. **Теория** — объясняется простыми словами, без лишнего жаргона, с аналогиями.
2. **Практика внутри модуля** — короткие изолированные примеры, чтобы пощупать концепцию руками.
3. **Сквозной проект BookNest** — в каждом модуле мы добавляем в один и тот же проект (интернет-магазин книг) новый кусок функциональности. К концу курса у вас будет полноценное приложение уровня production.
4. **Задания для самостоятельной практики** — с решениями в конце файла (не подглядывайте сразу!).
5. **Частые ошибки новичков** — то, на чём обычно спотыкаются.
6. **Чек-лист "Я умею"** — самопроверка в конце модуля.

Модули стоит проходить по порядку — материал выстроен так, что каждый следующий модуль опирается на предыдущие.

---

## 0.2. Что такое Symfony и зачем он нужен

Symfony — это **PHP-фреймворк** и одновременно **набор переиспользуемых компонентов**. Это два разных, но связанных понятия:

- **Symfony Components** — низкоуровневые независимые библиотеки (Routing, HttpFoundation, DependencyInjection, Console, EventDispatcher и т.д.), каждую из которых можно подключить в любой проект через Composer отдельно от остального фреймворка. Именно на компонентах Symfony построены Laravel, Drupal 8+, phpBB, часть Magento 2 и десятки других проектов.
- **Symfony Framework (full-stack)** — "сборка" из этих компонентов плюс "клей" (Flex, бандлы, конвенции), который превращает их в цельный инструмент для разработки приложений.

### Почему именно Symfony

- **Стабильность и предсказуемость.** У Symfony чёткая политика версионирования (semver) и LTS-релизы (Long Term Support) с поддержкой 3 года. Symfony 6.4 — LTS, Symfony 7.x — актуальная ветка с полугодовым циклом релизов.
- **Модульность.** Вы используете ровно те компоненты, которые нужны — от микросервиса на голом Routing+HttpKernel до огромного enterprise-приложения.
- **DI-контейнер и автоматизация (autowiring/autoconfiguration)** избавляют от ручной сборки объектов.
- **Экосистема**: Doctrine ORM, API Platform, Symfony UX, EasyAdmin, Messenger — закрывают 90% типовых задач.
- **Стандарт для крупных компаний**: используется в Spotify (часть инфраструктуры), BlaBlaCar, Trivago, Platform.sh и множестве enterprise/госпроектов в Европе.
- **Хороший карьерный трек**: Symfony — один из самых высокооплачиваемых стеков в PHP-мире, особенно в Европе.

### Symfony vs Laravel — коротко

| | Symfony | Laravel |
|---|---|---|
| Философия | "конструктор из компонентов", явность | "batteries included", "магия" через фасады |
| DI-контейнер | Явный, строго типизированный, компилируется | Service Container, более динамичный |
| Порог входа | Выше | Ниже |
| Гибкость архитектуры | Очень высокая | Высокая, но многое "предполагает" Laravel-way |
| Долгосрочная поддержка (LTS) | Есть, 3 года | Есть, но короче |

Это не соревнование "что лучше" — это два разных подхода. Symfony отлично подходит, когда важны контроль, тестируемость и долгий жизненный цикл проекта.

---

## 0.3. Архитектура: как Symfony обрабатывает запрос

Ключевая идея всего фреймворка — **HttpKernel** и цикл `Request → Response`.

```
                     ┌──────────────────────────────────────────┐
                     │              HttpKernel                   │
Browser ── Request ──▶  1. kernel.request                        │
                     │  2. Определение контроллера (Routing)      │
                     │  3. kernel.controller                      │
                     │  4. Аргументы контроллера (ValueResolver)  │
                     │  5. kernel.controller_arguments            │
                     │  6. Вызов контроллера                      │
                     │  7. kernel.view (если контроллер вернул    │
                     │     не Response, а данные)                 │
                     │  8. kernel.response                        │
Browser ◀── Response ── 9. kernel.terminate (после отправки)      │
                     └──────────────────────────────────────────┘
```

Это называется **Front Controller Pattern**: единая точка входа (`public/index.php`) принимает *все* HTTP-запросы, оборачивает их в объект `Request`, передаёт в `Kernel`, а тот возвращает объект `Response`.

Важно понять с самого начала: **в Symfony всё — это события**. HttpKernel на каждом этапе диспатчит событие (`kernel.request`, `kernel.controller` и т.д.), на которые подписаны десятки internal-подписчиков (роутинг, security, сессии, локаль...) и на которые можете подписаться вы сами. Это разберём подробно в модуле 14.

### Request и Response — фундамент HTTP

Symfony оборачивает "сырой" HTTP в объектно-ориентированный API через компонент **HttpFoundation**:

```php
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

$request = Request::createFromGlobals(); // аналог $_GET, $_POST, $_SERVER...

$request->query->get('page');      // $_GET['page']
$request->request->get('email');   // $_POST['email']
$request->headers->get('Accept');  // заголовок запроса
$request->getMethod();             // GET, POST...
$request->cookies->get('session'); // $_COOKIE

$response = new Response('Привет, мир!', Response::HTTP_OK, [
    'Content-Type' => 'text/plain',
]);
$response->send(); // выводит тело + заголовки
```

Все остальные абстракции фреймворка (контроллеры, формы, security) в конечном счёте работают именно с этими двумя объектами.

---

## 0.4. Установка окружения

### Требования

- **PHP 8.2+** (для Symfony 7.x). Проверьте: `php -v`.
- Расширения PHP: `ctype`, `iconv`, `pcre`, `session`, `simplexml`, `tokenizer`, а также обычно `intl`, `pdo_mysql`/`pdo_pgsql`, `xml`, `zip`.
- **Composer 2.x** — менеджер зависимостей PHP.
- **Symfony CLI** — удобная локальная утилита (dev-сервер, диагностика, создание проектов).
- Опционально, но рекомендуется: **Docker** и **Docker Compose** (для баз данных, Redis, RabbitMQ и т.д. — используем в проекте BookNest).

### Установка PHP и Composer

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install php8.3 php8.3-cli php8.3-common php8.3-mbstring \
  php8.3-xml php8.3-curl php8.3-mysql php8.3-intl php8.3-zip php8.3-sqlite3 -y

curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
composer --version
```

**macOS (Homebrew):**
```bash
brew install php composer
```

**Windows:** рекомендуется использовать WSL2 (Ubuntu) и следовать инструкции для Linux — это избавит вас от 90% проблем с путями и расширениями.

### Установка Symfony CLI

```bash
curl -sS https://get.symfony.com/cli/installer | bash
mv ~/.symfony*/bin/symfony /usr/local/bin/symfony
symfony version
symfony check:requirements
```

`symfony check:requirements` покажет, каких расширений или настроек не хватает — обязательно прогоните эту команду.

### Docker для инфраструктуры (рекомендуется)

Мы будем поднимать PostgreSQL, Redis и RabbitMQ через Docker Compose, чтобы не пачкать систему. Установите **Docker Desktop** (Win/macOS) или `docker` + `docker-compose-plugin` (Linux).

---

## 0.5. Создание первого проекта

Symfony предлагает два стартовых "скелета":

```bash
# Полноценное веб-приложение (Twig, форма, всё "из коробки")
symfony new my_project --version="7.*" --webapp

# Минимальный скелет — только микроядро, добавляете компоненты сами
symfony new my_project --version="7.*"
```

Разница: `--webapp` сразу тянет Twig, Doctrine, security, форму, Symfony UX, mailer, profiler и т.д. (через **Symfony Flex**). Минимальный скелет — это `symfony/skeleton`, почти пустой каркас, куда пакеты добавляются по одному через `composer require`.

Мы создадим проект **BookNest** — сквозной проект курса — как webapp-скелет:

```bash
symfony new booknest --version="7.*" --webapp
cd booknest
symfony serve -d       # поднимет локальный dev-сервер (обычно https://127.0.0.1:8000)
symfony open:local     # откроет в браузере
```

Если не используете Symfony CLI, можно через Composer напрямую:

```bash
composer create-project symfony/skeleton:"7.*" booknest
cd booknest
composer require webapp   # добавит "джентльменский набор" webapp-пакетов
php -S 127.0.0.1:8000 -t public/
```

### Что такое Symfony Flex

**Flex** — это composer-плагин, который автоматизирует установку пакетов: при `composer require <пакет>` он не только качает библиотеку, но и применяет **рецепт** (recipe) — набор изменений в проекте (создаёт конфиг-файлы в `config/packages/`, добавляет строки в `.env`, создаёт нужные директории). Это то, что отличает Symfony-проект от "просто набора либ, слепленных вручную": вы почти никогда не настраиваете бандлы с нуля — за вас это делает рецепт, а вы точечно правите конфиг под себя.

```bash
composer require doctrine     # накатит doctrine/orm + doctrine-bundle + конфиги
composer require twig
composer require symfony/mailer
```

Проверить применённые рецепты:
```bash
composer recipes
```

---

## 0.6. Структура каталогов проекта

```
booknest/
├── bin/
│   └── console                # входная точка для CLI-команд (php bin/console ...)
├── config/
│   ├── bundles.php            # список подключённых бандлов
│   ├── packages/              # конфиг каждого бандла (doctrine.yaml, security.yaml...)
│   ├── routes/                # конфигурация роутов (annotations/attributes.yaml)
│   ├── services.yaml          # конфигурация DI-контейнера проекта
│   └── routes.yaml
├── migrations/                 # миграции базы данных (Doctrine Migrations)
├── public/
│   └── index.php               # единственная точка входа для HTTP (Front Controller)
├── src/
│   ├── Controller/
│   ├── Entity/
│   ├── Repository/
│   ├── Form/
│   ├── Security/
│   ├── EventListener/ (или EventSubscriber/)
│   └── Kernel.php              # ядро приложения
├── templates/                  # Twig-шаблоны
├── tests/                      # PHPUnit-тесты
├── translations/                # файлы локализации
├── var/
│   ├── cache/                  # скомпилированный контейнер, кэш роутов и т.д.
│   └── log/                    # логи приложения
├── vendor/                      # зависимости composer
├── .env                         # переменные окружения (дефолтные значения, коммитится)
├── .env.local                   # локальные переопределения (НЕ коммитится)
├── composer.json
└── symfony.lock                 # файл блокировки рецептов Flex
```

Ключевой принцип: **весь ваш код лежит в `src/`**, а `vendor/`, `var/` — генерируемые/сторонние директории, которые не редактируются руками и не коммитятся в Git (кроме `vendor/` — это отдельный холиварный вопрос, по умолчанию не коммитим).

`.gitignore`, который создаёт Flex по умолчанию, уже правильно исключает `var/`, `vendor/`, `.env.local`.

---

## 0.7. bin/console — ваш главный инструмент

Symfony поставляется с мощной консольной утилитой:

```bash
php bin/console list                       # список всех доступных команд
php bin/console debug:router               # таблица всех маршрутов
php bin/console debug:container            # список сервисов в DI-контейнере
php bin/console debug:container --types    # то же, но по типам
php bin/console debug:config doctrine      # текущий конфиг бандла
php bin/console cache:clear                # очистить кэш
php bin/console about                      # информация о проекте и окружении
```

Совет: держите `bin/console` открытым в соседнем терминале на протяжении всего курса — команды `debug:*` экономят часы отладки.

---

## 0.8. О сквозном проекте курса — BookNest

На протяжении курса мы будем поэтапно строить **BookNest** — интернет-магазин книг с полноценным веб-интерфейсом и REST API. Это позволит увидеть, как разные части Symfony работают *вместе*, а не только по отдельности.

### Функциональность, которую мы построим по модулям

| Модуль | Что добавляем в BookNest |
|---|---|
| 01 Routing/Controllers | Страницы каталога книг, страница книги, health-check роут |
| 02 Twig | Общий layout, карточки книг, пагинация вёрстки |
| 03 Config | Разделение dev/prod/test, параметры магазина (валюта, налог) |
| 04 DI | Сервис `PriceCalculator`, `CartManager` как сервисы контейнера |
| 05-06 Doctrine | Сущности `Book`, `Author`, `Category`, `Order`, `OrderItem`, миграции, связи |
| 07 Формы | Форма добавления/редактирования книги (админка), форма оформления заказа |
| 08 Валидация | Правила валидации на Book и Order |
| 09-10 Security | Регистрация/логин покупателей, роли `ROLE_ADMIN`/`ROLE_CUSTOMER`, voter на редактирование своих заказов |
| 11 Serializer/REST | JSON API для каталога (для мобильного приложения) |
| 12 API Platform | Полноценный автогенерируемый API с фильтрами и документацией |
| 13 Тесты | Unit-тесты `PriceCalculator`, functional-тесты каталога и оформления заказа |
| 14 Events/Messenger | Отправка email при заказе — асинхронно через очередь |
| 15 Cache/Console | Кэш каталога, консольная команда импорта книг из CSV |
| 16 Frontend/UX | Живой поиск по каталогу через Stimulus, корзина без перезагрузки страницы |
| 17 Production | Docker prod-образ, деплой-чеклист |
| 18 Архитектура | Рефакторинг бизнес-логики в сервисный слой, чистая структура |
| 19 Финал | Сборка, ревью, чек-лист PRO |

### Установка BookNest прямо сейчас

Выполните это один раз — в следующем модуле мы сразу начнём добавлять роуты и контроллеры.

```bash
symfony new booknest --version="7.*" --webapp
cd booknest
composer require symfony/maker-bundle --dev
git init && git add . && git commit -m "Initial Symfony skeleton"
```

`symfony/maker-bundle` — генератор кода (`make:controller`, `make:entity` и т.д.), мы будем активно им пользоваться, но всегда будем разбирать, *что именно* он сгенерировал.

### docker-compose.yml для инфраструктуры

Создайте файл `compose.override.yaml` (или используйте встроенный `symfony/orm-pack` + Docker):

```yaml
# compose.yaml
services:
  database:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: app
      POSTGRES_PASSWORD: !ChangeMe!
      POSTGRES_USER: app
    ports:
      - "5432:5432"
    volumes:
      - database_data:/var/lib/postgresql/data:rw

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  database_data:
```

```bash
docker compose up -d
```

Symfony CLI умеет автоматически прокидывать переменные подключения из Docker в `.env.local.php` — подробнее об этом в модуле 03.

---

## 0.9. Практика модуля 0

**Задание 1.** Установите PHP 8.3, Composer, Symfony CLI. Выполните `symfony check:requirements` и устраните все предупреждения.

**Задание 2.** Создайте проект `booknest` в режиме `--webapp`, запустите dev-сервер и откройте в браузере стартовую страницу Symfony.

**Задание 3.** Выполните `php bin/console debug:router` на свежесозданном проекте и изучите, какие маршруты уже существуют "из коробки" (это служебные маршруты web-профайлера).

**Задание 4.** Поднимите PostgreSQL и Redis через Docker Compose из примера выше, убедитесь, что `docker compose ps` показывает оба контейнера в статусе `healthy`/`running`.

### Решения

<details>
<summary>Решение задания 3</summary>

После `--webapp` установки вы увидите роуты вида `_wdt`, `_profiler`, `_profiler_*` — это служебные маршруты **Web Debug Toolbar** и **Profiler**, работающие только в dev-окружении (`APP_ENV=dev`). В production их не будет — это настраивается через `when@dev` в `config/routes/dev/web_profiler.yaml`. Мы подробно разберём окружения в модуле 03.
</details>

---

## 0.10. Частые ошибки новичков

1. **Правят файлы в `var/cache/`.** Кэш регенерируется автоматически, ручные правки бессмысленны и приведут к путанице после `cache:clear`.
2. **Коммитят `.env.local`.** Туда попадают секреты (пароли БД, API-ключи) — файл специально исключён в `.gitignore`.
3. **Путают `.env` и `.env.local`.** `.env` — дефолтные значения "для примера", коммитится в репозиторий. `.env.local` — реальные значения на конкретной машине, не коммитится.
4. **Забывают, что после смены `APP_ENV` нужно почистить кэш** (`php bin/console cache:clear`), иначе можно словить труднообъяснимые баги — старый скомпилированный контейнер не соответствует новому конфигу.
5. **Игнорируют `symfony check:requirements`** и потом долго разбираются, почему не работает intl-форматирование или сессии.

---

## Чек-лист "Я умею" — Модуль 0

- [ ] Объяснить разницу между Symfony Components и Symfony Framework
- [ ] Нарисовать по памяти цикл Request → Response через HttpKernel
- [ ] Создать новый Symfony-проект через Symfony CLI и Composer
- [ ] Ориентироваться в стандартной структуре каталогов проекта
- [ ] Пользоваться `bin/console` для диагностики (`debug:router`, `debug:container`, `about`)
- [ ] Поднять инфраструктуру (БД, Redis) через Docker Compose
- [ ] Понимать роль Symfony Flex и рецептов при `composer require`

**Дальше:** [Модуль 01 — Routing и контроллеры](01-routing-i-kontrollery.md)
