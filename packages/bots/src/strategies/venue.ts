import type { Scenario } from '@founder-mode/content'
import type { PlayerView } from '@founder-mode/engine'
import { segmentNotes } from '../strategy'
import type { TourismRule } from './tourism'

/** Venue choices use interview mentions, actual complaints and the visible calendar. */
export function venueWanted(
  scenario: Scenario,
  view: PlayerView,
  rule: TourismRule,
  requested: string[],
): string[] {
  const cfg = scenario.bookings!
  const l = view.bookings!.leisure!
  const noise = cfg.leisure!.noise!
  const needs = [...requested]
  if (rule.tests && !rule.segment && l.openingWeek !== null) {
    for (const segment of scenario.segments) {
      const notes = segmentNotes(scenario, view, segment.id)
      if (notes.interviews < 4) continue
      const mentions = notes.mentions.map(([id]) => id)
      needs.push(...mentions)
      const product = Object.entries(cfg.products).find(
        ([, p]) => p.serves.includes(segment.id) && !p.ownDemand,
      )
      if (product) needs.push(product[0])
      for (const id of noise.products) {
        const late = cfg.products[id]
        if (late?.serves.includes(segment.id) && late.requires && mentions.includes(late.requires))
          needs.push(id)
      }
    }
  }
  const furniture = view.bookings!.assets.find((a) => a.id === 'dinner_furniture')
  const age = l.openingWeek === null ? 0 : Math.max(1, view.week - l.openingWeek)
  const futureUses =
    furniture && age >= 8 ? (furniture.weeksUsed / age) * (view.maxWeeks - view.week) : 0
  const buy = furniture?.terms.buy
  const hire = furniture?.terms.share
  const paysBack =
    buy &&
    hire &&
    futureUses * hire.unitCents > buy.priceCents &&
    view.company.cashCents > buy.priceCents + 3 * view.company.monthlyFixedCostsCents
  const quiet = !l.slotCalendar.some(
    (c) =>
      c.week >= view.week &&
      c.week < view.week + (cfg.leisure!.buildOut?.[noise.insulation]?.weeks ?? 1) &&
      c.booked + c.held > 0,
  )
  const insulate =
    rule.leisure?.venueInsulation !== false && (l.noise?.complaints ?? 0) > 0 && quiet
  if (insulate) needs.push(noise.insulation)
  return [
    ...new Set([
      ...cfg.leisure!.opening!.areas,
      ...needs.filter((id) => {
        if (id === noise.insulation) return insulate
        if (id === furniture?.buyProduct && furniture.option === 'share') return !!paysBack
        return !view.bookings!.leisure!.builds.some(
          (b) =>
            b.productId === id &&
            b.permit?.refusedWeek !== null &&
            b.permit?.refusedWeek !== undefined,
        )
      }),
    ]),
  ]
}
