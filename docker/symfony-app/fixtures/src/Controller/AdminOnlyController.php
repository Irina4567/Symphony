<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

// Этот контроллер не содержит НИКАКИХ проверок доступа в коде — маршрут защищён
// исключительно правилом access_control в config/packages/security.yaml. Так выглядит
// декларативная защита "всё под этим префиксом URL — только для ROLE_ADMIN".
class AdminOnlyController extends AbstractController
{
    #[Route('/secure/admin-report', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        return new JsonResponse(['ok' => true, 'report' => 'секретные цифры продаж']);
    }
}
