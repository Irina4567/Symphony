# Модуль 25. Real-time: Mercure, WebSockets, SSE

> Предыдущий модуль: [24 — Translation и интернационализация](24-translation-i18n.md)

---

## 25.1. Проблема: как "толкнуть" данные в браузер без запроса от клиента

Обычный HTTP — модель "запрос-ответ": клиент спрашивает, сервер отвечает. Но что если нужно, чтобы браузер узнал об изменении **без** повторного опроса (polling)? Например: у администратора открыта страница заказов, и новый заказ должен появиться в списке мгновенно, без обновления страницы.

Три технических подхода:

- **Polling** — браузер сам периодически спрашивает "есть что-то новое?" (`setInterval` + fetch). Просто, но неэффективно (лишняя нагрузка) и не мгновенно.
- **WebSocket** — постоянное двустороннее соединение. Мощно, но требует отдельного стека (обычно не через стандартный PHP-FPM) и своей инфраструктуры.
- **SSE (Server-Sent Events)** — однонаправленный поток от сервера к клиенту поверх обычного HTTP. Проще WebSocket, отлично подходит для "сервер оповещает клиента", встроен в браузеры нативно (`EventSource`).

**Mercure** — протокол и сервер (написан создателями API Platform), построенный поверх SSE, специально спроектированный для интеграции с Symfony.

---

## 25.2. Архитектура Mercure

```
                     ┌─────────────┐
Symfony App ── publish ─▶  Mercure Hub  ── SSE stream ──▶ Browser (EventSource)
                     └─────────────┘
```

Важная деталь архитектуры: **Symfony-приложение не хранит долгоживущие соединения само** — это делегировано отдельному, легковесному Hub-серверу (написан на Go, работает как самостоятельный процесс/контейнер). Ваше PHP-приложение просто публикует обновление через HTTP-запрос к Hub, а Hub уже сам рассылает его всем подписанным браузерам. Это архитектурно верно: PHP-FPM воркеры не предназначены для тысяч постоянно открытых соединений, а Go-сервер Mercure Hub — предназначен.

```bash
composer require symfony/mercure-bundle
```

```dotenv
MERCURE_URL=http://mercure/.well-known/mercure
MERCURE_PUBLIC_URL=https://booknest.example/.well-known/mercure
MERCURE_JWT_SECRET="!ChangeThisMercureHubJWTSecretKey!"
```

```yaml
# compose.yaml — добавляем Mercure Hub
services:
    mercure:
        image: dunglas/mercure
        environment:
            MERCURE_PUBLISHER_JWT_KEY: '!ChangeThisMercureHubJWTSecretKey!'
            MERCURE_SUBSCRIBER_JWT_KEY: '!ChangeThisMercureHubJWTSecretKey!'
        command: /usr/bin/caddy run --config /etc/caddy/Caddyfile
        ports: ['3000:80']
```

---

## 25.3. Публикация обновлений из Symfony

```php
use Symfony\Component\Mercure\HubInterface;
use Symfony\Component\Mercure\Update;

class OrderNotificationPublisher
{
    public function __construct(private HubInterface $hub) {}

    public function publishNewOrder(Order $order): void
    {
        $update = new Update(
            topics: 'https://booknest.example/admin/orders',
            data: json_encode([
                'id' => $order->getId(),
                'customerEmail' => $order->getCustomerEmail(),
                'totalKopecks' => $order->getTotalKopecks(),
            ]),
        );

        $this->hub->publish($update);
    }
}
```

Логичное место для вызова — подписчик на `OrderPlacedEvent` (модуль 14) или на событие Workflow (модуль 21) — Mercure отлично комбинируется с уже пройденной событийной архитектурой:

```php
#[AsEventListener(event: OrderPlacedEvent::class)]
class PublishOrderToMercureListener
{
    public function __construct(private OrderNotificationPublisher $publisher) {}

    public function __invoke(OrderPlacedEvent $event): void
    {
        $this->publisher->publishNewOrder($event->getOrder());
    }
}
```

---

## 25.4. Подписка на клиенте

```javascript
// assets/controllers/live_orders_controller.js
import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    connect() {
        const url = new URL(this.mercureHubUrlValue);
        url.searchParams.append('topic', 'https://booknest.example/admin/orders');

        this.eventSource = new EventSource(url);
        this.eventSource.onmessage = (event) => {
            const order = JSON.parse(event.data);
            this.prependOrderRow(order);
        };
    }

    disconnect() {
        this.eventSource?.close();
    }

    prependOrderRow(order) {
        // добавить строку в таблицу заказов админки без перезагрузки
    }
}
```

```twig
<div {{ stimulus_controller('live-orders') }}
     data-live-orders-mercure-hub-url-value="{{ mercure_url }}">
    <table id="orders-table"><!-- ... --></table>
</div>
```

### Twig-хелпер для генерации URL Hub'а с topic

```twig
{{ mercure_url('https://booknest.example/admin/orders') }}
```

---

## 25.5. Приватные обновления и авторизация

Не все обновления должны быть публичными — например, покупатель должен получать real-time статус **только своего** заказа, а не всех подряд:

```php
$update = new Update(
    topics: "https://booknest.example/account/orders/{$order->getId()}",
    data: json_encode(['status' => $order->getStatus()]),
    private: true,   // требует авторизации подписчика
);
```

Подписчик должен предъявить JWT-токен (выдаётся Symfony-приложением после проверки, что пользователь действительно имеет право на этот topic — переиспользуем Voters из модуля 10!):

