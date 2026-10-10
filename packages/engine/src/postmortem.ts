import { activeCustomers } from './systems/customers'
import { bucketFor, interviewsOf } from './systems/experiments'
import { monthlyFixedCostsCents, runwayWeeks } from './systems/finance'
import { reachedMilestones } from './systems/milestones'
import { hireEconomics, salaryId } from './systems/team'
import type {
  Activity,
  ChainItem,
  ChainKind,
  ExperimentEvent,
  GameState,
  HoursByActivity,
  LuckItem,
  MarketTruth,
  Misread,
  OddsEvent,
  PostMortem,
  PostMortemCause,
  PostMortemCauseId,
  SegmentId,
  SuggestionId,
  WeekPlan,
} from './types'

/** Earlier steps shown before the final week. */
const CHAIN_EARLIER = 3
/** Luck items shown. */
const LUCK_ITEMS = 4
/** A luck group matters from this many customers either way, unless it changed a choice. */
const LUCK_MIN_CUSTOMERS = 0.5
/** A test result is misread when it is at most half or at least double what was normal... */
const EXPERIMENT_FACTOR = 2
/** ...and at least this far off. */
const EXPERIMENT_MIN_GAP = 2
/** Fewer interviews than this in the chosen market is too few. */
const FEW_INTERVIEWS = 6
/** Invoices written off before chasing becomes the lesson. */
const WRITTEN_OFF_LESSON = 2

const ACTIVITIES: Activity[] = ['learning', 'building', 'selling', 'admin', 'rest']

/**
 * The post-mortem of a finished run (plan section 4.15). Reads the event log, the player's
 * knowledge, the hidden state, the ledger, customers and the action log. Hidden values are
 * revealed here on purpose, so it throws while the run is still going.
 */
export function buildPostMortem(state: GameState): PostMortem {
  if (state.status !== 'ended' || state.ending === null) {
    throw new Error('The post-mortem is only built once the run has ended')
  }
  const plans = weekPlans(state)
  const focus = focusMarket(state, plans)
  const markets = state.scenario.segments.map((s) => marketTruth(state, s.id))
  const cause = buildCause(state)
  const misreads = buildMisreads(state, markets, focus)
  const hours = sumHours(state)
  const luck = buildLuck(state, cause)
  const hire = hireEconomics(state)
  const moves = (kind: string) =>
    state.eventLog.reduce(
      (t, e) => (e.kind === kind && 'amountCents' in e ? t + e.amountCents : t),
      0,
    )
  const savingsEmpty = state.ledger.find((l) => l.savingsEndCents <= 0) ?? null

  return {
    scenarioId: state.scenarioId,
    seed: state.seed,
    ending: state.ending,
    week: state.week,
    maxWeeks: state.scenario.maxWeeks,
    names: {
      segments: Object.fromEntries(state.scenario.segments.map((x) => [x.id, x.name])),
      features: Object.fromEntries(state.scenario.features.map((x) => [x.id, x.name])),
      buckets: Object.fromEntries(
        state.scenario.experiments.interview.buckets.map((x) => [x.id, x.name]),
      ),
    },
    cause,
    milestones: reachedMilestones(state),
    chain: buildChain(state, cause),
    suggestions: buildSuggestions(state, markets, focus, cause),
    markets,
    misreads,
    hours: {
      total: ACTIVITIES.reduce((t, a) => t + hours[a], 0),
      byActivity: hours,
      weeksOverBase: cause.weeksOverBase,
      baseHoursPerWeek: state.founder.baseHoursPerWeek,
      focusSegmentId: focus?.segmentId ?? null,
      focusSellingHours: focus?.sellingHours ?? 0,
    },
    money: {
      savingsStartCents: state.scenario.start.savingsCents,
      savingsEmptyWeek: savingsEmpty?.week ?? null,
      livingFromSavingsCents: state.ledger.reduce(
        (t, l) => t + l.livingCostsCents - l.founderDrawCents,
        0,
      ),
      movedByYouCents: moves('savings_transfer'),
      movedAutomaticallyCents: moves('auto_top_up'),
      companyPaidYouCents: moves('founder_draw'),
      customersPaidCents: state.ledger.reduce((t, l) => t + l.revenueCents, 0),
      peakRevenueCents: cause.peakRevenueCents,
      hire,
    },
    luck,
  }
}

