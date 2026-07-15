# Модуль 18. Архитектура и best practices

> Предыдущий модуль: [17 — Production и деплой](17-production-i-deploy.md)

---

## 18.1. От "толстых контроллеров" к сервисному слою

Классическая проблема роста Symfony-проекта — контроллеры, разрастающиеся до сотен строк бизнес-логики. Правильное направление роста — контроллер остаётся **тонким**: разбирает запрос, вызывает сервис, формирует ответ. Вся логика — в сервисном слое.

**Плохо (толстый контроллер):**
```php
#[Route('/checkout', methods: ['POST'])]
public function checkout(Request $request, EntityManagerInterface $em, MailerInterface $mailer): Response
{
    $order = new Order();
    // ... 80 строк вычисления цен, скидок, проверки остатков, применения промокода,
    // отправки email, списания склада — всё прямо здесь ...
}
```

**Хорошо (тонкий контроллер + сервис):**
```php
#[Route('/checkout', methods: ['POST'])]
public function checkout(Request $request, CheckoutService $checkoutService): Response
{
    $form = $this->createForm(CheckoutType::class, new Order());
    $form->handleRequest($request);

    if ($form->isSubmitted() && $form->isValid()) {
        $order = $checkoutService->process($form->getData(), $this->getUser());
        return $this->redirectToRoute('order_success', ['id' => $order->getId()]);
    }

    return $this->render('checkout/index.html.twig', ['form' => $form]);
}
```

Вся сложная логика (расчёт цены, применение скидок, диспатч событий) инкапсулирована в `CheckoutService::process()` — отдельно тестируемом, отдельно читаемом классе, который не зависит от HTTP (модуль 04, 13).

---

## 18.2. Слоистая архитектура (Layered Architecture)

Типичное разделение ответственности в зрелом Symfony-проекте:

```
Controller       — HTTP-специфика: парсинг запроса, вызов сервиса, формирование ответа
Service/UseCase  — бизнес-логика, оркестрация
Repository       — доступ к данным
Entity           — бизнес-правила уровня одного объекта (инварианты)
DTO              — контракты ввода/вывода (особенно для API)
Voter            — авторизация
EventListener    — реакция на события (развязка компонентов)
```

**Правило зависимости**: слои выше в этом списке могут зависеть от слоёв ниже, но не наоборот. Entity не должна знать о Repository, Repository не должен знать о Controller.

---

## 18.3. DDD-light: где полезны паттерны Domain-Driven Design

Полноценный DDD (Bounded Context, Aggregate, Domain Events, Ubiquitous Language) — тема для отдельного курса, но некоторые идеи применимы почти в любом Symfony-проекте среднего размера без излишнего усложнения:

### Value Objects вместо примитивов

```php
final readonly class Email
{
    private string $value;

    public function __construct(string $value)
    {
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException("Некорректный email: $value");
        }
        $this->value = strtolower($value);
    }

    public function __toString(): string
    {
        return $this->value;
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }
}
```

Вместо `string $email` с надеждой, что кто-то когда-то его провалидировал где-то выше по стеку, `Email` **гарантирует** свою валидность в момент создания — невозможно создать невалидный `Email`-объект. Это называется "making illegal states unrepresentable".

### Rich Domain Model vs Anemic Domain Model

**Anemic (бедная) модель** — сущности с одними геттерами/сеттерами, вся логика в сервисах:
```php
// Anemic — Order это просто "мешок данных"
$order->setStatus('cancelled');
```

**Rich (богатая) модель** — сущности содержат собственные бизнес-правила:
```php
class Order
{
    public function cancel(): void
    {
        if (!in_array($this->status, ['new', 'paid'], true)) {
            throw new \DomainException('Нельзя отменить заказ в статусе ' . $this->status);
        }
        $this->status = 'cancelled';
        $this->cancelledAt = new \DateTimeImmutable();
    }
}
```

```php
$order->cancel(); // инвариант "можно отменить только new/paid" гарантирован самой сущностью, а не разбросан по сервисам
```

