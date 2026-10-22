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
  // Before the round's visible revenue bar, terms are deliberately worse: less money for more
  // equity. It makes a premature raise costly in the offer itself, not in a hidden pass chance.
  weakTractionTerms: z
    .object({
      amountFactor: z.number().positive().max(1),
      preMoneyFactor: z.number().positive().max(1),
    })
    .optional(),
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
  // Once the first round closes, the company pays the founder this monthly salary.
  founderSalaryCents: Cents.positive().optional(),
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
  // Step 7: share of the price paid when the booking is made (a wedding's deposit), kept if the
  // guests cancel; the rest is paid at the stay. Absent: everything at the stay.
  depositShare: Share.optional(),
  // Step 7: the share of a product's capacity this segment's guests can use, in peak months and
  // off season (couples come at weekends outside the holidays). Absent: all of it.
  capacityShare: z.object({ peak: Share, off: Share }).optional(),
  // Whether the weather moves its demand and cancellations.
  weatherSensitive: z.boolean().default(false),
  // Business customers get an invoice through the invoice system; others pay on the day.
  invoiced: z.boolean().default(false),
  // How much reviews move its demand (section 5).
  reviewWeight: z.number().nonnegative(),
  // Plan 4: levels its guests already hold (certified divers), for products with `needsLevel`.
  levels: z.array(Id).optional(),
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
  // Step 6: sells only once this product has shipped too (a restaurant's fit-out).
  requires: Id.optional(),
  // Step 6: a cost per unit as a share of its price (food cost), on top of unitCostCents.
  unitCostShare: Share.optional(),
  // Plan 2 step 1c: food is prepared per service. The unit cost is paid on every prepared unit,
  // served or not, and guests beyond what was prepared are turned away.
  prepared: z.boolean().optional(),
  // Step 7: sells from that product's capacity instead of its own (whole-house bookings use the
  // rooms); both count against one pool.
  capacityOf: Id.optional(),
  // Plan 2 step 2: shipping it moves the business to this office stage (a restaurant's own
  // fit-out).
  stage: Id.optional(),
  // Plan 4 (docs/abroad-mechanics.md). Every field below is optional without a default, so the
  // scenarios before plan 4 keep their fingerprints.
  // Day conditions (section 2): the states it runs in, and the slots of the day it uses (all the
  // scenario's slots when absent). Its capacity is for a week whose every slot suits it.
  runsIn: z.array(Id).optional(),
  slots: z.array(Id).optional(),
  // Sold by the whole week (a cruise): never cancelled for conditions; bad slots cost reviews.
  wholeWeek: z.boolean().optional(),
  // Courses (section 3): the level a guest reaches, and who books what next.
  course: z
    .object({
      level: Id,
      // Share of graduates who book one of these products the week after (still on holiday).
      sameStay: z.object({ share: Share, products: z.array(Id).min(1) }).optional(),
      // Share of graduates per channel who come back a year later for one of these products.
      nextSeason: z
        .object({ direct: Share, platform: Share, products: z.array(Id).min(1) })
        .optional(),
    })
    .optional(),
  // Sold only to guests holding this level: graduates, or a segment whose guests hold it.
  needsLevel: Id.optional(),
  // Day trips (section 5): a group of at most `perTrip` guests needs `days` trip days, each a
  // whole day of one staff shift, one trip a day per asset, at `costCents` a trip (fuel). It runs
  // in `runsIn` states at the trip spot, and only while the player's trip policy allows it.
  dayTrip: z
    .object({
      perTrip: z.number().int().positive(),
      days: z.number().int().positive(),
      costCents: Cents.nonnegative(),
      // A product that must have shipped (the van); absent: none needed.
      asset: Id.optional(),
    })
    .optional(),
  // Licences (section 6): weeks between the prep hours being done and the product counting as
  // shipped (the authority's answer).
  waitWeeks: z.number().int().positive().optional(),
  // A unit of this product costs the segment's price times this (a course against an hour's
  // hire). Absent: 1.
  priceFactor: z.number().positive().optional(),
  // How readily a guest picks this product among those with room, against 1 for the others.
  // With any product naming it, guests pick by these weights instead of by the most room.
  appeal: z.number().positive().optional(),
  // Tuning 1: guests who come for this product alone, as a share of each segment it serves
  // (their own requests on top of the segment's); the segment's other guests never pick it.
  // Absent: it shares the segment's guests with the other products.
  ownDemand: Share.optional(),
  // Plan 4 (the refit): shipping it closes an asset for some weeks, and once shipped these
  // segments would pay this much more (their willingness to pay times the factor).
  closesAsset: z.object({ asset: Id, weeks: z.number().int().positive() }).optional(),
  wtpFactor: z.record(Id, z.number().positive()).optional(),
})

// Plan 2 step 1b: a contract instead of shifts booked week by week. Permanent and part time staff
// work every week and are paid whether busy or not, until a notice period runs out; a seasonal
// contract runs through its months and cannot be ended early.
export const ContractSchema = z.object({
  centsPerWeek: Cents.positive(),
  // Shifts a week the contract covers.
  shifts: z.number().int().positive(),
  // Weeks paid after notice is given. Absent: cannot be ended (seasonal).
  noticeWeeks: z.number().int().nonnegative().optional(),
  // Seasonal: the months it runs in; it ends when they end. Absent: all year. With a notice
  // period as well (tuning 1), it sleeps outside its months instead of ending: paid and working
  // only in them, every year, until notice is given (the Spanish fijo discontinuo).
  months: z.array(z.number().int().min(1).max(12)).optional(),
  // Review quality added when contract staff do all of a week's shifts (they know the place).
  quality: z.number().nonnegative(),
  // Most such contracts in this role at once.
  max: z.number().int().positive(),
})
export const CONTRACT_KINDS = ['permanent', 'part_time', 'seasonal'] as const
export type ContractKind = (typeof CONTRACT_KINDS)[number]

