// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import leinenlosScenario from '../scenarios/leinenlos/scenario.yaml?raw'
import leinenlosFeatures from '../scenarios/leinenlos/features.yaml?raw'
import leinenlosQuotes from '../scenarios/leinenlos/messages/interview_quotes.yaml?raw'
import leinenlosIntro from '../scenarios/leinenlos/messages/intro.yaml?raw'
import leinenlosValidation from '../scenarios/leinenlos/messages/events/validation.yaml?raw'
import leinenlosSales from '../scenarios/leinenlos/messages/events/sales.yaml?raw'
import leinenlosProduct from '../scenarios/leinenlos/messages/events/product.yaml?raw'
import leinenlosFinance from '../scenarios/leinenlos/messages/events/finance.yaml?raw'
import leinenlosFounder from '../scenarios/leinenlos/messages/events/founder.yaml?raw'
import leinenlosTeam from '../scenarios/leinenlos/messages/events/team.yaml?raw'
import leinenlosNames from '../scenarios/leinenlos/messages/company_names.yaml?raw'
import { FUNDING_EVENTS, NO_EVENTS, TOURISM_EVENTS } from './shared'

/** The YAML files of leinenlos, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: leinenlosScenario,
  features: leinenlosFeatures,
  interviewQuotes: leinenlosQuotes,
  companyNames: leinenlosNames,
  intro: leinenlosIntro,
  events: {
    validation: leinenlosValidation,
    sales: leinenlosSales,
    product: leinenlosProduct,
    finance: leinenlosFinance,
    founder: leinenlosFounder,
    team: leinenlosTeam,
  },
  sharedEvents: TOURISM_EVENTS,
  longEvents: NO_EVENTS,
  fundingEvents: FUNDING_EVENTS,
}
