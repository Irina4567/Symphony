# Модуль 23. Notifier и продвинутый Mailer

> Предыдущий модуль: [22 — Lock, RateLimiter, Semaphore](22-lock-ratelimiter-semaphore.md)

---

## 23.1. Mailer Component — за пределами базовой отправки

В модуле 14 мы уже отправляли простое письмо. Теперь разберём Mailer глубже: HTML-письма на Twig, вложения, множественные транспорты, тестирование.

```bash
composer require symfony/mailer
```

```dotenv
MAILER_DSN=smtp://user:pass@smtp.mailgun.org:587
# альтернативы: ses://, sendgrid+api://, postmark+api://, null://null (для dev — письма никуда не уходят, видны в профайлере)
```

### TemplatedEmail — письма на Twig

```php
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Component\Mime\Address;

class OrderMailer
{
    public function __construct(private MailerInterface $mailer) {}

    public function sendConfirmation(Order $order): void
    {
        $email = (new TemplatedEmail())
            ->from(new Address('noreply@booknest.example', 'BookNest'))
            ->to($order->getCustomerEmail())
            ->subject('Заказ №' . $order->getId() . ' принят')
            ->htmlTemplate('emails/order_confirmation.html.twig')
            ->context([
                'order' => $order,
            ]);

        $this->mailer->send($email);
    }
}
```

```twig
{# templates/emails/order_confirmation.html.twig #}
{% extends 'emails/base.html.twig' %}

{% block body %}
    <h1>Спасибо за заказ, {{ order.customerName }}!</h1>
    <p>Номер заказа: №{{ order.id }}</p>
    <table>
        {% for item in order.items %}
            <tr>
                <td>{{ item.book.title }}</td>
                <td>{{ item.quantity }} × {{ (item.priceKopecks / 100)|number_format(2) }} ₽</td>
            </tr>
        {% endfor %}
    </table>
    <p><strong>Итого: {{ (order.totalKopecks / 100)|number_format(2) }} ₽</strong></p>
{% endblock %}
```

### Вложения

```php
$email->attachFromPath('/path/to/invoice.pdf', 'Счёт.pdf', 'application/pdf');
$email->attach($generatedPdfContent, 'Счёт.pdf', 'application/pdf');
```

### Встроенные изображения (inline)

```twig
<img src="{{ email.image('logo.png') }}" alt="BookNest">
```

---

## 23.2. Множественные транспорты и роутинг по отправителю

```yaml
# config/packages/mailer.yaml
framework:
    mailer:
        transports:
            main: '%env(MAILER_DSN)%'
            marketing: '%env(MARKETING_MAILER_DSN)%'
        envelope:
            sender: 'noreply@booknest.example'
```

```php
$email->getHeaders()->addTextHeader('X-Transport', 'marketing'); // опционально явное указание транспорта
$mailer->send($email, transport: 'marketing');
```

Типичная причина разделения транспортов: транзакционные письма (подтверждение заказа) и маркетинговые рассылки часто идут через **разных** провайдеров (разные лимиты, разная репутация IP, разная аналитика открытий).

---

## 23.3. Асинхронная отправка через Messenger (связка с модулем 14)

Mailer автоматически интегрируется с Messenger — просто зарегистрировав маршрут:

```yaml
framework:
    messenger:
        routing:
            Symfony\Component\Mailer\Messenger\SendEmailMessage: async
```

После этого **все** письма, отправленные через `$mailer->send()`, автоматически превращаются в асинхронное сообщение и обрабатываются воркером — ничего в коде отправки менять не нужно, это происходит на уровне Mailer-транспорта прозрачно.

---

## 23.4. Тестирование писем

```php
public function testOrderConfirmationEmailIsSent(): void
{
    $client = static::createClient();
    $client->loginUser($this->getTestCustomer());

    $client->request('POST', '/checkout', /* ... */);

    self::assertEmailCount(1);
    $email = self::getMailerMessage(0);

    self::assertEmailHtmlBodyContains($email, 'Спасибо за заказ');
    self::assertEmailAddressContains($email, 'To', 'customer@example.com');
}
```

`symfony/mailer`'s тестовый транспорт (`assertEmailCount`, `getMailerMessage` — из `symfony/mailer` тестовых ассертов в `KernelTestCase`/`WebTestCase`) перехватывает письма в тестовом окружении, не отправляя их реально — точно так же, как профайлер перехватывает их в dev.

---

## 23.5. Notifier Component — multi-channel уведомления

**Notifier** решает более широкую задачу, чем Mailer: единый API для отправки уведомлений через email, SMS, Slack, Telegram, push-уведомления и десятки других каналов — с единой логикой выбора канала и приоритета.

```bash
composer require symfony/notifier
composer require symfony/telegram-notifier symfony/twilio-notifier
```

```dotenv
TELEGRAM_DSN=telegram://TOKEN@default?channel=@booknest_admin_alerts
TWILIO_DSN=twilio://SID:TOKEN@default?from=+1234567890
```

