import { z } from 'zod'

// Ids are lowercase snake case, for example `small_offices`.
const Id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'ids are lowercase snake case')
const Cents = z.number().int()
const Share = z.number().min(0).max(1)

const rangeOf = (value: z.ZodNumber) =>
  z.object({ min: value, max: value }).refine((r: { min: number; max: number }) => r.min <= r.max, {
    message: 'min must not exceed max',
  })

export const Range = rangeOf(z.number())
export const IntRange = rangeOf(z.number().int())
export const ShareRange = rangeOf(Share)

export const CHANNEL_IDS = ['cold_email', 'phone', 'in_person'] as const
export const Channel = z.enum(CHANNEL_IDS)

export const FixedCostSchema = z.object({
  id: Id,
  name: z.string().min(1),
  monthlyCents: Cents.nonnegative(),
})

export const SegmentSchema = z.object({
  id: Id,
  name: z.string().min(1),
  description: z.string().min(1),
  size: IntRange,
  wtpCents: IntRange,
  mustHave: z.array(Id).min(1),
  channelResponse: z.record(Channel, ShareRange),
  paymentDelayDaysMean: z.number().int().nonnegative(),
  neverPaysShare: Share,
  // Share of invoices that are only paid once the player chases them (the customer waits to be
  // asked). Unchased, they are written off like any unpaid invoice.
  waitsForChaseShare: Share,
  // What an interviewee says about money, now and then: rough, in the market's own words. Each
  // holds {amount}, a noisy, rounded figure around what the market would pay a month.
  budgetQuotes: z.array(z.string().refine((q) => q.includes('{amount}'), 'needs {amount}')).min(4),
})

// A role sets hidden pain and politeness. Roles are shuffled across segments per run.
export const RoleSchema = z.object({
  id: Id,
  pain: ShareRange,
  politeness: ShareRange,
})

// Interview buckets in ascending order. Every bucket except the last has an upper bound.
export const InterviewBucketSchema = z.object({
  id: Id,
  name: z.string().min(1),
  below: z.number().optional(),
})

export const InterviewConfigSchema = z.object({
  hours: z.number().int().positive(),
  noiseSd: z.number().nonnegative(),
  skillGain: z.number().nonnegative(),
  skillCap: Share,
  mentionBase: Share,
  mentionPerPain: Share,
  // Chance an interview includes a budget quote, and its noise: the amount is willingness to pay
  // times (1 + N(0, budgetNoiseSd)), kept within 0.4 to 1.8 times it, then rounded.
  budgetChance: Share,
  budgetNoiseSd: z.number().nonnegative(),
  buckets: z.array(InterviewBucketSchema).min(2),
})

