import type { Exercise } from "../types";

export const validationConstraintsExercise: Exercise = {
  id: "validation-constraints",
  mode: "symfony-app",
  title: "Constraints: защити данные книги",
  description:
    "Добавь ограничения: title не должен быть пустым и короче 2 символов, year — быть в разумном диапазоне (1450-2100).",
  targetPath: "src/Entity/Book.php",
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

    // TODO: добавь #[Assert\\NotBlank] и #[Assert\\Length(min: 2, max: 255)]
    #[ORM\\Column(length: 255)]
    private string $title = '';

    // TODO: добавь #[Assert\\Range(min: 1450, max: 2100)]
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
use Symfony\\Component\\Validator\\Constraints as Assert;

#[ORM\\Entity]
class Book
{
    #[ORM\\Id]
    #[ORM\\GeneratedValue]
    #[ORM\\Column]
    private ?int $id = null;

    #[Assert\\NotBlank(message: 'Введите название книги')]
    #[Assert\\Length(min: 2, max: 255)]
    #[ORM\\Column(length: 255)]
    private string $title = '';

    #[Assert\\Range(min: 1450, max: 2100)]
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
  requests: [
    { id: "empty-title", method: "POST", path: "/exercises/form-validate", body: '{"title":"","year":1965}' },
    { id: "bad-year", method: "POST", path: "/exercises/form-validate", body: '{"title":"Dune","year":9999}' },
    { id: "ok", method: "POST", path: "/exercises/form-validate", body: '{"title":"Dune","year":1965}' },
  ],
  checks: [
    { type: "http-body-contains", requestId: "empty-title", value: '"valid":false', description: "Пустой title считается невалидным" },
    { type: "http-body-contains", requestId: "bad-year", value: '"valid":false', description: "Год 9999 вне диапазона считается невалидным" },
    { type: "http-body-contains", requestId: "ok", value: '"valid":true', description: "Корректные данные проходят валидацию" },
  ],
  hint: "Constraints можно поставить прямо над тем же свойством, что и #[ORM\\Column] — атрибуты PHP не мешают друг другу, их можно комбинировать сколько угодно над одним элементом.",
};
