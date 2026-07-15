# Модуль 26. Продвинутая аутентификация: OAuth2, OIDC, SSO, JWT, LDAP

> Предыдущий модуль: [25 — Real-time: Mercure, WebSockets, SSE](25-realtime-mercure.md)
>
> В модуле 9 мы разобрали классическую аутентификацию по логину/паролю. Здесь — то, с чем реально сталкивается senior-разработчик в enterprise: вход через Google/GitHub, единый вход в рамках компании (SSO), выдача токенов для мобильных приложений, интеграция с корпоративным LDAP.

---

## 26.1. OAuth2 "вход через провайдера" (Social Login)

Задача: пользователь нажимает "Войти через Google", авторизуется на стороне Google, возвращается в BookNest уже аутентифицированным — без создания пароля на вашей стороне.

```bash
composer require knpuniversity/oauth2-client-bundle league/oauth2-google
```

```yaml
# config/packages/knpu_oauth2_client.yaml
knpu_oauth2_client:
    clients:
        google:
            type: google
            client_id: '%env(GOOGLE_CLIENT_ID)%'
            client_secret: '%env(GOOGLE_CLIENT_SECRET)%'
            redirect_route: connect_google_check
```

```php
<?php

namespace App\Controller;

use KnpU\OAuth2ClientBundle\Client\ClientRegistry;

class GoogleAuthController extends AbstractController
{
    #[Route('/connect/google', name: 'connect_google_start')]
    public function connect(ClientRegistry $clientRegistry): Response
    {
        return $clientRegistry->getClient('google')->redirect(['email', 'profile']);
    }

    #[Route('/connect/google/check', name: 'connect_google_check')]
    public function check(): Response
    {
        // логика аутентификации происходит в GoogleAuthenticator (см. ниже) —
        // Security перехватывает этот маршрут раньше, чем выполнится тело метода
        throw new \LogicException('Этот метод не должен вызываться напрямую');
    }
}
```

### Кастомный Authenticator для OAuth2

```php
<?php

namespace App\Security;

use KnpU\OAuth2ClientBundle\Client\ClientRegistry;
use KnpU\OAuth2ClientBundle\Security\Authenticator\OAuth2Authenticator;
use League\OAuth2\Client\Provider\GoogleUser;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

class GoogleAuthenticator extends OAuth2Authenticator
{
    public function __construct(
        private ClientRegistry $clientRegistry,
        private UserRepository $userRepository,
        private EntityManagerInterface $em,
    ) {}

    public function supports(Request $request): ?bool
    {
        return $request->attributes->get('_route') === 'connect_google_check';
    }

    public function authenticate(Request $request): Passport
    {
        $client = $this->clientRegistry->getClient('google');
        $accessToken = $this->fetchAccessToken($client);

        return new SelfValidatingPassport(
            new UserBadge($accessToken->getToken(), function () use ($accessToken, $client) {
                /** @var GoogleUser $googleUser */
                $googleUser = $client->fetchUserFromToken($accessToken);

                $user = $this->userRepository->findOneBy(['email' => $googleUser->getEmail()]);

                if (!$user) {
                    $user = (new User())
                        ->setEmail($googleUser->getEmail())
                        ->setRoles(['ROLE_USER'])
                        ->setGoogleId($googleUser->getId());
                    $this->em->persist($user);
                    $this->em->flush();
                }

                return $user;
            }),
        );
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return new RedirectResponse('/account');
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new RedirectResponse('/login');
    }
}
```

`SelfValidatingPassport` — используется, когда "проверка пароля" не нужна (провайдер уже подтвердил личность), важна только идентификация и загрузка/создание пользователя. Обратите внимание на паттерн "создать пользователя при первом входе" (just-in-time provisioning) — распространён для social login.

---

## 26.2. OpenID Connect (OIDC) и корпоративный SSO

**OIDC** — надстройка над OAuth2, добавляющая стандартизированный **ID Token** (JWT с информацией о личности пользователя), что делает его подходящим не просто для "авторизации доступа к API", а именно для **аутентификации**. Используется для интеграции с корпоративными Identity Provider (Keycloak, Okta, Azure AD, Auth0) — классический сценарий SSO в компании: один логин для всех внутренних систем.

```bash
composer require league/oauth2-client
```

Общая механика похожа на 26.1, но провайдер настраивается на конкретный OIDC-эндпоинт (`.well-known/openid-configuration`), а вместо `fetchUserFromToken` декодируется и валидируется ID Token (JWT) — обычно через готовую библиотеку (`web-token/jwt-framework`), проверяющую подпись токена сертификатом провайдера.