export const SalesConfigSchema = z.object({
  // Leads from outreach: hours * channelResponse * (selling factor)
  sellingBase: z.number().nonnegative(),
  // Outreach hours on one channel in one market over the last saturationWeeks weeks (this week
  // included) beyond saturationHours per week find leads at saturatedFactor of the normal rate:
  // the easy contacts are used up for a while.
  saturationHours: z.number().nonnegative(),
  saturationWeeks: z.number().int().positive(),
  saturatedFactor: Share,
  // Weekly chance that a lead agrees to a demo: base * (offset + perPain * pain)
  leadToDemoBase: Share,
  leadToDemoOffset: Share,
  leadToDemoPerPain: Share,
  demoHours: z.number().int().positive(),
  // Following up with an open lead: its silence timer resets and it is a bit more likely to
  // ask for a demo this week (added to the weekly chance before the energy factor).
  followUpHours: z.number().int().positive(),
  followUpDemoBoost: Share,
  // Chance that a held demo becomes a trial: base + perFit * fit
  demoToTrialBase: Share,
  demoToTrialPerFit: Share,
  trialWeeks: z.number().int().positive(),
  ghostChancePerWeek: Share,
  silentWeeksToLose: z.number().int().positive(),
  skillGainPerDemo: z.number().nonnegative(),
  skillCap: Share,
  // How price changes a yes, by r = price / willingness to pay. The factor is
  // (1 + e^(-steepness * midpoint)) / (1 + e^(steepness * (r - midpoint))): 1 at a price of 0,
  // falling smoothly as r grows, about a half at the midpoint. It scales trials becoming
  // customers, landing page sign ups and pre-sale deposits.
  price: z.object({
    midpoint: z.number().positive(),
    steepness: z.number().positive(),
  }),
  // Monthly chance a customer leaves: base + perMisfit * (1 - fit) + perBug * bugs
  // + perPrice * max(0, r - priceFrom), with r the customer's own price / willingness to pay,
  // capped at cap.
  churn: z.object({
    base: Share,
    perMisfit: Share,
    perBug: Share,
    priceFrom: z.number().nonnegative(),
    perPrice: Share,
    cap: Share,
  }),
  // Referrals: every paying customer, every week, may bring one new lead in its own market with
  // chance max(0, chancePerFit * fit - chancePerBug * bugs). A referred lead's weekly chance to ask
  // for a demo is multiplied by (1 + demoBonus). All zero switches referrals off.
  referral: z.object({
    chancePerFit: Share,
    chancePerBug: Share,
    demoBonus: z.number().nonnegative(),
  }),
  // Long mode (Phase 9): a market runs out of new leads. Outreach response there is multiplied by
  // max(floor, 1 - leads found there so far / the market's reachable companies). Absent: off.
  marketSaturation: z.object({ floor: Share }).optional(),
})

export const LandingConfigSchema = z.object({
  hours: z.number().int().positive(),
  // The ad budgets the player can pick from. Visitors = budget / centsPerVisitor.
  budgetsCents: z.array(Cents.positive()).min(1),
  centsPerVisitor: Cents.positive(),
  weeks: z.number().int().positive(),
  // Each visitor signs up with probability (signupBase + signupPerPain * pain) * priceFactor,
  // at the price shown on the page.
  signupBase: Share,
  signupPerPain: Share,
  // Every this many sign ups become one open lead when the result comes in.
  signupsPerLead: z.number().int().positive(),
})

export const PresaleConfigSchema = z.object({
  hoursPerBatch: z.number().int().positive(),
  // Cold prospects pitched per batch. No leads needed.
  batchSize: z.number().int().positive(),
  weeks: z.number().int().positive(),
  // Each prospect pays a deposit of one month with probability commitRate * pain * priceFactor.
  commitRate: Share,
  // Batches allowed per market over the whole run.
  maxBatchesPerSegment: z.number().int().positive(),
  // A deposit becomes a paying customer once the market's must haves have shipped. If they have
  // not shipped this many weeks after the deposit, it is refunded and the prospect is lost.
  refundWeeks: z.number().int().positive(),
})

export const FinanceConfigSchema = z.object({
  weeksPerMonth: z.number().int().positive(),
  // Invoices are due this many days after they are issued.
  invoiceDueDays: z.number().int().positive(),
  // An unpaid invoice is written off this many weeks after its due week.
  writeOffWeeks: z.number().int().positive(),
  chaseHours: z.number().int().positive(),
  // Chance that chasing an overdue invoice gets it paid in the following week.
  chaseBoost: Share,
})

export const ROLE_IDS = ['developer', 'salesperson'] as const
export const TeamRoleId = z.enum(ROLE_IDS)
export type TeamRoleId = z.infer<typeof TeamRoleId>

export const TeamRoleSchema = z.object({
  name: z.string().min(1),
  monthlyCents: Cents.positive(),
  // Developer: build hours. Salesperson: outreach and demo hours. Multiplied by true skill.
  weeklyHours: z.number().int().positive(),
  skill: rangeOf(z.number().positive()),
  // Selling skill of their own outreach. Without it, outreach uses the founder's skill.
  selling: Share.optional(),
  // Long mode: the same role part time, offered beside the full time one. Absent: one kind only.
  partTime: z
    .object({ monthlyCents: Cents.positive(), weeklyHours: z.number().int().positive() })
    .optional(),
})

