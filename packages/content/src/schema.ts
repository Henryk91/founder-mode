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
  // Rounding step for budget amounts under 200 EUR (tourism prices per person). Absent: 50 EUR.
  budgetSmallStepCents: z.number().int().positive().optional(),
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
  // Long mode: landing page tests a market may have over the run, so money cannot buy leads
  // without limit. Absent: no limit.
  maxTestsPerSegment: z.number().int().positive().optional(),
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

/**
 * A funding round type (Phase 9 Part D, long mode). Raising is a pipeline: `prepHours` once when
 * the round starts, a first meeting for every `pitchHoursPerMeeting` of pitching (the meeting
 * included),
 * a second look (`secondLookHours`) with an interested investor, a term sheet open for
 * `termSheetWeeks`, then `closingWeeks` (with `dueDiligenceHours` in the first) until the money
 * arrives. The bar is public: `barMonthlyCents` of monthly revenue scores 1 before growth.
 */
export const RoundConfigSchema = z.object({
  name: z.string().min(1),
  prepHours: z.number().int().nonnegative(),
  pitchHoursPerMeeting: z.number().int().positive(),
  secondLookHours: z.number().int().nonnegative(),
  termSheetWeeks: z.number().int().positive(),
  closingWeeks: z.number().int().positive(),
  dueDiligenceHours: z.number().int().nonnegative(),
  barMonthlyCents: Cents.positive(),
  // The bar as investors state it, shown in the round's description.
  barText: z.string().min(1),
  amountCents: rangeOf(Cents.positive()),
  // Pre-money valuation: the larger of the floor and this multiple of yearly revenue.
  preMoneyFloorCents: Cents.positive(),
  revenueMultiple: z.number().positive(),
  // A growth milestone in the terms: monthly revenue this many times that at signing, within weeks.
  milestone: z
    .object({ multiple: z.number().positive(), weeks: z.number().int().positive() })
    .optional(),
  // Withdrawn in due diligence when monthly revenue fell by more than this share since the offer.
  withdrawDrop: Share.optional(),
  investors: z.array(z.string().min(1)).min(1),
})

export const FundingConfigSchema = z.object({
  rounds: z.object({ angel: RoundConfigSchema, seed: RoundConfigSchema }),
  // Hidden appetite of each investor: the score they need, uniform in this range.
  appetite: rangeOf(z.number().positive()),
  noiseSd: z.number().nonnegative(),
  // Score = (monthly revenue / the round's bar) ^ scoreExponent x growth x pitch x noise.
  scoreExponent: z.number().positive(),
  pitchBase: z.number().nonnegative(),
  pitchPerSelling: z.number().nonnegative(),
  growthWeight: z.number().nonnegative(),
  growthFactor: rangeOf(z.number().positive()),
  // Below this growth over 12 weeks a low score passes as "growth is flat".
  flatGrowth: z.number(),
  // Hard reasons to pass, before the score.
  runwayMarginWeeks: z.number().int().nonnegative(),
  churnShare: Share,
  focusShare: Share,
  // Investor updates at each month end, and the hidden confidence they move.
  updates: z.object({
    properHours: z.number().int().nonnegative(),
    shortHours: z.number().int().nonnegative(),
    proper: z.number(),
    short: z.number(),
    none: z.number(),
    revenueUp: z.number(),
    revenueDown: z.number(),
    milestoneMissed: z.number(),
  }),
  startConfidence: Share,
  // Investors already on board shape the next round: their mood scales the appetite of its
  // investors (pleased introduce you, worried warn them).
  followOnAppetite: z.object({ pleased: z.number().positive(), worried: z.number().positive() }),
  // Mood shown to the player: worried below the first, pleased from the second.
  moodAt: z.object({ patient: Share, pleased: Share }),
  // The visible value rule for ownership: this multiple of yearly revenue plus cash.
  valueRevenueMultiple: z.number().nonnegative(),
  // The "Growing" ending for a run that raised money: runway at the last 4 weeks' burn, and
  // growth of monthly revenue over the last 13 weeks.
  growing: z.object({ runwayMonths: z.number().positive(), quarterGrowth: z.number() }),
})
export type FundingConfig = z.infer<typeof FundingConfigSchema>
export type RoundConfig = z.infer<typeof RoundConfigSchema>
export const ROUND_IDS = ['angel', 'seed'] as const
export type RoundId = (typeof ROUND_IDS)[number]