Rich Model — предпочтительный подход для нетривиальной бизнес-логики: правила невозможно "случайно обойти", вызвав сеттер напрямую из произвольного места кода.

---

## 18.4. CQRS-light: разделение команд и запросов

**CQRS (Command Query Responsibility Segregation)** — принцип разделения операций записи (Commands — "сделай что-то") и чтения (Queries — "дай мне данные"). В простом виде (без отдельных БД для чтения/записи, "event sourcing" и прочей полновесной инфраструктуры) это просто дисциплина: не смешивать в одном методе логику изменения состояния и возврата данных.

```php
// Command — явно называет намерение, ничего не возвращает (или возвращает только id/статус)
final readonly class PlaceOrderCommand
{
    public function __construct(
        public array $cartItems,
        public string $customerEmail,
        public string $deliveryMethod,
    ) {}
}

class PlaceOrderHandler
{
    public function __invoke(PlaceOrderCommand $command): Order
    {
        // ... вся логика оформления заказа
    }
}
```

```php
// Query — только читает, не имеет побочных эффектов
final readonly class GetOrderHistoryQuery
{
    public function __construct(public int $customerId) {}
}

class GetOrderHistoryHandler
{
    public function __invoke(GetOrderHistoryQuery $query): array
    {
        return $this->orderRepository->findByCustomerId($query->customerId);
    }
}
```

Symfony Messenger (модуль 14) отлично подходит как "шина команд/запросов" даже для **синхронной** обработки — не только для очередей: `MessageBusInterface::dispatch()` с синхронным транспортом по умолчанию даёт единообразную инфраструктуру (middleware, логирование, тестируемость) для всех команд/запросов приложения.

**Важно не переусложнять**: для CRUD-операций без сложной бизнес-логики полноценный CQRS избыточен — используйте простые сервисы. CQRS оправдан, когда операции записи действительно сложны (много шагов, инвариантов, побочных эффектов).

---

## 18.5. Статический анализ: PHPStan

**PHPStan** находит целые классы ошибок **до** запуска кода — обращение к несуществующему методу, передачу аргумента неверного типа, использование потенциально `null`-значения без проверки.

```bash
composer require --dev phpstan/phpstan phpstan/phpstan-symfony phpstan/phpstan-doctrine
```

```yaml
# phpstan.neon
parameters:
    level: 8  # 0 (мягкий) — 9 (максимально строгий)
    paths:
        - src
    symfony:
        containerXmlPath: var/cache/dev/App_KernelDevDebugContainer.xml
```

```bash
vendor/bin/phpstan analyse
```

**Уровень 8-9** — заметно ловит проблемы вроде "этот метод может вернуть `null`, а вы вызываете на результате метод без проверки" — многие runtime-ошибки production превращаются в ошибки на этапе CI, задолго до того, как их увидит пользователь.

Рекомендация: начинайте новый проект сразу с уровня 6-8. Для legacy-проекта, где PHPStan запускается впервые, — начните с низкого уровня (0-2) и `baseline` (файл с "замороженными" текущими нарушениями, чтобы не блокировать CI, но не дать появиться новым):

```bash
vendor/bin/phpstan analyse --generate-baseline
```

---

## 18.6. Rector — автоматизированный рефакторинг

**Rector** переписывает код автоматически по заданным правилам — незаменим при обновлении версий PHP/Symfony (например, миграция аннотаций `@Route` в атрибуты `#[Route]`, или апгрейд с Symfony 6 на 7):

```bash
composer require --dev rector/rector
```

```php
// rector.php
use Rector\Symfony\Set\SymfonySetList;
use Rector\Set\ValueObject\LevelSetList;

return static function (RectorConfig $rectorConfig): void {
    $rectorConfig->paths([__DIR__ . '/src']);
    $rectorConfig->sets([
        LevelSetList::UP_TO_PHP_83,
        SymfonySetList::SYMFONY_64,
        SymfonySetList::ANNOTATIONS_TO_ATTRIBUTES,
    ]);
};
```

```bash
vendor/bin/rector process --dry-run  # посмотреть, что изменится, без применения
vendor/bin/rector process             # применить
```

---

