import type { Quiz } from "../types";
import { whatIsSymfonyQuiz } from "./what-is-symfony";
import { installationQuiz } from "./installation";
import { consoleAndEnvironmentsQuiz } from "./console-and-environments";
import { routingBasicsQuiz } from "./routing-basics";
import { controllersAndResponseQuiz } from "./controllers-and-response";
import { requestAndQueryQuiz } from "./request-and-query";
import { jsonApiQuiz } from "./json-api";
import { twigBasicsQuiz } from "./twig-basics";
import { controlStructuresQuiz } from "./control-structures";
import { templateInheritanceQuiz } from "./template-inheritance";
import { linksAndAssetsQuiz } from "./links-and-assets";
import { entityBasicsQuiz } from "./entity-basics";
import { entityManagerQuiz } from "./entity-manager";
import { queryBuilderQuiz } from "./query-builder";
import { relationsQuiz } from "./relations";

export const quizzes: Record<string, Quiz> = {
  [whatIsSymfonyQuiz.id]: whatIsSymfonyQuiz,
  [installationQuiz.id]: installationQuiz,
  [consoleAndEnvironmentsQuiz.id]: consoleAndEnvironmentsQuiz,
  [routingBasicsQuiz.id]: routingBasicsQuiz,
  [controllersAndResponseQuiz.id]: controllersAndResponseQuiz,
  [requestAndQueryQuiz.id]: requestAndQueryQuiz,
  [jsonApiQuiz.id]: jsonApiQuiz,
  [twigBasicsQuiz.id]: twigBasicsQuiz,
  [controlStructuresQuiz.id]: controlStructuresQuiz,
  [templateInheritanceQuiz.id]: templateInheritanceQuiz,
  [linksAndAssetsQuiz.id]: linksAndAssetsQuiz,
  [entityBasicsQuiz.id]: entityBasicsQuiz,
  [entityManagerQuiz.id]: entityManagerQuiz,
  [queryBuilderQuiz.id]: queryBuilderQuiz,
  [relationsQuiz.id]: relationsQuiz,
};

export function getQuiz(id: string): Quiz | undefined {
  return quizzes[id];
}
