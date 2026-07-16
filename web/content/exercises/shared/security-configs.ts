// Версии config/packages/security.yaml — по мере того, как блок про Security раскрывает
// новые механизмы. Базовая фикстура в docker/symfony-app/fixtures/config/packages/security.yaml
// содержит только password_hashers (состояние урока 1 — "user-entity"): фаервол выключен,
// про аутентификацию/роли речи ещё не было. Более "поздние" версии подставляются через
// fixtureOverrides только тем упражнениям, которые уже прошли соответствующую тему —
// как и с constrainedBookPhp в Блоке 4.

// Урок 2 "authentication": провайдер пользователей + кастомный аутентификатор.
// access_control ещё нет — про роли/access_control речь пойдёт в уроке 3.
export const securityWithAuthYaml = `security:
    password_hashers:
        Symfony\\Component\\Security\\Core\\User\\PasswordAuthenticatedUserInterface: 'auto'

    providers:
        app_user_provider:
            entity:
                class: App\\Entity\\User
                property: email

    firewalls:
        main:
            lazy: true
            provider: app_user_provider
            custom_authenticators:
                - App\\Security\\ApiLoginAuthenticator
`;

// Урок 3 "authorization-roles" и далее: то же самое + access_control — правило,
// защищающее /secure/admin-report только для ROLE_ADMIN.
export const securityFullYaml = `security:
    password_hashers:
        Symfony\\Component\\Security\\Core\\User\\PasswordAuthenticatedUserInterface: 'auto'

    providers:
        app_user_provider:
            entity:
                class: App\\Entity\\User
                property: email

    firewalls:
        main:
            lazy: true
            provider: app_user_provider
            custom_authenticators:
                - App\\Security\\ApiLoginAuthenticator

    access_control:
        - { path: ^/secure/admin-report, roles: ROLE_ADMIN }
`;
