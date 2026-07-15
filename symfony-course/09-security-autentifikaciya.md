# Модуль 09. Security — аутентификация

> Предыдущий модуль: [08 — Валидация](08-validaciya.md)

---

## 9.1. Аутентификация vs авторизация

Прежде чем нырять в код, зафиксируем терминологию, которую часто путают:

- **Аутентификация (Authentication)** — "кто ты?" Проверка личности: логин/пароль, токен, сертификат.
- **Авторизация (Authorization)** — "что тебе можно?" Проверка прав уже опознанного пользователя: роли, voters, ACL.

Этот модуль — про аутентификацию. Авторизацию разберём в модуле 10.

---

## 9.2. Компонент Security: firewalls, providers, authenticators

Security-система Symfony строится на нескольких ключевых понятиях:

- **Firewall** — набор правил обработки аутентификации для определённого сегмента URL (например, `/admin` и `/api` могут аутентифицироваться по-разному).
- **User Provider** — откуда брать пользователей (БД через Doctrine, LDAP, in-memory список для тестов).
- **Authenticator** — *как именно* проверяется личность (форма логина, JSON login, API-токен, OAuth).
- **Password Hasher** — как хранится/проверяется пароль.

```bash
composer require symfony/security-bundle
php bin/console make:user
```

Мастер `make:user` создаст сущность `User`, реализующую `UserInterface` (и опционально `PasswordAuthenticatedUserInterface`), и предложит настроить `security.yaml`.

---

## 9.3. Сущность User

```php
<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface;
use Symfony\Component\Security\Core\User\UserInterface;

#[ORM\Entity]
#[ORM\Table(name: 'users')]
#[ORM\UniqueConstraint(columns: ['email'])]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    #[ORM\Id, ORM\GeneratedValue, ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180, unique: true)]
    private string $email;

    #[ORM\Column]
    private array $roles = [];

    #[ORM\Column]
    private string $password; // хранит уже ХЕШИРОВАННЫЙ пароль, никогда не сырой!

    public function getUserIdentifier(): string
    {
        return $this->email; // то, что идентифицирует пользователя уникально (обычно email/username)
    }

    public function getRoles(): array
    {
        $roles = $this->roles;
        $roles[] = 'ROLE_USER'; // у КАЖДОГО аутентифицированного пользователя есть эта базовая роль
        return array_unique($roles);
    }

    public function getPassword(): string
    {
        return $this->password;
    }

    public function setPassword(string $password): static
    {
        $this->password = $password;
        return $this;
    }

    public function eraseCredentials(): void
    {
        // сюда можно очистить временные чувствительные поля (напр. plainPassword), если они есть
    }
}
```

**Важно:** `UserInterface` — контракт Security-системы, а не обязательно Doctrine-сущность. `User` в Symfony **необязательно** должен быть в базе данных — можно аутентифицировать через LDAP, внешний API и т.д., реализовав свой `UserProvider`.

---

## 9.4. security.yaml — карта конфигурации

```yaml
# config/packages/security.yaml
security:
    password_hashers:
        Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface: 'auto'

    providers:
        app_user_provider:
            entity:
                class: App\Entity\User
                property: email

    firewalls:
        dev:
            pattern: ^/(_(profiler|wdt)|css|images|js)/
            security: false

        main:
            lazy: true
            provider: app_user_provider
            custom_authenticator: App\Security\LoginFormAuthenticator
            logout:
                path: app_logout
                target: catalog_index
            remember_me:
                secret: '%kernel.secret%'
                lifetime: 604800 # 7 дней

    access_control:
        - { path: ^/admin, roles: ROLE_ADMIN }
        - { path: ^/account, roles: ROLE_USER }
        - { path: ^/login, roles: PUBLIC_ACCESS }
```

### Разбор ключевых секций

- **`password_hashers`** — `'auto'` означает "использовать лучший доступный алгоритм" (сейчас это `bcrypt`/`argon2id` в зависимости от того, что доступно на сервере) — не нужно выбирать алгоритм вручную.
- **`providers`** — откуда брать пользователей. `entity` + `property: email` означает "искать `User` по полю `email`".
- **`firewalls`** — `dev` firewall с `security: false` отключает аутентификацию для служебных путей (профайлер, статика) — иначе они тоже потребовали бы логин. `main` — основной firewall для всего приложения.
- **`access_control`** — списки правил "какой путь требует какой роли", проверяются **сверху вниз**, срабатывает первое совпадение. `PUBLIC_ACCESS` — специальная псевдо-роль "доступно всем, включая неаутентифицированных".

---

## 9.5. Хеширование паролей

