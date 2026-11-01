import { loadScenario, type Scenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView, respond, validatePlan } from '../src/index'
import { capacityAt, openSecondSite } from '../src/systems/bookings'
import { moveOffice } from '../src/systems/office'
import type { GameState } from '../src/types'
import { deepFreeze, plan } from './helpers'

// Plan 6 step 3 (docs/plan6-features.md section 2.1): Rückenwind's stages 3 to 5 and its fleet.
let parsed: Scenario | null = null
const scenario = (): Scenario => (parsed ??= deepFreeze(loadScenario('rueckenwind', 'long')))
/** No drawn messages: only triggered offers arrive. */
const quiet = (): Scenario => {
  const s = scenario()
  return { ...s, inbox: { ...s.inbox, drawChance: 0, guaranteeBelowOpen: 0 } }
}

/** At a stage, rich, with guests turned away in each of the last four weeks. */
function busyAt(seed: string, stage: string): GameState {
  const s = moveOffice(createGame(quiet(), seed), stage)
  const week = 30
  return {
    ...s,
    week,
    company: { ...s.company, cashCents: 50_000_000, office: { ...s.company.office, sinceWeek: 1 } },
    bookings: {
      ...s.bookings!,
      turnedAway: [26, 27, 28, 29].map((w) => ({ week: w, segmentId: 'hotel_guests', units: 5 })),
    },
  }
}

const offer = (s: GameState, id: string) =>
  s.inbox.find((m) => m.eventId === id && m.status === 'open')

describe('Rückenwind: stages 3 to 5', () => {
  it('has five stages, the fifth a second beach that needs an instructor', () => {
    const stages = scenario().officeStages
    expect(stages.map((o) => o.id)).toEqual([
      'container_flag',
      'beach_station',
      'kite_base',
      'watersports_centre',
      'second_beach',
    ])
    expect(stages[4]!.secondSite?.name).toBe('The Pollença station')
    expect(stages[4]!.needsContract).toBe('instructor')
    expect(scenario().establishedAt?.officeStage).toBe(4)
  })

  it('offers the kite base to a busy beach, with its costs on the card', () => {
    const s = endWeek(busyAt('kite', 'beach_station'), plan()).state
    const m = offer(s, 'office_kite_base_offer')!
    expect(m).toBeDefined()
    const move = getView(s)
      .inbox.find((x) => x.id === m.id)!
      .choices.find((c) => c.id === 'move')!
    expect(move.costCents).toBe(1_500_000)
    expect(move.monthlyCostCents).toBe(70_000)
    // From the container too: the beach station is a one-time offer that may have been declined.
    const early = endWeek(busyAt('early', 'container_flag'), plan()).state
    expect(offer(early, 'office_kite_base_offer')).toBeDefined()
  })

  it('moves in after its weeks: more kite places and no van costs', () => {
    let s = endWeek(busyAt('move', 'beach_station'), plan()).state
    const before = capacityAt(s, 'kite_trips', s.week)
    s = respond(s, offer(s, 'office_kite_base_offer')!.id, 'move')
    for (let w = 0; w < 5 && s.company.officeStage !== 'kite_base'; w++)
      s = endWeek(s, plan()).state
    expect(s.company.officeStage).toBe('kite_base')
    expect(capacityAt(s, 'kite_trips', s.week)).toBe(before + 3)
  })

  it('opens the second beach with an instructor on contract or with the founder', () => {
    const s = moveOffice(createGame(quiet(), 'beach'), 'second_beach')
    expect(openSecondSite(s)).toBeNull()
    const view = getView(s).office.secondSite!
    expect(view.open).toBe(false)
    expect(view.needsRole).toBe('instructor')
    const p = plan({ office: { notice: false, founderAt: 'second' } })
    expect(validatePlan(s, p)).toEqual([])
    const there = endWeek(s, p).state
    expect(there.company.office.founderAt).toBe('second')
    expect(openSecondSite(there)).not.toBeNull()
    expect(capacityAt(there, 'paddle_lessons', there.week)).toBeGreaterThanOrEqual(
      capacityAt(s, 'paddle_lessons', s.week),
    )
  })

  it('draws the second beach per run, within its ranges', () => {
    for (const seed of ['a', 'b', 'c']) {
      const drawn = createGame(scenario(), seed).hidden.bookings!.secondSite!
      expect(drawn.reach).toBeGreaterThanOrEqual(0.5)
      expect(drawn.reach).toBeLessThanOrEqual(0.8)
      expect(drawn.cannibalisation).toBeGreaterThanOrEqual(0.1)
      expect(drawn.cannibalisation).toBeLessThanOrEqual(0.25)
    }
  })
})

describe("Rückenwind's fleet", () => {
  it('lists the rescue boat purchase in the bank plan and wears three kinds of gear', () => {
    const s = scenario()
    expect(s.loan?.items).toContain('rescue_boat_purchase')
    expect(s.bookings!.products.rescue_boat_purchase!.replaces).toBe('rescue_boat')
    for (const id of ['modern_gear', 'wing_foil', 'kite_trips'])
      expect(s.bookings!.products[id]!.wear).toBeDefined()
    const ids = s.events.map((e) => e.id)
    for (const id of ['gear_worn_modern_gear', 'gear_worn_wing_foil', 'gear_worn_kite_trips'])
      expect(ids).toContain(id)
  })

  it('offers new gear once it is worn, at its replacement cost', () => {
    const g = createGame(quiet(), 'worn')
    const s: GameState = {
      ...g,
      product: {
        ...g.product,
        features: g.product.features.map((f) =>
          f.id === 'modern_gear' ? { ...f, progressHours: 999, shippedWeek: 0 } : f,
        ),
      },
      bookings: {
        ...g.bookings!,
        wear: { modern_gear: { uses: 400, replacements: 0, wornWeeks: 0 } },
      },
    }
    const next = endWeek(s, plan()).state
    const m = offer(next, 'gear_worn_modern_gear')!
    expect(m).toBeDefined()
    const card = getView(next).inbox.find((x) => x.id === m.id)!
    expect(card.choices.find((c) => c.id === 'replace')!.costCents).toBe(1_600_000)
    const replaced = endWeek(respond(next, m.id, 'replace'), plan()).state
    expect(replaced.bookings!.wear!.modern_gear!.replacements).toBe(1)
  })
})
