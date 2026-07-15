# Модуль 16. Frontend и Symfony UX

> Предыдущий модуль: [15 — Кэширование и консольные команды](15-keshirovanie-i-konsolnye-komandy.md)

---

## 16.1. Философия Symfony по работе с фронтендом

У Symfony исторически было два пути работы с JS/CSS:

1. **Webpack Encore** — обёртка над Webpack, полноценная SPA-сборка с npm-экосистемой.
2. **AssetMapper** (актуально с Symfony 6.3+, рекомендуется по умолчанию в 7.x) — использует нативные **import maps** браузера, вообще без сборщика (без Node.js, без `npm run build`) для большинства случаев.

Идея AssetMapper: современные браузеры умеют нативно работать с ES-модулями через `<script type="importmap">`, поэтому для среднего проекта (не сложное SPA) не нужен весь тяжёлый тулинг вокруг Webpack/Vite — Symfony просто отдаёт файлы напрямую, версионирует их для кэширования и всё.

```bash
composer require symfony/asset-mapper symfony/asset symfony/twig-pack
php bin/console importmap:require bootstrap
```

Философия Symfony в целом: **сервер — источник истины**, JS используется точечно, где это действительно необходимо (интерактивность конкретного виджета), а не как база всего приложения. Это не значит, что Symfony не подходит для SPA — API Platform из модуля 12 отлично обслуживает любой SPA-фронтенд (React/Vue/Angular) как чистый backend — но "стандартный путь" Symfony для серверного рендеринга — это Symfony UX + Turbo/Stimulus, разберём ниже.

---

## 16.2. AssetMapper на практике

```bash
php bin/console importmap:require chart.js
```

Это добавит запись в `importmap.php` и скачает пакет в `assets/vendor/`:

```php
// importmap.php
return [
    'app' => ['path' => './app.js', 'entrypoint' => true],
    'chart.js' => ['version' => '4.4.0'],
];
```

```javascript
// assets/app.js
import { Chart } from 'chart.js/auto';

const ctx = document.getElementById('salesChart');
new Chart(ctx, { type: 'bar', data: {/* ... */} });
```

```twig
{# base.html.twig #}
{% block javascripts %}
    {{ importmap('app') }}
{% endblock %}
```

`{{ importmap('app') }}` генерирует `<script type="importmap">` со всеми зависимостями и `<script type="module">`, подключающий сам `app.js` — браузер разрешает импорты нативно, без сборки.

---

## 16.3. Stimulus — минималистичный JS-фреймворк для "приправы" HTML

**Stimulus** (от создателей Rails/Turbo, входит в состав Symfony UX) — не заменяет React/Vue, а решает узкую задачу: связать поведение с HTML-разметкой без переписывания всей страницы на JS. Философия — "HTML — источник истины", JS только реагирует на события DOM.

```bash
php bin/console make:stimulus-controller cart
```

```javascript
// assets/controllers/cart_controller.js
import { Controller } from '@hotwired/stimulus';

export default class extends Controller {
    static targets = ['count', 'button'];
    static values = { bookId: Number };

    async add() {
        this.buttonTarget.disabled = true;

        const response = await fetch(`/cart/add/${this.bookIdValue}`, { method: 'POST' });
        const data = await response.json();

        this.countTarget.textContent = data.totalItems;
        this.buttonTarget.disabled = false;
    }
}
```

```twig
<div {{ stimulus_controller('cart') }}>
    <span data-cart-target="count">{{ cartItemsCount }}</span>

    <button data-cart-target="button"
            data-action="cart#add"
            data-cart-book-id-value="{{ book.id }}">
        В корзину
    </button>
</div>
```

Ключевые концепции Stimulus:
- **Controller** — класс, привязанный к DOM-элементу через `data-controller="cart"`.
- **Target** — именованная ссылка на дочерний элемент (`data-cart-target="count"` → `this.countTarget`).
- **Value** — типизированный параметр из data-атрибута (`data-cart-book-id-value` → `this.bookIdValue`).
- **Action** — связь события DOM с методом контроллера (`data-action="cart#add"` = "при клике вызвать `add()`").

