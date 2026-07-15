# Модуль 30. Наблюдаемость: логи, трассировка, метрики

> Предыдущий модуль: [29 — Производительность рантайма и альтернативные раннеры](29-performance-runtime.md)
>
> "Работает на моей машине" не масштабируется на production с десятками серверов и тысячами запросов в минуту. Senior-разработчик проектирует систему так, чтобы **можно было понять, что происходит внутри**, не добавляя `var_dump()` в боевой код после инцидента.

---

## 30.1. Три столпа наблюдаемости (Observability)

- **Logs (логи)** — дискретные записи о том, что произошло ("заказ #123 создан", "ошибка подключения к Redis").
- **Metrics (метрики)** — числовые агрегированные показатели во времени ("среднее время ответа 250мс", "5 ошибок 500 в минуту").
- **Traces (трассировки)** — путь одного конкретного запроса через все системы, которые он затронул (Symfony → БД → внешний API → очередь).

Три столпа дополняют друг друга: метрики говорят "что-то не так" (алерт "растёт latency"), трейсы говорят "где именно" (конкретный SQL-запрос занял 3 секунды), логи говорят "почему" (текст ошибки, контекст).

---

## 30.2. Структурированное логирование — не текст, а данные

### Проблема неструктурированных логов

```
[2026-07-13 10:23:45] Заказ #123 не удалось оплатить, ошибка: insufficient funds
```

Такую строку невозможно эффективно искать/агрегировать ("сколько заказов упало по insufficient funds за последний час?") без хрупкого парсинга регулярками.

### Структурированный (JSON) лог

```php
$this->logger->error('Order payment failed', [
    'order_id' => $order->getId(),
    'reason' => 'insufficient_funds',
    'amount_kopecks' => $order->getTotalKopecks(),
    'customer_id' => $order->getCustomerId(),
]);
```

```yaml
# config/packages/monolog.yaml
monolog:
    handlers:
        main:
            type: stream
            path: php://stderr
            formatter: monolog.formatter.json
```

Вывод:
```json
{"message": "Order payment failed", "context": {"order_id": 123, "reason": "insufficient_funds", "amount_kopecks": 180000}, "level": 400, "level_name": "ERROR", "channel": "app", "datetime": "2026-07-13T10:23:45+03:00"}
```

Такой формат нативно индексируется системами агрегации логов (ELK, Loki, Datadog Logs) — можно фильтровать `reason: insufficient_funds`, строить графики частоты по времени, без единой регулярки.

---

## 30.3. Correlation ID — связывание записей одного запроса

Проблема: на боевом сервере одновременно обрабатываются сотни запросов, их логи перемешаны в общем потоке. Как найти **все** записи, относящиеся к одному конкретному запросу пользователя, который пожаловался на ошибку?

**Correlation ID** (он же Request ID, Trace ID) — уникальный идентификатор, генерируемый в начале обработки запроса и добавляемый **ко всем** логам, порождённым в рамках этого запроса.

```php
#[AsEventListener(event: KernelEvents::REQUEST, priority: 250)]
class CorrelationIdListener
{
    public function __construct(private LoggerInterface $logger) {}

    public function __invoke(RequestEvent $event): void
    {
        if (!$event->isMainRequest()) {
            return;
        }

        $correlationId = $event->getRequest()->headers->get('X-Correlation-Id') ?? bin2hex(random_bytes(8));
        $event->getRequest()->attributes->set('correlation_id', $correlationId);

        // Monolog Processor автоматически добавит это поле ко ВСЕМ последующим логам этого запроса
        $this->logger->pushProcessor(function (LogRecord $record) use ($correlationId) {
            $record->extra['correlation_id'] = $correlationId;
            return $record;
        });
    }
}
```

Более идиоматичный способ через встроенный процессор:
```yaml
# config/packages/monolog.yaml
monolog:
    handlers:
        main:
            type: stream
            formatter: monolog.formatter.json
    processors:
        - App\Logging\CorrelationIdProcessor
```

**Критично для микросервисной архитектуры**: Correlation ID должен **передаваться дальше** — если BookNest вызывает внешний платёжный сервис, тот же ID пробрасывается в заголовке (`X-Correlation-Id`) исходящего запроса, чтобы можно было проследить путь **одного** пользовательского действия через **все** вовлечённые системы.

```php
$httpClient->request('POST', 'https://payment-provider.example/charge', [
    'headers' => ['X-Correlation-Id' => $request->attributes->get('correlation_id')],
]);
```

---

## 30.4. Distributed Tracing — OpenTelemetry

Correlation ID даёт возможность **найти** связанные логи, но не показывает **временную структуру** запроса — сколько заняла каждая под-операция и в каком порядке. Для этого используется **распределённая трассировка** — стандарт **OpenTelemetry** (OTel) сейчас является отраслевым стандартом (заменил ранее популярный Jaeger/Zipkin API, хотя те остаются как backend для хранения трейсов).

