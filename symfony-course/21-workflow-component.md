# Модуль 21. Workflow Component

> Предыдущий модуль: [20 — Внутреннее устройство Symfony](20-vnutrennee-ustroistvo-symfony.md)

---

## 21.1. Проблема, которую мы уже решали "руками"

В модуле 18 мы вручную реализовали переходы состояний заказа (`markAsPaid()`, `ship()`, `cancel()`) с проверкой допустимых `TRANSITIONS`. Это рабочее решение для простого случая, но с ростом числа состояний и переходов (представьте заявку на возврат товара с 8 статусами и ветвящейся логикой одобрения) ручной код быстро превращается в нечитаемую кашу условий. **Workflow Component** формализует именно эту задачу.

```bash
composer require symfony/workflow
```

---

## 21.2. Базовые понятия: Place, Transition, Marking

- **Place (место)** — состояние, в котором может находиться объект (`new`, `paid`, `shipped`).
- **Transition (переход)** — правило "из каких мест в какое место можно перейти" плюс имя действия (`pay`, `ship`, `cancel`).
- **Marking** — текущее состояние конкретного объекта (в простом случае — одно place, но Workflow поддерживает и параллельные состояния — несколько одновременно "включённых" мест, актуально для сложных согласований).

```yaml
# config/packages/workflow.yaml
framework:
    workflows:
        order:
            type: state_machine        # для одного активного состояния; 'workflow' — если возможны параллельные
            audit_trail:
                enabled: true            # логирует все переходы
            marking_store:
                type: method
                property: status          # Doctrine-колонка/свойство, где хранится текущее состояние
            supports:
                - App\Entity\Order
            initial_marking: new
            places:
                - new
                - paid
                - shipped
                - cancelled
                - refunded
            transitions:
                pay:
                    from: new
                    to: paid
                ship:
                    from: paid
                    to: shipped
                cancel:
                    from: [new, paid]
                    to: cancelled
                refund:
                    from: shipped
                    to: refunded
```

---

## 21.3. Использование в коде

```php
use Symfony\Component\Workflow\WorkflowInterface;

class OrderService
{
    public function __construct(
        #[Target('order.state_machine')] private WorkflowInterface $orderWorkflow,
        private EntityManagerInterface $em,
    ) {}

    public function markAsPaid(Order $order): void
    {
        if (!$this->orderWorkflow->can($order, 'pay')) {
            throw new \DomainException('Нельзя оплатить заказ в статусе ' . $order->getStatus());
        }

        $this->orderWorkflow->apply($order, 'pay');
        $this->em->flush();
    }

    public function getAvailableTransitions(Order $order): array
    {
        return array_map(
            fn($t) => $t->getName(),
            $this->orderWorkflow->getEnabledTransitions($order),
        );
    }
}
```

Обратите внимание: вся логика допустимости переходов теперь **декларативно** описана в YAML, а не разбросана по `if`-условиям в коде сущности — изменение бизнес-правила (например, добавление нового статуса) требует правки конфига, а не рефакторинга кода состояний.

```twig
{% if workflow_can(order, 'ship') %}
    <button data-action="ship">Отправить</button>
{% endif %}

{{ workflow_marked_places(order)|join(', ') }}
```

---

## 21.4. Guards — условная блокировка перехода

Иногда перехода "по состоянию" недостаточно — нужна дополнительная бизнес-проверка (например, нельзя отправить заказ, если не заполнен адрес доставки):

```php
use Symfony\Component\Workflow\Event\GuardEvent;

#[AsEventListener(event: 'workflow.order.guard.ship')]
class ShipOrderGuard
{
    public function __invoke(GuardEvent $event): void
    {
        /** @var Order $order */
        $order = $event->getSubject();

        if ($order->getDeliveryAddress() === null) {
            $event->setBlocked(true, 'Не указан адрес доставки');
        }
    }
}
```

```php
if (!$workflow->can($order, 'ship')) {
    $transition = $workflow->buildTransitionBlockerList($order, 'ship');
    foreach ($transition as $blocker) {
        echo $blocker->getMessage(); // "Не указан адрес доставки"
    }
}
```

---

## 21.5. События жизненного цикла перехода

```
workflow.order.leave       → перед выходом из текущего place
workflow.order.transition  → сам переход происходит
workflow.order.enter        → перед входом в новое place
workflow.order.entered      → после входа (marking уже обновлён)
workflow.order.completed    → переход полностью завершён
```

```php
#[AsEventListener(event: 'workflow.order.entered.shipped')]
class NotifyCustomerOnShippedListener
{
    public function __invoke(EnteredEvent $event): void
    {
        /** @var Order $order */
        $order = $event->getSubject();
        // отправить событие/сообщение в очередь (модуль 14) — например, "заказ отправлен"
    }
}
```

