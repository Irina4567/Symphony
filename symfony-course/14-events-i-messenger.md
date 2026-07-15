# Модуль 14. EventDispatcher и Messenger

> Предыдущий модуль: [13 — Тестирование](13-testirovanie.md)

---

## Часть 1. EventDispatcher — синхронные события внутри одного запроса

### 14.1. Паттерн Observer в основе Symfony

Мы уже упоминали в модуле 0, что HttpKernel диспатчит события на каждом этапе обработки запроса. **EventDispatcher** — компонент, реализующий классический паттерн Observer: объект генерирует ("диспатчит") событие, а произвольное число подписчиков реагируют, не зная друг о друге.

Это ключевой механизм **развязки (decoupling)** в Symfony: вместо того чтобы `OrderService` явно вызывал `$mailer->send()`, `$logger->log()`, `$analytics->track()` — он просто диспатчит событие "заказ создан", а сколько угодно подписчиков реагируют независимо. Можно добавить нового подписчика, не трогая `OrderService` вообще — принцип Open/Closed из SOLID в действии.

### 14.2. Kernel Events — встроенные точки расширения

```
kernel.request              → до определения контроллера (можно подменить Response раньше времени — напр. maintenance mode)
kernel.controller           → контроллер определён, но ещё не вызван
kernel.controller_arguments → аргументы контроллера уже резолвлены
kernel.view                 → контроллер вернул НЕ Response (напр. массив) — можно превратить его в Response
kernel.response             → Response готов, но ещё не отправлен (можно добавить заголовки)
kernel.exception            → исключение во время обработки — здесь строится страница ошибки/JSON ошибки
kernel.terminate             → response уже отправлен клиенту — safe место для "тяжёлой" работы постфактум
```

`kernel.terminate` особенно полезен: он выполняется **после** того, как ответ уже ушёл к пользователю (при поддержке PHP-FPM с `fastcgi_finish_request`), поэтому идеален для нетерминальной работы вроде логирования аналитики, не задерживающей ответ пользователю.

### 14.3. Собственное доменное событие

```bash
php bin/console make:event OrderPlacedEvent
```

```php
<?php

namespace App\Event;

use App\Entity\Order;
use Symfony\Contracts\EventDispatcher\Event;

class OrderPlacedEvent extends Event
{
    public function __construct(private readonly Order $order) {}

    public function getOrder(): Order
    {
        return $this->order;
    }
}
```

Диспатч события из сервиса:

```php
use Symfony\Contracts\EventDispatcher\EventDispatcherInterface;

class CheckoutService
{
    public function __construct(
        private EntityManagerInterface $em,
        private EventDispatcherInterface $eventDispatcher,
    ) {}

    public function placeOrder(Order $order): void
    {
        $this->em->persist($order);
        $this->em->flush();

        $this->eventDispatcher->dispatch(new OrderPlacedEvent($order));
    }
}
```

### 14.4. Event Subscriber — рекомендуемый способ подписки

```php
<?php

namespace App\EventListener;

use App\Event\OrderPlacedEvent;
use Psr\Log\LoggerInterface;
use Symfony\Component\EventDispatcher\EventSubscriberInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;

class SendOrderConfirmationSubscriber implements EventSubscriberInterface
{
    public function __construct(private MailerInterface $mailer, private LoggerInterface $logger) {}

    public static function getSubscribedEvents(): array
    {
        return [
            OrderPlacedEvent::class => 'onOrderPlaced',
        ];
    }

    public function onOrderPlaced(OrderPlacedEvent $event): void
    {
        $order = $event->getOrder();

        $this->mailer->send((new Email())
            ->to($order->getCustomerEmail())
            ->subject('Ваш заказ №' . $order->getId() . ' принят')
            ->text('Спасибо за заказ!'));

        $this->logger->info('Отправлено письмо-подтверждение заказа #' . $order->getId());
    }
}
```

Благодаря autoconfiguration подписчик регистрируется автоматически (тег `kernel.event_subscriber`) — ничего в `services.yaml` дописывать не нужно.

### Subscriber vs Listener — в чём разница