/**
 * Tourism (step 4): bookings of capacity that expires, instead of subscriptions. Read with
 * `docs/tourism-proposal.md`; section numbers below refer to it. Absent: the subscription model.
 */
export const WEATHER_STATES = ['good', 'mixed', 'bad', 'dangerous'] as const
export type WeatherState = (typeof WEATHER_STATES)[number]
const PerWeather = z.object({
  good: z.number().nonnegative(),
  mixed: z.number().nonnegative(),
  bad: z.number().nonnegative(),
  dangerous: z.number().nonnegative(),
})
/** Twelve monthly values, January first. */
const Monthly = z.array(z.number().nonnegative()).length(12)

export const BookingSegmentSchema = z.object({
  // Requests per week at the peak of the season, drawn per run (hidden), in booking units.
  base: rangeOf(z.number().nonnegative()),
  // What one unit is, for the screen: a person, a group, a cover, a room night.
  unit: z.enum(['person', 'group', 'cover', 'night']),
  // Starting price per unit, in peak and off season months.
  price: z.object({ peak: Cents.positive(), off: Cents.positive() }),
  // Units per request.
  size: IntRange,
  // Weeks between the request and the week it books.
  leadWeeks: IntRange,
  // The season's shape, a multiplier per month (section 2).
  season: Monthly,
  // How well each channel reaches this segment (section 5).
  response: z.object({
    platform: Share,
    website: Share,
    partnership: Share,
    outreach: Share,
    walkIn: Share,
  }),
  // Chance a booking cancels, before the weather's factor.
  cancel: Share,
  // Share of requests a strict policy still converts, against a flexible one.
  strictConversion: Share,
  // Whether the weather moves its demand and cancellations.
  weatherSensitive: z.boolean().default(false),
  // Business customers get an invoice through the invoice system; others pay on the day.
  invoiced: z.boolean().default(false),
  // How much reviews move its demand (section 5).
  reviewWeight: z.number().nonnegative(),
})

export const BookingProductSchema = z.object({
  // Units a week it can sell when fully staffed (seats x seatings, rooms x nights).
  capacity: z.number().int().nonnegative(),
  // Segments it sells to.
  serves: z.array(Id).default([]),
  oneOffCents: Cents.nonnegative().default(0),
  monthlyCents: Cents.nonnegative().default(0),
  unitCostCents: Cents.nonnegative().default(0),
  // Months it runs in (1 to 12); empty means all year.
  months: z.array(z.number().int().min(1).max(12)).default([]),
  // Cannot run in dangerous weather unless the alternative product has shipped.
  weatherClosed: z.boolean().default(false),
  alternative: Id.optional(),
})

export const StaffRoleSchema = z.object({
  name: z.string().min(1),
  centsPerShift: Cents.nonnegative(),
  // Units of each product one shift can serve.
  units: z.record(Id, z.number().nonnegative()),
  // Most shifts a week that can be booked, per month (scarce in peak for freelance guides).
  available: Monthly,
  // The founder can take shifts in this role, each costing this many hours of their week.
  founderHours: z.number().int().positive().optional(),
})

