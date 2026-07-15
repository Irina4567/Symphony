# Модуль 20. Внутреннее устройство Symfony

> Предыдущий модуль: [19 — Финальный проект](19-finalnyj-proekt.md)
>
> Начало **Части 2 курса — Senior-трек**. Здесь мы перестаём быть "пользователем фреймворка" и начинаем понимать, что происходит внутри — то, что реально отличает senior-разработчика: способность читать исходники Symfony, диагностировать нетривиальные проблемы и писать код, который правильно встраивается в жизненный цикл фреймворка, а не борется с ним.

---

## 20.1. Что происходит от первой строчки до Response — по-настоящему подробно

В модуле 0 мы описали цикл Request → Response на высоком уровне. Теперь разберём его буквально по файлам.

```php
// public/index.php
use App\Kernel;

require_once dirname(__DIR__).'/vendor/autoload_runtime.php';

return function (array $context) {
    return new Kernel($context['APP_ENV'], (bool) $context['APP_DEBUG']);
};
```

`autoload_runtime.php` — часть **Symfony Runtime Component**. Это абстракция, которая отвязывает ваше приложение от конкретного SAPI (веб-сервер с PHP-FPM, встроенный сервер, но и **не только** — тот же код может исполняться под RoadRunner, FrankenPHP worker mode или в AWS Lambda). `RuntimeInterface` берёт на себя создание `Request` из глобальных переменных (или из другого источника, если раннер иной) и вызов `$kernel->handle($request)->send()`.

```php
// упрощённо то, что делает GenericRuntime внутри:
$request = Request::createFromGlobals();
$response = $kernel->handle($request);
$response->send();
$kernel->terminate($request, $response);
```

### HttpKernel::handle() изнутри

```php
// Symfony\Component\HttpKernel\HttpKernel (упрощённо)
public function handle(Request $request, int $type = self::MAIN_REQUEST, bool $catch = true): Response
{
    try {
        return $this->handleRaw($request, $type);
    } catch (\Throwable $e) {
        if ($catch) {
            return $this->handleThrowable($e, $request, $type);
        }
        throw $e;
    }
}

private function handleRaw(Request $request, int $type): Response
{
    $event = new RequestEvent($this, $request, $type);
    $this->dispatcher->dispatch($event, KernelEvents::REQUEST);

    if ($event->hasResponse()) {
        return $this->filterResponse($event->getResponse(), $request, $type);
    }

    [$controller, $arguments] = $this->resolveController($request);
    // kernel.controller, kernel.controller_arguments диспатчатся здесь

    $response = $controller(...$arguments);

    if (!$response instanceof Response) {
        $event = new ViewEvent($this, $request, $type, $response);
        $this->dispatcher->dispatch($event, KernelEvents::VIEW);
        $response = $event->getResponse(); // если ни один listener не превратил результат в Response — исключение
    }

    return $this->filterResponse($response, $request, $type);
}
```

Ключевой вывод: **весь фреймворк построен вокруг событий**. Роутинг, Security, сессии — всё это просто подписчики на `kernel.request` с разными приоритетами. Понимание этого объясняет, почему, например, security-проверка происходит именно там, где происходит, и почему можно "перехватить" запрос раньше security-фаервола, подписавшись с более высоким приоритетом.

### Приоритеты встроенных подписчиков на `kernel.request` (важно для отладки порядка выполнения)

```
256   → SessionListener (запускает сессию, если понадобится)
64    → RouterListener (определяет маршрут, кладёт в request attributes)
8     → LocaleListener
8     → FirewallListener (Security)
0     → ваши собственные подписчики по умолчанию
```

Если ваш подписчик должен сработать **до** аутентификации (например, maintenance-mode, блокирующий вообще весь трафик кроме health-check), ему нужен приоритет **выше** 8. Если должен видеть уже аутентифицированного пользователя — **ниже**.

```php
#[AsEventListener(event: KernelEvents::REQUEST, priority: 100)]
class MaintenanceModeListener
{
    public function __invoke(RequestEvent $event): void
    {
        if ($this->isMaintenanceModeOn() && !$this->isAllowedPath($event->getRequest())) {
            $event->setResponse(new Response('Сервис на техобслуживании', 503));
        }
    }
}
```

---

## 20.2. Компиляция DI-контейнера — что происходит на самом деле

Контейнер, которым вы пользуетесь в runtime, — это **не** тот же объект, который "собирает" сервисы по конфигу на каждый запрос. Это был бы катастрофически медленный подход. Вместо этого при первом запросе (или явно через `cache:warmup`) Symfony:

