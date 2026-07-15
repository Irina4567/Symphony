# Модуль 04. Dependency Injection и Service Container

> Предыдущий модуль: [03 — Конфигурация и окружение](03-konfiguracia-i-okruzhenie.md)
>
> Это один из самых важных модулей курса. Понимание DI-контейнера — водораздел между "я пишу код, который просто работает" и "я понимаю, как устроен Symfony".

---

## 4.1. Проблема, которую решает DI

Представим сервис расчёта цены со скидками, который использует налоговый калькулятор и логгер:

```php
class PriceCalculator
{
    public function calculate(float $base): float
    {
        $tax = new TaxCalculator();      // жёстко зашитая зависимость
        $logger = new FileLogger('/var/log/app.log'); // жёстко зашитая зависимость
        $logger->log("Расчёт цены для $base");
        return $base + $tax->apply($base);
    }
}
```

Проблемы такого подхода:

- **Невозможно протестировать** `PriceCalculator` в изоляции — нельзя подменить `TaxCalculator` на mock.
- **Невозможно переиспользовать** с другой реализацией логгера (например, в тестах — не писать в реальный файл).
- **Дублирование** — если `TaxCalculator` нужен в 10 местах, `new TaxCalculator()` пишется 10 раз.

**Dependency Injection (внедрение зависимостей)** — паттерн, при котором объект получает свои зависимости **извне** (через конструктор, сеттер или свойство), а не создаёт их сам:

```php
class PriceCalculator
{
    public function __construct(
        private TaxCalculatorInterface $taxCalculator,
        private LoggerInterface $logger,
    ) {}

    public function calculate(float $base): float
    {
        $this->logger->info("Расчёт цены для $base");
        return $base + $this->taxCalculator->apply($base);
    }
}
```

Теперь `PriceCalculator` не знает, *как именно* устроены `TaxCalculator` и логгер — только их контракты (интерфейсы). Это называется **инверсия зависимостей** (Dependency Inversion, буква D в SOLID).

---

## 4.2. Service Container — кто всё это собирает

Если зависимости внедряются извне, то **кто-то** должен создать `TaxCalculator`, создать `Logger`, передать их в `PriceCalculator`, и всё это отдать туда, где `PriceCalculator` нужен. Делать это вручную по всему приложению — ад. Именно этим занимается **Service Container** (контейнер служб) Symfony.

Контейнер — это, по сути, огромная фабрика объектов с "картой", какой сервис из каких зависимостей собирается. Любой класс, зарегистрированный в контейнере, называется **сервисом (service)**.

### Autowiring — автоматическое связывание

С Symfony 3.3+ контейнер умеет **автоматически** определять зависимости по типам аргументов конструктора — не нужно вручную прописывать, что куда передавать:

```php
// src/Service/PriceCalculator.php
namespace App\Service;

use Psr\Log\LoggerInterface;

class PriceCalculator
{
    public function __construct(
        private TaxCalculatorInterface $taxCalculator,
        private LoggerInterface $logger,
    ) {}
    // ...
}
```

Ничего дополнительно писать не нужно: контейнер видит типы `TaxCalculatorInterface` и `LoggerInterface`, находит сервисы, реализующие эти интерфейсы (для `LoggerInterface` в Symfony уже зарегистрирован Monolog), и подставляет их автоматически. Это работает благодаря дефолтной конфигурации в `config/services.yaml`:

```yaml
# config/services.yaml
services:
    _defaults:
        autowire: true      # автоматически внедрять зависимости по типам
        autoconfigure: true # автоматически применять теги по интерфейсам (см. ниже)

    App\:
        resource: '../src/'
        exclude:
            - '../src/DependencyInjection/'
            - '../src/Entity/'
            - '../src/Kernel.php'
```

Директива `App\: resource: '../src/'` регистрирует **все классы** в `src/` как сервисы автоматически — не нужно объявлять каждый класс вручную. Это называется "PSR-4 based service discovery".

### Что если интерфейс реализуют два класса

Если контейнер видит два сервиса, реализующих `TaxCalculatorInterface`, он не может угадать, какой нужен — будет ошибка `"multiple services... you should configure alias"`. Решение — явный `alias`:

```yaml
services:
    App\Service\TaxCalculatorInterface: '@App\Service\RussianTaxCalculator'
```

Либо использовать **именованные аргументы** через атрибут `#[Target]` (Symfony 6.1+):

```php
public function __construct(
    #[Target('russianTax')] private TaxCalculatorInterface $taxCalculator,
) {}
```

```yaml
services:
    russianTax:
        class: App\Service\RussianTaxCalculator
```

