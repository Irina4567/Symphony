# Модуль 22. Lock, RateLimiter, Semaphore

> Предыдущий модуль: [21 — Workflow Component](21-workflow-component.md)
>
> Это модуль про распределённые системы в миниатюре — примитивы, без которых любое приложение, работающее на нескольких серверах/воркерах одновременно, рано или поздно ловит race condition в production.

---

## 22.1. Проблема конкурентного доступа

Представим: пользователь дважды быстро нажимает "Оформить заказ" (двойной клик, медленная сеть — повторный запрос). Или два PHP-FPM воркера на разных серверах одновременно обрабатывают один и тот же cron-джоб (потому что cron настроен на нескольких серверах "на всякий случай"). Без защиты — двойное списание, дублирующиеся заказы, испорченные данные.

**Symfony Lock Component** решает эту проблему на уровне приложения — распределённая блокировка, работающая одинаково что на одном сервере, что на кластере из десятков.

```bash
composer require symfony/lock
```

---

## 22.2. Lock: базовое использование

```yaml
# config/packages/lock.yaml
framework:
    lock:
        default: '%env(LOCK_DSN)%'   # напр. redis://localhost, flock, semaphore, pdo
```

```php
use Symfony\Component\Lock\LockFactory;

class CheckoutService
{
    public function __construct(private LockFactory $lockFactory) {}

    public function process(PlaceOrderCommand $command, int $customerId): Order
    {
        $lock = $this->lockFactory->createLock("checkout-customer-$customerId", ttl: 30);

        if (!$lock->acquire()) {
            throw new \RuntimeException('Оформление заказа уже выполняется, подождите');
        }

        try {
            // вся логика оформления заказа — гарантированно эксклюзивно для данного customerId
            return $this->doProcess($command);
        } finally {
            $lock->release();
        }
    }
}
```

`ttl: 30` — блокировка автоматически "протухнет" через 30 секунд, даже если процесс, взявший её, аварийно упал и не успел вызвать `release()` — критично важно: **блокировки без TTL могут "зависнуть" навсегда** при падении процесса, заблокировав ресурс до ручного вмешательства.

### Блокирующий (ожидающий) захват

```php
$lock = $this->lockFactory->createLock('daily-report-generation');

$lock->acquire(blocking: true); // ждёт, пока лок не освободится, вместо немедленного false
try {
    $this->generateReport();
} finally {
    $lock->release();
}
```

### `synchronized()` — компактная обёртка (Symfony 6.4+)

```php
$result = $lock->synchronized(function () {
    return $this->doProcess();
});
// release() вызывается автоматически, в том числе при исключении
```

---

## 22.3. Где физически хранится блокировка (Store)

```
flock       — файловая блокировка, ТОЛЬКО для одного сервера (не подходит для кластера!)
semaphore   — System V семафоры, тоже только один сервер
redis       — распределённая блокировка через Redis, стандарт для кластера
pdo         — через таблицу в реляционной БД
zookeeper   — для очень требовательных к консистентности систем
combined    — консенсус нескольких stores (аналог алгоритма Redlock) — максимальная надёжность
```

**Частая ошибка production**: использовать `flock` (файловую блокировку) в кластере из нескольких серверов — каждый сервер видит только свою файловую систему, блокировка не имеет эффекта между серверами. Для кластера обязателен `redis`/`pdo`/`zookeeper`.

```dotenv
LOCK_DSN=redis://redis:6379
```

---

## 22.4. Практический пример: защита от двойной отправки формы

```php
#[Route('/checkout', methods: ['POST'])]
public function checkout(Request $request, LockFactory $lockFactory, CheckoutService $service): Response
{
    $idempotencyKey = $request->headers->get('X-Idempotency-Key')
        ?? throw new BadRequestHttpException('Требуется заголовок X-Idempotency-Key');

    $lock = $lockFactory->createLock("idempotency-$idempotencyKey", ttl: 60);

    if (!$lock->acquire()) {
        // запрос с таким же ключом уже обрабатывается ИЛИ был обработан — возвращаем предыдущий результат
        return $this->json(['status' => 'already_processing'], Response::HTTP_CONFLICT);
    }

    try {
        $order = $service->process(/* ... */);
        return $this->json($order, Response::HTTP_CREATED);
    } finally {
        $lock->release();
    }
}
```

