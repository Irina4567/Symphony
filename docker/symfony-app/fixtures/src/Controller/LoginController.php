<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class LoginController extends AbstractController
{
    // Этот маршрут нужен только затем, чтобы он существовал: без реального маршрута на
    // /login роутинг Symfony отвечает 404 раньше, чем до запроса вообще успевает
    // добраться кастомный Authenticator — фаервол перехватывает запрос, только если
    // для него в принципе есть подходящий маршрут. Если тело этого метода реально
    // выполнилось — значит Authenticator почему-то не сработал (баг в его коде).
    #[Route('/login', name: 'app_login', methods: ['POST'])]
    public function login(): JsonResponse
    {
        return new JsonResponse(['ok' => false, 'error' => 'authenticator did not intercept'], 500);
    }
}