// ---------------------------------------------------------------------------
// Helpers

function weekPlans(state: GameState): WeekPlan[] {
  return state.actionLog.flatMap((a) => (a.type === 'endWeek' ? [a.plan] : []))
}

const bucketIds = (state: GameState) =>
  state.scenario.experiments.interview.buckets.map((b) => b.id)

function monthlyCosts(state: GameState, withHire: boolean): number {
  const member = state.team.members[0]
  const salary =
    member && !withHire
      ? (state.company.fixedCosts.find((c) => c.id === salaryId(member))?.monthlyCents ?? 0)
      : 0
  return (
    monthlyFixedCostsCents(state) -
    salary +
    state.founder.livingCostCentsPerWeek * state.scenario.finance.weeksPerMonth
  )
}

/** The good market's role: the one with the highest pain. */
function goodRoleId(state: GameState): string | undefined {
  return [...state.scenario.roles].sort((a, b) => b.pain.min - a.pain.min)[0]?.id
}

const totalHours = (h: HoursByActivity) => ACTIVITIES.reduce((t, a) => t + h[a], 0)

function sumHours(state: GameState): HoursByActivity {
  const out: HoursByActivity = { learning: 0, building: 0, selling: 0, admin: 0, rest: 0 }
  for (const l of state.ledger) for (const a of ACTIVITIES) out[a] += l.hours[a]
  return out
}

type Focus = { segmentId: SegmentId; hours: number; sellingHours: number }

/**
 * The market most of the work went to: outreach, demos and follow ups there, plus building
 * features that only that market needs. Null when no work went to any market.
 */
function focusMarket(state: GameState, plans: WeekPlan[]): Focus | null {
  const sales = state.scenario.sales
  const selling = new Map<SegmentId, number>()
  const building = new Map<SegmentId, number>()
  const add = (m: Map<SegmentId, number>, id: SegmentId | undefined, h: number) => {
    if (id !== undefined && h > 0) m.set(id, (m.get(id) ?? 0) + h)
  }
  const segmentOfLead = (id: string) => state.leads.find((l) => l.id === id)?.segmentId
  const onlyFor = (featureId: string) => {
    const needing = state.scenario.segments.filter((s) =>
      state.hidden.segments[s.id]?.mustHave.includes(featureId),
    )
    return needing.length === 1 ? needing[0]?.id : undefined
  }
  for (const plan of plans) {
    for (const [seg, o] of Object.entries(plan.outreach)) add(selling, seg, o.hours)
    for (const id of plan.demos) add(selling, segmentOfLead(id), sales.demoHours)
    for (const id of plan.followUps) add(selling, segmentOfLead(id), sales.followUpHours)
    for (const [featureId, h] of Object.entries(plan.build)) add(building, onlyFor(featureId), h)
  }
  let best: Focus | null = null
  for (const seg of state.scenario.segments) {
    const s = selling.get(seg.id) ?? 0
    const total = s + (building.get(seg.id) ?? 0)
    if (total > 0 && (best === null || total > best.hours)) {
      best = { segmentId: seg.id, hours: total, sellingHours: s }
    }
  }
  return best
}

// ---------------------------------------------------------------------------
// 1. What happened

function buildCause(state: GameState): PostMortemCause {
  const ending = state.ending!
  const costs = monthlyCosts(state, true)
  const costsWithoutHire = monthlyCosts(state, false)
  const peak = Math.max(0, ...state.ledger.map((l) => l.monthlyRevenueCents))
  const revenue = activeCustomers(state).reduce((t, c) => t + c.priceCentsPerMonth, 0)
  const lost = state.customers.filter((c) => c.churnedWeek !== null).length
  const won = state.customers.length
  const base = state.founder.baseHoursPerWeek
  const covered = state.ledger.find((l) => l.monthlyRevenueCents >= costs)
  let id: PostMortemCauseId
  if (ending === 'bankrupt') {
    if (won === 0) id = 'bankrupt_no_customers'
    else if (state.team.members.length > 0 && peak >= costsWithoutHire) id = 'bankrupt_hire'
    else if (won >= 2 && lost * 2 > won) id = 'bankrupt_churn'
    else id = 'bankrupt_below_costs'
  } else {
    id = ending
  }
  return {
    id,
    week: state.week,
    peakRevenueCents: peak,
    revenueCents: revenue,
    monthlyCostsCents: costs,
    monthlyCostsWithoutHireCents: costsWithoutHire,
    customersWon: won,
    customersLost: lost,
    weeksOverBase: state.ledger.filter((l) => totalHours(l.hours) > base).length,
    coveredPercent: costs > 0 ? Math.round((100 * revenue) / costs) : 0,
    coveredWeek: covered?.week ?? null,
    runwayWeeks: runwayWeeks(state),
  }
}

