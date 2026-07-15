import type { Exercise } from "../types";

export const doctrineQueryExercise: Exercise = {
  id: "doctrine-query",
  mode: "symfony-app",
  title: "QueryBuilder: собственный метод репозитория",
  description:
    "База уже засеяна тремя книгами (1984/1949, Clean Code/2008, Dune/1965). Допиши метод репозитория, который через QueryBuilder возвращает книги, изданные после заданного года, отсортированные по году по возрастанию.",
  targetPath: "src/Repository/BookRepository.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-books"],
  starterCode: `<?php

namespace App\\Repository;

use App\\Entity\\Book;
use Doctrine\\Bundle\\DoctrineBundle\\Repository\\ServiceEntityRepository;
use Doctrine\\Persistence\\ManagerRegistry;

class BookRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Book::class);
    }

    /**
     * @return Book[]
     */
    public function findPublishedAfter(int $year): array
    {
        // TODO: через $this->createQueryBuilder('b') верни книги, у которых b.year > $year,
        // отсортированные по b.year по возрастанию (orderBy)
    }
}
`,
  solution: `<?php

namespace App\\Repository;

use App\\Entity\\Book;
use Doctrine\\Bundle\\DoctrineBundle\\Repository\\ServiceEntityRepository;
use Doctrine\\Persistence\\ManagerRegistry;

class BookRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Book::class);
    }

    /**
     * @return Book[]
     */
    public function findPublishedAfter(int $year): array
    {
        return $this->createQueryBuilder('b')
            ->where('b.year > :year')
            ->setParameter('year', $year)
            ->orderBy('b.year', 'ASC')
            ->getQuery()
            ->getResult();
    }
}
`,
  requests: [{ id: "r1", method: "GET", path: "/exercises/doctrine-query" }],
  checks: [
    { type: "http-status", requestId: "r1", expectedStatus: 200, description: "Запрос отрабатывает без ошибок → 200" },
    { type: "http-body-contains", requestId: "r1", value: "Dune", description: "Есть книга, изданная после 1950 (Dune, 1965)" },
    { type: "http-body-contains", requestId: "r1", value: "Clean Code", description: "Есть книга, изданная после 1950 (Clean Code, 2008)" },
    { type: "http-body-not-contains", requestId: "r1", value: "1984", description: "Книга 1949 года издания отфильтрована (year > 1950 не выполняется)" },
    {
      type: "http-body-matches",
      requestId: "r1",
      pattern: "Dune[\\s\\S]*Clean Code",
      description: "Книги идут в порядке возрастания года (Dune 1965 раньше, чем Clean Code 2008)",
    },
  ],
  hint: "setParameter('year', $year) — обязательная привычка: параметры QueryBuilder биндятся, а не подставляются в строку напрямую, это защищает от SQL-инъекций даже если значение в итоге придёт от пользователя.",
};