### Notification и Recipient

```php
use Symfony\Component\Notifier\Notification\Notification;
use Symfony\Component\Notifier\Recipient\Recipient;
use Symfony\Component\Notifier\NotifierInterface;

class OrderNotificationService
{
    public function __construct(private NotifierInterface $notifier) {}

    public function notifyAdminsAboutLargeOrder(Order $order): void
    {
        if ($order->getTotalKopecks() < 5_000_00) {
            return;
        }

        $notification = (new Notification('Крупный заказ №' . $order->getId(), ['chat/telegram']))
            ->content(sprintf('Сумма: %s ₽, клиент: %s', $order->getTotalKopecks() / 100, $order->getCustomerEmail()));

        $this->notifier->send($notification, new Recipient());
    }
}
```

### Каналы (channels) и их приоритет

```php
// критичное уведомление — попробовать несколько каналов по очереди, пока один не сработает
$notification = (new Notification('Сервер недоступен'))
    ->importance(Notification::IMPORTANCE_URGENT);
```

```yaml
framework:
    notifier:
        channel_policy:
            urgent: ['sms', 'chat/telegram']
            high: ['chat/telegram']
            medium: ['email']
            low: ['email']
```

### Recipient с несколькими каналами доступа

```php
class AdminRecipient implements RecipientInterface, EmailRecipientInterface, SmsRecipientInterface, ChatRecipientInterface
{
    public function getEmail(): string { return 'admin@booknest.example'; }
    public function getPhone(): string { return '+79991234567'; }
    public function getChatId(): string { return '@booknest_admin_alerts'; }
}
```

Notifier сам выберет подходящий канал в зависимости от `importance` уведомления и настроенного `channel_policy` — не нужно вручную писать `if ($urgent) { sendSms(); } else { sendEmail(); }`.

---

## 23.6. Практика: уведомления BookNest

1. Подтверждение заказа клиенту — email через `TemplatedEmail` (уже реализовано выше), асинхронно через Messenger.
2. Уведомление администраторам в Telegram о заказах свыше 5000₽.
3. SMS клиенту при смене статуса на "отправлен" (опционально, если указан телефон).

```php
class OrderStatusChangeListener
{
    public function __construct(private NotifierInterface $notifier) {}

    #[AsEventListener(event: 'workflow.order.entered.shipped')]
    public function onOrderShipped(EnteredEvent $event): void
    {
        /** @var Order $order */
        $order = $event->getSubject();

        if ($order->getCustomerPhone() === null) {
            return;
        }

        $notification = new Notification('Ваш заказ отправлен', ['sms']);
        $notification->content("Заказ №{$order->getId()} передан в доставку");

        $this->notifier->send($notification, new OrderRecipient($order));
    }
}
```

---

## 23.7. Практика модуля 23

**Задание 1.** Реализуйте `emails/base.html.twig` layout с логотипом, футером и inline-стилями (HTML-письма исторически требуют inline CSS для корректного отображения в большинстве почтовых клиентов).

**Задание 2.** Напишите functional-тест, проверяющий, что после успешного оформления заказа отправлено ровно одно письмо с правильной темой.

**Задание 3.** Настройте Telegram-канал для уведомлений администраторов и реализуйте отправку при превышении суммы заказа.

**Задание 4.** Настройте `channel_policy` так, чтобы `urgent`-уведомления (например, "платёжный шлюз недоступен") пытались отправиться и в Telegram, и по SMS.

---

## 23.8. Частые ошибки новичков

1. **Отправляют письма синхронно** без роутинга через Messenger — пользователь ждёт ответа сервера дольше из-за медленного SMTP-соединения.
2. **Не тестируют содержимое писем**, полагаясь только на факт "письмо отправлено" — опечатки и сломанные шаблоны обнаруживаются пользователями, а не тестами.
3. **Используют внешние (не inline) CSS-стили в HTML-письмах** — большинство почтовых клиентов (особенно Outlook) их игнорируют, письмо выглядит сломанным.
4. **Путают Mailer и Notifier** — пишут собственную логику выбора канала (email/SMS/Telegram) вручную вместо использования готового `channel_policy`.
5. **Хранят чувствительные DSN-строки (токены Telegram, ключи Twilio) не через Secrets Vault**, а в `.env`, закоммиченном в общий репозиторий.

---

## Чек-лист "Я умею" — Модуль 23

- [ ] Отправлять HTML-письма на Twig-шаблонах через `TemplatedEmail`
- [ ] Настраивать множественные транспорты и роутинг писем
- [ ] Отправлять письма асинхронно через интеграцию Mailer + Messenger
- [ ] Тестировать отправку и содержимое писем в functional-тестах
- [ ] Использовать Notifier для multi-channel уведомлений (email/SMS/Telegram)
- [ ] Настраивать `channel_policy` по важности уведомления

**Дальше:** [Модуль 24 — Translation и интернационализация](24-translation-i18n.md)
