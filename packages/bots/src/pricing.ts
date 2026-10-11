import type { PlayerView, WeekReport } from '@founder-mode/engine'

export type PricingRule = {
  /** Price raise per step, in cents. */
  stepCents: number
  /** Trial results needed at a price before it is judged. */
  window: number
  /** Raise again while at least this share of trials at the current price became customers. */
  threshold: number
}

/**
 * Raises the price stepwise while trial conversion holds. Only trials that ended at the current
 * price count, read off the week report: a lead that was in trial and is now won or declined.
 * When a window converts below the threshold, the price goes back one step and stays there.
 */
export class PriceSearch {
  private wins = 0
  private ended = 0
  private locked = false
  private target: number | null = null

  constructor(private readonly rule: PricingRule) {}

  /** The price to plan this week. */
  price(view: PlayerView): number {
    this.target ??= view.company.priceCentsPerMonth
    return this.target
  }

  observe(before: PlayerView, report: WeekReport): void {
    if (this.locked || this.target === null) return
    const inTrial = new Set(before.leads.filter((l) => l.stage === 'trial').map((l) => l.id))
    for (const e of report.entries) {
      if (e.kind !== 'lead_update' || !inTrial.has(e.leadId)) continue
      if (e.change === 'won') {
        this.wins++
        this.ended++
      } else if (e.change === 'declined' || e.change === 'declined_price') {
        this.ended++
      }
    }
    if (this.ended < this.rule.window) return
    if (this.wins / this.ended >= this.rule.threshold) {
      this.target += this.rule.stepCents
    } else {
      this.target = Math.max(this.rule.stepCents, this.target - this.rule.stepCents)
      this.locked = true
    }
    this.wins = 0
    this.ended = 0
  }
}
