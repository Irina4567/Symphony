# Модуль 15. Кэширование и консольные команды

> Предыдущий модуль: [14 — EventDispatcher и Messenger](14-events-i-messenger.md)

---

## Часть 1. Кэширование

### 15.1. Cache Component: PSR-6 и PSR-16

Symfony предоставляет две совместимые (стандартизированные PHP-FIG) абстракции кэша:

- **PSR-6 (`CacheItemPoolInterface`)** — низкоуровневый, объектный API, используется большинством внутренних компонентов Symfony.
- **PSR-16 (`CacheInterface`, "Simple Cache")** — упрощённый key-value API, обычно удобнее для прикладного кода.

В прикладном коде почти всегда используется удобная обёртка `Symfony\Contracts\Cache\CacheInterface` с методом `get()`, реализующим паттерн "получить или вычислить и закэшировать" (cache-aside):

```php
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;

class CatalogService
{
    public function __construct(
        private CacheInterface $cache,
        private BookRepository $bookRepository,
    ) {}

    public function getFeaturedBooks(): array
    {
        return $this->cache->get('catalog.featured_books', function (ItemInterface $item) {
            $item->expiresAfter(3600); // TTL — 1 час
            return $this->bookRepository->findFeatured();
        });
    }
}
```

Ключевая особенность: если несколько запросов одновременно "промахнутся" мимо кэша (cache miss), Symfony использует механизм **"замка" (probabilistic early expiration / lock)**, чтобы не допустить одновременного пересчёта одного и того же значения десятками параллельных запросов ("cache stampede") — это встроенная защита, недоступная в "наивной" реализации кэша через `if ($cache->has()) {...} else {...}`.

### 15.2. Адаптеры (где физически хранится кэш)

```yaml
# config/packages/cache.yaml
framework:
    cache:
        app: cache.adapter.redis
        default_redis_provider: '%env(REDIS_URL)%'
```

Основные адаптеры:
- `cache.adapter.filesystem` — файлы на диске (дефолт, годится для одного сервера).
- `cache.adapter.redis` — Redis, стандарт для production с несколькими инстансами приложения.
- `cache.adapter.apcu` — в памяти процесса (очень быстро, но не разделяется между разными PHP-FPM воркерами/серверами).
- `cache.adapter.array` — только в памяти текущего запроса, используется в тестах.

### 15.3. Именованные кэш-пулы

Часто удобно иметь отдельные пулы для разных типов данных (разный TTL, разное хранилище):

```yaml
framework:
    cache:
        pools:
            catalog.cache:
                adapter: cache.adapter.redis
                default_lifetime: 3600
            session.cache:
                adapter: cache.adapter.apcu
                default_lifetime: 600
```

```php
class CatalogService
{
    public function __construct(
        #[Autowire(service: 'catalog.cache')] private CacheInterface $catalogCache,
    ) {}
}
```

### 15.4. Инвалидация кэша через теги

Проблема "протухшего" кэша — одна из классических сложных задач ("There are only two hard things in Computer Science: cache invalidation and naming things"). Symfony Cache поддерживает **теги**, позволяющие инвалидировать группы связанных записей одним вызовом:

```yaml
framework:
    cache:
        app: cache.adapter.redis_tag_aware  # обязательно tag-aware адаптер
```

```php
use Symfony\Contracts\Cache\TagAwareCacheInterface;

class CatalogService
{
    public function __construct(private TagAwareCacheInterface $cache) {}

    public function getBooksByCategory(int $categoryId): array
    {
        return $this->cache->get("catalog.category.$categoryId", function (ItemInterface $item) use ($categoryId) {
            $item->expiresAfter(3600);
            $item->tag(['catalog', "category-$categoryId"]);
            return $this->bookRepository->findByCategoryId($categoryId);
        });
    }
}

class BookAdminService
{
    public function __construct(private TagAwareCacheInterface $cache) {}

    public function afterBookUpdated(): void
    {
        $this->cache->invalidateTags(['catalog']); // сбросит ВСЕ записи с этим тегом одним вызовом
    }
}
```

### 15.5. HTTP-кэширование (Reverse Proxy / Gateway Cache)

Кроме кэша "внутри" приложения, Symfony поддерживает HTTP-уровневое кэширование по стандартным заголовкам `Cache-Control`, `ETag`, `Last-Modified` — это позволяет reverse-proxy (Varnish, CDN, или встроенный `HttpCache` Symfony) отдавать ответ **вообще не доходя до PHP**:

```php
#[Route('/catalog', name: 'catalog_index')]
public function index(BookRepository $bookRepository): Response
{
    $response = $this->render('catalog/index.html.twig', [
        'books' => $bookRepository->findAvailable(),
    ]);

    $response->setPublic();
    $response->setMaxAge(600);              // браузер/прокси может отдавать закэшированную копию 10 минут
    $response->setSharedMaxAge(3600);        // прокси/CDN — час (обычно дольше, чем для конечного браузера)

    return $response;
}
```

