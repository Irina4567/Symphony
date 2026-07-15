import type { Quiz } from "../types";

export const formBasicsQuiz: Quiz = {
  id: "form-basics",
  title: "Проверь себя: FormType",
  questions: [
    {
      id: "q1",
      type: "single",
      question: "Что такое FormType в Symfony?",
      options: [
        "Класс, описывающий набор полей формы и их типы (extends AbstractType)",
        "HTML-тег <form>",
        "Название таблицы в базе данных",
        "Тип HTTP-запроса",
      ],
      correctIndex: 0,
      explanation: "FormType — переиспользуемое описание формы: какие поля, какого типа, с какими опциями. Один класс можно использовать в нескольких контроллерах.",
    },
    {
      id: "q2",
      type: "single",
      question: "Зачем указывать 'data_class' => Book::class в configureOptions()?",
      options: [
        "Говорит форме, что она заполняет/читает именно объект Book — данные полей биндятся к его свойствам через геттеры/сеттеры",
        "Создаёт таблицу в базе данных",
        "Регистрирует HTTP-маршрут",
        "Это обязательный параметр без какого-либо эффекта на поведение",
      ],
      correctIndex: 0,
      explanation:
        "Без data_class форма работала бы с обычным массивом. С ним — при сабмите Symfony вызывает setTitle()/setYear() на объекте Book, а не просто собирает ассоциативный массив.",
    },
    {
      id: "q3",
      type: "single",
      question: "Как Symfony генерирует имена HTML-полей формы (например, book_form[title])?",
      options: [
        "Из имени класса FormType (BookFormType → book_form) плюс имя добавленного через add() поля",
        "Их всегда нужно указывать вручную через опцию name",
        "Случайным образом при каждом рендере страницы",
        "По имени таблицы в базе данных",
      ],
      correctIndex: 0,
      explanation:
        "Тот же принцип вывода имени из класса, что мы уже видели с генерацией маршрутов из контроллера — конвенция вместо ручной конфигурации.",
    },
    {
      id: "q4",
      type: "single",
      question: "Как отрендерить всю форму целиком одним вызовом в Twig?",
      options: ["{{ form(form) }}", "{% render form %}", "<?php echo $form ?>", "form()::render()"],
      correctIndex: 0,
      explanation:
        "form() — Twig-функция, которая рендерит всю форму со стандартной разметкой. Для более тонкого контроля есть form_start()/form_widget()/form_errors()/form_end().",
    },
  ],
};
