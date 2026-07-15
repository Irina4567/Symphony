# Модуль 08. Валидация

> Предыдущий модуль: [07 — Формы](07-formy.md)

---

## 8.1. Validator Component — независимая проверка данных

Компонент `symfony/validator` можно использовать где угодно — не только в формах: в API-контроллерах, в консольных командах, в сервисах. Идея: объект помечается **constraints** (ограничениями), а специальный сервис `ValidatorInterface` проверяет, соответствует ли объект этим правилам, и возвращает список нарушений.

```php
use Symfony\Component\Validator\Validator\ValidatorInterface;

class BookImportService
{
    public function __construct(private ValidatorInterface $validator) {}

    public function import(Book $book): void
    {
        $errors = $this->validator->validate($book);

        if (count($errors) > 0) {
            throw new \InvalidArgumentException((string) $errors);
        }
        // ...
    }
}
```

---

## 8.2. Constraints на сущности

Ограничения задаются атрибутами прямо на свойствах:

```php
<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

#[ORM\Entity]
class Book
{
    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Укажите название книги')]
    #[Assert\Length(min: 2, max: 255, minMessage: 'Название слишком короткое')]
    private string $title;

    #[ORM\Column(type: 'text', nullable: true)]
    #[Assert\Length(max: 5000)]
    private ?string $description = null;

    #[ORM\Column]
    #[Assert\Positive(message: 'Цена должна быть положительным числом')]
    #[Assert\Range(min: 1, max: 100_000_00, notInRangeMessage: 'Цена должна быть от 1 копейки до 100 000 рублей')]
    private int $priceKopecks;

    #[ORM\ManyToOne(targetEntity: Author::class)]
    #[Assert\NotNull(message: 'Выберите автора')]
    private ?Author $author = null;

    #[ORM\Column(length: 20, unique: true)]
    #[Assert\Isbn(type: Assert\Isbn::ISBN_13, message: 'Некорректный ISBN')]
    private string $isbn;
}
```

### Наиболее употребимые constraints

```php
#[Assert\NotBlank]                         // не пустая строка/значение
#[Assert\NotNull]                          // не null (в отличие от NotBlank, пустая строка "" пройдёт)
#[Assert\Length(min: 2, max: 100)]
#[Assert\Email]
#[Assert\Url]
#[Assert\Regex(pattern: '/^\+7\d{10}$/', message: 'Введите телефон в формате +7XXXXXXXXXX')]
#[Assert\Range(min: 0, max: 5)]
#[Assert\Positive]
#[Assert\PositiveOrZero]
#[Assert\Choice(choices: ['new', 'paid', 'shipped', 'cancelled'])]
#[Assert\Count(min: 1, minMessage: 'В заказе должна быть хотя бы одна позиция')]
#[Assert\Type('integer')]
#[Assert\Unique]                           // элементы коллекции уникальны
#[Assert\Valid]                            // каскадная валидация вложенного объекта/коллекции объектов
#[Assert\Date]
#[Assert\GreaterThan('today')]
#[Assert\IsTrue]                           // для кастомной логики на геттере, см. ниже
```

### Каскадная валидация связанных объектов

По умолчанию Validator **не** проверяет вложенные объекты автоматически — нужно явно пометить `#[Assert\Valid]`:

```php
class Order
{
    #[Assert\Valid]
    #[Assert\Count(min: 1)]
    private Collection $items; // каждый OrderItem внутри тоже будет провалидирован по своим constraints
}
```

---

## 8.3. Группы валидации (Validation Groups)

Иногда одна и та же сущность требует разных правил в разных контекстах — например, при регистрации пароль обязателен, а при редактировании профиля — нет.

```php
class User
{
    #[Assert\NotBlank(groups: ['registration'])]
    #[Assert\Length(min: 8, groups: ['registration', 'password_change'])]
    private ?string $plainPassword = null;

    #[Assert\Email(groups: ['registration', 'Default'])]
    private string $email;
}
```

```php
$errors = $validator->validate($user, groups: ['registration']);
```

В формах:
```php
$resolver->setDefaults([
    'data_class' => User::class,
    'validation_groups' => ['registration'],
]);
```

Группа `Default` — используется, если группы явно не указаны; констрейнты без явной группы автоматически принадлежат к `Default`.

---

## 8.4. Кастомные Constraints

Когда стандартных правил не хватает — например, "email должен быть уникален в БД" или "цена со скидкой не может быть выше исходной цены".

### Простой кастомный constraint (без внешних зависимостей)

```php
#[\Attribute]
class ValidIsbnChecksum extends Constraint
{
    public string $message = 'Контрольная сумма ISBN некорректна.';
}
```

```php
class ValidIsbnChecksumValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof ValidIsbnChecksum) {
            throw new UnexpectedTypeException($constraint, ValidIsbnChecksum::class);
        }

        if ($value === null || $value === '') {
            return; // пустое значение — не наша забота, для этого есть NotBlank
        }

        if (!$this->isChecksumValid($value)) {
            $this->context->buildViolation($constraint->message)
                ->setParameter('{{ value }}', $value)
                ->addViolation();
        }
    }

    private function isChecksumValid(string $isbn): bool { /* ... */ return true; }
}
```

Использование:
```php
#[ValidIsbnChecksum]
private string $isbn;
```

Благодаря autoconfiguration `ValidIsbnChecksumValidator` **не нужно регистрировать вручную** — Symfony находит валидаторы по конвенции имени (`{ConstraintName}Validator`) и тегу `validator.constraint_validator`, который проставляется автоматически.

### Constraint с зависимостями (например, обращение к БД для проверки уникальности)

