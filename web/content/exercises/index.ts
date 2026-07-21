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
import { formBuildExercise } from "./form-build";
import { validationConstraintsExercise } from "./validation-constraints";
import { formSubmitExercise } from "./form-submit";
import { flashMessagesExercise } from "./flash-messages";
import { bookshelfFormExercise } from "./bookshelf-form";
import { userRegisterExercise } from "./user-register";
import { apiLoginAuthenticatorExercise } from "./api-login-authenticator";
import { rolesControllerExercise } from "./roles-controller";
import { bookVoterExercise } from "./book-voter";
import { bookshelfSecureExercise } from "./bookshelf-secure";
import { formatterControllerExercise } from "./formatter-controller";
import { recommendationControllerExercise } from "./recommendation-controller";
import { explicitRecommendationControllerExercise } from "./explicit-recommendation-controller";
import { allRecommendationsControllerExercise } from "./all-recommendations-controller";
import { bookshelfRecommendExercise } from "./bookshelf-recommend";
import { pingEventControllerExercise } from "./ping-event-controller";
import { bookCreatedEventExercise } from "./book-created-event";
import { bookCreatedNotifierExercise } from "./book-created-notifier";
import { priorityNotifierExercise } from "./priority-notifier";
import { bookshelfNotifyExercise } from "./bookshelf-notify";
import { bookFormatterTestExercise } from "./book-formatter-test";
import { bookRepositoryTestExercise } from "./book-repository-test";
import { bookApiTestExercise } from "./book-api-test";
import { bookFullFlowTestExercise } from "./book-full-flow-test";
import { bookshelfTestSuiteExercise } from "./bookshelf-test-suite";
import { helloCommandExercise } from "./hello-command";
import { greetCommandExercise } from "./greet-command";
import { bookCountCommandExercise } from "./book-count-command";
import { bookLookupCommandExercise } from "./book-lookup-command";
import { bookshelfImportBooksExercise } from "./bookshelf-import-books";

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
  [formBuildExercise.id]: formBuildExercise,
  [validationConstraintsExercise.id]: validationConstraintsExercise,
  [formSubmitExercise.id]: formSubmitExercise,
  [flashMessagesExercise.id]: flashMessagesExercise,
  [bookshelfFormExercise.id]: bookshelfFormExercise,
  [userRegisterExercise.id]: userRegisterExercise,
  [apiLoginAuthenticatorExercise.id]: apiLoginAuthenticatorExercise,
  [rolesControllerExercise.id]: rolesControllerExercise,
  [bookVoterExercise.id]: bookVoterExercise,
  [bookshelfSecureExercise.id]: bookshelfSecureExercise,
  [formatterControllerExercise.id]: formatterControllerExercise,
  [recommendationControllerExercise.id]: recommendationControllerExercise,
  [explicitRecommendationControllerExercise.id]: explicitRecommendationControllerExercise,
  [allRecommendationsControllerExercise.id]: allRecommendationsControllerExercise,
  [bookshelfRecommendExercise.id]: bookshelfRecommendExercise,
  [pingEventControllerExercise.id]: pingEventControllerExercise,
  [bookCreatedEventExercise.id]: bookCreatedEventExercise,
  [bookCreatedNotifierExercise.id]: bookCreatedNotifierExercise,
  [priorityNotifierExercise.id]: priorityNotifierExercise,
  [bookshelfNotifyExercise.id]: bookshelfNotifyExercise,
  [bookFormatterTestExercise.id]: bookFormatterTestExercise,
  [bookRepositoryTestExercise.id]: bookRepositoryTestExercise,
  [bookApiTestExercise.id]: bookApiTestExercise,
  [bookFullFlowTestExercise.id]: bookFullFlowTestExercise,
  [bookshelfTestSuiteExercise.id]: bookshelfTestSuiteExercise,
  [helloCommandExercise.id]: helloCommandExercise,
  [greetCommandExercise.id]: greetCommandExercise,
  [bookCountCommandExercise.id]: bookCountCommandExercise,
  [bookLookupCommandExercise.id]: bookLookupCommandExercise,
  [bookshelfImportBooksExercise.id]: bookshelfImportBooksExercise,
};

export function getExercise(id: string): Exercise | undefined {
  return exercises[id];
}