## 18.7. Code Style: PHP-CS-Fixer / ECS

```bash
composer require --dev friendsofphp/php-cs-fixer
```

```php
// .php-cs-fixer.dist.php
return (new PhpCsFixer\Config())
    ->setRules([
        '@Symfony' => true,
        '@PSR12' => true,
        'declare_strict_types' => true,
        'strict_comparison' => true,
    ])
    ->setFinder(PhpCsFixer\Finder::create()->in(__DIR__ . '/src'));
```

```bash
vendor/bin/php-cs-fixer fix --dry-run --diff
vendor/bin/php-cs-fixer fix
```

Единый code style в команде — не вопрос вкуса, а способ избежать бессмысленных diff'ов в pull request'ах ("переставил пробелы") и споров в код-ревью о форматировании вместо содержания.

---

## 18.8. PSR-стандарты, о которых стоит знать

- **PSR-1/PSR-12** — базовый стиль кода PHP (пробелы, скобки, именование).
- **PSR-4** — автозагрузка классов по неймспейсам (основа `composer.json` → `autoload`).
- **PSR-3** — интерфейс логгера (`LoggerInterface`) — поэтому любой PSR-3-совместимый логгер (не только Monolog) работает в Symfony.
- **PSR-6/PSR-16** — интерфейсы кэша (модуль 15).
- **PSR-7/PSR-15/PSR-17** — HTTP-сообщения и middleware (Symfony HttpFoundation не следует PSR-7 напрямую по историческим причинам, но есть мост `symfony/psr-http-message-bridge` для интеропа с PSR-7-библиотеками).

Следование PSR там, где Symfony это предлагает (Logger, Cache) — гарантия, что ваш код совместим с любой другой библиотекой, ожидающей эти стандартные интерфейсы, а не проприетарный API конкретного фреймворка.

---

## 18.9. Антипаттерны, которых стоит избегать

