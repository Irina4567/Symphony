# Модуль 02. Twig — шаблонизатор

> Предыдущий модуль: [01 — Routing и контроллеры](01-routing-i-kontrollery.md)

---

## 2.1. Зачем шаблонизатор, если есть PHP

PHP формально сам по себе шаблонизатор (`<?= $var ?>` работает "из коробки"), но у него нет:

- **Автоэкранирования по умолчанию** — забыли `htmlspecialchars()` один раз, получили XSS.
- **Наследования шаблонов** (`{% extends %}`) без костылей с `ob_start()`.
- **Песочницы** — в Twig легко ограничить, что именно можно вызывать в шаблоне (актуально, если шаблоны редактируют не-разработчики).
- **Компактного, читаемого синтаксиса**, заточенного именно под вывод, а не под произвольную логику.

Twig — шаблонизатор Symfony (хотя формально независимая библиотека, используется и вне фреймворка). Ключевая философия: **в шаблоне не должно быть бизнес-логики** — только вывод данных, которые контроллер уже подготовил.

---

## 2.2. Базовый синтаксис

```twig
{# это комментарий, не попадёт в HTML #}

{{ book.title }}                 {# вывод переменной, с автоэкранированием #}
{{ book.price|number_format(2) }} {# фильтр #}

{% if book.price > 1000 %}
    <span class="badge">Премиум</span>
{% elseif book.price > 500 %}
    <span class="badge">Стандарт</span>
{% else %}
    <span class="badge">Бюджет</span>
{% endif %}

{% for book in books %}
    <li>{{ loop.index }}. {{ book.title }}</li>
{% else %}
    <li>Каталог пуст</li>
{% endfor %}
```

Важная деталь: `book.title` в Twig — это **универсальный доступ**, который под капотом пробует по очереди: `$book['title']` (если массив), `$book->title` (публичное свойство), `$book->getTitle()`, `$book->isTitle()`, `$book->hasTitle()`. Это значит, что шаблон одинаково работает что с массивом, что с объектом сущности — очень удобно при рефакторинге.

### Переменная `loop`

Внутри `{% for %}` доступен спецобъект `loop`:

```twig
{{ loop.index }}    {# 1, 2, 3... #}
{{ loop.index0 }}   {# 0, 1, 2... #}
{{ loop.first }}    {# true на первой итерации #}
{{ loop.last }}     {# true на последней #}
{{ loop.length }}   {# общее число элементов (требует, чтобы коллекция была countable) #}
```

---

## 2.3. Наследование шаблонов

Это ключевая фича для избежания дублирования layout'а.

**`templates/base.html.twig`:**
```twig
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <title>{% block title %}BookNest{% endblock %}</title>
    {% block stylesheets %}
        <link rel="stylesheet" href="{{ asset('styles/app.css') }}">
    {% endblock %}
</head>
<body>
    <header>{% include 'partials/_header.html.twig' %}</header>

    <main>
        {% for label, messages in app.flashes %}
            {% for message in messages %}
                <div class="alert alert-{{ label }}">{{ message }}</div>
            {% endfor %}
        {% endfor %}

        {% block body %}{% endblock %}
    </main>

    <footer>&copy; {{ "now"|date("Y") }} BookNest</footer>
    {% block javascripts %}{% endblock %}
</body>
</html>
```

**`templates/catalog/index.html.twig`:**
```twig
{% extends 'base.html.twig' %}

{% block title %}Каталог книг — {{ parent() }}{% endblock %}

{% block body %}
    <h1>Каталог</h1>
    <div class="book-grid">
        {% for book in books %}
            {{ include('catalog/_book_card.html.twig', {book: book}) }}
        {% endfor %}
    </div>
{% endblock %}
```

`{% extends %}` задаёт родительский шаблон, `{% block %}` — "слоты", которые дочерний шаблон переопределяет. `parent()` внутри блока вставляет исходное содержимое родительского блока (полезно для конкатенации `<title>`).

### include vs embed

- `{% include %}` — просто вставляет другой шаблон с переданным контекстом, без блоков.
- `{% embed %}` — как include, но позволяет переопределять блоки внутри вставляемого шаблона (гибрид extends + include). Полезно для переиспользуемых карточек/модалок со "слотами".

```twig
{% embed 'components/_modal.html.twig' %}
    {% block modal_title %}Подтвердите заказ{% endblock %}
    {% block modal_body %}
        <p>Вы уверены?</p>
    {% endblock %}
{% endembed %}
```

