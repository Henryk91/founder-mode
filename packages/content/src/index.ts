// Scenario data and zod schemas. The Kantino scenario arrives in Phase 1.

export const SCENARIO_IDS = ['kantino'] as const

export type ScenarioId = (typeof SCENARIO_IDS)[number]
