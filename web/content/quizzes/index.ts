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
import { formBasicsQuiz } from "./form-basics";
import { validationQuiz } from "./validation";
import { formHandlingQuiz } from "./form-handling";
import { flashAndRedirectQuiz } from "./flash-and-redirect";
import { userEntityQuiz } from "./user-entity";
import { authenticationQuiz } from "./authentication";
import { authorizationRolesQuiz } from "./authorization-roles";
import { votersQuiz } from "./voters";
import { containerAndAutowiringQuiz } from "./container-and-autowiring";
import { interfacesQuiz } from "./interfaces";
import { explicitBindingQuiz } from "./explicit-binding";
import { taggedServicesQuiz } from "./tagged-services";
import { dispatchBasicsQuiz } from "./dispatch-basics";
import { customEventQuiz } from "./custom-event";
import { listenersQuiz } from "./listeners";
import { prioritiesQuiz } from "./priorities";
import { unitTestBasicsQuiz } from "./unit-test-basics";
import { kernelTestCaseQuiz } from "./kernel-test-case";
import { webTestCaseQuiz } from "./web-test-case";
import { testSetupAndFixturesQuiz } from "./test-setup-and-fixtures";
import { commandBasicsQuiz } from "./command-basics";
import { argumentsAndOptionsQuiz } from "./arguments-and-options";
import { servicesInCommandsQuiz } from "./services-in-commands";
import { consoleIoAndErrorsQuiz } from "./console-io-and-errors";

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
  [formBasicsQuiz.id]: formBasicsQuiz,
  [validationQuiz.id]: validationQuiz,
  [formHandlingQuiz.id]: formHandlingQuiz,
  [flashAndRedirectQuiz.id]: flashAndRedirectQuiz,
  [userEntityQuiz.id]: userEntityQuiz,
  [authenticationQuiz.id]: authenticationQuiz,
  [authorizationRolesQuiz.id]: authorizationRolesQuiz,
  [votersQuiz.id]: votersQuiz,
  [containerAndAutowiringQuiz.id]: containerAndAutowiringQuiz,
  [interfacesQuiz.id]: interfacesQuiz,
  [explicitBindingQuiz.id]: explicitBindingQuiz,
  [taggedServicesQuiz.id]: taggedServicesQuiz,
  [dispatchBasicsQuiz.id]: dispatchBasicsQuiz,
  [customEventQuiz.id]: customEventQuiz,
  [listenersQuiz.id]: listenersQuiz,
  [prioritiesQuiz.id]: prioritiesQuiz,
  [unitTestBasicsQuiz.id]: unitTestBasicsQuiz,
  [kernelTestCaseQuiz.id]: kernelTestCaseQuiz,
  [webTestCaseQuiz.id]: webTestCaseQuiz,
  [testSetupAndFixturesQuiz.id]: testSetupAndFixturesQuiz,
  [commandBasicsQuiz.id]: commandBasicsQuiz,
  [argumentsAndOptionsQuiz.id]: argumentsAndOptionsQuiz,
  [servicesInCommandsQuiz.id]: servicesInCommandsQuiz,
  [consoleIoAndErrorsQuiz.id]: consoleIoAndErrorsQuiz,
};

export function getQuiz(id: string): Quiz | undefined {
  return quizzes[id];
}
