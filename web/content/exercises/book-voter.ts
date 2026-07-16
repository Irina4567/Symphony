import type { Exercise } from "../types";
import { bookWithOwnerPhp } from "./shared/book-with-owner";
import { securityFullYaml } from "./shared/security-configs";
import { solvedApiLoginAuthenticatorPhp } from "./shared/solved-auth";

export const bookVoterExercise: Exercise = {
  id: "book-voter",
  mode: "symfony-app",
  title: "Напиши Voter: редактировать может только владелец",
  description:
    "У Book появилось поле owner. Напиши Voter, который разрешает действие EDIT только тому пользователю, который является владельцем конкретной книги — а не просто любому вошедшему пользователю.",
  targetPath: "src/Security/BookVoter.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-user"],
  contextFiles: [
    { path: "src/Entity/Book.php", description: "у книги появилось поле owner (связь с User)" },
    { path: "src/Entity/User.php", description: "готовая сущность пользователя" },
    {
      path: "src/Controller/VoterExerciseController.php",
      description: "создаёт книгу с владельцем и проверяет доступ через isGranted('EDIT', $book)",
    },
  ],
  fixtureOverrides: [
    { path: "src/Entity/Book.php", content: bookWithOwnerPhp },
    { path: "config/packages/security.yaml", content: securityFullYaml },
    { path: "src/Security/ApiLoginAuthenticator.php", content: solvedApiLoginAuthenticatorPhp },
  ],
  starterCode: `<?php

namespace App\\Security;

use App\\Entity\\Book;
use Symfony\\Component\\Security\\Core\\Authentication\\Token\\TokenInterface;
use Symfony\\Component\\Security\\Core\\Authorization\\Voter\\Vote;
use Symfony\\Component\\Security\\Core\\Authorization\\Voter\\Voter;
use Symfony\\Component\\Security\\Core\\User\\UserInterface;

class BookVoter extends Voter
{
    public const EDIT = 'EDIT';

    protected function supports(string $attribute, mixed $subject): bool
    {
        // TODO: этот Voter участвует только в проверках атрибута EDIT над объектом Book
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        // TODO: достань пользователя из $token->getUser(), если это не UserInterface — верни false
        // TODO: сравни email владельца книги ($subject->getOwner()?->getUserIdentifier())
        //   с email текущего пользователя ($user->getUserIdentifier())
    }
}
`,
  solution: `<?php

namespace App\\Security;

use App\\Entity\\Book;
use Symfony\\Component\\Security\\Core\\Authentication\\Token\\TokenInterface;
use Symfony\\Component\\Security\\Core\\Authorization\\Voter\\Vote;
use Symfony\\Component\\Security\\Core\\Authorization\\Voter\\Voter;
use Symfony\\Component\\Security\\Core\\User\\UserInterface;

class BookVoter extends Voter
{
    public const EDIT = 'EDIT';

    protected function supports(string $attribute, mixed $subject): bool
    {
        return $attribute === self::EDIT && $subject instanceof Book;
    }

    protected function voteOnAttribute(string $attribute, mixed $subject, TokenInterface $token, ?Vote $vote = null): bool
    {
        $user = $token->getUser();
        if (!$user instanceof UserInterface) {
            return false;
        }

        /** @var Book $book */
        $book = $subject;

        return $book->getOwner()?->getUserIdentifier() === $user->getUserIdentifier();
    }
}
`,
  requests: [
    { id: "setup", method: "POST", path: "/exercises/voter-setup" },
    {
      id: "login-reader",
      method: "POST",
      path: "/login",
      body: JSON.stringify({ email: "reader@bookshelf.test", password: "secret123" }),
    },
    { id: "owner-check", method: "GET", path: "/exercises/voter-check/1" },
    {
      id: "login-admin",
      method: "POST",
      path: "/login",
      body: JSON.stringify({ email: "admin@bookshelf.test", password: "secret123" }),
    },
    { id: "non-owner-check", method: "GET", path: "/exercises/voter-check/1" },
  ],
  checks: [
    { type: "http-status", requestId: "setup", expectedStatus: 200, description: "Создана книга с владельцем reader@bookshelf.test" },
    { type: "http-body-contains", requestId: "owner-check", value: '"canEdit":true', description: "Владелец книги (reader) может её редактировать" },
    {
      type: "http-body-contains",
      requestId: "non-owner-check",
      value: '"canEdit":false',
      description: "admin вошёл, но не владеет этой книгой — редактировать не может",
    },
  ],
  hint: "Voter отвечает не на вопрос 'есть ли у пользователя роль', а на вопрос 'разрешено ли ИМЕННО ЭТОМУ пользователю ИМЕННО ЭТО действие над ИМЕННО ЭТИМ объектом'. Поэтому voteOnAttribute() получает не только токен, но и сам объект ($subject).",
};
