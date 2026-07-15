# Symfony с 0 до PRO

Самый исчерпывающий курс по Symfony (актуальная ветка 7.x) для PHP-разработчика на русском языке: от установки окружения до внутреннего устройства фреймворка, распределённых систем, Event Sourcing и soft skills senior-инженера.

Курс состоит из двух частей. **Часть 1 (модули 0-19)** — полный основной курс: от нуля до продакшена, охватывающий весь стандартный стек Symfony-разработчика (Routing, Doctrine, Security, API, тесты, деплой, архитектура). **Часть 2 (модули 20-34, Senior-трек)** — то, что обычно не попадает в туториалы: внутреннее устройство контейнера и ядра, распределённые примитивы (Lock/RateLimiter), Event Sourcing и полноценный CQRS, real-time (Mercure), продвинутая аутентификация (OAuth2/OIDC/JWT), написание собственных бандлов, производительность рантайма, обсервабилити, миграция legacy-систем и код-ревью/менторство/архитектурные решения senior-уровня.

Весь курс построен вокруг единого сквозного проекта — **BookNest**, интернет-магазина книг с веб-интерфейсом, личным кабинетом, админ-панелью и REST API. Каждый модуль добавляет в проект новый слой функциональности, так что к концу курса у вас на руках — полноценное production-ready приложение, а не набор оторванных друг от друга примеров.

## Как заниматься

- Модули идут по порядку — материал выстроен так, что каждый следующий опирается на предыдущие. Часть 2 предполагает, что вся Часть 1 уже пройдена и практически отработана.
- В каждом модуле: теория простым языком → примеры кода → практика на BookNest → отдельные задания с решениями → частые ошибки → чек-лист самопроверки.
- Не подглядывайте в решения заданий сразу — сначала попробуйте сами.
- Рекомендуемый темп: 1-2 модуля в неделю при параллельной практике на своём варианте проекта (не обязательно именно книжный магазин — механику легко перенести на любую предметную область).
- Часть 2 не обязательно проходить целиком по порядку — после модуля 20 (внутреннее устройство) модули 21-33 достаточно независимы друг от друга, выбирайте по актуальности для вашей текущей работы. Модуль 34 — логичный финал в любом случае.

## Требования

Для Части 1: PHP 8.2+ (лучше 8.3), Composer 2.x, базовое знание ООП в PHP, желательно — базовое знание SQL. Специальных знаний Symfony не требуется. Для Части 2: уверенное владение материалом Части 1 и, желательно, опыт эксплуатации хотя бы одного Symfony-приложения в production.

## Оглавление — Часть 1: Основы (0 → Production)

| № | Модуль | Что внутри |
|---|---|---|
| 00 | [Введение и подготовка окружения](00-vvedenie-i-podgotovka.md) | Философия Symfony, архитектура HttpKernel, установка окружения, создание проекта, описание BookNest |
| 01 | [Routing и контроллеры](01-routing-i-kontrollery.md) | Маршрутизация, параметры, Request/Response, флеш-сообщения |
| 02 | [Twig — шаблонизатор](02-twig-shablonizator.md) | Синтаксис, наследование шаблонов, фильтры/функции, Twig-компоненты |
| 03 | [Конфигурация и окружение](03-konfiguracia-i-okruzhenie.md) | dev/test/prod, .env-иерархия, parameters vs env vars, Secrets Vault |
| 04 | [Dependency Injection и Service Container](04-dependency-injection.md) | Autowiring, autoconfiguration, теги, фабрики, tagged iterators |
| 05 | [Doctrine ORM: основы](05-doctrine-orm-osnovy.md) | Entities, миграции, EntityManager, репозитории, QueryBuilder, связи |
| 06 | [Doctrine ORM: продвинутый уровень](06-doctrine-orm-prodvinutyj.md) | Lifecycle callbacks, транзакции, батчинг, индексы, каскады |
| 07 | [Формы](07-formy.md) | FormType, обработка, рендеринг, файлы, CSRF, события форм |
| 08 | [Валидация](08-validaciya.md) | Constraints, группы валидации, кастомные валидаторы |
| 09 | [Security: аутентификация](09-security-autentifikaciya.md) | User, firewalls, хеширование паролей, Authenticator, Remember Me |
| 10 | [Security: авторизация](10-security-avtorizaciya.md) | Роли, role_hierarchy, Voters, `#[IsGranted]` |
| 11 | [Serializer и REST API](11-serializer-i-rest-api.md) | Normalizer/Encoder, группы сериализации, DTO, конвенции REST |
| 12 | [API Platform](12-api-platform.md) | Автогенерация CRUD API, фильтры, security, кастомные операции, GraphQL |
| 13 | [Тестирование](13-testirovanie.md) | Unit/functional тесты, mock/stub, WebTestCase, изоляция данных |
| 14 | [EventDispatcher и Messenger](14-events-i-messenger.md) | Kernel events, доменные события, очереди, воркеры, Scheduler |
| 15 | [Кэширование и консольные команды](15-keshirovanie-i-konsolnye-komandy.md) | Cache pools, теги инвалидации, HTTP-кэш, Console Component |
| 16 | [Frontend и Symfony UX](16-frontend-symfony-ux.md) | AssetMapper, Stimulus, Turbo, Live Components |
| 17 | [Production и деплой](17-production-i-deploy.md) | OPcache, Docker, CI/CD, стратегии деплоя, мониторинг |
| 18 | [Архитектура и best practices](18-arhitektura-i-best-practices.md) | Сервисный слой, DDD-light, CQRS-light, PHPStan, Rector, антипаттерны |
| 19 | [Финальный проект и путь к PRO](19-finalnyj-proekt.md) | Полная спецификация BookNest, чек-лист Junior→Middle→Senior, что изучать дальше |