```php
use Symfony\Component\Mercure\Authorization;

class MercureAuthorizationController extends AbstractController
{
    #[Route('/mercure/subscribe-token/{orderId}', name: 'mercure_subscribe_token')]
    #[IsGranted('ORDER_VIEW', subject: 'order')]
    public function getToken(Order $order, Authorization $authorization): Response
    {
        return $authorization->createCookie($this->createRequest(), [
            "https://booknest.example/account/orders/{$order->getId()}",
        ]);
    }
}
```

---

## 25.6. Turbo Streams через Mercure (связка с модулем 16)

Мощная комбинация: Turbo (модуль 16) умеет подписываться на Mercure и автоматически применять полученные **Turbo Stream** обновления к DOM — без единой строчки собственного JS, только серверный Twig:

```twig
{# в странице заказов администратора #}
<turbo-stream-source src="{{ mercure_url('https://booknest.example/admin/orders') }}"></turbo-stream-source>

<turbo-frame id="orders-list">
    {% for order in orders %}
        {{ include('admin/order/_row.html.twig') }}
    {% endfor %}
</turbo-frame>
```

Сервер публикует не просто JSON, а готовый HTML-фрагмент Turbo Stream:
```php
$update = new Update(
    topics: 'https://booknest.example/admin/orders',
    data: $this->twig->render('admin/order/_new_order_stream.html.twig', ['order' => $order]),
);
```
```twig
{# _new_order_stream.html.twig #}
<turbo-stream action="prepend" target="orders-list">
    <template>
        {{ include('admin/order/_row.html.twig') }}
    </template>
</turbo-stream>
```

Это доводит идею "реактивность без ручного JS" из модуля 16 до логического завершения — весь real-time UI строится Twig-шаблонами на сервере.

---

## 25.7. Когда действительно нужен полноценный WebSocket

Mercure отлично закрывает большинство сценариев ("сервер → клиент оповещения"), но если нужна **двусторонняя** низкоуровневая коммуникация с высокой частотой (например, многопользовательский real-time редактор документа, игра) — потребуется полноценный WebSocket-сервер. В экосистеме PHP для этого обычно используют либо отдельный Node.js-сервис, либо PHP на альтернативном раннере (Swoole/RoadRunner/Workerman — см. модуль 29), способном держать долгоживущие соединения.

---

## 25.8. Практика: живая админ-панель заказов BookNest

Соберём: событие `OrderPlacedEvent` → публикация в Mercure → Turbo Stream обновляет таблицу заказов у всех открытых вкладок администраторов без перезагрузки страницы, плюс приватный канал статуса заказа для самого покупателя.

---

## 25.9. Практика модуля 25

**Задание 1.** Поднимите Mercure Hub через Docker Compose, настройте публикацию `OrderPlacedEvent` в публичный topic для админ-панели.

**Задание 2.** Реализуйте приватный topic статуса заказа с JWT-авторизацией через переиспользование `OrderVoter` из модуля 10.

**Задание 3.** Соберите Turbo Stream интеграцию — обновление таблицы заказов у администратора должно происходить без единой строчки собственного JS (только `<turbo-stream-source>` + серверный Twig).

**Задание 4.** Объясните словами, почему для этого сценария (real-time обновление списка заказов у администратора) достаточно SSE/Mercure и не нужен полноценный WebSocket.

### Решения

<details>
<summary>Обсуждение задания 4</summary>

Коммуникация в этом сценарии **однонаправленная**: сервер сообщает браузеру о новых заказах, браузеру не нужно отправлять высокочастотные данные обратно в реальном времени (взаимодействие администратора — обычные HTTP-запросы, например, "изменить статус заказа" — они прекрасно обрабатываются обычными формами/AJAX). SSE/Mercure специально спроектирован для этого паттерна "сервер → множество клиентов", он проще в эксплуатации (работает поверх HTTP/HTTPS, проходит через обычные прокси/балансировщики без специальной настройки, в отличие от WebSocket, который требует explicit upgrade-заголовков и специальной поддержки на уровне инфраструктуры).
</details>

---

## 25.10. Частые ошибки новичков

1. **Пытаются держать SSE/WebSocket-соединения прямо в PHP-FPM** без вынесения в отдельный процесс/сервис — PHP-FPM воркер занят на всё время соединения, быстро исчерпывается пул воркеров при множестве одновременных подключений.
2. **Публикуют чувствительные данные в публичный (не приватный) topic** — любой знающий URL topic может подписаться и получить чужие данные.
3. **Используют polling вместо Mercure/SSE**, когда задача явно про "сервер оповещает клиента" — лишняя нагрузка и задержка.
4. **Не закрывают `EventSource`-соединение** при уходе со страницы/размонтировании компонента — утечка соединений на клиенте.
5. **Выбирают полноценный WebSocket "на всякий случай"**, хотя однонаправленного SSE достаточно — усложняют инфраструктуру без необходимости.

---

## Чек-лист "Я умею" — Модуль 25

- [ ] Объяснить различия polling / WebSocket / SSE и когда что уместно
- [ ] Понимать архитектуру Mercure (отдельный Hub, а не постоянные соединения в PHP-FPM)
- [ ] Публиковать обновления из Symfony через `HubInterface`
- [ ] Подписываться на обновления на клиенте через `EventSource`
- [ ] Настраивать приватные topics с JWT-авторизацией, переиспользуя Voters
- [ ] Строить real-time UI через Turbo Streams + Mercure без собственного JS

**Дальше:** [Модуль 26 — Продвинутая аутентификация](26-prodvinutaya-autentifikaciya.md)
