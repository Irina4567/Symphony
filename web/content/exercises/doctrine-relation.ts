import type { Exercise } from "../types";

export const doctrineRelationExercise: Exercise = {
  id: "doctrine-relation",
  mode: "symfony-app",
  title: "Связь ManyToOne: Book принадлежит Author",
  description:
    "Entity Author уже готова. Добавь в Book связь на Author вместо строки с именем автора — и проверь, что связь переживает выгрузку из identity map и повторное чтение из базы.",
  targetPath: "src/Entity/Book.php",
  setupCommands: ["php bin/console doctrine:schema:create"],
  contextFiles: [{ path: "src/Entity/Author.php", description: "сущность, на которую нужно сослаться" }],
  starterCode: `<?php

namespace App\\Entity;

use Doctrine\\ORM\\Mapping as ORM;

#[ORM\\Entity]
class Book
{
    #[ORM\\Id]
    #[ORM\\GeneratedValue]
    #[ORM\\Column]
    private ?int $id = null;

    #[ORM\\Column(length: 255)]
    private string $title = '';

    #[ORM\\Column]
    private int $year = 0;

    // TODO: добавь #[ORM\\ManyToOne] над свойством author типа ?Author

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;
        return $this;
    }

    public function getYear(): int
    {
        return $this->year;
    }

    public function setYear(int $year): static
    {
        $this->year = $year;
        return $this;
    }

    // TODO: добавь getAuthor(): ?Author и setAuthor(?Author $author): static
}
`,
  solution: `<?php

namespace App\\Entity;

use Doctrine\\ORM\\Mapping as ORM;

#[ORM\\Entity]
class Book
{
    #[ORM\\Id]
    #[ORM\\GeneratedValue]
    #[ORM\\Column]
    private ?int $id = null;

    #[ORM\\Column(length: 255)]
    private string $title = '';

    #[ORM\\Column]
    private int $year = 0;

    #[ORM\\ManyToOne]
    private ?Author $author = null;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    public function setTitle(string $title): static
    {
        $this->title = $title;
        return $this;
    }

    public function getYear(): int
    {
        return $this->year;
    }

    public function setYear(int $year): static
    {
        $this->year = $year;
        return $this;
    }

    public function getAuthor(): ?Author
    {
        return $this->author;
    }

    public function setAuthor(?Author $author): static
    {
        $this->author = $author;
        return $this;
    }
}
`,
  requests: [{ id: "r1", method: "POST", path: "/exercises/doctrine-relation" }],
  checks: [
    { type: "http-status", requestId: "r1", expectedStatus: 200, description: "Запрос отрабатывает без ошибок → 200" },
    { type: "http-body-contains", requestId: "r1", value: "Dune", description: "Книга сохранена и прочитана обратно" },
    {
      type: "http-body-contains",
      requestId: "r1",
      value: "Frank Herbert",
      description: "Связь с автором сохранилась и доступна после свежего чтения из базы (не из памяти)",
    },
  ],
  hint: "#[ORM\\ManyToOne] без указания targetEntity сработает, если PHP-тип свойства (?Author) уже достаточно однозначен — Doctrine умеет выводить целевую сущность из тайп-хинта.",
};