## Оглавление — Часть 2: Senior-трек

| № | Модуль | Что внутри |
|---|---|---|
| 20 | [Внутреннее устройство Symfony](20-vnutrennee-ustroistvo-symfony.md) | Компиляция DI-контейнера, CompilerPass, Bundle Extension, HttpKernel изнутри |
| 21 | [Workflow Component](21-workflow-component.md) | Конечные автоматы, places/transitions, guards, параллельные состояния |
| 22 | [Lock, RateLimiter, Semaphore](22-lock-ratelimiter-semaphore.md) | Распределённые блокировки, идемпотентность, ограничение частоты запросов |
| 23 | [Notifier и продвинутый Mailer](23-notifier-i-mailer.md) | HTML-письма на Twig, multi-channel уведомления (email/SMS/Telegram) |
| 24 | [Translation и интернационализация](24-translation-i18n.md) | i18n/l10n, ICU MessageFormat, плюрализация, форматирование по локали |
| 25 | [Real-time: Mercure, WebSockets, SSE](25-realtime-mercure.md) | Push-обновления в браузер, приватные каналы, Turbo Streams через Mercure |
| 26 | [Продвинутая аутентификация](26-prodvinutaya-autentifikaciya.md) | OAuth2 Social Login, OIDC/SSO, JWT с refresh-токенами, API Key, LDAP |
| 27 | [Event Sourcing и полноценный CQRS](27-event-sourcing-cqrs.md) | Event Store, агрегаты, проекции, снапшоты, честная оценка trade-off |
| 28 | [Создание и публикация бандлов](28-sozdanie-bandlov.md) | Configuration, Extension, CompilerPass в бандле, Flex Recipe, Packagist |
| 29 | [Производительность рантайма](29-performance-runtime.md) | OPcache JIT/preloading, Swoole/RoadRunner/FrankenPHP worker mode |
| 30 | [Наблюдаемость](30-observability.md) | Структурированные логи, Correlation ID, OpenTelemetry, метрики, Sentry |
| 31 | [Продвинутое тестирование](31-prodvinutoe-testirovanie.md) | Mutation testing (Infection), нагрузочное тестирование (k6), Panther e2e |
| 32 | [Многотенантность и масштабирование БД](32-multitenancy-i-masshtabirovanie.md) | Multi-tenancy паттерны, read replicas, connection pooling, sharding |
| 33 | [Миграция legacy и апгрейд версий](33-migraciya-legacy.md) | Strangler Fig, Rector, Characterization Tests, стратегии мажорного апгрейда |
| 34 | [Путь Senior](34-put-senior.md) | Код-ревью, ADR, менторство, техдолг на языке бизнеса, собеседования |

## Сквозной проект BookNest — что строим

Интернет-магазин книг с:
- публичным каталогом (поиск, фильтры, пагинация);
- личным кабинетом покупателя (корзина, оформление заказа, история, отмена);
- админ-панелью (управление каталогом, импорт из CSV, просмотр заказов);
- REST API для мобильного приложения (API Platform, JWT);
- асинхронной отправкой email при заказе;
- живым поиском и корзиной без перезагрузки страницы;
- полным набором тестов, CI/CD и production-ready Docker-сборкой.

Полная спецификация и порядок сборки Части 1 — в [модуле 19](19-finalnyj-proekt.md). В Части 2 BookNest дополнительно обрастает: формализованным workflow заказов, распределёнными блокировками склада, real-time админкой на Mercure, Event Sourcing для домена заказов, multi-tenant режимом "магазин как SaaS" и полной обсервабилити.

## Проверка знаний

В конце каждого модуля — чек-лист "Я умею" для самопроверки и раздел "Частые ошибки", собранный из типичных проблем на реальных проектах.

## Итог курса

Пройдя обе части, вы закрываете полный путь Junior → Middle → Senior Symfony-разработчика: от первого `symfony new` до архитектурных решений, распределённых систем и код-ревью уровня тимлида. Финальный чек-лист компетенций — в конце [модуля 19](19-finalnyj-proekt.md) (Junior/Middle/Senior) и [модуля 34](34-put-senior.md) (soft skills senior-уровня).
