import type { Exercise } from "../types";

export const pingStatusExercise: Exercise = {
  id: "ping-status",
  mode: "symfony-app",
  title: "Явный код ответа: POST /ping",
  description:
    'Допиши метод так, чтобы POST /ping возвращал тело "pong" и код 201 (Response::HTTP_CREATED).',
  targetPath: "src/Controller/PingController.php",
  starterCode: `<?php

namespace App\\Controller;

use Symfony\\Component\\HttpFoundation\\Response;
use Symfony\\Component\\Routing\\Attribute\\Route;

class PingController
{
    #[Route('/ping', name: 'ping', methods: ['POST'])]
    public function ping(): Response
    {
        // TODO: верни Response с телом "pong" и кодом Response::HTTP_CREATED
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use Symfony\\Component\\HttpFoundation\\Response;
use Symfony\\Component\\Routing\\Attribute\\Route;

class PingController
{
    #[Route('/ping', name: 'ping', methods: ['POST'])]
    public function ping(): Response
    {
        return new Response('pong', Response::HTTP_CREATED);
    }
}
`,
  requests: [{ id: "r1", method: "POST", path: "/ping" }],
  checks: [
    { type: "http-status", requestId: "r1", expectedStatus: 201, description: "POST /ping → 201" },
    { type: "http-body-contains", requestId: "r1", value: "pong", description: 'Тело ответа содержит "pong"' },
  ],
  hint: "Второй аргумент конструктора Response — код ответа. Response::HTTP_CREATED — это просто именованная константа со значением 201, читать код с ней приятнее, чем с голым числом.",
};
