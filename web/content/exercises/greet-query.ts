import type { Exercise } from "../types";

export const greetQueryExercise: Exercise = {
  id: "greet-query",
  mode: "symfony-app",
  title: "Query-параметр: /greet?lang=en",
  description:
    "Прочитай query-параметр lang (по умолчанию 'ru'). Если он равен 'en' — верни \"Hello!\", иначе — \"Привет!\".",
  targetPath: "src/Controller/GreetController.php",
  starterCode: `<?php

namespace App\\Controller;

use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\HttpFoundation\\Response;
use Symfony\\Component\\Routing\\Attribute\\Route;

class GreetController
{
    #[Route('/greet', name: 'greet', methods: ['GET'])]
    public function greet(Request $request): Response
    {
        // TODO: прочитай query-параметр lang (по умолчанию 'ru')
        // если 'en' — верни Response("Hello!")
        // иначе — верни Response("Привет!")
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use Symfony\\Component\\HttpFoundation\\Request;
use Symfony\\Component\\HttpFoundation\\Response;
use Symfony\\Component\\Routing\\Attribute\\Route;

class GreetController
{
    #[Route('/greet', name: 'greet', methods: ['GET'])]
    public function greet(Request $request): Response
    {
        $lang = $request->query->get('lang', 'ru');

        return new Response($lang === 'en' ? 'Hello!' : 'Привет!');
    }
}
`,
  requests: [
    { id: "r1", method: "GET", path: "/greet" },
    { id: "r2", method: "GET", path: "/greet?lang=en" },
  ],
  checks: [
    { type: "http-body-contains", requestId: "r1", value: "Привет!", description: "GET /greet (без параметра) → «Привет!»" },
    { type: "http-body-contains", requestId: "r2", value: "Hello!", description: "GET /greet?lang=en → «Hello!»" },
  ],
  hint: "$request->query — это ParameterBag для query-строки (?...). У него, как и у обычного массива-обёртки, есть метод get('ключ', 'значение по умолчанию').",
};