```php
use Jose\Component\Signature\JWSVerifier;
use Jose\Component\Signature\Serializer\CompactSerializer;

class OidcTokenValidator
{
    public function validate(string $idToken): array
    {
        $jws = (new CompactSerializer())->unserialize($idToken);
        // ... проверка подписи через публичный ключ провайдера (JWKS endpoint) ...
        return json_decode($jws->getPayload(), true); // claims: sub, email, name, ...
    }
}
```

**Ключевая практическая рекомендация для enterprise-интеграций:** не изобретайте валидацию JWT/OIDC с нуля — используйте проверенные библиотеки (`web-token/jwt-framework`, `league/oauth2-client` с готовыми провайдерами под конкретный Identity Provider) — самостоятельная реализация криптографической проверки подписи токенов — частый источник уязвимостей.

---

## 26.3. JWT для stateless API (мобильные приложения, SPA)

В модуле 9 мы упомянули `stateless: true` для API firewall. Теперь разберём полноценную JWT-аутентификацию.

```bash
composer require lexik/jwt-authentication-bundle
php bin/console lexik:jwt:generate-keypair
```

```yaml
# config/packages/lexik_jwt_authentication.yaml
lexik_jwt_authentication:
    secret_key: '%env(resolve:JWT_SECRET_KEY)%'
    public_key: '%env(resolve:JWT_PUBLIC_KEY)%'
    pass_phrase: '%env(JWT_PASSPHRASE)%'
    token_ttl: 3600
```

```yaml
security:
    firewalls:
        api_login:
            pattern: ^/api/login
            stateless: true
            json_login:
                check_path: /api/login_check
                success_handler: lexik_jwt_authentication.handler.authentication_success
                failure_handler: lexik_jwt_authentication.handler.authentication_failure
        api:
            pattern: ^/api
            stateless: true
            jwt: ~
```

```bash
curl -X POST https://booknest.example/api/login -d '{"email":"user@example.com","password":"secret"}'
# → {"token": "eyJhbGci..."}

curl https://booknest.example/api/books -H "Authorization: Bearer eyJhbGci..."
```

### Кастомные claims в JWT

```php
#[AsEventListener(event: 'lexik_jwt_authentication.on_jwt_created')]
class JwtCreatedListener
{
    public function __invoke(JWTCreatedEvent $event): void
    {
        $user = $event->getUser();
        $payload = $event->getData();
        $payload['roles'] = $user->getRoles();
        $payload['customerId'] = $user->getId();
        $event->setData($payload);
    }
}
```

### Refresh Token — продление сессии без повторного логина

```bash
composer require gesdinet/jwt-refresh-token-bundle
```

Access Token намеренно короткоживущий (например, 15 минут — минимизирует урон при утечке), Refresh Token — долгоживущий, хранится безопасно (обычно в httpOnly cookie), используется только для получения нового Access Token, не даёт прямого доступа к API.

---

## 26.4. API Key аутентификация (для интеграций сервер-сервер)

Простой, но распространённый в B2B-интеграциях подход — статический ключ в заголовке:

```php
<?php

namespace App\Security;

use Symfony\Component\Security\Http\Authenticator\AbstractAuthenticator;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;
use Symfony\Component\Security\Http\Authenticator\Passport\SelfValidatingPassport;

class ApiKeyAuthenticator extends AbstractAuthenticator
{
    public function __construct(private ApiClientRepository $apiClientRepository) {}

    public function supports(Request $request): ?bool
    {
        return $request->headers->has('X-Api-Key');
    }

    public function authenticate(Request $request): Passport
    {
        $apiKey = $request->headers->get('X-Api-Key');

        return new SelfValidatingPassport(
            new UserBadge($apiKey, function (string $apiKey) {
                $client = $this->apiClientRepository->findOneBy(['apiKey' => $apiKey]);

                if (!$client || !$client->isActive()) {
                    throw new CustomUserMessageAuthenticationException('Неверный или отключённый API-ключ');
                }

                return $client;
            }),
        );
    }

    public function onAuthenticationFailure(Request $request, AuthenticationException $exception): ?Response
    {
        return new JsonResponse(['error' => $exception->getMessage()], 401);
    }

    public function onAuthenticationSuccess(Request $request, TokenInterface $token, string $firewallName): ?Response
    {
        return null; // продолжить выполнение запроса как обычно
    }
}
```

**Важная деталь безопасности:** API-ключи должны храниться в БД **хешированными** (аналогично паролям), а не в открытом виде — при компрометации БД злоумышленник не должен сразу получить рабочие ключи всех интеграций.

---

## 26.5. LDAP — интеграция с корпоративным каталогом

Многие enterprise-компании используют Active Directory/LDAP как единый источник учётных записей сотрудников — Symfony поддерживает это "из коробки":

```bash
composer require symfony/ldap
```

