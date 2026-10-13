// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { ScenarioSources } from '../parse'
import zollstockScenario from '../scenarios/zollstock/scenario.yaml?raw'
import zollstockFeatures from '../scenarios/zollstock/features.yaml?raw'
import zollstockQuotes from '../scenarios/zollstock/messages/interview_quotes.yaml?raw'
import zollstockIntro from '../scenarios/zollstock/messages/intro.yaml?raw'
import zollstockValidation from '../scenarios/zollstock/messages/events/validation.yaml?raw'
import zollstockSales from '../scenarios/zollstock/messages/events/sales.yaml?raw'
import zollstockProduct from '../scenarios/zollstock/messages/events/product.yaml?raw'
import zollstockFinance from '../scenarios/zollstock/messages/events/finance.yaml?raw'
import zollstockFounder from '../scenarios/zollstock/messages/events/founder.yaml?raw'
import zollstockTeam from '../scenarios/zollstock/messages/events/team.yaml?raw'
import zollstockNames from '../scenarios/zollstock/messages/company_names.yaml?raw'
import { FUNDING_EVENTS, SHARED_EVENTS, YEAR2_EVENTS } from './shared'

/** The YAML files of zollstock, read when this module loads. */
export const sources: ScenarioSources = {
  scenario: zollstockScenario,
  features: zollstockFeatures,
  interviewQuotes: zollstockQuotes,
  companyNames: zollstockNames,
  intro: zollstockIntro,
  events: {
    validation: zollstockValidation,
    sales: zollstockSales,
    product: zollstockProduct,
    finance: zollstockFinance,
    founder: zollstockFounder,
    team: zollstockTeam,
  },
  sharedEvents: SHARED_EVENTS,
  longEvents: YEAR2_EVENTS,
  fundingEvents: FUNDING_EVENTS,
}