```php
class UniqueIsbnValidator extends ConstraintValidator
{
    public function __construct(private BookRepository $bookRepository) {}

    public function validate(mixed $value, Constraint $constraint): void
    {
        if ($this->bookRepository->findOneBy(['isbn' => $value]) !== null) {
            $this->context->buildViolation('Книга с таким ISBN уже существует.')
                ->addViolation();
        }
    }
}
```

Поскольку валидатор — обычный сервис, ему можно внедрить `BookRepository` через конструктор точно так же, как и любому другому сервису (модуль 04).

### Class-level constraint — правило, зависящее от нескольких полей

Если правило касается сочетания нескольких свойств (например, "скидочная цена не может быть выше базовой"), constraint вешается на **весь класс**, а не на отдельное поле:

```php
#[PriceDiscountValid]
class Book { /* ... */ }
```

```php
class PriceDiscountValidValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        /** @var Book $book */
        $book = $value;

        if ($book->getDiscountPriceKopecks() !== null
            && $book->getDiscountPriceKopecks() >= $book->getPriceKopecks()) {
            $this->context->buildViolation('Цена со скидкой должна быть меньше обычной цены')
                ->atPath('discountPriceKopecks')  // ошибка привязывается к конкретному полю в форме
                ->addViolation();
        }
    }
}
```

---

## 8.5. Валидация "на лету" (не через сущность)

Иногда нужно провалидировать произвольные данные без создания сущности — например, параметры входящего API-запроса:

```php
use Symfony\Component\Validator\Constraints as Assert;

$constraints = new Assert\Collection([
    'email' => [new Assert\NotBlank(), new Assert\Email()],
    'age'   => [new Assert\Type('integer'), new Assert\Range(min: 18, max: 120)],
]);

$violations = $validator->validate($requestData, $constraints);
```

Это удобно при работе с DTO (Data Transfer Object) для API — рекомендуемый подход в модуле 11.

---

## 8.6. Вывод ошибок валидации вручную (вне форм)

```php
$errors = $validator->validate($book);

if (count($errors) > 0) {
    $messages = [];
    foreach ($errors as $error) {
        $messages[$error->getPropertyPath()] = $error->getMessage();
    }
    return $this->json(['errors' => $messages], Response::HTTP_UNPROCESSABLE_ENTITY);
}
```

Это типичный паттерн для JSON API — разберём подробнее в модуле 11.

---

## 8.7. Практика: валидация BookNest

Добавим правило: заказ не может быть оформлен без email и хотя бы одной позиции, а email покупателя должен быть уникален среди активных подписок на рассылку (пример class-level constraint с зависимостью от репозитория):

```php
class Order
{
    #[Assert\NotBlank]
    #[Assert\Email]
    private string $customerEmail;

    #[Assert\Valid]
    #[Assert\Count(min: 1, minMessage: 'Добавьте хотя бы одну книгу в заказ')]
    private Collection $items;

    #[Assert\Choice(choices: ['courier', 'pickup'])]
    private string $deliveryMethod;
}
```

```php
class OrderItem
{
    #[Assert\Positive(message: 'Количество должно быть больше нуля')]
    #[Assert\LessThanOrEqual(value: 100, message: 'Слишком большое количество за один заказ')]
    private int $quantity;
}
```

---

## 8.8. Практика модуля 8

**Задание 1.** Добавьте constraints на `Author::$fullName` (обязательно, от 2 до 180 символов).

**Задание 2.** Напишите кастомный constraint `#[FutureDate]`, проверяющий, что дата публикации книги не в прошлом.

**Задание 3.** Реализуйте group-based валидацию для `User`: группа `registration` требует пароль, группа `profile_update` — нет.

**Задание 4.** Реализуйте валидацию входящего JSON для API создания отзыва (`text`, `rating` от 1 до 5) через `Assert\Collection`, без создания отдельной сущности.

### Решения

<details>
<summary>Решение задания 2</summary>

```php
#[\Attribute]
class FutureDate extends Constraint
{
    public string $message = 'Дата должна быть в будущем.';
}

class FutureDateValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        if ($value === null) {
            return;
        }
        if ($value instanceof \DateTimeInterface && $value <= new \DateTimeImmutable()) {
            $this->context->buildViolation($constraint->message)->addViolation();
        }
    }
}
```
</details>

---

## 8.9. Частые ошибки новичков

1. **Забывают `#[Assert\Valid]`** на связанных коллекциях — вложенные объекты "молча" не валидируются.
2. **Путают `NotBlank` и `NotNull`** — `NotBlank` также отклоняет пустую строку `""` и `0` (с оговорками про `allowNull`/`normalizer`), `NotNull` пропускает пустую строку.
3. **Дублируют валидацию бизнес-правил только в FormType**, а не на сущности — при создании объекта в другом месте (фикстуры, консольная команда, API) правило не срабатывает.
4. **Не обрабатывают ошибки валидации в API-контроллерах**, полагаясь только на форму — в чистом JSON API форм часто нет вообще, нужна ручная проверка через `ValidatorInterface`.
5. **Пишут сложную кросс-полевую логику в сеттерах сущности** вместо class-level constraint — это смешивает ответственность и усложняет тестирование.

---

## Чек-лист "Я умею" — Модуль 8

- [ ] Навешивать основные constraints на свойства сущности
- [ ] Использовать каскадную валидацию (`#[Assert\Valid]`) для связанных объектов
- [ ] Применять группы валидации для разных сценариев (регистрация/обновление)
- [ ] Писать кастомные property-level и class-level constraints, в том числе с зависимостями
- [ ] Валидировать произвольные данные (не сущности) через `Assert\Collection`
- [ ] Правильно возвращать ошибки валидации в JSON-ответе API

**Дальше:** [Модуль 09 — Security: аутентификация](09-security-autentifikaciya.md)
