// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import tiefgangScenario from '../scenarios/tiefgang/scenario.yaml?raw'
import tiefgangFeatures from '../scenarios/tiefgang/features.yaml?raw'
import tiefgangQuotes from '../scenarios/tiefgang/messages/interview_quotes.yaml?raw'
import tiefgangIntro from '../scenarios/tiefgang/messages/intro.yaml?raw'
import tiefgangValidation from '../scenarios/tiefgang/messages/events/validation.yaml?raw'
import tiefgangSales from '../scenarios/tiefgang/messages/events/sales.yaml?raw'
import tiefgangProduct from '../scenarios/tiefgang/messages/events/product.yaml?raw'
import tiefgangFinance from '../scenarios/tiefgang/messages/events/finance.yaml?raw'
import tiefgangFounder from '../scenarios/tiefgang/messages/events/founder.yaml?raw'
import tiefgangTeam from '../scenarios/tiefgang/messages/events/team.yaml?raw'
import tiefgangNames from '../scenarios/tiefgang/messages/company_names.yaml?raw'
import { FUNDING_EVENTS, NO_EVENTS, TOURISM_EVENTS } from './shared'

/** The YAML files of tiefgang, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: tiefgangScenario,
  features: tiefgangFeatures,
  interviewQuotes: tiefgangQuotes,
  companyNames: tiefgangNames,
  intro: tiefgangIntro,
  events: {
    validation: tiefgangValidation,
    sales: tiefgangSales,
    product: tiefgangProduct,
    finance: tiefgangFinance,
    founder: tiefgangFounder,
    team: tiefgangTeam,
  },
  sharedEvents: TOURISM_EVENTS,
  longEvents: NO_EVENTS,
  fundingEvents: FUNDING_EVENTS,
}
