import type { PlayerView, WeekReport } from '@founder-mode/engine'

/**
 * Sets the careful bot's price each week from what it can see. `observe` gets the view the plan
 * was made from, that week's report, and the market the bot sells in.
 */
export interface Pricer {
  /** The price to plan this week, with the market the bot sells in (null before it chose). */
  price(view: PlayerView, focus: string | null): number
  observe(before: PlayerView, report: WeekReport, focus: string | null): void
}

/** Rounds to whole 10 EUR, as a player would. */
const round = (cents: number) => Math.max(1000, Math.round(cents / 1000) * 1000)

/** Trials that ended at the plan's price: won, a no over the price, or another no. */
function trialEnds(before: PlayerView, report: WeekReport, focus: string | null) {
  const inTrial = new Set(
    before.leads
      .filter((l) => l.stage === 'trial' && (focus === null || l.segmentId === focus))
      .map((l) => l.id),
  )
  const out = { won: 0, price: 0, other: 0 }
  for (const e of report.entries) {
    if (e.kind !== 'lead_update' || !inTrial.has(e.leadId)) continue
    if (e.change === 'won') out.won++
    else if (e.change === 'declined_price') out.price++
    else if (e.change === 'declined') out.other++
  }
  return out
}

/** Customers in this report who said they left over the price. */
const priceCancellations = (report: WeekReport, focus: string | null) =>
  report.entries.filter(
    (e) =>
      e.kind === 'customer_churned' && e.overPrice && (focus === null || e.segmentId === focus),
  ).length

/** Budget figures named in a market's interviews, as the screen shows them. */
export function budgetHints(view: PlayerView, segmentId: string): number[] {
  const seg = view.segments.find((s) => s.id === segmentId)
  return (seg?.interviews ?? []).flatMap((iv) => (iv.budget ? [iv.budget.amountCents] : []))
}

export type SearchRule = {
  /** Price raise per step, as a share of the current price. */
  stepShare: number
  /** Trials that said yes or no over the price, needed at a price before it is judged. */
  window: number
  /** Step down when at least this share of them said no over the price. */
  tooMany: number
  /**
   * Reading budget quotes: with at least `minHints` in its market, start at `start` times their
   * average and search only between `low` and `high` times it. Null ignores them.
   */
  hints: { minHints: number; start: number; low: number; high: number } | null
}

/**
 * Searches for the price its market will bear, reading only the screen: trials in its own market
 * that became customers or said no over the price, and customers there who left over it. Each
 * window at a price raises it (nobody said no over the price), keeps it (a few did), or lowers it
 * (many did, or a customer left over it). A price it lowered from is tried again only after two
 * clean windows just below it.
 */
export class PriceSearch implements Pricer {
  private target: number | null = null
  private wins = 0
  private priceNos = 0
  private ceiling: number | null = null
  private cleanBelowCeiling = 0
  private anchored: { focus: string; count: number; mean: number } | null = null

  constructor(private readonly rule: SearchRule) {}

  price(view: PlayerView, focus: string | null): number {
    this.target ??= view.company.priceCentsPerMonth
    const h = this.rule.hints
    if (h && focus !== null) {
      const hints = budgetHints(view, focus)
      if (hints.length >= h.minHints) {
        const mean = hints.reduce((a, b) => a + b, 0) / hints.length
        // A new market, or new quotes in it: start again from what they said.
        if (this.anchored?.focus !== focus || this.anchored.count !== hints.length) {
          this.anchored = { focus, count: hints.length, mean }
          this.target = round(mean * h.start)
          this.ceiling = null
          this.wins = 0
          this.priceNos = 0
        }
        this.target = Math.min(round(mean * h.high), Math.max(round(mean * h.low), this.target))
      }
    }
    return this.target
  }

  observe(before: PlayerView, report: WeekReport, focus: string | null): void {
    if (this.target === null || focus === null) return
    const t = trialEnds(before, report, focus)
    this.wins += t.won
    this.priceNos += t.price
    if (priceCancellations(report, focus) > 0) return this.down()
    if (this.wins + this.priceNos < this.rule.window) return
    const share = this.priceNos / (this.wins + this.priceNos)
    if (share >= this.rule.tooMany) this.down()
    else if (this.priceNos === 0) this.up()
    this.wins = 0
    this.priceNos = 0
  }

  private up() {
    const next = round(this.target! * (1 + this.rule.stepShare))
    if (this.ceiling !== null && next >= this.ceiling) {
      if (++this.cleanBelowCeiling < 2) return
      this.ceiling = null
    }
    this.cleanBelowCeiling = 0
    this.set(next)
  }

  private down() {
    this.ceiling = this.target
    this.cleanBelowCeiling = 0
    this.set(round(this.target! / (1 + this.rule.stepShare)))
    this.wins = 0
    this.priceNos = 0
  }

  private set(price: number) {
    this.target = price
  }
}

/**
 * A fixed recipe, for comparison: one step up every `everyWeeks` weeks until the first "too
 * expensive" anywhere, then one step back and never again.
 */
export class PriceRecipe implements Pricer {
  private target: number | null = null
  private lastRaise = 0
  private done = false

  constructor(
    private readonly stepShare: number,
    private readonly everyWeeks: number,
  ) {}

  price(view: PlayerView): number {
    this.target ??= view.company.priceCentsPerMonth
    if (!this.done && view.week - this.lastRaise >= this.everyWeeks) {
      this.target = round(this.target * (1 + this.stepShare))
      this.lastRaise = view.week
    }
    return this.target
  }

  observe(before: PlayerView, report: WeekReport): void {
    if (this.done || this.target === null) return
    const t = trialEnds(before, report, null)
    if (t.price > 0 || priceCancellations(report, null) > 0) {
      this.target = round(this.target / (1 + this.stepShare))
      this.done = true
    }
  }
}

/** A fixed multiple of the default price, set in week 1 and kept. */
export class FixedPrice implements Pricer {
  private target: number | null = null

  constructor(private readonly multiple: number) {}

  price(view: PlayerView): number {
    if (this.target === null) {
      this.target = round(view.company.priceCentsPerMonth * this.multiple)
    }
    return this.target
  }

  observe(): void {}
}
