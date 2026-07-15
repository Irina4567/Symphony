import type { Exercise } from "../types";

export const helloRouteExercise: Exercise = {
  id: "hello-route",
  mode: "symfony-app",
  title: "Первый маршрут: /hello/{name}",
  description:
    "Допиши метод так, чтобы GET-запрос на /hello/{name} возвращал приветствие с этим именем.",
  targetPath: "src/Controller/HelloController.php",
  starterCode: `<?php

namespace App\\Controller;

use Symfony\\Component\\HttpFoundation\\Response;
use Symfony\\Component\\Routing\\Attribute\\Route;

class HelloController
{
    #[Route('/hello/{name}', name: 'hello', methods: ['GET'])]
    public function hello(string $name): Response
    {
        // TODO: верни Response с текстом "Привет, {$name}!"
    }
}
`,
  solution: `<?php

namespace App\\Controller;

use Symfony\\Component\\HttpFoundation\\Response;
use Symfony\\Component\\Routing\\Attribute\\Route;

class HelloController
{
    #[Route('/hello/{name}', name: 'hello', methods: ['GET'])]
    public function hello(string $name): Response
    {
        return new Response("Привет, {$name}!");
    }
}
`,
  requests: [{ id: "r1", method: "GET", path: "/hello/Anna" }],
  checks: [
    { type: "http-status", requestId: "r1", expectedStatus: 200, description: "GET /hello/Anna → 200" },
    {
      type: "http-body-contains",
      requestId: "r1",
      value: "Привет, Anna!",
      description: 'Тело ответа содержит "Привет, Anna!"',
    },
  ],
  hint: "{$name} внутри двойных кавычек PHP подставит значение переменной $name прямо в строку.",
};
