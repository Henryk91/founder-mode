import { renderToString } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { loadScenario } from '@founder-mode/content'
import { createGame, getView, type BookingsPlan } from '@founder-mode/engine'
import { createGameStore } from '../src/store'
import { memoryStorage } from '../src/storage'
import { StoreProvider } from '../src/useGame'
import { HallPlan, hallRoleHours } from '../src/components/Hall'
import { PricesPlan } from '../src/components/TourismPlan'

const spec = loadScenario('schweissperle', 'long')
function fixture() {
  const view = getView(createGame(spec, 'hall-interface'))
  view.scenarioId = 'griffig'
  view.bookings!.leisure!.hall = {
    week: 1,
    requestedHours: { early: 4 },
    openHours: { early: 2 },
    deskHours: 2,
    paidSettingHours: {},
    visitHours: 2,
    deskRoleId: 'front_desk',
    deskHoursPerShift: 2,
    settingRoleId: 'strength',
    settingHoursPerShift: 8,
  }
  view.bookings!.leisure!.qualifications = {
    levels: [{ id: 'belay', name: 'Top-rope belay', members: 7, aggregatorUsers: 2 }],
    graduates: 4,
    enquiries: 2,
    joined: 1,
  }
  return view
}
const plan = (): BookingsPlan => ({
  shifts: { front_desk: 2, strength: 1 },
  founderShifts: { front_desk: 1 },
  prices: {},
  policy: null,
  platform: null,
  partnerships: [],
  outreach: {},
})
describe('hall opening interface', () => {
  it('shows observable hours,staff requirements and earned skills without hidden thresholds', () => {
    const s = createGameStore({
      storage: memoryStorage(),
      makeSeed: () => 'hall-ui',
      scenario: () => spec,
    })
    s.getState().startRun()
    s.setState({ view: fixture() })
    const html = renderToString(
      <StoreProvider value={s}>
        <HallPlan />
      </StoreProvider>,
    ).replace(/<!-- -->/g, '')
    expect(html).toContain('Hall opening and setting')
    expect(html).toContain('Last service: 2 h actually open')
    expect(html).toContain('Top-rope belay: 7 members and 2 aggregator visitors qualified')
    expect(html).toContain('4 course completions; 2 qualified membership enquiries; 1 paid joins')
    expect(html).not.toMatch(/qualificationRates|comfortByStage|crowdingChurn/)
  })
  it('counts paid,founder,working-contract and newly selected cover once', () => {
    const v = fixture(),
      p = plan()
    expect(hallRoleHours(v, p, 'front_desk', 2)).toBe(6)
    v.bookings!.contracts = [
      {
        id: 'desk-contract',
        roleId: 'front_desk',
        kind: 'part_time',
        name: 'Desk',
        startWeek: 1,
        endWeek: null,
        working: true,
        centsPerWeek: 13800,
        shifts: 4,
        canEnd: true,
      },
    ]
    expect(hallRoleHours(v, p, 'front_desk', 2)).toBe(14)
    p.hire = [{ roleId: 'front_desk', kind: 'part_time' }]
    expect(hallRoleHours(v, p, 'front_desk', 2)).toBe(22)
    v.bookings!.contracts[0]!.working = false
    expect(hallRoleHours(v, p, 'front_desk', 2)).toBe(14)
  })
  it.each(['scrappy', 'organised', 'established'] as const)(
    'shows visitor refund choices alongside membership terms in a %s hall',
    (stage) => {
      const scenario = loadScenario('griffig', 'long')
      const s = createGameStore({
        storage: memoryStorage(),
        makeSeed: () => 'hall-refunds',
        scenario: () => scenario,
      })
      s.getState().startRun()
      const view = getView(createGame(scenario, 'hall-refunds'))
      view.company.uiStage = stage
      view.bookings!.policyLocked = false
      s.setState({ view })
      const html = renderToString(
        <StoreProvider value={s}>
          <PricesPlan />
        </StoreProvider>,
      ).replace(/<!-- -->/g, '')
      expect(html).toContain('Strict: cancel and still pay')
      expect(html).toContain('Flexible: free to cancel')
      expect(html).toMatch(/Membership notice (stays with|follows) each agreement/)
    },
  )
  it('keeps visitor refund controls out of member-only class studios', () => {
    const s = createGameStore({
      storage: memoryStorage(),
      makeSeed: () => 'studio-refunds',
      scenario: () => spec,
    })
    s.getState().startRun()
    const html = renderToString(
      <StoreProvider value={s}>
        <PricesPlan />
      </StoreProvider>,
    )
    expect(html).not.toContain('Strict: cancel and still pay')
    expect(html).not.toContain('Visitor booking cancellations')
  })
  it('keeps the hall controls absent in ordinary class studios', () => {
    const s = createGameStore({
      storage: memoryStorage(),
      makeSeed: () => 'hall-ui',
      scenario: () => spec,
    })
    s.getState().startRun()
    expect(
      renderToString(
        <StoreProvider value={s}>
          <HallPlan />
        </StoreProvider>,
      ),
    ).toBe('')
  })
})
