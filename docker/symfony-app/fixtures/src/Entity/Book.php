<?php

namespace App\Entity;

use App\Repository\BookRepository;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Validator\Constraints as Assert;

/**
 * Постоянная фикстура — ученик её не редактирует, кроме упражнений, которые прямо просят
 * написать/расширить Entity (targetPath на время своего запуска подменяет собой эту фикстуру
 * в одноразовом контейнере): урок 1 и урок 4 блока про Doctrine — маппинг и связь; урок 2
 * блока про формы — Assert-констрейнты (в этой версии они уже есть).
 */
#[ORM\Entity(repositoryClass: BookRepository::class)]
class Book
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 255)]
    #[Assert\NotBlank(message: 'Введите название книги')]
    #[Assert\Length(min: 2, max: 255)]
    private string $title = '';

    #[ORM\Column]
    #[Assert\Range(min: 1450, max: 2100, notInRangeMessage: 'Год должен быть между {{ min }} и {{ max }}')]
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
