import { Rng, seedRng } from './rng'
import { drawHiddenSegments } from './systems/market'
import { initialProduct } from './systems/product'
import type { GameState, Scenario } from './types'
import { ENGINE_VERSION } from './version'

export function createGame(scenario: Scenario, seed: string): GameState {
  const rng = new Rng(seedRng(seed))
  const hiddenSegments = drawHiddenSegments(scenario, rng)
  const start = scenario.start

  return {
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
    },
    hidden: {
      segments: hiddenSegments,
      experiments: [],
      payWeeks: {},
      waitsForChase: [],
      teamSkills: {},
    },
    knowledge: Object.fromEntries(scenario.segments.map((s) => [s.id, []])),
    product: initialProduct({ scenario }),
    leads: [],
    customers: [],
    invoices: [],
    inbox: [],
    drawnEvents: [],
    team: { search: null, candidates: [], members: [] },
    ledger: [],
    actionLog: [],
    eventLog: [],
    milestones: [],
  }
}
