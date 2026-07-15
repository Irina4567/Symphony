# Модуль 24. Translation и интернационализация

> Предыдущий модуль: [23 — Notifier и продвинутый Mailer](23-notifier-i-mailer.md)

---

## 24.1. i18n vs l10n — терминология

- **i18n (internationalization)** — подготовка приложения к работе с разными языками/регионами архитектурно (вынос строк из кода, поддержка разных форматов дат/чисел).
- **l10n (localization)** — собственно перевод и адаптация под конкретный язык/регион.

```bash
composer require symfony/translation
```

---

## 24.2. Translation Component: базовое использование

```yaml
# config/packages/translation.yaml
framework:
    default_locale: ru
    translator:
        default_path: '%kernel.project_dir%/translations'
        fallbacks: ['ru']
```

```yaml
# translations/messages.ru.yaml
book.added_to_cart: 'Книга добавлена в корзину'
book.out_of_stock: 'Книги нет в наличии'
order.confirmation.subject: 'Заказ №%order_id% принят'
```

```yaml
# translations/messages.en.yaml
book.added_to_cart: 'Book added to cart'
book.out_of_stock: 'Book is out of stock'
order.confirmation.subject: 'Order #%order_id% confirmed'
```

```php
use Symfony\Contracts\Translation\TranslatorInterface;

class CartController extends AbstractController
{
    public function add(int $id, CartManager $cart, TranslatorInterface $translator): Response
    {
        $cart->add($id);
        $this->addFlash('success', $translator->trans('book.added_to_cart'));
        return $this->redirectToRoute('catalog_index');
    }
}
```

```twig
{{ 'book.added_to_cart'|trans }}
{{ 'order.confirmation.subject'|trans({'%order_id%': order.id}) }}
```

### Домены переводов

Для больших проектов строки разделяют по доменам (`messages`, `validators`, `emails`) — облегчает работу переводчиков, не имеющих доступа ко всему проекту сразу:

```yaml
# translations/validators.ru.yaml
book.title.not_blank: 'Укажите название книги'
```

```php
$translator->trans('book.title.not_blank', domain: 'validators');
```

```twig
{{ 'book.title.not_blank'|trans({}, 'validators') }}
```

---

## 24.3. Плюрализация — ICU MessageFormat

Наивный подход "одна строка на все случаи количества" ломается в русском языке (1 книга / 2 книги / 5 книг — три разные формы, а не две, как в английском). Symfony поддерживает стандарт **ICU MessageFormat**:

```yaml
# translations/messages+intl-icu.ru.yaml
cart.items_count: '{count, plural, one {# книга} few {# книги} many {# книг} other {# книги}}'
```

```php
$translator->trans('cart.items_count', ['count' => 5]); // "5 книг"
$translator->trans('cart.items_count', ['count' => 1]); // "1 книга"
$translator->trans('cart.items_count', ['count' => 3]); // "3 книги"
```

Суффикс `+intl-icu` в имени файла — сигнал Symfony использовать `IntlFormatter`, который умеет плюральные формы конкретного языка (в русском их 4: `one`, `few`, `many`, `other`), в отличие от простого legacy-синтаксиса `|` (тоже поддерживается, но менее гибкий и без нативной поддержки специфики языка).

```bash
composer require symfony/intl
```

---

## 24.4. Определение локали пользователя

```yaml
framework:
    default_locale: ru
```

### По URL-префиксу (рекомендуемый подход для SEO — у каждого языка своя индексируемая ссылка)

```php
#[Route('/{_locale}/catalog', name: 'catalog_index', requirements: ['_locale' => 'ru|en|de'])]
public function index(): Response { /* ... */ }
```

```yaml
# config/packages/routing.yaml
framework:
    default_locale: ru
    router:
        default_uri: 'https://booknest.example'
```

### По заголовку Accept-Language

```php
#[AsEventListener(event: KernelEvents::REQUEST, priority: 20)]
class LocaleFromHeaderListener
{
    public function __invoke(RequestEvent $event): void
    {
        $request = $event->getRequest();
        if (!$request->hasPreviousSession()) {
            $preferredLocale = $request->getPreferredLanguage(['ru', 'en', 'de']);
            $request->setLocale($preferredLocale);
        }
    }
}
```

### По выбору пользователя (сохранённому в сессии/профиле)

```php
$session->set('_locale', $selectedLocale);
```

```yaml
framework:
    session:
        # LocaleListener из ядра сам подхватывает '_locale' в сессии при следующих запросах
```

---

## 24.5. Форматирование чисел, дат, валют — компонент Intl