/**
 * A freelancer rented by the week (Phase 9). Output is fixed and visible: `outputShare` of the
 * booked hours become build or outreach hours, the first working week of a booking at
 * `onboardingFactor` of that. Billed weekly at `centsPerHour` for every booked hour. Ending a
 * booking takes effect after `noticeWeeks` more weeks. No hidden values and no random draws.
 */
export const FreelanceRoleSchema = z.object({
  name: z.string().min(1),
  centsPerHour: Cents.nonnegative(),
  // Selling skill of the salesperson's outreach. Without it, outreach uses the founder's skill.
  selling: Share.optional(),
})

export const FreelanceConfigSchema = z.object({
  hoursOptions: z.array(z.number().int().positive()).min(1),
  outputShare: Share,
  onboardingFactor: Share,
  noticeWeeks: z.number().int().nonnegative(),
  // Extra bugs when a feature a freelance developer worked on ships.
  extraBugsPerFeature: z.number().int().nonnegative(),
  roles: z.object({ developer: FreelanceRoleSchema, salesperson: FreelanceRoleSchema }),
  names: z.array(z.string().min(1)).min(1),
})

export const TeamConfigSchema = z.object({
  searchHours: z.number().int().positive(),
  searchWeeks: z.number().int().positive(),
  candidates: z.number().int().positive(),
  // Weeks between the offer and the first working week.
  startWeeks: z.number().int().nonnegative(),
  // Letting someone go costs this many weeks of salary.
  severanceWeeks: z.number().int().nonnegative(),
  // Interview impression = true skill + N(0, impressionSd), shown as a label.
  impressionSd: z.number().nonnegative(),
  impressions: z.array(InterviewBucketSchema).min(2),
  roles: z.object({ developer: TeamRoleSchema, salesperson: TeamRoleSchema }),
  candidateNames: z.array(z.string().min(1)).min(1),
  freelance: FreelanceConfigSchema,
  // Long mode (Phase 9). People working at once, and hires over the whole run, both 1 when absent:
  // the early MVP's one hire. Founder hours each working member takes a week, 0 when absent.
  maxMembers: z.number().int().positive().optional(),
  maxHires: z.number().int().positive().optional(),
  managementHoursPerMember: z.number().int().nonnegative().optional(),
})

export const InboxConfigSchema = z.object({
  // Most new messages per week, and the chance that each slot is filled if an event is eligible.
  maxPerWeek: z.number().int().positive(),
  drawChance: Share,
  // Weeks a message stays open, counting the week it arrives.
  openWeeks: z.number().int().positive(),
  // While fewer than this many messages are open, a week with no new message draws one anyway.
  guaranteeBelowOpen: z.number().int().nonnegative(),
  // A repeatable event does not come back within this many weeks.
  cooldownWeeks: z.number().int().nonnegative(),
  // No new messages while this many are still open.
  openLimit: z.number().int().positive(),
})

// Conditions are `<path> <op> <number>`, from a closed set of paths. No eval anywhere.
export const CONDITION_PATHS = [
  'week',
  'customers.count',
  'customers.won',
  'customers.churned',
  'leads.open',
  'leads.waitingForDemo',
  'invoices.open',
  'invoices.overdueDays',
  'cashEur',
  'savingsEur',
  'energy',
  'bugs',
  'quality',
  'features.shipped',
  'hasHire',
  'monthlyRevenueEur',
] as const
export type ConditionPath = (typeof CONDITION_PATHS)[number]
export const CONDITION_OPS = ['>=', '<=', '>', '<', '==', '!='] as const
export type ConditionOp = (typeof CONDITION_OPS)[number]
export type Condition = { path: ConditionPath; op: ConditionOp; value: number }