// The bank loan (step 6, docs/loan-proposal.md): a business plan in hours, an application judged
// on visible numbers, an offer at a rate drawn per run, monthly repayments, default.
export const LoanConfigSchema = z.object({
  bankName: z.string().min(1),
  // Founder hours for the business plan, then for the meeting with the bank.
  planHours: z.number().int().positive(),
  meetingHours: z.number().int().nonnegative(),
  // Weeks from the application to the answer, and before a refused founder may apply again.
  decisionWeeks: z.number().int().positive(),
  retryWeeks: z.number().int().nonnegative(),
  // Own money put in, against own money plus all borrowing, at least this share.
  ownShare: Share,
  // The ceiling: this before any guest has paid, then the larger of it and this multiple of the
  // last four weeks' revenue times twelve; never above maxCents.
  unprovenMaxCents: Cents.positive(),
  revenueMultiple: z.number().nonnegative(),
  minCents: Cents.positive(),
  maxCents: Cents.positive(),
  stepCents: Cents.positive(),
  // Fixed yearly rate in basis points, drawn once per run in this range.
  rateBp: rangeOf(z.number().int().positive()),
  termMonths: z.array(z.number().int().positive()).min(1),
  graceMonths: z.array(z.number().int().nonnegative()).min(1),
  // A missed payment adds this fee to the balance; the second missed month in a row is default.
  missedFeeCents: Cents.nonnegative(),
  earlyFeeShare: Share,
  maxLoans: z.number().int().positive(),
})
export type LoanConfig = z.infer<typeof LoanConfigSchema>

export const BookingsConfigSchema = z.object({
  startWeekOfYear: z.number().int().min(1).max(52),
  seasonNoise: Share,
  // Months that use the peak price (others use the off season price).
  peakMonths: z.array(z.number().int().min(1).max(12)),
  // Weeks a cancellation policy must stay before it can change.
  policyWeeks: z.number().int().positive(),
  weather: z.object({
    // Chance of good, mixed, bad and dangerous weather per month.
    monthly: z.array(PerWeather).length(12),
    forecastAccuracy: Share,
    demand: PerWeather,
    cancel: PerWeather,
  }),
  platform: z.object({ name: z.string().min(1), commission: Share }),
  // The product that is the own website, and repeat guests at which it reaches full strength.
  website: z.object({ product: Id, repeatsFull: z.number().positive() }),
  // Founder hours that set up a partnership with a segment's partners, once.
  partnershipHours: z.number().int().nonnegative(),
  partnershipCut: Share,
  // Outreach hours a week that reach a segment fully.
  outreachHoursFull: z.number().positive(),
  reachCap: z.number().positive(),
  roleFactor: z.object({ viable: z.number(), mediocre: z.number(), trap: z.number() }),
  fitBase: Share,
  segments: z.record(Id, BookingSegmentSchema),
  products: z.record(Id, BookingProductSchema),
  roles: z.record(Id, StaffRoleSchema),
  reviews: z.object({
    qualityBase: z.number(),
    noiseSd: z.number().nonnegative(),
    understaffPenalty: z.number().nonnegative(),
    tiredPenalty: z.number().nonnegative(),
    cancelPenalty: z.number().nonnegative(),
    snagPenalty: z.number().nonnegative(),
    valueWeight: z.number().nonnegative(),
    reviewsPerUnit: z.number().nonnegative(),
    reviewsFull: z.number().positive(),
  }),
})
export type BookingsConfig = z.infer<typeof BookingsConfigSchema>
export type BookingSegment = z.infer<typeof BookingSegmentSchema>
export type BookingProduct = z.infer<typeof BookingProductSchema>
export type StaffRole = z.infer<typeof StaffRoleSchema>

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
  // Funding (long mode): rounds closed, the investors' mood (0 worried, 1 patient, 2 pleased; -1
  // without investors), and 1 once a growth milestone in the terms was missed.
  'funding.raised',
  'funding.mood',
  'funding.milestoneMissed',
  // Situational events (step 3): people on the team (working or starting), and the runway shown in
  // weeks (the weeks left in the run when money is not shrinking).
  'team.size',
  'runwayWeeks',
  // About the message's sender, only inside an effect's `when`: 1 when that customer has an
  // overdue invoice, 1 when that lead has gone silent; 0 otherwise or without such a sender.
  'sender.overdue',
  'sender.silent',
  // Tourism (step 5): next week's forecast (0 good, 1 mixed, 2 bad, 3 dangerous), 1 in a peak
  // month, the month (1 to 12), the rating times ten (0 without reviews), reviews, units booked
  // for this week and for the four weeks after it, 1 while listed on the platform. 0 elsewhere.
  'tour.forecast',
  'tour.peak',
  'tour.month',
  'tour.rating',
  'tour.reviews',
  'tour.bookedWeek',
  'tour.bookedAhead',
  'tour.listed',
  // The bank loan (step 6): what is still owed in EUR, missed payments in a row, running loans.
  'loan.balanceEur',
  'loan.missed',
  'loan.running',
] as const

