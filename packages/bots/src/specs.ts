import type { Strategy } from './strategy'
import { STRATEGIES } from './strategies'
import { randomNoInbox } from './strategies/random'
import {
  BEHAVIOUR_NAMES,
  fixedPrice,
  priceAware,
  priceRecipe,
  forcedAnswer,
  SITUATION_VARIANTS,
  teamVariant,
  tiredFounder,
  validateThenBuildEarlyHire,
  withFreelancer,
  withInbox,
  withoutBehaviours,
  type BehaviourName,
  type InboxPolicy,
} from './strategies/validateThenBuild'

/**
 * A strategy described by plain data, so a worker process can build the same strategy. Every
 * strategy the report runs has one.
 */
export type StrategySpec =
  | { kind: 'listed'; id: string }
  | { kind: 'without'; off: BehaviourName[] }
  | { kind: 'randomNoInbox' }
  | { kind: 'inbox'; policy: InboxPolicy }
  | { kind: 'forced'; eventId: string; choiceId: string }
  | { kind: 'pricing'; pricer: 'search' | 'recipe' | 'fixed'; multiple?: number }
  | {
      kind: 'freelance'
      role: 'developer' | 'salesperson'
      hours: number
      /** Overrides the scenario's rate for that role, in cents per hour (diagnostics only). */
      centsPerHour: number | null
      /** A salesperson's weeks of work. */
      weeks: number | null
    }
  | { kind: 'tired'; budget: number; below: number | null; rent: boolean }
  | { kind: 'earlyHireWide' }
  /** A long mode team variant on the wide seeds (targets 20 and 29). */
  | { kind: 'team'; id: string }
  /** The careful bot planning `budget` hours a week, for the energy curve. */
  | { kind: 'energy'; budget: number }

export function strategyOf(spec: StrategySpec): Strategy {
  switch (spec.kind) {
    case 'listed': {
      const found = STRATEGIES.find((s) => s.id === spec.id)
      if (!found) throw new Error(`Unknown strategy ${spec.id}`)
      return found
    }
    case 'without':
      return withoutBehaviours({ id: 'validate_then_build', hire: 'none' }, spec.off)
    case 'randomNoInbox':
      return randomNoInbox
    case 'inbox':
      return withInbox(spec.policy)
    case 'forced':
      return forcedAnswer(spec.eventId, spec.choiceId)
    case 'pricing': {
      const base =
        spec.pricer === 'search'
          ? priceAware
          : spec.pricer === 'recipe'
            ? priceRecipe
            : fixedPrice(spec.multiple ?? 1)
      return { ...base, id: pricingId(spec) }
    }
    case 'team':
      return { ...teamVariant(spec.id), id: `team:${spec.id}` }
    case 'energy':
      return tiredFounder(spec.budget, null, false, energyId(spec.budget))
    case 'earlyHireWide':
      return { ...validateThenBuildEarlyHire, id: EARLY_HIRE_WIDE_ID }
    case 'tired':
      return tiredFounder(spec.budget, spec.below, spec.rent, tiredId(spec))
    case 'freelance': {
      const rule =
        spec.role === 'developer'
          ? { role: spec.role, hours: spec.hours }
          : { role: spec.role, hours: spec.hours, weeks: spec.weeks ?? 8 }
      const strategy = withFreelancer(rule, freelanceId(spec))
      const rate = spec.centsPerHour
      if (rate === null) return strategy
      return {
        ...strategy,
        adapt: (scenario) => ({
          ...scenario,
          team: {
            ...scenario.team,
            freelance: {
              ...scenario.team.freelance,
              roles: {
                ...scenario.team.freelance.roles,
                [spec.role]: { ...scenario.team.freelance.roles[spec.role], centsPerHour: rate },
              },
            },
          },
        }),
      }
    }
  }
}

/** Report id of a freelancer run: role, hours, weeks for a salesperson, and any rate override. */
export function freelanceId(spec: {
  role: 'developer' | 'salesperson'
  hours: number
  centsPerHour: number | null
  weeks: number | null
}): string {
  const weeks = spec.role === 'salesperson' ? ` ${spec.weeks ?? 8}w` : ''
  const rate = spec.centsPerHour === null ? '' : ` at ${spec.centsPerHour / 100} EUR`
  return `freelance:${spec.role} ${spec.hours}h${weeks}${rate}`
}