1. Читает все `config/services.yaml`, атрибуты классов, `Bundle::build()`, регистрирует "определения" (`Definition`) в объекте `ContainerBuilder`.
2. Прогоняет все зарегистрированные **CompilerPass** — по очереди трансформирует эти определения (резолвит autowiring, разворачивает теги, инлайнит приватные сервисы, где возможно, и т.д.).
3. **Дампит** результат в виде обычного PHP-класса (`var/cache/dev/App_KernelDevDebugContainer.php`) — по сути, гигантский класс с методами `getBookRepositoryService()`, `getPriceCalculatorService()` и т.д., каждый из которых буквально делает `new` с уже разрешёнными зависимостями.

```bash
# посмотреть реально сгенерированный код контейнера
cat var/cache/dev/App_KernelDevDebugContainer.php | grep -A 20 "function getPriceCalculatorService"
```

Именно поэтому production-контейнер работает так быстро — в runtime **нет** никакой рефлексии, поиска по тегам, парсинга YAML — всё это уже "запечено" в обычный PHP-код при компиляции.

### Порядок этапов CompilerPass

```php
enum PassConfig
{
    // PassConfig::TYPE_BEFORE_OPTIMIZATION — до автовайринга, здесь регистрируют кастомные теги
    // PassConfig::TYPE_OPTIMIZATION       — резолвинг ссылок, inlining
    // PassConfig::TYPE_BEFORE_REMOVING     — последний шанс что-то добавить/изменить
    // PassConfig::TYPE_REMOVING            — удаление неиспользуемых приватных сервисов
    // PassConfig::TYPE_AFTER_REMOVING      — финальные штрихи
}
```

### Написание собственного CompilerPass

Классический кейс — собрать вручную все сервисы с определённым тегом и передать их коллекцией в другой сервис (более гибкая альтернатива `#[AutowireIterator]` из модуля 4, нужна, когда логика сборки сложнее простого списка — например, нужно построить ассоциативный массив "код способа доставки → сервис"):

```php
<?php

namespace App\DependencyInjection\Compiler;

use Symfony\Component\DependencyInjection\Compiler\CompilerPassInterface;
use Symfony\Component\DependencyInjection\ContainerBuilder;
use Symfony\Component\DependencyInjection\Reference;

class DeliveryMethodRegistryPass implements CompilerPassInterface
{
    public function process(ContainerBuilder $container): void
    {
        if (!$container->has(DeliveryMethodRegistry::class)) {
            return;
        }

        $registryDefinition = $container->findDefinition(DeliveryMethodRegistry::class);

        foreach ($container->findTaggedServiceIds('app.delivery_method') as $id => $tags) {
            foreach ($tags as $attributes) {
                $registryDefinition->addMethodCall('register', [
                    $attributes['code'] ?? throw new \LogicException("Тег app.delivery_method требует атрибут 'code' у сервиса $id"),
                    new Reference($id),
                ]);
            }
        }
    }
}
```

Регистрация пасса — в классе `Kernel` (или в `Bundle`, если это переиспользуемый пакет — см. модуль 28):

```php
// src/Kernel.php
protected function build(ContainerBuilder $container): void
{
    $container->addCompilerPass(new DeliveryMethodRegistryPass());
}
```

---

## 20.3. Bundle Extension — как конфиг YAML превращается в сервисы

Каждый бандл (`DoctrineBundle`, `TwigBundle` и т.д.) имеет класс `Extension`, который читает секцию `doctrine:`/`twig:` из YAML-конфига и на основе неё регистрирует сервисы в контейнере. Это ключ к пониманию, "откуда берутся" сервисы вроде `doctrine.orm.entity_manager`.

```php
class BookNestExtension extends Extension implements ConfigurationInterface
{
    public function load(array $configs, ContainerBuilder $container): void
    {
        $config = $this->processConfiguration($this, $configs);

        $loader = new YamlFileLoader($container, new FileLocator(__DIR__ . '/../../config'));
        $loader->load('services.yaml');

        $container->setParameter('booknest.tax_rate', $config['tax_rate']);
    }

    public function getConfigTreeBuilder(): TreeBuilder
    {
        $treeBuilder = new TreeBuilder('booknest');
        $treeBuilder->getRootNode()
            ->children()
                ->floatNode('tax_rate')->defaultValue(0.20)->end()
            ->end();

        return $treeBuilder;
    }
}
```

Это именно тот механизм, который позволяет `config:dump-reference` (модуль 3) показывать структуру конфига любого бандла — она берётся из `getConfigTreeBuilder()`. Полностью разберём написание собственного бандла в модуле 28 — здесь важно понимание механики.

---

## 20.4. debug:container --show-arguments и чтение дерева зависимостей