1. **God Service** — один сервис, знающий и умеющий всё (`AppService` на 2000 строк). Разбивайте по единой ответственности (Single Responsibility Principle).
2. **Anemic Domain Model везде** — если вся логика в сервисах, а сущности — просто геттеры/сеттеры, инварианты бизнес-правил легко случайно нарушить в любом месте кода.
3. **Прямой `EntityManager` в контроллере на каждый чих** — приемлемо для очень простых CRUD, но при росте проекта лучше инкапсулировать в репозиторий/сервис — облегчает тестирование и переиспользование.
4. **Дублирование бизнес-правил между Form validation и Entity constraints** без единого источника истины — используйте Entity constraints как основной источник, форма — это просто UI-слой поверх них.
5. **Избыточная абстракция "на будущее"** — интерфейс с единственной реализацией "на случай, если понадобится другая", репозиторий-паттерн поверх и без того абстрактного Doctrine Repository. Симфони уже даёт хорошие абстракции — не абстрагируйте абстракции без конкретной, текущей потребности (YAGNI — You Aren't Gonna Need It).
6. **Сервисы, знающие про HTTP** (`Request`/`Response` внедрены в сервис бизнес-логики) — ломает переиспользование этого сервиса вне HTTP-контекста (например, из консольной команды или обработчика очереди).

---

## 18.10. Практика: рефакторинг BookNest

Возьмём `CheckoutController::checkout()` из модуля 7 и вынесем логику в `CheckoutService`:

```php
final readonly class PlaceOrderCommand
{
    public function __construct(
        public array $cartItems,        // [bookId => quantity]
        public string $customerName,
        public string $customerEmail,
        public string $deliveryMethod,
    ) {}
}

class CheckoutService
{
    public function __construct(
        private BookRepository $bookRepository,
        private EntityManagerInterface $em,
        private EventDispatcherInterface $eventDispatcher,
    ) {}

    public function process(PlaceOrderCommand $command): Order
    {
        $order = new Order();
        $order->setCustomerEmail($command->customerEmail);
        $order->setDeliveryMethod($command->deliveryMethod);

        foreach ($command->cartItems as $bookId => $quantity) {
            $book = $this->bookRepository->find($bookId)
                ?? throw new \DomainException("Книга #$bookId не найдена");

            if (!$book->isAvailable()) {
                throw new \DomainException("Книга «{$book->getTitle()}» больше не доступна");
            }

            $order->addItem((new OrderItem())
                ->setBook($book)
                ->setPriceKopecks($book->getPriceKopecks())
                ->setQuantity($quantity));
        }

        $this->em->persist($order);
        $this->em->flush();

        $this->eventDispatcher->dispatch(new OrderPlacedEvent($order));

        return $order;
    }
}
```

Контроллер теперь тонкий (см. пример из раздела 18.1), а `CheckoutService::process()` можно unit-тестировать без единого HTTP-запроса (модуль 13), переиспользовать из консольной команды или API-контроллера без дублирования логики.

---

## 18.11. Практика модуля 18

**Задание 1.** Превратите `Order::setStatus()` в набор именованных методов с проверкой инвариантов: `markAsPaid()`, `ship()`, `cancel()` — каждый со своими правилами допустимых переходов состояния.

**Задание 2.** Настройте PHPStan уровня 6 на проекте BookNest, исправьте все найденные ошибки (или сгенерируйте baseline для отложенных).

**Задание 3.** Создайте Value Object `Money` (сумма + валюта), замените `int $priceKopecks` на `Money $price` в `Book`, реализовав методы `add()`, `multiply()`, `isGreaterThan()`.

**Задание 4.** Настройте Rector с набором правил обновления PHP/Symfony, прогоните `--dry-run` и изучите предлагаемые изменения.

### Решения

<details>
<summary>Решение задания 1 (фрагмент)</summary>

```php
class Order
{
    private const TRANSITIONS = [
        'new' => ['paid', 'cancelled'],
        'paid' => ['shipped', 'cancelled'],
        'shipped' => [],
        'cancelled' => [],
    ];

    public function markAsPaid(): void
    {
        $this->transitionTo('paid');
    }

    public function ship(): void
    {
        $this->transitionTo('shipped');
    }

    public function cancel(): void
    {
        $this->transitionTo('cancelled');
    }

    private function transitionTo(string $newStatus): void
    {
        if (!in_array($newStatus, self::TRANSITIONS[$this->status], true)) {
            throw new \DomainException("Нельзя перевести заказ из '{$this->status}' в '$newStatus'");
        }
        $this->status = $newStatus;
    }
}
```

Для сложных сценариев с большим числом состояний и переходов в Symfony есть готовый компонент **Workflow**, формализующий именно эту задачу конфигурацией вместо ручного кода — стоит изучить отдельно при росте сложности жизненного цикла сущности.
</details>

---

## 18.12. Частые ошибки новичков

1. **Копируют бизнес-логику между контроллером и API-контроллером** вместо выноса в общий сервис.
2. **Внедряют `Request` в сервисы бизнес-логики** — ломает переиспользование вне HTTP-контекста.
3. **Игнорируют находки PHPStan**, воспринимая их как "лишний шум", вместо реальных потенциальных багов.
4. **Абстрагируют преждевременно** — создают интерфейсы и слои для единственной существующей реализации "на будущее", усложняя код без пользы здесь и сейчас.
5. **Смешивают Command и Query** в одном методе — метод одновременно и меняет состояние, и возвращает сложные вычисленные данные, что усложняет тестирование и рассуждение о побочных эффектах.

---

## Чек-лист "Я умею" — Модуль 18

- [ ] Разгружать контроллеры, вынося бизнес-логику в сервисный слой
- [ ] Объяснить принцип "зависимости слоёв" в слоистой архитектуре
- [ ] Применять Value Objects и Rich Domain Model для защиты инвариантов
- [ ] Понимать идею CQRS-light и когда она оправдана
- [ ] Настраивать и использовать PHPStan для статического анализа
- [ ] Использовать Rector для автоматизированного рефакторинга при обновлениях
- [ ] Распознавать и избегать типичные архитектурные антипаттерны

**Дальше:** [Модуль 19 — Финальный проект и путь к PRO](19-finalnyj-proekt.md)