Валидационное кэширование через `ETag` — сервер всегда обрабатывает запрос, но может ответить дёшево (`304 Not Modified`) без передачи тела:

```php
if ($response->isNotModified($request)) {
    return $response; // 304, тело не передаётся — экономия трафика
}
```

Это уже более продвинутая тема (Gateway Cache Pattern), детально прорабатывается на уровне production-инфраструктуры (модуль 17).

---

## Часть 2. Console-команды

### 15.6. Зачем свои консольные команды

Помимо кэша, разберём **Console Component** — второй "выход" из вашего приложения помимо HTTP: пакетные операции, cron-задачи, обслуживание, импорт/экспорт данных, DevOps-утилиты для команды.

```bash
php bin/console make:command app:import-books
```

```php
<?php

namespace App\Command;

use App\Entity\Book;
use App\Entity\Author;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\{AsCommand, Argument, Option};
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:import-books',
    description: 'Импортирует книги из CSV-файла в каталог',
)]
class ImportBooksCommand extends Command
{
    public function __construct(private EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('file', InputArgument::REQUIRED, 'Путь к CSV-файлу')
            ->addOption('dry-run', null, InputOption::VALUE_NONE, 'Только проверить, не сохранять в БД')
            ->addOption('batch-size', null, InputOption::VALUE_REQUIRED, 'Размер батча для flush()', '500');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $filePath = $input->getArgument('file');
        $dryRun = $input->getOption('dry-run');
        $batchSize = (int) $input->getOption('batch-size');

        if (!file_exists($filePath)) {
            $io->error("Файл не найден: $filePath");
            return Command::FAILURE;
        }

        $rows = array_map('str_getcsv', file($filePath));
        $header = array_shift($rows);

        $io->progressStart(count($rows));
        $imported = 0;

        foreach ($rows as $i => $row) {
            $data = array_combine($header, $row);

            $book = (new Book())
                ->setTitle($data['title'])
                ->setPriceKopecks((int) $data['price_kopecks']);

            if (!$dryRun) {
                $this->em->persist($book);
                if (($i + 1) % $batchSize === 0) {
                    $this->em->flush();
                    $this->em->clear();
                }
            }

            $imported++;
            $io->progressAdvance();
        }

        if (!$dryRun) {
            $this->em->flush();
        }

        $io->progressFinish();
        $io->success(sprintf('%s %d книг%s', $dryRun ? 'Проверено' : 'Импортировано', $imported, $dryRun ? ' (dry-run, ничего не сохранено)' : ''));

        return Command::SUCCESS;
    }
}
```

```bash
php bin/console app:import-books data/books.csv
php bin/console app:import-books data/books.csv --dry-run
php bin/console app:import-books data/books.csv --batch-size=1000
```

### 15.7. SymfonyStyle — красивый вывод

`SymfonyStyle` — обёртка над `InputInterface`/`OutputInterface` с готовыми методами для типового UX консольных утилит:

```php
$io->title('Импорт книг');
$io->section('Проверка файла');
$io->text('Начинаем обработку...');
$io->success('Готово!');
$io->warning('Найдены дубликаты ISBN');
$io->error('Файл повреждён');
$io->table(['Поле', 'Значение'], [['title', 'Чистый код'], ['price', '1200']]);
$io->ask('Введите имя файла');
$io->confirm('Продолжить?', default: false);
$io->choice('Выберите формат', ['CSV', 'JSON', 'XML']);
```

### 15.8. Верификация ввода и интерактивность

```php
protected function interact(InputInterface $input, OutputInterface $output): void
{
    if (!$input->getArgument('file')) {
        $io = new SymfonyStyle($input, $output);
        $file = $io->ask('Укажите путь к CSV-файлу для импорта');
        $input->setArgument('file', $file);
    }
}
```

`interact()` вызывается **до** `execute()`, только в интерактивном режиме (не при `--no-interaction`) — удобно для команд, которые могут запрашивать недостающие параметры у человека, но не должны "виснуть" в CI/cron-контексте.

### 15.9. Внедрение зависимостей в команды

Команды — обычные сервисы, поэтому DI работает точно так же, как везде (модуль 04):

