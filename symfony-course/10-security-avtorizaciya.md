# Модуль 10. Security — авторизация

> Предыдущий модуль: [09 — Security: аутентификация](09-security-autentifikaciya.md)

---

## 10.1. Роли — простейший механизм авторизации

Роль — строка вида `ROLE_ADMIN`, `ROLE_CUSTOMER`, `ROLE_MANAGER`. Соглашение Symfony: **все роли должны начинаться с `ROLE_`** — это не просто стиль, а техническое требование системы безопасности (по этому префиксу Symfony отличает роли от прочих атрибутов доступа).

### Иерархия ролей

Чтобы не дублировать права (у админа "по умолчанию" должно быть всё, что есть у менеджера), используется `role_hierarchy`:

```yaml
# config/packages/security.yaml
security:
    role_hierarchy:
        ROLE_MANAGER: ROLE_CUSTOMER
        ROLE_ADMIN: [ROLE_MANAGER, ROLE_ALLOWED_TO_SWITCH]
        ROLE_SUPER_ADMIN: ROLE_ADMIN
```

Теперь пользователь с `ROLE_ADMIN` автоматически проходит проверки на `ROLE_MANAGER` и `ROLE_CUSTOMER`, хотя явно этих ролей у него в БД не хранится.

### Проверка ролей в разных местах

```php
// В контроллере (AbstractController)
$this->denyAccessUnlessGranted('ROLE_ADMIN');

// Атрибутом прямо на методе/классе контроллера (рекомендуется — декларативно, видно сразу в сигнатуре)
#[IsGranted('ROLE_ADMIN')]
public function delete(Book $book): Response { /* ... */ }

// В Twig
{% if is_granted('ROLE_ADMIN') %}...{% endif %}

// В произвольном сервисе
use Symfony\Component\Security\Core\Authorization\AuthorizationCheckerInterface;

class SomeService
{
    public function __construct(private AuthorizationCheckerInterface $authChecker) {}

    public function doSomething(): void
    {
        if (!$this->authChecker->isGranted('ROLE_ADMIN')) {
            throw new AccessDeniedException();
        }
    }
}
```

---

## 10.2. Voters — гибкая авторизация на уровне бизнес-логики

Ролей достаточно для простых случаев ("этот раздел только для админов"), но не хватает для правил вида **"пользователь может редактировать только свой собственный заказ"** — это уже не про роль, а про **отношение между пользователем и конкретным объектом**. Для этого в Symfony есть **Voters**.

```bash
php bin/console make:voter OrderVoter
```

```php
<?php

namespace App\Security\Voter;

use App\Entity\Order;
use App\Entity\User;
use Symfony\Component\Security\Core\Authentication\Token\TokenInterface;
use Symfony\Component\Security\Core\Authorization\Voter\Voter;

class OrderVoter extends Voter
{
    public const VIEW = 'ORDER_VIEW';
    public const EDIT = 'ORDER_EDIT';
    public const CANCEL = 'ORDER_CANCEL';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return in_array($attribute, [self::VIEW, self::EDIT, self::CANCEL], true)
            && $subject instanceof Order;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token): bool
    {
        $user = $token->getUser();

        if (!$user instanceof User) {
            return false; // неаутентифицированный пользователь — доступа нет
        }

        /** @var Order $order */
        $order = $subject;

        // администратор может всё
        if (in_array('ROLE_ADMIN', $user->getRoles(), true)) {
            return true;
        }

        return match ($attribute) {
            self::VIEW   => $order->getCustomer() === $user,
            self::EDIT   => $order->getCustomer() === $user && $order->getStatus() === 'new',
            self::CANCEL => $order->getCustomer() === $user && in_array($order->getStatus(), ['new', 'paid'], true),
            default      => false,
        };
    }
}
```

Использование — точно так же, как проверка ролей, но с передачей конкретного объекта:

