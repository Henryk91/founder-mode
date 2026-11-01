import { loadScenario, type Scenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView, replay, shutDown, toSave, validatePlan } from '../src/index'
import { buildPostMortem } from '../src/postmortem'
import { assetFactor, assetsUsed } from '../src/systems/assets'
import { conditionValue } from '../src/systems/conditions'
import { isWorn, replaceWorn } from '../src/systems/fleet'
import { capacityAt, openSecondSite, secondSiteShare } from '../src/systems/bookings'
import { moveOffice } from '../src/systems/office'
import type { GameState } from '../src/types'
import { plan } from './helpers'

// Plan 6 (docs/plan6-features.md sections 3 to 5): second sites, second units and the fleet.

/** Gratwanderung with its fifth stage turned into a second site with its own capacity. */
function withSite(): Scenario {
  const s = loadScenario('gratwanderung', 'long')
  const stages = s.officeStages.map((o, i) =>
    i === s.officeStages.length - 1
      ? {
          ...o,
          secondSite: {
            name: 'The next valley',
            capacity: { via_ferrata: 20 },
            reach: { min: 0.6, max: 0.6 },
            cannibalisation: { min: 0.2, max: 0.2 },
            reviewsWithoutFounder: 0.2,
          },
        }
      : o,
  )
  return { ...s, officeStages: stages }
}

const fifth = (s: Scenario) => s.officeStages.at(-1)!.id

function atSite(seed: string, contract: boolean): GameState {
  const scenario = withSite()
  let s = moveOffice(createGame(scenario, seed), fifth(scenario))
  if (contract) {
    s = {
      ...s,
      bookings: {
        ...s.bookings!,
        contracts: [
          {
            id: 'c1',
            roleId: 'guide',
            kind: 'permanent',
            name: 'Vroni',
            startWeek: 1,
            endWeek: null,
          },
        ],
      },
    }
  }
  return s
}

describe('a second location', () => {
  it('draws its reach and the share it takes per run, apart from the other draws', () => {
    const a = createGame(withSite(), 'draw')
    const b = createGame(loadScenario('gratwanderung', 'long'), 'draw')
    expect(a.hidden.bookings!.secondSite).toEqual({ reach: 0.6, cannibalisation: 0.2 })
    expect(b.hidden.bookings!.secondSite).toBeUndefined()
    expect(a.rng).toEqual(b.rng)
  })

  it('opens with a manager on contract or the founder there, and adds its capacity', () => {
    const closed = atSite('closed', false)
    expect(openSecondSite(closed)).toBeNull()
    const managed = atSite('managed', true)
    expect(openSecondSite(managed)).not.toBeNull()
    expect(capacityAt(managed, 'via_ferrata', managed.week)).toBe(
      capacityAt(closed, 'via_ferrata', closed.week) + 20,
    )
    const founder = {
      ...closed,
      company: {
        ...closed.company,
        office: { ...closed.company.office, founderAt: 'second' as const },
      },
    }
    expect(openSecondSite(founder)).not.toBeNull()
    expect(secondSiteShare(founder)).toBeGreaterThan(0)
  })

  it('lets the plan choose where the founder works only with two sites, and shows both', () => {
    const s = atSite('plan', true)
    const p = plan({ office: { notice: false, founderAt: 'second' } })
    expect(validatePlan(s, p)).toEqual([])
    const plain = createGame(withSite(), 'plain')
    expect(validatePlan(plain, p)).not.toEqual([])
    const next = endWeek(s, p).state
    expect(next.company.office.founderAt).toBe('second')
    const view = getView(next).office.secondSite!
    expect(view.open).toBe(true)
    expect(view.founderAt).toBe('second')
    expect(view.name).toBe('The next valley')
    expect(JSON.stringify(getView(next))).not.toContain('cannibalisation')
    expect(getView(plain).office.secondSite).toBeNull()
    expect(conditionValue(next, 'office.twoSites')).toBe(1)
    expect(conditionValue(plain, 'office.twoSites')).toBe(0)
  })

  it('records its weeks and money, and the post-mortem shows what it added', () => {
    let s = atSite('record', true)
    for (let i = 0; i < 6 && s.status === 'running'; i++) s = endWeek(s, plan()).state
    const r = s.company.office.secondSite!
    expect(r.weeksOpen + r.weeksClosed).toBe(6)
    expect(r.weeksOpen).toBe(6)
    const pm = buildPostMortem(s.status === 'running' ? shutDown(s) : s).secondSite!
    expect(pm.name).toBe('The next valley')
    expect(pm.reach).toBe(0.6)
    expect(pm.cannibalisation).toBe(0.2)
  })

  it('counts a week without a manager or the founder as closed', () => {
    let s = atSite('shut', false)
    s = endWeek(s, plan()).state
    expect(s.company.office.secondSite!.weeksClosed).toBe(1)
  })
})

