# Модуль 17. Production и деплой

> Предыдущий модуль: [16 — Frontend и Symfony UX](16-frontend-symfony-ux.md)

---

## 17.1. Чеклист готовности к production

Прежде чем деплоить, пройдитесь по базовым пунктам:

- `APP_ENV=prod`, `APP_DEBUG=0`.
- Реальный `APP_SECRET` (случайная строка, не дефолтная из `.env`).
- Секреты — через Secrets Vault или переменные окружения инфраструктуры, не в `.env`-файлах на сервере (модуль 03).
- Кэш и роуты скомпилированы заранее (см. ниже), а не "на лету" при первом запросе.
- Логирование настроено на запись в stdout/stderr (для контейнеризированных окружений) или в файл с ротацией.
- HTTPS обязателен, `framework.trusted_proxies` настроен, если приложение за балансировщиком/CDN.
- Миграции БД применены **до** переключения трафика на новую версию кода.

---

## 17.2. Компиляция и прогрев кэша

В production Symfony **не должен** компилировать DI-контейнер и роуты при каждом запросе — это делается один раз при деплое:

```bash
composer install --no-dev --optimize-autoloader --classmap-authoritative
php bin/console cache:clear --env=prod --no-debug
php bin/console cache:warmup --env=prod --no-debug
```

- `--no-dev` — не устанавливать dev-зависимости (PHPUnit и т.д.) в production.
- `--optimize-autoloader --classmap-authoritative` — Composer генерирует оптимизированную class-map вместо PSR-4 поиска файлов на диске, заметно ускоряет автозагрузку классов.
- `cache:warmup` — заранее компилирует контейнер, роуты, Twig-шаблоны, чтобы **первый** реальный пользовательский запрос после деплоя не тормозил на компиляции.

**Частая ошибка деплоя:** забыть `cache:clear`/`cache:warmup` после обновления кода — старый скомпилированный контейнер может не соответствовать новым сервисам/конфигурации, что приводит к трудноуловимым ошибкам, работающим "непонятно как" до перезапуска.

---

## 17.3. OPcache — обязательная настройка PHP для production

```ini
; php.ini
opcache.enable=1
opcache.validate_timestamps=0   ; КРИТИЧНО для prod: не проверять изменение файлов на каждый запрос
opcache.max_accelerated_files=20000
opcache.memory_consumption=256
opcache.interned_strings_buffer=16
opcache.preload=/var/www/booknest/config/preload.php  ; опционально, для ещё большей скорости
```

`opcache.validate_timestamps=0` означает, что PHP **не будет проверять**, изменился ли файл на диске — он просто использует ранее скомпилированный байт-код. Это огромный прирост производительности, но означает, что **после каждого деплоя нужно принудительно сбросить OPcache** (`opcache_reset()` через специальный эндпоинт, перезапуск PHP-FPM, или деплой-стратегия blue/green с полностью новыми процессами).

---

## 17.4. Docker: production-образ

Отдельный `Dockerfile` для prod (в отличие от dev-окружения с монтированием исходников и Xdebug):

```dockerfile
FROM php:8.3-fpm-alpine AS base

RUN apk add --no-cache icu-dev postgresql-dev \
    && docker-php-ext-install intl pdo_pgsql opcache

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/html

FROM base AS build
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-scripts --no-autoloader --prefer-dist

COPY . .
RUN composer dump-autoload --optimize --classmap-authoritative \
    && php bin/console cache:warmup --env=prod

FROM base AS production
COPY --from=build /var/www/html /var/www/html
COPY docker/php/opcache.ini /usr/local/etc/php/conf.d/opcache.ini

RUN chown -R www-data:www-data var/

USER www-data
EXPOSE 9000
CMD ["php-fpm"]
```

Ключевые принципы multi-stage сборки:
- Не тащить в финальный образ dev-зависимости, исходный `composer.json`/кэш сборки.
- Кэш прогревается **на этапе сборки образа**, а не при первом запуске контейнера — контейнер сразу готов к трафику.
- Финальный процесс работает **не от root**, а от `www-data` — базовая практика безопасности контейнеров.

Nginx перед php-fpm:
```nginx
server {
    listen 80;
    root /var/www/html/public;

    location / {
        try_files $uri /index.php$is_args$args;
    }

    location ~ ^/index\.php(/|$) {
        fastcgi_pass app:9000;
        fastcgi_split_path_info ^(.+\.php)(/.*)$;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_param HTTPS off;
        internal;
    }

    location ~ \.php$ {
        return 404;
    }
}
```

---

## 17.5. CI/CD — основы пайплайна

Типичный пайплайн (пример для GitHub Actions, аналогично для GitLab CI):

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]

