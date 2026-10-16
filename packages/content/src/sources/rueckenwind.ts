// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import rueckenwindScenario from '../scenarios/rueckenwind/scenario.yaml?raw'
import rueckenwindFeatures from '../scenarios/rueckenwind/features.yaml?raw'
import rueckenwindQuotes from '../scenarios/rueckenwind/messages/interview_quotes.yaml?raw'
import rueckenwindIntro from '../scenarios/rueckenwind/messages/intro.yaml?raw'
import rueckenwindValidation from '../scenarios/rueckenwind/messages/events/validation.yaml?raw'
import rueckenwindSales from '../scenarios/rueckenwind/messages/events/sales.yaml?raw'
import rueckenwindProduct from '../scenarios/rueckenwind/messages/events/product.yaml?raw'
import rueckenwindFinance from '../scenarios/rueckenwind/messages/events/finance.yaml?raw'
import rueckenwindFounder from '../scenarios/rueckenwind/messages/events/founder.yaml?raw'
import rueckenwindTeam from '../scenarios/rueckenwind/messages/events/team.yaml?raw'
import rueckenwindNames from '../scenarios/rueckenwind/messages/company_names.yaml?raw'
import { FUNDING_EVENTS, NO_EVENTS, TOURISM_EVENTS } from './shared'

/** The YAML files of rueckenwind, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: rueckenwindScenario,
  features: rueckenwindFeatures,
  interviewQuotes: rueckenwindQuotes,
  companyNames: rueckenwindNames,
  intro: rueckenwindIntro,
  events: {
    validation: rueckenwindValidation,
    sales: rueckenwindSales,
    product: rueckenwindProduct,
    finance: rueckenwindFinance,
    founder: rueckenwindFounder,
    team: rueckenwindTeam,
  },
  sharedEvents: TOURISM_EVENTS,
  longEvents: NO_EVENTS,
  fundingEvents: FUNDING_EVENTS,
}