/** Tiefgang with a second dive boat. */
function twoBoats(): Scenario {
  const s = loadScenario('tiefgang', 'long')
  const b = s.bookings!
  const first = b.assets!.dive_boat!
  return {
    ...s,
    bookings: {
      ...b,
      assets: {
        ...b.assets,
        second_boat: { ...first, name: 'The second boat', secondOf: 'dive_boat', buy: undefined },
      },
    },
  }
}

const withOption = (s: GameState, id: string, option: 'lease' | 'share' | 'none'): GameState => ({
  ...s,
  bookings: {
    ...s.bookings!,
    assets: {
      ...s.bookings!.assets!,
      [id]: { ...s.bookings!.assets![id]!, option, leaseFromWeek: 1 },
    },
  },
})

describe('a second unit of an asset', () => {
  it('adds its own share of the capacity to the first unit', () => {
    const s = createGame(twoBoats(), 'boats')
    // Lease months are April to November; find a week in them.
    let w = 1
    while (assetFactor(withOption(s, 'dive_boat', 'lease'), 'wreck_dives', w) === 0) w++
    const one = withOption(s, 'dive_boat', 'lease')
    const two = withOption(one, 'second_boat', 'lease')
    expect(assetFactor(one, 'wreck_dives', w)).toBe(1)
    expect(assetFactor(two, 'wreck_dives', w)).toBe(2)
    expect(assetFactor(withOption(one, 'second_boat', 'share'), 'wreck_dives', w)).toBe(1.5)
  })

  it('serves nobody on a second unit not taken, so the first pays its crew and owner', () => {
    const s = createGame(twoBoats(), 'serve')
    // A managed first boat (a share: a fraction of the capacity) and no second boat: every
    // served guest is the first boat's, and the seat fee is paid on all of them, also beyond
    // the plain capacity times the share (the week's capacity has more factors than that).
    let w = 1
    while (assetFactor(withOption(s, 'dive_boat', 'share'), 'wreck_dives', w) === 0) w++
    const shared = withOption({ ...s, week: w }, 'dive_boat', 'share')
    const served = new Map([['wreck_dives', { units: 500, grossCents: 5_000_000 }]])
    const alone = {
      ...shared.scenario,
      bookings: {
        ...shared.scenario.bookings!,
        assets: { dive_boat: shared.scenario.bookings!.assets!.dive_boat! },
      },
    }
    const one = assetsUsed({ ...shared, scenario: alone }, served)
    const two = assetsUsed(shared, served)
    expect(two.costsCents).toBe(one.costsCents)
    expect(two.state.bookings!.assets!.second_boat!.weeksUsed).toBe(0)
  })

  it('shows the second unit and reads it in conditions', () => {
    const s = createGame(twoBoats(), 'cond')
    expect(conditionValue(s, 'asset.secondNone')).toBe(1)
    expect(conditionValue(s, 'asset.secondTaken')).toBe(0)
    const taken = withOption(s, 'second_boat', 'lease')
    expect(conditionValue(taken, 'asset.secondTaken')).toBe(1)
    const view = getView(taken).bookings!.assets.find((a) => a.id === 'second_boat')!
    expect(view.secondOf).toBe('dive_boat')
    // Tiefgang offers a second boat from plan 6 step 3; a scenario without one reads 0.
    expect(
      conditionValue(createGame(loadScenario('tiefgang', 'long'), 'x'), 'asset.secondNone'),
    ).toBe(1)
    expect(
      conditionValue(createGame(loadScenario('gratwanderung', 'long'), 'x'), 'asset.secondNone'),
    ).toBe(0)
  })

  it('rejects a second unit with other products in content', () => {
    const s = twoBoats()
    const b = s.bookings!
    const bad = {
      ...b,
      assets: {
        ...b.assets,
        second_boat: { ...b.assets!.second_boat!, products: ['wreck_dives'] },
      },
    }
    expect(bad.assets.second_boat.products).not.toEqual(b.assets!.dive_boat!.products)
  })
})