export const StaffRoleSchema = z.object({
  name: z.string().min(1),
  // Plan 2 step 1c: kitchen roles decide how many covers a service can serve; floor roles do not
  // add covers but set how well they are served (reviews). Default: a role that serves.
  kind: z.enum(['serve', 'kitchen', 'floor']).optional(),
  contracts: z
    .object({
      permanent: ContractSchema.optional(),
      part_time: ContractSchema.optional(),
      seasonal: ContractSchema.optional(),
    })
    .optional(),
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
  // Risk pricing: basis points added for each multiple of own money borrowed beyond the first
  // (all borrowing with this loan, against own money). 0 when absent.
  leverageSpreadBp: z.number().int().nonnegative().optional(),
  termMonths: z.array(z.number().int().positive()).min(1),
  graceMonths: z.array(z.number().int().nonnegative()).min(1),
  // A missed payment adds this fee to the balance; the second missed month in a row is default.
  missedFeeCents: Cents.nonnegative(),
  earlyFeeShare: Share,
  maxLoans: z.number().int().positive(),
  // Plan 2 step 2: the bank lends against a plan. It lists these products (bought when the money
  // arrives), rooms where the scenario renovates room by room, and working capital of at most
  // this many months of fixed costs; nothing else. Absent: an amount of the founder's choosing.
  items: z.array(Id).optional(),
  financeRooms: z.boolean().optional(),
  workingCapitalMonths: z.number().positive().optional(),
  // Honest bank advice shown in the plan: months to bridge before the first useful season.
  bridgeMonthsHint: z.number().int().positive().optional(),
})
export type LoanConfig = z.infer<typeof LoanConfigSchema>

// Plan 2 step 1a: the specs' own experiments (a pilot day, a test listing, a pop-up dinner, a
// lunch test, test rates, an open house). Each speaks honestly, with noise, about the segments it
// reaches; never about the others.
export const TrialSchema = z.object({
  name: z.string().min(1),
  hours: z.number().int().nonnegative(),
  cents: Cents.nonnegative(),
  // Weeks until the result.
  weeks: z.number().int().positive(),
  // People it reaches.
  people: z.number().int().positive(),
  // Share of the people from each segment; with `choose`, the player picks one of these segments
  // and everyone comes from it.
  reach: z.record(Id, Share),
  choose: z.boolean().default(false),
  // Chance a person responds (books again, orders again, asks for dates): base plus perPain times
  // the segment's pain, times the price curve at the segment's own price.
  rate: z.object({ base: Share, perPain: Share }),
  // People pay the segment's price on the day (a pop-up dinner, lunch boxes).
  paid: z.boolean().default(false),
  // Guests from these segments leave a review.
  reviewFrom: z.array(Id).default([]),
  // Those who respond join the segment's repeat guests.
  repeat: z.boolean().default(false),
  // Most runs per run (per segment where the player chooses).
  max: z.number().int().positive(),
  // Only while this product has not shipped (before opening).
  before: Id.optional(),
})
export type TrialConfig = z.infer<typeof TrialSchema>

// Plan 2 step 1a: vouchers instead of pre-sales. Cash now and a liability: redeemed later as
// bookings that use capacity and pay nothing more; some are never redeemed.
export const VoucherConfigSchema = z.object({
  hoursPerBatch: z.number().int().nonnegative(),
  // People offered vouchers per batch.
  batchSize: z.number().int().positive(),
  rate: z.object({ base: Share, perPain: Share }),
  segments: z.array(Id).min(1),
  // Units one voucher buys (a person, a dinner for two, two nights).
  units: z.number().int().positive(),
  maxBatches: z.number().int().positive(),
  // Share redeemed at all, and the weeks after the sale a redeemed one asks for a date.
  redeemShare: Share,
  redeemWeeks: IntRange,
})
export type VoucherConfig = z.infer<typeof VoucherConfigSchema>

// Plan 2 step 1d: rooms renovated one at a time. A room under works is closed for `weeks`; the
// feature counts as a must have once `mustHaveRooms` rooms are done.
export const RenovationSchema = z.object({
  product: Id,
  feature: Id,
  rooms: z.number().int().positive(),
  unitsPerRoom: z.number().int().positive(),
  centsPerRoom: Cents.positive(),
  weeks: z.number().int().positive(),
  mustHaveRooms: z.number().int().positive(),
  // Most rooms under works at once.
  atOnce: z.number().int().positive(),
  // Review quality per renovated room, at most this times rooms (tired rooms get remarks).
  qualityPerRoom: z.number().nonnegative(),
})
export type RenovationConfig = z.infer<typeof RenovationSchema>

// Plan 2 step 1d: a minimum stay in some months. Fewer of these segments' requests book, but
// each stays longer (no empty Sundays).
export const MinStaySchema = z.object({
  segments: z.array(Id).min(1),
  months: z.array(z.number().int().min(1).max(12)).min(1),
  // Share of requests that still book with a minimum stay of two nights.
  conversion: Share,
  // Units added to each such booking.
  extraUnits: z.number().int().positive(),
})
export type MinStayConfig = z.infer<typeof MinStaySchema>

/**
 * Plan 4 (docs/abroad-mechanics.md section 2): wind and sea by the half day, instead of one
 * weather per week. Ordered states (calm to storm), one or two slots a day, monthly chances per
 * slot, spells (persistence) and a forecast per slot that is right with `forecastAccuracy` and
 * otherwise one state off.
 */
export const ConditionsSchema = z.object({
  states: z.array(z.object({ id: Id, name: z.string().min(1) })).min(2),
  slots: z
    .array(z.object({ id: Id, name: z.string().min(1) }))
    .min(1)
    .max(2),
  // Twelve months, January first: per slot id, the chance of each state in `states` order.
  monthly: z.array(z.record(Id, z.array(z.number().nonnegative()))).length(12),
  // Chance a day repeats the day before in the same slot.
  persistence: Share,
  forecastAccuracy: Share,
  // Day trips' spot: a slot's state at home moved `shift` states up (windier), capped at the top.
  spot: z.object({ name: z.string().min(1), slot: Id, shift: z.number().int() }).optional(),
  // Whole-week products: review quality lost per slot in a `bad` state (gained per `good` one);
  // with the `shelter` product shipped, a bad slot costs `shelterFactor` of that.
  review: z
    .object({
      bad: z.array(Id),
      perBadSlot: z.number().nonnegative(),
      good: z.array(Id).optional(),
      perGoodSlot: z.number().nonnegative().optional(),
      shelter: Id.optional(),
      shelterFactor: Share.optional(),
    })
    .optional(),
})
export type ConditionsConfig = z.infer<typeof ConditionsSchema>

/** Plan 4 (section 6): the tender for a concession (a beach licence), answered by an inbox event. */
export const TenderSchema = z.object({
  // The fixed cost the concession is.
  costId: Id,
  // Bidding higher: the cost times this, the spot kept.
  higherFactor: z.number().positive(),
  // Bidding as before: kept with a chance from `keep.min` (a rating of 3 or less) to `keep.max`
  // (a rating of 5), plus `perContract` per running staff contract (local hires), at most max.
  keep: z.object({ min: Share, max: Share, perContract: Share }),
  // A lost spot: walk-ins and partnerships reach this share of before.
  lost: z.object({ walkIn: Share, partnership: Share }),
  // A hotel's own beach: the cost times `factor`, `revenueShare` of guests' payments to the
  // hotel, and reach as for a lost spot.
  hotel: z.object({
    factor: z.number().positive(),
    revenueShare: Share,
    walkIn: Share,
    partnership: Share,
  }),
})
export type TenderConfig = z.infer<typeof TenderSchema>

