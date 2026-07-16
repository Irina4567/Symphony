import type { Exercise } from "../types";
import { securityFullYaml } from "./shared/security-configs";
import { solvedApiLoginAuthenticatorPhp } from "./shared/solved-auth";

export const rolesControllerExercise: Exercise = {
  id: "roles-controller",
  mode: "symfony-app",
  title: "Защити маршрут по роли",
  description:
    "Напиши маршрут, доступный только вошедшим пользователям (любая роль), используя атрибут #[IsGranted]. Для сравнения рядом уже есть другой защищённый маршрут — но его защита целиком описана в security.yaml, без единой строчки кода в контроллере.",
  targetPath: "src/Controller/MyProfileController.php",
  setupCommands: ["php bin/console doctrine:schema:create", "php bin/console app:seed-user"],
  contextFiles: [
    { path: "src/Security/ApiLoginAuthenticator.php", description: "рабочий Authenticator из прошлого урока" },
    {
      path: "src/Controller/AdminOnlyController.php",
      description: "GET /secure/admin-report — защищён не кодом, а правилом access_control ниже",
    },
    {
      path: "config/packages/security.yaml",
      description: "появилось правило access_control для /secure/admin-report",
    },
  ],
  fixtureOverrides: [
    { path: "config/packages/security.yaml", content: securityFullYaml },
    { path: "src/Security/ApiLoginAuthenticator.php", content: solvedApiLoginAuthenticatorPhp },
  ],
  starterCode: `<?php

namespace App\\Controller;

use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;
use Symfony\\Component\\Security\\Http\\Attribute\\IsGranted;

class MyProfileController extends AbstractController
{
    #[Route('/secure/my-profile', methods: ['GET'])]
    // TODO: добавь атрибут #[IsGranted('ROLE_USER')] над методом ниже
    public function __invoke(): JsonResponse
    {
        // TODO: верни JsonResponse(['email' => $this->getUser()?->getUserIdentifier()])
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\Routing\\Attribute\\Route;
use Symfony\\Component\\Security\\Http\\Attribute\\IsGranted;

class MyProfileController extends AbstractController
{
    #[Route('/secure/my-profile', methods: ['GET'])]
    #[IsGranted('ROLE_USER')]
    public function __invoke(): JsonResponse
    {
        return new JsonResponse(['email' => $this->getUser()?->getUserIdentifier()]);
    }
}
`,
  requests: [
    { id: "anon-profile", method: "GET", path: "/secure/my-profile" },
    {
      id: "login-reader",
      method: "POST",
      path: "/login",
      body: JSON.stringify({ email: "reader@bookshelf.test", password: "secret123" }),
    },
    { id: "reader-profile", method: "GET", path: "/secure/my-profile" },
    { id: "reader-admin-report", method: "GET", path: "/secure/admin-report" },
    {
      id: "login-admin",
      method: "POST",
      path: "/login",
      body: JSON.stringify({ email: "admin@bookshelf.test", password: "secret123" }),
    },
    { id: "admin-admin-report", method: "GET", path: "/secure/admin-report" },
  ],
  checks: [
    { type: "http-status", requestId: "anon-profile", expectedStatus: 401, description: "Анонимный запрос к /secure/my-profile → 401" },
    { type: "http-status", requestId: "reader-profile", expectedStatus: 200, description: "После логина reader → 200" },
    { type: "http-body-contains", requestId: "reader-profile", value: "reader@bookshelf.test", description: "Ответ содержит email вошедшего пользователя" },
    {
      type: "http-status",
      requestId: "reader-admin-report",
      expectedStatus: 403,
      description: "reader (ROLE_USER, но не ROLE_ADMIN) на /secure/admin-report → 403 (сработал access_control)",
    },
    {
      type: "http-status",
      requestId: "admin-admin-report",
      expectedStatus: 200,
      description: "admin (ROLE_ADMIN) на тот же маршрут → 200",
    },
  ],
  hint: "Разница между 401 и 403: 401 — 'мы не знаем, кто ты' (анонимный запрос), 403 — 'мы знаем, кто ты, но тебе сюда нельзя' (роли не хватает). Symfony проставляет их автоматически по одному и тому же исключению AccessDeniedException, в зависимости от того, аутентифицирован ли токен.",
};