/** Paths about a message's sender: they make sense only once a message has a sender. */
export const SENDER_PATHS: readonly ConditionPath[] = ['sender.overdue', 'sender.silent']
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
  // Tourism: guests who heard of you join a segment's repeat guests (a random one when absent).
  z.object({
    type: z.literal('guests'),
    segment: Id.optional(),
    count: z.number().int().positive(),
    ...fx,
  }),
  // Tourism: reviews at this rating (1 to 5) arrive.
  z.object({
    type: z.literal('review'),
    rating: z.number().min(1).max(5),
    count: z.number().int().positive(),
    ...fx,
  }),
  // The investors' confidence moves by this much (0 to 1). Nothing happens without investors.
  z.object({ type: z.literal('investorConfidence'), delta: z.number(), ...fx }),
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

export const EventSchema = z
  .object({
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
  .superRefine((e, ctx) => {
    // Sender paths ask about the message's sender: never in the draw, and only with a sender.
    for (const c of [...e.when, ...e.trigger]) {
      if (SENDER_PATHS.includes(c.path)) {
        ctx.addIssue({
          code: 'custom',
          message: `${c.path} only works in an effect's when`,
          path: ['when'],
        })
      }
    }
    e.choices.forEach((choice, i) =>
      choice.effects.forEach((fx, j) => {
        if (e.from === 'none' && fx.when.some((c) => SENDER_PATHS.includes(c.path))) {
          ctx.addIssue({
            code: 'custom',
            message: 'a sender condition needs a customer or lead as sender',
            path: ['choices', i, 'effects', j, 'when'],
          })
        }
      }),
    )
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
    // `guests`: guests served in a tourism scenario.
    of: z.enum(['interviews', 'deposits', 'customers', 'hires', 'guests']),
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
  // `overMonths` (seasonal businesses): the last this many months together must pay for every
  // cost instead, so a quiet season at the end does not decide the run.
  win: z
    .object({
      profitableMonths: z.number().int().positive(),
      overMonths: z.number().int().positive().optional(),
    })
    .optional(),
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
      // Every week: + weeklyRecovery + perHourOverBase x hours over the base + perRestHour x rest.
      perHourOverBase: z.number(),
      perRestHour: z.number(),
      weeklyRecovery: z.number(),
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
  // Long mode: raising money from angels and a seed fund (Part D). Absent: no funding.
  funding: FundingConfigSchema.optional(),
  // Tourism: bookings of capacity that expires (step 4). Absent: the subscription model.
  bookings: BookingsConfigSchema.optional(),
  // The bank loan (step 6). Absent: no loan.
  loan: LoanConfigSchema.optional(),
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

  // Tourism: the bookings block names real markets and features.
  if (s.bookings) {
    const segIds = new Set(s.segments.map((x) => x.id))
    const featureIds = new Set(s.features.map((x) => x.id))
    for (const id of Object.keys(s.bookings.segments)) {
      if (!segIds.has(id)) issue(`unknown segment ${id}`, ['bookings', 'segments', id])
    }
    for (const [id, p] of Object.entries(s.bookings.products)) {
      if (!featureIds.has(id)) issue(`unknown feature ${id}`, ['bookings', 'products', id])
      for (const seg of p.serves) {
        if (!segIds.has(seg)) issue(`unknown segment ${seg}`, ['bookings', 'products', id])
      }
      if (p.alternative && !featureIds.has(p.alternative)) {
        issue(`unknown feature ${p.alternative}`, ['bookings', 'products', id, 'alternative'])
      }
    }
    for (const [id, r] of Object.entries(s.bookings.roles)) {
      for (const f of Object.keys(r.units)) {
        if (!s.bookings.products[f]) issue(`unknown product ${f}`, ['bookings', 'roles', id])
      }
    }
    if (!featureIds.has(s.bookings.website.product)) {
      issue('unknown website product', ['bookings', 'website', 'product'])
    }
  }

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
