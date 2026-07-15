import type { Exercise } from "../types";

export const doctrineEntityExercise: Exercise = {
  id: "doctrine-entity",
  mode: "symfony-app",
  title: "Первая Entity: маппинг класса на таблицу",
  description:
    "Допиши ORM-атрибуты у класса Book, чтобы Doctrine могла создать под него таблицу и сохранить/прочитать запись из настоящей SQLite-базы.",
  targetPath: "src/Entity/Book.php",
  setupCommands: ["php bin/console doctrine:schema:create"],
  starterCode: `<?php

namespace App\\Entity;

use Doctrine\\ORM\\Mapping as ORM;

// TODO: добавь атрибут #[ORM\\Entity] над классом
class Book
{
    // TODO: добавь #[ORM\\Id], #[ORM\\GeneratedValue] и #[ORM\\Column] над свойством id
    private ?int $id = null;

    // TODO: добавь #[ORM\\Column(length: 255)] над title
    private string $title = '';

    // TODO: добавь #[ORM\\Column(length: 255)] над author
    private string $author = '';

    // TODO: добавь #[ORM\\Column] над year
    private int $year = 0;

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

    public function getAuthor(): string
    {
        return $this->author;
    }

    public function setAuthor(string $author): static
    {
        $this->author = $author;
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

    #[ORM\\Column(length: 255)]
    private string $author = '';

    #[ORM\\Column]
    private int $year = 0;

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

    public function getAuthor(): string
    {
        return $this->author;
    }

    public function setAuthor(string $author): static
    {
        $this->author = $author;
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
}
`,
  requests: [{ id: "r1", method: "POST", path: "/exercises/doctrine-entity" }],
  checks: [
    { type: "http-status", requestId: "r1", expectedStatus: 200, description: "Запрос отрабатывает без ошибок → 200" },
    { type: "http-body-contains", requestId: "r1", value: '"title":"1984"', description: "Книга сохранена и прочитана обратно из базы" },
    { type: "http-body-contains", requestId: "r1", value: '"author":"George Orwell"', description: "Поле author сохранено верно" },
    { type: "http-body-contains", requestId: "r1", value: '"year":1949', description: "Поле year сохранено с верным типом (число, не строка)" },
  ],
  hint: "Контроллер за кулисами делает persist() + flush(), затем em->clear() (чтобы не читать из кэша identity map) и заново find() по id — если атрибуты неверны, Doctrine не сможет создать таблицу или сохранить объект, и ты увидишь ошибку вместо JSON.",
};