---

## 4.3. Жизненный цикл сервиса: singleton по умолчанию

**Важнейший нюанс**: по умолчанию каждый сервис в контейнере — **singleton** в рамках одного запроса (`shared: true`). Контейнер создаёт объект один раз при первом обращении и отдаёт тот же самый экземпляр всем, кому он нужен, до конца обработки текущего запроса. Новый запрос — новый набор экземпляров (кроме сервисов, специально помеченных `public`/persistentных механизмов, но это частности).

Это значит:
- Нельзя хранить в сервисе "запросо-специфичное" изменяемое состояние, которое не должно "утечь" между разными пользователями/запросами (при работе через FPM это не страшно — процесс живёт один запрос, но при работе через постоянно работающий воркер типа Swoole/RoadRunner это критично!).
- Если нужен **не-singleton** сервис (новый экземпляр при каждом внедрении), используется `shared: false`:

```yaml
services:
    App\Service\OrderNumberGenerator:
        shared: false
```

---

## 4.4. debug:container и debug:autowiring

Ключевые команды для понимания того, что происходит в контейнере:

```bash
php bin/console debug:container                       # список всех сервисов
php bin/console debug:container PriceCalculator        # детали конкретного сервиса + его зависимости
php bin/console debug:container --tag=twig.extension    # все сервисы с определённым тегом
php bin/console debug:autowiring tax                    # какие сервисы можно автовайрить по подстроке "tax"
php bin/console debug:container --types                 # какие типы к каким сервисам резолвятся
```

Используйте эти команды **постоянно** во время разработки — 90% "магических" ошибок DI решаются просмотром вывода `debug:container`.

---

## 4.5. Внедрение параметров и скалярных значений

Скалярные значения (строки, числа, булевы) не могут быть автовайрены по типу (`string $x` ничего не говорит контейнеру, *какую* строку передать). Есть три способа:

**1. Именованные аргументы в `services.yaml`:**
```yaml
services:
    App\Service\PriceCalculator:
        arguments:
            $taxRate: '%app.tax_rate%'
```

**2. Атрибут `#[Autowire]` прямо в коде (рекомендуется в Symfony 6.1+ — конфиг рядом с кодом):**
```php
use Symfony\Component\DependencyInjection\Attribute\Autowire;

class PriceCalculator
{
    public function __construct(
        #[Autowire('%app.tax_rate%')] private float $taxRate,
        #[Autowire(service: 'monolog.logger.pricing')] private LoggerInterface $logger,
        #[Autowire(env: 'SUPPORT_EMAIL')] private string $supportEmail,
    ) {}
}
```

**3. Атрибут `#[Target]`** — когда нужен конкретный именованный сервис из нескольких реализаций интерфейса (см. выше).

---

## 4.6. Теги сервисов и autoconfiguration

**Тег (tag)** — метка на сервисе, по которой другой код (обычно ядро фреймворка или бандл) находит "все сервисы такого рода" и что-то с ними делает. Например, все Twig-расширения помечены тегом `twig.extension`, все Event Subscriber'ы — `kernel.event_subscriber`.

С включённым `autoconfigure: true` вам почти никогда не придётся тегировать вручную — контейнер сам понимает, что класс, реализующий `EventSubscriberInterface`, нужно пометить тегом `kernel.event_subscriber`, потому что это описано в конфигурации бандла (`CompilerPass`).

Ручное тегирование нужно для **собственных** тегов — например, если вы делаете систему плагинов:

```php
#[AutoconfigureTag('app.payment_gateway')]
interface PaymentGatewayInterface {}
```

Или через YAML:
```yaml
services:
    App\Payment\StripeGateway:
        tags: ['app.payment_gateway']
```

Затем можно собрать все сервисы с этим тегом в один "локатор" (см. ниже — `#[TaggedIterator]`).

---

## 4.7. Внедрение коллекции сервисов (Tagged Iterator/Locator)

Классический паттерн "Strategy" — коллекция обработчиков, из которых выбирается нужный:

```php
namespace App\Payment;

interface PaymentGatewayInterface
{
    public function supports(string $method): bool;
    public function pay(Order $order): void;
}
```

```php
use Symfony\Component\DependencyInjection\Attribute\AutowireIterator;

class PaymentProcessor
{
    /** @param iterable<PaymentGatewayInterface> $gateways */
    public function __construct(
        #[AutowireIterator('app.payment_gateway')]
        private iterable $gateways,
    ) {}

    public function process(Order $order): void
    {
        foreach ($this->gateways as $gateway) {
            if ($gateway->supports($order->getPaymentMethod())) {
                $gateway->pay($order);
                return;
            }
        }
        throw new \RuntimeException('Нет подходящего способа оплаты');
    }
}
```