```php
#[AsCommand(name: 'app:cleanup-stale-orders')]
class CleanupStaleOrdersCommand extends Command
{
    public function __construct(
        private OrderRepository $orderRepository,
        private EntityManagerInterface $em,
        #[Autowire('%app.stale_order_timeout_minutes%')] private int $timeoutMinutes,
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $threshold = new \DateTimeImmutable("-{$this->timeoutMinutes} minutes");
        $staleOrders = $this->orderRepository->findStaleOrders($threshold);

        foreach ($staleOrders as $order) {
            $order->setStatus('cancelled');
        }
        $this->em->flush();

        $output->writeln(sprintf('Отменено зависших заказов: %d', count($staleOrders)));
        return Command::SUCCESS;
    }
}
```

### 15.10. Планирование запуска: cron vs Scheduler

Классический способ — системный cron:
```cron
*/5 * * * * cd /var/www/booknest && php bin/console app:cleanup-stale-orders >> var/log/cron.log 2>&1
```

Как обсуждалось в модуле 14, современная альтернатива — Symfony Scheduler, если хочется держать расписание как код в репозитории, а не в системном crontab.

### 15.11. Тестирование команд

```php
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Component\Console\Tester\CommandTester;

class ImportBooksCommandTest extends KernelTestCase
{
    public function testImportsBooksFromValidCsv(): void
    {
        self::bootKernel();
        $application = new Application(self::$kernel);

        $command = $application->find('app:import-books');
        $commandTester = new CommandTester($command);

        $commandTester->execute([
            'file' => __DIR__ . '/fixtures/valid_books.csv',
            '--dry-run' => true,
        ]);

        $commandTester->assertCommandIsSuccessful();
        self::assertStringContainsString('Проверено', $commandTester->getDisplay());
    }
}
```

---

## 15.12. Практика: команда импорта и кэш каталога BookNest

Скомбинируем — команда импорта из CSV должна инвалидировать кэш каталога после завершения:

```php
protected function execute(InputInterface $input, OutputInterface $output): int
{
    // ... импорт как выше ...

    $this->cache->invalidateTags(['catalog']);
    $io->note('Кэш каталога сброшен');

    return Command::SUCCESS;
}
```

---

## 15.13. Практика модуля 15

**Задание 1.** Закэшируйте `CatalogService::getFeaturedBooks()` с TTL 1 час и тегом `catalog`, инвалидируйте тег при любом изменении книги через `AdminBookController`.

**Задание 2.** Напишите консольную команду `app:generate-sitemap`, которая выгружает все `id` и `updatedAt` доступных книг в `public/sitemap.xml`.

**Задание 3.** Добавьте `--dry-run` и прогресс-бар (`$io->progressStart/Advance/Finish`) в команду импорта.

**Задание 4.** Настройте HTTP-кэширование (`setPublic()`, `setSharedMaxAge()`) для страницы каталога и проверьте заголовки ответа через `curl -I`.

### Решения

<details>
<summary>Решение задания 1</summary>

```php
// CatalogService
public function getFeaturedBooks(): array
{
    return $this->cache->get('catalog.featured', function (ItemInterface $item) {
        $item->expiresAfter(3600);
        $item->tag(['catalog']);
        return $this->bookRepository->findFeatured();
    });
}
```
```php
// AdminBookController::edit(), после $em->flush():
$this->cache->invalidateTags(['catalog']);
```
</details>

---

## 15.14. Частые ошибки новичков

1. **Кэшируют данные без TTL и без инвалидации** — устаревшие данные показываются пользователям бесконечно долго.
2. **Не используют tag-aware адаптер**, пытаясь вызвать `invalidateTags()` — получают ошибку или тихо не работающую инвалидацию.
3. **Забывают, что `filesystem`-адаптер не разделяется между несколькими серверами** — при горизонтальном масштабировании нужен Redis/Memcached.
4. **Пишут "тяжёлую" логику прямо в `execute()`** консольной команды вместо вызова сервиса — команда должна быть тонким слоем над бизнес-логикой (тем же сервисом, что используется, например, в контроллере), а не местом, где эта логика реализуется впервые.
5. **Забывают `Command::SUCCESS`/`Command::FAILURE`** возвращаемое значение — CI/cron не может определить, была ли команда успешной, если она всегда возвращает `0` по умолчанию независимо от результата.
6. **Не тестируют консольные команды** — ошибки в редко запускаемых cron-задачах обнаруживаются только в production, часто поздно.

---

## Чек-лист "Я умею" — Модуль 15

- [ ] Использовать `CacheInterface::get()` с TTL для паттерна cache-aside
- [ ] Настраивать разные адаптеры и именованные кэш-пулы
- [ ] Инвалидировать кэш через теги
- [ ] Настраивать базовое HTTP-кэширование ответов
- [ ] Создавать консольные команды с аргументами, опциями, интерактивностью
- [ ] Пользоваться `SymfonyStyle` для качественного консольного UX
- [ ] Тестировать команды через `CommandTester`

**Дальше:** [Модуль 16 — Frontend и Symfony UX](16-frontend-symfony-ux.md)