- **`EventSubscriberInterface`** — класс сам "знает", на какие события подписан (`getSubscribedEvents()`), логика подписки живёт внутри класса. **Рекомендуемый подход** — вся конфигурация в одном месте, легко читать.
- **`#[AsEventListener]`** (атрибут на методе) — более легковесный вариант для одного обработчика одного события:
```php
#[AsEventListener(event: OrderPlacedEvent::class, priority: 10)]
class UpdateInventoryListener
{
    public function __invoke(OrderPlacedEvent $event): void
    {
        // списываем товар со склада
    }
}
```

### Приоритеты и порядок выполнения

```php
public static function getSubscribedEvents(): array
{
    return [
        OrderPlacedEvent::class => ['onOrderPlaced', 10], // выше приоритет — выполняется раньше
    ];
}
```

Несколько подписчиков на одно событие выполняются **синхронно**, по убыванию приоритета. Если один из подписчиков падает с исключением — все последующие **не выполнятся**, а исключение "всплывёт" наверх (если не поймано) — это важно понимать: тяжёлые/ненадёжные операции (отправка email, обращение к внешним API) стоит либо оборачивать в `try/catch`, либо (что правильнее) выносить в асинхронную очередь — переходим к Messenger.

### Остановка распространения события

```php
public function onOrderPlaced(OrderPlacedEvent $event): void
{
    if ($event->isPropagationStopped()) {
        return;
    }
    // ...
    $event->stopPropagation(); // следующие подписчики (с более низким приоритетом) не будут вызваны
}
```

---

## Часть 2. Messenger — асинхронная обработка и очереди

### 14.5. Проблема синхронной обработки

