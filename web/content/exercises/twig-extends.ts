import type { Exercise } from "../types";

export const twigExtendsExercise: Exercise = {
  id: "twig-extends",
  mode: "symfony-app",
  title: "Наследование шаблонов: extends и block",
  description:
    "Базовый макет exercises/base.html.twig уже существует (в нём объявлены блоки title и content). Расширь его и переопредели оба блока.",
  targetPath: "templates/exercises/child.html.twig",
  contextFiles: [
    { path: "templates/exercises/base.html.twig", description: "родительский макет, который нужно расширить" },
  ],
  starterCode: `{# TODO: расширь родительский шаблон exercises/base.html.twig #}

{% block title %}{# TODO: "Моя страница" #}{% endblock %}

{% block content %}
    {# TODO: <p>Привет из дочернего шаблона!</p> #}
{% endblock %}
`,
  solution: `{% extends 'exercises/base.html.twig' %}

{% block title %}Моя страница{% endblock %}

{% block content %}
    <p>Привет из дочернего шаблона!</p>
{% endblock %}
`,
  requests: [{ id: "r1", method: "GET", path: "/exercises/twig-child" }],
  checks: [
    { type: "http-status", requestId: "r1", expectedStatus: 200, description: "Страница рендерится без ошибок → 200" },
    {
      type: "http-body-contains",
      requestId: "r1",
      value: "<title>Моя страница</title>",
      description: "Блок title переопределён и попал в <title> базового макета",
    },
    {
      type: "http-body-contains",
      requestId: "r1",
      value: "<p>Привет из дочернего шаблона!</p>",
      description: "Блок content переопределён и попал внутрь <main> базового макета",
    },
  ],
  hint: "{% extends '...' %} обязательно должен быть первой инструкцией в файле — до него допустимы только комментарии.",
};
