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
import { doctrineEntityExercise } from "./doctrine-entity";
import { doctrineCrudExercise } from "./doctrine-crud";
import { doctrineQueryExercise } from "./doctrine-query";
import { doctrineRelationExercise } from "./doctrine-relation";
import { bookshelfDoctrineExercise } from "./bookshelf-doctrine";

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
  [doctrineEntityExercise.id]: doctrineEntityExercise,
  [doctrineCrudExercise.id]: doctrineCrudExercise,
  [doctrineQueryExercise.id]: doctrineQueryExercise,
  [doctrineRelationExercise.id]: doctrineRelationExercise,
  [bookshelfDoctrineExercise.id]: bookshelfDoctrineExercise,
};

export function getExercise(id: string): Exercise | undefined {
  return exercises[id];
}