Это прямая замена части ручной логики из модуля 14 (`OrderPlacedEvent`) — Workflow даёт **встроенную** систему событий для каждого этапа перехода, без необходимости вручную диспатчить кастомные события в каждом методе сервиса.

---

## 21.6. `type: workflow` — параллельные состояния (не только state machine)

Если объект может находиться в **нескольких** состояниях одновременно (классический пример — процесс согласования документа: "отправлен на ревью юристам" и "отправлен на ревью финансистам" параллельно, документ подписан только когда оба согласования завершены):

```yaml
framework:
    workflows:
        document_approval:
            type: workflow    # НЕ state_machine — поддерживает несколько активных мест
            marking_store:
                type: method
                property: marking
            places: [draft, legal_review, finance_review, approved, rejected]
            transitions:
                submit:
                    from: draft
                    to: [legal_review, finance_review]  # ОБА места активируются одновременно
                legal_approve:
                    from: legal_review
                    to: approved
                finance_approve:
                    from: finance_review
                    to: approved
```

Переход `approved` реально считается завершённым, когда **все** ветки процесса дошли до него — Workflow сам отслеживает это через marking (внутри это по сути битовая маска активных мест).

---

## 21.7. Практика: заявки на возврат в BookNest

Добавим полноценный процесс возврата книги с формализованным жизненным циклом вместо ручных `if`:

```yaml
framework:
    workflows:
        refund_request:
            type: state_machine
            marking_store:
                type: method
                property: status
            supports:
                - App\Entity\RefundRequest
            initial_marking: submitted
            places: [submitted, under_review, approved, rejected, refunded]
            transitions:
                start_review:
                    from: submitted
                    to: under_review
                approve:
                    from: under_review
                    to: approved
                reject:
                    from: under_review
                    to: rejected
                complete_refund:
                    from: approved
                    to: refunded
```

```php
#[AsEventListener(event: 'workflow.refund_request.guard.approve')]
class ApproveRefundGuard
{
    public function __invoke(GuardEvent $event): void
    {
        /** @var RefundRequest $refund */
        $refund = $event->getSubject();
        if ($refund->getDaysSincePurchase() > 30) {
            $event->setBlocked(true, 'Прошло больше 30 дней с момента покупки — возврат недоступен');
        }
    }
}
```

---

## 21.8. Практика модуля 21

**Задание 1.** Переведите ручную реализацию статусов `Order` из модуля 18 (`markAsPaid`/`ship`/`cancel`) на Workflow Component, сохранив внешний API сервиса (`OrderService::markAsPaid()` внутри теперь вызывает `$workflow->apply()`).

**Задание 2.** Добавьте Guard, блокирующий переход `cancel`, если заказ уже находится в статусе `shipped`.

**Задание 3.** Постройте визуализацию workflow: `php bin/console workflow:dump order | dot -Tpng -o workflow.png` (требует установленный Graphviz) — приложите получившуюся диаграмму к документации проекта.

**Задание 4.** Реализуйте `type: workflow` (не state_machine) для гипотетического процесса модерации отзыва — одновременная проверка на спам (автоматическая) и на релевантность (модератором), публикация только при прохождении обеих проверок.

---

## 21.9. Частые ошибки новичков

1. **Путают `state_machine` и `workflow`** — используют `state_machine`, когда на самом деле нужны параллельные состояния, и получают неожиданное поведение.
2. **Держат бизнес-правила допустимости перехода в коде сущности** параллельно с Workflow-конфигом — два источника истины расходятся со временем.
3. **Не используют Guards**, а проверяют дополнительные условия вручную после `$workflow->apply()` — переход уже произошёл, откатывать сложнее, чем предотвратить заранее.
4. **Забывают `audit_trail`** — при расследовании инцидентов ("почему заказ оказался отменён") нет истории переходов.

---

## Чек-лист "Я умею" — Модуль 21

- [ ] Конфигурировать `state_machine` через YAML (places, transitions, marking_store)
- [ ] Проверять и применять переходы через `WorkflowInterface`
- [ ] Использовать Guards для дополнительных условий перехода
- [ ] Подписываться на события жизненного цикла перехода (`entered`, `completed`)
- [ ] Понимать разницу `state_machine` vs `workflow` (параллельные состояния)
- [ ] Визуализировать workflow через `workflow:dump`

**Дальше:** [Модуль 22 — Lock, RateLimiter, Semaphore](22-lock-ratelimiter-semaphore.md)
