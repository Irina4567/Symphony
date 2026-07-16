// Решённые версии ApiLoginAuthenticator и BookVoter — того, что ученик сам пишет в
// упражнениях "api-login-authenticator" (урок 2) и "book-voter" (урок 4). Более поздним
// упражнениям (урок 3, мини-проект), которым нужна РАБОТАЮЩАЯ аутентификация/авторизация,
// но не сам процесс её написания, эти версии передаются через fixtureOverrides — как и
// constrainedBookPhp в Блоке 4.
export const solvedApiLoginAuthenticatorPhp = `<?php

namespace App\\Security;

use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\HttpFoundation\\Response;
use Symfony\\Component\\Security\\Core\\Authentication\\Token\\TokenInterface;
use Symfony\\Component\\Security\\Core\\Exception\\AuthenticationException;
use Symfony\\Component\\Security\\Http\\Authenticator\\AbstractAuthenticator;
use Symfony\\Component\\Security\\Http\\Authenticator\\Passport\\Badge\\UserBadge;
use Symfony\\Component\\Security\\Http\\Authenticator\\Passport\\Credentials\\PasswordCredentials;
use Symfony\\Component\\Security\\Http\\Authenticator\\Passport\\Passport;

class ApiLoginAuthenticator extends AbstractAuthenticator
{
    public function supports(Request $request): ?bool
    {
        return $request->getPathInfo() === '/login' && $request->isMethod('POST');
    }

    public function authenticate(Request $request): Passport
    {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        return new Passport(
            new UserBadge($email),
            new PasswordCredentials($password)
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return new JsonResponse(['ok' => true]);
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new JsonResponse(['ok' => false, 'error' => 'Invalid credentials'], 401);
    }
}
`;

export const solvedBookVoterPhp = `<?php

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
`;
