import { describe, expect, it } from 'vitest'
import { parseScenario } from '../../content/src/parse'
import { sources } from '../../content/src/sources/griffig'
import {
  createGame,
  getView,
  endWeek,
  respond,
  replay,
  toSave,
  type BookingsPlan,
} from '@founder-mode/engine'
import { PlanBuilder, type Strategy } from '../src/strategy'
import { runGame } from '../src/simulate'
import { CAREFUL_TOURISM, tourismPlayer, type TourismRule } from '../src/strategies/tourism'
import {
  climbingFirst,
  climbingWanted,
  planClimbing,
  priceClimbing,
} from '../src/strategies/climbing'
const spec = parseScenario(sources, 'long')
const empty = (): BookingsPlan => ({
  shifts: {},
  founderShifts: {},
  prices: {},
  policy: null,
  platform: null,
  partnerships: [],
  outreach: {},
})
function opened() {
  const s = createGame(spec, 'climbing-units')
  s.product.features = s.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
  s.bookings!.leisure!.openingWeek = 1
  return getView(s)
}
const variants: [string, Partial<TourismRule>][] = [
  ['careful', {}],
  ['boulder', { leisure: { climbingFirst: 'boulder' } }],
  ['rope', { leisure: { climbingFirst: 'rope' } }],
  ['both', { leisure: { climbingFirst: 'both' } }],
  ['half_setting', { leisure: { climbingSetting: 0.5 } }],
  ['double_setting', { leisure: { climbingSetting: 2 } }],
  ['aggregator_all', { leisure: { aggregator: 'all' } }],
  ['aggregator_none', { leisure: { aggregator: 'none' } }],
  ['no_courses', { leisure: { climbingFirst: 'rope', climbingCourses: false } }],
  ['speed_wall', { temptationEarly: 'speed_wall' }],
]
describe('unregistered climbing policies', () => {
  it('chooses walls from observed segment evidence and preserves explicit paired choices', () => {
    const v = opened()
    expect(climbingFirst(v, CAREFUL_TOURISM, 'committed')).toEqual(['rope_walls'])
    expect(climbingFirst(v, CAREFUL_TOURISM, 'students')).toEqual(['boulder_area'])
    expect(
      climbingFirst(v, { ...CAREFUL_TOURISM, leisure: { climbingFirst: 'both' } }, 'students'),
    ).toEqual(['boulder_area', 'rope_walls'])
    expect(
      climbingWanted(
        spec,
        v,
        { ...CAREFUL_TOURISM, leisure: { climbingFirst: 'rope', climbingCourses: false } },
        [],
        'committed',
      ),
    ).not.toContain('belay_course')
  })
  it('keeps first-wall choices ahead of smaller areas and postpones paid access until opening', () => {
    const v = getView(createGame(spec, 'climbing-first'))
    const rule = { ...CAREFUL_TOURISM, leisure: { climbingFirst: 'rope' as const } }
    const wanted = climbingWanted(spec, v, rule, [], 'families')
    expect(wanted).toContain('rope_walls')
    expect(wanted).not.toContain('boulder_area')
    expect(wanted).not.toContain('kids_area')
    expect(wanted).not.toContain('kids_club')
    const p = empty()
    priceClimbing(spec, v, p, rule)
    expect(Object.values(p.leisure!.offers!).every((o) => !o.enabled)).toBe(true)
  })
  it('covers actual opening hours and purchases every allocated setter hour', () => {
    const v = opened(),
      b = new PlanBuilder(v, 50),
      p = empty()
    planClimbing(v, b, p, CAREFUL_TOURISM)
    const h = v.bookings!.leisure!.hall!
    const requested = Object.values(p.leisure!.openHours!).reduce((n, h) => n + h, 0)
    const desk = (p.shifts[h.deskRoleId] ?? 0) + (p.founderShifts[h.deskRoleId] ?? 0)
    expect(desk * h.deskHoursPerShift).toBeGreaterThanOrEqual(requested)
    const allocated = Object.values(p.leisure!.paidSettingHours!).reduce((n, h) => n + h, 0)
    expect(allocated).toBeLessThanOrEqual(
      (p.shifts[h.settingRoleId!] ?? 0) * h.settingHoursPerShift!,
    )
    expect(b.free).toBeGreaterThanOrEqual(20)
  })
  it('keeps monthly interview budgets distinct from day-ticket prices and preserves student terms', () => {
    const v = opened(),
      p = empty()
    priceClimbing(spec, v, p, CAREFUL_TOURISM)
    expect(p.prices.students!.peak).toBe(1600)
    expect(p.leisure!.offers!.student_monthly_membership!.priceCents).toBe(5500)
    expect(p.leisure!.offers!.annual_membership!.priceCents).toBe(5900)
  })
  it('opens the carefully financed first wall and replays the actual saved run', () => {
    let state = createGame(spec, 'climbing-smoke')
    const player = tourismPlayer(spec, CAREFUL_TOURISM, 'climbing-smoke')
    while (state.status === 'running') {
      for (const a of player.respond?.(getView(state)) ?? [])
        state = respond(state, a.messageId, a.choiceId)
      const r = endWeek(state, player.plan(getView(state)))
      state = r.state
      player.observe?.(r.report, getView(state))
    }
    expect(state.bookings!.leisure!.openingWeek).not.toBeNull()
    expect(replay(spec, toSave(state))).toEqual(state)
  })
  for (const [id, over] of variants)
    it(`finishes ${id} without an invalid plan`, () => {
      const rule = { ...CAREFUL_TOURISM, ...over }
      const strategy: Strategy = {
        id: 'climbing_' + id,
        description: id,
        model: 'bookings',
        create: (s, seed) => tourismPlayer(s, rule, seed),
      }
      const r = runGame(spec, strategy, 'climbing-smoke')
      expect(r.weeks).toBeGreaterThan(0)
    })
})
