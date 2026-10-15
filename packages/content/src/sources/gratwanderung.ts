// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import gratwanderungScenario from '../scenarios/gratwanderung/scenario.yaml?raw'
import gratwanderungFeatures from '../scenarios/gratwanderung/features.yaml?raw'
import gratwanderungQuotes from '../scenarios/gratwanderung/messages/interview_quotes.yaml?raw'
import gratwanderungIntro from '../scenarios/gratwanderung/messages/intro.yaml?raw'
import gratwanderungValidation from '../scenarios/gratwanderung/messages/events/validation.yaml?raw'
import gratwanderungSales from '../scenarios/gratwanderung/messages/events/sales.yaml?raw'
import gratwanderungProduct from '../scenarios/gratwanderung/messages/events/product.yaml?raw'
import gratwanderungFinance from '../scenarios/gratwanderung/messages/events/finance.yaml?raw'
import gratwanderungFounder from '../scenarios/gratwanderung/messages/events/founder.yaml?raw'
import gratwanderungTeam from '../scenarios/gratwanderung/messages/events/team.yaml?raw'
import gratwanderungOffice from '../scenarios/gratwanderung/messages/events/office.yaml?raw'
import gratwanderungNames from '../scenarios/gratwanderung/messages/company_names.yaml?raw'
import { FUNDING_EVENTS, NO_EVENTS, TOURISM_EVENTS } from './shared'

/** The YAML files of gratwanderung, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: gratwanderungScenario,
  features: gratwanderungFeatures,
  interviewQuotes: gratwanderungQuotes,
  companyNames: gratwanderungNames,
  intro: gratwanderungIntro,
  events: {
    validation: gratwanderungValidation,
    sales: gratwanderungSales,
    product: gratwanderungProduct,
    finance: gratwanderungFinance,
    founder: gratwanderungFounder,
    team: gratwanderungTeam,
  },
  sharedEvents: TOURISM_EVENTS,
  longEvents: NO_EVENTS,
  fundingEvents: FUNDING_EVENTS,
  officeEvents: gratwanderungOffice,
}