---

## 2.4. Фильтры и функции

Фильтры (`|filter`) преобразуют значение, функции (`func()`) — вызываются как функции.

### Часто используемые фильтры

```twig
{{ book.title|upper }}
{{ book.title|lower }}
{{ book.title|capitalize }}
{{ book.description|length }}
{{ book.description|slice(0, 100) }}~
{{ book.description|striptags }}
{{ book.description|raw }}                {# ВЫВОД БЕЗ экранирования — осторожно! #}
{{ book.price|number_format(2, ',', ' ') }}
{{ book.createdAt|date('d.m.Y H:i') }}
{{ book.tags|join(', ') }}
{{ books|length }}
{{ books|first }}
{{ books|last }}
{{ books|sort((a, b) => a.price <=> b.price) }}
{{ description|default('Описание отсутствует') }}
{{ book|json_encode }}
```

### Часто используемые функции

```twig
{{ path('catalog_show', {id: book.id}) }}
{{ url('catalog_show', {id: book.id}) }}
{{ asset('images/logo.svg') }}
{{ dump(book) }}                {# debug-вывод, только в dev-окружении #}
{{ is_granted('ROLE_ADMIN') }}
{{ csrf_token('delete-book') }}
{{ form(form) }}
```

### asset() и загрузка статики

`asset('images/logo.svg')` генерирует правильный URL до файла в `public/`, с учётом версии (cache busting) при использовании `asset-mapper` или Webpack Encore. Никогда не пишите `<img src="/images/logo.svg">` напрямую — используйте `asset()`, чтобы URL пересчитывался автоматически при смене базового пути или CDN.

---

## 2.5. Глобальный объект `app`

Twig в Symfony автоматически предоставляет объект `app` со ссылками на часто нужные вещи:

```twig
{{ app.user }}                     {# текущий залогиненный пользователь (или null) #}
{{ app.request.locale }}
{{ app.environment }}              {# dev / prod / test #}
{{ app.debug }}
{{ app.flashes('success') }}
{{ app.session.get('cart_id') }}
```

```twig
{% if app.user %}
    Привет, {{ app.user.email }}!
    {% if is_granted('ROLE_ADMIN') %}
        <a href="{{ path('admin_book_index') }}">Админка</a>
    {% endif %}
{% else %}
    <a href="{{ path('security_login') }}">Войти</a>
{% endif %}
```

---

## 2.6. Twig-компоненты и переиспользуемые куски (Symfony UX)

С пакетом `symfony/ux-twig-component` можно оформлять переиспользуемые "компоненты" — PHP-класс + Twig-шаблон, похоже на компоненты во фронтенд-фреймворках, но полностью на сервере:

```bash
composer require symfony/ux-twig-component
php bin/console make:twig-component BookCard
```

```php
// src/Twig/Components/BookCard.php
namespace App\Twig\Components;

use Symfony\UX\TwigComponent\Attribute\AsTwigComponent;

#[AsTwigComponent]
class BookCard
{
    public array $book;
    public bool $showPrice = true;
}
```

```twig
{# templates/components/BookCard.html.twig #}
<div class="book-card">
    <h3>{{ book.title }}</h3>
    {% if showPrice %}<span>{{ book.price }} ₽</span>{% endif %}
</div>
```

Использование в любом шаблоне:
```twig
<twig:BookCard :book="book" :showPrice="false" />
```

Мы полноценно вернёмся к этому в модуле 16 (Frontend/Symfony UX) — там же разберём "живые" компоненты (`LiveComponent`), обновляющиеся через AJAX без ручного JS.

---

## 2.7. Кастомные фильтры и функции

Иногда нужна собственная логика форматирования. Создаём **Twig Extension**:

```bash
php bin/console make:twig-extension PriceExtension
```

```php
<?php

namespace App\Twig;

use Twig\Extension\AbstractExtension;
use Twig\TwigFilter;

class PriceExtension extends AbstractExtension
{
    public function getFilters(): array
    {
        return [
            new TwigFilter('price', [$this, 'formatPrice']),
        ];
    }

    public function formatPrice(int $kopecks): string
    {
        // храним деньги в копейках, форматируем в рубли только при выводе
        return number_format($kopecks / 100, 2, ',', ' ') . ' ₽';
    }
}
```

```twig
{{ book.priceInKopecks|price }} {# 1 800,00 ₽ #}
```

