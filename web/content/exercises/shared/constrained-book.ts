// Версия src/Entity/Book.php с Assert-констрейнтами — то, что получается, если пройти
// упражнение validation-constraints (Блок 4, урок 2). Базовая фикстура в
// docker/symfony-app/fixtures/src/Entity/Book.php их не содержит (блок про Doctrine эту тему
// ещё не проходил); упражнениям, которым constraints нужны функционально, эта версия
// передаётся через fixtureOverrides, чтобы то, что видно ученику, никогда не забегало вперёд
// пройденного материала.
export const constrainedBookPhp = `<?php

namespace App\\Entity;

use App\\Repository\\BookRepository;
use Doctrine\\ORM\\Mapping as ORM;
use Symfony\\Component\\Validator\\Constraints as Assert;

#[ORM\\Entity(repositoryClass: BookRepository::class)]
class Book
{
    #[ORM\\Id]
    #[ORM\\GeneratedValue]
    #[ORM\\Column]
    private ?int $id = null;

    #[ORM\\Column(length: 255)]
    #[Assert\\NotBlank(message: 'Введите название книги')]
    #[Assert\\Length(min: 2, max: 255)]
    private string $title = '';

    #[ORM\\Column]
    #[Assert\\Range(min: 1450, max: 2100, notInRangeMessage: 'Год должен быть между {{ min }} и {{ max }}')]
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
`;
