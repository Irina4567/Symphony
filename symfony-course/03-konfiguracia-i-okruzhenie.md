# Модуль 03. Конфигурация и окружение

> Предыдущий модуль: [02 — Twig](02-twig-shablonizator.md)

---

## 3.1. Три окружения "из коробки"

Symfony по умолчанию работает в трёх окружениях (environments):

- **`dev`** — для локальной разработки: подробные ошибки, профайлер, дебаг-тулбар, автоперекомпиляция кэша при каждом изменении.
- **`test`** — для автотестов: похож на prod по строгости, но с особенностями (например, отключённая доставка email).
- **`prod`** — для продакшена: максимальная производительность, скомпилированный и закэшированный контейнер/роуты, никаких debug-данных наружу.

Окружение определяется переменной `APP_ENV` в `.env`/`.env.local`:

```dotenv
# .env.local (не коммитится)
APP_ENV=dev
APP_DEBUG=1
```

**Важно:** `APP_DEBUG` и `APP_ENV` — разные флаги. Обычно `dev` → `debug=1`, `prod` → `debug=0`, но технически их можно комбинировать (например, для отладки прод-подобного окружения).

---

## 3.2. Иерархия `.env`-файлов

Symfony подключает `.env`-файлы в строго определённом порядке (каждый следующий переопределяет предыдущий):

```
.env                    → дефолты, коммитится в git
.env.local              → локальные переопределения, НЕ коммитится (кроме test-окружения)
.env.$APP_ENV           → например .env.dev, .env.prod — коммитится
.env.$APP_ENV.local     → например .env.dev.local — НЕ коммитится
```

В production рекомендуется **не использовать `.env`-файлы вообще**, а задавать переменные через реальные переменные окружения сервера (systemd unit, Docker `environment:`, Kubernetes ConfigMap/Secret) — так безопаснее и быстрее (не нужно парсить файл на каждый запрос, для чего в prod ещё и предусмотрен `.env.local.php` — скомпилированный dump переменных, создаётся командой `composer dump-env prod`).

```bash
composer dump-env prod   # создаёт .env.local.php — закэшированный набор переменных для prod
```

---

## 3.3. Параметры (parameters) vs переменные окружения (env vars)

Это одна из вещей, которая путает новичков больше всего. Разберём разницу.

**Переменная окружения** — значение, которое приходит из ОС/Docker/`.env`-файла (пароли БД, ключи API, флаги окружения). Читается через специальный синтаксис `%env(...)%`.

**Параметр контейнера (parameter)** — именованное значение внутри DI-контейнера Symfony, доступное любому сервису. Параметры задаются в `config/services.yaml` и могут как содержать статичные значения, так и ссылаться на env-переменные.

```yaml
# config/services.yaml
parameters:
    app.default_locale: 'ru'
    app.currency: 'RUB'
    app.tax_rate: 0.20
    app.support_email: '%env(SUPPORT_EMAIL)%'   # значение из переменной окружения
```

Использование параметра в конфиге другого бандла:
```yaml
# config/packages/framework.yaml
framework:
    default_locale: '%app.default_locale%'
```

Использование параметра в сервисе — через внедрение зависимостей (подробно в модуле 04):
```php
class PriceCalculator
{
    public function __construct(
        #[Autowire('%app.tax_rate%')]
        private float $taxRate,
    ) {}
}
```

### Приведение типов env-переменных

По умолчанию всё, что приходит из окружения, — **строка**. Для приведения типа используются процессоры:

```yaml
'%env(int:MAX_UPLOAD_SIZE)%'
'%env(bool:FEATURE_FLAG_NEW_CHECKOUT)%'
'%env(float:APP_TAX_RATE)%'
'%env(json:CORS_ALLOWED_ORIGINS)%'    # распарсит JSON-массив/объект
'%env(resolve:SOME_PARAM_WITH_%OTHER_PARAM%)%'
```

---

## 3.4. Конфигурация по окружениям: `when@`

С Symfony 5.3+ конфиг каждого бандла можно "разбить" на общий + переопределения под конкретное окружение прямо внутри одного файла:

```yaml
# config/packages/monolog.yaml
when@dev:
    monolog:
        handlers:
            main:
                type: stream
                path: "%kernel.logs_dir%/%kernel.environment%.log"
                level: debug

when@prod:
    monolog:
        handlers:
            main:
                type: fingers_crossed
                action_level: error
                handler: nested
            nested:
                type: stream
                path: php://stderr
                level: debug
                formatter: monolog.formatter.json
```

Раньше для этого использовались отдельные папки `config/packages/dev/`, `config/packages/prod/` — это тоже до сих пор поддерживается и одинаково валидно, но `when@` компактнее.

---

## 3.5. Kernel — сердце приложения

`src/Kernel.php` — финальный класс, который склеивает всё вместе. В современном Symfony он почти пустой, потому что вся "магия" вынесена в трейты (`MicroKernelTrait`) и конфиги:

```php
<?php

namespace App;

use Symfony\Bundle\FrameworkBundle\Kernel\MicroKernelTrait;
use Symfony\Component\HttpKernel\Kernel as BaseKernel;

class Kernel extends BaseKernel
{
    use MicroKernelTrait;
}
```

`config/bundles.php` перечисляет, какие бандлы активны и в каких окружениях:

```php
return [
    Symfony\Bundle\FrameworkBundle\FrameworkBundle::class => ['all' => true],
    Symfony\Bundle\TwigBundle\TwigBundle::class => ['all' => true],
    Doctrine\Bundle\DoctrineBundle\DoctrineBundle::class => ['all' => true],
    Symfony\Bundle\WebProfilerBundle\WebProfilerBundle::class => ['dev' => true, 'test' => true],
];
```