**Никогда не храните пароли в открытом виде и никогда не пишите свой алгоритм хеширования.** Symfony предоставляет `UserPasswordHasherInterface`:

```php
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

class RegistrationController extends AbstractController
{
    #[Route('/register', name: 'app_register', methods: ['GET', 'POST'])]
    public function register(
        Request $request,
        UserPasswordHasherInterface $passwordHasher,
        EntityManagerInterface $em,
    ): Response {
        $user = new User();
        $form = $this->createForm(RegistrationFormType::class, $user);
        $form->handleRequest($request);

        if ($form->isSubmitted() && $form->isValid()) {
            $plainPassword = $form->get('plainPassword')->getData();

            $user->setPassword($passwordHasher->hashPassword($user, $plainPassword));
            $user->setRoles(['ROLE_USER']);

            $em->persist($user);
            $em->flush();

            return $this->redirectToRoute('app_login');
        }

        return $this->render('security/register.html.twig', ['form' => $form]);
    }
}
```

---

## 9.6. Форма логина: LoginFormAuthenticator

```bash
php bin/console make:auth
```

Мастер сгенерирует `src/Security/LoginFormAuthenticator.php` (или `SecurityController` с современным подходом через `AuthenticatorInterface` — начиная с Symfony 5.3+, устаревший Guard-компонент полностью заменён на **новую систему аутентификаторов**):

```php
<?php

namespace App\Security;

use Symfony\Component\Security\Http\Authenticator\AbstractLoginFormAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\{CsrfTokenBadge, RememberMeBadge, UserBadge};
use Symfony\Component\Security\Http\Authenticator\Passport\Credentials\PasswordCredentials;
use Symfony\Component\Security\Http\Authenticator\Passport\{Passport, SelfValidatingPassport};

class LoginFormAuthenticator extends AbstractLoginFormAuthenticator
{
    public const LOGIN_ROUTE = 'app_login';

    public function __construct(private UrlGeneratorInterface $urlGenerator) {}

    public function authenticate(Request $request): Passport
    {
        $email = $request->request->get('email', '');

        $request->getSession()->set(SecurityRequestAttributes::LAST_USERNAME, $email);

        return new Passport(
            new UserBadge($email),
            new PasswordCredentials($request->request->get('password', '')),
            [
                new CsrfTokenBadge('authenticate', $request->request->get('_csrf_token')),
                new RememberMeBadge(),
            ]
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        if ($targetPath = $this->getTargetPath($request->getSession(), $firewallName)) {
            return new RedirectResponse($targetPath);
        }
        return new RedirectResponse($this->urlGenerator->generate('catalog_index'));
    }

    protected function getLoginUrl(Request $request): string
    {
        return $this->urlGenerator->generate(self::LOGIN_ROUTE);
    }
}
```

Ключевая концепция новой Security-системы — **Passport**: объект, описывающий "что нужно проверить, чтобы удостовериться в личности" — комбинация `Badge` (доказательства/дополнительные требования, например CSRF-токен, remember-me) и `Credentials` (сами учётные данные — пароль).

Контроллер для страницы логина (сам логин обрабатывает authenticator, контроллер только рендерит форму и ловит ошибку):

```php
class SecurityController extends AbstractController
{
    #[Route('/login', name: 'app_login')]
    public function login(AuthenticationUtils $authenticationUtils): Response
    {
        $error = $authenticationUtils->getLastAuthenticationError();
        $lastUsername = $authenticationUtils->getLastUsername();

        return $this->render('security/login.html.twig', [
            'last_username' => $lastUsername,
            'error' => $error,
        ]);
    }

    #[Route('/logout', name: 'app_logout')]
    public function logout(): never
    {
        throw new \LogicException('Перехватывается firewall до вызова этого метода.');
    }
}
```

Обратите внимание на `logout()` — этот метод **никогда не выполняется**: маршрут `/logout` перехватывается системой безопасности раньше, чем запрос доходит до контроллера (см. `logout: path: app_logout` в конфиге). Метод существует только для того, чтобы маршрут был объявлен и `path()`/`generateUrl()` могли на него сослаться.

---

## 9.7. JSON-аутентификация для API

Для чистого API (модуль 11) используется `json_login` или, чаще в современных приложениях, аутентификация по токену/JWT:

```yaml
security:
    firewalls:
        api:
            pattern: ^/api
            stateless: true   # ВАЖНО: API обычно не использует сессии/cookie
            json_login:
                check_path: api_login
                username_path: email
                password_path: password
```

Для полноценных JWT рекомендуется бандл `lexik/jwt-authentication-bundle`, либо `symfony/security-bundle` с кастомным токен-аутентификатором. Разберём подробнее в контексте API Platform (модуль 12).

