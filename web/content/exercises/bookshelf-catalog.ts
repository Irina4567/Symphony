import type { Exercise } from "../types";

export const bookshelfCatalogExercise: Exercise = {
  id: "bookshelf-catalog",
  mode: "symfony-app",
  title: "BookShelf: HTML-витрина каталога",
  description:
    "Собери воедино всё из этого блока: расширь базовый макет, выведи список книг ссылками на страницу каждой книги, и не забудь про случай пустого каталога.",
  targetPath: "templates/exercises/bookshelf_catalog.html.twig",
  contextFiles: [
    { path: "templates/exercises/base.html.twig", description: "родительский макет, который нужно расширить" },
    {
      path: "src/Controller/TwigExerciseController.php",
      description: "маршруты exercise_bookshelf_catalog(-empty) и форма данных books",
    },
  ],
  starterCode: `{# TODO: расширь exercises/base.html.twig #}

{% block title %}{# TODO: "Каталог книг" #}{% endblock %}

{% block content %}
    <ul>
    {% for book in books %}
        {# TODO: <li><a href="{{ path('book_show_page', {id: book.id}) }}">{{ book.title }} — {{ book.author }}</a></li> #}
    {% else %}
        {# TODO: <li>Книг пока нет</li> #}
    {% endfor %}
    </ul>
{% endblock %}
`,
  solution: `{% extends 'exercises/base.html.twig' %}

{% block title %}Каталог книг{% endblock %}

{% block content %}
    <ul>
    {% for book in books %}
        <li><a href="{{ path('book_show_page', {id: book.id}) }}">{{ book.title }} — {{ book.author }}</a></li>
    {% else %}
        <li>Книг пока нет</li>
    {% endfor %}
    </ul>
{% endblock %}
`,
  requests: [
    { id: "filled", method: "GET", path: "/exercises/bookshelf-catalog" },
    { id: "empty", method: "GET", path: "/exercises/bookshelf-catalog-empty" },
  ],
  checks: [
    {
      type: "http-body-contains",
      requestId: "filled",
      value: "<title>Каталог книг</title>",
      description: "Заголовок страницы переопределён через блок title",
    },
    { type: "http-body-contains", requestId: "filled", value: 'href="/books/1"', description: "Ссылка на книгу 1984 сгенерирована через path()" },
    { type: "http-body-contains", requestId: "filled", value: "1984", description: "Список содержит книгу 1984" },
    { type: "http-body-contains", requestId: "filled", value: "Clean Code", description: "Список содержит книгу Clean Code" },
    { type: "http-body-contains", requestId: "filled", value: "Dune", description: "Список содержит книгу Dune" },
    {
      type: "http-body-contains",
      requestId: "empty",
      value: "<li>Книг пока нет</li>",
      description: "Пустой каталог показывает сообщение через ветку else",
    },
  ],
  hint: "Это комбинация всех четырёх уроков блока: extends/block из урока про наследование, for/else из урока про циклы, path() из урока про ссылки.",
};
