// Версия src/Entity/Book.php с полем owner — то, что получается, если добавить к
// constrainedBookPhp (Блок 4) связь с пользователем-владельцем книги. Нужна упражнениям
// про Voter (урок 4) и мини-проекту Блока 5, где авторизация проверяется не по роли,
// а по конкретному объекту ("редактировать может только тот, кто создал запись").
export const bookWithOwnerPhp = `<?php

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

    #[ORM\\ManyToOne]
    private ?User $owner = null;

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

    public function getOwner(): ?User
    {
        return $this->owner;
    }

    public function setOwner(?User $owner): static
    {
        $this->owner = $owner;
        return $this;
    }
}
`;
