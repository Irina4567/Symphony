# Модуль 28. Создание и публикация переиспользуемых бандлов

> Предыдущий модуль: [27 — Event Sourcing и полноценный CQRS](27-event-sourcing-cqrs.md)
>
> Умение упаковать код в переиспользуемый, настраиваемый бандл — то, что отличает разработчика, пишущего "для одного проекта", от того, кто мыслит инфраструктурой для многих команд/проектов сразу.

---

## 28.1. Когда стоит выделять бандл

Не любой переиспользуемый код должен становиться бандлом — если код используется в одном проекте, это просто хороший сервис/компонент в `src/`. Бандл оправдан, когда:

- Логика реально переиспользуется **между разными** проектами (например, у вашей компании 5 Symfony-приложений, и всем нужна одна и та же интеграция с внутренним биллингом).
- Нужна **настраиваемость через конфиг** (`config/packages/my_bundle.yaml`) внешними потребителями, не знающими внутреннего устройства.
- Планируется публикация в open-source (Packagist) для сообщества.

---

## 28.2. Структура минимального бандла

```
my-billing-bundle/
├── composer.json
├── src/
│   ├── MyBillingBundle.php
│   ├── DependencyInjection/
│   │   ├── Configuration.php
│   │   └── MyBillingExtension.php
│   ├── Service/
│   │   └── BillingClient.php
│   └── Controller/
├── config/
│   └── services.yaml
└── tests/
```

```json
{
    "name": "booknest/billing-bundle",
    "type": "symfony-bundle",
    "require": {
        "php": ">=8.2",
        "symfony/framework-bundle": "^6.4|^7.0"
    },
    "autoload": {
        "psr-4": { "BookNest\\BillingBundle\\": "src/" }
    }
}
```

---

## 28.3. Класс бандла

```php
<?php

namespace BookNest\BillingBundle;

use Symfony\Component\HttpKernel\Bundle\Bundle;

class MyBillingBundle extends Bundle
{
    // в современном Symfony (7.x) класс бандла часто остаётся почти пустым —
    // вся конфигурация переносится в Extension и Configuration
}
```

---

## 28.4. Configuration — схема конфига

Это то, что мы уже видели в модуле 20 (раздел 20.3), но теперь разберём подробнее — с валидацией, значениями по умолчанию, вложенными узлами:

```php
<?php

namespace BookNest\BillingBundle\DependencyInjection;

use Symfony\Component\Config\Definition\Builder\TreeBuilder;
use Symfony\Component\Config\Definition\ConfigurationInterface;

class Configuration implements ConfigurationInterface
{
    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('my_billing');

        $treeBuilder->getRootNode()
            ->children()
                ->scalarNode('api_key')
                    ->isRequired()
                    ->cannotBeEmpty()
                    ->info('API-ключ платёжного провайдера')
                ->end()
                ->enumNode('environment')
                    ->values(['sandbox', 'production'])
                    ->defaultValue('sandbox')
                ->end()
                ->arrayNode('supported_currencies')
                    ->scalarPrototype()->end()
                    ->defaultValue(['RUB', 'USD', 'EUR'])
                ->end()
                ->arrayNode('webhook')
                    ->children()
                        ->scalarNode('secret')->isRequired()->end()
                        ->integerNode('timeout')->defaultValue(30)->end()
                    ->end()
                ->end()
            ->end();

        return $treeBuilder;
    }
}
```

Пользователь бандла настраивает его точно так же, как любой встроенный бандл Symfony:

```yaml
# config/packages/my_billing.yaml (в проекте, ПОДКЛЮЧАЮЩЕМ бандл)
my_billing:
    api_key: '%env(BILLING_API_KEY)%'
    environment: production
    webhook:
        secret: '%env(BILLING_WEBHOOK_SECRET)%'
```

---

## 28.5. Extension — превращение конфига в сервисы