```yaml
security:
    providers:
        ldap_provider:
            ldap:
                service: Symfony\Component\Ldap\Ldap
                base_dn: 'dc=booknest,dc=example,dc=com'
                search_dn: 'cn=admin,dc=booknest,dc=example,dc=com'
                search_password: '%env(LDAP_ADMIN_PASSWORD)%'
                default_roles: ROLE_USER
                uid_key: uid

    firewalls:
        main:
            provider: ldap_provider
            form_login_ldap:
                service: Symfony\Component\Ldap\Ldap
                dn_string: 'uid={username},ou=employees,dc=booknest,dc=example,dc=com'
```

---

## 26.6. Сравнительная таблица: что когда использовать

| Сценарий | Механизм |
|---|---|
| Обычный сайт, свои пользователи | Форма логина + хеш пароля (модуль 9) |
| "Войти через Google/GitHub" | OAuth2 Social Login |
| Единый вход в рамках компании (несколько внутренних систем) | OIDC + корпоративный Identity Provider (Keycloak/Okta/Azure AD) |
| Мобильное приложение / SPA, отдельный от Symfony фронтенд | JWT (access + refresh token) |
| Интеграция сервер-сервер (партнёрское API) | API Key |
| Корпоративный каталог сотрудников | LDAP |

---

## 26.7. Практика: расширяем безопасность BookNest

1. Добавить "Войти через Google" как альтернативу email/паролю на странице логина.
2. Настроить отдельный JWT-защищённый firewall для мобильного API (`/api/mobile/*`) с refresh-токенами.
3. Выдать нескольким партнёрам (книжным издательствам, присылающим фиды каталога) API-ключи для `/api/partners/*`.

---

## 26.8. Практика модуля 26

**Задание 1.** Реализуйте вход через Google по примеру раздела 26.1, с автоматическим созданием `User` при первом входе.

**Задание 2.** Настройте `lexik/jwt-authentication-bundle` для мобильного API, добавьте кастомный claim `customerId` в токен.

**Задание 3.** Реализуйте `ApiKeyAuthenticator` для партнёрского API, с хешированием ключей в БД (используйте `UserPasswordHasherInterface` тем же образом, что и для обычных паролей).

**Задание 4.** Объясните словами, почему Access Token в JWT-схеме должен быть короткоживущим, а не таким же долгим, как обычная сессия.

### Решения

<details>
<summary>Обсуждение задания 4</summary>

В отличие от обычной сессии (которая хранится на сервере и может быть немедленно инвалидирована — например, при логауте или компрометации), JWT — самодостаточный токен: сервер **не хранит** его состояние и не может "отозвать" конкретный токен до истечения его срока действия (без дополнительной инфраструктуры вроде черного списка токенов, что противоречит самой идее stateless-подхода). Поэтому если Access Token скомпрометирован (украден через XSS, перехвачен), он остаётся действительным до истечения TTL. Короткий TTL (минуты) минимизирует окно эксплуатации при утечке, а механизм Refresh Token (хранящийся более безопасно, обычно в httpOnly cookie, и который можно инвалидировать на сервере) позволяет не требовать от пользователя частого повторного логина.
</details>

---

## 26.9. Частые ошибки новичков

1. **Пишут собственную реализацию проверки JWT-подписи** вместо использования проверенных библиотек — источник серьёзных уязвимостей (например, принятие токена с `alg: none`).
2. **Хранят API-ключи в открытом виде в БД** — при утечке базы компрометируются все интеграции разом.
3. **Делают Access Token долгоживущим** "для удобства", не реализуя Refresh Token — увеличивает урон при компрометации.
4. **Путают OAuth2 (авторизация доступа) и OIDC (аутентификация личности)** — используют чистый OAuth2 там, где нужна именно проверка личности пользователя.
5. **Не проверяют `email_verified` claim** при OIDC/Social Login — некоторые провайдеры позволяют регистрацию с неподтверждённым email, что может привести к захвату чужого аккаунта, если в системе уже есть пользователь с этим email.

---

## Чек-лист "Я умею" — Модуль 26

- [ ] Реализовывать Social Login (OAuth2) с автоматическим созданием пользователя
- [ ] Объяснить разницу OAuth2 и OIDC, знать, когда нужен именно OIDC
- [ ] Настраивать JWT-аутентификацию с access/refresh токенами для stateless API
- [ ] Добавлять кастомные claims в JWT
- [ ] Реализовывать API Key аутентификацию для B2B-интеграций с безопасным хранением ключей
- [ ] Настраивать LDAP-провайдер для корпоративной аутентификации
- [ ] Осознанно выбирать механизм аутентификации под конкретный сценарий

**Дальше:** [Модуль 27 — Event Sourcing и полноценный CQRS](27-event-sourcing-cqrs.md)