Благодаря **autoconfiguration** (модуль 04) Symfony сам находит класс, реализующий `AbstractExtension`/`ExtensionInterface`, и регистрирует его — никакого ручного конфига не требуется.

---

## 2.8. Практика: собираем каталог BookNest на Twig

**`templates/catalog/_book_card.html.twig`:**
```twig
<article class="book-card">
    <h3><a href="{{ path('catalog_show', {id: book.id}) }}">{{ book.title }}</a></h3>
    <p class="price">{{ book.price|number_format(2, ',', ' ') }} ₽</p>
</article>
```

**`templates/catalog/index.html.twig`:**
```twig
{% extends 'base.html.twig' %}

{% block title %}Каталог книг{% endblock %}

{% block body %}
    <h1>Каталог</h1>

    {% if books is empty %}
        <p>Пока нет книг в продаже.</p>
    {% else %}
        <div class="book-grid">
            {% for book in books %}
                {{ include('catalog/_book_card.html.twig', {book: book}) }}
            {% endfor %}
        </div>
    {% endif %}
{% endblock %}
```

**`templates/catalog/show.html.twig`:**
```twig
{% extends 'base.html.twig' %}

{% block title %}{{ book.title }}{% endblock %}

{% block body %}
    <h1>{{ book.title }}</h1>
    <p class="price">{{ book.price|number_format(2, ',', ' ') }} ₽</p>

    <form method="post" action="{{ path('catalog_index') }}">
        <input type="hidden" name="_token" value="{{ csrf_token('add-to-cart-' ~ book.id) }}">
        <button type="submit">Добавить в корзину</button>
    </form>

    <a href="{{ path('catalog_index') }}">&larr; Назад в каталог</a>
{% endblock %}
```

---

## 2.9. Практика модуля 2

**Задание 1.** Создайте `templates/partials/_header.html.twig` с навигацией (Главная / Каталог / Корзина), подключите его в `base.html.twig` через `include`.

**Задание 2.** Напишите Twig-фильтр `truncateWords(text, wordsCount)`, который обрезает текст описания книги до N слов и добавляет `…`.

**Задание 3.** Добавьте в `base.html.twig` блок, который через `{% if app.debug %}` показывает баннер "DEV MODE" только в режиме разработки.

**Задание 4.** Используя `{% embed %}`, сделайте переиспользуемый компонент модального окна подтверждения удаления книги.

### Решения

<details>
<summary>Решение задания 2</summary>

```php
new TwigFilter('truncateWords', function (string $text, int $wordsCount = 20): string {
    $words = preg_split('/\s+/', trim($text));
    if (count($words) <= $wordsCount) {
        return $text;
    }
    return implode(' ', array_slice($words, 0, $wordsCount)) . '…';
});
```
```twig
{{ book.description|truncateWords(15) }}
```
</details>

---

## 2.10. Частые ошибки новичков

1. **Злоупотребляют `|raw`.** Это отключает автоэкранирование — прямая дорога к XSS, если данные хоть немного пользовательские. Используйте только для заведомо доверенного HTML (например, содержимого, прошедшего через HTML Purifier).
2. **Пишут бизнес-логику в шаблоне** (сложные вычисления, обращения к репозиториям через `app`). Twig — для отображения, не для логики. Если видите в шаблоне больше двух вложенных `{% if %}` — скорее всего, стоит подготовить данные заранее в контроллере/сервисе.
3. **Хардкодят пути к статике** вместо `asset()` — ломается при деплое с CDN или версионированием файлов.
4. **Забывают, что `{{ dump() }}` работает только в dev** (нужен `symfony/debug-bundle`) — в проде вызовет ошибку или ничего не выведет в зависимости от настроек.
5. **Путают `include` и `embed`** — пытаются переопределить блок через `include`, что невозможно.

---

## Чек-лист "Я умею" — Модуль 2

- [ ] Строить иерархию шаблонов через `extends`/`block`/`parent()`
- [ ] Переиспользовать куски вёрстки через `include` и `embed`
- [ ] Пользоваться основными фильтрами и функциями Twig
- [ ] Работать с глобальным объектом `app` (пользователь, флеши, окружение)
- [ ] Писать собственные Twig-фильтры и функции через Extension
- [ ] Понимать, когда стоит использовать Twig-компоненты Symfony UX

**Дальше:** [Модуль 03 — Конфигурация и окружение](03-konfiguracia-i-okruzhenie.md)