/**
 * Plan 4 (docs/abroad-mechanics.md section 4): an asset that gives its products their capacity
 * (a dive boat, a gulet), owned, leased or shared. Without one of them its products do not sell.
 */
export const AssetSchema = z.object({
  name: z.string().min(1),
  // Products that run on it.
  products: z.array(Id).min(1),
  // Owning: the purchase is this product (its prep hours the paperwork, its one-off the price, a
  // loan item where the bank lists it, `requires` a local company where one is needed).
  buy: z
    .object({
      product: Id,
      // Maintenance, insurance and mooring, a month.
      upkeepMonthlyCents: Cents.nonnegative(),
      // The crew in a week the asset is used (a skipper's days, a gulet's crew).
      crewWeekCents: Cents.nonnegative(),
      // A haul-out in the first `weeks` weeks of this month every year, closed, at this cost.
      haulOut: z
        .object({
          month: z.number().int().min(1).max(12),
          weeks: z.number().int().positive(),
          cents: Cents.nonnegative(),
        })
        .optional(),
      // Breakdowns: a weekly chance of `weekly` plus `perYear` per year of age, closing the
      // asset for some weeks unless repaired at `repairCents` (an inbox message).
      breakdown: z.object({
        weekly: Share,
        perYear: Share,
        weeks: IntRange,
        repairCents: Cents.nonnegative(),
      }),
      // Its age when bought, and the share of the price it loses a year (resale value).
      ageYears: z.number().nonnegative(),
      valueLossPerYear: Share,
    })
    .optional(),
  // Leasing: a fee for the season in these months (a share up front, the rest monthly), at least
  // `minMonths` months (ending early pays the rest), the crew in weeks used.
  lease: z
    .object({
      seasonCents: Cents.nonnegative(),
      upfrontShare: Share,
      months: z.array(z.number().int().min(1).max(12)).min(1),
      minMonths: z.number().int().positive(),
      crewWeekCents: Cents.nonnegative(),
    })
    .optional(),
  // Sharing (seats on a partner's boat, managing an owner's gulet): this share of the capacity,
  // a fee per unit used and a share of the revenue to the owner; in `takeBack.months` the owner
  // keeps `takeBack.share` of the units with a weekly chance; with `peakRule`, the owner keeps
  // those months unless the shoulder months had `needWeeks` weeks sold by week of year `byWeek`.
  share: z
    .object({
      capacity: Share,
      unitCents: Cents.nonnegative(),
      revenueShare: Share,
      takeBack: z
        .object({
          chance: Share,
          share: Share,
          months: z.array(z.number().int().min(1).max(12)).min(1),
        })
        .optional(),
      peakRule: z
        .object({
          months: z.array(z.number().int().min(1).max(12)).min(1),
          shoulderMonths: z.array(z.number().int().min(1).max(12)).min(1),
          needWeeks: z.number().int().positive(),
          byWeek: z.number().int().min(1).max(52),
        })
        .optional(),
    })
    .optional(),
})
export type AssetConfig = z.infer<typeof AssetSchema>

// Plan 5: indoor leisure additions. Optional as a whole: earlier content hashes stay unchanged.
const SlotShares = z
  .record(Id, Share)
  .refine(
    (s) => Math.abs(Object.values(s).reduce((a, b) => a + b, 0) - 1) < 0.000001,
    'slot shares must sum to one',
  )
