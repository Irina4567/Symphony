# Модуль 13. Тестирование

> Предыдущий модуль: [12 — API Platform](12-api-platform.md)

---

## 13.1. Зачем тесты и какие виды бывают

- **Unit-тесты** — проверяют один класс/метод в полной изоляции (без БД, без HTTP, без файловой системы). Быстрые (тысячи в секунду), точечные.
- **Functional-тесты (интеграционные)** — проверяют работу через реальный HTTP-стек Symfony (`Client`), с реальной (тестовой) БД. Медленнее, но проверяют "по-настоящему", как поведёт себя приложение.
- **End-to-End (e2e)** — через реальный браузер (Panther/Playwright), проверяют весь стек включая JS. Самые медленные, самые близкие к реальному пользовательскому опыту.

Правило пирамиды тестирования: **много unit-тестов, меньше functional, ещё меньше e2e** — так тестовый набор остаётся быстрым и его можно гонять при каждом коммите.

```bash
composer require --dev symfony/test-pack
```

`symfony/test-pack` ставит `phpunit/phpunit`, `symfony/phpunit-bridge`, `symfony/browser-kit`, `symfony/css-selector` — всё необходимое.

---

## 13.2. Настройка тестового окружения

```dotenv
# .env.test (коммитится)
KERNEL_CLASS='App\Kernel'
APP_SECRET='$ecretf0rt3st'
SYMFONY_DEPRECATIONS_HELPER=999999
```

Тестовая БД должна быть **отдельной** от dev — обычно через свою переменную `DATABASE_URL` в `.env.test.local`:
```dotenv
DATABASE_URL="postgresql://app:!ChangeMe!@127.0.0.1:5432/app_test?serverVersion=16&charset=utf8"
```

```bash
php bin/console doctrine:database:create --env=test
php bin/console doctrine:migrations:migrate --env=test -n
```

---

## 13.3. Unit-тесты: изолированная логика

Хороший кандидат для unit-теста — класс без зависимостей от Symfony/Doctrine, чистая логика (то, ради чего мы, например, выносили `PriceCalculator` в отдельный сервис в модуле 4):

```php
<?php

namespace App\Tests\Service;

use App\Service\PriceCalculator;
use PHPUnit\Framework\TestCase;

class PriceCalculatorTest extends TestCase
{
    public function testCalculateWithTaxAddsCorrectPercentage(): void
    {
        $calculator = new PriceCalculator(taxRate: 0.20);

        $result = $calculator->calculateWithTax(100_00); // 100 рублей в копейках

        self::assertSame(120_00, $result);
    }

    public function testApplyDiscountRoundsCorrectly(): void
    {
        $calculator = new PriceCalculator(taxRate: 0.20);

        $result = $calculator->applyDiscount(999, 10.0);

        self::assertSame(899, $result); // 999 * 0.9 = 899.1 → округление до 899
    }

    /** @dataProvider provideDiscountCases */
    public function testApplyDiscountVariousCases(int $price, float $discount, int $expected): void
    {
        $calculator = new PriceCalculator(taxRate: 0.0);
        self::assertSame($expected, $calculator->applyDiscount($price, $discount));
    }

    public static function provideDiscountCases(): iterable
    {
        yield 'без скидки' => [1000, 0.0, 1000];
        yield 'скидка 50%' => [1000, 50.0, 500];
        yield 'скидка 100%' => [1000, 100.0, 0];
    }
}
```

`@dataProvider` (или атрибут `#[DataProvider]` в новых версиях PHPUnit) — способ прогнать один и тот же тест-сценарий на разных входных данных без дублирования кода теста.

```bash
php bin/phpunit
php bin/phpunit --filter testApplyDiscountRoundsCorrectly
php bin/phpunit tests/Service/PriceCalculatorTest.php
```

---

## 13.4. Test Doubles: mock, stub

Когда тестируемый класс зависит от чего-то, что дорого/сложно/нежелательно использовать по-настоящему в тесте (внешний API, отправка email, файловая система), используются **тестовые дублёры**.

```php
class OrderNotifierTest extends TestCase
{
    public function testSendsEmailAfterOrderCreation(): void
    {
        $mailerMock = $this->createMock(MailerInterface::class);
        $mailerMock->expects(self::once())
            ->method('send')
            ->with(self::callback(fn(Email $email) => $email->getTo()[0]->getAddress() === 'customer@example.com'));

        $notifier = new OrderNotifier($mailerMock);
        $notifier->notify(new Order(/* ... */));
    }
}
```

Терминология:
- **Stub** — просто возвращает заранее заданное значение, не проверяет, был ли вызван (`willReturn`).
- **Mock** — дополнительно **проверяет**, что метод действительно был вызван, сколько раз и с какими аргументами (`expects(self::once())`).

```php
$repositoryStub = $this->createStub(BookRepository::class);
$repositoryStub->method('find')->willReturn(new Book());
```

---

## 13.5. Functional-тесты: WebTestCase

