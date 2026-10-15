import { initialLoan } from './systems/loan'
import { Rng, seedRng } from './rng'
import { initBookings } from './systems/bookings'
import { emptyFunding, emptyHiddenFunding } from './systems/funding'
import { drawHiddenSegments } from './systems/market'
import { moveOffice } from './systems/office'
import { initialProduct } from './systems/product'
import type { GameState, Scenario } from './types'
import { ENGINE_VERSION } from './version'

export function createGame(scenario: Scenario, seed: string): GameState {
  const rng = new Rng(seedRng(seed))
  const hiddenSegments = drawHiddenSegments(scenario, rng)
  // Tourism only: demand, seasons and the first weather. Draws nothing in the subscription model.
  const tourism = initBookings(scenario, rng)
  const start = scenario.start

  const state: GameState = {
    engineVersion: ENGINE_VERSION,
    scenario,
    scenarioId: scenario.id,
    seed,
    rng: rng.state(),
    week: 1,
    status: 'running',
    ending: null,
    founder: {
      baseHoursPerWeek: scenario.founder.baseHoursPerWeek,
      maxHoursPerWeek: scenario.founder.maxHoursPerWeek,
      energy: start.energy,
      weeksAtZeroEnergy: 0,
      savingsCents: start.savingsCents,
      livingCostCentsPerWeek: start.livingCostCentsPerWeek,
      skills: { ...start.skills },
      forcedHours: 0,
    },
    company: {
      cashCents: start.cashCents,
      priceCentsPerMonth: start.priceCentsPerMonth,
      fixedCosts: start.fixedCosts.map((c) => ({ ...c })),
      uiStage: 'scrappy',
      officeStage: '',
      office: { sinceWeek: 1, move: null, notice: null, prepaid: [], stays: [] },
    },
    hidden: {
      segments: hiddenSegments,
      experiments: [],
      payWeeks: {},
      waitsForChase: [],
      teamSkills: {},
      funding: emptyHiddenFunding({ scenario }),
      bookings: tourism?.hidden ?? null,
    },
    knowledge: Object.fromEntries(scenario.segments.map((s) => [s.id, []])),
    product: initialProduct({ scenario }),
    leads: [],
    customers: [],
    invoices: [],
    inbox: [],
    drawnEvents: [],
    team: {
      search: null,
      candidates: [],
      members: [],
      freelancers: [],
      freelanceFeatures: [],
      freelanceBugs: 0,
    },
    funding: emptyFunding(),
    bookings: tourism?.state ?? null,
    loan: initialLoan(scenario.loan),
    ledger: [],
    actionLog: [],
    eventLog: [],
    milestones: [],
    modifiers: [],
  }
  // The first office stage is where every run starts, with its rent and effects if it has any.
  return moveOffice(state, scenario.officeStages[0]!.id)
}