jobs:
    tests:
        runs-on: ubuntu-latest
        services:
            postgres:
                image: postgres:16-alpine
                env:
                    POSTGRES_PASSWORD: test
                    POSTGRES_DB: app_test
                ports: ['5432:5432']
        steps:
            - uses: actions/checkout@v4
            - uses: shivammathur/setup-php@v2
              with:
                  php-version: '8.3'
                  extensions: intl, pdo_pgsql
                  coverage: none

            - run: composer install --prefer-dist --no-progress
            - run: composer validate --strict
            - run: vendor/bin/phpstan analyse
            - run: php bin/console doctrine:migrations:migrate --env=test -n
            - run: php bin/phpunit
```

Обязательные этапы серьёзного pipeline: установка зависимостей → статический анализ (PHPStan, модуль 18) → миграции на тестовую БД → тесты → (опционально) сборка Docker-образа → деплой при успехе всех предыдущих шагов.

---

## 17.6. Стратегии деплоя

- **Rolling deployment** — постепенная замена старых инстансов новыми, без простоя, но недолгое время работают одновременно старая и новая версия (важно для обратной совместимости миграций БД — не удаляйте колонку в той же миграции, где перестаёте её использовать в коде; сначала перестаньте использовать, задеплойте, потом уже отдельным релизом удалите колонку).
- **Blue/Green deployment** — два полных идентичных окружения, трафик переключается разом после проверки готовности нового.
- **Canary deployment** — новая версия получает небольшой процент трафика, постепенно увеличивается при отсутствии ошибок.

Инструменты платформенного уровня — Platform.sh (сделан создателями Symfony, "родная" интеграция), Deployer (PHP-based deploy tool с готовым recipe под Symfony), Kubernetes + Helm chart, простые скрипты через Ansible/Capistrano-style деплой для VPS.

### Пример деплой-скрипта (упрощённо, символические ссылки для zero-downtime)

```bash
#!/bin/bash
set -e

RELEASE_DIR="/var/www/booknest/releases/$(date +%Y%m%d%H%M%S)"
mkdir -p "$RELEASE_DIR"

git archive HEAD | tar -x -C "$RELEASE_DIR"
cd "$RELEASE_DIR"

composer install --no-dev --optimize-autoloader --no-interaction
php bin/console cache:clear --env=prod
php bin/console doctrine:migrations:migrate --env=prod -n

ln -sfn "$RELEASE_DIR" /var/www/booknest/current
sudo systemctl reload php8.3-fpm

# опционально: удалить старые релизы, оставив последние 5
```

---

## 17.7. Symfony Profiler и Web Debug Toolbar

Уже упоминались в модуле 0 — важно понимать, что они **автоматически отключены** в prod (доступны только когда `kernel.debug: true`, то есть в `dev`/`test`), поэтому не нужно вручную "выключать" их перед деплоем — но стоит перепроверить, что случайно не включён debug-режим в проде (`APP_DEBUG=1` в production — серьёзная утечка информации: стектрейсы, пути на сервере, значения переменных окружения могут "утечь" через страницу ошибки).

---

## 17.8. Мониторинг и логирование

### Monolog — конфигурация для production

```yaml
# config/packages/monolog.yaml
when@prod:
    monolog:
        handlers:
            main:
                type: fingers_crossed  # копит записи в буфере, "сбрасывает" их только при ERROR и выше
                action_level: error
                handler: nested
                excluded_http_codes: [404, 405]
            nested:
                type: stream
                path: 'php://stderr'    # для Docker/Kubernetes — логи должны идти в stdout/stderr
                level: debug
                formatter: monolog.formatter.json
            deprecation:
                type: null              # не засоряем прод-логи deprecation-предупреждениями
```

`fingers_crossed` handler — важная оптимизация: обычно вы не хотите, чтобы каждый `debug`/`info` лог реально записывался (это дорого при высокой нагрузке), но при возникновении `error` хотите увидеть **весь** контекст запроса, включая предшествующие debug-сообщения — этот handler именно так и работает: буферизует всё, сбрасывает буфер целиком только при триггере уровня ошибки.

### Внешние системы мониторинга

- **APM** (Application Performance Monitoring): Blackfire (сделан для PHP/Symfony специально, глубокая интеграция), New Relic, Datadog.
- **Ошибки**: Sentry (`sentry/sentry-symfony`) — реалтайм алерты с полным stacktrace и контекстом запроса.
- **Логи**: ELK-стек (Elasticsearch/Logstash/Kibana), Loki+Grafana.
- **Метрики/Health-check**: простой `#[Route('/health')]`, проверяющий доступность БД/Redis, для liveness/readiness проб Kubernetes.

```php
#[Route('/health', name: 'health_check', methods: ['GET'])]
public function health(Connection $connection): Response
{
    try {
        $connection->executeQuery('SELECT 1');
        return $this->json(['status' => 'ok']);
    } catch (\Throwable $e) {
        return $this->json(['status' => 'error'], Response::HTTP_SERVICE_UNAVAILABLE);
    }
}
```

