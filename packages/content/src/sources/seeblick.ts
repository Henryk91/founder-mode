// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import seeblickScenario from '../scenarios/seeblick/scenario.yaml?raw'
import seeblickFeatures from '../scenarios/seeblick/features.yaml?raw'
import seeblickQuotes from '../scenarios/seeblick/messages/interview_quotes.yaml?raw'
import seeblickIntro from '../scenarios/seeblick/messages/intro.yaml?raw'
import seeblickValidation from '../scenarios/seeblick/messages/events/validation.yaml?raw'
import seeblickSales from '../scenarios/seeblick/messages/events/sales.yaml?raw'
import seeblickProduct from '../scenarios/seeblick/messages/events/product.yaml?raw'
import seeblickFinance from '../scenarios/seeblick/messages/events/finance.yaml?raw'
import seeblickFounder from '../scenarios/seeblick/messages/events/founder.yaml?raw'
import seeblickTeam from '../scenarios/seeblick/messages/events/team.yaml?raw'
import seeblickNames from '../scenarios/seeblick/messages/company_names.yaml?raw'
import { FUNDING_EVENTS, NO_EVENTS, TOURISM_EVENTS } from './shared'

/** The YAML files of seeblick, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: seeblickScenario,
  features: seeblickFeatures,
  interviewQuotes: seeblickQuotes,
  companyNames: seeblickNames,
  intro: seeblickIntro,
  events: {
    validation: seeblickValidation,
    sales: seeblickSales,
    product: seeblickProduct,
    finance: seeblickFinance,
    founder: seeblickFounder,
    team: seeblickTeam,
  },
  sharedEvents: TOURISM_EVENTS,
  longEvents: NO_EVENTS,
  fundingEvents: FUNDING_EVENTS,
}