Если интерфейс помечен `#[AutoconfigureTag]` (см. выше), всё, что реализует `PaymentGatewayInterface`, автоматически попадёт в эту коллекцию — не нужно ничего регистрировать вручную при добавлении нового способа оплаты. Это мощный инструмент для расширяемой архитектуры (Open/Closed Principle).

---

## 4.8. Фабрики сервисов

Иногда объект нельзя создать простым `new` — нужна логика инициализации (например, SDK-клиент с настройкой из нескольких параметров):

```yaml
services:
    App\Service\S3Client:
        factory: ['App\Service\S3ClientFactory', 'create']
        arguments:
            $bucket: '%env(S3_BUCKET)%'
```

```php
class S3ClientFactory
{
    public static function create(string $bucket): S3Client
    {
        return new S3Client([
            'version' => 'latest',
            'region'  => 'eu-central-1',
            'bucket'  => $bucket,
        ]);
    }
}
```

Либо через атрибут `#[Autoconfigure(factory: ...)]` прямо на классе — оба подхода равнозначны, выбор — вопрос стиля команды.

---

## 4.9. private vs public сервисы

По умолчанию (с Symfony 4+) **все сервисы приватные**. Это значит, что достать сервис напрямую через `$container->get(SomeService::class)` **снаружи** (например, из контроллера через сам контейнер) нельзя — только через автовайринг конструктора. Это осознанное архитектурное решение: заставляет явно объявлять зависимости, а не "магически" тянуть что попало из контейнера где угодно.

Исключение — контроллеры, наследующие `AbstractController`: у них есть метод `$this->container->get()`, но и он ограничен списком "публично доступных" алиасов (в основном для обратной совместимости), а нормальный способ — внедрять зависимости через аргументы метода `__construct` или прямо в аргументы экшена (Symfony это поддерживает через autowiring аргументов метода-контроллера).

```php
class CatalogController extends AbstractController
{
    // Правильно: внедряем через конструктор
    public function __construct(
        private BookRepository $bookRepository,
        private PriceCalculator $priceCalculator,
    ) {}

    #[Route('/catalog', name: 'catalog_index')]
    public function index(): Response
    {
        $books = $this->bookRepository->findAllAvailable();
        // ...
    }
}
```

---

## 4.10. Compiler Pass — для продвинутых кейсов (кратко)

Если нужно программно модифицировать определения сервисов на этапе компиляции контейнера (например, собрать все сервисы с тегом и передать их списком в другой сервис вручную, без `AutowireIterator`), используется **CompilerPass** — это уже уровень разработки переиспользуемых бандлов, а не типового приложения. Мы упоминаем это для полноты картины, глубоко разберём (если понадобится) в модуле 18 (архитектура).

```php
class PaymentGatewayPass implements CompilerPassInterface
{
    public function process(ContainerBuilder $container): void
    {
        $processor = $container->findDefinition(PaymentProcessor::class);
        foreach ($container->findTaggedServiceIds('app.payment_gateway') as $id => $tags) {
            $processor->addMethodCall('addGateway', [new Reference($id)]);
        }
    }
}
```

---

## 4.11. Практика: сервисы BookNest

Создадим `PriceCalculator` и `CartManager` для магазина.

```bash
php bin/console make:service PriceCalculator
```

```php
<?php

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

class PriceCalculator
{
    public function __construct(
        #[Autowire('%app.tax_rate%')] private float $taxRate,
    ) {}

    public function calculateWithTax(int $basePriceKopecks): int
    {
        return (int) round($basePriceKopecks * (1 + $this->taxRate));
    }

    public function applyDiscount(int $priceKopecks, float $discountPercent): int
    {
        return (int) round($priceKopecks * (1 - $discountPercent / 100));
    }
}
```

```php
<?php

namespace App\Service;

use Symfony\Component\HttpFoundation\RequestStack;

class CartManager
{
    private const SESSION_KEY = 'cart';

    public function __construct(private RequestStack $requestStack) {}

    public function add(int $bookId, int $quantity = 1): void
    {
        $session = $this->requestStack->getSession();
        $cart = $session->get(self::SESSION_KEY, []);
        $cart[$bookId] = ($cart[$bookId] ?? 0) + $quantity;
        $session->set(self::SESSION_KEY, $cart);
    }

    public function getItems(): array
    {
        return $this->requestStack->getSession()->get(self::SESSION_KEY, []);
    }

    public function clear(): void
    {
        $this->requestStack->getSession()->remove(self::SESSION_KEY);
    }
}
```