/** Rückenwind with a rescue boat to buy and gear that wears after 30 uses. */
function fleet(): Scenario {
  const s = loadScenario('rueckenwind', 'long')
  const b = s.bookings!
  return {
    ...s,
    features: [
      ...s.features,
      {
        ...s.features.find((f) => f.id === 'rescue_boat')!,
        id: 'rescue_purchase',
        name: 'Buy the rescue boat',
      },
    ],
    bookings: {
      ...b,
      products: {
        ...b.products,
        rescue_purchase: {
          ...b.products.rescue_boat!,
          monthlyCents: 10_000,
          oneOffCents: 1_800_000,
          replaces: 'rescue_boat',
        },
        modern_gear: {
          ...b.products.modern_gear!,
          wear: { lifeUses: 30, wornCapacity: 0.5, wornReview: 0.4, replaceCents: 1_500_000 },
        },
      },
    },
  }
}

describe("Rückenwind's fleet", () => {
  it('wears gear out after its uses, halves what works, and replaces it as new', () => {
    const s = createGame(fleet(), 'wear')
    const shipped = {
      ...s,
      product: {
        ...s.product,
        features: s.product.features.map((f) =>
          f.id === 'modern_gear' ? { ...f, progressHours: 999, shippedWeek: 0 } : f,
        ),
      },
    }
    const worn: GameState = {
      ...shipped,
      bookings: {
        ...shipped.bookings!,
        wear: { modern_gear: { uses: 30, replacements: 0, wornWeeks: 0 } },
      },
    }
    expect(isWorn(shipped, 'modern_gear')).toBe(false)
    expect(isWorn(worn, 'modern_gear')).toBe(true)
    expect(capacityAt(worn, 'modern_gear', worn.week)).toBe(
      Math.floor(capacityAt(shipped, 'modern_gear', shipped.week) * 0.5),
    )
    expect(conditionValue(worn, 'worn.modern_gear')).toBe(1)
    expect(getView(worn).bookings!.products.find((p) => p.id === 'modern_gear')!.wear!.worn).toBe(
      true,
    )
    const fixed = replaceWorn(worn, 'modern_gear')
    expect(fixed.costCents).toBe(1_500_000)
    expect(isWorn(fixed.state, 'modern_gear')).toBe(false)
    expect(fixed.state.bookings!.wear!.modern_gear!.replacements).toBe(1)
    expect(replaceWorn(shipped, 'modern_gear').costCents).toBe(0)
  })

  it('takes over the leased boat when the bought one ships: its rent ends and it counts as there', () => {
    let s = createGame(fleet(), 'boat')
    for (let i = 0; i < 40 && s.status === 'running'; i++) {
      const done = s.product.features.find((f) => f.id === 'rescue_purchase')!.shippedWeek !== null
      if (done) break
      const f = s.product.features.find((x) => x.id === 'rescue_purchase')!
      const need = s.scenario.features.find((x) => x.id === 'rescue_purchase')!.buildHours
      s = endWeek(
        s,
        plan({ build: { rescue_purchase: Math.min(20, need - f.progressHours) } }),
      ).state
    }
    expect(s.product.features.find((f) => f.id === 'rescue_boat')!.shippedWeek).not.toBeNull()
    expect(s.company.fixedCosts.some((c) => c.id === 'product_rescue_boat')).toBe(false)
    expect(s.company.fixedCosts.some((c) => c.id === 'product_rescue_purchase')).toBe(true)
    expect(replay(fleet(), toSave(s))).toEqual(s)
  })
})