Locale влияет не только на переводимые строки, но и на **формат** чисел/дат/валют — это отдельная, часто упускаемая часть i18n:

```twig
{{ book.priceKopecks / 100 | format_currency('RUB') }}   {# 1 800,00 ₽ в ru, $1,800.00 в en-US (с другой валютой) #}
{{ order.createdAt | format_date('long') }}                {# "13 июля 2026 г." в ru, "July 13, 2026" в en #}
{{ 12345.6 | format_number }}                               {# "12 345,6" в ru, "12,345.6" в en #}
```

```php
use Symfony\Component\Intl\Currencies;

Currencies::getSymbol('RUB'); // "₽"
```

Это использует ICU-библиотеку (расширение `intl` в PHP) — тот же движок форматирования, что и в браузерах, гарантирует корректность культурных нюансов (например, где ставится символ валюты — до или после числа — в разных локалях).

---

## 24.6. Извлечение переводимых строк и незакрытые переводы

```bash
php bin/console translation:extract en --domain=messages --dump-messages
php bin/console translation:extract en --force   # автоматически создаёт/обновляет файлы переводов
```

Команда сканирует Twig-шаблоны (`|trans`) и PHP-код (`$translator->trans()`) и находит строки, для которых **нет** перевода на указанный язык — критично на проекте с активной разработкой, чтобы не забывать переводить новые строки при добавлении фич.

```bash
php bin/console debug:translation ru        # показывает статус: переведено / отсутствует / не используется
php bin/console debug:translation ru --only-missing
```

---

## 24.7. Практика: локализация BookNest на русский и английский

```yaml
# translations/messages+intl-icu.ru.yaml
catalog.title: 'Каталог книг'
catalog.empty: 'Пока нет книг в продаже'
cart.items_count: '{count, plural, one {# книга} few {# книги} many {# книг} other {# книги}}'
checkout.success: 'Заказ №{order_id} успешно оформлен!'
```

```yaml
# translations/messages+intl-icu.en.yaml
catalog.title: 'Book catalog'
catalog.empty: 'No books available yet'
cart.items_count: '{count, plural, one {# book} other {# books}}'
checkout.success: 'Order #{order_id} placed successfully!'
```

```php
#[Route('/{_locale}/catalog', name: 'catalog_index', requirements: ['_locale' => 'ru|en'])]
public function index(BookRepository $repository): Response
{
    return $this->render('catalog/index.html.twig', [
        'books' => $repository->findAvailable(),
    ]);
}
```

```twig
<html lang="{{ app.request.locale }}">
<h1>{{ 'catalog.title'|trans }}</h1>
<p>{{ 'cart.items_count'|trans({'count': cartItemsCount}) }}</p>
```

---

## 24.8. Практика модуля 24

**Задание 1.** Настройте маршрутизацию с `{_locale}`-префиксом для всего каталога BookNest на `ru`/`en`.

**Задание 2.** Реализуйте плюрализацию для "N книг в корзине" и "N дней осталось на возврат" через ICU MessageFormat.

**Задание 3.** Настройте `format_currency`/`format_date` для карточки заказа, чтобы цена и дата отображались согласно локали пользователя.

**Задание 4.** Прогоните `php bin/console debug:translation en` на своём проекте и убедитесь, что нет строк без перевода.

---

## 24.9. Частые ошибки новичков

1. **Хардкодят строки прямо в Twig/PHP** вместо `|trans`/`trans()` — при необходимости мультиязычности приходится переписывать весь проект.
2. **Используют простую плюрализацию `|` вместо ICU MessageFormat** для языков со сложными правилами множественного числа (русский, польский, арабский) — получают грамматически неверные фразы.
3. **Забывают про формат чисел/дат** — считают, что i18n = только перевод строк, хотя формат валюты/даты не менее важен для восприятия "родного" интерфейса.
4. **Не прогоняют `debug:translation` в CI** — новые строки без перевода попадают в production незамеченными.
5. **Хранят разные домены переводов вперемешку в одном файле** на большом проекте — усложняет работу переводчиков-нетехнических специалистов.

---

## Чек-лист "Я умею" — Модуль 24

- [ ] Объяснить разницу i18n и l10n
- [ ] Организовывать переводы по доменам и работать с YAML-файлами переводов
- [ ] Использовать ICU MessageFormat для корректной плюрализации
- [ ] Определять локаль пользователя разными способами (URL, заголовок, сессия)
- [ ] Форматировать числа/даты/валюты через компонент Intl согласно локали
- [ ] Находить непереведённые строки через `translation:extract`/`debug:translation`

**Дальше:** [Модуль 25 — Real-time: Mercure, WebSockets, SSE](25-realtime-mercure.md)