```php
<?php

namespace BookNest\BillingBundle\DependencyInjection;

use Symfony\Component\Config\FileLocator;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Extension\Extension;
use Symfony\Component\DependencyInjection\Loader\YamlFileLoader;

class MyBillingExtension extends Extension
{
    public function load(array $configs, ContainerBuilder $container): void
    {
        $configuration = new Configuration();
        $config = $this->processConfiguration($configuration, $configs);

        $loader = new YamlFileLoader($container, new FileLocator(__DIR__ . '/../../config'));
        $loader->load('services.yaml');

        $container->getDefinition(BillingClient::class)
            ->setArgument('$apiKey', $config['api_key'])
            ->setArgument('$environment', $config['environment']);

        $container->setParameter('my_billing.supported_currencies', $config['supported_currencies']);
    }

    public function getAlias(): string
    {
        return 'my_billing';
    }
}
```

`processConfiguration()` — здесь происходит валидация: если пользователь бандла забудет обязательный `api_key`, Symfony выбросит понятную ошибку **при компиляции контейнера**, а не где-то в рантайме при первом использовании сервиса.

---

## 28.6. Собственные CompilerPass в бандле

```php
class MyBillingBundle extends Bundle
{
    public function build(ContainerBuilder $container): void
    {
        parent::build($container);
        $container->addCompilerPass(new PaymentMethodRegistryPass());
    }
}
```

Это то же самое, что мы делали в `Kernel::build()` в модуле 20 — но теперь пасс "путешествует" вместе с бандлом в любой проект, который его подключит, а не привязан к конкретному приложению.

---

## 28.7. Symfony Flex Recipe — автоматизация установки

Когда пользователь бандла делает `composer require booknest/billing-bundle`, было бы удобно, чтобы Flex автоматически создал `config/packages/my_billing.yaml` с заготовкой и добавил переменные в `.env` — точно так же, как это происходит при установке официальных пакетов Symfony (модуль 0, раздел 0.5).

Это достигается через **рецепт (recipe)**, публикуемый в специальном репозитории `symfony/recipes-contrib` (для community-пакетов) или `symfony/recipes` (для официальных):

```json
// manifest.json — часть рецепта
{
    "bundles": {
        "BookNest\\BillingBundle\\MyBillingBundle": ["all"]
    },
    "copy-from-recipe": {
        "config/": "%CONFIG_DIR%/"
    },
    "env": {
        "BILLING_API_KEY": "change_me",
        "BILLING_WEBHOOK_SECRET": "change_me"
    }
}
```

```
recipe/
├── manifest.json
└── config/
    └── packages/
        └── my_billing.yaml   # шаблон, который скопируется в проект пользователя
```

Процесс публикации: форк `symfony/recipes-contrib` на GitHub → добавление своей папки с рецептом по версии пакета → Pull Request → после одобрения мейнтейнерами рецепт становится доступен всем, кто ставит ваш бандл через `composer require`.

---

## 28.8. Тестирование бандла в изоляции

Бандл тестируется без "хост"-приложения — через минимальный тестовый Kernel:

```php
<?php

namespace BookNest\BillingBundle\Tests;

use Symfony\Component\HttpKernel\Kernel;
use Symfony\Component\Config\Loader\LoaderInterface;

class TestKernel extends Kernel
{
    public function registerBundles(): iterable
    {
        yield new \Symfony\Bundle\FrameworkBundle\FrameworkBundle();
        yield new \BookNest\BillingBundle\MyBillingBundle();
    }

    public function registerContainerConfiguration(LoaderInterface $loader): void
    {
        $loader->load(__DIR__ . '/Fixtures/config/test_config.yaml');
    }
}
```

```php
class BillingClientTest extends KernelTestCase
{
    protected static function getKernelClass(): string
    {
        return TestKernel::class;
    }

    public function testServiceIsWired(): void
    {
        self::bootKernel();
        $client = static::getContainer()->get(BillingClient::class);
        self::assertInstanceOf(BillingClient::class, $client);
    }
}
```

