import type { Exercise } from "../types";
import { oopWarmupExercise } from "./oop-warmup";
import { introProjectStructureMapExercise } from "./intro-project-structure-map";
import { helloRouteExercise } from "./hello-route";
import { pingStatusExercise } from "./ping-status";
import { greetQueryExercise } from "./greet-query";
import { echoApiExercise } from "./echo-api";
import { bookshelfApiExercise } from "./bookshelf-api";
import { twigBasicsExercise } from "./twig-basics";
import { twigLoopExercise } from "./twig-loop";
import { twigExtendsExercise } from "./twig-extends";
import { twigLinksExercise } from "./twig-links";
import { bookshelfCatalogExercise } from "./bookshelf-catalog";

export const exercises: Record<string, Exercise> = {
  [oopWarmupExercise.id]: oopWarmupExercise,
  [introProjectStructureMapExercise.id]: introProjectStructureMapExercise,
  [helloRouteExercise.id]: helloRouteExercise,
  [pingStatusExercise.id]: pingStatusExercise,
  [greetQueryExercise.id]: greetQueryExercise,
  [echoApiExercise.id]: echoApiExercise,
  [bookshelfApiExercise.id]: bookshelfApiExercise,
  [twigBasicsExercise.id]: twigBasicsExercise,
  [twigLoopExercise.id]: twigLoopExercise,
  [twigExtendsExercise.id]: twigExtendsExercise,
  [twigLinksExercise.id]: twigLinksExercise,
  [bookshelfCatalogExercise.id]: bookshelfCatalogExercise,
};

export function getExercise(id: string): Exercise | undefined {
  return exercises[id];
}