Этот файл Flex обновляет автоматически при `composer require`/`composer remove` — руками его практически никогда не редактируют.

---

## 3.6. Секреты (Symfony Secrets Vault)

Хранить пароли и ключи в открытом `.env` даже локально — плохая практика, а в production — недопустимая. Symfony имеет встроенное **хранилище секретов**, зашифрованное asymmetric-ключом:

```bash
php bin/console secrets:generate-keys                 # генерирует пару ключей (публичный коммитится, приватный — нет)
php bin/console secrets:set DATABASE_PASSWORD          # интерактивно вводим значение, попадает в зашифрованный vault
php bin/console secrets:set MAILER_DSN --file=./dsn.txt
php bin/console secrets:list --reveal                  # посмотреть все секреты (только там, где есть приватный ключ)
```

Зашифрованные секреты (`config/secrets/prod/*.encrypted.php`) можно смело коммитить в Git — расшифровать их без приватного ключа (который хранится отдельно, например, в переменной окружения `SYMFONY_DECRYPTION_SECRET` на сервере) невозможно.

---

## 3.7. Настройка BookNest: PostgreSQL, параметры магазина

Свяжем Docker Compose из модуля 0 с проектом.

**`.env`** (коммитится, значения-примеры для команды):
```dotenv
DATABASE_URL="postgresql://app:!ChangeMe!@127.0.0.1:5432/app?serverVersion=16&charset=utf8"
```

**`.env.local`** (не коммитится, у каждого разработчика свои реальные данные — если совпадают с примером выше, файл можно не создавать):
```dotenv
APP_ENV=dev
APP_SECRET=замените_на_случайную_строку
```

**`config/services.yaml`** — параметры бизнес-логики магазина:
```yaml
parameters:
    app.currency: 'RUB'
    app.tax_rate: 0.20
    app.free_shipping_threshold_kopecks: 300000   # 3000 руб. — бесплатная доставка от этой суммы
    app.support_email: '%env(SUPPORT_EMAIL)%'
```

**`.env`** дополнение:
```dotenv
SUPPORT_EMAIL=support@booknest.example
```

Проверить итоговый конфиг любого бандла:
```bash
php bin/console debug:config framework
php bin/console debug:config doctrine
php bin/console config:dump-reference doctrine   # показывает ВСЕ доступные опции с дефолтами и комментариями
```

`config:dump-reference` — незаменимая команда, когда не помните точное имя опции в YAML-конфиге бандла.

---

## 3.8. Практика модуля 3

**Задание 1.** Добавьте параметр `app.default_page_size` (например, `12`) и используйте его в `CatalogController` как размер страницы пагинации через `#[Autowire('%app.default_page_size%')]`.

**Задание 2.** Настройте `when@prod` для `config/packages/framework.yaml`, чтобы в prod включался HTTP-кэш (`http_cache: true`) — пока просто добавьте секцию, углубимся в модуле 15.

**Задание 3.** Сгенерируйте пару ключей для секретов и сохраните туда тестовый `MAILER_DSN`.

**Задание 4.** Выполните `php bin/console debug:config doctrine` и найдите, какой драйвер БД используется по умолчанию.

### Решения

<details>
<summary>Решение задания 1</summary>

```yaml
# config/services.yaml
parameters:
    app.default_page_size: 12
```
```php
use Symfony\Component\DependencyInjection\Attribute\Autowire;

#[Route('', name: 'index', methods: ['GET'])]
public function index(
    #[Autowire('%app.default_page_size%')] int $pageSize,
): Response {
    // используем $pageSize при пагинации
}
```
</details>

---

## 3.9. Частые ошибки новичков

1. **Коммитят реальные пароли в `.env`.** Настоящие значения — только в `.env.local` (не коммитится) или в Secrets Vault для production.
2. **Путают parameters и env vars.** Параметр — это именованное значение *внутри контейнера*, `%env(...)%` — это способ *получить* значение переменной окружения и превратить в параметр/значение сервиса.
3. **Забывают, что `%env(...)%` по умолчанию всегда строка** — без `int:`/`bool:`/`float:` типизированное поле бандла может ругаться на несовпадение типа.
4. **Не чистят кэш после смены `.env`** — Symfony кэширует скомпилированный контейнер, значения параметров "запекаются" туда при первой компиляции в prod-подобном режиме.
5. **Хранят секреты только в `.env.local` для prod.** Для production такая практика ненадёжна и неудобна при масштабировании (несколько серверов) — используйте Secrets Vault или secret manager инфраструктуры (Vault, AWS Secrets Manager, Kubernetes Secrets).

---

## Чек-лист "Я умею" — Модуль 3

- [ ] Объяснить разницу между `dev`, `test`, `prod` окружениями
- [ ] Понимать иерархию `.env` → `.env.local` → `.env.$APP_ENV` → `.env.$APP_ENV.local`
- [ ] Отличать parameters контейнера от переменных окружения и типизировать `%env(...)%`
- [ ] Использовать `when@dev`/`when@prod` для конфигурации, специфичной под окружение
- [ ] Пользоваться `debug:config` и `config:dump-reference` для диагностики конфигурации бандлов
- [ ] Работать с Symfony Secrets Vault для хранения чувствительных данных

**Дальше:** [Модуль 04 — Dependency Injection и Service Container](04-dependency-injection.md)
