import type { Scenario } from '@founder-mode/content'
import type { MessageView, PlayerView } from '@founder-mode/engine'

/**
 * Plan 3 (docs/office-stages.md): how bots answer the offers of office stages 3 to 5.
 * `careful` moves when the condition the offer names is real for this company (desks full and a
 * hire wanted, guests turned away for lack of room, a sustained profit) and the money covers the
 * one-off plus half a year of the added rent and two months of today's costs, and last month's
 * surplus carries the added rent twice over. `never` declines
 * every offer (target O1), `always` accepts each at once (target O2).
 */
export type OfficeRule = 'careful' | 'never' | 'always'

/** Months of added rent, and of today's fixed costs, a careful move keeps in hand. */
const RENT_MONTHS = 6
/** A careful move wants last month's surplus to cover the added rent this many times over. */
const SURPLUS_RENTS = 2
const COST_MONTHS = 2
/** Weeks of the last 8 with guests turned away that make a tourism move worth it. */
const TURNED_AWAY_WEEKS = 3

export type Offer = { stage: string; number: number; choiceId: string; needsContract?: string }

/** The offers in a scenario's events: event id to the stage it moves to and the choice. */
export function officeOffers(scenario: Scenario): Map<string, Offer> {
  const out = new Map<string, Offer>()
  for (const e of scenario.events) {
    for (const c of e.choices) {
      const fx = c.effects.find((x) => x.type === 'officeMove')
      if (fx?.type !== 'officeMove') continue
      const number = scenario.officeStages.findIndex((o) => o.id === fx.stage) + 1
      const stage = scenario.officeStages[number - 1]!
      out.set(e.id, {
        stage: fx.stage,
        number,
        choiceId: c.id,
        ...(stage.needsContract ? { needsContract: stage.needsContract } : {}),
      })
    }
  }
  return out
}

/** The money a careful founder can count on: company cash and personal savings. */
const money = (view: PlayerView) => view.company.cashCents + Math.max(0, view.founder.savingsCents)

/**
 * Last month's surplus as the screen shows it: monthly revenue less the company's fixed costs and
 * the founder's living costs. A sustained profit is one that carries the new rent.
 */
export const surplusCents = (view: PlayerView): number =>
  view.monthlyRevenueCents -
  view.company.monthlyFixedCostsCents -
  view.founder.livingCostCentsPerMonth

/** What a careful move must have in hand for this offer's choice. */
export function moveNeedsCents(view: PlayerView, m: MessageView, offer: Offer): number {
  const c = m.choices.find((x) => x.id === offer.choiceId)!
  return (
    c.costCents +
    RENT_MONTHS * c.monthlyCostCents +
    COST_MONTHS * view.company.monthlyFixedCostsCents
  )
}

/**
 * Whether the reason for the move is real for this company now. A subscription business moves
 * for desks (full, with a hire wanted) or, for the first office, a sustained profit; a tourism
 * business for lack of room (guests turned away), and a stage that needs someone stationed there
 * only once such a contract runs.
 */
export function moveIsReal(view: PlayerView, offer: Offer, wantsHire: boolean): boolean {
  const o = view.office
  if (!view.bookings) {
    // Only the desks (or, at the office floor, the team's size) stopping a wanted hire. A solo
    // founder's profit is better kept: measured, every office lost against staying (plan 3
    // step 2, decisions).
    return wantsHire
  }
  if (offer.needsContract) {
    const staffed = view.bookings.contracts.some(
      (c) => c.roleId === offer.needsContract && c.working,
    )
    if (!staffed) return false
  }
  if (offer.number >= 5) return o.peakTurnedAwayWeeks >= 2 || o.occupancyPct > 80
  return o.turnedAwayWeeks >= TURNED_AWAY_WEEKS
}

/**
 * Answers to open office offers under a rule. `wantsHire` says whether the bot's own hiring rule
 * would look for someone now but has no room. A careful bot whose money falls short leaves the
 * offer open (for the bank's plan, where there is one) rather than declining it.
 */
export function answerOffers(
  view: PlayerView,
  offers: Map<string, Offer>,
  rule: OfficeRule,
  wantsHire: boolean,
  hoursLeft: number,
): { messageId: string; choiceId: string; hours: number }[] {
  if (rule === 'never') return []
  const out: { messageId: string; choiceId: string; hours: number }[] = []
  let left = hoursLeft
  for (const m of view.inbox) {
    const offer = offers.get(m.eventId)
    if (!offer || m.answeredChoiceId !== null || view.office.busy) continue
    const c = m.choices.find((x) => x.id === offer.choiceId)
    if (!c || c.hours > left) continue
    if (rule === 'careful') {
      if (!moveIsReal(view, offer, wantsHire)) continue
      if (money(view) < moveNeedsCents(view, m, offer)) continue
      if (surplusCents(view) < SURPLUS_RENTS * c.monthlyCostCents) continue
    }
    out.push({ messageId: m.id, choiceId: c.id, hours: c.hours })
    left -= c.hours
    break
  }
  return out
}

/**
 * The stage a careful tourism bot lists in the bank's plan: one whose offer is open and real,
 * which the bank will finance, and whose one-off the money in hand cannot carry.
 */
export function stageToFinance(
  view: PlayerView,
  offers: Map<string, Offer>,
  rule: OfficeRule,
): string | null {
  if (rule === 'never') return null
  const financeable = new Set((view.loan?.plan?.stages ?? []).map((s) => s.id))
  for (const m of view.inbox) {
    const offer = offers.get(m.eventId)
    if (!offer || m.answeredChoiceId !== null || !financeable.has(offer.stage)) continue
    if (rule === 'always') return offer.stage
    if (!moveIsReal(view, offer, false)) continue
    if (money(view) >= moveNeedsCents(view, m, offer)) continue
    return offer.stage
  }
  return null
}
