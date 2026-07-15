# Стадия 1: собираем чистый Symfony skeleton через официальный composer-образ.
# Сеть нужна только на этапе сборки образа, не во время выполнения кода ученика.
# Пакеты добавляются сюда по мере того, как новым блокам курса требуются новые возможности
# Symfony (сейчас: базовый роутинг + Twig для блока про шаблоны + Doctrine ORM/SQLite + Form/
# Validator для блока про формы). symfony/security-csrf сознательно не ставим — без него формы
# рендерятся без CSRF-поля, что сильно упрощает автоматические HTTP-проверки в песочнице; сама
# концепция CSRF разбирается в теории урока текстом.
FROM composer:2 AS build
RUN composer create-project symfony/skeleton /skeleton --no-interaction --prefer-dist \
    && composer --working-dir=/skeleton require symfony/twig-bundle --no-interaction \
    && composer --working-dir=/skeleton require doctrine/orm doctrine/doctrine-bundle --no-interaction \
    && composer --working-dir=/skeleton require symfony/form symfony/validator --no-interaction \
    && composer clear-cache

# Стадия 2: минимальный рантайм. curl уже есть в этом образе "из коробки" —
# он нужен внутри контейнера, чтобы сама песочница могла достучаться до php -S по loopback.
# pdo_sqlite тоже уже встроен в этот образ.
FROM php:8.4-cli-alpine
RUN adduser -D -H -u 10001 runner
COPY --from=build --chown=runner:runner /skeleton /skeleton
# "Харнесс"-фикстуры для упражнений: постоянные контроллеры/сущности/шаблоны, которые не
# редактирует ученик — только то, что описано в targetPath конкретного упражнения
# (см. content/exercises/). .env.local переключает БД на SQLite (по умолчанию recipe настроен
# на postgresql, который в песочнице недоступен — сети снаружи нет).
COPY --chown=runner:runner fixtures/src/Controller/ /skeleton/src/Controller/
COPY --chown=runner:runner fixtures/src/Entity/ /skeleton/src/Entity/
COPY --chown=runner:runner fixtures/src/Repository/ /skeleton/src/Repository/
COPY --chown=runner:runner fixtures/src/Command/ /skeleton/src/Command/
COPY --chown=runner:runner fixtures/src/Form/ /skeleton/src/Form/
COPY --chown=runner:runner fixtures/templates/ /skeleton/templates/
COPY --chown=runner:runner fixtures/env.local /skeleton/.env.local
WORKDIR /skeleton
USER runner
ENV APP_ENV=dev