---

## 28.9. Публикация в Packagist

```bash
# после git tag v1.0.0 и push
```

1. Зарегистрировать пакет на packagist.org, указав URL Git-репозитория.
2. Настроить GitHub Webhook для автоматического обновления Packagist при новых тегах.
3. Следовать семантическому версионированию (semver) — критично, чтобы потребители могли безопасно указывать `^1.0` в своих `composer.json`.
4. Написать полноценный `README.md` с примерами конфигурации — качество документации часто важнее качества кода для принятия пакета сообществом.

### CI для бандла — тестирование против нескольких версий Symfony

```yaml
# .github/workflows/ci.yml
strategy:
    matrix:
        symfony-version: ['6.4.*', '7.0.*', '7.1.*']
        php-version: ['8.2', '8.3']
```

Переиспользуемый бандл, в отличие от конечного приложения, должен поддерживать **диапазон** версий зависимостей, а не одну конкретную — матрица тестирования против нескольких комбинаций обязательна.

---

## 28.10. Практика: BillingBundle для BookNest

Выделим интеграцию с платёжным провайдером (гипотетическую) в отдельный бандл — сначала как часть монорепозитория (`packages/billing-bundle/`, подключаемый через `composer.json` path-repository для локальной разработки), затем — как отдельный публикуемый пакет.

```json
// composer.json главного приложения — локальная разработка бандла
{
    "repositories": [
        { "type": "path", "url": "packages/billing-bundle" }
    ],
    "require": {
        "booknest/billing-bundle": "@dev"
    }
}
```

---

## 28.11. Практика модуля 28

**Задание 1.** Выделите гипотетическую интеграцию с внешним платёжным провайдером в отдельный бандл со своим `Configuration`/`Extension`, следуя структуре раздела 28.2.

**Задание 2.** Напишите `Configuration` с обязательным `api_key`, enum `environment` и вложенным узлом `webhook` — по образцу раздела 28.4.

**Задание 3.** Настройте тестирование бандла в изоляции через `TestKernel`, убедитесь, что сервис `BillingClient` корректно резолвится с параметрами из тестового конфига.

**Задание 4.** Опишите (текстом, не обязательно публикуя реально) структуру Flex-рецепта для этого бандла — какие файлы должны копироваться в проект потребителя, какие переменные окружения нужно запросить.

---

## 28.12. Частые ошибки

1. **Выделяют бандл преждевременно** для кода, используемого только в одном проекте — YAGNI, лишний слой индирекции без пользы.
2. **Жёстко привязывают бандл к конкретной версии Symfony** вместо диапазона (`^6.4|^7.0`) — усложняет использование в разных проектах компании.
3. **Не валидируют конфиг через `Configuration`** — ошибки конфигурации обнаруживаются глубоко в рантайме вместо понятного сообщения при компиляции контейнера.
4. **Смешивают тестовую инфраструктуру приложения и бандла** — тестируют бандл через реальное приложение вместо изолированного `TestKernel`, из-за чего тесты бандла ломаются от несвязанных изменений в приложении.
5. **Не документируют конфигурацию** — потребитель бандла вынужден читать исходный код `Configuration.php`, чтобы понять доступные опции.

---

## Чек-лист "Я умею" — Модуль 28

- [ ] Понимать структуру переиспользуемого Symfony-бандла
- [ ] Писать `Configuration` со валидацией, значениями по умолчанию, вложенными узлами
- [ ] Писать `Extension`, превращающую конфиг в сервисы контейнера
- [ ] Регистрировать собственные CompilerPass внутри бандла
- [ ] Понимать механизм Symfony Flex Recipe для автоматизации установки
- [ ] Тестировать бандл в изоляции через минимальный `TestKernel`
- [ ] Публиковать пакет на Packagist с корректным semver и CI-матрицей версий

**Дальше:** [Модуль 29 — Производительность рантайма и альтернативные раннеры](29-performance-runtime.md)