---

## 16.4. Turbo — SPA-подобная навигация без написания JS

**Turbo** ускоряет обычные многостраничные (server-rendered) приложения, перехватывая переходы по ссылкам и отправки форм через AJAX "прозрачно" — браузер визуально не перезагружает страницу целиком, хотя весь рендеринг по-прежнему происходит на сервере через Twig.

```bash
composer require symfony/ux-turbo
```

Просто подключив Turbo, обычные `<a>` и `<form>` уже начинают работать быстрее без единой строчки JS. Дополнительно доступны:

**Turbo Frames** — обновление части страницы:
```twig
<turbo-frame id="cart_summary">
    {{ include('cart/_summary.html.twig') }}
</turbo-frame>
```
Любая ссылка/форма **внутри** этого фрейма, ведущая на страницу с таким же `id="cart_summary"`, обновит **только** этот блок, не всю страницу.

**Turbo Streams** — точечные обновления через WebSocket/SSE или как ответ на форму (полезно, например, для "живого" счётчика корзины у всех открытых вкладок):
```twig
{# ответ контроллера на добавление в корзину #}
<turbo-stream action="replace" target="cart_summary">
    <template>
        {{ include('cart/_summary.html.twig') }}
    </template>
</turbo-stream>
```
```php
return $this->render('cart/_add_response.stream.html.twig', [/* ... */], new Response(status: 200, headers: ['Content-Type' => 'text/vnd.turbo-stream.html']));
```

---

## 16.5. Live Components — реактивные компоненты без ручного JS

Это самая мощная часть Symfony UX: **Live Component** — Twig-компонент (модуль 02), который умеет автоматически "перерисовываться" через AJAX при изменении состояния — аналог реактивности Vue/React, но вся логика остаётся на PHP-сервере.

```bash
composer require symfony/ux-live-component
php bin/console make:twig-component --live BookSearch
```

```php
<?php

namespace App\Twig\Components;

use App\Repository\BookRepository;
use Symfony\UX\LiveComponent\Attribute\AsLiveComponent;
use Symfony\UX\LiveComponent\Attribute\LiveProp;
use Symfony\UX\LiveComponent\DefaultActionTrait;

#[AsLiveComponent]
class BookSearch
{
    use DefaultActionTrait;

    #[LiveProp(writable: true)]
    public string $query = '';

    public function __construct(private BookRepository $bookRepository) {}

    public function getResults(): array
    {
        if (strlen($this->query) < 2) {
            return [];
        }
        return $this->bookRepository->search($this->query, null, 1, 10);
    }
}
```

```twig
{# templates/components/BookSearch.html.twig #}
<div{{ attributes }}>
    <input
        type="text"
        value="{{ query }}"
        data-model="query"
        placeholder="Найти книгу..."
    >

    <ul>
        {% for book in this.results %}
            <li>{{ book.title }}</li>
        {% endfor %}
    </ul>
</div>
```

```twig
<twig:BookSearch />
```

Что здесь происходит: пользователь печатает в поле `<input data-model="query">`, Live Component автоматически (с debounce) отправляет AJAX-запрос на сервер, сервер заново рендерит компонент с новым значением `$query` и обновлённым результатом поиска, а на клиенте старый HTML "морфится" в новый — без единой строчки написанного вами JS. Это принципиально отличается от классических SPA: логика поиска, фильтрации, пагинации остаётся полностью на сервере — просто она "выглядит" реактивно.

### LiveAction — вызов методов компонента из шаблона

```php
#[LiveAction]
public function addToFavorites(#[LiveArg] int $bookId): void
{
    $this->favoritesService->add($bookId);
}
```

```twig
<button data-action="live#action:addToFavorites" data-live-book-id-param="{{ book.id }}">
    В избранное
</button>
```

---

## 16.6. Когда всё же нужен полноценный SPA-фреймворк