export const LeisureSchema = z
  .object({
    strictKeepsDeposit: z.literal(true).optional(),
    wtpBasis: z.literal('monthly').optional(),
    classStaffing: z.literal(true).optional(),
    instructorWorkload: z
      .object({
        maxClasses: z.number().int().positive(),
        penaltyPerOverloadedClass: z.number().nonnegative(),
      })
      .optional(),
    respectSlotPreferences: z.literal(true).optional(),
    slots: z
      .array(z.object({ id: Id, name: z.string().min(1), hours: z.number().positive() }))
      .min(1),
    segments: z.record(
      Id,
      z.object({
        slotShare: SlotShares,
        visitsPerWeek: z.number().nonnegative(),
        memberShare: Share,
        churn: Share,
        crowdingChurn: Share,
        freshnessChurn: Share,
        priceChurn: Share,
        januaryFade: Share,
        waitlistAt: z.number().int().positive(),
        minimumAreas: z.number().int().positive().optional(),
      }),
    ),
    products: z.record(
      Id,
      z.object({
        // Hard capacity per slot; comfort below it makes crowding a soft limit.
        capacity: z.record(Id, z.number().int().nonnegative()),
        comfort: z.record(Id, z.number().int().positive()).optional(),
        // A class has these places, multiplied by the timetable's class count.
        classPlaces: z.number().int().positive().optional(),
        classPlacesWhen: z.object({ feature: Id, places: z.number().int().positive() }).optional(),
        classHours: z.number().positive().optional(),
        room: Id.optional(),
        availableStages: z.array(Id).min(1).optional(),
      }),
    ),
    instructors: z.record(Id, ShareRange).optional(),
    premiumNiche: z
      .object({
        feature: Id,
        offers: z.array(Id).min(1),
        segments: z.array(Id).min(1),
        share: ShareRange,
        wtpFactor: z.number().positive(),
        requirePreferredOffer: z.literal(true).optional(),
      })
      .optional(),
    foundingFollowing: z
      .object({
        segment: Id,
        count: rangeOf(z.number().int().nonnegative()),
        weeks: z.number().int().positive(),
      })
      .optional(),
    slotPrices: z
      .record(Id, z.record(Id, z.object({ peak: Cents.positive(), off: Cents.positive() })))
      .optional(),
    space: z
      .object({ max: z.number().int().positive(), uses: z.record(Id, z.number().int().positive()) })
      .optional(),
    memberships: z
      .record(
        Id,
        z.object({
          kind: z.enum(['monthly', 'annual', 'off_peak', 'pack', 'intro']),
          visitsPerWeek: z.number().nonnegative().optional(),
          products: z.array(Id).min(1).optional(),
          priceCents: Cents.positive(),
          serves: z.array(Id).min(1),
          slots: z.array(Id).min(1),
          termWeeks: z.number().int().nonnegative(),
          noticeWeeks: z.number().int().nonnegative(),
          visits: z.number().int().positive().optional(),
          validWeeks: z.number().int().positive().optional(),
          convert: Share.optional(),
        }),
      )
      .optional(),
    aggregator: z
      .object({
        name: z.string().min(1),
        payOnVisit: z.literal(true).optional(),
        sharedQueue: z.literal(true).optional(),
        payoutCents: rangeOf(Cents.positive()),
        capPerMonth: z.number().int().positive(),
        noticeWeeks: z.number().int().positive(),
        users: z.record(Id, rangeOf(z.number().int().nonnegative())),
        visitsPerWeek: Share,
        cannibalisation: z.record(Id, Share),
      })
      .optional(),
    freshness: z
      .record(
        Id,
        z.object({
          newAbove: z.number().min(0).max(100),
          knownAbove: z.number().min(0).max(100),
          weeklyLoss: z.number().min(0).max(100),
          useLoss: z.number().nonnegative(),
          localPool: rangeOf(z.number().int().positive()).optional(),
          localSegments: z.array(Id),
          sensitivity: z.record(Id, Share),
          reviewPenalty: z.number().nonnegative().optional(),
          refresh: z.object({
            hours: z.number().int().positive(),
            cents: Cents.nonnegative(),
            weeks: z.number().int().nonnegative(),
            lostCapacity: z.record(Id, z.number().int().nonnegative()).optional(),
          }),
        }),
      )
      .optional(),
    buildOut: z
      .record(
        Id,
        z.object({ weeks: z.number().int().positive(), closes: z.array(Id).min(1).optional() }),
      )
      .optional(),
    slotUpgrades: z
      .record(
        Id,
        z.object({
          product: Id,
          slot: Id,
          additional: z.number().int().positive(),
          unitCostCents: Cents.nonnegative(),
        }),
      )
      .optional(),
    noise: z
      .object({
        products: z.array(Id).min(1),
        insulation: Id,
        setupProducts: z.array(Id),
        complaint: Share,
        insulatedComplaint: Share,
        warningAt: z.number().int().positive(),
        restrictAt: z.number().int().positive(),
        windowWeeks: z.number().int().positive(),
        restrictionWeeks: z.number().int().positive(),
      })
      .optional(),
    extras: z
      .record(
        Id,
        z.object({
          segments: z.record(
            Id,
            z.object({
              grossCents: Cents.positive(),
              revenueShare: Share,
              unitCostCents: Cents.nonnegative(),
            }),
          ),
        }),
      )
      .optional(),
    permits: z
      .record(Id, z.object({ approval: Share, refundCents: Cents.nonnegative() }))
      .optional(),
    // Any one of these completed areas opens the business; optional extra prerequisites.
    opening: z.object({ areas: z.array(Id).min(1), requires: z.array(Id) }).optional(),
    holds: z
      .object({
        feeCents: Cents.nonnegative(),
        weeks: rangeOf(z.number().int().positive()),
        lateReleaseShare: Share,
        segments: z.record(
          Id,
          z.object({ ask: Share, convert: Share, feeConversion: Share, noHoldConversion: Share }),
        ),
      })
      .optional(),
    crowdingPenalty: z.number().nonnegative(),
    quietBelow: Share,
    packedFrom: Share,
  })
  .superRefine((l, ctx) => {
    const slots = new Set(l.slots.map((s) => s.id))
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message })
    if (slots.size !== l.slots.length) issue('duplicate leisure slot')
    if (l.quietBelow >= l.packedFrom) issue('quiet threshold must be below packed threshold')
    if (l.noise) {
      if (l.noise.warningAt >= l.noise.restrictAt) issue('noise warning must precede restriction')
      if (l.noise.insulatedComplaint > l.noise.complaint)
        issue('insulation must not increase complaints')
    }
    for (const id of Object.keys(l.permits ?? {}))
      if (!l.buildOut?.[id]) issue('a permit needs its stated build-out wait')
    const upgraded = new Set<string>()
    for (const upgrade of Object.values(l.slotUpgrades ?? {})) {
      if (!l.products[upgrade.product]) issue(`unknown upgraded product ${upgrade.product}`)
      if (!slots.has(upgrade.slot)) issue(`unknown upgraded slot ${upgrade.slot}`)
      const key = `${upgrade.product}:${upgrade.slot}`
      if (upgraded.has(key)) issue('only one upgrade per product and slot')
      upgraded.add(key)
    }
    for (const build of Object.values(l.buildOut ?? {}))
      for (const id of build.closes ?? []) if (!l.products[id]) issue(`unknown closed area ${id}`)
    for (const segment of Object.values(l.segments)) {
      for (const id of Object.keys(segment.slotShare))
        if (!slots.has(id)) issue(`unknown slot ${id}`)
    }
    for (const prices of Object.values(l.slotPrices ?? {}))
      for (const id of Object.keys(prices)) if (!slots.has(id)) issue(`unknown price slot ${id}`)
    for (const segment of Object.values(l.segments))
      if (segment.minimumAreas && segment.minimumAreas > (l.opening?.areas.length ?? 0))
        issue('minimum areas exceeds configured opening areas')
    for (const product of Object.values(l.products)) {
      if (product.classPlaces && !product.classHours) issue('classes need their hours')
      if (product.classPlacesWhen && !product.classPlaces)
        issue('class conversion needs base places')
      for (const id of [...Object.keys(product.capacity), ...Object.keys(product.comfort ?? {})]) {
        if (!slots.has(id)) issue(`unknown slot ${id}`)
        if ((product.comfort?.[id] ?? 0) > (product.capacity[id] ?? 0))
          issue('comfort exceeds hard capacity')
      }
    }
    for (const f of Object.values(l.freshness ?? {}))
      if (f.knownAbove >= f.newAbove) issue('freshness words need ordered thresholds')
    for (const f of Object.values(l.freshness ?? {}))
      for (const id of Object.keys(f.refresh.lostCapacity ?? {}))
        if (!slots.has(id)) issue(`unknown maintenance slot ${id}`)
    if (l.instructorWorkload && !l.classStaffing) issue('instructor workload needs class staffing')
    for (const id of l.premiumNiche?.offers ?? [])
      if (!l.memberships?.[id]) issue(`unknown premium offer ${id}`)
    for (const id of l.premiumNiche?.segments ?? [])
      if (!l.segments[id]) issue(`unknown premium segment ${id}`)
    if (l.foundingFollowing && !l.segments[l.foundingFollowing.segment])
      issue('unknown founding following segment')
    for (const offer of Object.values(l.memberships ?? {})) {
      for (const id of offer.slots) if (!slots.has(id)) issue(`unknown slot ${id}`)
      for (const id of offer.products ?? [])
        if (!l.products[id]) issue(`unknown membership product ${id}`)
      if (offer.kind === 'pack' && (!offer.visits || !offer.validWeeks))
        issue('packs need visits and validity')
      if (offer.kind === 'intro' && (!offer.validWeeks || offer.convert === undefined))
        issue('intro offers need validity and conversion')
    }
  })
