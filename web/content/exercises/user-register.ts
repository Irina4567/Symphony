import type { Exercise } from "../types";

export const userRegisterExercise: Exercise = {
  id: "user-register",
  mode: "symfony-app",
  title: "Регистрация: сохрани пользователя с хэшированным паролем",
  description:
    "Entity User уже готова. Напиши контроллер, который принимает JSON {email, password}, проверяет, что email ещё не занят, хэширует пароль через UserPasswordHasherInterface и сохраняет нового пользователя.",
  targetPath: "src/Controller/UserRegisterController.php",
  setupCommands: ["php bin/console doctrine:schema:create"],
  contextFiles: [
    { path: "src/Entity/User.php", description: "готовая сущность пользователя" },
    { path: "config/packages/security.yaml", description: "текущая конфигурация: настроен только хешер паролей" },
  ],
  starterCode: `<?php

namespace App\\Controller;

use App\\Entity\\User;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\PasswordHasher\\Hasher\\UserPasswordHasherInterface;
use Symfony\\Component\\Routing\\Attribute\\Route;

class UserRegisterController extends AbstractController
{
    #[Route('/users/register', methods: ['POST'])]
    public function register(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        // TODO: если email или password пустые — верни 400 с {"error": "..."}
        // TODO: если пользователь с таким email уже есть (findOneBy(['email' => $email]))
        //   — верни 400 с {"error": "..."}
        // TODO: иначе создай User, захэшируй пароль через $hasher->hashPassword($user, $password),
        //   сохрани (persist + flush) и верни 201 с {"id": ..., "email": ...}
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use App\\Entity\\User;
use Doctrine\\ORM\\EntityManagerInterface;
use Symfony\\Bundle\\FrameworkBundle\\Controller\\AbstractController;
use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\PasswordHasher\\Hasher\\UserPasswordHasherInterface;
use Symfony\\Component\\Routing\\Attribute\\Route;

class UserRegisterController extends AbstractController
{
    #[Route('/users/register', methods: ['POST'])]
    public function register(
        Request $request,
        EntityManagerInterface $em,
        UserPasswordHasherInterface $hasher
    ): JsonResponse {
        $data = json_decode($request->getContent(), true);
        $email = $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if ($email === '' || $password === '') {
            return new JsonResponse(['error' => 'email и password обязательны'], 400);
        }

        $existing = $em->getRepository(User::class)->findOneBy(['email' => $email]);
        if ($existing !== null) {
            return new JsonResponse(['error' => 'Такой email уже зарегистрирован'], 400);
        }

        $user = new User();
        $user->setEmail($email);
        $user->setPassword($hasher->hashPassword($user, $password));
        $em->persist($user);
        $em->flush();

        return new JsonResponse(['id' => $user->getId(), 'email' => $user->getEmail()], 201);
    }
}
`,
  requests: [
    {
      id: "register-ok",
      method: "POST",
      path: "/users/register",
      body: JSON.stringify({ email: "new@bookshelf.test", password: "secret123" }),
    },
    {
      id: "register-missing",
      method: "POST",
      path: "/users/register",
      body: JSON.stringify({ email: "" }),
    },
    {
      id: "register-duplicate",
      method: "POST",
      path: "/users/register",
      body: JSON.stringify({ email: "new@bookshelf.test", password: "another" }),
    },
  ],
  checks: [
    { type: "http-status", requestId: "register-ok", expectedStatus: 201, description: "Регистрация нового email → 201" },
    { type: "http-body-contains", requestId: "register-ok", value: "new@bookshelf.test", description: "Ответ содержит email созданного пользователя" },
    { type: "http-status", requestId: "register-missing", expectedStatus: 400, description: "Пустые email/password → 400" },
    { type: "http-status", requestId: "register-duplicate", expectedStatus: 400, description: "Повторная регистрация того же email → 400" },
    { type: "http-body-contains", requestId: "register-duplicate", value: '"error"', description: "Тело ответа содержит поле error с причиной отказа" },
  ],
  hint: "hashPassword() принимает сам объект User первым аргументом (он умеет посмотреть, каким алгоритмом хэшировать именно для этого класса) — password_hashers в security.yaml настроен на 'auto', так что Symfony сам выберет актуальный алгоритм.",
};
