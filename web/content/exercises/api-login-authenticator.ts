import type { Exercise } from "../types";
import { securityWithAuthYaml } from "./shared/security-configs";

export const apiLoginAuthenticatorExercise: Exercise = {
  id: "api-login-authenticator",
  mode: "symfony-app",
  title: "Напиши кастомный Authenticator",
  description:
    "Провайдер пользователей и маршрут /login уже настроены. Реализуй сам Authenticator: как проверять email/пароль из JSON-тела запроса, что вернуть при успехе и при провале.",
  targetPath: "src/Security/ApiLoginAuthenticator.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-user"],
  contextFiles: [
    { path: "src/Entity/User.php", description: "готовая сущность пользователя" },
    { path: "src/Controller/LoginController.php", description: "запасной маршрут /login (нужен, чтобы у роутинга был кандидат — см. пояснение в теории)" },
    { path: "config/packages/security.yaml", description: "провайдер пользователей и подключение твоего Authenticator уже настроены" },
  ],
  fixtureOverrides: [{ path: "config/packages/security.yaml", content: securityWithAuthYaml }],
  starterCode: `<?php

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
        // TODO: этот Authenticator должен включаться только для POST /login
    }

    public function authenticate(Request $request): Passport
    {
        // TODO: разбери JSON-тело запроса ($request->getContent()), достань email и password
        // верни new Passport(new UserBadge($email), new PasswordCredentials($password))
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        // TODO: верни JsonResponse(['ok' => true])
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        // TODO: верни JsonResponse(['ok' => false, 'error' => 'Invalid credentials'], 401)
    }
}
`,
  solution: `<?php

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
`,
  requests: [
    {
      id: "login-wrong",
      method: "POST",
      path: "/login",
      body: JSON.stringify({ email: "reader@bookshelf.test", password: "WRONG" }),
    },
    {
      id: "login-ok",
      method: "POST",
      path: "/login",
      body: JSON.stringify({ email: "reader@bookshelf.test", password: "secret123" }),
    },
    { id: "whoami", method: "GET", path: "/whoami" },
  ],
  checks: [
    { type: "http-status", requestId: "login-wrong", expectedStatus: 401, description: "Неверный пароль → 401" },
    { type: "http-status", requestId: "login-ok", expectedStatus: 200, description: "Верные email/пароль → 200" },
    { type: "http-body-contains", requestId: "login-ok", value: '"ok":true', description: "Тело успешного ответа — {\"ok\":true}" },
    { type: "http-body-contains", requestId: "whoami", value: "reader@bookshelf.test", description: "После логина сессия сохраняется: /whoami видит того же пользователя" },
  ],
  hint: "PasswordCredentials хранит открытый пароль только на время одного запроса — саму сверку с хэшем из базы делает внутренний UserProvider + PasswordHasher, тебе вручную сравнивать хэши не нужно.",
};
