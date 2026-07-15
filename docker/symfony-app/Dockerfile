# Стадия 1: собираем чистый Symfony skeleton через официальный composer-образ.
# Сеть нужна только на этапе сборки образа, не во время выполнения кода ученика.
# Пакеты добавляются сюда по мере того, как новым блокам курса требуются новые возможности
# Symfony (сейчас: базовый роутинг + Twig для блока про шаблоны).
FROM composer:2 AS build
RUN composer create-project symfony/skeleton /skeleton --no-interaction --prefer-dist \
    && composer --working-dir=/skeleton require symfony/twig-bundle --no-interaction \
    && composer clear-cache

# Стадия 2: минимальный рантайм. curl уже есть в этом образе "из коробки" —
# он нужен внутри контейнера, чтобы сама песочница могла достучаться до php -S по loopback.
FROM php:8.4-cli-alpine
RUN adduser -D -H -u 10001 runner
COPY --from=build --chown=runner:runner /skeleton /skeleton
# "Харнесс"-фикстуры для упражнений: постоянные контроллеры/шаблоны, которые не редактирует
# ученик — только то, что описано в targetPath конкретного упражнения (см. content/exercises/).
COPY --chown=runner:runner fixtures/src/Controller/ /skeleton/src/Controller/
COPY --chown=runner:runner fixtures/templates/ /skeleton/templates/
WORKDIR /skeleton
USER runner
ENV APP_ENV=dev
