import type { Exercise } from "../types";

export const echoApiExercise: Exercise = {
  id: "echo-api",
  mode: "symfony-app",
  title: "JSON API: POST /api/echo",
  description:
    "Разбери JSON-тело запроса. Если поля text нет — верни 400 с ошибкой. Если есть — верни его обратно в JSON с кодом 200.",
  targetPath: "src/Controller/EchoController.php",
  starterCode: `<?php

namespace App\\Controller;

use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class EchoController
{
    #[Route('/api/echo', name: 'api_echo', methods: ['POST'])]
    public function echo(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        // TODO: если в $data нет ключа 'text' — верни JsonResponse(['ok' => false, 'error' => 'text is required'], 400)
        // иначе — верни JsonResponse(['ok' => true, 'text' => $data['text']])
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use Symfony\\Component\\HttpFoundation\\JsonResponse;
use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\Routing\\Attribute\\Route;

class EchoController
{
    #[Route('/api/echo', name: 'api_echo', methods: ['POST'])]
    public function echo(Request $request): JsonResponse
    {
        $data = json_decode($request->getContent(), true);

        if (!isset($data['text'])) {
            return new JsonResponse(['ok' => false, 'error' => 'text is required'], 400);
        }

        return new JsonResponse(['ok' => true, 'text' => $data['text']]);
    }
}
`,
  requests: [
    { id: "r1", method: "POST", path: "/api/echo", body: '{"text":"hello"}' },
    { id: "r2", method: "POST", path: "/api/echo", body: "{}" },
  ],
  checks: [
    { type: "http-status", requestId: "r1", expectedStatus: 200, description: 'POST с {"text":"hello"} → 200' },
    { type: "http-body-contains", requestId: "r1", value: '"text":"hello"', description: "Тело содержит переданный text" },
    { type: "http-status", requestId: "r2", expectedStatus: 400, description: "POST без text → 400" },
    { type: "http-body-contains", requestId: "r2", value: "text is required", description: "Тело содержит текст ошибки" },
  ],
  hint: "isset($data['text']) вернёт false и когда ключа нет, и когда значение null — этого достаточно для простой проверки без компонента Validator.",
};