const item = (week: number, kind: ChainKind, extra: Partial<ChainItem> = {}): ChainItem => ({
  week,
  kind,
  name: null,
  segmentId: null,
  featureId: null,
  customers: null,
  cents: null,
  ending: null,
  ...extra,
})

/** Steps that can explain each ending; the first kinds listed are always kept when present. */
const CHAIN_RULES: Record<PostMortemCauseId, { keep: ChainKind[]; also: ChainKind[] }> = {
  bankrupt_no_customers: {
    keep: ['savings_empty'],
    also: ['feature_shipped', 'price_changed', 'hire_started', 'lead_declined'],
  },
  bankrupt_hire: {
    keep: ['hire_started'],
    also: ['savings_empty', 'customer_lost', 'hire_let_go', 'customer_won'],
  },
  bankrupt_churn: { keep: ['savings_empty'], also: ['customer_lost'] },
  bankrupt_below_costs: {
    keep: ['savings_empty'],
    also: ['customer_lost', 'customer_won', 'invoice_written_off', 'price_changed'],
  },
  burnout: { keep: ['energy_low', 'energy_zero'], also: ['hire_let_go', 'customer_lost'] },
  still_searching: {
    keep: [],
    also: ['first_customer', 'savings_empty', 'customer_lost', 'customer_won', 'price_changed'],
  },
  sustainable: { keep: ['first_customer', 'covers_all_costs'], also: ['customer_won'] },
  shut_down: {
    keep: [],
    also: ['savings_empty', 'customer_lost', 'customer_won', 'feature_shipped', 'hire_started'],
  },
}

function chainCandidates(state: GameState, cause: PostMortemCause): ChainItem[] {
  const out: ChainItem[] = []
  const ledgerAt = (w: number) => state.ledger.find((l) => l.week === w)
  const empty = state.ledger.find((l) => l.savingsEndCents <= 0)
  if (empty) out.push(item(empty.week, 'savings_empty'))
  state.customers.forEach((c, i) => {
    const w = c.sinceWeek
    const extra = {
      name: c.name,
      segmentId: c.segmentId,
      customers: ledgerAt(w)?.customers ?? null,
      cents: c.priceCentsPerMonth,
    }
    out.push(item(w, i === 0 ? 'first_customer' : 'customer_won', extra))
    if (c.churnedWeek !== null) {
      out.push(
        item(c.churnedWeek, 'customer_lost', {
          name: c.name,
          segmentId: c.segmentId,
          customers: ledgerAt(c.churnedWeek)?.customers ?? null,
          cents: ledgerAt(c.churnedWeek)?.monthlyRevenueCents ?? null,
        }),
      )
    }
  })
  for (const f of state.product.features) {
    if (f.shippedWeek !== null)
      out.push(item(f.shippedWeek, 'feature_shipped', { featureId: f.id }))
  }
  for (const m of state.team.members) {
    if (m.startWeek <= state.week) out.push(item(m.startWeek, 'hire_started', { name: m.name }))
    if (m.letGoWeek !== null) out.push(item(m.letGoWeek, 'hire_let_go', { name: m.name }))
  }
  let price = state.scenario.start.priceCentsPerMonth
  for (const a of state.actionLog) {
    if (a.type !== 'endWeek' || a.plan.priceCentsPerMonth === null) continue
    if (a.plan.priceCentsPerMonth !== price) {
      price = a.plan.priceCentsPerMonth
      out.push(item(a.week, 'price_changed', { cents: price }))
    }
  }
  const { lowBelow } = state.scenario.founder.energy
  let wasLow = false
  let zeroFrom: number | null = null
  for (const l of state.ledger) {
    const low = l.energyEnd <= lowBelow
    if (low && !wasLow) out.push(item(l.week, 'energy_low'))
    wasLow = low
    if (l.energyEnd === 0) zeroFrom ??= l.week
    else zeroFrom = null
  }
  if (zeroFrom !== null) out.push(item(zeroFrom, 'energy_zero'))
  for (const inv of state.invoices) {
    if (inv.writtenOffWeek !== null) {
      out.push(
        item(inv.writtenOffWeek, 'invoice_written_off', {
          name: inv.customerName,
          segmentId: inv.segmentId,
          cents: inv.amountCents,
        }),
      )
    }
  }
  if (cause.coveredWeek !== null) {
    out.push(
      item(cause.coveredWeek, 'covers_all_costs', {
        cents: ledgerAt(cause.coveredWeek)?.monthlyRevenueCents ?? null,
      }),
    )
  }
  // Declined demos and trials only count in the final week, where nothing else shows them.
  for (const l of state.leads) {
    if (l.stage === 'lost' && l.lostReason === 'declined' && l.stageSinceWeek === state.week) {
      out.push(item(state.week, 'lead_declined', { name: l.name, segmentId: l.segmentId }))
    }
  }
  return out
}