```bash
php bin/console debug:container PriceCalculator --show-arguments
php bin/console debug:container --deprecations   # какие используемые сервисы устарели — важно перед апгрейдом
```

Продвинутая диагностика: если контейнер не компилируется (ошибка при `cache:warmup`), Symfony покажет **цепочку** резолвинга — какая зависимость от какой требовалась. Умение читать это сообщение об ошибке — базовый навык, экономящий часы:

```
Cannot autowire service "App\Service\CheckoutService": argument "$paymentGateway" of method
"__construct()" references interface "App\Payment\PaymentGatewayInterface" but no such service
exists. You should maybe alias this interface to one of these existing services:
"App\Payment\StripeGateway", "App\Payment\PaypalGateway".
```

---

## 20.5. Атрибуты как метаданные: как Symfony их читает

Начиная с PHP 8, атрибуты (`#[Route]`, `#[ORM\Entity]`, `#[Assert\NotBlank]`) — это просто метаданные класса, доступные через Reflection API. Symfony **не делает магии** — каждый компонент (Routing, Doctrine, Validator) содержит свой `AttributeLoader`, который через `ReflectionClass::getAttributes()` вычитывает эти метаданные и превращает их в объекты конфигурации (`Route`, `ClassMetadata` и т.д.).

```php
// упрощённо то, что делает Symfony\Component\Routing\Loader\AttributeClassLoader
$reflectionClass = new \ReflectionClass($controllerClass);
foreach ($reflectionClass->getMethods() as $method) {
    foreach ($method->getAttributes(Route::class) as $attribute) {
        $routeAnnotation = $attribute->newInstance(); // создаёт объект Route
        // ... регистрирует маршрут в RouteCollection
    }
}
```

Понимание этого механизма открывает дверь к написанию **собственных** атрибутов с собственной логикой обработки — то, чем мы уже занимались в модуле 8 (кастомные Constraints) и модуле 15 (кастомные консольные атрибуты), но теперь вы понимаете *общий* паттерн, применимый к любой части фреймворка.

---

## 20.6. Практика модуля 20

**Задание 1.** Откройте сгенерированный файл контейнера в `var/cache/dev/` и найдите метод, создающий один из ваших сервисов BookNest (например, `CheckoutService`). Проследите, как резолвятся его зависимости.

**Задание 2.** Напишите собственный `CompilerPass`, который на этапе компиляции выводит (через `throw` с деталями в сообщении, для отладки) список всех сервисов, реализующих определённый интерфейс вашего проекта — без использования `#[AutowireIterator]`.

**Задание 3.** Установите приоритет `100` для кастомного `EventListener` на `kernel.request` и убедитесь через `var_dump`/лог, что он срабатывает **до** `FirewallListener` — то есть даже для маршрутов, требующих аутентификации.

**Задание 4.** Изучите вывод `php bin/console debug:container --deprecations` на своём проекте BookNest — если пусто, специально вызовите deprecated-метод какого-нибудь компонента и убедитесь, что он появляется в выводе.

---

## 20.7. Частые ошибки даже у опытных разработчиков

1. **Пытаются менять поведение "магии" фреймворка не через предусмотренные точки расширения** (CompilerPass, EventDispatcher), а патчат vendor-код напрямую — ломается при любом обновлении зависимостей.
2. **Не понимают, почему приватный сервис "не виден"** снаружи контейнера, и начинают городить `public: true` вместо использования правильного DI через конструктор.
3. **Путают время компиляции и время выполнения** — пытаются использовать во время `process()` компилятор-пасса значения, которые доступны только в runtime (например, реальные данные из БД).
4. **Не проверяют приоритеты встроенных слушателей** при добавлении своих на `kernel.request`/`kernel.response` — получают порядок выполнения, отличный от ожидаемого.

---

## Чек-лист "Я умею" — Модуль 20

- [ ] Проследить путь запроса от `public/index.php` до `Response` буквально по исходному коду HttpKernel
- [ ] Объяснить, зачем нужен Symfony Runtime Component и как он абстрагирует SAPI
- [ ] Понимать этапы компиляции DI-контейнера и то, что в runtime не остаётся рефлексии
- [ ] Писать собственный CompilerPass для нетривиальной сборки сервисов
- [ ] Понимать, как Bundle Extension превращает YAML-конфиг в сервисы
- [ ] Понимать общий механизм, по которому Symfony читает PHP-атрибуты как метаданные
- [ ] Управлять приоритетами Event Listener'ов относительно встроенных подписчиков фреймворка

**Дальше:** [Модуль 21 — Workflow Component](21-workflow-component.md)