Использование в контроллере — без единой строчки конфигурации, всё за счёт autowiring:

```php
class CartController extends AbstractController
{
    public function __construct(private CartManager $cartManager) {}

    #[Route('/cart/add/{id}', name: 'cart_add', methods: ['POST'])]
    public function add(int $id): Response
    {
        $this->cartManager->add($id);
        $this->addFlash('success', 'Добавлено в корзину');
        return $this->redirectToRoute('catalog_index');
    }
}
```

---

## 4.12. Практика модуля 4

**Задание 1.** Создайте интерфейс `DiscountPolicyInterface` с методом `apply(int $priceKopecks): int` и две реализации: `NoDiscountPolicy` и `SeasonalDiscountPolicy` (скидка 10%). Настройте `alias`, чтобы по умолчанию использовалась `SeasonalDiscountPolicy`.

**Задание 2.** Сделайте `CartManager` не-singleton (`shared: false`) и объясните словами, почему в данном конкретном случае это было бы плохой идеей (сравните со стандартным поведением).

**Задание 3.** Выполните `php bin/console debug:autowiring price` и `debug:container PriceCalculator` — изучите вывод.

**Задание 4.** Реализуйте паттерн "Strategy" из раздела 4.7 для системы доставки: `DeliveryMethodInterface` с `CourierDelivery`, `PickupDelivery`, `PostDelivery`, собираемых через `#[AutowireIterator]`.

### Решения

<details>
<summary>Решение задания 1</summary>

```php
interface DiscountPolicyInterface
{
    public function apply(int $priceKopecks): int;
}

class NoDiscountPolicy implements DiscountPolicyInterface
{
    public function apply(int $priceKopecks): int { return $priceKopecks; }
}

class SeasonalDiscountPolicy implements DiscountPolicyInterface
{
    public function apply(int $priceKopecks): int
    {
        return (int) round($priceKopecks * 0.9);
    }
}
```
```yaml
services:
    App\Service\DiscountPolicyInterface: '@App\Service\SeasonalDiscountPolicy'
```
</details>

<details>
<summary>Решение задания 2 (обсуждение)</summary>

Если `CartManager` станет `shared: false`, каждый сервис, запрашивающий его через автовайринг, получит **свой собственный экземпляр** объекта `CartManager` в рамках одного запроса. Поскольку сама логика хранения корзины у нас и так лежит в сессии (не в свойствах объекта), функционально это не сломается — но это создаёт лишние объекты в памяти без всякой пользы и concептуально сбивает с толку: singleton здесь ожидаем и корректен, так как `CartManager` — это просто "фасад" над сессией, а не хранилище состояния само по себе.
</details>

---

## 4.13. Частые ошибки новичков

1. **Пытаются `new` создавать сервисы вручную** в контроллерах вместо внедрения через конструктор — теряют все преимущества DI (тестируемость, единая точка конфигурации).
2. **Путают параметры и сервисы.** `%app.tax_rate%` — это параметр (значение), а `App\Service\Logger` — это сервис (объект). Синтаксис обращения разный: `%имя_параметра%` vs `@id_сервиса`.
3. **Не понимают, почему "multiple services implement..."** — забывают, что при нескольких реализациях интерфейса нужен explicit alias или `#[Target]`.
4. **Хранят request-специфичное состояние в singleton-сервисе** и удивляются "утечкам" данных между запросами при работе на постоянно живущих воркерах (Swoole, RoadRunner, FrankenPHP worker mode).
5. **Не пользуются `debug:container`/`debug:autowiring`** и пытаются угадать, что пошло не так, вместо того чтобы посмотреть реальное состояние контейнера.

---

## Чек-лист "Я умею" — Модуль 4

- [ ] Объяснить, что такое Dependency Injection и зачем он нужен, своими словами
- [ ] Понимать, как работает autowiring и autoconfiguration в Symfony
- [ ] Внедрять скалярные параметры через `#[Autowire]`
- [ ] Разрешать конфликт нескольких реализаций одного интерфейса (`alias`, `#[Target]`)
- [ ] Собирать коллекции сервисов по тегу через `#[AutowireIterator]`
- [ ] Понимать разницу private/public сервисов и singleton-природу контейнера по умолчанию
- [ ] Пользоваться `debug:container` и `debug:autowiring` для диагностики

**Дальше:** [Модуль 05 — Doctrine ORM: основы](05-doctrine-orm-osnovy.md)