```bash
composer require open-telemetry/sdk open-telemetry/exporter-otlp
composer require open-telemetry/opentelemetry-auto-symfony  # автоинструментация для Symfony
```

### Что даёт трассировка

```
Запрос GET /catalog             [====================================] 320ms
  ├─ kernel.request middleware   [==] 5ms
  ├─ SQL: SELECT books ...        [==========] 85ms
  ├─ SQL: SELECT authors ...      [========] 70ms   ← N+1 проблема видна визуально на графике!
  ├─ Redis: GET catalog.featured  [=] 3ms
  ├─ Twig render                  [======] 60ms
  └─ kernel.response middleware  [=] 2ms
```

Это именно то, что показывает Symfony Profiler в dev-режиме (модуль 0, 17) — но OpenTelemetry делает то же самое **в production**, агрегируя данные со всех серверов в единый интерфейс (Jaeger UI, Grafana Tempo, Datadog APM).

### Ручные спаны для кастомных операций

```php
use OpenTelemetry\API\Trace\SpanInterface;
use OpenTelemetry\API\Globals;

class CheckoutService
{
    public function process(PlaceOrderCommand $command): Order
    {
        $tracer = Globals::tracerProvider()->getTracer('booknest');
        $span = $tracer->spanBuilder('checkout.process')->startSpan();
        $scope = $span->activate();

        try {
            $span->setAttribute('customer.email', $command->customerEmail);
            // ... логика оформления заказа ...
            return $order;
        } catch (\Throwable $e) {
            $span->recordException($e);
            throw $e;
        } finally {
            $span->end();
            $scope->detach();
        }
    }
}
```

---

## 30.5. Метрики — Prometheus

**Метрики** — агрегированные числовые показатели, собираемые с фиксированным интервалом, идеальны для дашбордов и алертинга (в отличие от логов/трейсов, которые лучше для расследования конкретного инцидента постфактум).

```bash
composer require promphp/prometheus_client_php
```

```php
class MetricsService
{
    public function __construct(private CollectorRegistry $registry) {}

    public function recordOrderPlaced(float $amountRubles): void
    {
        $this->registry->getOrRegisterCounter('booknest', 'orders_total', 'Всего оформленных заказов')
            ->inc();

        $this->registry->getOrRegisterHistogram('booknest', 'order_amount_rubles', 'Распределение суммы заказов', [], [100, 500, 1000, 5000, 10000])
            ->observe($amountRubles);
    }
}
```

```php
#[Route('/metrics', name: 'metrics')]
public function metrics(CollectorRegistry $registry): Response
{
    $renderer = new RenderTextFormat();
    return new Response($renderer->render($registry->getMetricFamilySamples()), 200, [
        'Content-Type' => RenderTextFormat::MIME_TYPE,
    ]);
}
```

Prometheus-сервер периодически "опрашивает" (scrape) эндпоинт `/metrics`, собирая временные ряды, из которых строятся дашборды Grafana и настраиваются алерты ("если `orders_total` не растёт 15 минут в рабочее время — оповестить дежурного").

### Основные типы метрик

- **Counter** — только растёт (общее число запросов, ошибок).
- **Gauge** — может расти и падать (текущее число активных соединений).
- **Histogram** — распределение значений по бакетам (latency запросов — важно не только среднее, но и p95/p99).

---

## 30.6. Отслеживание ошибок — Sentry

```bash
composer require sentry/sentry-symfony
```

```yaml
# config/packages/sentry.yaml
sentry:
    dsn: '%env(SENTRY_DSN)%'
    options:
        environment: '%kernel.environment%'
        traces_sample_rate: 0.1  # 10% запросов трассируются для performance-мониторинга (не только ошибки)
```

Sentry автоматически перехватывает необработанные исключения (через тот же `kernel.exception`, что мы разбирали в модуле 11/14) и присылает алерт с полным стектрейсом, окружением запроса (заголовки, параметры — с учётом фильтрации чувствительных данных), частотой повторения одинаковой ошибки, версией деплоя, на которой она произошла.

```php
// точечная отправка ошибки без прерывания выполнения (например, "не критично, но нужно знать")
\Sentry\captureMessage('Внешний платёжный сервис ответил с задержкой > 5с', \Sentry\Severity::warning());
```

**Важно про PII (личные данные)**: настройте фильтрацию перед отправкой в Sentry — email, номера карт, пароли не должны улетать в сторонний сервис по умолчанию:

```yaml
sentry:
    options:
        before_send: 'App\Sentry\ScrubSensitiveDataProcessor'
```

---

## 30.7. Health Checks и Readiness/Liveness Probes

Уже касались в модуле 17 — углубим различие для Kubernetes-окружений:

- **Liveness probe** — "жив ли процесс вообще?" Если нет — Kubernetes перезапускает под. Должен быть **максимально простым** (не проверять БД — если БД недоступна, но приложение живо, перезапуск пода не поможет и только усугубит нагрузку на и так недоступную БД).
- **Readiness probe** — "готов ли принимать трафик прямо сейчас?" Если нет — Kubernetes временно исключает под из балансировки, но не перезапускает. Здесь уже уместно проверять зависимости (БД, кэш).

```php
#[Route('/health/live', name: 'health_live', methods: ['GET'])]
public function liveness(): Response
{
    return $this->json(['status' => 'ok']); // просто "процесс жив и отвечает"
}

#[Route('/health/ready', name: 'health_ready', methods: ['GET'])]
public function readiness(Connection $db, CacheItemPoolInterface $cache): Response
{
    $checks = ['database' => $this->checkDatabase($db), 'cache' => $this->checkCache($cache)];
    $ready = !in_array(false, $checks, true);

    return $this->json(['status' => $ready ? 'ready' : 'not_ready', 'checks' => $checks],
        $ready ? 200 : 503);
}
```

---

## 30.8. Практика: наблюдаемость BookNest

1. Настроить структурированное JSON-логирование с Correlation ID для всех запросов.
2. Подключить Sentry для production-ошибок с фильтрацией PII.
3. Настроить `/metrics` с бизнес-метриками (`orders_total`, `order_amount_rubles`) и техническими (latency HTTP-запросов).
4. Развести `/health/live` и `/health/ready` для корректной работы в Kubernetes.
5. Добавить OpenTelemetry-трейсинг хотя бы для `CheckoutService::process()`, чтобы видеть breakdown времени по под-операциям.

---

## 30.9. Практика модуля 30

**Задание 1.** Реализуйте `CorrelationIdProcessor` для Monolog и убедитесь, что все логи одного HTTP-запроса содержат одинаковый `correlation_id` в JSON-выводе.

**Задание 2.** Настройте Prometheus-метрики `orders_total` (Counter) и `order_amount_rubles` (Histogram), откройте `/metrics` и убедитесь в корректном формате вывода.

**Задание 3.** Настройте Sentry (можно на бесплатном тарифе/self-hosted для учебных целей), намеренно вызовите исключение в контроллере и убедитесь, что оно появилось в Sentry с полным контекстом.

**Задание 4.** Разведите `/health/live` и `/health/ready`, объясните словами, почему liveness-проверка НЕ должна проверять доступность базы данных.

### Решения

<details>
<summary>Обсуждение задания 4</summary>

Если liveness-проверка включает проверку БД, а БД временно недоступна (например, происходит её плановое обслуживание или кратковременный сетевой сбой), Kubernetes воспримет это как "приложение мертво" и начнёт **перезапускать все поды** приложения. Это не решает проблему (БД всё ещё недоступна после рестарта) и создаёт дополнительную нагрузку — массовый рестарт подов означает, что после восстановления БД все поды одновременно начнут заново поднимать соединения, прогревать кэш и т.д. — "thundering herd" эффект, ухудшающий ситуацию вместо её исправления. Правильное решение: liveness проверяет только "процесс отвечает на запросы", а readiness (которая может временно исключить под из балансировки без перезапуска) — уже проверяет реальные зависимости.
</details>

---

## 30.10. Частые ошибки

1. **Логируют неструктурированный текст** вместо JSON с контекстными полями — теряется возможность эффективного поиска/агрегации в production.
2. **Не пробрасывают Correlation ID** в исходящие запросы к внешним сервисам — теряется связность трассировки на границе систем.
3. **Проверяют БД в liveness probe** — вызывает каскадные рестарты при временной недоступности зависимости.
4. **Отправляют чувствительные данные (пароли, номера карт, полные email)** в системы мониторинга без фильтрации — нарушение требований по защите персональных данных.
5. **Собирают метрики, но не настраивают алерты** — данные есть, но никто не узнаёт о проблеме, пока не придёт жалоба от пользователя.
6. **Путают назначение логов/метрик/трейсов** — пытаются построить дашборд latency по логам (болезненно медленно и дорого) вместо использования метрик, которые для этого предназначены.

---

## Чек-лист "Я умею" — Модуль 30

- [ ] Объяснить три столпа Observability и назначение каждого
- [ ] Настраивать структурированное (JSON) логирование с контекстными полями
- [ ] Реализовывать Correlation ID и пробрасывать его через границы систем
- [ ] Понимать основы distributed tracing и OpenTelemetry
- [ ] Собирать и экспортировать метрики для Prometheus (Counter/Gauge/Histogram)
- [ ] Настраивать отслеживание ошибок (Sentry) с фильтрацией чувствительных данных
- [ ] Разделять liveness и readiness проверки правильно, понимая их разное назначение

**Дальше:** [Модуль 31 — Продвинутое тестирование](31-prodvinutoe-testirovanie.md)