Это паттерн **идемпотентности** — клиент (например, мобильное приложение при плохой сети) может безопасно повторить запрос с тем же `X-Idempotency-Key`, не рискуя создать дубль заказа. Крупные платёжные системы (Stripe и подобные) требуют именно такой заголовок от клиентов API.

---

## 22.5. RateLimiter — ограничение частоты запросов

Компонент для защиты от избыточной нагрузки: brute-force атаки на логин, злоупотребление API, защита дорогих операций (генерация PDF, отправка email).

```bash
composer require symfony/rate-limiter
```

```yaml
# config/packages/rate_limiter.yaml
framework:
    rate_limiter:
        login_attempts:
            policy: sliding_window
            limit: 5
            interval: '15 minutes'
        api_requests:
            policy: token_bucket
            limit: 100
            rate: { interval: '1 minute', amount: 100 }
```

### Политики ограничения

- **`fixed_window`** — простой счётчик, сбрасывается целиком в начале каждого интервала (проблема: "взрыв" запросов на границе окон).
- **`sliding_window`** — точнее учитывает распределение запросов во времени, сглаживает эффект границы окна.
- **`token_bucket`** — "ведро токенов", пополняемое с постоянной скоростью — позволяет короткие всплески (burst), но ограничивает средний темп.

```php
use Symfony\Component\RateLimiter\RateLimiterFactory;

class LoginRateLimiter
{
    public function __construct(
        #[Autowire(service: 'limiter.login_attempts')] private RateLimiterFactory $limiterFactory,
    ) {}

    public function checkAndConsume(string $identifier): void
    {
        $limiter = $this->limiterFactory->create($identifier); // напр. по IP или по email
        $limit = $limiter->consume(1);

        if (!$limit->isAccepted()) {
            throw new TooManyRequestsHttpException(
                $limit->getRetryAfter()->getTimestamp() - time(),
            );
        }
    }
}
```

```php
// LoginFormAuthenticator::authenticate()
public function authenticate(Request $request): Passport
{
    $this->loginRateLimiter->checkAndConsume($request->getClientIp());
    // ... дальше обычная логика
}
```

### Готовая защита логина "из коробки"

Symfony Security имеет встроенную интеграцию:
```yaml
security:
    firewalls:
        main:
            login_throttling:
                max_attempts: 5
                interval: '15 minutes'
```

Это, по сути, `RateLimiter` уже подключённый за вас для формы логина — но понимание того, что происходит "под капотом", позволяет применить тот же механизм к любому другому эндпоинту (не только логину).

---

## 22.6. Semaphore — ограничение количества одновременных операций

Отличие от Lock: Lock — эксклюзивный доступ (0 или 1 держатель), **Semaphore** — ограниченное **количество** одновременных держателей (например, "не больше 3 одновременных генераций PDF, чтобы не перегрузить CPU сервера"):

```php
use Symfony\Component\Semaphore\SemaphoreFactory;
use Symfony\Component\Semaphore\Store\RedisStore;

$semaphoreFactory = new SemaphoreFactory(new RedisStore($redis));
$semaphore = $semaphoreFactory->createSemaphore('pdf-generation', limit: 3);

if (!$semaphore->acquire()) {
    throw new \RuntimeException('Слишком много одновременных генераций PDF, попробуйте позже');
}

try {
    $this->generatePdf($order);
} finally {
    $semaphore->release();
}
```

---

## 22.7. Практика: защита BookNest от race condition

Сценарий: два покупателя одновременно покупают последний экземпляр книги с ограниченным тиражом.

