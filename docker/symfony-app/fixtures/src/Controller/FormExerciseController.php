<?php

namespace App\Controller;

use App\Entity\Book;
use App\Form\BookFormType;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * Постоянный "харнесс" для упражнений блока про формы: маршруты уже написаны и зашиты
 * в образ песочницы. Ученик пишет FormType/Entity/контроллер, которые эти маршруты используют.
 */
class FormExerciseController extends AbstractController
{
    #[Route('/exercises/form-new', name: 'exercise_form_new', methods: ['GET'])]
    public function new(): Response
    {
        $form = $this->createForm(BookFormType::class, new Book());

        return $this->render('exercises/book_form.html.twig', ['form' => $form]);
    }

    #[Route('/exercises/form-validate', name: 'exercise_form_validate', methods: ['POST'])]
    public function validate(Request $request, ValidatorInterface $validator): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        $book = new Book();
        $book->setTitle($data['title'] ?? '');
        $book->setYear($data['year'] ?? 0);

        $violations = $validator->validate($book);
        $messages = [];
        foreach ($violations as $violation) {
            $messages[] = $violation->getMessage();
        }

        return new JsonResponse(['valid' => count($violations) === 0, 'errors' => $messages]);
    }

    #[Route('/exercises/flash-show', name: 'exercise_flash_show', methods: ['GET'])]
    public function flashShow(Request $request): Response
    {
        $messages = $request->getSession()->getFlashBag()->get('success');

        return new Response(implode(', ', $messages));
    }
}