/**
 * Up to three earlier steps chosen by the ending's rule (kept kinds first, then the newest of
 * the others), then every step of the final week, so skipping its results screen loses
 * nothing, then the ending itself.
 */
function buildChain(state: GameState, cause: PostMortemCause): ChainItem[] {
  const rule = CHAIN_RULES[cause.id]
  const all = chainCandidates(state, cause)
  const earlier = all.filter((c) => c.week < state.week)
  const finalWeek = all.filter((c) => c.week === state.week)
  const latest = (kinds: ChainKind[]) =>
    kinds
      .map((k) => earlier.filter((c) => c.kind === k).at(-1))
      .filter((c): c is ChainItem => c !== undefined)
  const kept = latest(rule.keep).slice(0, CHAIN_EARLIER)
  const others = earlier
    .filter((c) => rule.also.includes(c.kind) && !kept.includes(c))
    .sort((a, b) => b.week - a.week)
    .slice(0, CHAIN_EARLIER - kept.length)
  const chosen = [...kept, ...others].sort((a, b) => a.week - b.week)
  const cash = state.ledger.at(-1)?.cashEndCents ?? state.company.cashCents
  return [
    ...chosen,
    ...finalWeek,
    item(state.week, 'ending', { ending: state.ending, cents: cash }),
  ]
}

// ---------------------------------------------------------------------------
// 2. The three markets

function marketTruth(state: GameState, segmentId: SegmentId): MarketTruth {
  const hidden = state.hidden.segments[segmentId]
  if (!hidden) throw new Error(`Unknown segment ${segmentId}`)
  const evidence = state.knowledge[segmentId] ?? []
  const ids = bucketIds(state)
  const ivs = interviewsOf(evidence)
  const meanIndex = ivs.length
    ? ivs.reduce((t, iv) => t + ids.indexOf(iv.bucketId), 0) / ivs.length
    : null
  const landing = evidence.flatMap((e) => (e.kind === 'landing' ? [e] : []))
  const presale = evidence.flatMap((e) => (e.kind === 'presale' ? [e] : []))
  const customers = state.customers.filter((c) => c.segmentId === segmentId)
  return {
    segmentId,
    roleId: hidden.roleId,
    painBucketId: bucketFor(state, hidden.pain),
    interviews: ivs.length,
    saidBucketId: meanIndex === null ? null : (ids[Math.round(meanIndex)] ?? null),
    topBucketCount: ivs.filter((iv) => iv.bucketId === ids.at(-1)).length,
    landing: landing.length
      ? {
          tests: landing.length,
          visitors: landing.reduce((t, e) => t + e.visitors, 0),
          signups: landing.reduce((t, e) => t + e.signups, 0),
        }
      : null,
    presale: presale.length
      ? {
          batches: presale.length,
          prospects: presale.reduce((t, e) => t + e.prospects, 0),
          commits: presale.reduce((t, e) => t + e.commits, 0),
          priceCents: presale.at(-1)!.priceCents,
        }
      : null,
    wtpCents: Math.round(hidden.wtpCents / 1000) * 1000,
    customersWon: customers.length,
    customerPricesCents: [...new Set(customers.map((c) => c.priceCentsPerMonth))].sort(
      (a, b) => a - b,
    ),
    mustHave: hidden.mustHave.map((featureId) => ({
      featureId,
      mentions: ivs.filter((iv) => iv.mentionedFeatureId === featureId).length,
      shippedWeek: state.product.features.find((f) => f.id === featureId)?.shippedWeek ?? null,
    })),
  }
}