```php
class PurchaseService
{
    public function __construct(
        private LockFactory $lockFactory,
        private BookRepository $bookRepository,
        private EntityManagerInterface $em,
    ) {}

    public function reserveStock(int $bookId, int $quantity): void
    {
        $lock = $this->lockFactory->createLock("book-stock-$bookId", ttl: 10);
        $lock->acquire(blocking: true);

        try {
            // ВАЖНО: перечитываем актуальное состояние ВНУТРИ блокировки,
            // а не полагаемся на объект, загруженный до захвата лока
            $this->em->clear();
            $book = $this->bookRepository->find($bookId);

            if ($book->getStockQuantity() < $quantity) {
                throw new \DomainException('Недостаточно книг на складе');
            }

            $book->decrementStock($quantity);
            $this->em->flush();
        } finally {
            $lock->release();
        }
    }
}
```

**Альтернатива без явного Lock** — оптимистичная блокировка на уровне БД через Doctrine `#[ORM\Version]` (пессимистичная альтернатива — `SELECT ... FOR UPDATE`). Explicit Lock Component предпочтителен, когда критическая секция включает не только БД (например, ещё и внешний API), а оптимистичная/пессимистичная блокировка БД — когда вся логика укладывается в границы одной транзакции.

---

## 22.8. Практика модуля 22

**Задание 1.** Реализуйте идемпотентность для `POST /api/orders` через `X-Idempotency-Key` и Lock Component.

**Задание 2.** Настройте RateLimiter для формы логина с `sliding_window` (5 попыток за 15 минут) и для публичного API каталога с `token_bucket` (100 запросов в минуту на IP).

**Задание 3.** Реализуйте `reserveStock()` с защитой от race condition при одновременной покупке последнего экземпляра ограниченного тиража, как в разделе 22.7.

**Задание 4.** Объясните словами (без кода), почему `flock`-store для Lock Component неприменим, если BookNest задеплоен на 3 сервера за балансировщиком.

### Решения

<details>
<summary>Решение задания 4 (обсуждение)</summary>

`flock` использует системный вызов блокировки файлов конкретной файловой системы конкретного сервера. Если приложение работает на 3 разных серверах, у каждого — своя независимая файловая система (если только это не общий сетевой диск, что редкость и само по себе рискованно из-за задержек). Процесс на сервере A, взявший `flock`-блокировку локального файла, никак не блокирует процесс на сервере B — тот увидит "свободный" файл и тоже захватит лок. Для кластера обязательно нужно общее внешнее хранилище состояния блокировки — Redis, реляционная БД, ZooKeeper — доступное со всех серверов одинаково.
</details>

---

## 22.9. Частые ошибки новичков

1. **Захватывают Lock без TTL** — при аварийном падении процесса блокировка "зависает" навсегда.
2. **Используют `flock`/`semaphore` (локальные stores) в многосерверном окружении** — блокировка не работает, как ожидается.
3. **Проверяют состояние ДО захвата блокировки, а не внутри неё** — классическая ошибка TOCTOU (time-of-check to time-of-use): между проверкой "есть ли книга на складе" и захватом лока другой процесс может успеть забрать последний экземпляр.
4. **Не освобождают Lock в `finally`** — при исключении внутри критической секции блокировка не снимается вовремя (хотя TTL спасёт со временем, но задержка нежелательна).
5. **Путают RateLimiter и Lock** — RateLimiter ограничивает *частоту* операций во времени, Lock обеспечивает *эксклюзивность* доступа — разные задачи, разные инструменты.

---

## Чек-лист "Я умею" — Модуль 22

- [ ] Объяснить проблему race condition и когда она возникает в веб-приложении
- [ ] Использовать Lock Component с правильным TTL и `finally`-освобождением
- [ ] Выбирать правильный Store (redis/pdo вместо flock) для многосерверного окружения
- [ ] Реализовывать идемпотентность API через Lock + Idempotency-Key
- [ ] Настраивать RateLimiter с разными политиками (fixed/sliding window, token bucket)
- [ ] Использовать Semaphore для ограничения числа одновременных тяжёлых операций
- [ ] Защищать критические участки от race condition (пример со складом)

**Дальше:** [Модуль 23 — Notifier и продвинутый Mailer](23-notifier-i-mailer.md)
