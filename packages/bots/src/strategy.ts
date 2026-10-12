import type { Scenario } from '@founder-mode/content'
import {
  emptyPlan,
  type ChannelId,
  type PlayerView,
  type WeekPlan,
  type WeekReport,
} from '@founder-mode/engine'

/**
 * A bot player. It sees only what a human sees: the `PlayerView` before each week and the
 * `WeekReport` after it. The scenario is passed in for observable facts such as the order of
 * the interview buckets, never for hidden values.
 */
export type Answer = { messageId: string; choiceId: string }

export type Player = {
  /** Answers to inbox messages, given before the plan. Unanswered messages take their default. */
  respond?(view: PlayerView): Answer[]
  plan(view: PlayerView): WeekPlan
  observe?(report: WeekReport, view: PlayerView): void
  /** The market the player is working on, if it has one. Read by the report only. */
  focus?(): string | null
}

export type Strategy = {
  id: string
  description: string
  /** The description for one scenario, when it names that scenario's markets. */
  describe?(scenario: Scenario): string
  create(scenario: Scenario, seed: string): Player
  /** For report diagnostics only: the scenario this strategy is played on, from the real one. */
  adapt?(scenario: Scenario): Scenario
}

export const describeStrategy = (strategy: Strategy, scenario: Scenario): string =>
  strategy.describe?.(scenario) ?? strategy.description

/** Builds a week plan inside an hour budget. Every method takes what fits and returns it. */
export class PlanBuilder {
  readonly plan: WeekPlan = emptyPlan()
  free: number

  constructor(
    private readonly view: PlayerView,
    budget: number,
  ) {
    // Hours already taken by answers to messages and by earlier penalties come off the budget.
    const taken = view.committedHours + view.forcedHours
    this.free = Math.max(0, Math.min(budget, view.founder.maxHoursPerWeek) - taken)
  }

  /** Follows up with open leads, silent ones first, up to `max` of them, optionally in one market. */
  followUp(max: number, segmentId?: string): number {
    const open = this.view.leads.filter(
      (l) =>
        l.canFollowUp &&
        !this.plan.followUps.includes(l.id) &&
        (segmentId === undefined || l.segmentId === segmentId),
    )
    open.sort((a, b) => Number(b.silent) - Number(a.silent))
    let n = 0
    for (const lead of open) {
      if (n >= max || this.free < this.view.costs.followUpHours) break
      this.plan.followUps.push(lead.id)
      this.free -= this.view.costs.followUpHours
      n++
    }
    return n
  }

  /** Chases overdue invoices, oldest first, up to `max` of them. */
  chase(max: number): number {
    let n = 0
    for (const inv of this.view.invoices) {
      if (n >= max || this.free < this.view.costs.chaseHours) break
      if (!inv.canChase || this.plan.chase.includes(inv.id)) continue
      this.plan.chase.push(inv.id)
      this.free -= this.view.costs.chaseHours
      n++
    }
    return n
  }

  /** A landing page test with the smallest (or the largest) ad budget, if the hours fit. */
  landing(segmentId: string, size: 'small' | 'large' = 'small'): boolean {
    const budgets = this.view.costs.landingBudgetsCents
    const budget = size === 'small' ? budgets[0] : budgets[budgets.length - 1]
    if (budget === undefined || this.free < this.view.costs.landingHours) return false
    this.plan.landing[segmentId] = budget
    this.free -= this.view.costs.landingHours
    return true
  }

  /** One batch of pre-sale pitches, if the market has batches left and the hours fit. */
  presale(segmentId: string): boolean {
    const seg = this.view.segments.find((x) => x.id === segmentId)
    const c = this.view.costs
    const batches = this.plan.presales[segmentId] ?? 0
    if (!seg || seg.presaleBatchesLeft <= batches) return false
    if (this.free < c.presaleHoursPerBatch) return false
    this.plan.presales[segmentId] = batches + 1
    this.free -= c.presaleHoursPerBatch
    return true
  }

  interviews(segmentId: string, count: number): number {
    const n = Math.max(0, Math.min(count, Math.floor(this.free / this.view.costs.interviewHours)))
    if (n === 0) return 0
    this.plan.interviews[segmentId] = (this.plan.interviews[segmentId] ?? 0) + n
    this.free -= n * this.view.costs.interviewHours
    return n
  }

  build(featureId: string, hours: number): number {
    const f = this.view.product.features.find((x) => x.id === featureId)
    if (!f || f.shipped) return 0
    const already = this.plan.build[featureId] ?? 0
    const h = Math.max(0, Math.min(hours, this.free, f.remainingHours - already))
    if (h === 0) return 0
    this.plan.build[featureId] = already + h
    this.free -= h
    return h
  }

  fixBugs(hours: number): number {
    const left = this.view.product.fixableHours - this.plan.bugFixHours
    const h = Math.max(0, Math.min(hours, this.free, left))
    this.plan.bugFixHours += h
    this.free -= h
    return h
  }

  /** One channel per segment; a second call for the same segment adds hours on its channel. */
  outreach(segmentId: string, channel: ChannelId, hours: number): number {
    const h = Math.max(0, Math.min(hours, this.free))
    if (h === 0) return 0
    const prev = this.plan.outreach[segmentId]
    this.plan.outreach[segmentId] = {
      channel: prev?.channel ?? channel,
      hours: (prev?.hours ?? 0) + h,
    }
    this.free -= h
    return h
  }

