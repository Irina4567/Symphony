<?php

namespace App\Entity;

use App\Repository\BookRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Постоянная фикстура — ученик её не редактирует, кроме упражнений, которые прямо просят
 * написать/расширить Entity (targetPath на время своего запуска подменяет собой эту фикстуру
 * в одноразовом контейнере): урок 1 и урок 4 блока про Doctrine — маппинг и связь.
 *
 * У этой версии сознательно нет Assert-констрейнтов — блок про Doctrine их ещё не проходил.
 * Упражнениям блока про формы, которым constraints нужны функционально (не только для показа),
 * они передаются через fixtureOverrides в самом упражнении — см. content/exercises/form-submit.ts
 * и bookshelf-form.ts.
 */
#[ORM\Entity(repositoryClass: BookRepository::class)]
class Book
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    private string $title = '';

    #[ORM\Column]
    private int $year = 0;

    #[ORM\ManyToOne]
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