// ---------------------------------------------------------------------------
// 3. Misread signals

/** Interviews that would bring the average within half a bucket of the truth, roughly. */
function interviewsNeeded(state: GameState): number {
  const cfg = state.scenario.experiments.interview
  const bounds = cfg.buckets.flatMap((b) => (b.below === undefined ? [] : [b.below]))
  let width = Infinity
  for (let i = 1; i < bounds.length; i++) width = Math.min(width, bounds[i]! - bounds[i - 1]!)
  if (!Number.isFinite(width) || width <= 0) return 0
  return Math.ceil((cfg.noiseSd / (width / 2)) ** 2)
}

function buildMisreads(state: GameState, markets: MarketTruth[], focus: Focus | null): Misread[] {
  const out: Misread[] = []
  const ids = bucketIds(state)
  const needed = interviewsNeeded(state)
  for (const m of markets) {
    if (m.saidBucketId === null) continue
    const said = ids.indexOf(m.saidBucketId)
    const truth = ids.indexOf(m.painBucketId)
    if (said === truth) continue
    const expected = state.eventLog.filter(
      (e) => e.kind === 'interview' && e.segmentId === m.segmentId,
    )
    const meanExpected = expected.reduce((t, e) => t + ('expected' in e ? e.expected : 0), 0)
    const politeIndex = ids.indexOf(bucketFor(state, meanExpected / expected.length))
    const high = said > truth
    const cause = high && politeIndex > truth ? 'politeness' : 'chance'
    out.push({
      kind: high ? 'interviews_high' : 'interviews_low',
      segmentId: m.segmentId,
      interviews: m.interviews,
      saidBucketId: m.saidBucketId,
      painBucketId: m.painBucketId,
      cause,
      interviewsNeeded: cause === 'chance' && m.interviews < needed ? needed : null,
    })
  }
  for (const e of experimentEvents(state)) {
    const size = experimentSize(state, e)
    const off = Math.abs(e.observed - e.expected) >= EXPERIMENT_MIN_GAP
    const far =
      e.observed * EXPERIMENT_FACTOR <= e.expected || e.observed >= e.expected * EXPERIMENT_FACTOR
    if (off && far) {
      out.push({
        kind: 'experiment',
        experiment: e.kind,
        segmentId: e.segmentId,
        week: e.week,
        size,
        observed: e.observed,
        normal: Math.round(e.expected),
      })
    }
  }
  const ranked = rankedFirst(state, markets)
  if (
    ranked &&
    focus &&
    ranked.segmentId !== focus.segmentId &&
    state.hidden.segments[ranked.segmentId]?.roleId === goodRoleId(state)
  ) {
    out.push({
      kind: 'went_against',
      rankedFirstSegmentId: ranked.segmentId,
      evidence: ranked.evidence,
      focusSegmentId: focus.segmentId,
      focusHours: focus.hours,
    })
  }
  return out
}

/**
 * The market the strongest evidence put strictly first: pre-sales when two or more markets had
 * one, else landing tests, else interviews. Null on a tie or without two markets to compare.
 */
function rankedFirst(
  state: GameState,
  markets: MarketTruth[],
): { segmentId: SegmentId; evidence: 'presale' | 'landing' | 'interviews' } | null {
  const ids = bucketIds(state)
  const tiers: ['presale' | 'landing' | 'interviews', (m: MarketTruth) => number | null][] = [
    ['presale', (m) => (m.presale ? m.presale.commits / m.presale.prospects : null)],
    ['landing', (m) => (m.landing ? m.landing.signups / m.landing.visitors : null)],
    [
      'interviews',
      (m) => {
        const ivs = interviewsOf(state.knowledge[m.segmentId] ?? [])
        return ivs.length
          ? ivs.reduce((t, iv) => t + ids.indexOf(iv.bucketId), 0) / ivs.length
          : null
      },
    ],
  ]
  for (const [evidence, score] of tiers) {
    const scored = markets.flatMap((m) => {
      const s = score(m)
      return s === null ? [] : [{ segmentId: m.segmentId, s }]
    })
    if (scored.length < 2) continue
    scored.sort((a, b) => b.s - a.s)
    if (scored[0]!.s === scored[1]!.s) return null
    return { segmentId: scored[0]!.segmentId, evidence }
  }
  return null
}