  /** Books demos with bookable leads in the given order, as many as fit. */
  demos(leadIds: readonly string[]): number {
    let n = 0
    for (const id of leadIds) {
      if (this.free < this.view.costs.demoHours || this.plan.demos.includes(id)) continue
      const lead = this.view.leads.find((l) => l.id === id)
      if (!lead?.canBookDemo) continue
      this.plan.demos.push(id)
      this.free -= this.view.costs.demoHours
      n++
    }
    return n
  }

  /** Sets the monthly price for customers who sign from this week on. */
  price(cents: number): void {
    this.plan.priceCentsPerMonth = cents === this.view.company.priceCentsPerMonth ? null : cents
  }

  rest(hours: number): number {
    const h = Math.max(0, Math.min(hours, this.free))
    this.plan.restHours += h
    this.free -= h
    return h
  }
}

/** Ids of leads that can have a demo this week, oldest first, optionally for one segment. */
export function bookableLeads(view: PlayerView, segmentId?: string): string[] {
  return view.leads
    .filter((l) => l.canBookDemo && (segmentId === undefined || l.segmentId === segmentId))
    .map((l) => l.id)
}

/** What a player can read off the Market tab for one segment. */
export type SegmentNotes = {
  interviews: number
  /** Mean bucket position, 0 for the lowest bucket up to 1 for the highest. */
  meanBucket: number
  /** Share of interviews in which someone asked for a feature. */
  mentionRate: number
  /** Feature id to the number of interviews that asked for it, most asked first. */
  mentions: [string, number][]
}

export function segmentNotes(
  scenario: Scenario,
  view: PlayerView,
  segmentId: string,
): SegmentNotes {
  const seg = view.segments.find((s) => s.id === segmentId)
  const interviews = seg?.interviews ?? []
  const order = scenario.experiments.interview.buckets.map((b) => b.id)
  const top = Math.max(1, order.length - 1)
  const counts = new Map<string, number>()
  let mentioned = 0
  let bucketSum = 0
  for (const iv of interviews) {
    bucketSum += order.indexOf(iv.bucketId) / top
    if (iv.mentionedFeature) {
      mentioned++
      counts.set(iv.mentionedFeature.id, (counts.get(iv.mentionedFeature.id) ?? 0) + 1)
    }
  }
  const n = interviews.length
  return {
    interviews: n,
    meanBucket: n ? bucketSum / n : 0,
    mentionRate: n ? mentioned / n : 0,
    mentions: [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  }
}

/**
 * Tracks new leads per outreach hour by segment and channel, from week reports. Hours are counted
 * as they work for finding leads: beyond the scenario's saturation window an hour counts for less,
 * so a channel that was worn out does not look bad for good.
 */
export class ChannelLog {
  private readonly stats = new Map<string, { hours: number; leads: number }>()
  /** Founder outreach hours per week, oldest first, as `segment/channel` to hours. */
  private readonly weeks: Map<string, number>[] = []

  constructor(private readonly sales: Scenario['sales']) {}

  private get limit(): number {
    return this.sales.saturationHours * this.sales.saturationWeeks
  }

  /** Hours on a channel in the weeks before this one that still count against its window. */
  recentHours(segmentId: string, channel: ChannelId): number {
    const back = this.weeks.slice(-(this.sales.saturationWeeks - 1))
    return back.reduce((t, w) => t + (w.get(`${segmentId}/${channel}`) ?? 0), 0)
  }

  /** Hours that would count for finding leads if `hours` were spent on the channel now. */
  effective(segmentId: string, channel: ChannelId, hours: number): number {
    const before = this.recentHours(segmentId, channel)
    const full = Math.max(0, Math.min(hours, this.limit - before))
    return full + (hours - full) * this.sales.saturatedFactor
  }

  record(plan: WeekPlan, report: WeekReport): void {
    const week = new Map<string, number>()
    for (const e of report.entries) {
      if (e.kind !== 'new_leads') continue
      const out = plan.outreach[e.segmentId]
      if (!out || out.channel !== e.channel) continue
      const key = `${e.segmentId}/${e.channel}`
      const counted = this.effective(e.segmentId, e.channel, out.hours)
      const s = this.stats.get(key) ?? { hours: 0, leads: 0 }
      this.stats.set(key, { hours: s.hours + counted, leads: s.leads + e.count })
    }
    for (const [seg, out] of Object.entries(plan.outreach)) {
      const key = `${seg}/${out.channel}`
      week.set(key, (week.get(key) ?? 0) + out.hours)
    }
    this.weeks.push(week)
  }

  hours(segmentId: string, channel: ChannelId): number {
    return this.stats.get(`${segmentId}/${channel}`)?.hours ?? 0
  }

  rate(segmentId: string, channel: ChannelId): number {
    const s = this.stats.get(`${segmentId}/${channel}`)
    return s && s.hours > 0 ? s.leads / s.hours : 0
  }

  /** Leads per hour on the best channel tried in a segment, 0 before any outreach there. */
  bestRate(segmentId: string, channels: readonly ChannelId[]): number {
    return Math.max(0, ...channels.map((c) => this.rate(segmentId, c)))
  }

  /**
   * The channel to use next: any channel tried for less than `minHours` first, else the one that
   * would find the most leads with `hours` now, given how worn out each one is.
   */
  choose(
    segmentId: string,
    channels: readonly ChannelId[],
    minHours: number,
    hours = 0,
  ): ChannelId {
    const untried = channels.find((c) => this.hours(segmentId, c) < minHours)
    if (untried) return untried
    let best = channels[0] as ChannelId
    let bestLeads = -1
    for (const c of channels) {
      const leads = this.rate(segmentId, c) * this.effective(segmentId, c, Math.max(1, hours))
      if (leads > bestLeads) {
        best = c
        bestLeads = leads
      }
    }
    return best
  }
}