---

## 9.8. Remember Me

```yaml
firewalls:
    main:
        remember_me:
            secret: '%kernel.secret%'
            lifetime: 604800
            path: /
```

В форме логина добавьте чекбокс `<input type="checkbox" name="_remember_me">`, а в `authenticate()` — `new RememberMeBadge()` (уже показано выше).

---

## 9.9. Практика: логин покупателей BookNest

Регистрируем `User` с ролями `ROLE_CUSTOMER` по умолчанию, `ROLE_ADMIN` — только вручную назначаемая (через фикстуры или консольную команду для первого администратора):

```bash
php bin/console make:user
php bin/console make:registration-form
php bin/console make:auth
```

```php
// Консольная команда для назначения администратора
#[AsCommand(name: 'app:make-admin')]
class MakeAdminCommand extends Command
{
    public function __construct(private UserRepository $userRepository, private EntityManagerInterface $em)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addArgument('email', InputArgument::REQUIRED);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $user = $this->userRepository->findOneBy(['email' => $input->getArgument('email')]);
        if (!$user) {
            $output->writeln('<error>Пользователь не найден</error>');
            return Command::FAILURE;
        }

        $user->setRoles(['ROLE_ADMIN']);
        $this->em->flush();

        $output->writeln('<info>Готово, пользователь теперь администратор.</info>');
        return Command::SUCCESS;
    }
}
```

(Полноценно консольные команды разберём в модуле 15 — здесь просто демонстрация связи.)

---

## 9.10. Практика модуля 9

**Задание 1.** Настройте `access_control`, чтобы `/checkout` требовал `ROLE_USER`, а каталог оставался публичным.

**Задание 2.** Реализуйте страницу регистрации с валидацией уникальности email (используйте кастомный constraint из модуля 8 или `UniqueEntity`).

**Задание 3.** Добавьте "Запомнить меня" на форму логина и проверьте, что после закрытия и повторного открытия браузера (с сохранением cookies) сессия сохраняется.

**Задание 4.** Настройте отдельный `stateless` firewall для `/api` с `json_login`.

### Решения

<details>
<summary>Решение задания 1</summary>

```yaml
access_control:
    - { path: ^/admin, roles: ROLE_ADMIN }
    - { path: ^/checkout, roles: ROLE_USER }
    - { path: ^/, roles: PUBLIC_ACCESS }
```

Порядок важен — более специфичные правила должны идти раньше более общих, иначе `^/` перехватит всё первым.
</details>

<details>
<summary>Решение задания 2 (constraint)</summary>

```php
use Symfony\Bridge\Doctrine\Validator\Constraints\UniqueEntity;

#[UniqueEntity(fields: ['email'], message: 'Пользователь с таким email уже зарегистрирован')]
class User implements UserInterface, PasswordAuthenticatedUserInterface
{
    // ...
}
```

`UniqueEntity` — готовый constraint из `symfony/doctrine-bridge`, специально для этого распространённого случая, не нужно писать свой валидатор с нуля.
</details>

---

## 9.11. Частые ошибки новичков

1. **Хранят пароли в открытом виде или пишут свой хеш-алгоритм** — используйте только `UserPasswordHasherInterface`.
2. **Забывают `ROLE_USER` в `getRoles()`** — хотя обычно нет практической разницы (Symfony сам добавляет её негласно при проверке через `IS_AUTHENTICATED_FULLY` и подобные), явное добавление — хорошая практика для читаемости.
3. **Ставят API firewall без `stateless: true`** — тратятся ресурсы на сессии там, где они не нужны, плюс потенциальные проблемы с CSRF на JSON-эндпоинтах, где токен неприменим.
4. **Путают порядок правил в `access_control`** — общее правило `^/` в начале списка "съедает" все последующие более специфичные.
5. **Не проверяют `getLastAuthenticationError()`** и не показывают пользователю причину неудачного логина — UX страдает.
6. **Забывают `eraseCredentials()`**, если у сущности есть временное поле `plainPassword` — оно может "утечь" в сериализованный токен сессии.

---

## Чек-лист "Я умею" — Модуль 9

- [ ] Объяснить разницу между аутентификацией и авторизацией
- [ ] Настраивать `firewalls`/`providers`/`access_control` в `security.yaml`
- [ ] Создавать сущность `User`, реализующую `UserInterface`
- [ ] Хешировать и проверять пароли через `UserPasswordHasherInterface`
- [ ] Писать кастомный `Authenticator` на основе Passport/Badge
- [ ] Настраивать Remember Me и отдельный stateless firewall для API

**Дальше:** [Модуль 10 — Security: авторизация](10-security-avtorizaciya.md)
