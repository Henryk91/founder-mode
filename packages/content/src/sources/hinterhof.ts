// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import hinterhofScenario from '../scenarios/hinterhof/scenario.yaml?raw'
import hinterhofFeatures from '../scenarios/hinterhof/features.yaml?raw'
import hinterhofQuotes from '../scenarios/hinterhof/messages/interview_quotes.yaml?raw'
import hinterhofIntro from '../scenarios/hinterhof/messages/intro.yaml?raw'
import hinterhofValidation from '../scenarios/hinterhof/messages/events/validation.yaml?raw'
import hinterhofSales from '../scenarios/hinterhof/messages/events/sales.yaml?raw'
import hinterhofProduct from '../scenarios/hinterhof/messages/events/product.yaml?raw'
import hinterhofFinance from '../scenarios/hinterhof/messages/events/finance.yaml?raw'
import hinterhofFounder from '../scenarios/hinterhof/messages/events/founder.yaml?raw'
import hinterhofTeam from '../scenarios/hinterhof/messages/events/team.yaml?raw'
import hinterhofOffice from '../scenarios/hinterhof/messages/events/office.yaml?raw'
import hinterhofNames from '../scenarios/hinterhof/messages/company_names.yaml?raw'
import { FUNDING_EVENTS, NO_EVENTS, TOURISM_EVENTS } from './shared'

/** The YAML files of hinterhof, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: hinterhofScenario,
  features: hinterhofFeatures,
  interviewQuotes: hinterhofQuotes,
  companyNames: hinterhofNames,
  intro: hinterhofIntro,
  events: {
    validation: hinterhofValidation,
    sales: hinterhofSales,
    product: hinterhofProduct,
    finance: hinterhofFinance,
    founder: hinterhofFounder,
    team: hinterhofTeam,
  },
  sharedEvents: TOURISM_EVENTS,
  longEvents: NO_EVENTS,
  fundingEvents: FUNDING_EVENTS,
  officeEvents: hinterhofOffice,
}
