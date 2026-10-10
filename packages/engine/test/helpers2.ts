import type { ScenarioEvent } from '@founder-mode/content'
import type { Customer, GameState, Lead, Scenario } from '../src/types'
import { kantino } from './helpers'

/** Kantino with only the given events (and none arriving unless a test says so). */
export function withEvents(
  events: ScenarioEvent[],
  inbox: Partial<Scenario['inbox']> = {},
): Scenario {
  const s = kantino()
  return { ...s, events, inbox: { ...s.inbox, drawChance: 1, cooldownWeeks: 0, ...inbox } }
}

/** A parsed event for tests. Conditions use the real grammar via the content package. */
export function event(over: Partial<ScenarioEvent> & Pick<ScenarioEvent, 'id'>): ScenarioEvent {
  return {
    area: 'founder',
    weight: 1,
    once: false,
    when: [],
    trigger: [],
    from: 'none',
    sender: 'Tester',
    look: 'letter',
    text: 'Something happened.',
    defaultChoice: 'skip',
    choices: [
      { id: 'skip', label: 'Skip', hours: 0, effects: [] },
      { id: 'act', label: 'Act', hours: 2, effects: [] },
    ],
    ...over,
  }
}

export function openLead(i: number, segmentId: string, over: Partial<Lead> = {}): Lead {
  return {
    id: `lead_${i}`,
    name: `Firma ${i}`,
    segmentId,
    stage: 'lead',
    source: 'outreach',
    stageSinceWeek: 1,
    lastContactWeek: 1,
    silentSinceWeek: null,
    lostReason: null,
    ...over,
  }
}

/** Sets the hidden pain of one segment, to make experiment odds known. */
export function withPain(s: GameState, segmentId: string, pain: number): GameState {
  const seg = s.hidden.segments[segmentId]!
  return {
    ...s,
    hidden: { ...s.hidden, segments: { ...s.hidden.segments, [segmentId]: { ...seg, pain } } },
  }
}

export function customer(id: string, segmentId = 'small_offices', sinceWeek = 1): Customer {
  return {
    id,
    leadId: `lead_of_${id}`,
    name: `Kunde ${id}`,
    segmentId,
    sinceWeek,
    churnedWeek: null,
    priceCentsPerMonth: 30_000,
  }
}