/** Parses `customers.count >= 1`. Returns null for anything outside the closed grammar. */
export function parseCondition(text: string): Condition | null {
  const m = /^\s*([A-Za-z.]+)\s*(>=|<=|==|!=|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/.exec(text)
  if (!m) return null
  const path = m[1] as ConditionPath
  if (!(CONDITION_PATHS as readonly string[]).includes(path)) return null
  return { path, op: m[2] as ConditionOp, value: Number(m[3]) }
}

const ConditionSchema = z.string().transform((text, ctx): Condition => {
  const c = parseCondition(text)
  if (!c) {
    ctx.addIssue({ code: 'custom', message: `unknown condition "${text}"` })
    return z.NEVER
  }
  return c
})

// Effects are a closed union. Adding a type means adding it here and in the engine.
// `chance` (default 1) makes an effect succeed only some of the time. `when` (default none) makes
// it happen only if the conditions hold when the week ends, so an answer can pay off in one
// situation and be wasted in another.
const Chance = Share.default(1)
const EffectWhen = z.array(ConditionSchema).default([])
const fx = { chance: Chance, when: EffectWhen }
export const EffectSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('cash'), amountCents: Cents, ...fx }),
  z.object({ type: z.literal('energy'), delta: z.number(), ...fx }),
  z.object({ type: z.literal('bugs'), delta: z.number().int(), ...fx }),
  z.object({
    type: z.literal('skill'),
    skill: z.enum(['interviewing', 'selling']),
    delta: z.number(),
    ...fx,
  }),
  // Overdue invoices of the sender get paid in the following week with this chance.
  z.object({ type: z.literal('invoicePayChance'), delta: Share, ...fx }),
  // The sender (a customer) leaves with this chance.
  z.object({ type: z.literal('churnChance'), delta: Share, ...fx }),
  // New leads in the sender's segment, else a random one.
  z.object({ type: z.literal('newLeads'), count: z.number().int().positive(), ...fx }),
  // The sender (a lead) answers again.
  z.object({ type: z.literal('touchLead'), ...fx }),
  // Hours taken out of next week.
  z.object({ type: z.literal('lostHours'), hours: z.number().int().positive(), ...fx }),
  // Moves the company to one of the scenario's office stages: its monthly cost and its lasting
  // effects (energy each week, outreach response by channel) replace the previous stage's.
  z.object({ type: z.literal('moveOffice'), stage: Id, ...fx }),
  z.object({
    type: z.literal('fixedCost'),
    id: Id,
    name: z.string().min(1),
    monthlyCents: Cents.positive(),
    ...fx,
  }),
])
export type Effect = z.infer<typeof EffectSchema>

export const EVENT_AREAS = ['validation', 'sales', 'product', 'finance', 'founder', 'team'] as const
export type EventArea = (typeof EVENT_AREAS)[number]

export const EventChoiceSchema = z.object({
  id: Id,
  label: z.string().min(1),
  hours: z.number().int().nonnegative(),
  effects: z.array(EffectSchema).default([]),
})

export const MESSAGE_LOOKS = ['letter', 'note', 'official'] as const
export type MessageLook = (typeof MESSAGE_LOOKS)[number]

export const EventSchema = z.object({
  id: Id,
  area: z.enum(EVENT_AREAS),
  weight: z.number().positive(),
  once: z.boolean().default(false),
  // Weeks before a repeatable event can come back, instead of the inbox cooldown.
  cooldownWeeks: z.number().int().nonnegative().optional(),
  when: z.array(ConditionSchema).default([]),
  // Arrives for sure, without a draw, in the first week any of these holds (and `when` holds).
  // Such an event never comes through the random draw.
  trigger: z.array(ConditionSchema).default([]),
  // Who the message is from. A customer or lead is a real one, picked when the message arrives.
  from: z.enum(['none', 'customer', 'lead']).default('none'),
  // The sender's role, shown with their name. For `none` it is the whole sender.
  sender: z.string().min(1),
  // How the message looks on the desk: a letter, a sticky note, or an official letter.
  look: z.enum(MESSAGE_LOOKS).default('letter'),
  text: z.string().min(1),
  // The choice taken when the message expires unanswered. It costs no hours.
  defaultChoice: Id,
  choices: z.array(EventChoiceSchema).min(2),
})
export type ScenarioEvent = z.infer<typeof EventSchema>
export type EventChoice = z.infer<typeof EventChoiceSchema>
export const EVENT_PLACEHOLDERS = ['name'] as const

