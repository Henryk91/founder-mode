// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import kantinoScenario from '../scenarios/kantino/scenario.yaml?raw'
import kantinoFeatures from '../scenarios/kantino/features.yaml?raw'
import kantinoQuotes from '../scenarios/kantino/messages/interview_quotes.yaml?raw'
import kantinoIntro from '../scenarios/kantino/messages/intro.yaml?raw'
import kantinoValidation from '../scenarios/kantino/messages/events/validation.yaml?raw'
import kantinoSales from '../scenarios/kantino/messages/events/sales.yaml?raw'
import kantinoProduct from '../scenarios/kantino/messages/events/product.yaml?raw'
import kantinoFinance from '../scenarios/kantino/messages/events/finance.yaml?raw'
import kantinoFounder from '../scenarios/kantino/messages/events/founder.yaml?raw'
import kantinoTeam from '../scenarios/kantino/messages/events/team.yaml?raw'
import kantinoNames from '../scenarios/kantino/messages/company_names.yaml?raw'
import { FUNDING_EVENTS, SHARED_EVENTS, YEAR2_EVENTS } from './shared'

/** The YAML files of kantino, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: kantinoScenario,
  features: kantinoFeatures,
  interviewQuotes: kantinoQuotes,
  companyNames: kantinoNames,
  intro: kantinoIntro,
  events: {
    validation: kantinoValidation,
    sales: kantinoSales,
    product: kantinoProduct,
    finance: kantinoFinance,
    founder: kantinoFounder,
    team: kantinoTeam,
  },
  sharedEvents: SHARED_EVENTS,
  longEvents: YEAR2_EVENTS,
  fundingEvents: FUNDING_EVENTS,
}