export type LeisureConfig = z.infer<typeof LeisureSchema>

export const BookingsConfigSchema = z.object({
  startWeekOfYear: z.number().int().min(1).max(52),
  seasonNoise: Share,
  // Months that use the peak price (others use the off season price).
  peakMonths: z.array(z.number().int().min(1).max(12)),
  // Weeks a cancellation policy must stay before it can change.
  policyWeeks: z.number().int().positive(),
  // One weather per week, or (plan 4) `conditions` by the half day: exactly one of the two.
  weather: z
    .object({
      // Chance of good, mixed, bad and dangerous weather per month.
      monthly: z.array(PerWeather).length(12),
      forecastAccuracy: Share,
      demand: PerWeather,
      cancel: PerWeather,
    })
    .optional(),
  conditions: ConditionsSchema.optional(),
  leisure: LeisureSchema.optional(),
  // Plan 4 (section 5): the trip policy, which must stay `policyWeeks` before it changes, and the
  // smallest group a run starts with (absent: no trips until the player sets a policy).
  trips: z
    .object({
      policyWeeks: z.number().int().positive(),
      start: z.number().int().positive().optional(),
    })
    .optional(),
  tender: TenderSchema.optional(),
  // Plan 4 (section 4): assets with buy, lease and share options.
  assets: z.record(Id, AssetSchema).optional(),
  // Tuning 1: requests follow the season of the week they ask for (the week they are made plus
  // their lead time), not the week they are made, so guests who book months ahead ask through
  // the winter. Absent: by the week they are made, as before.
  requestsAhead: z.boolean().optional(),
  // Plan 4 (the gulet, docs/scenario-gulet.md section 6). Weeks the player holds for whole-boat
  // bookings: these products sell nothing in a held week.
  hold: z.object({ products: z.array(Id).min(1) }).optional(),
  // The minimum to sail: a week of `product` with fewer than the minimum (in `perUnit` units, a
  // cabin of two) sold `weeksBefore` weeks ahead is cancelled; the guests are refunded or moved
  // to a partner's boat at `moveCents` each. The setting changes at most every `policyWeeks`.
  minSail: z
    .object({
      product: Id,
      perUnit: z.number().int().positive(),
      options: z.array(z.number().int().nonnegative()).min(2),
      weeksBefore: z.number().int().positive(),
      moveCents: Cents.nonnegative(),
      policyWeeks: z.number().int().positive(),
    })
    .optional(),
  // Strangers on one boat: a week of `product` sold to more than one group has friction with a
  // chance of `chance` per extra group, which costs `penalty` review quality. With `themed`
  // shipped the chance is `themedFactor` of that, and `themedConversion` of the requests book.
  friction: z
    .object({
      product: Id,
      chance: Share,
      penalty: z.number().nonnegative(),
      themed: Id.optional(),
      themedFactor: Share.optional(),
      themedConversion: Share.optional(),
    })
    .optional(),
  // Plan 4 (section 7): local costs that rise from a week on, by a factor: these fixed costs,
  // staff pay (shifts and contracts) and products' unit costs.
  costSteps: z
    .array(
      z.object({
        week: z.number().int().positive(),
        factor: z.number().positive(),
        fixedCosts: z.array(Id),
        roles: z.boolean(),
        unitCosts: z.boolean(),
      }),
    )
    .optional(),
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
  trials: z.record(Id, TrialSchema).optional(),
  // Plan 2 step 3: guests take the founder's time (welcoming, the phone, the bookings, a word at
  // the table): this many hours per unit served last week, at most maxHours a week.
  hosting: z
    .object({
      hoursPerUnit: z.number().nonnegative(),
      maxHours: z.number().int().nonnegative(),
      relief: z.object({ role: Id, hoursPerShift: z.number().positive() }).optional(),
    })
    .optional(),
  vouchers: VoucherConfigSchema.optional(),
  renovation: RenovationSchema.optional(),
  minStay: MinStaySchema.optional(),
  // Plan 2 step 1c, with floor roles: a short floor still serves up to `stretch` times its units
  // (slower turns, fewer covers beyond that), and reviews lose `penalty` times the share of covers
  // served beyond the floor's units.
  floor: z.object({ stretch: z.number().min(1), penalty: z.number().nonnegative() }).optional(),
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
  // Plan 3, office stages: the stage's place in the list (1 to 5), weeks since moving in, desks
  // free (99 without a desk limit), 1 while a move or notice runs; months in a row, up to the last
  // closed one, whose revenue covered all costs (the founder's living included) or company costs.
  'office.stage',
  'office.weeksAtStage',
  'office.desksFree',
  'office.busy',
  'months.coveringAll',
  'months.profitable',
  // Tourism: weeks of the last 8 in which guests were turned away for lack of room, the same in
  // peak months only, and the share of capacity booked over the last 4 weeks in percent.
  'tour.turnedAwayWeeks',
  'tour.peakTurnedAwayWeeks',
  'tour.occupancy',
  'leisure.open',
  'leisure.weeksOpen',
  'leisure.members',
  'leisure.cancellations',
  'leisure.packed',
  'leisure.aggregator',
  'leisure.checkins',
  'leisure.holds',
  'leisure.tired',
  'leisure.instructorLosses',
  'leisure.complaints',
  'leisure.restricted',
  'leisure.permitRefusals',

  // Plan 4: the scenario's first asset: 1 when it is owned, leased, shared, none of them, or
  // broken down this week; 0 otherwise or without assets.
  'asset.owned',
  'asset.leased',
  'asset.shared',
  'asset.none',
  'asset.broken',
] as const

/** Paths about a message's sender: they make sense only once a message has a sender. */
export const SENDER_PATHS: readonly ConditionPath[] = ['sender.overdue', 'sender.silent']
/**
 * `shipped.<feature id>` reads 1 once that feature or product is ready, else 0 (plan 2 audit), so
 * an event whose text says "if there were a room to marry in" can say so in its conditions.
 */
export const SHIPPED_PREFIX = 'shipped.'
export type FixedConditionPath = (typeof CONDITION_PATHS)[number]
export type ConditionPath = FixedConditionPath | `shipped.${string}`
/** The feature a `shipped.<id>` path asks about, or null for any other path. */
export const shippedFeature = (path: ConditionPath): string | null =>
  path.startsWith(SHIPPED_PREFIX) ? path.slice(SHIPPED_PREFIX.length) : null
export const CONDITION_OPS = ['>=', '<=', '>', '<', '==', '!='] as const
export type ConditionOp = (typeof CONDITION_OPS)[number]
export type Condition = { path: ConditionPath; op: ConditionOp; value: number }

/** Parses `customers.count >= 1`. Returns null for anything outside the closed grammar. */
export function parseCondition(text: string): Condition | null {
  const m =
    /^\s*([A-Za-z.]+|shipped\.[a-z][a-z0-9_]*)\s*(>=|<=|==|!=|>|<)\s*(-?\d+(?:\.\d+)?)\s*$/.exec(
      text,
    )
  if (!m) return null
  const path = m[1] as ConditionPath
  const feature = shippedFeature(path)
  if (
    feature !== null
      ? !/^[a-z][a-z0-9_]*$/.test(feature)
      : !(CONDITION_PATHS as readonly string[]).includes(path)
  )
    return null
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
  // Plan 3: accepts an office stage's offer: pays its one-off cost (unless a loan bought it),
  // takes its rent from now, and moves in after the stage's moving weeks.
  z.object({ type: z.literal('officeMove'), stage: Id, ...fx }),
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
  z.object({ type: z.literal('leisureStart'), products: z.array(Id).min(1), ...fx }),
  z.object({ type: z.literal('leisureInstructor'), role: Id, ...fx }),
  // Plan 4: the answer to a concession's tender (docs/abroad-mechanics.md section 6).
  z.object({ type: z.literal('tender'), bid: z.enum(['higher', 'same', 'hotel']), ...fx }),
  // Plan 4: an asset leased, shared or given up (buying is its purchase product). Ending a lease
  // before its minimum pays the rest of the minimum.
  z.object({
    type: z.literal('asset'),
    id: Id,
    option: z.enum(['lease', 'share', 'none']),
    ...fx,
  }),
  // Plan 4: a broken asset repaired at its repair cost, open again from next week.
  z.object({ type: z.literal('assetRepair'), id: Id, ...fx }),
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
    // Weeks before a repeatable event can come back, instead of the inbox cooldown. A triggered
    // event that is not `once` comes back this many weeks after it arrived, if a trigger holds.
    cooldownWeeks: z.number().int().nonnegative().optional(),
    // Weeks the message stays open, instead of the inbox's (plan 3: an office offer).
    openWeeks: z.number().int().positive().optional(),
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
  // Tourism (step 6): added to the quality guests rate while working here (a better room).
  qualityBonus: z.number().optional(),
  // Plan 3 (docs/office-stages.md): stages 3 to 5, offered by an inbox event (effect `officeMove`).
  // Every field is optional, with no default, so stages 1 and 2 keep their fingerprints.
  // Paid when the offer is accepted (fit-out, furniture, deposit); the deposit part comes back
  // when the company gives notice.
  oneOffCents: Cents.nonnegative().optional(),
  depositCents: Cents.nonnegative().optional(),
  // Weeks from accepting to working there; the old stage applies meanwhile.
  moveWeeks: z.number().int().positive().optional(),
  // People who can work here at once, the founder included. Absent: no limit.
  desks: z.number().int().positive().optional(),
  // People on the team at once while here, instead of the scenario's `team.maxMembers`.
  maxMembers: z.number().int().positive().optional(),
  // Demo to trial chance multiplied by this (demos held in the office).
  demoFactor: z.number().positive().optional(),
  // A hire search takes this many weeks less (never under one).
  searchWeeksLess: z.number().int().nonnegative().optional(),
  // Per segment: a subscription segment's trial conversion, or a bookings segment's requests,
  // multiplied by this while here (visiting firms trust what they see, a private table).
  segmentFactors: z.record(Id, z.number().positive()).optional(),
  // Tourism: units a week added to a product's capacity (more seats, rooms, gear).
  capacity: z.record(Id, z.number().int().nonnegative()).optional(),
  // Tourism: a role's units per shift multiplied by this (a bigger kitchen).
  staffFactors: z.record(Id, z.number().positive()).optional(),
  // Tourism: food prepared and not sold is multiplied by this (less waste).
  wasteFactor: z.number().min(0).max(1).optional(),
  // Tourism: founder hours guests take, less this many (a reception).
  hostingHoursLess: z.number().int().nonnegative().optional(),
  // Tourism: a product that may run in bad weather counts as its alternative's bad weather plan.
  weatherPlanFor: z.array(Id).optional(),
  // Tourism: more contracts of a role allowed at once while here.
  contractMax: z.record(Id, z.number().int().positive()).optional(),
  // Tourism: the stage's capacity, reach and segment effects need a running contract in this
  // role (someone stationed there); without one they are off that week.
  needsContract: Id.optional(),
})
export type OfficeStage = z.infer<typeof OfficeStageSchema>