```php
#[Route('/account/orders/{id}', name: 'account_order_show')]
#[IsGranted('ORDER_VIEW', subject: 'order')]
public function show(Order $order): Response
{
    return $this->render('account/order_show.html.twig', ['order' => $order]);
}
```

```twig
{% if is_granted('ORDER_CANCEL', order) %}
    <button>Отменить заказ</button>
{% endif %}
```

Благодаря autoconfiguration voter **не нужно регистрировать вручную** — Symfony находит все классы, наследующие `Voter`, и подключает их автоматически (тег `security.voter`).

### Как несколько voter'ов принимают решение

Если в приложении несколько voter'ов, за финальное решение отвечает **стратегия голосования** (`access_decision_manager`):

```yaml
security:
    access_decision_manager:
        strategy: affirmative # по умолчанию: разрешить, если ХОТЯ БЫ ОДИН voter разрешил
        # unanimous — разрешить, только если НИ ОДИН voter не запретил
        # consensus — разрешить, если "за" больше, чем "против"
```

`affirmative` — стратегия по умолчанию и в большинстве случаев она интуитивно понятна.

---

## 10.3. `#[IsGranted]` — декларативный доступ

```php
#[Route('/admin/books/{id}/edit', name: 'admin_book_edit')]
#[IsGranted('ROLE_ADMIN')]
public function edit(Book $book): Response { /* ... */ }

// с кастомным сообщением при отказе
#[IsGranted('ROLE_ADMIN', message: 'Доступ только для администраторов')]

// на весь класс контроллера сразу
#[IsGranted('ROLE_ADMIN')]
class AdminBookController extends AbstractController { /* ... */ }
```

`#[IsGranted]` можно вешать и на уровне класса, и на уровне отдельного метода — правило метода не отменяет правило класса, они **комбинируются** (оба должны быть выполнены).

---

## 10.4. getUser() и типизация текущего пользователя

```php
/** @var User $user */
$user = $this->getUser(); // может быть null, если не аутентифицирован!

if (!$user) {
    throw $this->createAccessDeniedException();
}
```

Более чистый способ — внедрение через `#[CurrentUser]`:

```php
use Symfony\Component\Security\Http\Attribute\CurrentUser;

#[Route('/account', name: 'account_index')]
public function index(#[CurrentUser] ?User $user): Response
{
    if (!$user) {
        return $this->redirectToRoute('app_login');
    }
    // ...
}
```

Так контроллер сразу получает типизированный объект `User`, а не абстрактный `UserInterface`, требующий приведения типа.

---

## 10.5. Проверка авторизации в шаблонах для конкретного объекта

```twig
{% if is_granted('ORDER_EDIT', order) %}
    <a href="{{ path('account_order_edit', {id: order.id}) }}">Редактировать</a>
{% endif %}
```

---

## 10.6. ACL — когда и зачем (кратко)

Классический компонент Access Control List (ACL) в Symfony **устарел и удалён** из ядра — современный подход к сложной, детальной авторизации на уровне отдельных объектов — это именно **Voters**, показанные выше, часто в комбинации с полями в самой сущности (`$owner`, `$sharedWith` и т.д.). Если нужна действительно сложная матрица прав (мульти-тенантные системы, шаринг документов с разными уровнями доступа) — паттерн Voter расширяется дополнительной моделью прав в БД (например, таблица `permissions` со связью пользователь-объект-право), но сам механизм проверки остаётся voter-ом.

---

## 10.7. Практика: авторизация BookNest

- `ROLE_ADMIN` — полный доступ к `/admin/*`.
- `ROLE_CUSTOMER` (базовая роль всех зарегистрированных) — может видеть и отменять **только свои** заказы.
- Гости (неаутентифицированные) — видят каталог, но не могут оформить заказ.

```yaml
security:
    role_hierarchy:
        ROLE_ADMIN: ROLE_CUSTOMER

    access_control:
        - { path: ^/admin, roles: ROLE_ADMIN }
        - { path: ^/account, roles: ROLE_CUSTOMER }
        - { path: ^/checkout, roles: ROLE_CUSTOMER }
        - { path: ^/, roles: PUBLIC_ACCESS }
```

