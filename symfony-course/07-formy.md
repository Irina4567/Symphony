# Модуль 07. Формы

> Предыдущий модуль: [06 — Doctrine ORM: продвинутый уровень](06-doctrine-orm-prodvinutyj.md)

---

## 7.1. Зачем нужен Form Component, если можно читать `$request->request`

Компонент форм Symfony решает сразу несколько задач:

- **Рендеринг** полей формы с автоматической генерацией HTML.
- **Заполнение объекта данными** из запроса (`$request` → сущность).
- **Валидация** (интеграция с Validator, модуль 08).
- **Защита от CSRF** "из коробки".
- **Преобразование типов** (строка из `<input>` → `DateTimeImmutable`, число и т.д.).
- **Переиспользование** — один и тот же FormType используется и для создания, и для редактирования.

Ручная обработка `$request->request->get('title')` полей за полем быстро становится неподдерживаемой на сколько-нибудь сложной форме (десяток полей, вложенные объекты, файлы, коллекции).

---

## 7.2. Первый FormType

```bash
php bin/console make:form BookType Book
```

```php
<?php

namespace App\Form;

use App\Entity\Book;
use App\Entity\Author;
use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\Extension\Core\Type\{TextType, TextareaType, IntegerType, CheckboxType, SubmitType};
use Symfony\Component\Form\FormBuilderInterface;
use Symfony\Component\OptionsResolver\OptionsResolver;

class BookType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('title', TextType::class, [
                'label' => 'Название',
            ])
            ->add('description', TextareaType::class, [
                'required' => false,
                'label' => 'Описание',
            ])
            ->add('priceKopecks', IntegerType::class, [
                'label' => 'Цена (в копейках)',
            ])
            ->add('isAvailable', CheckboxType::class, [
                'required' => false,
                'label' => 'В наличии',
            ])
            ->add('author', EntityType::class, [
                'class' => Author::class,
                'choice_label' => 'fullName',
                'label' => 'Автор',
            ])
            ->add('save', SubmitType::class, ['label' => 'Сохранить']);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Book::class,
        ]);
    }
}
```

`data_class` — ключевая опция: она говорит форме, что объектом-носителем данных является `Book`. Форма будет и читать из объекта (для предзаполнения), и записывать в объект (после отправки).

---

## 7.3. Обработка формы в контроллере

```php
<?php

namespace App\Controller;

use App\Entity\Book;
use App\Form\BookType;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/admin/books', name: 'admin_book_')]
class AdminBookController extends AbstractController
{
    #[Route('/new', name: 'new', methods: ['GET', 'POST'])]
    public function new(Request $request, EntityManagerInterface $em): Response
    {
        $book = new Book();
        $form = $this->createForm(BookType::class, $book);

        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $em->persist($book);
            $em->flush();

            $this->addFlash('success', 'Книга добавлена');
            return $this->redirectToRoute('admin_book_index');
        }

        return $this->render('admin/book/new.html.twig', [
            'form' => $form,
        ]);
    }

    #[Route('/{id}/edit', name: 'edit', methods: ['GET', 'POST'])]
    public function edit(Book $book, Request $request, EntityManagerInterface $em): Response
    {
        $form = $this->createForm(BookType::class, $book);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $em->flush(); // $book уже MANAGED — persist() не нужен
            $this->addFlash('success', 'Книга обновлена');
            return $this->redirectToRoute('admin_book_index');
        }

        return $this->render('admin/book/edit.html.twig', [
            'book' => $book,
            'form' => $form,
        ]);
    }
}
```

### Разбор `handleRequest()`

Один и тот же код обрабатывает **и** первый показ формы (GET, форма пустая или предзаполненная), **и** отправку (POST):

- Если запрос **не был отправлен** (`GET` или POST без данных этой формы) — `isSubmitted()` вернёт `false`, и код просто отрисует форму.
- Если запрос **был отправлен** — `handleRequest()` заполняет объект `$book` данными из запроса и запускает валидацию. `isValid()` проверяет, прошла ли валидация (constraints, модуль 08).