/** Plan 3: moving and leaving office stages. Absent: stages only change by `moveOffice`. */
export const OfficeConfigSchema = z.object({
  // Notice to leave a stage: rent until then, the deposit back, the stage drops by one.
  noticeWeeks: z.number().int().positive(),
  // Founder hours a week the move takes while it lasts.
  moveHoursPerWeek: z.number().int().nonnegative(),
})
export type OfficeConfig = z.infer<typeof OfficeConfigSchema>

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
  // Plan 3: moving between stages by offer, and giving notice. Absent: no moves of that kind.
  office: OfficeConfigSchema.optional(),
  // The UI turns organised at the first of these milestones.
  organisedAt: z.array(Id).min(1),
  // Plan 3, long modes: the UI turns established once money coming in has covered all costs (the
  // founder's living costs included) for this many months in a row, or once a move into this
  // office stage (by number) completes, or (`funded`) once a funding round has closed.
  // Absent: never.
  establishedAt: z
    .object({
      monthsCoveringAll: z.number().int().positive(),
      officeStage: z.number().int().min(2).optional(),
      funded: z.boolean().optional(),
    })
    .optional(),
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
    for (const seg of Object.keys(o.segmentFactors ?? {})) {
      if (!s.segments.some((x) => x.id === seg)) {
        issue(`unknown segment ${seg}`, ['officeStages', i, 'segmentFactors'])
      }
    }
    const products = s.bookings?.products ?? {}
    const roles = s.bookings?.roles ?? {}
    for (const id of [...Object.keys(o.capacity ?? {}), ...(o.weatherPlanFor ?? [])]) {
      if (!products[id]) issue(`unknown product ${id}`, ['officeStages', i])
    }
    for (const id of [...Object.keys(o.staffFactors ?? {}), ...Object.keys(o.contractMax ?? {})]) {
      if (!roles[id]) issue(`unknown role ${id}`, ['officeStages', i])
    }
    if (o.needsContract && !roles[o.needsContract]) {
      issue(`unknown role ${o.needsContract}`, ['officeStages', i, 'needsContract'])
    }
    if ((o.depositCents ?? 0) > (o.oneOffCents ?? 0))
      issue('deposit above the one-off', ['officeStages', i])
  })
  const featureIdSet = new Set(s.features.map((x) => x.id))
  const checkShipped = (conditions: readonly Condition[], path: (string | number)[]) => {
    for (const c of conditions) {
      const id = shippedFeature(c.path)
      if (id !== null && !featureIdSet.has(id)) issue(`unknown feature ${id} in ${c.path}`, path)
    }
  }
  s.events.forEach((e, i) => {
    checkShipped([...e.when, ...e.trigger], ['events', i])
    e.choices.forEach((c, j) =>
      c.effects.forEach((f, k) => {
        checkShipped(f.when, ['events', i, 'choices', j, 'effects', k])
        if ((f.type === 'moveOffice' || f.type === 'officeMove') && !stageIds.has(f.stage)) {
          issue(`unknown office stage ${f.stage}`, ['events', i, 'choices', j, 'effects', k])
        }
      }),
    )
    if (e.trigger.length > 0 && !e.once && e.cooldownWeeks === undefined) {
      issue('a triggered event must be once or set cooldownWeeks', ['events', i])
    }
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
      if (p.requires && !featureIds.has(p.requires)) {
        issue(`unknown feature ${p.requires}`, ['bookings', 'products', id, 'requires'])
      }
      if (p.capacityOf && !s.bookings.products[p.capacityOf]) {
        issue(`unknown product ${p.capacityOf}`, ['bookings', 'products', id, 'capacityOf'])
      }
    }
    for (const [id, r] of Object.entries(s.bookings.roles)) {
      for (const f of Object.keys(r.units)) {
        if (!s.bookings.products[f]) issue(`unknown product ${f}`, ['bookings', 'roles', id])
      }
    }
    const bk = s.bookings
    if (bk.hosting?.relief && !bk.roles[bk.hosting.relief.role])
      issue('unknown hosting relief role', ['bookings', 'hosting', 'relief'])
    for (const id of s.loan?.items ?? []) {
      if (!bk.products[id]) issue(`unknown product ${id}`, ['loan', 'items'])
    }
    for (const [id, p] of Object.entries(bk.products)) {
      if (p.stage && !s.officeStages.some((o) => o.id === p.stage)) {
        issue(`unknown office stage ${p.stage}`, ['bookings', 'products', id, 'stage'])
      }
    }
    for (const [id, t] of Object.entries(bk.trials ?? {})) {
      for (const seg of Object.keys(t.reach)) {
        if (!segIds.has(seg)) issue(`unknown segment ${seg}`, ['bookings', 'trials', id, 'reach'])
      }
      for (const seg of t.reviewFrom) {
        if (!segIds.has(seg)) issue(`unknown segment ${seg}`, ['bookings', 'trials', id])
      }
      if (t.before && !featureIds.has(t.before)) {
        issue(`unknown feature ${t.before}`, ['bookings', 'trials', id, 'before'])
      }
    }
    for (const seg of bk.vouchers?.segments ?? []) {
      if (!segIds.has(seg)) issue(`unknown segment ${seg}`, ['bookings', 'vouchers', 'segments'])
    }
    if (bk.renovation) {
      if (!bk.products[bk.renovation.product]) {
        issue('unknown product', ['bookings', 'renovation', 'product'])
      }
      if (!featureIds.has(bk.renovation.feature)) {
        issue('unknown feature', ['bookings', 'renovation', 'feature'])
      }
    }
    for (const seg of bk.minStay?.segments ?? []) {
      if (!segIds.has(seg)) issue(`unknown segment ${seg}`, ['bookings', 'minStay', 'segments'])
    }
    if (!featureIds.has(s.bookings.website.product)) {
      issue('unknown website product', ['bookings', 'website', 'product'])
    }
    // Plan 4: weather or conditions, and the abroad mechanics name real things.
    if (Number(!!bk.weather) + Number(!!bk.conditions) + Number(!!bk.leisure) !== 1) {
      issue('exactly one of weather, conditions and leisure', ['bookings'])
    }
    const leisure = bk.leisure
    if (leisure) {
      for (const id of Object.keys(leisure.instructors ?? {}))
        if (!bk.roles[id]) issue(`unknown instructor ${id}`, ['bookings', 'leisure'])
      for (const id of Object.keys(leisure.segments))
        if (!bk.segments[id]) issue(`unknown leisure segment ${id}`, ['bookings', 'leisure'])
      for (const id of Object.keys(leisure.slotPrices ?? {}))
        if (!bk.segments[id]) issue(`unknown priced segment ${id}`, ['bookings', 'leisure'])
      for (const [id, permit] of Object.entries(leisure.permits ?? {})) {
        if (!bk.products[id]) issue(`unknown permit product ${id}`, ['bookings', 'leisure'])
        else if (permit.refundCents > bk.products[id]!.oneOffCents)
          issue('permit refund cannot exceed its purchase', ['bookings', 'leisure'])
      }
      for (const id of Object.keys(leisure.extras ?? {}))
        if (!featureIds.has(id)) issue(`unknown ancillary feature ${id}`, ['bookings', 'leisure'])
      for (const extra of Object.values(leisure.extras ?? {}))
        for (const id of Object.keys(extra.segments))
          if (!bk.segments[id]) issue(`unknown ancillary segment ${id}`, ['bookings', 'leisure'])
      if (leisure.noise)
        for (const id of [
          ...leisure.noise.products,
          leisure.noise.insulation,
          ...leisure.noise.setupProducts,
        ])
          if (!bk.products[id]) issue(`unknown noise product ${id}`, ['bookings', 'leisure'])
      for (const id of Object.keys(leisure.slotUpgrades ?? {}))
        if (!featureIds.has(id)) issue(`unknown capacity upgrade ${id}`, ['bookings', 'leisure'])
      if (leisure.premiumNiche && !featureIds.has(leisure.premiumNiche.feature))
        issue('unknown premium niche feature', ['bookings', 'leisure'])
      for (const product of Object.values(leisure.products))
        for (const id of product.availableStages ?? [])
          if (!s.officeStages.some((stage) => stage.id === id))
            issue(`unknown class stage ${id}`, ['bookings', 'leisure'])
      for (const product of Object.values(leisure.products))
        if (product.classPlacesWhen && !featureIds.has(product.classPlacesWhen.feature))
          issue(`unknown class conversion ${product.classPlacesWhen.feature}`, [
            'bookings',
            'leisure',
          ])
      for (const id of Object.keys(leisure.space?.uses ?? {}))
        if (!featureIds.has(id)) issue(`unknown space product ${id}`, ['bookings', 'leisure'])
      for (const map of [
        leisure.products,
        leisure.memberships,
        leisure.freshness,
        leisure.buildOut,
      ]) {
        for (const id of Object.keys(map ?? {}))
          if (!bk.products[id]) issue(`unknown leisure product ${id}`, ['bookings', 'leisure'])
      }
      for (const id of [...(leisure.opening?.areas ?? []), ...(leisure.opening?.requires ?? [])])
        if (!bk.products[id]) issue(`unknown opening product ${id}`, ['bookings', 'leisure'])
      for (const offer of Object.values(leisure.memberships ?? {}))
        for (const id of offer.serves)
          if (!bk.segments[id]) issue(`unknown membership segment ${id}`, ['bookings', 'leisure'])
      for (const f of Object.values(leisure.freshness ?? {}))
        for (const id of [...f.localSegments, ...Object.keys(f.sensitivity)])
          if (!bk.segments[id]) issue(`unknown freshness segment ${id}`, ['bookings', 'leisure'])
      for (const map of [
        leisure.aggregator?.users,
        leisure.aggregator?.cannibalisation,
        leisure.holds?.segments,
      ])
        for (const id of Object.keys(map ?? {}))
          if (!bk.segments[id]) issue(`unknown leisure segment ${id}`, ['bookings', 'leisure'])
    }
    for (const event of s.events) {
      for (const choice of event.choices) {
        for (const effect of choice.effects) {
          if (
            effect.type === 'leisureInstructor' &&
            (!leisure?.instructors ||
              (effect.role !== 'most_followed' && !leisure.instructors[effect.role]))
          )
            issue('instructor effect needs a leisure instructor', ['events', event.id])
          if (effect.type === 'leisureStart') {
            if (!event.once || event.from !== 'none')
              issue('initial build choices must be once, from none', ['events', event.id])
            if (!leisure || effect.products.some((id) => !leisure.buildOut?.[id]))
              issue('start choice needs leisure build-out products', ['events', event.id])
          }
        }
      }
    }
    const c = bk.conditions
    const stateIds = new Set((c?.states ?? []).map((x) => x.id))
    const slotIds = new Set((c?.slots ?? []).map((x) => x.id))
    c?.monthly.forEach((m, i) => {
      for (const slot of slotIds) {
        if (m[slot]?.length !== stateIds.size) {
          issue(`month ${i + 1} needs a chance per state for ${slot}`, ['bookings', 'conditions'])
        }
      }
    })
    if (c?.spot && !slotIds.has(c.spot.slot)) issue('unknown slot', ['bookings', 'conditions'])
    for (const st of [...(c?.review?.bad ?? []), ...(c?.review?.good ?? [])]) {
      if (!stateIds.has(st)) issue(`unknown state ${st}`, ['bookings', 'conditions', 'review'])
    }
    if (c?.review?.shelter && !bk.products[c.review.shelter]) {
      issue('unknown shelter product', ['bookings', 'conditions', 'review'])
    }
    const levels = new Set(
      Object.values(bk.products).flatMap((p) => (p.course ? [p.course.level] : [])),
    )
    for (const seg of Object.values(bk.segments)) for (const l of seg.levels ?? []) levels.add(l)
    for (const [id, p] of Object.entries(bk.products)) {
      const at = ['bookings', 'products', id]
      if ((p.runsIn || p.slots || p.wholeWeek || p.dayTrip) && !c) {
        issue('conditions products need a conditions block', at)
      }
      for (const st of p.runsIn ?? []) if (!stateIds.has(st)) issue(`unknown state ${st}`, at)
      for (const sl of p.slots ?? []) if (!slotIds.has(sl)) issue(`unknown slot ${sl}`, at)
      if (p.dayTrip && !c?.spot) issue('a day trip needs the conditions spot', at)
      if (p.dayTrip && !bk.trips) issue('a day trip needs the trips block', at)
      if (p.dayTrip?.asset && !bk.products[p.dayTrip.asset]) issue('unknown asset', at)
      if (p.needsLevel && !levels.has(p.needsLevel)) issue(`unknown level ${p.needsLevel}`, at)
      for (const next of [
        ...(p.course?.sameStay?.products ?? []),
        ...(p.course?.nextSeason?.products ?? []),
      ]) {
        if (!bk.products[next]) issue(`unknown product ${next}`, at)
      }
    }
    const costIds = new Set(s.start.fixedCosts.map((x) => x.id))
    if (bk.tender && !costIds.has(bk.tender.costId)) {
      issue('unknown fixed cost', ['bookings', 'tender', 'costId'])
    }
    for (const step of bk.costSteps ?? []) {
      for (const id of step.fixedCosts) {
        if (!costIds.has(id)) issue(`unknown fixed cost ${id}`, ['bookings', 'costSteps'])
      }
    }
    for (const [id, a] of Object.entries(bk.assets ?? {})) {
      const at = ['bookings', 'assets', id]
      for (const p of a.products) if (!bk.products[p]) issue(`unknown product ${p}`, at)
      if (a.buy && !bk.products[a.buy.product]) issue(`unknown product ${a.buy.product}`, at)
      if (!a.buy && !a.lease && !a.share) issue('an asset needs an option', at)
    }
    s.events.forEach((e, i) => {
      for (const ch of e.choices) {
        for (const fx of ch.effects) {
          if ((fx.type === 'asset' || fx.type === 'assetRepair') && !bk.assets?.[fx.id]) {
            issue(`unknown asset ${fx.id}`, ['events', i])
          }
          if (fx.type === 'asset' && fx.option !== 'none' && !bk.assets?.[fx.id]?.[fx.option]) {
            issue(`asset ${fx.id} has no ${fx.option} option`, ['events', i])
          }
        }
      }
      if (e.choices.some((ch) => ch.effects.some((fx) => fx.type === 'tender')) && !bk.tender) {
        issue('a tender answer needs the tender block', ['events', i])
      }
    })
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