export const INTRO_PLACEHOLDERS = ['cash', 'savings', 'living', 'livingMonth', 'maxWeeks'] as const
export const NOTE_PLACEHOLDERS = ['week', 'n', 'living'] as const

// The engine picks one of these by rule, so every id must have text.
export const FOUNDER_NOTE_IDS = [
  'first_week',
  'no_evidence',
  'only_interviews',
  'built_unseen',
  'leads_only',
] as const
export type FounderNoteId = (typeof FOUNDER_NOTE_IDS)[number]

export const IntroCardSchema = z.object({
  id: Id,
  title: z.string().min(1),
  body: z.string().min(1),
})

export const FeatureSchema = z.object({
  id: Id,
  name: z.string().min(1),
  buildHours: z.number().int().positive(),
  bugsOnShip: IntRange,
  // What an interviewee says when they ask for this feature in their own words.
  mention: z.string().min(1),
})

export const CompanyNamePartsSchema = z.object({
  first: z.array(z.string().min(1)).min(1),
  second: z.array(z.string().min(1)).min(1),
  // The word that tells the segment's companies apart. Two open leads never share it.
  distinct: z.enum(['first', 'second']).default('first'),
})

/** Every company name a segment's word lists can produce, in list order. */
export function companyNameCombinations(parts: { first: string[]; second: string[] }): string[] {
  return parts.first.flatMap((a) => parts.second.map((b) => `${a} ${b}`))
}

/**
 * A milestone (plan section 4.12). Counts and weeks name their target; revenue milestones name the
 * costs they cover, so their threshold is the run's own monthly costs at the time: company costs
 * (fixed costs, salary included) or all costs (those plus the founder's living costs).
 * `onBar: false` keeps a milestone off the progress bar (it may never happen, such as a hire).
 */
const MilestoneBase = { id: Id, name: z.string().min(1), onBar: z.boolean().default(true) }
export const MilestoneSchema = z.discriminatedUnion('kind', [
  z.object({
    ...MilestoneBase,
    kind: z.literal('count'),
    of: z.enum(['interviews', 'deposits', 'customers', 'hires']),
    target: z.number().int().positive(),
  }),
  z.object({ ...MilestoneBase, kind: z.literal('revenue'), covers: z.enum(['company', 'all']) }),
  z.object({ ...MilestoneBase, kind: z.literal('weeks'), target: z.number().int().positive() }),
])
export type Milestone = z.infer<typeof MilestoneSchema>

/** Where the company works. The first stage is the start; the others come through events. */
export const OfficeStageSchema = z.object({
  id: Id,
  name: z.string().min(1),
  monthlyCents: Cents.nonnegative(),
  // Energy gained every week while working here.
  energyPerWeek: z.number().default(0),
  // Outreach response is multiplied by this per channel while working here.
  channelFactors: z.partialRecord(Channel, z.number().positive()).default({}),
  // Leads that walk in from the people around you: from one market, at this mean rate per week.
  walkIns: z.object({ segment: Id, leadsPerWeek: z.number().positive() }).optional(),
})
export type OfficeStage = z.infer<typeof OfficeStageSchema>

/** The run lengths a scenario can be played in. `standard` is the 60 week game. */
export const GAME_MODES = ['standard', 'long'] as const
export type GameMode = (typeof GAME_MODES)[number]

