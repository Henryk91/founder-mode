import { loadScenario, type ScenarioId } from '@founder-mode/content'
import { describe, expect, it } from 'vitest'
import { createGame, endWeek, getView, replay, toSave, validatePlan } from '../src/index'
import { openSecondSite } from '../src/systems/bookings'
import { conditionValue } from '../src/systems/conditions'
import { moveOffice } from '../src/systems/office'
import { plan } from './helpers'

// Plan 6 step 3 (docs/plan6-features.md section 2): the seven newer scenarios' new stages.
const SITES: ScenarioId[] = [
  'rueckenwind',
  'tiefgang',
  'ausgesperrt',
  'fabriketage',
  'schweissperle',
  'griffig',
]

describe.each(SITES)('%s: stages 3 to 5', (id) => {
  const scenario = loadScenario(id, 'long')

  it('has five stages, an offer for each new one, and a second site at the fifth', () => {
    expect(scenario.officeStages).toHaveLength(5)
    const fifth = scenario.officeStages[4]!
    expect(fifth.secondSite).toBeDefined()
    expect(fifth.needsContract).toBeDefined()
    expect(scenario.establishedAt?.officeStage).toBe(4)
    for (const stage of scenario.officeStages.slice(2)) {
      const offer = scenario.events.find((e) =>
        e.choices.some((c) =>
          c.effects.some((fx) => fx.type === 'officeMove' && fx.stage === stage.id),
        ),
      )
      expect([stage.id, offer !== undefined]).toEqual([stage.id, true])
    }
  })

  it('opens the second site only with a manager or the founder, and replays exactly', () => {
    const fifth = scenario.officeStages[4]!.id
    const s = moveOffice(createGame(scenario, `${id}-site`), fifth)
    expect(openSecondSite(s)).toBeNull()
    expect(getView(s).office.secondSite!.open).toBe(false)
    expect(conditionValue(s, 'office.twoSites')).toBe(1)
    const p = plan({ office: { notice: false, founderAt: 'second' } })
    expect(validatePlan(s, p)).toEqual([])
    const there = endWeek(s, p).state
    expect(openSecondSite(there)).not.toBeNull()
    expect(there.company.office.secondSite!.weeksOpen).toBe(1)
  })

  it('keeps games replayable from the seed with the new content', () => {
    let s = createGame(scenario, `${id}-replay`)
    for (let w = 0; w < 6 && s.status === 'running'; w++) s = endWeek(s, plan()).state
    expect(replay(scenario, toSave(s))).toEqual(s)
  })
})

describe('the boat businesses', () => {
  it('Tiefgang has a second dive boat with its own options and an offer', () => {
    const s = loadScenario('tiefgang', 'long')
    const second = s.bookings!.assets!.second_boat!
    expect(second.secondOf).toBe('dive_boat')
    expect(second.buy?.product).toBe('second_boat_purchase')
    expect(s.loan?.items).toContain('second_boat_purchase')
    expect(s.events.some((e) => e.id === 'second_boat_offer')).toBe(true)
    expect(s.events.some((e) => e.id === 'second_boat_breakdown')).toBe(true)
  })

  it('Leinen los has stages 2 to 4 and a second gulet as the boat’s second unit', () => {
    const s = loadScenario('leinenlos', 'long')
    expect(s.officeStages.map((o) => o.id)).toEqual([
      'harbour_desk',
      'harbour_shop',
      'crew_house',
      'munich_desk',
    ])
    expect(s.officeStages[2]!.assetCrewFactor).toBe(0.9)
    const second = s.bookings!.assets!.second_gulet!
    expect(second.secondOf).toBe('gulet')
    expect(second.share && second.lease && second.buy).toBeTruthy()
    expect(s.events.some((e) => e.id === 'second_gulet_offer')).toBe(true)
  })
})
