import type { Strategy } from './strategy'
import { STRATEGIES } from './strategies'
import { randomNoInbox } from './strategies/random'
import {
  BEHAVIOUR_NAMES,
  forcedAnswer,
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
  }
}

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
