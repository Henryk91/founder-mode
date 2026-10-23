// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import griffigScenario from '../scenarios/griffig/scenario.yaml?raw'
import griffigFeatures from '../scenarios/griffig/features.yaml?raw'
import griffigQuotes from '../scenarios/griffig/messages/interview_quotes.yaml?raw'
import griffigIntro from '../scenarios/griffig/messages/intro.yaml?raw'
import griffigValidation from '../scenarios/griffig/messages/events/validation.yaml?raw'
import griffigSales from '../scenarios/griffig/messages/events/sales.yaml?raw'
import griffigProduct from '../scenarios/griffig/messages/events/product.yaml?raw'
import griffigFinance from '../scenarios/griffig/messages/events/finance.yaml?raw'
import griffigFounder from '../scenarios/griffig/messages/events/founder.yaml?raw'
import griffigTeam from '../scenarios/griffig/messages/events/team.yaml?raw'
import griffigOffice from '../scenarios/griffig/messages/events/office.yaml?raw'
import griffigNames from '../scenarios/griffig/messages/company_names.yaml?raw'
import { NO_EVENTS } from './shared'

/** The YAML files of griffig, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: griffigScenario,
  features: griffigFeatures,
  interviewQuotes: griffigQuotes,
  companyNames: griffigNames,
  intro: griffigIntro,
  events: {
    validation: griffigValidation,
    sales: griffigSales,
    product: griffigProduct,
    finance: griffigFinance,
    founder: griffigFounder,
    team: griffigTeam,
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
  officeEvents: griffigOffice,
}