Это и есть классический паттерн **PRG (Post/Redirect/Get)**: успешный POST завершается редиректом (чтобы обновление страницы не отправляло форму повторно), провалившийся — повторно рендерит форму с ошибками.

---

## 7.4. Рендеринг формы в Twig

**Полностью автоматический рендеринг (быстро, но менее гибко):**
```twig
{{ form(form) }}
```

**Ручной рендеринг по частям (типичный случай в реальном проекте):**
```twig
{{ form_start(form) }}
    {{ form_errors(form) }}

    <div class="field">
        {{ form_label(form.title) }}
        {{ form_widget(form.title) }}
        {{ form_errors(form.title) }}
    </div>

    <div class="field">
        {{ form_label(form.priceKopecks) }}
        {{ form_widget(form.priceKopecks) }}
        {{ form_errors(form.priceKopecks) }}
    </div>

    {{ form_rest(form) }} {# отрисует все оставшиеся, ещё не выведенные вручную поля #}
{{ form_end(form) }}
```

`form_rest()` — подстраховка: если добавили новое поле в FormType, но забыли добавить в шаблон, оно всё равно выведется (без стилизации) вместо того, чтобы "потеряться" и вызвать ошибку валидации CSRF/недостающего поля.

### Form Themes — кастомизация внешнего вида

Symfony поддерживает "темы форм" — можно переопределить, как рендерится **каждый** виджет глобально (например, обернуть все поля в Bootstrap-разметку):

```yaml
# config/packages/twig.yaml
twig:
    form_themes: ['bootstrap_5_layout.html.twig']
```

Или создать собственную тему — файл с переопределёнными блоками (`{% block form_row %}` и т.д.) — стандартный, но не самый быстрый путь для полной кастомизации.

---

## 7.5. Основные типы полей

```php
use Symfony\Component\Form\Extension\Core\Type\{
    TextType, TextareaType, EmailType, PasswordType, IntegerType, NumberType,
    ChoiceType, CheckboxType, DateType, DateTimeType, FileType, HiddenType
};
```

```php
->add('category', ChoiceType::class, [
    'choices' => [
        'Художественная литература' => 'fiction',
        'Техническая литература' => 'tech',
    ],
    'expanded' => false,  // false = <select>, true = radio/checkbox
    'multiple' => false,
])
->add('publishedAt', DateType::class, [
    'widget' => 'single_text', // одно поле вместо трёх select'ов день/месяц/год
])
->add('cover', FileType::class, [
    'required' => false,
    'mapped' => false, // файлы НЕ мапятся напрямую на сущность — обрабатываются отдельно
])
```

### EntityType — выбор из связанных сущностей

```php
use Symfony\Bridge\Doctrine\Form\Type\EntityType;

->add('categories', EntityType::class, [
    'class' => Category::class,
    'choice_label' => 'name',
    'multiple' => true,
    'expanded' => true, // чекбоксы вместо multi-select
])
```

---

## 7.6. Загрузка файлов

Файлы не мапятся напрямую на свойство сущности (обычно там хранится строка-путь, а не сам файл) — обрабатываются вручную после `isValid()`:

```php
->add('cover', FileType::class, [
    'required' => false,
    'mapped' => false,
    'constraints' => [
        new File(maxSize: '2M', mimeTypes: ['image/jpeg', 'image/png']),
    ],
])
```

```php
if ($form->isSubmitted() && $form->isValid()) {
    /** @var UploadedFile $coverFile */
    $coverFile = $form->get('cover')->getData();

    if ($coverFile) {
        $newFilename = uniqid() . '.' . $coverFile->guessExtension();
        $coverFile->move(
            $this->getParameter('books_covers_directory'),
            $newFilename,
        );
        $book->setCoverFilename($newFilename);
    }

    $em->persist($book);
    $em->flush();
    // ...
}
```

```yaml
# config/services.yaml
parameters:
    books_covers_directory: '%kernel.project_dir%/public/uploads/covers'
```