export const ScenarioFileSchema = z.object({
  id: Id,
  name: z.string().min(1),
  // Set only on a scenario resolved for long mode (`loadScenario(id, 'long')`).
  mode: z.literal('long').optional(),
  maxWeeks: z.number().int().positive(),
  // Profitable in each of this many last months wins the run at maxWeeks. 2 when absent.
  win: z.object({ profitableMonths: z.number().int().positive() }).optional(),
  start: z.object({
    cashCents: Cents,
    savingsCents: Cents,
    livingCostCentsPerWeek: Cents.nonnegative(),
    priceCentsPerMonth: Cents.positive(),
    energy: z.number().min(0),
    skills: z.object({ interviewing: Share, selling: Share }),
    fixedCosts: z.array(FixedCostSchema),
  }),
  founder: z.object({
    baseHoursPerWeek: z.number().int().positive(),
    maxHoursPerWeek: z.number().int().positive(),
    energy: z.object({
      max: z.number().positive(),
      perHourOverBase: z.number(),
      perRestHour: z.number(),
      weekWithinBase: z.number(),
      // Sales chances are multiplied by 1 from fullAt energy up, falling in a straight line to
      // lowFactor at lowBelow, and by lowFactor below that.
      fullAt: z.number().nonnegative(),
      lowBelow: z.number().nonnegative(),
      lowFactor: Share,
      // Weeks in a row at 0 energy that end the run with burnout.
      burnoutWeeks: z.number().int().positive(),
    }),
    // Long mode: living costs per week from a week on, in order. Absent: they never change.
    livingSteps: z
      .array(z.object({ week: z.number().int().positive(), centsPerWeek: Cents.nonnegative() }))
      .optional(),
  }),
  finance: FinanceConfigSchema,
  experiments: z.object({
    interview: InterviewConfigSchema,
    landing: LandingConfigSchema,
    presale: PresaleConfigSchema,
  }),
  team: TeamConfigSchema,
  inbox: InboxConfigSchema,
  product: z.object({
    startQuality: z.number().min(0).max(100),
    // quality = startQuality - qualityPerBug * bugs, never below 0
    qualityPerBug: z.number().nonnegative(),
    fixHoursPerBug: z.number().int().positive(),
    // fit = pain * coverage * (fitBase + fitPerQuality * quality / 100)
    fitBase: Share,
    fitPerQuality: Share,
  }),
  sales: SalesConfigSchema,
  roles: z.array(RoleSchema).min(1),
  segments: z.array(SegmentSchema).min(1),
  milestones: z.array(MilestoneSchema).min(1),
  officeStages: z.array(OfficeStageSchema).min(1),
  // The UI turns organised at the first of these milestones.
  organisedAt: z.array(Id).min(1),
})

// segment id -> bucket id -> quotes
export const InterviewQuotesSchema = z.record(Id, z.record(Id, z.array(z.string().min(1)).min(1)))

