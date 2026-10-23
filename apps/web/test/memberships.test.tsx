import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { loadScenario } from '@founder-mode/content'
import { createGame, getView } from '@founder-mode/engine'
import { createGameStore } from '../src/store'
import { memoryStorage } from '../src/storage'
import { StoreProvider } from '../src/useGame'
import {
  AggregatorPlan,
  MembershipPrices,
  ClassTimetable,
  MembershipFacts,
} from '../src/components/Memberships'
import { PricesPlan } from '../src/components/TourismPlan'

const spec = loadScenario('schweissperle', 'long')
const store = () => {
  const s = createGameStore({
    storage: memoryStorage(),
    makeSeed: () => 'member-ui',
    scenario: () => spec,
  })
  s.getState().startRun()
  return s
}
const text = (node: React.ReactNode) => renderToString(node).replace(/<!-- -->/g, '')

describe('membership and timetable interface', () => {
  it('shows stated pack visits and monthly terms without hidden niche information', () => {
    const s = store()
    const html = text(
      <StoreProvider value={s}>
        <MembershipPrices />
      </StoreProvider>,
    )
    expect(html).toContain('10 visits per pack, valid for 26 weeks')
    expect(html).toContain('Monthly fee, annual term')
    expect(html).toContain('52 weeks agreed; 4 weeks’ notice')
    expect(html).toContain('Includes: Reformer pilates')
    expect(html).not.toMatch(/premiumInterest|wtpFactor|shareRange/)
    expect(
      s.getState().view!.bookings!.leisure!.members.find((m) => m.offerId === 'class_pack')!.visits,
    ).toBe(10)
  })
  it('shows an explicitly stated offer frequency alongside its prepaid terms', () => {
    const scenario = structuredClone(spec)
    scenario.bookings!.leisure!.memberships!.premium_pack!.visitsPerWeek = 1
    const s = createGameStore({
      storage: memoryStorage(),
      makeSeed: () => 'weekly-premium-ui',
      scenario: () => scenario,
    })
    s.getState().startRun()
    const html = text(
      <StoreProvider value={s}>
        <MembershipPrices />
      </StoreProvider>,
    )
    expect(html).toContain('Typical weekly visits: 1.')
    expect(html).toContain('10 visits per pack, valid for 26 weeks')
  })
  it('uses aggregator check-ins instead of a commission listing control', () => {
    const s = store()
    const html = text(
      <StoreProvider value={s}>
        <AggregatorPlan />
      </StoreProvider>,
    )
    expect(html).toContain('Join with these slots')
    expect(html).toContain('8 check-ins per person each month')
    expect(html).toContain('4 weeks’ notice')
    expect(html).not.toMatch(/15%|commission/)
  })
  it('keeps the unrelated booking cancellation policy out of membership pricing', () => {
    const s = store()
    const html = text(
      <StoreProvider value={s}>
        <PricesPlan />
      </StoreProvider>,
    )
    expect(html).toContain('Memberships and class packs')
    expect(html).not.toContain('aria-pressed="false">Strict')
  })
  it('shows the seat conversion, actual followers lost and named workload', () => {
    const state = createGame(spec, 'member-facts')
    state.product.features = state.product.features.map((f) => ({ ...f, shippedWeek: 0 }))
    const view = getView(state)
    const l = view.bookings!.leisure!
    l.instructorDepartures = [{ week: 30, name: 'Mara', stopped: 17, pending: 4 }]
    l.instructorWork!.loads = [{ id: 'founder', kind: 'founder', classes: 13 }]
    const html = text(<MembershipFacts view={view} leisure={l} />)
    expect(html).toContain('Mara left; 17 followers stopped attending, 4 are serving notice')
    expect(html).toContain('Founder: 13 classes taught last week')
    expect(l.timetable.find((r) => r.productId === 'strength_classes')!.places).toBe(8)
    const s = store()
    s.setState({ view })
    expect(
      text(
        <StoreProvider value={s}>
          <ClassTimetable />
        </StoreProvider>,
      ),
    ).toContain('8 places per class')
  })
})