Для production рекомендуется хранить файлы не в `public/` напрямую на диске сервера приложения (не масштабируется при нескольких инстансах), а в объектном хранилище (S3-совместимом) через абстракцию наподобие `league/flysystem-bundle`.

---

## 7.7. CSRF-защита

CSRF-токен для форм, созданных через `$this->createForm()`, добавляется **автоматически** — отдельное скрытое поле `_token`, которое форма сама валидирует при `handleRequest()`. Ничего дополнительно делать не нужно.

Для форм **вне** Form Component (например, простая кнопка "Удалить"), CSRF нужно проверять вручную:

```twig
<form method="post" action="{{ path('admin_book_delete', {id: book.id}) }}">
    <input type="hidden" name="_token" value="{{ csrf_token('delete-book-' ~ book.id) }}">
    <button type="submit">Удалить</button>
</form>
```

```php
#[Route('/{id}/delete', name: 'delete', methods: ['POST'])]
public function delete(Book $book, Request $request, EntityManagerInterface $em): Response
{
    $token = $request->request->get('_token');
    if (!$this->isCsrfTokenValid('delete-book-' . $book->getId(), $token)) {
        throw $this->createAccessDeniedException('Неверный CSRF-токен');
    }

    $em->remove($book);
    $em->flush();

    return $this->redirectToRoute('admin_book_index');
}
```

---

## 7.8. События форм (Form Events)

Иногда нужно динамически менять форму в зависимости от уже введённых данных — например, показать разные поля доставки в зависимости от выбранного способа. Используются события `FormEvents::PRE_SET_DATA`, `PRE_SUBMIT`, `SUBMIT`, `POST_SUBMIT`:

```php
use Symfony\Component\Form\FormEvent;
use Symfony\Component\Form\FormEvents;

public function buildForm(FormBuilderInterface $builder, array $options): void
{
    $builder->add('deliveryMethod', ChoiceType::class, [
        'choices' => ['Курьер' => 'courier', 'Самовывоз' => 'pickup'],
    ]);

    $builder->addEventListener(FormEvents::PRE_SET_DATA, function (FormEvent $event) {
        $order = $event->getData();
        $form = $event->getForm();

        if ($order?->getDeliveryMethod() === 'courier') {
            $form->add('address', TextType::class);
        }
    });

    $builder->get('deliveryMethod')->addEventListener(
        FormEvents::POST_SUBMIT,
        function (FormEvent $event) {
            $method = $event->getForm()->getData();
            $parentForm = $event->getForm()->getParent();

            if ($method === 'courier' && !$parentForm->has('address')) {
                $parentForm->add('address', TextType::class);
            }
        }
    );
}
```

Это один из самых "тонких" разделов Form Component — если логика становится слишком запутанной, часто проще сделать два отдельных FormType и выбирать нужный в контроллере.

---

## 7.9. Кастомный тип поля

Если стандартных типов не хватает (например, поле "цена в рублях", хранящееся в сущности как копейки):

```bash
php bin/console make:form MoneyKopecksType --no-entity  # или создаём вручную
```

```php
<?php

namespace App\Form\Type;

use Symfony\Component\Form\AbstractType;
use Symfony\Component\Form\CallbackTransformer;
use Symfony\Component\Form\Extension\Core\Type\NumberType;
use Symfony\Component\Form\FormBuilderInterface;

class MoneyKopecksType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder->addModelTransformer(new CallbackTransformer(
            fn(?int $kopecksFromModel): ?float => $kopecksFromModel === null ? null : $kopecksFromModel / 100,
            fn(?float $rublesFromForm): ?int => $rublesFromForm === null ? null : (int) round($rublesFromForm * 100),
        ));
    }

    public function getParent(): string
    {
        return NumberType::class;
    }
}
```

Теперь в форме пользователь видит и вводит рубли (`1800.50`), а в сущности хранятся копейки (`180050`) — трансформация происходит прозрачно в обе стороны.

---

## 7.10. Практика: форма оформления заказа BookNest

