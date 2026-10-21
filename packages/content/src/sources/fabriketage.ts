// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import fabriketageScenario from '../scenarios/fabriketage/scenario.yaml?raw'
import fabriketageFeatures from '../scenarios/fabriketage/features.yaml?raw'
import fabriketageQuotes from '../scenarios/fabriketage/messages/interview_quotes.yaml?raw'
import fabriketageIntro from '../scenarios/fabriketage/messages/intro.yaml?raw'
import fabriketageValidation from '../scenarios/fabriketage/messages/events/validation.yaml?raw'
import fabriketageSales from '../scenarios/fabriketage/messages/events/sales.yaml?raw'
import fabriketageProduct from '../scenarios/fabriketage/messages/events/product.yaml?raw'
import fabriketageFinance from '../scenarios/fabriketage/messages/events/finance.yaml?raw'
import fabriketageFounder from '../scenarios/fabriketage/messages/events/founder.yaml?raw'
import fabriketageTeam from '../scenarios/fabriketage/messages/events/team.yaml?raw'
import fabriketageOffice from '../scenarios/fabriketage/messages/events/office.yaml?raw'
import fabriketageNames from '../scenarios/fabriketage/messages/company_names.yaml?raw'
import { NO_EVENTS } from './shared'

/** The YAML files of fabriketage, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: fabriketageScenario,
  features: fabriketageFeatures,
  interviewQuotes: fabriketageQuotes,
  companyNames: fabriketageNames,
  intro: fabriketageIntro,
  events: {
    validation: fabriketageValidation,
    sales: fabriketageSales,
    product: fabriketageProduct,
    finance: fabriketageFinance,
    founder: fabriketageFounder,
    team: fabriketageTeam,
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
  officeEvents: fabriketageOffice,
}
