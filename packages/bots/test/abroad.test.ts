import { loadScenario } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { runGame } from '../src/simulate'
import { playsIn } from '../src/strategy'
import { TOURISM_STRATEGIES } from '../src/strategies/tourism'

// Plan 4: the abroad scenarios played by every tourism bot that plays in them.
describe('Rückenwind bots (plan 4 step 2)', () => {
  const scenario = loadScenario('rueckenwind', 'long')
  const bots = TOURISM_STRATEGIES.filter((t) => playsIn(t, scenario))

  it('plays every tourism bot and its own target bots', () => {
    const ids = bots.map((b) => b.id)
    for (const id of [
      'tourism_careful',
      'tourism_wind_only',
      'tourism_calm_only',
      'tourism_no_courses',
      'tourism_trips_always',
      'tourism_trips_never',
      'tourism_tender_higher',
      'tourism_tender_same',
      'tourism_efoil_spring',
    ]) {
      expect(ids).toContain(id)
    }
  })

  it.each(bots.map((t) => [t.id, t] as const))(
    '%s plays a complete run with valid plans',
    (_id, bot) => {
      // runGame throws on an invalid plan.
      const r = runGame(scenario, bot, 'abroad-0')
      expect(r.weeks).toBeGreaterThan(0)
      expect(r.tourism?.abroad).toBeDefined()
    },
  )

  it('runs trips, teaches courses and answers the tender when it plays carefully', () => {
    const careful = bots.find((b) => b.id === 'tourism_careful')!
    const rs = Array.from({ length: 6 }, (_, i) => runGame(scenario, careful, `careful-${i}`))
    expect(rs.some((r) => r.revenueReceivedCents > 0)).toBe(true)
    expect(rs.some((r) => (r.tourism?.abroad?.trips ?? 0) > 0)).toBe(true)
    expect(rs.some((r) => r.tourism?.abroad?.tender !== null)).toBe(true)
    const never = bots.find((b) => b.id === 'tourism_trips_never')!
    expect(runGame(scenario, never, 'careful-0').tourism?.abroad?.trips).toBe(0)
  })
})

describe('Tiefgang bots (plan 4 step 3)', () => {
  const scenario = loadScenario('tiefgang', 'long')
  const bots = TOURISM_STRATEGIES.filter((t) => playsIn(t, scenario))

  it('plays its own target bots and none of Rückenwind', () => {
    const ids = bots.map((b) => b.id)
    for (const id of [
      'tourism_certified_only',
      'tourism_no_ladder',
      'tourism_always_buy',
      'tourism_always_lease',
      'tourism_always_share',
    ]) {
      expect(ids).toContain(id)
    }
    expect(ids).not.toContain('tourism_wind_only')
  })

  it.each(bots.map((t) => [t.id, t] as const))(
    '%s plays a complete run with valid plans',
    (_id, bot) => {
      const r = runGame(scenario, bot, 'dive-0')
      expect(r.weeks).toBeGreaterThan(0)
    },
  )

  it('takes the boat the way each single-option bot says', async () => {
    const { createGame, endWeek, getView, respond } = await import('@founder-mode/engine')
    const optionOf = (id: string, seed: string) => {
      const bot = bots.find((b) => b.id === id)!
      let s = createGame(scenario, seed)
      const p = bot.create(scenario, seed)
      while (s.status === 'running' && s.week < 30) {
        for (const a of p.respond?.(getView(s)) ?? []) s = respond(s, a.messageId, a.choiceId)
        const r = endWeek(s, p.plan(getView(s)))
        s = r.state
        p.observe?.(r.report, getView(s))
      }
      return s.bookings!.assets!['dive_boat']!.option
    }
    expect(optionOf('tourism_always_share', 'boat-1')).toBe('share')
    expect(optionOf('tourism_always_lease', 'boat-1')).toBe('lease')
    expect(optionOf('tourism_careful', 'boat-1')).toBe('share')
    expect(['buy', 'none']).toContain(optionOf('tourism_always_buy', 'boat-1'))
  })
})

describe('Leinen los bots (plan 4 step 4)', () => {
  const scenario = loadScenario('leinenlos', 'long')
  const bots = TOURISM_STRATEGIES.filter((t) => playsIn(t, scenario))

  it('plays its own target bots', () => {
    const ids = bots.map((b) => b.id)
    for (const id of [
      'tourism_always_manage',
      'tourism_gulet_lease',
      'tourism_gulet_buy',
      'tourism_hold_all_peak',
      'tourism_hold_never',
      'tourism_sail_always',
      'tourism_sail_six',
    ]) {
      expect(ids).toContain(id)
    }
  })

  it.each(bots.map((t) => [t.id, t] as const))(
    '%s plays a complete run with valid plans',
    (_id, bot) => {
      const r = runGame(scenario, bot, 'gulet-0')
      expect(r.weeks).toBeGreaterThan(0)
    },
  )
})