```php
class CheckoutType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('customerName', TextType::class, ['label' => 'Ваше имя'])
            ->add('customerEmail', EmailType::class, ['label' => 'Email'])
            ->add('deliveryMethod', ChoiceType::class, [
                'label' => 'Способ доставки',
                'choices' => ['Курьер' => 'courier', 'Самовывоз' => 'pickup'],
                'expanded' => true,
            ])
            ->add('comment', TextareaType::class, ['required' => false, 'label' => 'Комментарий к заказу'])
            ->add('submit', SubmitType::class, ['label' => 'Оформить заказ']);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults(['data_class' => Order::class]);
    }
}
```

```php
#[Route('/checkout', name: 'checkout', methods: ['GET', 'POST'])]
public function checkout(Request $request, CartManager $cart, EntityManagerInterface $em): Response
{
    if (empty($cart->getItems())) {
        return $this->redirectToRoute('catalog_index');
    }

    $order = new Order();
    $form = $this->createForm(CheckoutType::class, $order);
    $form->handleRequest($request);

    if ($form->isSubmitted() && $form->isValid()) {
        foreach ($cart->getItems() as $bookId => $quantity) {
            $book = $em->getReference(Book::class, $bookId); // "ленивая" ссылка без лишнего SELECT
            $item = (new OrderItem())
                ->setBook($book)
                ->setPriceKopecks($book->getPriceKopecks())
                ->setQuantity($quantity);
            $order->addItem($item);
        }

        $em->persist($order);
        $em->flush();
        $cart->clear();

        return $this->redirectToRoute('order_success', ['id' => $order->getId()]);
    }

    return $this->render('checkout/index.html.twig', ['form' => $form]);
}
```

---

## 7.11. Практика модуля 7

**Задание 1.** Создайте `AuthorType` для создания/редактирования авторов, подключите в новый `AdminAuthorController`.

**Задание 2.** Добавьте в `BookType` загрузку обложки (`FileType`, `mapped: false`) с сохранением файла и записью имени файла в `Book::$coverFilename`.

**Задание 3.** Реализуйте кастомный тип поля `PercentType`, который хранит скидку как `float` (`0.15`), а показывает пользователю как проценты (`15`).

**Задание 4.** Добавьте CSRF-защищённую кнопку "Удалить книгу" в админку без использования полноценного FormType.

### Решения

<details>
<summary>Решение задания 3</summary>

```php
class PercentType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder->addModelTransformer(new CallbackTransformer(
            fn(?float $fraction) => $fraction === null ? null : $fraction * 100,
            fn(?float $percent) => $percent === null ? null : $percent / 100,
        ));
    }

    public function getParent(): string
    {
        return NumberType::class;
    }
}
```
</details>

---

## 7.12. Частые ошибки новичков

1. **Забывают проверить `isSubmitted() && isValid()`** отдельно (например, проверяют только `isValid()`) — на пустой GET-форме `isValid()` может дать неожиданный результат, всегда проверяйте оба условия.
2. **Ожидают, что файлы мапятся напрямую на сущность** — забывают `mapped: false` и обработку файла вручную.
3. **Не делают редирект после успешной отправки** (нарушают PRG) — при обновлении страницы браузер повторно отправляет POST, создавая дубли.
4. **Хардкодят валидацию только в FormType**, забывая, что Entity должна быть валидна и при создании вне формы (например, в фикстурах или API) — используйте Constraints на самой сущности (модуль 08), а не только опции формы.
5. **Пишут сложную логику в Form Events**, когда было бы проще и понятнее сделать два отдельных FormType.

---

## Чек-лист "Я умею" — Модуль 7

- [ ] Создавать FormType с `data_class` и различными типами полей
- [ ] Обрабатывать форму в контроллере через `handleRequest()`/паттерн PRG
- [ ] Рендерить форму в Twig вручную по частям и через form themes
- [ ] Обрабатывать загрузку файлов с `mapped: false`
- [ ] Понимать автоматическую и ручную CSRF-защиту
- [ ] Использовать события форм для динамического поведения
- [ ] Писать кастомные типы полей с Model Transformer

**Дальше:** [Модуль 08 — Валидация](08-validaciya.md)
