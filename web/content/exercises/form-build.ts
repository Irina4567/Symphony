import type { Exercise } from "../types";

export const formBuildExercise: Exercise = {
  id: "form-build",
  mode: "symfony-app",
  title: "Построй FormType для книги",
  description:
    "Допиши buildForm(), чтобы форма содержала поле названия (текст), года издания (число) и кнопку отправки.",
  targetPath: "src/Form/BookFormType.php",
  contextFiles: [
    { path: "src/Entity/Book.php", description: "сущность, на которую форма будет ссылаться через data_class" },
  ],
  starterCode: `<?php

namespace App\\Form;

use App\\Entity\\Book;
use Symfony\\Component\\Form\\AbstractType;
use Symfony\\Component\\Form\\Extension\\Core\\Type\\IntegerType;
use Symfony\\Component\\Form\\Extension\\Core\\Type\\SubmitType;
use Symfony\\Component\\Form\\Extension\\Core\\Type\\TextType;
use Symfony\\Component\\Form\\FormBuilderInterface;
use Symfony\\Component\\OptionsResolver\\OptionsResolver;

class BookFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        // TODO: добавь поле 'title' типа TextType с label 'Название'
        // TODO: добавь поле 'year' типа IntegerType с label 'Год издания'
        // TODO: добавь поле 'save' типа SubmitType с label 'Добавить книгу'
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Book::class,
        ]);
    }
}
`,
  solution: `<?php

namespace App\\Form;

use App\\Entity\\Book;
use Symfony\\Component\\Form\\AbstractType;
use Symfony\\Component\\Form\\Extension\\Core\\Type\\IntegerType;
use Symfony\\Component\\Form\\Extension\\Core\\Type\\SubmitType;
use Symfony\\Component\\Form\\Extension\\Core\\Type\\TextType;
use Symfony\\Component\\Form\\FormBuilderInterface;
use Symfony\\Component\\OptionsResolver\\OptionsResolver;

class BookFormType extends AbstractType
{
    public function buildForm(FormBuilderInterface $builder, array $options): void
    {
        $builder
            ->add('title', TextType::class, ['label' => 'Название'])
            ->add('year', IntegerType::class, ['label' => 'Год издания'])
            ->add('save', SubmitType::class, ['label' => 'Добавить книгу']);
    }

    public function configureOptions(OptionsResolver $resolver): void
    {
        $resolver->setDefaults([
            'data_class' => Book::class,
        ]);
    }
}
`,
  requests: [{ id: "r1", method: "GET", path: "/exercises/form-new" }],
  checks: [
    { type: "http-status", requestId: "r1", expectedStatus: 200, description: "Форма рендерится без ошибок → 200" },
    { type: "http-body-contains", requestId: "r1", value: 'name="book_form[title]"', description: "Есть поле title" },
    { type: "http-body-contains", requestId: "r1", value: 'name="book_form[year]"', description: "Есть поле year" },
    { type: "http-body-contains", requestId: "r1", value: "Добавить книгу", description: "Есть кнопка отправки с нужным текстом" },
  ],
  hint: "Имя формы (book_form) и имена полей (book_form[title], book_form[year]) Symfony собирает автоматически из названия класса BookFormType — этот же принцип мы уже видели при генерации маршрутов из имени класса контроллера.",
};