Symfony UX отлично закрывает 80% случаев интерактивности без необходимости в отдельном SPA-стеке. Но если фронтенд действительно сложный (богатый интерфейс, офлайн-режим, отдельная команда фронтенд-разработчиков, мобильное приложение с общим API) — используйте API Platform/ручной REST API (модули 11-12) как чистый backend, а фронтенд стройте отдельно на React/Vue/Angular через собственный сборщик (Vite и т.д.). Symfony прекрасно работает и в роли "чистого API-сервера" — это архитектурный выбор, а не ограничение фреймворка.

---

## 16.7. Практика: живой поиск и корзина BookNest

Соберём Stimulus-контроллер корзины (раздел 16.3) и Live Component поиска (раздел 16.5) вместе на странице каталога:

```twig
{% extends 'base.html.twig' %}

{% block body %}
    <twig:BookSearch />

    <div class="book-grid">
        {% for book in books %}
            <div {{ stimulus_controller('cart') }} data-cart-book-id-value="{{ book.id }}">
                {{ include('catalog/_book_card.html.twig', {book: book}) }}
                <button data-cart-target="button" data-action="cart#add">В корзину</button>
            </div>
        {% endfor %}
    </div>
{% endblock %}
```

---

## 16.8. Практика модуля 16

**Задание 1.** Соберите Live Component `PriceFilter`, позволяющий динамически фильтровать каталог по диапазону цен (два `<input type="range">`) без перезагрузки страницы.

**Задание 2.** Оберните блок "Итого в корзине" в `<turbo-frame id="cart_summary">`, чтобы при добавлении товара обновлялся только этот блок.

**Задание 3.** Добавьте debounce к полю поиска Live Component (`data-model="on(input)|debounce(300)"`) и объясните, зачем это нужно (нагрузка на сервер при вводе каждого символа).

**Задание 4.** Реализуйте Stimulus-контроллер "избранное" (лайк-кнопка), меняющий иконку локально сразу (оптимистичный UI) и подтверждающий/откатывающий изменение после ответа сервера.

### Решения

<details>
<summary>Обсуждение задания 3</summary>

Без debounce каждое нажатие клавиши в поле поиска отправляет отдельный AJAX-запрос на сервер — при быстром вводе фразы из 10 символов это 10 запросов подряд, большинство из которых устареют раньше, чем придёт ответ. `debounce(300)` откладывает отправку запроса на 300мс после **последнего** нажатия — если пользователь продолжает печатать, таймер сбрасывается. Это стандартная практика для любого live-поиска, независимо от технологии (React, Vue, Stimulus).
</details>

---

## 16.9. Частые ошибки новичков

1. **Тянут полноценный Webpack/Node.js-тулинг**, когда хватило бы AssetMapper — усложняют билд-процесс без необходимости.
2. **Пишут много кастомного JS там, где Stimulus/Live Components уже решают задачу** декларативно.
3. **Забывают про debounce на Live Component с полем ввода** — заваливают сервер запросами.
4. **Путают Turbo Frame и обычный `<div>`** — ожидают, что содержимое обновится "само", хотя `id` фрейма на источнике и цели не совпадают.
5. **Смешивают Stimulus-логику с бизнес-логикой на сервере без чёткого контракта** (например, сервер и клиент по-разному считают итоговую сумму корзины) — сервер должен оставаться источником истины для любых денежных расчётов.

---

## Чек-лист "Я умею" — Модуль 16

- [ ] Объяснить разницу AssetMapper и Webpack Encore, знать, когда что уместно
- [ ] Подключать npm-пакеты через `importmap:require` без Node.js
- [ ] Писать Stimulus-контроллеры (targets, values, actions)
- [ ] Использовать Turbo Frames/Streams для частичного обновления страницы
- [ ] Строить Live Components для реактивного UI без ручного JS
- [ ] Понимать, когда стоит использовать Symfony как чистый API-backend для отдельного SPA

**Дальше:** [Модуль 17 — Production и деплой](17-production-i-deploy.md)