export const ScenarioSchema = ScenarioFileSchema.extend({
  features: z.array(FeatureSchema).min(1),
  events: z.array(EventSchema),
  interviewQuotes: InterviewQuotesSchema,
  // segment id -> two word lists; a lead's name is one word from each, joined by a space
  companyNames: z.record(Id, CompanyNamePartsSchema),
  intro: z.object({ cards: z.array(IntroCardSchema).min(1) }),
  founderNotes: z.object({
    first_week: z.string().min(1),
    no_evidence: z.string().min(1),
    only_interviews: z.string().min(1),
    built_unseen: z.string().min(1),
    leads_only: z.string().min(1),
  }),
  // Post-mortem lines that depend on the scenario's design. `weakLanding`: said for every market
  // that had a landing test, in a scenario whose audience rarely answers adverts. Absent when the
  // landing signal is not weak by design.
  postMortemNotes: z.object({ weakLanding: z.string().min(1).optional() }).optional(),
}).superRefine((s, ctx) => {
  const issue = (message: string, path: (string | number)[]) =>
    ctx.addIssue({ code: 'custom', message, path })

  const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i)
  for (const id of dupes(s.segments.map((x) => x.id)))
    issue(`duplicate segment ${id}`, ['segments'])
  for (const id of dupes(s.features.map((x) => x.id)))
    issue(`duplicate feature ${id}`, ['features'])
  for (const id of dupes(s.roles.map((x) => x.id))) issue(`duplicate role ${id}`, ['roles'])
  for (const id of dupes(s.milestones.map((x) => x.id))) {
    issue(`duplicate milestone ${id}`, ['milestones'])
  }
  const milestoneIds = new Set(s.milestones.map((m) => m.id))
  for (const id of s.organisedAt) {
    if (!milestoneIds.has(id)) issue(`unknown milestone ${id}`, ['organisedAt'])
  }
  const stageIds = new Set(s.officeStages.map((o) => o.id))
  s.officeStages.forEach((o, i) => {
    if (o.walkIns && !s.segments.some((x) => x.id === o.walkIns!.segment)) {
      issue(`unknown segment ${o.walkIns.segment}`, ['officeStages', i, 'walkIns', 'segment'])
    }
  })
  s.events.forEach((e, i) => {
    e.choices.forEach((c, j) =>
      c.effects.forEach((f, k) => {
        if (f.type === 'moveOffice' && !stageIds.has(f.stage)) {
          issue(`unknown office stage ${f.stage}`, ['events', i, 'choices', j, 'effects', k])
        }
      }),
    )
    if (e.trigger.length > 0 && !e.once) issue('a triggered event must be once', ['events', i])
  })

  if (s.roles.length !== s.segments.length) {
    issue('there must be exactly one role per segment', ['roles'])
  }
  if (s.founder.maxHoursPerWeek < s.founder.baseHoursPerWeek) {
    issue('maxHoursPerWeek must be at least baseHoursPerWeek', ['founder', 'maxHoursPerWeek'])
  }
  if (s.start.energy > s.founder.energy.max) {
    issue('start energy exceeds max', ['start', 'energy'])
  }

  const featureIds = new Set(s.features.map((f) => f.id))
  s.segments.forEach((seg, i) => {
    for (const f of seg.mustHave) {
      if (!featureIds.has(f)) issue(`unknown feature ${f}`, ['segments', i, 'mustHave'])
    }
  })

  const buckets = s.experiments.interview.buckets
  buckets.forEach((b, i) => {
    const last = i === buckets.length - 1
    if (last && b.below !== undefined) {
      issue('the last bucket has no upper bound', ['experiments', 'interview', 'buckets', i])
    }
    if (!last && b.below === undefined) {
      issue('only the last bucket may omit its upper bound', [
        'experiments',
        'interview',
        'buckets',
        i,
      ])
    }
    const prev = buckets[i - 1]?.below
    if (b.below !== undefined && prev !== undefined && b.below <= prev) {
      issue('bucket bounds must ascend', ['experiments', 'interview', 'buckets', i])
    }
  })

  if (!s.intro.cards.some((c) => c.id === 'goal')) {
    issue('the intro needs a card with id goal, the help screen reopens it', ['intro', 'cards'])
  }
  for (const id of dupes(s.intro.cards.map((c) => c.id))) {
    issue(`duplicate intro card ${id}`, ['intro', 'cards'])
  }
  // Placeholders: {name} or {name:eur}. Only names the UI and engine fill are allowed.
  const checkText = (text: string, allowed: readonly string[], path: (string | number)[]) => {
    for (const m of text.matchAll(/\{([^}]*)\}/g)) {
      const [name, format] = (m[1] ?? '').split(':')
      if (!name || !allowed.includes(name) || (format !== undefined && format !== 'eur')) {
        issue(`unknown placeholder {${m[1]}}`, path)
      }
    }
  }
  s.intro.cards.forEach((c, i) => {
    checkText(c.title, [], ['intro', 'cards', i, 'title'])
    checkText(c.body, INTRO_PLACEHOLDERS, ['intro', 'cards', i, 'body'])
  })
  for (const [id, text] of Object.entries(s.founderNotes)) {
    checkText(text, NOTE_PLACEHOLDERS, ['founderNotes', id])
  }

  for (const id of dupes(s.events.map((e) => e.id))) issue(`duplicate event ${id}`, ['events'])
  s.events.forEach((e, i) => {
    const at = (...rest: (string | number)[]) => ['events', i, ...rest]
    checkText(e.text, EVENT_PLACEHOLDERS, at('text'))
    if (e.from === 'none' && e.text.includes('{name}')) {
      issue('{name} needs a sender that is a customer or a lead', at('text'))
    }
    // Runs are long enough to exhaust a small pool, so repeats must be chosen on purpose.
    if (!e.once && e.cooldownWeeks === undefined) {
      issue('an event must be once, or recur on purpose with its own cooldownWeeks', at('once'))
    }
    const choice = e.choices.find((c) => c.id === e.defaultChoice)
    if (!choice) issue(`unknown default choice ${e.defaultChoice}`, at('defaultChoice'))
    else if (choice.hours > 0) issue('the default choice must cost no hours', at('defaultChoice'))
    for (const id of dupes(e.choices.map((c) => c.id)))
      issue(`duplicate choice ${id}`, at('choices'))
    e.choices.forEach((c, j) => {
      for (const fx of c.effects) {
        if (
          (fx.type === 'invoicePayChance' || fx.type === 'churnChance') &&
          e.from !== 'customer'
        ) {
          issue(`${fx.type} needs a customer sender`, at('choices', j, 'effects'))
        }
        if (fx.type === 'touchLead' && e.from !== 'lead') {
          issue('touchLead needs a lead sender', at('choices', j, 'effects'))
        }
      }
    })
  })
  const impressions = s.team.impressions
  impressions.forEach((b, i) => {
    const last = i === impressions.length - 1
    if (last !== (b.below === undefined)) {
      issue('only the last impression has no upper bound', ['team', 'impressions', i])
    }
  })

  const allNames = Object.values(s.companyNames).flatMap(companyNameCombinations)
  for (const name of new Set(dupes(allNames))) {
    issue(`duplicate company name ${name}`, ['companyNames'])
  }
  for (const seg of s.segments) {
    if (!s.companyNames[seg.id]) issue(`no company names for ${seg.id}`, ['companyNames'])
  }
  for (const segId of Object.keys(s.companyNames)) {
    if (!s.segments.some((x) => x.id === segId)) {
      issue(`company names for unknown segment ${segId}`, ['companyNames'])
    }
  }

  const segmentIds = new Set(s.segments.map((x) => x.id))
  const bucketIds = new Set(buckets.map((b) => b.id))
  for (const [segId, byBucket] of Object.entries(s.interviewQuotes)) {
    if (!segmentIds.has(segId)) issue(`quotes for unknown segment ${segId}`, ['interviewQuotes'])
    for (const bucketId of Object.keys(byBucket)) {
      if (!bucketIds.has(bucketId)) {
        issue(`quotes for unknown bucket ${bucketId}`, ['interviewQuotes', segId])
      }
    }
  }
  for (const seg of s.segments) {
    for (const b of buckets) {
      if (!s.interviewQuotes[seg.id]?.[b.id]?.length) {
        issue(`no quotes for ${seg.id}/${b.id}`, ['interviewQuotes'])
      }
    }
  }
})

export type Scenario = z.infer<typeof ScenarioSchema>
export type ScenarioSegment = Scenario['segments'][number]
export type ScenarioRole = Scenario['roles'][number]
export type ScenarioFeature = Scenario['features'][number]
export type InterviewBucket = Scenario['experiments']['interview']['buckets'][number]
export type IntroCard = z.infer<typeof IntroCardSchema>
export type SalesConfig = z.infer<typeof SalesConfigSchema>
export type ChannelId = z.infer<typeof Channel>
export type TeamRole = z.infer<typeof TeamRoleSchema>
export type NumberRange = z.infer<typeof Range>
export type FreelanceConfig = z.infer<typeof FreelanceConfigSchema>