Возвращаясь к примеру выше: если `SendOrderConfirmationSubscriber` отправляет email **синхронно** прямо во время обработки HTTP-запроса, пользователь ждёт, пока пройдёт SMTP-соединение (может занять секунды, а при сбое почтового сервера — вообще подвесить запрос). Правильное решение — не отправлять письмо "прямо сейчас", а поставить задачу в очередь и обработать её отдельным процессом (worker'ом), пока пользователь уже получил быстрый ответ "Заказ принят".

```bash
composer require symfony/messenger
composer require symfony/amqp-messenger  # для RabbitMQ, либо symfony/redis-messenger для Redis
```

### 14.6. Message и Handler

**Message** — простой DTO, описывающий "что нужно сделать":

```php
<?php

namespace App\Message;

final readonly class SendOrderConfirmationMessage
{
    public function __construct(
        public int $orderId,
    ) {}
}
```

**Message Handler** — класс, который реально выполняет работу, когда сообщение будет обработано (синхронно сразу или асинхронно воркером — в зависимости от конфигурации роутинга, см. ниже):

```php
<?php

namespace App\MessageHandler;

use App\Message\SendOrderConfirmationMessage;
use App\Repository\OrderRepository;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Email;
use Symfony\Component\Messenger\Attribute\AsMessageHandler;

#[AsMessageHandler]
class SendOrderConfirmationMessageHandler
{
    public function __construct(
        private OrderRepository $orderRepository,
        private MailerInterface $mailer,
    ) {}

    public function __invoke(SendOrderConfirmationMessage $message): void
    {
        $order = $this->orderRepository->find($message->orderId);
        if (!$order) {
            return; // заказ мог быть удалён между постановкой в очередь и обработкой
        }

        $this->mailer->send((new Email())
            ->to($order->getCustomerEmail())
            ->subject('Ваш заказ принят')
            ->text('Спасибо за покупку!'));
    }
}
```

**Важно:** обработчик получает только `orderId` (скаляр), а не сам объект `$order` — потому что к моменту реальной обработки (может пройти секунды/минуты) состояние объекта в памяти уже неактуально, поэтому в handler'е заново загружаем свежие данные из БД по идентификатору. Это стандартная практика для message-driven систем.

### 14.7. Отправка сообщения

```php
use Symfony\Component\Messenger\MessageBusInterface;

class CheckoutService
{
    public function __construct(
        private EntityManagerInterface $em,
        private MessageBusInterface $messageBus,
    ) {}

    public function placeOrder(Order $order): void
    {
        $this->em->persist($order);
        $this->em->flush();

        $this->messageBus->dispatch(new SendOrderConfirmationMessage($order->getId()));
    }
}
```

### 14.8. Транспорты: где физически лежит очередь

```yaml
# config/packages/messenger.yaml
framework:
    messenger:
        transports:
            async: '%env(MESSENGER_TRANSPORT_DSN)%'
            failed: 'doctrine://default?queue_name=failed'

        routing:
            App\Message\SendOrderConfirmationMessage: async
```

```dotenv
# .env
MESSENGER_TRANSPORT_DSN=doctrine://default   # хранить очередь прямо в таблице БД — просто для старта
# или для реальной нагрузки:
# MESSENGER_TRANSPORT_DSN=amqp://guest:guest@localhost:5672/%2f/messages
# MESSENGER_TRANSPORT_DSN=redis://localhost:6379/messages
```

Без записи в `routing`, сообщение обрабатывается **синхронно**, сразу в том же запросе — это удобно на старте разработки (не нужно поднимать воркер), а асинхронность включается позже простым изменением конфига, без единой строчки изменений в бизнес-коде.

### 14.9. Worker — процесс, забирающий сообщения из очереди

```bash
php bin/console messenger:consume async -vv
```

Это отдельный, постоянно работающий процесс (в production запускается через Supervisor/systemd, не вручную). Он берёт сообщения из очереди и вызывает соответствующий handler.

```ini
# /etc/supervisor/conf.d/booknest-worker.conf
[program:booknest-messenger-worker]
command=php /var/www/booknest/bin/console messenger:consume async --time-limit=3600
user=www-data
numprocs=2
autostart=true
autorestart=true
```

`--time-limit=3600` — воркер перезапускается раз в час, чтобы избежать накопления памяти (типичная практика для долгоживущих PHP-процессов, учитывая, что PHP исторически не был рассчитан на "вечно живущие" процессы — утечки памяти в третьесторонних библиотеках случаются).

### 14.10. Retry и Failure Transport

Если обработчик выбрасывает исключение, Messenger автоматически повторяет попытку с задержкой (retry strategy):

```yaml
framework:
    messenger:
        transports:
            async:
                dsn: '%env(MESSENGER_TRANSPORT_DSN)%'
                retry_strategy:
                    max_retries: 3
                    delay: 1000       # мс, задержка перед первым повтором
                    multiplier: 2      # экспоненциальный backoff: 1с, 2с, 4с...
```

После исчерпания всех попыток сообщение уходит в `failed`-транспорт:

```bash
php bin/console messenger:failed:show
php bin/console messenger:failed:retry
php bin/console messenger:failed:remove 42
```

### 14.11. Middleware

Messenger построен на цепочке middleware (аналог middleware в веб-фреймворках, но для сообщений) — можно добавить свой для сквозной логики (логирование, метрики, транзакции):

```php
class LoggingMiddleware implements MiddlewareInterface
{
    public function __construct(private LoggerInterface $logger) {}

    public function handle(Envelope $envelope, StackInterface $stack): Envelope
    {
        $this->logger->info('Обработка сообщения: ' . get_class($envelope->getMessage()));
        $envelope = $stack->next()->handle($envelope, $stack);
        $this->logger->info('Сообщение обработано');
        return $envelope;
    }
}
```

```yaml
framework:
    messenger:
        buses:
            messenger.bus.default:
                middleware:
                    - App\Messenger\LoggingMiddleware
```

### 14.12. Scheduler — периодические задачи (Symfony 6.3+)

Компонент **Symfony Scheduler** построен поверх Messenger и заменяет классический подход "cron вызывает консольную команду":

```php
<?php

namespace App\Scheduler;

use App\Message\CleanupExpiredCartsMessage;
use Symfony\Component\Scheduler\Attribute\AsSchedule;
use Symfony\Component\Scheduler\RecurringMessage;
use Symfony\Component\Scheduler\Schedule;
use Symfony\Component\Scheduler\ScheduleProviderInterface;

#[AsSchedule('default')]
class MainSchedule implements ScheduleProviderInterface
{
    public function getSchedule(): Schedule
    {
        return (new Schedule())->add(
            RecurringMessage::every('1 hour', new CleanupExpiredCartsMessage()),
        );
    }
}
```

```bash
php bin/console messenger:consume scheduler_default
```

Это единый постоянно работающий процесс вместо десятков отдельных cron-записей — удобнее в мониторинге и версионировании (расписание — это код в репозитории, а не запись в crontab сервера).

---

## 14.13. Практика: события и очереди BookNest

Соберём то, что обсуждали:

1. `OrderPlacedEvent` диспатчится синхронно сразу после сохранения заказа.
2. Подписчик на это событие **не** отправляет email сам, а лишь ставит `SendOrderConfirmationMessage` в асинхронную очередь.
3. Отдельный подписчик синхронно (это быстро, не требует внешних вызовов) списывает товар со склада.

```php
class OrderEventSubscriber implements EventSubscriberInterface
{
    public function __construct(private MessageBusInterface $messageBus) {}

    public static function getSubscribedEvents(): array
    {
        return [OrderPlacedEvent::class => 'onOrderPlaced'];
    }

    public function onOrderPlaced(OrderPlacedEvent $event): void
    {
        $this->messageBus->dispatch(new SendOrderConfirmationMessage($event->getOrder()->getId()));
    }
}
```

```yaml
framework:
    messenger:
        routing:
            App\Message\SendOrderConfirmationMessage: async
```

---

## 14.14. Практика модуля 14

**Задание 1.** Реализуйте `#[AsEventListener]`-подписчик, который списывает товар со склада (`stockQuantity -= quantity`) при `OrderPlacedEvent`, синхронно.

**Задание 2.** Настройте `messenger.yaml` с транспортом `doctrine://default`, запустите `messenger:consume async` в отдельном терминале и убедитесь, что письмо (можно через `MAILER_DSN=null://null` — "фейковый" транспорт для разработки, письма видно в профайлере) реально обрабатывается воркером, а не сразу в запросе.

**Задание 3.** Настройте `retry_strategy` с 3 попытками и намеренно сломайте handler (`throw new \RuntimeException()`), понаблюдайте за поведением через `messenger:failed:show`.

**Задание 4.** Реализуйте периодическую задачу через Scheduler — очистка заказов старше 30 минут в статусе `new`, которые так и не были оплачены ("зависшие" заказы).

### Решения

<details>
<summary>Решение задания 1</summary>

```php
#[AsEventListener(event: OrderPlacedEvent::class, priority: 100)]
class DecrementStockListener
{
    public function __construct(private EntityManagerInterface $em) {}

    public function __invoke(OrderPlacedEvent $event): void
    {
        foreach ($event->getOrder()->getItems() as $item) {
            $item->getBook()->decrementStock($item->getQuantity());
        }
        $this->em->flush();
    }
}
```

Высокий приоритет (`100`) гарантирует, что списание склада произойдёт раньше других, менее критичных подписчиков (например, аналитики).
</details>

---

## 14.15. Частые ошибки новичков

1. **Передают в асинхронное сообщение целый объект сущности** вместо идентификатора — сериализация Doctrine-сущностей с их прокси-объектами и связями в очереди ненадёжна и неэффективна.
2. **Выполняют "тяжёлые" операции (email, внешние API) синхронно** в обработчике HTTP-запроса — пользователь ждёт дольше, чем нужно, и любой сбой стороннего сервиса ломает основной сценарий.
3. **Забывают запустить воркер** (`messenger:consume`) и не понимают, почему асинхронные сообщения "не обрабатываются" — на самом деле они просто копятся в очереди.
4. **Не настраивают `--time-limit`/`--memory-limit`** для долгоживущих воркеров в production — постепенная деградация из-за утечек памяти в третьесторонних библиотеках.
5. **Путают Event (внутри одного процесса, синхронно) и Message (может быть асинхронным, через очередь)** — это разные инструменты для разных задач, хотя оба используют похожую механику подписки на "что-то, что произошло".

---

## Чек-лист "Я умею" — Модуль 14

- [ ] Объяснить, какие Kernel Events существуют и для чего каждый нужен
- [ ] Диспатчить собственные доменные события и подписываться на них через Subscriber/`#[AsEventListener]`
- [ ] Понимать разницу между приоритетами подписчиков и остановкой распространения события
- [ ] Создавать Message + Handler для Messenger
- [ ] Настраивать транспорты (sync/doctrine/amqp/redis) и роутинг сообщений
- [ ] Запускать и настраивать worker (`messenger:consume`) для production
- [ ] Настраивать retry-стратегию и работать с failed-транспортом
- [ ] Использовать Scheduler для периодических задач вместо голого cron

**Дальше:** [Модуль 15 — Кэширование и консольные команды](15-keshirovanie-i-konsolnye-komandy.md)