function experimentEvents(state: GameState): ExperimentEvent[] {
  return state.eventLog.flatMap((e) => (e.kind === 'landing' || e.kind === 'presale' ? [e] : []))
}

/** Visitors of a landing test or prospects of a pre-sale, from the evidence of that week. */
function experimentSize(state: GameState, e: ExperimentEvent): number {
  const ev = (state.knowledge[e.segmentId] ?? []).filter(
    (k) => k.kind === e.kind && k.week === e.week,
  )
  return ev.reduce(
    (t, k) => t + (k.kind === 'landing' ? k.visitors : k.kind === 'presale' ? k.prospects : 0),
    0,
  )
}

// ---------------------------------------------------------------------------
// 6. Luck

/** The rate the chances gave for one kind in one market over the run, 0 without tries. */
function normalRate(odds: OddsEvent[], kind: OddsEvent['odds'], segmentId: SegmentId | null) {
  const rows = odds.filter((o) => o.odds === kind && o.segmentId === segmentId)
  const tries = rows.reduce((t, o) => t + o.tries, 0)
  return tries > 0 ? rows.reduce((t, o) => t + o.expected, 0) / tries : 0
}

function buildLuck(state: GameState, cause: PostMortemCause): PostMortem['luck'] {
  const odds = state.eventLog.flatMap((e) => (e.kind === 'odds' ? [e] : []))
  const perMonth = state.scenario.finance.weeksPerMonth
  const price = state.company.priceCentsPerMonth
  const churnRates = state.scenario.segments.map((s) => normalRate(odds, 'churn', s.id))
  const churn = Math.max(...churnRates, 0)
  // A customer's worth: the price for as long as one usually stays, within half a run.
  const months = Math.min(state.scenario.maxWeeks / perMonth / 2, churn > 0 ? 1 / churn : Infinity)
  const customerCents = price * Math.max(1, months)
  const leadValue = (seg: SegmentId | null) => {
    const leads = state.leads.filter((l) => l.segmentId === seg && l.source !== 'presale')
    const won = leads.filter((l) => state.customers.some((c) => c.leadId === l.id))
    return leads.length > 0 ? won.length / leads.length : 0
  }
  const signupsPerLead = state.scenario.experiments.landing.signupsPerLead

  const groups = new Map<string, LuckItem>()
  const add = (
    key: string,
    base: Omit<LuckItem, 'customers' | 'cents'>,
    cents: number,
    customers: number,
  ) => {
    const g = groups.get(key)
    if (g) {
      g.tries += base.tries
      g.observed += base.observed
      g.expected += base.expected
      g.cents += cents
      g.customers += customers
    } else {
      groups.set(key, { ...base, cents, customers })
    }
  }
  for (const o of odds) {
    const diff = o.observed - o.expected
    const seg = o.segmentId
    let customers = 0
    let cents = 0
    switch (o.odds) {
      case 'trial':
        customers = diff
        break
      case 'demo':
        customers = diff * normalRate(odds, 'trial', seg)
        break
      case 'lead_demo':
        customers = diff * normalRate(odds, 'demo', seg) * normalRate(odds, 'trial', seg)
        break
      case 'leads':
        customers = diff * leadValue(seg)
        break
      case 'churn':
        customers = -diff
        break
      case 'never_pays':
        cents = -diff * o.unitCents
        customers = cents / customerCents
        break
      case 'message':
        cents = diff * o.unitCents
        customers = cents / customerCents
        break
    }
    add(
      `${o.odds}/${seg ?? ''}/${o.eventId ?? ''}`,
      {
        kind: o.odds,
        segmentId: seg,
        eventId: o.eventId,
        tries: o.tries,
        observed: o.observed,
        expected: o.expected,
        changedChoice: false,
      },
      Math.round(cents),
      customers,
    )
  }
  const experiments = experimentEvents(state)
  for (const e of experiments) {
    const diff = e.observed - e.expected
    const customers = e.kind === 'presale' ? diff : (diff / signupsPerLead) * leadValue(e.segmentId)
    add(
      `${e.kind}/${e.segmentId}/`,
      {
        kind: e.kind,
        segmentId: e.segmentId,
        eventId: null,
        tries: 1,
        observed: e.observed,
        expected: e.expected,
        changedChoice: false,
      },
      0,
      customers,
    )
  }
  // A week's tests across markets whose top market by result differs from the top by chances.
  const byWeek = new Map<string, ExperimentEvent[]>()
  for (const e of experiments) {
    const key = `${e.kind}/${e.week}`
    byWeek.set(key, [...(byWeek.get(key) ?? []), e])
  }
  for (const list of byWeek.values()) {
    if (list.length < 2) continue
    const rate = (e: ExperimentEvent, v: number) => v / Math.max(1, experimentSize(state, e))
    const top = (pick: (e: ExperimentEvent) => number) =>
      [...list].sort((a, b) => pick(b) - pick(a))[0]!.segmentId
    if (top((e) => rate(e, e.observed)) !== top((e) => rate(e, e.expected))) {
      for (const e of list) {
        const g = groups.get(`${e.kind}/${e.segmentId}/`)
        if (g) g.changedChoice = true
      }
    }
  }

  const all = [...groups.values()]
  const netCustomers = all.reduce((t, g) => t + g.customers, 0)
  const items = all
    .filter((g) => g.changedChoice || Math.abs(g.customers) >= LUCK_MIN_CUSTOMERS)
    .sort(
      (a, b) =>
        Number(b.changedChoice) - Number(a.changedChoice) ||
        Math.abs(b.customers) - Math.abs(a.customers),
    )
    .slice(0, LUCK_ITEMS)

  let averageWouldChange: boolean | null = null
  const swing = Math.abs(netCustomers) * price
  if (cause.id.startsWith('bankrupt') || cause.id === 'still_searching') {
    averageWouldChange =
      netCustomers < 0 && cause.peakRevenueCents + swing >= cause.monthlyCostsCents
  } else if (cause.id === 'sustainable') {
    averageWouldChange = netCustomers > 0 && cause.revenueCents - swing < cause.monthlyCostsCents
  }
  return { items, netCustomers, averageWouldChange }
}