`WebTestCase` поднимает реальное ядро Symfony (в тестовом окружении) и эмулирует HTTP-запросы без реального сетевого стека — быстро, но по-настоящему проходит через роутинг, контроллеры, security и т.д.

```php
<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class CatalogControllerTest extends WebTestCase
{
    public function testCatalogPageIsAccessibleAndShowsBooks(): void
    {
        $client = static::createClient();
        $crawler = $client->request('GET', '/catalog');

        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Каталог');
        self::assertCount(3, $crawler->filter('.book-card'));
    }

    public function testBookNotFoundReturns404(): void
    {
        $client = static::createClient();
        $client->request('GET', '/catalog/999999');

        self::assertResponseStatusCodeSame(404);
    }
}
```

### Работа с формами через Crawler

```php
public function testAddBookThroughAdminForm(): void
{
    $client = static::createClient();
    $client->loginUser($this->getAdminUser()); // см. раздел 13.6 про аутентификацию в тестах

    $crawler = $client->request('GET', '/admin/books/new');

    $form = $crawler->selectButton('Сохранить')->form([
        'book[title]' => 'Тестовая книга',
        'book[priceKopecks]' => '150000',
    ]);

    $client->submit($form);

    self::assertResponseRedirects('/admin/books');
    $client->followRedirect();
    self::assertSelectorTextContains('.alert-success', 'Книга добавлена');
}
```

### Тестирование JSON API

```php
public function testCreateBookViaApiRequiresAdmin(): void
{
    $client = static::createClient();

    $client->request('POST', '/api/books', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
        'title' => 'Новая книга',
        'priceKopecks' => 100000,
        'authorId' => 1,
    ]));

    self::assertResponseStatusCodeSame(401); // не аутентифицирован
}

public function testCreateBookViaApiAsAdmin(): void
{
    $client = static::createClient();
    $client->loginUser($this->getAdminUser());

    $client->request('POST', '/api/books', server: ['CONTENT_TYPE' => 'application/json'], content: json_encode([
        'title' => 'Новая книга',
        'priceKopecks' => 100000,
        'authorId' => 1,
    ]));

    self::assertResponseStatusCodeSame(201);
    self::assertJsonStringEqualsJsonString(
        '{"title": "Новая книга", "priceKopecks": 100000}',
        $client->getResponse()->getContent(),
    );
}
```

---

## 13.6. Аутентификация в тестах

```php
$client->loginUser($user); // напрямую "залогинивает" объект User без реального прохождения формы логина
```

Для получения тестового пользователя обычно используют либо фикстуры, либо прямое создание в БД внутри теста:

```php
private function getAdminUser(): User
{
    $container = static::getContainer();
    $em = $container->get(EntityManagerInterface::class);

    $admin = $em->getRepository(User::class)->findOneBy(['email' => 'admin@booknest.test']);
    if (!$admin) {
        $admin = (new User())->setEmail('admin@booknest.test')->setRoles(['ROLE_ADMIN']);
        $admin->setPassword($container->get(UserPasswordHasherInterface::class)->hashPassword($admin, 'test1234'));
        $em->persist($admin);
        $em->flush();
    }

    return $admin;
}
```

`static::getContainer()` — специальный тестовый контейнер (доступен только в тестовом окружении), через который можно достать **любой** сервис, даже приватный — это осознанное исключение из правила "приватные сервисы недоступны напрямую" именно для нужд тестирования.

---

## 13.7. Изоляция и очистка данных между тестами

Каждый тест должен быть независим — не полагаться на состояние, оставленное другим тестом. Частые стратегии:

**1. Транзакция + rollback (DAMA Doctrine Test Bundle) — рекомендуемый подход:**
```bash
composer require --dev dama/doctrine-test-bundle
```
```yaml
# config/packages/test/dama_doctrine_test_bundle.yaml
dama_doctrine_test_bundle:
    enable_static_connection: true
```
Бандл автоматически оборачивает каждый тест в транзакцию и откатывает её после завершения — БД остаётся чистой между тестами без ручного кода, и это значительно быстрее полного пересоздания схемы.

**2. Пересоздание схемы перед прогоном всего набора тестов** (медленнее, но иногда нужно для e2e):
```bash
php bin/console doctrine:database:drop --env=test --force --if-exists
php bin/console doctrine:database:create --env=test
php bin/console doctrine:migrations:migrate --env=test -n
php bin/console doctrine:fixtures:load --env=test -n
```

---

## 13.8. Тестирование Doctrine-репозиториев (интеграционный уровень)

```php
class BookRepositoryTest extends KernelTestCase
{
    public function testFindAvailableExcludesUnavailableBooks(): void
    {
        self::bootKernel();
        $em = static::getContainer()->get(EntityManagerInterface::class);

        $available = (new Book())->setTitle('Доступна')->setIsAvailable(true);
        $unavailable = (new Book())->setTitle('Недоступна')->setIsAvailable(false);
        $em->persist($available);
        $em->persist($unavailable);
        $em->flush();

        $repository = $em->getRepository(Book::class);
        $result = $repository->findAvailable();

        self::assertCount(1, $result);
        self::assertSame('Доступна', $result[0]->getTitle());
    }
}
```

