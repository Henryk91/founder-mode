// The ambient `?raw` declaration must travel with this file, so packages importing it typecheck.
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../yaml.d.ts" />
import type { EventArea } from '../schema'
import sharedValidation from '../shared/events/validation.yaml?raw'
import sharedSales from '../shared/events/sales.yaml?raw'
import sharedProduct from '../shared/events/product.yaml?raw'
import sharedFinance from '../shared/events/finance.yaml?raw'
import sharedFounder from '../shared/events/founder.yaml?raw'
import sharedTeam from '../shared/events/team.yaml?raw'
import sharedYear2 from '../shared/events/year2.yaml?raw'
import sharedFunding from '../shared/events/funding.yaml?raw'
import tourismValidation from '../shared/tourism/validation.yaml?raw'
import tourismSales from '../shared/tourism/sales.yaml?raw'
import tourismProduct from '../shared/tourism/product.yaml?raw'
import tourismFinance from '../shared/tourism/finance.yaml?raw'
import tourismFounder from '../shared/tourism/founder.yaml?raw'
import tourismTeam from '../shared/tourism/team.yaml?raw'

/** Events every software scenario gets: the founder's life, money, the hire, sales moments. */
export const SHARED_EVENTS: Record<EventArea, string> = {
  validation: sharedValidation,
  sales: sharedSales,
  product: sharedProduct,
  finance: sharedFinance,
  founder: sharedFounder,
  team: sharedTeam,
}

/** Events every tourism scenario shares, one file per area. */
export const TOURISM_EVENTS: Record<EventArea, string> = {
  validation: tourismValidation,
  sales: tourismSales,
  product: tourismProduct,
  finance: tourismFinance,
  founder: tourismFounder,
  team: tourismTeam,
}

export const YEAR2_EVENTS = sharedYear2
export const FUNDING_EVENTS = sharedFunding

/** A tourism scenario has no year 2 file of its own: valid YAML and valid JSON. */
export const NO_EVENTS = '{"events": []}'