// ---------------------------------------------------------------------------
// 7. Next time

/** Every suggestion whose rule matches, in the fixed order, ending with the fallback. */
function buildSuggestions(
  state: GameState,
  markets: MarketTruth[],
  focus: Focus | null,
  cause: PostMortemCause,
): SuggestionId[] {
  const viableRole = goodRoleId(state)
  const focusMarket = markets.find((m) => m.segmentId === focus?.segmentId) ?? null
  const focusViable = focusMarket?.roleId === viableRole
  // Deposits compare markets; sign ups and compliments cost nothing to give.
  const presold = markets.filter((m) => m.presale !== null).length
  const price = state.company.priceCentsPerMonth
  const hire = hireEconomics(state)
  const writtenOff = state.invoices.filter((i) => i.writtenOffWeek !== null).length
  const won = cause.id === 'sustainable'
  const rules: [SuggestionId, boolean][] = [
    ['compare_markets', focusMarket !== null && !focusViable && presold < 2],
    ['talk_more', focusMarket !== null && focusMarket.interviews < FEW_INTERVIEWS],
    ['watch_energy', cause.id === 'burnout'],
    [
      'listen_features',
      focusMarket !== null &&
        focusViable &&
        focusMarket.mustHave.some((f) => f.shippedWeek === null),
    ],
    ['check_price', focusMarket !== null && !won && price > focusMarket.wtpCents],
    ['watch_churn', cause.customersWon >= 2 && cause.customersLost * 2 >= cause.customersWon],
    [
      'hire_cost',
      hire !== null &&
        (hire.costPerCustomerCents === null ||
          hire.lifetimeValueCents === null ||
          hire.costPerCustomerCents > hire.lifetimeValueCents),
    ],
    ['chase_invoices', writtenOff >= WRITTEN_OFF_LESSON],
    ['raise_price', won && focusMarket !== null && price * 2 <= focusMarket.wtpCents],
    ['sooner', won],
  ]
  return [...rules.filter(([, hit]) => hit).map(([id]) => id), 'sample_sizes']
}
