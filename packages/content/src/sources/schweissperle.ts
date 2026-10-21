// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import schweissperleScenario from '../scenarios/schweissperle/scenario.yaml?raw'
import schweissperleFeatures from '../scenarios/schweissperle/features.yaml?raw'
import schweissperleQuotes from '../scenarios/schweissperle/messages/interview_quotes.yaml?raw'
import schweissperleIntro from '../scenarios/schweissperle/messages/intro.yaml?raw'
import schweissperleValidation from '../scenarios/schweissperle/messages/events/validation.yaml?raw'
import schweissperleSales from '../scenarios/schweissperle/messages/events/sales.yaml?raw'
import schweissperleProduct from '../scenarios/schweissperle/messages/events/product.yaml?raw'
import schweissperleFinance from '../scenarios/schweissperle/messages/events/finance.yaml?raw'
import schweissperleFounder from '../scenarios/schweissperle/messages/events/founder.yaml?raw'
import schweissperleTeam from '../scenarios/schweissperle/messages/events/team.yaml?raw'
import schweissperleOffice from '../scenarios/schweissperle/messages/events/office.yaml?raw'
import schweissperleNames from '../scenarios/schweissperle/messages/company_names.yaml?raw'
import { NO_EVENTS } from './shared'

/** The YAML files of schweissperle, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: schweissperleScenario,
  features: schweissperleFeatures,
  interviewQuotes: schweissperleQuotes,
  companyNames: schweissperleNames,
  intro: schweissperleIntro,
  events: {
    validation: schweissperleValidation,
    sales: schweissperleSales,
    product: schweissperleProduct,
    finance: schweissperleFinance,
    founder: schweissperleFounder,
    team: schweissperleTeam,
  },
  sharedEvents: {
    validation: NO_EVENTS,
    sales: NO_EVENTS,
    product: NO_EVENTS,
    finance: NO_EVENTS,
    founder: NO_EVENTS,
    team: NO_EVENTS,
  },
  longEvents: NO_EVENTS,
  fundingEvents: NO_EVENTS,
  officeEvents: schweissperleOffice,
}
