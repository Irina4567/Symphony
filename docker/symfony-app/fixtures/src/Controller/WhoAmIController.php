<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

class WhoAmIController extends AbstractController
{
    #[Route('/whoami', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        $user = $this->getUser();

        return new JsonResponse([
            'authenticated' => $user !== null,
            'email' => $user?->getUserIdentifier(),
        ]);
    }
}