```php
#[Route('/account/orders/{id}/cancel', name: 'account_order_cancel', methods: ['POST'])]
#[IsGranted('ORDER_CANCEL', subject: 'order')]
public function cancel(Order $order, EntityManagerInterface $em): Response
{
    $order->setStatus('cancelled');
    $em->flush();

    $this->addFlash('success', 'Заказ отменён');
    return $this->redirectToRoute('account_order_show', ['id' => $order->getId()]);
}
```

---

## 10.8. Практика модуля 10

**Задание 1.** Настройте `role_hierarchy`, чтобы `ROLE_ADMIN` автоматически включал `ROLE_CUSTOMER`.

**Задание 2.** Напишите `BookVoter` с атрибутом `BOOK_EDIT`, разрешающим редактирование книги либо администратору, либо (в гипотетической модели "авторских кабинетов") самому автору книги, если он же зарегистрированный пользователь.

**Задание 3.** Добавьте в шаблон списка заказов кнопку "Отменить", видимую только если `is_granted('ORDER_CANCEL', order)` возвращает `true`.

**Задание 4.** Напишите unit-тест на `OrderVoter` (пригодится модуль 13 — но попробуйте уже сейчас: создайте `Order`, `User`, замокайте `TokenInterface`, проверьте разные комбинации через `voteOnAttribute` — метод `protected`, поэтому тестировать нужно через публичный `vote()` или сделать voter частично доступным для теста).

### Решения

<details>
<summary>Решение задания 4 (набросок)</summary>

```php
class OrderVoterTest extends TestCase
{
    public function testOwnerCanViewOwnOrder(): void
    {
        $user = new User();
        $order = new Order();
        $order->setCustomer($user);

        $token = $this->createMock(TokenInterface::class);
        $token->method('getUser')->willReturn($user);

        $voter = new OrderVoter();
        $result = $voter->vote($token, $order, [OrderVoter::VIEW]);

        self::assertSame(Voter::ACCESS_GRANTED, $result);
    }
}
```
</details>

---

## 10.9. Частые ошибки новичков

1. **Проверяют владение объектом через роли** вместо voter'ов — роли не предназначены для проверки "чей это объект", это ответственность Voter.
2. **Забывают проверить, что `getUser()` не `null`**, прежде чем обращаться к его методам — падение с `Error: Call to a member function ... on null` для гостей.
3. **Пишут логику авторизации прямо в контроллере длинными `if`** вместо выноса в voter — это не масштабируется и не переиспользуется между контроллером/Twig/API.
4. **Не используют `role_hierarchy`** и дублируют роли на каждого пользователя (`['ROLE_ADMIN', 'ROLE_CUSTOMER', 'ROLE_USER']` вручную).
5. **Путают `denyAccessUnlessGranted`/`#[IsGranted]` без subject** — если voter ожидает объект (`ORDER_VIEW`), а объект не передан, voter просто не сработает (`supports()` вернёт `false`), и решение примут другие voter'ы/роли, что может привести к неожиданному разрешению или ошибке "no voter has voted".

---

## Чек-лист "Я умею" — Модуль 10

- [ ] Настраивать `role_hierarchy` и понимать, зачем она нужна
- [ ] Проверять роли в контроллере, Twig, сервисе, через `#[IsGranted]`
- [ ] Писать Voters для авторизации на уровне конкретных объектов
- [ ] Понимать стратегии `access_decision_manager` (affirmative/unanimous/consensus)
- [ ] Использовать `#[CurrentUser]` для типизированного доступа к текущему пользователю
- [ ] Объяснить, почему ACL заменён на Voters в современном Symfony

**Дальше:** [Модуль 11 — Serializer и REST API](11-serializer-i-rest-api.md)