---

## 17.9. Производительность: типичные узкие места

1. **N+1 запросы** (модуль 5) — самая частая причина деградации на реальных данных.
2. **Отсутствие индексов** (модуль 6) на часто фильтруемых/сортируемых колонках.
3. **Синхронные "тяжёлые" операции** (email, внешние API) в HTTP-запросе вместо асинхронной очереди (модуль 14).
4. **Отсутствие кэширования** повторяющихся дорогих вычислений/запросов (модуль 15).
5. **`opcache.validate_timestamps=1`** в production (лишние проверки файловой системы на каждый запрос).
6. **Неоптимизированный автозагрузчик Composer** (без `--optimize-autoloader --classmap-authoritative`).

### Инструмент диагностики: Blackfire / Symfony Profiler timeline

Профайлер в dev-окружении показывает подробную временную шкалу обработки запроса (сколько времени заняли SQL-запросы, рендеринг Twig, сериализация и т.д.) — начинайте оптимизацию именно с этого, не гадайте, что "наверное" медленно.

---

## 17.10. Практика: подготовка BookNest к production

1. Написать `Dockerfile` (production stage, multi-stage сборка).
2. Настроить `compose.prod.yaml` с сервисами `app` (php-fpm), `nginx`, `postgres`, `redis`, `messenger-worker` (отдельный контейнер с `messenger:consume`).
3. Настроить CI-пайплайн: тесты + PHPStan + сборка образа при push в `main`.
4. Настроить `/health`-эндпоинт и подключить его к health-check системе оркестрации.
5. Настроить Sentry для отслеживания production-ошибок.

---

## 17.11. Практика модуля 17

**Задание 1.** Напишите multi-stage `Dockerfile` для BookNest по примеру из раздела 17.4, адаптировав под PostgreSQL-расширения проекта.

**Задание 2.** Настройте `monolog.yaml` с `fingers_crossed` для prod и убедитесь, что `debug`-уровень логов не пишется, пока не произойдёт реальная ошибка.

**Задание 3.** Реализуйте `/health`-эндпоинт, проверяющий доступность и БД, и Redis.

**Задание 4.** Настройте GitHub Actions/GitLab CI пайплайн с прогоном тестов на реальной PostgreSQL-БД в контейнере сервиса CI.

### Решения

<details>
<summary>Обсуждение задания 3</summary>

```php
#[Route('/health', methods: ['GET'])]
public function health(Connection $dbConnection, CacheItemPoolInterface $redisCache): Response
{
    $checks = ['database' => false, 'cache' => false];

    try {
        $dbConnection->executeQuery('SELECT 1');
        $checks['database'] = true;
    } catch (\Throwable) {}

    try {
        $redisCache->getItem('healthcheck')->isHit(); // сам факт успешного обращения без исключения
        $checks['cache'] = true;
    } catch (\Throwable) {}

    $allOk = !in_array(false, $checks, true);
    return $this->json(['status' => $allOk ? 'ok' : 'degraded', 'checks' => $checks],
        $allOk ? Response::HTTP_OK : Response::HTTP_SERVICE_UNAVAILABLE);
}
```
</details>

---

## 17.12. Частые ошибки новичков

1. **Забывают `cache:clear`/`cache:warmup` после деплоя** — приложение работает на устаревшем скомпилированном контейнере.
2. **Оставляют `APP_DEBUG=1` в production** — серьёзная утечка чувствительной информации.
3. **Не сбрасывают OPcache после деплоя** при `opcache.validate_timestamps=0` — сервер продолжает выполнять старый код.
4. **Применяют миграции ПОСЛЕ переключения трафика** на новую версию кода — окно, где новый код работает со старой схемой БД.
5. **Логируют прямо в файл внутри контейнера** вместо stdout/stderr — логи теряются при пересоздании контейнера, не видны в системах агрегации логов (ELK, Loki).
6. **Не настраивают health-check** — оркестратор (Kubernetes) не может понять, что инстанс "упал", и продолжает слать на него трафик.

---

## Чек-лист "Я умею" — Модуль 17

- [ ] Пройтись по чеклисту готовности к production (env, secrets, кэш, HTTPS)
- [ ] Прогревать кэш и оптимизировать автозагрузчик перед деплоем
- [ ] Настраивать OPcache для production и понимать trade-off `validate_timestamps`
- [ ] Собирать production-ready multi-stage Docker-образ
- [ ] Настраивать CI-пайплайн с тестами и статическим анализом
- [ ] Понимать стратегии деплоя (rolling/blue-green/canary) и их различия
- [ ] Настраивать логирование (Monolog `fingers_crossed`) и health-check
- [ ] Знать типичные узкие места производительности Symfony-приложения

**Дальше:** [Модуль 18 — Архитектура и best practices](18-arhitektura-i-best-practices.md)
