// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import ausgesperrtScenario from '../scenarios/ausgesperrt/scenario.yaml?raw'
import ausgesperrtFeatures from '../scenarios/ausgesperrt/features.yaml?raw'
import ausgesperrtQuotes from '../scenarios/ausgesperrt/messages/interview_quotes.yaml?raw'
import ausgesperrtIntro from '../scenarios/ausgesperrt/messages/intro.yaml?raw'
import ausgesperrtValidation from '../scenarios/ausgesperrt/messages/events/validation.yaml?raw'
import ausgesperrtSales from '../scenarios/ausgesperrt/messages/events/sales.yaml?raw'
import ausgesperrtProduct from '../scenarios/ausgesperrt/messages/events/product.yaml?raw'
import ausgesperrtFinance from '../scenarios/ausgesperrt/messages/events/finance.yaml?raw'
import ausgesperrtFounder from '../scenarios/ausgesperrt/messages/events/founder.yaml?raw'
import ausgesperrtTeam from '../scenarios/ausgesperrt/messages/events/team.yaml?raw'
import ausgesperrtOffice from '../scenarios/ausgesperrt/messages/events/office.yaml?raw'
import ausgesperrtNames from '../scenarios/ausgesperrt/messages/company_names.yaml?raw'
import { NO_EVENTS } from './shared'

/** The YAML files of ausgesperrt, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: ausgesperrtScenario,
  features: ausgesperrtFeatures,
  interviewQuotes: ausgesperrtQuotes,
  companyNames: ausgesperrtNames,
  intro: ausgesperrtIntro,
  events: {
    validation: ausgesperrtValidation,
    sales: ausgesperrtSales,
    product: ausgesperrtProduct,
    finance: ausgesperrtFinance,
    founder: ausgesperrtFounder,
    team: ausgesperrtTeam,
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
  officeEvents: ausgesperrtOffice,
}