`KernelTestCase` — облегчённая версия `WebTestCase` без HTTP-клиента, только доступ к контейнеру/сервисам — используется, когда не нужен полный HTTP-цикл, а достаточно проверить работу сервиса/репозитория с реальным DI-контейнером.

---

## 13.9. Покрытие кода (Code Coverage)

```bash
php bin/phpunit --coverage-html var/coverage
# требует установленного xdebug или pcov
```

**Важно:** высокий процент покрытия — не самоцель. 100% покрытие не гарантирует отсутствие багов (тест может "покрывать" строку кода, не проверяя реальное поведение). Разумная стратегия: покрывайте тестами в первую очередь бизнес-логику (сервисы, voters, вычисления), а не геттеры/сеттеры.

---

## 13.10. Практика: тесты BookNest

**Unit:** `PriceCalculatorTest`, `OrderVoterTest` (модуль 10), кастомные Constraint-валидаторы из модуля 8.

**Functional:** каталог доступен всем, оформление заказа требует `ROLE_CUSTOMER`, отмена заказа доступна только владельцу.

```php
class CheckoutControllerTest extends WebTestCase
{
    public function testGuestIsRedirectedToLogin(): void
    {
        $client = static::createClient();
        $client->request('GET', '/checkout');

        self::assertResponseRedirects('/login');
    }

    public function testCustomerCanCompleteCheckout(): void
    {
        $client = static::createClient();
        $client->loginUser($this->getTestCustomer());

        // добавляем товар в корзину через сессию (или через реальный запрос POST /cart/add/{id})
        $client->request('POST', '/cart/add/1');
        $crawler = $client->request('GET', '/checkout');

        $form = $crawler->selectButton('Оформить заказ')->form([
            'checkout[customerName]' => 'Иван Иванов',
            'checkout[customerEmail]' => 'ivan@example.com',
            'checkout[deliveryMethod]' => 'pickup',
        ]);
        $client->submit($form);

        self::assertResponseRedirects();
    }
}
```

---

## 13.11. Практика модуля 13

**Задание 1.** Напишите unit-тесты для всех кастомных Constraint-валидаторов из модуля 8 (минимум 3 сценария на каждый: валидный, невалидный, граничный случай).

**Задание 2.** Настройте `dama/doctrine-test-bundle` и убедитесь, что данные, созданные в одном тесте, не "просачиваются" в следующий.

**Задание 3.** Напишите functional-тест, проверяющий полный сценарий "гость не может отменить чужой заказ" (403) и "владелец может отменить свой заказ" (редирект/200).

**Задание 4.** Настройте code coverage и добейтесь покрытия хотя бы 80% для директории `src/Service/`.

### Решения

<details>
<summary>Решение задания 3 (набросок)</summary>

```php
public function testCannotCancelSomeoneElsesOrder(): void
{
    $client = static::createClient();
    $order = $this->createOrderForUser('other@example.com');

    $client->loginUser($this->getTestCustomer()); // другой пользователь
    $client->request('POST', "/account/orders/{$order->getId()}/cancel");

    self::assertResponseStatusCodeSame(403);
}
```
</details>

---

## 13.12. Частые ошибки новичков

1. **Тестируют только "счастливый путь"** — забывают проверить граничные случаи, ошибки, отказы доступа.
2. **Пишут functional-тесты вместо unit-тестов там, где хватило бы unit** — тесты становятся медленными без необходимости.
3. **Не изолируют тесты друг от друга** — тесты начинают "плавать" (то проходят, то нет) в зависимости от порядка запуска.
4. **Используют production/dev БД для тестов** — тесты стирают реальные данные разработчика.
5. **Мокают слишком много** — тест начинает проверять не поведение системы, а то, что мок вызван правильно, теряя связь с реальностью (over-mocking).
6. **Игнорируют падающие тесты** ("потом починю") — тестовый набор перестаёт быть надёжным сигналом.

---

## Чек-лист "Я умею" — Модуль 13

- [ ] Различать unit/functional/e2e тесты и понимать пирамиду тестирования
- [ ] Писать unit-тесты с `@dataProvider`/`#[DataProvider]`
- [ ] Использовать mock/stub через `createMock`/`createStub`
- [ ] Писать functional-тесты через `WebTestCase`, работать с формами через Crawler
- [ ] Тестировать JSON API и аутентифицированные сценарии (`loginUser`)
- [ ] Изолировать тестовые данные (DAMA Doctrine Test Bundle)
- [ ] Осознанно относиться к покрытию кода, не гнаться за цифрой ради цифры

**Дальше:** [Модуль 14 — EventDispatcher и Messenger](14-events-i-messenger.md)