/** validate_then_build_early_hire on the wide seeds, for target 19. */
export const EARLY_HIRE_WIDE_ID = 'freelance:compare validate_then_build_early_hire'

/** Report id of an energy check run: `tired:<budget>h`, plus `rent|cut below <energy>`. */
export function tiredId(spec: { budget: number; below: number | null; rent: boolean }): string {
  const base = `tired:${spec.budget}h`
  return spec.below === null ? base : `${base} ${spec.rent ? 'rent' : 'cut'} below ${spec.below}`
}

/** The energy check: the careful bot at 50 h, and working 58 and 65 h, with the rule at 40 and 30. */
export const TIRED_SPECS: StrategySpec[] = [50, 58, 65].flatMap((budget): StrategySpec[] => [
  { kind: 'tired', budget, below: null, rent: false },
  ...[40, 30].flatMap((below): StrategySpec[] => [
    { kind: 'tired', budget, below, rent: true },
    { kind: 'tired', budget, below, rent: false },
  ]),
])

/** Report id of an energy curve run. */
export const energyId = (budget: number) => `energy:${budget}h`

/** The energy curve (Part C2): the careful bot planning these hours a week, in both modes. */
export const ENERGY_BUDGETS = [45, 50, 52, 55, 58, 60] as const
export const ENERGY_SPECS: StrategySpec[] = ENERGY_BUDGETS.map((budget) => ({
  kind: 'energy',
  budget,
}))

/**
 * Long mode team variants on the wide seeds, against the careful bot's reading run, and target
 * 20's burst and steady situations.
 */
export const TEAM_SPECS: StrategySpec[] = [
  'validate_then_build_solo',
  'validate_then_build_freelance_first',
  'validate_then_build_part_time',
  'validate_then_build_savings_hire',
  ...SITUATION_VARIANTS.map((v) => v.id),
].map((id) => ({ kind: 'team', id }))

/** Target 19's run: a freelance developer for the build, 20 h a week, at the scenario's rate. */
export const FREELANCE_TARGET_SPEC: StrategySpec = {
  kind: 'freelance',
  role: 'developer',
  hours: 20,
  centsPerHour: null,
  weeks: null,
}
export const FREELANCE_TARGET_ID = freelanceId({
  role: 'developer',
  hours: 20,
  centsPerHour: null,
  weeks: null,
})

/** Leave-one-out variants of validate_then_build, then the one without all of them. */
export const ABLATION_SPECS: StrategySpec[] = [
  ...BEHAVIOUR_NAMES.map((name): StrategySpec => ({ kind: 'without', off: [name] })),
  { kind: 'without', off: [...BEHAVIOUR_NAMES] },
]

/**
 * validate_then_build itself under another id, run on the seeds of the paired and inbox parts, so
 * those parts can use more seeds than the rest of the report (targets 6, 11 and 13).
 */
export const READER_SPEC: StrategySpec = { kind: 'inbox', policy: 'reader' }

/** The inbox policies of target 11. */
export const INBOX_SPECS: StrategySpec[] = [
  { kind: 'inbox', policy: 'none' },
  { kind: 'inbox', policy: 'effort' },
  { kind: 'inbox', policy: 'cheapest' },
]

/** Report ids of the pricing runs on the wide seeds, apart from `price_aware` in the main part. */
export function pricingId(spec: { pricer: 'search' | 'recipe' | 'fixed'; multiple?: number }) {
  return spec.pricer === 'fixed' ? `pricing:fixed x${spec.multiple}` : `pricing:${spec.pricer}`
}

/** The pricing runs of target 17: the search, the recipe, and fixed 1.5 and 2 times the default. */
export const PRICING_SPECS: StrategySpec[] = [
  { kind: 'pricing', pricer: 'search' },
  { kind: 'pricing', pricer: 'recipe' },
  { kind: 'pricing', pricer: 'fixed', multiple: 1.5 },
  { kind: 'pricing', pricer: 'fixed', multiple: 2 },
]
