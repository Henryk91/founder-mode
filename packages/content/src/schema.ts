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
  buckets: z.array(InterviewBucketSchema).min(2),
})

export const SalesConfigSchema = z.object({
  // Leads from outreach: hours * channelResponse * (selling factor)
  sellingBase: z.number().nonnegative(),
  // Weekly chance that a lead agrees to a demo: base * (offset + perPain * pain)
  leadToDemoBase: Share,
  leadToDemoOffset: Share,
  leadToDemoPerPain: Share,
  demoHours: z.number().int().positive(),
  // Chance that a held demo becomes a trial: base + perFit * fit
  demoToTrialBase: Share,
  demoToTrialPerFit: Share,
  trialWeeks: z.number().int().positive(),
  ghostChancePerWeek: Share,
  silentWeeksToLose: z.number().int().positive(),
  skillGainPerDemo: z.number().nonnegative(),
  skillCap: Share,
  // Price above willingness to pay: exp(-priceSlope * (price / wtp - 1))
  priceSlope: z.number().nonnegative(),
  churn: z.object({
    base: Share,
    perMisfit: Share,
    perBug: Share,
    cap: Share,
  }),
})

export const INTRO_PLACEHOLDERS = ['cash', 'savings', 'living', 'maxWeeks'] as const
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
})

/** Every company name a segment's word lists can produce, in list order. */
export function companyNameCombinations(parts: { first: string[]; second: string[] }): string[] {
  return parts.first.flatMap((a) => parts.second.map((b) => `${a} ${b}`))
}

export const ScenarioFileSchema = z.object({
  id: Id,
  name: z.string().min(1),
  maxWeeks: z.number().int().positive(),
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
      // Below this energy every sales chance is multiplied by lowFactor.
      lowBelow: z.number().nonnegative(),
      lowFactor: Share,
      // Weeks in a row at 0 energy that end the run with burnout.
      burnoutWeeks: z.number().int().positive(),
    }),
  }),
  finance: z.object({
    weeksPerMonth: z.number().int().positive(),
  }),
  experiments: z.object({
    interview: InterviewConfigSchema,
  }),
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
})

// segment id -> bucket id -> quotes
export const InterviewQuotesSchema = z.record(Id, z.record(Id, z.array(z.string().min(1)).min(1)))

export const ScenarioSchema = ScenarioFileSchema.extend({
  features: z.array(FeatureSchema).min(1),
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
}).superRefine((s, ctx) => {
  const issue = (message: string, path: (string | number)[]) =>
    ctx.addIssue({ code: 'custom', message, path })

  const dupes = (ids: string[]) => ids.filter((id, i) => ids.indexOf(id) !== i)
  for (const id of dupes(s.segments.map((x) => x.id)))
    issue(`duplicate segment ${id}`, ['segments'])
  for (const id of dupes(s.features.map((x) => x.id)))
    issue(`duplicate feature ${id}`, ['features'])
  for (const id of dupes(s.roles.map((x) => x.id))) issue(`duplicate role ${id}`, ['roles'])

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
export type NumberRange = z.infer<typeof Range>
