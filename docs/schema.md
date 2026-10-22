# Schemas

Source of truth for the shapes shared between engine, content, bots, and UI. Update this file in the same change as any type change.

Status: Phase 9 part B (engine 0.12.0). Engine types live in `packages/engine/src/types.ts`, content schemas in `packages/content/src/schema.ts`.

## Conventions

- Money is integer cents (`...Cents`). Time is integer hours (`...Hours`).
- Probabilities and hidden values live only under `GameState.hidden` (and in `eventLog`) and never reach `PlayerView` or `WeekReport`.
- Ids are lowercase snake case strings, for example `small_offices`.
- A "month" is 4 weeks (`scenario.finance.weeksPerMonth`). Monthly charges land in weeks 4, 8, 12, and so on.

## GameState

Never passed to the UI. Fields from plan section 4.2 that are not listed here arrive with their systems: invoices, team, inbox, scheduled, `hidden.candidates`, `bookkeepingBacklogHours` (Phase 4), milestones (Phase 7).

```ts
type GameState = {
  engineVersion: string
  scenario: Scenario            // the scenario the run was created from; not in the save file
  scenarioId: string
  seed: string
  rng: RngState                 // sfc32 state { a, b, c, d }, signed 32 bit integers
  week: number                  // starts at 1; stays on the final week once the run ends
  status: 'running' | 'ended'
  ending: EndingId | null       // 'bankrupt' | 'burnout' | 'still_searching' | 'sustainable'

  founder: {
    baseHoursPerWeek: number    // 50
    maxHoursPerWeek: number     // 65
    energy: number              // 0..scenario.founder.energy.max, may be fractional (x.5)
    weeksAtZeroEnergy: number   // weeks in a row that ended at 0; burnout at founder.energy.burnoutWeeks
    savingsCents: number        // never below 0
    livingCostCentsPerWeek: number
    skills: { interviewing: number; selling: number }   // 0..1
  }

  company: {
    cashCents: number           // below 0 only in the week the run ends bankrupt
    priceCentsPerMonth: number
    fixedCosts: { id: string; name: string; monthlyCents: number }[]
    uiStage: 'scrappy' | 'organised'
  }

  hidden: {
    segments: Record<SegmentId, HiddenSegment>
  }

  knowledge: Record<SegmentId, Evidence[]>   // one key per scenario segment
  product: ProductState
  leads: Lead[]                              // every lead ever found, oldest first
  customers: Customer[]                      // every customer ever won, oldest first
  ledger: WeekLedger[]                       // one entry per resolved week
  actionLog: LoggedAction[]
  eventLog: LoggedEvent[]
}
```

### ProductState

```ts
type ProductState = {
  features: FeatureProgress[]   // one per scenario feature, in scenario order
  quality: number               // startQuality - qualityPerBug * bugs, never below 0
  bugs: number
  fixProgressHours: number      // bug fixing hours not yet enough for a whole bug
}

type FeatureProgress = {
  id: FeatureId
  progressHours: number         // never above the feature's buildHours
  shippedWeek: number | null    // set when progressHours reaches buildHours
}
```

### Lead and Customer

Observable facts only; no hidden value is stored on a lead. Leads and customers are append only, so ids are `lead_<n>` and `customer_<n>` by position.

```ts
type LeadStage = 'lead' | 'demo' | 'trial' | 'paying' | 'lost'

type Lead = {
  id: string
  name: string                  // one word from each list in scenario.companyNames[segmentId], unique per run; its distinctive word is not shared with another open lead (stage not lost or paying) of the segment
  segmentId: SegmentId
  stage: LeadStage              // 'demo' means: asked for a demo, waiting for the founder
  stageSinceWeek: number
  lastContactWeek: number
  silentSinceWeek: number | null   // set when the lead stops answering; silent leads cannot progress
  lostReason: 'declined' | 'price' | 'silent' | 'refunded' | null
}

type Customer = {
  id: string
  leadId: string
  name: string
  segmentId: SegmentId
  sinceWeek: number
  churnedWeek: number | null    // null while active
  churnReason?: 'price'         // set when they said they left over the price
  priceCentsPerMonth: number    // the price when they signed; later price changes do not touch it
}
```

Stage rules (plan 4.5, numbers in `scenario.sales`), in the order `systems/sales.ts` applies them each week:

1. A demo held this week (`plan.demos`): `demoToTrialBase + demoToTrialPerFit * fit` to become a `trial`, else lost (`declined`). Raises `skills.selling` by `skillGainPerDemo`, capped.
2. A trial older than `trialWeeks`: `fit * priceFactor` to become `paying` (a `Customer` is created), else lost. One draw decides: below `fit * priceFactor` a yes, between that and `fit` a no over the price (`price`, change `declined_price`), above `fit` a plain no (`declined`).
3. An answering `lead`: `leadToDemoBase * (leadToDemoOffset + leadToDemoPerPain * pain)` to become `demo`.
4. A `lead` or `demo` that was not touched this week goes silent with `ghostChancePerWeek`; a silent lead is lost (`silent`) after `silentWeeksToLose`.
5. Outreach finds `floor(x)` leads, plus one with probability `x - floor(x)`, where `x = hours * channelResponse * (sellingBase + skills.selling)`.

Steps 1 to 3 and 5 are multiplied by `founder.energy.lowFactor` while energy, after this week's hours, is below `lowBelow` (Kantino: 0.85 below 30). Ghosting and churn are not.

Endings are checked in this order: bankrupt, burnout (`weeksAtZeroEnergy >= burnoutWeeks`), then the week limit.

`fit = pain * coverage * (fitBase + fitPerQuality * quality / 100)`, `coverage` is the shipped share of the segment's must have features, and `priceFactor = (1 + e^(-k m)) / (1 + e^(k (r - m)))` with `r = price / wtp`, `m = sales.price.midpoint`, `k = sales.price.steepness` (engine 0.11.0; before, 1 up to the willingness to pay and `exp(-priceSlope * (r - 1))` above). It is 1 at a price of 0 and falls smoothly. `exp` is computed in `math.ts` from pure arithmetic, because `Math.exp` is not bit identical across engines.

Churn runs on every month end for customers won in an earlier week: `min(cap, base + perMisfit * (1 - fit) + perBug * bugs + perPrice * max(0, r - priceFrom))`, with `r` the customer's own price over the willingness to pay. One draw decides; a customer who leaves with a draw above the chance without the price share left over the price (`churnReason: 'price'`, `overPrice` on the report entry).

### HiddenSegment

Drawn at `createGame`. Roles are shuffled across segments, then every range is drawn uniformly.

```ts
type HiddenSegment = {
  roleId: string                // 'viable' | 'mediocre' | 'trap' in Kantino
  size: number                  // integer
  pain: number                  // 0..1, from the role
  politeness: number            // 0..1, from the role
  wtpCents: number              // integer
  mustHave: FeatureId[]
  channelResponse: Record<'cold_email' | 'phone' | 'in_person', number>
  paymentDelayDaysMean: number
  neverPaysShare: number
}
```

### Evidence

```ts
type Evidence = InterviewEvidence     // landing page and pre-sale results arrive in Phase 4

type InterviewEvidence = {
  kind: 'interview'
  week: number
  segmentId: SegmentId
  bucketId: BucketId                  // from scenario.experiments.interview.buckets
  quoteIndex: number                  // into scenario.interviewQuotes[segmentId][bucketId]; unheard quotes first
  mentionedFeatureId: FeatureId | null   // a must have the interviewee asked for, if any
}
```

### WeekLedger

Money movements of one resolved week. Outflows are positive numbers.

```ts
type WeekLedger = {
  week: number
  revenueCents: number          // month end only: price * customers won before this week
  fixedCostsCents: number       // sum of fixedCosts at month end, else 0
  freelanceCents: number        // the freelancer's bill for this week (Phase 9), a company cost
  livingCostsCents: number      // founder living costs for the week
  founderDrawCents: number      // part of living costs paid by the company because savings ran out
  transferCents: number         // planned transfer from savings to company
  autoTransferCents: number     // savings moved automatically to cover negative company cash
  cashEndCents: number
  savingsEndCents: number
  monthlyRevenueCents: number   // active customers' prices at week end, after churn
  customers: number             // active customers at week end, after churn
  runwayWeeks: number | null    // runway at week end; null while not shrinking
  energyEnd: number             // founder energy at week end
  hours: HoursByActivity        // the week's founder hours: learning, building, selling, admin, rest
}

type HoursByActivity = Record<'learning' | 'building' | 'selling' | 'admin' | 'rest', number>
```

The last five are filled by `closeLedger(state, hours)` after churn (step 9). `hoursByActivity(state, plan)` (`systems/founder.ts`) splits a week's hours: interviews, landing tests and pre-sales are learning; building and bug fixing are building; outreach, demos and follow ups are selling; chasing, the hiring search, inbox answers and lost hours are admin. `plannedHours` is its sum.

Invariants (tested): `cash' = cash + revenue - fixedCosts - freelance - founderDraw + transfer + autoTransfer` and `savings' = savings - (livingCosts - founderDraw) - transfer - autoTransfer`.

### LoggedAction and LoggedEvent

```ts
type LoggedAction = { type: 'endWeek'; week: number; plan: WeekPlan }

// Input for the post-mortem: random outcomes with their expected value, and money moves.
type LoggedEvent = InterviewEvent | ExperimentEvent | MoneyEvent | MessageEvent | OddsEvent

// Chance outcomes of one kind, market (and inbox event) in one week. Never draws from the PRNG.
type OddsEvent = {
  kind: 'odds'
  odds: 'leads' | 'lead_demo' | 'demo' | 'trial' | 'churn' | 'never_pays' | 'message'
  week: number
  segmentId: SegmentId | null
  eventId: string | null        // for 'message': the inbox event whose cash effect rolled
  tries: number
  expected: number              // sum of the chances (for 'leads': the mean lead count)
  observed: number              // successes that happened
  unitCents: number             // money one success moves (invoice, cash effect), else 0
}

type InterviewEvent = {
  kind: 'interview'
  week: number
  segmentId: SegmentId
  expected: number              // pain + politeness * (1 - interviewing)
  observed: number              // expected + noise
}

type MoneyEvent = { kind: MoneyMovementKind; week: number; amountCents: number }
```

### MoneyMovement

Money moving between the founder and the company. Only non zero movements are recorded, in the order transfer, draw, top up.

```ts
type MoneyMovementKind =
  | 'savings_transfer'   // the player moved savings into the company
  | 'founder_draw'       // the company paid living costs because savings were empty
  | 'auto_top_up'        // savings covered negative company cash automatically

type MoneyMovement = { kind: MoneyMovementKind; amountCents: number }
```

Private money put in (for the post-mortem) = sum of `savings_transfer` and `auto_top_up` events, see `privateMoneyInCents` in `systems/finance.ts`. It always equals the ledger sum of `transferCents + autoTransferCents`.

## WeekPlan and PlanIssue

```ts
type WeekPlan = {
  interviews: Record<SegmentId, number>   // interviews per segment, 2 h each
  build: Record<FeatureId, number>        // build hours per feature
  bugFixHours: number                     // fixHoursPerBug hours remove one bug
  outreach: Record<SegmentId, { channel: ChannelId; hours: number }>   // one channel per segment
  demos: string[]                         // lead ids in stage 'demo', demoHours each
  restHours: number                       // counts as planned hours
  transferToCompanyCents: number          // from personal savings
  priceCentsPerMonth: number | null       // new price for customers signing from this week on; null keeps it
}

type ChannelId = 'cold_email' | 'phone' | 'in_person'

type PlanIssue =
  | { code: 'game_over' }
  | { code: 'invalid_number'; field: string }          // negative or not an integer
  | { code: 'unknown_segment'; segmentId: string }
  | { code: 'unknown_feature'; featureId: string }
  | { code: 'feature_shipped'; featureId: string }            // build hours for a shipped feature
  | { code: 'build_exceeds_remaining'; featureId: string; remainingHours: number }
  | { code: 'bug_fix_exceeds_bugs'; maxHours: number }
  | { code: 'invalid_channel'; segmentId: string }
  | { code: 'invalid_demo'; leadId: string }                  // unknown, not in stage 'demo', silent, or listed twice
  | { code: 'too_many_hours'; plannedHours: number; maxHours: number }
  | { code: 'transfer_exceeds_savings'; savingsCents: number }
  | { code: 'invalid_price' }                                 // not a positive whole number of cents
```

A price change applies at the start of week resolution, so trials converting that week sign at the new price. Revenue at a month end is the sum of each paying customer's own price.

Planned hours = interviews * 2 + build + bug fixing + outreach + demos * `demoHours` + rest.

`emptyPlan()` returns a plan with nothing planned. `clonePlan(plan)` deep copies one. `endWeek` throws on a plan with issues. `checkPlan(state, plan)` returns `{ plannedHours, issues }` so the UI can show live feedback without seeing the state.

## PlayerView

Produced by `getView` in `packages/engine/src/view.ts`. The only thing the UI receives. Every field is copied explicitly; a test asserts that no hidden key or hidden value appears in it.

```ts
type PlayerView = {
  scenarioId: string
  scenarioName: string
  seed: string
  week: number
  maxWeeks: number
  status: 'running' | 'ended'
  ending: EndingId | null
  founder: {
    baseHoursPerWeek: number
    maxHoursPerWeek: number
    energy: number
    maxEnergy: number
    lowEnergyBelow: number        // scenario rule, shown in the energy explanation
    burnoutWeeks: number          // scenario rule
    weeksAtZeroEnergy: number
    savingsCents: number
    livingCostCentsPerWeek: number
  }
  company: {
    cashCents: number
    priceCentsPerMonth: number
    fixedCosts: { id: string; name: string; monthlyCents: number }[]
    monthlyFixedCostsCents: number
    runwayWeeks: number | null    // weeks until cash plus savings reach zero at the last 4 weeks' received less paid; null ("Covered") when not shrinking; at most the weeks left
    uiStage: 'scrappy' | 'organised'
    nextMonthEndWeek: number      // next month end, this week included
  }
  costs: { interviewHours: number; demoHours: number; fixHoursPerBug: number; trialWeeks: number }
  guidance: GuidanceView
  channels: ChannelId[]           // outreach channels in display order
  product: ProductView
  leads: LeadView[]
  customers: CustomerView[]       // active customers only
  monthlyRevenueCents: number     // sum of active customers' own prices
  segments: SegmentView[]         // in scenario order
  history: {                      // one per resolved week, from the ledger
    week: number
    cashCents: number
    savingsCents: number
    monthlyRevenueCents: number
    customers: number
    runwayWeeks: number | null
  }[]
}

// Onboarding text from the scenario. Placeholders: {name} is a plain number, {name:eur} is cents.
type GuidanceView = {
  intro: IntroCardView[]                 // shown before week 1 of a new run
  founderNote: FounderNoteView | null    // weeks 1 to 4 only, null when no rule applies
}

type IntroCardView = { id: string; title: string; body: string }

type FounderNoteView = {
  id: 'first_week' | 'no_evidence' | 'only_interviews' | 'built_unseen' | 'leads_only'
  template: string                       // scenario text with placeholders
  values: Record<string, number>         // week, n, living (cents)
}

type ProductView = {
  quality: number
  bugs: number
  fixableHours: number            // most bug fixing hours that still make sense this week
  features: FeatureView[]         // scenario order
}

type FeatureView = {
  id: FeatureId
  name: string
  buildHours: number
  progressHours: number
  remainingHours: number
  shipped: boolean
}

type LeadView = {
  id: string
  name: string
  segmentId: SegmentId
  stage: LeadStage
  weeksInStage: number
  lastContactWeek: number
  silent: boolean
  lostReason: 'declined' | 'price' | 'silent' | 'refunded' | null
  canBookDemo: boolean            // stage 'demo' and still answering
}

type CustomerView = {
  id: string
  name: string
  segmentId: SegmentId
  sinceWeek: number
  priceCentsPerMonth: number
}

type SegmentView = {
  id: SegmentId
  name: string
  description: string
  interviews: InterviewView[]     // sample size = interviews.length
  lastChannel: ChannelId | null   // outreach channel of the latest plan that had one for this segment
}

type InterviewView = {
  week: number
  segmentId: SegmentId
  bucketId: BucketId
  bucketName: string
  quote: string
  mentionedFeature: { id: FeatureId; name: string; quote: string } | null
}
```

Runway is `floor((cash + savings) / (-net / 4))`, where `net` is the change in cash plus savings over one month: `sum(revenue - fixedCosts - livingCosts)` over the last 4 ledger weeks once 4 weeks have been played. Before that it uses known costs: active customers' prices minus monthly fixed costs minus 4 weeks of living costs. Transfers, draws, and top ups move money between cash and savings and cancel out. Null when `net >= 0`.

Lead names and company names are scenario text, not hidden values. Must have features, pain, and willingness to pay never appear in the view; the product view shows only what was built.

## WeekReport

Returned by `endWeek` alongside the new state. Observable facts only.

```ts
type WeekReport = {
  week: number                  // the week that was resolved
  plannedHours: number
  energyBefore: number
  energyAfter: number
  interviews: InterviewView[]
  entries: ReportEntry[]        // notable things this week, in order
  ledger: WeekLedger
  ending: EndingId | null       // set when this week ended the run
}

type ReportEntry =
  | MoneyMovement                                                    // savings_transfer, founder_draw, auto_top_up
  | { kind: 'revenue'; amountCents: number; customers: number }
  | { kind: 'feature_shipped'; featureId: FeatureId; name: string; bugsAdded: number }
  | { kind: 'bugs_fixed'; count: number }
  | { kind: 'new_leads'; segmentId: SegmentId; channel: ChannelId; count: number }   // count may be 0
  | { kind: 'lead_update'; change: LeadChange; leadId: string; name: string; segmentId: SegmentId }
  | { kind: 'customer_churned'; customerId: string; name: string; segmentId: SegmentId; overPrice: boolean }

type LeadChange = 'wants_demo' | 'trial_started' | 'won' | 'declined' | 'declined_price' | 'went_silent' | 'lost_silent'

// More kinds arrive with later systems. Entries are in resolution order: product, sales, finance, churn.
```

## SaveFile

```ts
type SaveFile = {
  engineVersion: string         // replay refuses a save from another engine version
  scenarioId: string
  scenarioHash?: string         // scenarioHash(scenario); missing only in saves from before 0.4.0
  seed: string
  actions: LoggedAction[]
}

type SaveProblem = 'engine_version' | 'scenario_id' | 'scenario_changed'
```

`scenarioHash(scenario)` (`hash.ts`) is 16 hex digits: two 32 bit FNV-1a hashes over the scenario as JSON with sorted keys, so any change to a number or a text changes it and YAML key order does not. `saveProblem(scenario, save)` returns the first problem in the order above, or null. A missing hash counts as `scenario_changed`. `replay(scenario, save)` throws with a message naming the problem (for a changed scenario: both hashes), or when an action's week does not match. The UI maps `scenario_changed` to its own notice and the other two to `incompatible`.

## Content: Scenario

zod schema `ScenarioSchema` in `packages/content/src/schema.ts`; `Scenario = z.infer<typeof ScenarioSchema>`. The engine imports it with `import type` only. `loadScenario(id)` merges three YAML files:

| File | Becomes |
|---|---|
| `scenarios/<id>/scenario.yaml` | everything except `features` and `interviewQuotes` |
| `scenarios/<id>/features.yaml` | `features` |
| `scenarios/<id>/messages/interview_quotes.yaml` | `interviewQuotes` |
| `scenarios/<id>/messages/company_names.yaml` | `companyNames` |
| `scenarios/<id>/messages/intro.yaml` | `intro` and `founderNotes` |
| `scenarios/<id>/messages/events/<area>.yaml` | `events`, one file per event area, concatenated in `EVENT_AREAS` order. An entry `- shared: <id>` places a shared event there |
| `shared/events/<area>.yaml` | events every scenario gets; those a scenario does not place follow its own events of that area, in file order |
| `scenarios/<id>/about.yaml` | not part of `Scenario`: `name`, `category` (an id from `categories.yaml`), `short` (one line for its row), two or three `tags`, and exactly two `lines` for its sheet on the Start screen, read by `scenarioCatalogue()` |
| `categories.yaml` | not part of `Scenario`: the Start screen's categories, each `id`, `name` and `order`, read by `scenarioCategories()` in `order` |

```ts
type Range = { min: number; max: number }   // min <= max; IntRange requires integers

type Scenario = {
  id: string
  name: string
  maxWeeks: number
  start: {
    cashCents: number
    savingsCents: number
    livingCostCentsPerWeek: number
    priceCentsPerMonth: number
    energy: number
    skills: { interviewing: number; selling: number }
    fixedCosts: { id: string; name: string; monthlyCents: number }[]
  }
  founder: {
    baseHoursPerWeek: number
    maxHoursPerWeek: number
    energy: {
      max: number
      perHourOverBase: number      // -1: each hour over the base (Phase 9; was -2)
      perRestHour: number
      weeklyRecovery: number       // every week (Phase 9; was weekWithinBase, only weeks within the base)
      lowBelow: number            // below this energy every sales chance is multiplied by lowFactor
      lowFactor: number
      burnoutWeeks: number        // weeks in a row at 0 that end the run
    }
  }
  finance: { weeksPerMonth: number }
  experiments: {
    interview: {
      hours: number
      noiseSd: number
      skillGain: number
      skillCap: number
      mentionBase: number           // chance of a feature mention = base + perPain * pain
      mentionPerPain: number
      buckets: { id: string; name: string; below?: number }[]   // ascending, last one unbounded
    }
  }
  roles: { id: string; pain: Range; politeness: Range }[]       // exactly one per segment
  segments: {
    id: string
    name: string
    description: string
    size: IntRange
    wtpCents: IntRange
    mustHave: FeatureId[]
    channelResponse: Record<'cold_email' | 'phone' | 'in_person', Range>
    paymentDelayDaysMean: number
    neverPaysShare: number
  }[]
  product: {
    startQuality: number          // 0..100
    qualityPerBug: number         // quality = startQuality - qualityPerBug * bugs
    fixHoursPerBug: number
    fitBase: number               // fit = pain * coverage * (fitBase + fitPerQuality * quality / 100)
    fitPerQuality: number
  }
  sales: SalesConfig
  features: Feature[]
  interviewQuotes: Record<SegmentId, Record<BucketId, string[]>>
  companyNames: Record<SegmentId, {   // name = `${first} ${second}`, unique across all segments
    first: string[]
    second: string[]
    distinct: 'first' | 'second'       // default 'first'; two open leads of a segment never share this word
  }>
  intro: { cards: { id: string; title: string; body: string }[] }   // must include a card with id 'goal'
  founderNotes: Record<FounderNoteId, string>  // one text per rule, see below
}

type SalesConfig = {
  sellingBase: number             // outreach leads = hours * channelResponse * (sellingBase + skills.selling)
  leadToDemoBase: number          // weekly chance = base * (offset + perPain * pain)
  leadToDemoOffset: number
  leadToDemoPerPain: number
  demoHours: number
  demoToTrialBase: number         // chance = base + perFit * fit
  demoToTrialPerFit: number
  trialWeeks: number
  ghostChancePerWeek: number
  silentWeeksToLose: number
  skillGainPerDemo: number
  skillCap: number
  price: { midpoint: number; steepness: number }   // priceFactor curve in price / wtp
  churn: { base: number; perMisfit: number; perBug: number; priceFrom: number; perPrice: number; cap: number }
}
```

Cross checks in `superRefine`: unique ids, one role per segment, `maxHoursPerWeek >= baseHoursPerWeek`, start energy within max, every `mustHave` id is a feature, bucket bounds ascend with only the last unbounded, and every segment has quotes for every bucket, every segment has company name lists, every name combination is unique across segments, the intro has a `goal` card, and every placeholder in the intro (`cash`, `savings`, `living`, `maxWeeks`) and the notes (`week`, `n`, `living`) is a known one.

## Founder's note rules

`selectFounderNote` in `systems/guidance.ts` reads only what the player can see, in weeks 1 to 4. The first matching rule wins and nothing in it recommends a move.

| Order | Condition | Note id | Values |
|---|---|---|---|
| 1 | week is 1 | `first_week` | none |
| 2 | no leads, nothing shipped, no interviews | `no_evidence` | week, living |
| 3 | no leads, nothing shipped, some interviews | `only_interviews` | n = interviews |
| 4 | no leads, something shipped | `built_unseen` | none |
| 5 | leads, no customers | `leads_only` | n = leads |
| 6 | otherwise (or after week 4) | no note | |

## Content: Feature

Used by interview mentions (Phase 1) and by the product system (Phase 2): `buildHours` is the work needed to ship it and `bugsOnShip` the bugs added when it does.

```ts
type Feature = {
  id: FeatureId
  name: string
  buildHours: number
  bugsOnShip: IntRange
  mention: string               // what an interviewee says when asking for it
}
```

## UI store

`apps/web/src/store.ts` wraps the engine in a Zustand store. The `GameState` lives in the store's closure and is never part of the store's state. Screens read only this shape:

```ts
type UiState = {
  view: PlayerView | null       // null on the Start screen
  plan: WeekPlan                // the draft plan for the current week
  plannedHours: number          // from checkPlan
  issues: PlanIssue[]           // from checkPlan; End week is disabled while non empty
  report: WeekReport | null     // the week that just resolved, until dismissed
  tab: 'inbox' | 'plan' | 'pipeline' | 'market' | 'money'   // hiring is a Plan section; the desk shows plan or market in its centre
  hasSave: boolean
  saveNotice: 'incompatible' | 'newer' | 'scenario_changed' | 'broken' | null
  storageNotice: 'unavailable' | 'full' | null   // browser keeps nothing, or would not take the last save
  runsNotice: 'unreadable' | 'unsaved' | null    // best runs could not be read, or not stored
  introStep: number | null      // index of the intro card on screen; null when none. Set to 0 by startRun, never by continueRun
  helpOpen: boolean             // help screen replaces the tab content
  explain: 'runway' | 'cash' | 'energy' | 'hours' | null   // explanation card on screen
  dismissedNotes: string[]      // founder's note ids dismissed in this run; not saved
  shutDownAsked: boolean
  openSections: ('talk' | 'test' | 'build' | 'sell' | 'demos' | 'team' | 'rest')[]  // Plan sections open; all closed each week
  canRepeat: boolean            // a resolved week exists whose plan "Same as last week" can copy
  momentsSeen: number           // notable moments of the report already tapped through
}
```

`repeatLastWeek()` takes the plan of the last `endWeek` in the action log and passes it through `repeatPlan(last, view)` (`apps/web/src/repeatPlan.ts`): regular work stays, one-off decisions (demos, follow ups, chasing, transfers, price, hiring steps) go, and shipped features, used batches and surplus bug fixing are cut back.

Autosave: a `SaveFile` is written under its scenario's localStorage key when a run starts and after every resolved week. `continueRun` replays it. A save from an older `engineVersion`, with another scenario hash, or one that is unreadable or fails to replay is dropped with a notice. A save from a newer `engineVersion` (`isNewerVersion`) is kept, with a notice to reload. The draft plan is not saved. A finished run clears its save when the player leaves it.

## Content: Event

Plan section 4.10, with these rules (Phase 5, engine 0.8.0):

```ts
type ScenarioEvent = {
  id: string
  area: 'validation' | 'sales' | 'product' | 'finance' | 'founder' | 'team'  // must match its file
  weight: number
  once: boolean                 // every event except those that recur on purpose
  cooldownWeeks?: number        // required when once is false
  when: Condition[]             // all must hold for the event to arrive
  from: 'none' | 'customer' | 'lead'
  sender: string
  look: 'letter' | 'note' | 'official'   // default letter; note for personal, official for banks and offices
  text: string                  // 2 to 4 sentences; EUR amounts must be amounts a choice costs or pays
  defaultChoice: string         // costs no hours
  choices: { id: string; label: string; hours: number; effects: Effect[] }[]
}
// Every effect has `chance` (default 1) and `when: Condition[]` (default []). The effect lands only
// if its conditions hold when the message resolves (week end, step 2), checked before any roll.
```

## Phase 4 additions (engine 0.5.0)

- `GameState`: `invoices`, `inbox`, `drawnEvents`, `team {search, candidates, members}`, `company.bookkeepingBacklogHours`, `founder.forcedHours`, `hidden.experiments`, `hidden.payWeeks`, `hidden.teamSkills`.
- `Evidence` is `interview | landing | presale`. `WeekLedger` gained `adSpendCents`, `otherCostsCents`, `otherIncomeCents`.
- `LoggedAction` is `endWeek | respond {messageId, choiceId} | shutDown`.
- `EndingId` gained `shut_down`. `respond(state, messageId, choiceId)` and `shutDown(state)` are public.
- `WeekPlan` and `PlanIssue` gained the fields and codes listed in `docs/decisions.md` (Phase 4).
- `PlayerView` gained `invoices`, `receivablesCents`, `inbox`, `team`, `bookkeeping`, `pendingExperiments`, `committedHours`, `forcedHours`, extra `costs`, and per segment `landingTests`, `presales`, `openLeads`. None holds a pay week, true skill or effect odds.
- Scenario: `experiments.landing`, `experiments.presale`, `finance` (invoice and bookkeeping), `team`, `inbox`, and `events` (from `messages/events.yaml`; effects `cash, energy, bugs, skill, invoicePayChance, churnChance, newLeads, touchLead, lostHours, fixedCost`, each with optional `chance`).

### After Phase 4 (engine 0.6.0)

`WeekPlan.followUps: string[]`, `PlanIssue` `invalid_follow_up`, `LeadView.canFollowUp`, `MessageChoice.costCents` and `monthlyCostCents`, `costs.presaleMinLeads`, `costs.followUpHours`. Scenario: `sales.followUpHours`, `sales.followUpDemoBoost`, `experiments.presale.minLeads`.

### Phase 5 content (engine 0.8.0)

- Effects gained `when`. Events are split into one file per area and must be `once` unless they set `cooldownWeeks` (only `receipts_pile` does). `ScenarioSources.events` is a record of area to file text; `eventsIn(text)` reads one file.
- `companyNames[segment].distinct` names the word that tells companies apart (medical: the surname). `pickName(parts, used, busy, rng)` skips names whose distinctive word an open lead holds; `namePicker(state, leads)` hands out a week's names; `distinctWord(parts, name)` reads the word back.

### Phase 6 UI (engine 0.8.0, no replay change)

- `WeekLedger` and `PlayerView.history` gained `monthlyRevenueCents`, `customers` and `runwayWeeks` at week end. `PlayerView.company.nextMonthEndWeek`. `MessageView.look` from the event's `look`. None changes how a save replays, so `ENGINE_VERSION` stays 0.8.0; the scenario fingerprint changes with `look`, so older saves get the "retuned" notice.

### Design fixes (engine 0.7.0)

- Books: removed `WeekPlan.bookkeepingHours`, `company.bookkeepingBacklogHours`, `PlayerView.bookkeeping`, the `bookkeeping_penalty` report entry and log event, the `bookkeeping_exceeds_backlog` issue, the condition path `bookkeepingBacklog`, and `finance.bookkeeping` in the scenario. The books are the recurring inbox event `receipts_pile`.
- Events may set their own `cooldownWeeks`, replacing the inbox cooldown for that event. (From 0.8.0 an event without `once` must set it.)
- `MessageView.eventId`: the scenario event a message comes from, so the same kind of message can be recognised. Not a hidden value.
- Invoices: `hidden.waitsForChase` lists invoices whose customer pays only once chased (their pay week is null until a chase works). Scenario segments gained `waitsForChaseShare`; `finance.writeOffWeeks` is 8.
- Landing tests report after 1 week (`experiments.landing.weeks` 1). The sign up chance is `(signupBase + signupPerPain * pain) * priceFactor` at the price when the test starts. Every `signupsPerLead` (5) sign ups become one open lead; `landing_result` entries carry `leads`.
- `Lead.source`: `outreach | landing | inbox | team`, how the lead was found. State only, for the bots' report. `addLeads` in `systems/sales.ts` is shared by outreach, landing tests and inbox effects. `TeamOutput.selling` is the selling skill of the member's outreach.
- Team roles may set `selling`, the selling skill of that member's outreach (salesperson 0.3). Without it the founder's skill is used.
- Energy: `founder.energy.fullAt` (70). Sales chances are multiplied by 1 from `fullAt` up, falling linearly to `lowFactor` at `lowBelow`. `PlayerView.founder.tiredBelow` carries `fullAt`.
- Pre-sales pitch `batchSize` cold prospects per batch, no leads needed, at most `maxBatchesPerSegment` (3) batches per market over the run (`PlanIssue` `presale_cap {segmentId, left}` replaces `presale_needs_leads`; `costs.presaleMaxBatches`, `costs.presaleRefundWeeks`, `SegmentView.presaleBatchesLeft` replace `costs.presaleMinLeads`). Each commit pays a deposit of one month, counted in `WeekLedger.revenueCents`, and becomes a lead in the new stage `committed` (`Lead.depositCents`, source `presale`). Once every must have of its market has shipped it becomes a customer with `Customer.prepaidMonths: 1` (the next month end sends no invoice). After `refundWeeks` (8) without them, the deposit is refunded (other costs) and the lead is lost with `lostReason: 'refunded'`. `LeadChange` gained `committed` and `refunded`.
- Trials last 1 week (`sales.trialWeeks`). `inbox.guaranteeBelowOpen` (2): a week that drew no message draws one anyway while fewer than that are open. Early events have lower week gates.
- `Lead.channel`: the outreach channel that found an outreach or salesperson lead.
- Outreach saturation: `sales.saturationHours` (12), `saturationWeeks` (3), `saturatedFactor` (0.3). Founder and salesperson outreach on one channel in one market counts fully up to 36 h over the current and previous two weeks, beyond that at 0.3 per hour. `costs.saturationHours` and `costs.saturationWeeks` carry the rule to the view.
- `new_leads` entries carry `wornOut` when some outreach hours went beyond saturation; the results screen says the channel is wearing out. `hireEconomics(state)` (public): role, cost so far, customers the hire found, cost per customer, and money received per customer over the run.
- `PlayerView.founder.livingCostCentsPerMonth` (weekly living costs x `weeksPerMonth`), `TeamView.roles[].weeklyHours`. Intro cards may use `{livingMonth:eur}`.

### Second UI pass (engine 0.8.0, no replay change)

- `MessageChoice.possibleCostCents`: cash that may go out (effect with `chance` below 1 or a `when`). `costCents` now counts only certain cash costs. The UI shows the first as a risk, never with odds.

### Phase 7 part 1: post-mortem (engine 0.8.0, no replay change)

- `WeekLedger.energyEnd` and `WeekLedger.hours`, and the `OddsEvent` log entry (above). Logging reads rolls already made and never draws, so every outcome and the bot report stay the same and `ENGINE_VERSION` stays 0.8.0.
- `buildPostMortem(state): PostMortem` (`src/postmortem.ts`, public) throws while the run is going. It reads the event log, knowledge, hidden state, ledger, customers, leads and action log, and returns data only (ids, counts, cents, weeks); the UI words it.

```ts
type PostMortem = {
  scenarioId: string; seed: string; ending: EndingId; week: number; maxWeeks: number
  names: { segments; features; buckets: Record<string, string> }   // content names for the ids
  cause: PostMortemCause        // id: bankrupt_no_customers | bankrupt_hire | bankrupt_churn |
                                //   bankrupt_below_costs | burnout | still_searching | sustainable | shut_down
                                // plus peak and end revenue, monthly costs with and without the hire,
                                // customers won and lost, weeks over base, covered % and week, runway
  chain: ChainItem[]            // up to 3 earlier steps by the ending's rule, every final week step, then 'ending'
  suggestions: SuggestionId[]   // every matching rule in fixed order, always ending with 'sample_sizes'
  markets: MarketTruth[]        // role, true pain bucket, interviews and their average bucket, landing,
                                // pre-sale, willingness to pay (rounded to 10 EUR), customers, must haves
                                // with mentions and ship week
  misreads: Misread[]           // interviews_high | interviews_low (cause politeness or chance),
                                // experiment (landing or pre-sale at half or double normal, 2 or more off),
                                // went_against (strongest evidence ranked the good market first, work went elsewhere)
  hours: { total; byActivity; weeksOverBase; baseHoursPerWeek; focusSegmentId; focusSellingHours }
  money: { savingsStartCents; savingsEmptyWeek; livingFromSavingsCents; movedByYouCents;
           movedAutomaticallyCents; companyPaidYouCents; customersPaidCents; peakRevenueCents; hire }
  luck: { items: LuckItem[]     // at most 4: results that changed which market looked best, then by size
          netCustomers: number  // all luck in customers, positive when it helped
          averageWouldChange: boolean | null }
}
```

- The focus market is the one with the most selling hours plus building on features only it needs. The good market is the role with the highest pain.
- Luck in customers: a trial is one, a demo is worth the run's normal trial rate, a lead agreeing to a demo the demo and trial rates, a lead found and a landing sign up (per `signupsPerLead`) the run's lead to customer rate, a pre-sale commit one, churn minus one. Money items (never paying, inbox gambles) divide by a customer's worth: the price for as long as one usually stays, at most half a run.
- UI store: `postMortem: PostMortem | null` and `suggestion: SuggestionId | null` (set only once the run has ended), actions `newRun()` and `sameMarketAgain()`. `StoreDeps.profiles` (a `ProfileStorage`, in memory unless given).
- Profile, per scenario under `founder-mode.profile.v1.<scenarioId>`: `{ current: { seed, replay, suggestion } | null, lastSuggestion, runs: RunRecord[] }` with `RunRecord = { seed, replay, ending, weeks, peakRevenueCents }`, at most 200. A run is recorded once, when its post-mortem is first built; the suggestion chosen then (the first not equal to `lastSuggestion`) is kept for reloads.

### Phase 7 part 2: milestones (engine 0.8.0, no replay change)

- Content: `Scenario.milestones`, a list in display order. Each has `id`, `name` and `onBar` (default true), and one of: `kind: count` with `of: interviews | deposits | customers | hires` and `target`; `kind: revenue` with `covers: company | all` (monthly revenue of active customers against the run's monthly fixed costs, salary included, plus for `all` the founder's living costs over a month); `kind: weeks` with `target`. No money threshold lives in code.
- `GameState.milestones: { id, week }[]`, in the order reached. `checkMilestones(state)` runs after the ending check in `endWeek` (step 11 after 12): a week counts as survived once it is over, unless it ended the run in bankruptcy, burnout or a shut down.
- `WeekReport.milestones: MilestoneView[]` (`{ id, name, week }`) reached that week. `PlayerView.milestones: { reached: MilestoneView[]; next: NextMilestoneView | null }` with `NextMilestoneView = { id, name, unit: 'count' | 'cents' | 'weeks', current, target }`, the first milestone on the bar not yet reached. `PostMortem.milestones: MilestoneView[]`.
- Milestones are derived from the actions, so saves replay to the same milestones; the scenario fingerprint changes, so saves from before get the "retuned" notice.

### Phase 7 part 3: coworking desk and organised stage (engine 0.9.0)

- `ENGINE_VERSION` 0.9.0: the offer arrives for sure and accepting changes rules, so old saves no longer replay the same.
- Content: `Scenario.officeStages: { id, name, monthlyCents, energyPerWeek (default 0), channelFactors: Partial<Record<ChannelId, number>> }[]`, the first being the start. `Scenario.organisedAt: string[]`, milestone ids. Events gained `trigger: Condition[]` (default none): such an event (must be `once`) arrives for sure in the first week any trigger holds and `when` holds, never through the draw. New effect `{ type: 'moveOffice', stage }`. New condition path `customers.won` (customers ever won).
- `GameState.company.officeStage` (stage id) and `GameState.modifiers: Modifier[]` with `Modifier = { id, source: 'office', energyPerWeek, channelFactors }`. `moveOffice(state, stage)` (`systems/office.ts`) puts the stage's rent under the fixed cost id `office` and replaces the office modifier. Each week `energyPerWeek(state)` is added to the energy change before the 0 to max clamp (`applyFounderWeek`); outreach response is multiplied by `channelFactor(state, channel)`.
- Triggered messages sit outside the draw: they do not count as open messages for `openLimit` or the quiet-week guarantee, and are made after the draw, so they never change which events are drawn.
- `MessageChoice.monthlyCostCents` counts what a move adds: the new stage's rent minus the current one.
- `uiStage` turns `organised` in the week the first `organisedAt` milestone is reached (after milestones in `endWeek`). `WeekReport.uiStageChanged` is true in that week only.
- `PlayerView.company.officeStage: { id, name }`; `PlayerView.funnel: { demosHeld, trialsFromDemos }` counted from the demo outcomes that happened (shown in the organised pipeline).

### Phase 7 part 4: best runs (web only)

- UI store: `runs: RunRecord[]` (this scenario's, from the profile) and `replaySeed(seed)`, which starts a run on that seed flagged as a replay. `bestRuns(runs)` (`apps/web/src/bestRuns.ts`) returns `{ ordinary, replays }`, each `{ longest, revenue, wins (best three), winCount }`.

### Walk-in leads (engine 0.10.0, after Phase 7)

- Content: `OfficeStage.walkIns?: { segment, leadsPerWeek }`, the market walk-ins come from and their mean rate. The segment must exist.
- `Modifier.walkIns: { segmentId, leadsPerWeek } | null`. `applyWalkIns(state, rng)` (`systems/office.ts`) runs after sales in `endWeek`: per modifier, the whole part of the rate plus one more with the fraction's chance. No draw happens without such a modifier.
- `LeadSource` gained `walk_in`; `Lead.walkInFrom?: string` is the office stage id. `LeadView.source` and `LeadView.walkInFrom` (the office stage's name, else null).
- `ReportEntry` `{ kind: 'walk_in_leads', segmentId, count, place }`. `OddsKind` gained `walk_ins` (luck counts them like outreach leads).
- `PostMortem.walkIns: { place, segmentId, leads, customers }[]`, per office and market.
- Bots: `rankMarkets(scenario, view)` (exported from `validateThenBuild.ts`) is the reading bot's evidence ranking; it takes an office move with walk-ins only when that market ranks first.

### Second scenario, part A: scenario independence (engine 0.10.0, no replay change)

- Content: `ScenarioSources.sharedEvents: Record<EventArea, string>`. `areaEvents(area, own, shared)` merges one area (throws on an unknown or twice placed shared id, or an event in the wrong area's file). `SCENARIO_IDS` lists the built in scenarios in picker order; `isScenarioId(id)`. `scenarioCatalogue(): ScenarioAbout[]` with `ScenarioAbout = { id: ScenarioId; name: string; lines: string[] }`. The parsed Kantino scenario and its fingerprint are unchanged.
- UI store: `UiState.scenarios: ScenarioAbout[]`, `UiState.scenarioId` (the picked scenario; `runs` and `hasSave` are its own), action `selectScenario(id)` (ignored while a run is open). `StoreDeps.scenario?: (id) => Scenario` (was `() => Scenario`), `StoreDeps.catalogue?: () => ScenarioAbout[]`. `startRun`, `newRun` and `replaySeed` start the picked scenario; `sameMarketAgain` the finished run's.
- `SaveStorage` is per scenario: `load(scenarioId)`, `save(file)` (under `file.scenarioId`), `clear(scenarioId)`; browser key `founder-mode.save.v1.<scenarioId>`, with a save under the old key `founder-mode.save.v1` moved on first load. `memoryStorage().current(scenarioId?)`. `ProfileStorage` gained `lastScenario()` and `setLastScenario(id)` (browser key `founder-mode.scenario.v1`).
- Scene: the drawing is chosen by `view.company.officeStage.id` (`kitchen_table`, `coworking_desk`, else the kitchen table); the chip shows `officeStage.name`. The labels `scene.kitchen_table` and `scene.coworking_desk` are gone.
- Bots: `BotArgs.scenario: string | null`. `ReportInput.playtest?: { segment, note }`. `Strategy.describe?(scenario)` and `describeStrategy`. `readerEventIds(scenarioId)` replaces `READER_EVENT_IDS`. `BOT_SCENARIOS` (`packages/bots/src/scenarios.ts`) holds the playtest market, features and channel per scenario. `asSection` and `mergeReportFile` (`reportFile.ts`) write one `#` section per scenario.

### Second scenario, part B: Zollstock (engine 0.10.0)

- Content: `SalesConfig.referral: { chancePerFit, chancePerBug, demoBonus }` (all required; zero switches referrals off). Scenario `zollstock` in `SCENARIO_IDS`, with its own folder; its events place no shared events, so shared ones follow its own per area.
- `LeadSource` gained `referral`; `Lead.referredBy?: string` (customer id). `LeadView.channel: ChannelId | null` and `LeadView.referredBy: string | null` (the customer's name).
- `applyReferrals(state, rng)` and `referralChance(state, segmentId)` (`systems/sales.ts`), after walk-ins in step 6: per customer paying since an earlier week, chance `max(0, chancePerFit * fit - chancePerBug * bugs)`; no roll at 0. Referred leads ask for a demo with the weekly chance x (1 + `demoBonus`).
- `ReportEntry` `{ kind: 'referral_lead', segmentId, leadId, name, from }`. `OddsKind` gained `referrals`.
- `PostMortem.sources: { key, leads, customers }[]`: keys `outreach:<channel>`, `team:<channel>`, `landing`, `presale`, `inbox`, `walk_in`, `referral`; most customers first.
- Scene: drawing `trades_yard`.
- Bots: `RunResult.roles` (every segment's role, report only). `BotArgs.desk` and `deskComparison(scenario, runs, seedPrefix)` (`desk.ts`). `BOT_SCENARIOS.zollstock`. The reader's Zollstock table maps each event to its Kantino twin (`ZOLLSTOCK_TWINS`).

### After part C: post-mortem landing line (engine 0.10.0, no replay change)

- Content: `Scenario.postMortemNotes?: { weakLanding?: string }`, read from `messages/intro.yaml`. Set only where the landing signal is weak by design (Zollstock); absent in Kantino, whose fingerprint is unchanged.
- `PostMortem.notes: { weakLanding: string | null }`. The markets section shows it ("About that test") for every market with a landing test.

### Phase 8: price as a decision (engine 0.11.0)

- Content: `SalesConfig.priceSlope` is replaced by `SalesConfig.price: { midpoint, steepness }`; `SalesConfig.churn` gained `priceFrom` and `perPrice`. Both scenarios: midpoint 1.35, steepness 10, priceFrom 1.0, perPrice 0.15.
- `priceFactor(state, segmentId)` uses `priceCurve(scenario, ratio)` (`systems/market.ts`); `priceChurn(state, segmentId, priceCents)` is the price share of churn. `churnChance(state, segmentId, priceCents?)` includes it only with a price.
- `LostReason` gained `price`; `LeadChange` gained `declined_price`. `Customer.churnReason?: 'price'`. `ReportEntry` `customer_churned` gained `overPrice: boolean` (false for a customer an inbox answer lost).
- `ChainItem.overPrice: boolean` (for `customer_lost` and `lead_declined`); a final week `lead_declined` now also covers trials lost over the price. `MarketTruth.priceNos: { trials, cancellations }`.
- A price change still applies to new customers only: every customer keeps the price they signed at, a pre-sale customer the price of the pitch.
- Web: labels `pipeline.lostPrice`, `results.entry.declined_price`, `results.entry.customer_churned_price`, `pm.chain.customer_lost_price`, `pm.chain.lead_declined_price`, `pm.market.priceNos`, `pm.market.priceNosValue`. `lostText(lead, stage)` (`screens/Pipeline.tsx`).
- Saves from 0.10.0 get the restart notice.

### Phase 8: budget quotes in interviews (engine 0.11.0, no change to the main random sequence)

- Content: `Segment.budgetQuotes: string[]` (at least 4, each with `{amount}`), `InterviewConfig.budgetChance` and `budgetNoiseSd`. Both scenarios: 5 quotes per market, chance 0.25, noise 0.25.
- `budgetHint(state, segmentId, index)` (`systems/experiments.ts`): interview number `index` of a segment has a budget quote with `budgetChance`; the amount is `wtpCents * (1 + N(0, budgetNoiseSd))`, kept within 0.4 to 1.8 times it, rounded to 50 EUR below 1,000 EUR and to 100 EUR above (below 200 EUR to the optional `InterviewConfig.budgetSmallStepCents`, 10 EUR in Gratwanderung). It draws from its own stream, seeded by `${seed}/budget/${segmentId}/${index}`, so the game's `rng` is untouched. Willingness to pay is drawn per segment from the segment's range and has no link to the role.
- `InterviewEvidence.budget?: { quoteIndex, amountCents }`; `InterviewView.budget: { quote, amountCents } | null` (the quote with `{amount}` unfilled; the web fills it with `formatEuro`, `budgetText` in `screens/Market.tsx`). `MarketTruth.budgetHints: { count, meanCents } | null`.
- Web: the Market screen shows a budget quote as one more quote under the interview; labels `pm.market.budgetHints`, `pm.market.budgetHintsValue.one/other` next to "Would pay".
- Bots: `Pricer.price(view, focus)`; `budgetHints(view, segmentId)`; `SearchRule.hints`. Report part `price` (`--parts`), `RunResult.priceChanges` and `RunResult.wtpCents` (report only).

### Phase 8 part 4: hardening (web only, no engine change)

- `SaveStorage.load` returns `SaveFile | 'unreadable' | null` (`UNREADABLE`: stored text that is not JSON or not shaped like a save, `isSaveFile`). `save(file)` returns false when the browser would not take it. `available()` is false when storage is blocked.
- `ProfileStorage.save` returns a boolean; `unreadable(scenarioId)` is true after a load found best runs it could not read (`readProfile`). Before anything else happens, the stored text is copied to `founder-mode.profile.v1.<scenarioId>.unreadable`, and an existing copy is never replaced.
- UI store: `storageNotice`, `runsNotice` (above), actions `recover()`, which goes back to the Start screen without writing anything, and `dismissStorageNotice()`. `ErrorBoundary` (`components/ErrorBoundary.tsx`) wraps the screens.
- The web build parses content YAML at build time (`apps/web/build/yamlAsJson.ts`). `yaml` in the bundle is `src/yamlShim.ts` (`JSON.parse`), and the scenarios are unchanged.

### Phase 9 part B: the freelancer (engine 0.12.0)

- Content: `team.freelance` (`FreelanceConfigSchema`): `hoursOptions` (10, 20), `outputShare` (0.9), `onboardingFactor` (0.5), `noticeWeeks` (1), `extraBugsPerFeature` (1), `roles.developer|salesperson: { name, centsPerHour, selling? }`, `names`. No hidden values and no random draws: a run that never books one plays exactly as before.
- `TeamState.freelancers: FreelanceBooking[]` (`{ id, name, role, hoursPerWeek, bookedWeek, startWeek, endWeek | null, nextHours: { week, hours } | null, workedHours }`), `TeamState.freelanceFeatures: FeatureId[]` (features a freelance developer worked on), `TeamState.freelanceBugs` (extra bugs they brought).
- `WeekPlan.freelance: FreelancePlan` = `{ book: { role, hoursPerWeek } | null, hoursPerWeek: number | null, end: boolean, build: FeatureId | null, outreach: { segmentId, channel } | null }`. `PlanIssue` `invalid_freelance`: a booking while one runs past this week, hours outside `hoursOptions`, notice or hours without a running booking, booking together with notice or hours, an unknown feature, market or channel.
- Week order: the freelancer's output is computed after the hire's (step 5), builds what the founder and hire leave of its feature, or does outreach after the hire's (step 6, lead source `freelancer`, its own selling skill, no demos). In step 7 the week's bill is charged (`WeekExtras.freelanceCents`, `WeekLedger.freelanceCents`), hours worked are recorded, and booking, hours (from next week) and notice (last week = this week + `noticeWeeks`) take effect. A booking starts the week after it is made; its first week works at `onboardingFactor`.
- A feature that ships after a freelance developer worked on it gets `extraBugsPerFeature` on top of its own draw; `ReportEntry` `feature_shipped` gained `freelanceBugs`.
- The bill counts as a company cost in `profitableForMonths` (the win test), in `netChangeCents` (runway) and, through `monthlyCompanyCostsCents` (fixed costs plus an open booking over a month), in the revenue milestones and the runway before 4 weeks.
- `ReportEntry` gained `freelance_booked`, `freelance_hours`, `freelance_notice`, `freelance_ended`, `freelance_output { role, hours, onboarding }`, `freelance_bill { name, amountCents, hours }`. `LeadSource` gained `freelancer`; post-mortem source keys `freelancer:<channel>`.
- View: `TeamView.freelance: FreelanceView` (`roles`, `hoursOptions`, `outputShare`, `onboardingFactor`, `noticeWeeks`, `extraBugsPerFeature`, `canBook`, `current: FreelancerView | null` with hours, rate, weekly cost, `working`, `endWeek`, `nextHours`, `workHoursThisWeek`), `company.freelanceCentsPerWeek`, `costs.freelanceNoticeWeeks`. `PostMortem.money.freelance: FreelanceEconomicsView | null` (`roles`, `costCents`, `weeks`, `bookedHours`, `ownHoursCents` (worked hours at living costs per base hour), `paid` (false unless the run ended sustainable), `buildHours`, `outreachHours`, `leadsFound`, `customersGained`, `extraBugs`). A freelancer that did not pay is explained with `pm.money.freelanceUnpaid`.
- Web: `setFreelance(change)` in the store; a new week's draft keeps the freelancer's task (`carryFreelance`), and "Same as last week" copies it. Labels `freelance.*`, `results.entry.freelance_*`, `pm.money.freelance*`, `pm.source.freelancer`, `pipeline.source.freelancer`, `money.freelance`, `coming.freelanceEnd`, `plan.sum.freelancer`, `plan.sum.freelanceBook`.
- Bots: `Behaviours.tiredFreelance` and `tiredFounder(budget, below, rent, id)` (the energy check), `StrategySpec` kinds `tired` and `earlyHireWide`, report part `tired` (only on request). Target 19 compares the freelance developer and `validate_then_build_early_hire` (wide copy, id `freelance:compare validate_then_build_early_hire`) with the careful bot. `Behaviours.freelance: FreelanceRule`, `withFreelancer(rule, id)`, `StrategySpec` kind `freelance` (role, hours, rate override, weeks), `Strategy.adapt(scenario)` (diagnostics only), `RunResult.freelance`, report part `freelance` and target 19 (`ReportInput.marketBuildHours`).
- Saves from 0.11.0 get the restart notice.

### Phase 9 part C1: long mode plumbing (engine 0.13.0)

- Content: `GAME_MODES = ['standard', 'long']`, `GameMode`. A scenario file may hold `modes: { long: {...} }`, laid over the file by `loadScenario(id, mode)` (`mergeOverride`: objects merge key by key, lists and values replace). The 60 week game is the file without `modes`, so its parsed scenario and fingerprint are unchanged (Kantino `d876a5eeff2a14cc`, Zollstock `0e43131861f8ed2e`, tested). Long mode adds `mode: 'long'`. `scenarioModes(id)`, `modesIn(source)`, `ScenarioAbout.modes`. Only Kantino has a long block.
- New optional scenario values, absent in the 60 week game: `win.profitableMonths` (2 when absent), `founder.livingSteps: { week, centsPerWeek }[]`, `sales.marketSaturation: { floor }`, `team.maxMembers`, `team.maxHires` (both 1 when absent), `team.managementHoursPerMember` (0 when absent).
- Kantino long: 104 weeks, win on three profitable months, living costs 742.50 EUR a week from week 53, market saturation with floor 0.3, up to 4 people at once and 8 hires in all, 2 h a week each to manage, full time developer 7,000 EUR and salesperson 6,050 EUR per 4 week month (40 h), milestones up to `weeks_104`.
- Market saturation: outreach response in a market is multiplied by `max(floor, 1 - leads found there before this week / the market's hidden size)` (`marketFactor`). Every lead counts, whatever found it.
- Team: `WeekPlan.letGo: string | null` (a member id, was a boolean), `WeekPlan.teamTasks: Record<memberId, TeamTask>` with `TeamTask = { kind: 'build', featureId } | { kind: 'outreach', segmentId, channel }` (replaces `teamBuild` and `teamOutreach`). `teamOutput` returns one output per working member in hiring order; developers never build more than the founder and earlier members leave, salespeople never hold a demo someone else holds. `Lead.foundBy` names the member who found a lead. `workingMembers`, `activeMembers`, `canHire`, `maxMembers`, `maxHires`, `managementHours` (`systems/team.ts`). Searching and hiring need room (`canHire`): fewer active members than `maxMembers` and fewer hires so far than `maxHires`. Management hours count as admin in `hoursByActivity`.
- View: `PlayerView.mode`, `founder.nextLivingStep`, `TeamView.members` (replaces `member`), `canHire`, `maxMembers`, `hiresLeft` (replaces `hadHire`), `MemberView.managementHours`, `costs.teamMaxMembers`, `teamMaxHires`, `managementHoursPerMember`. `ReportEntry` `living_costs_changed { fromCents, toCents }`.
- Post-mortem: `money.hires: HireEconomicsView[]` (replaces `hire`), one per hire; `hireEconomics(state, member?)`, `hiresEconomics(state)`. The "without the hire" costs of the bankrupt cause take off every salary.
- Saves: `SaveFile.mode?: 'long'` (missing for the 60 week game). `SaveProblem` gained `mode`. Web: saves and best runs are kept per slot, `slotOf(scenarioId, mode)`: the scenario id for the 60 week game (the keys of every earlier version) and `<id>.long` for long mode. `ProfileStorage.lastMode`/`setLastMode`. Store: `mode`, `selectMode`, `setLetGo(memberId)`, `setTeamTask(memberId, task)`.
- Bots: `--mode standard|long|all` (default standard); one report section per scenario and mode (`# Kantino, long mode`). `Task.mode`, `Task.seeds` (a subset of seeds), `Job.seeds`. Forced answer runs are played only on seeds where the careful bot saw the event; the others reuse its result (`forcedSeeds`, tested exact). `ReportInput.maxWeeks` gives long mode ten week bins in "Week the run ended".

### Phase 9 part C2: part time beside full time, long mode team bots (engine 0.13.0)

- Content: `TeamRoleSchema.partTime?: { monthlyCents, weeklyHours }`, the same role part time, offered beside full time. Absent in the 60 week game, whose one hire per role keeps its tuned terms. Kantino long: developer 3,500 EUR and salesperson 3,025 EUR a month for 20 h, half the full time salary.
- Engine: `WeekPlan.searchPartTime?: boolean` (missing means full time, so 60 week plans keep their shape); `PlanIssue` `part_time_not_offered` when the role has no part time terms. `TeamSearch`, `Candidate` and `TeamMember` carry `partTime?: true` (left out for full time). `roleTerms(state, { role, partTime })` gives the salary and hours used for output, salary, severance, the view and the post-mortem. The engine version stays 0.13.0: 60 week replays are unchanged, and long saves made before are refused by their fingerprint.
- View: `TeamView.roles[].partTime: { monthlyCents, weeklyHours } | null`, `TeamView.search.partTime`, `CandidateView.partTime`, `MemberView.partTime` and `MemberView.weeklyHours`. Web: a role with part time terms shows a full time and a part time search row (`team.fullTime`, `team.partTime`); `setSearchRole(role, partTime?)`.
- Bots: `Behaviours.team?: TeamRule | null` (`{ start: 'covered' | 'savings', partTime, freelanceFirst }`); in long mode the careful bot uses `CAREFUL_TEAM` unless another hire or freelancer rule is set. `Strategy.modes` (the team variants are long mode only). `PlanBuilder` leaves the working team's management hours out of the budget. `RunResult` gained `year2Weeks`, `year2DecisionWeeks`, `at60`, `hires[]`, `lettingsGo`, `teamAtEnd`, and `freelance.role`. Report parts `team` (team variants on the wide seeds, long mode) and `energy` (the careful bot at 45 to 60 h); long mode sections are written by `longReport.ts` (targets 20 to 30, the team, targets 20, 28 and 29, the energy curve).

### Phase 9 part C2a: energy slope and customers who stop paying (engine 0.14.0)

- Energy: `founder.energy.weeklyRecovery` replaces `weekWithinBase` and applies every week: energy changes by `weeklyRecovery + perHourOverBase x hours over the base + perRestHour x rest hours`. Both scenarios: +3, -1 per hour over 50 (was -2), so 53 h a week holds steady.
- Write offs: `Customer.churnReason` gained `stopped_paying`. When an invoice is written off, its customer is lost that week (`churnedWeek`), leaves the count and revenue, and gets no more invoices; their other open invoices stay open. `ReportEntry` `invoice_written_off` gained `serviceStopped`. `applyFinanceWeek` returns `stopped` (customer ids). Post-mortem: `PostMortemCause.customersStoppedPaying` beside `customersLost` (which no longer counts them), `ChainKind` `customer_stopped_paying` (the write off itself is then not a separate step). The bankrupt-from-churn cause and the churn suggestion count both.
- Never-pays shares per invoice a quarter of before: Kantino 1.25%, 0.75%, 2%; Zollstock 1.5%, 0.75%, 1.25%.
- Bots: `ENERGY_BUDGETS` adds 53 h. Long mode target 29 restated (hiring from revenue +2 over solo, on savings below solo).

### Phase 9 part C2b: the second year's events (engine 0.14.0)

- Content: `shared/events/year2.yaml`, events of the second year shared by every scenario with a long mode, any area, the same event schema. `ScenarioSources.longEvents` holds it; `parseScenario(sources, 'long')` appends its events after every area's own, and the 60 week game never loads it, so 60 week scenarios, fingerprints and games are unchanged. 57 events, every one gated to week 53 or later (10 to week 80, 4 to week 90), so a long run's first year also plays as before. Two recur on purpose (`renewal_review`, cooldown 8 weeks; `loyalty_discount`, 10), as renewals do; two arrive for sure (`rent_rise_letter` and `company_birthday`, week 53).
- Bots: reader answers for the 57 events in `SHARED_READER`. `RunResult.chases` (`count`, `hours`, and what each chased invoice would have done unchased: `wouldPay`, `waited`, `never`, hidden truth for the report) and `plannedHoursTotal`. Report section "Chasing invoices" in every mode.

### Phase 9 part C3: chasing and admin by the team (engine 0.14.0)

- Engine: `TeamTask` gained `{ kind: 'admin' }` (chasing and admin only), and `build` and `outreach` tasks an optional `admin?: boolean`. A member on chasing and admin first chases overdue invoices that are not in the founder's `WeekPlan.chase` and that no earlier member took, oldest first, `finance.chaseHours` each, then works with the hours left (a salesperson holds demos with any hours left either way). `FreelancePlan.admin?: boolean` does the same for the freelancer after the team, then builds or does outreach. `TeamOutput.chases`, `FreelanceOutput.chases`, `teamChases(team)`. `chaseInvoices(state, plan, rng, delegated)` and `applyFinanceWeek(..., delegatedChases)` roll the team's chases after the founder's, with the same chance each. `ReportEntry` `team_chased { count }`. Missing `admin` means no chasing, so plans and saves keep their shape; the engine version stays 0.14.0 (60 week replays are unchanged, long saves are refused by their fingerprint).
- View: `LeadView.foundBy: string | null`, the id of the member who found a lead (team leads only).
- Content, Kantino long only: `sales.saturationHours` 24 (12 in the 60 week game), salesperson `selling` 1.0 (0.3).
- Bots, long mode only: the careful bot and every bot built on it set their price as `price_aware` does (`PriceSearch(PRICE_RULE)`) unless they have their own pricer; the founder chases `max(3, ceil(customers / 3))` invoices a week; once someone works on the team (`Behaviours.chaseBy`, default `team`) the first working member takes chasing and admin and the founder chases none; a salesperson is let go after 16 weeks unless the customers they found pay half their salary.

### Phase 9 part D: funding (engine 0.14.0, long mode only)

- Content: `ScenarioFile.funding?: FundingConfig` (long block only): `rounds.angel` and `rounds.seed` (`RoundConfig`: name, prepHours, pitchHoursPerMeeting, secondLookHours, termSheetWeeks, closingWeeks, dueDiligenceHours, barMonthlyCents, barText, amountCents range, preMoneyFloorCents, revenueMultiple, optional milestone `{ multiple, weeks }` and withdrawDrop, investors), appetite range, noiseSd, pitchBase, pitchPerSelling, growthWeight, growthFactor range, flatGrowth, runwayMarginWeeks, churnShare, focusShare, `updates` (properHours, shortHours, and confidence changes), startConfidence, moodAt, valueRevenueMultiple, `growing { runwayMonths, quarterGrowth }`. `experiments.landing.maxTestsPerSegment?` (long: 3). Condition paths `funding.raised`, `funding.mood` (-1 none, 0 worried, 1 patient, 2 pleased), `funding.milestoneMissed`. Effect `investorConfidence { delta }`. `shared/events/funding.yaml` (`ScenarioSources.fundingEvents`), appended after the year 2 events in long mode, every event gated on `funding.raised >= 1`.
- State: `GameState.funding: FundingState` (`round`, `investors: Investor[]`, `stakes: Stake[]`, `milestone`), `hidden.funding: HiddenFunding` (`appetite` per investor, `confidence`). `EndingId` gained `growing`. `WeekLedger.investmentCents` (never revenue, never in `netChangeCents`). Random draws happen only on funding actions, so a run that never raises plays as before.
- Plan: `WeekPlan.funding?: FundingPlan` (`start`, `pitchHours`, `secondLooks`, `accept`, `decline`, `stop`, `update`); missing means nothing. `PlanIssue` `invalid_funding`, `landing_limit`. Funding hours count as admin.
- Turn: funding step after the team and before finance (`applyFunding`): updates and milestone, term sheets, stop or start, second looks, first meetings, closing. Endings: at the last week, not profitable enough for Sustainable, a run with investors ends `growing` when `growingHolds`.
- View: `PlayerView.funding: FundingView | null` (rounds, round, canStart, investors, capTable, founderShareBp, raisedCents, mood, milestone, updateDue, updateHours, valueCents, valueRevenueMultiple). `SegmentView.landingTestsLeft: number | null`. `ReportEntry` gained `round_started`, `round_stopped`, `investor_met`, `second_look`, `term_sheet`, `terms_accepted`, `terms_lapsed`, `terms_withdrawn`, `round_closed`, `investor_update`, `funding_milestone`.
- Post-mortem: causes `bankrupt_while_raising`, `bankrupt_after_raise`, `growing`; `money.funding: FundingEconomics | null` (rounds started, investors met, raised, stakes, founder share, company value, founder value, hours).
- After tuning: `FundingConfig.scoreExponent` (score = (monthly revenue / bar) ^ exponent x growth x pitch x noise), `FundingConfig.followOnAppetite { pleased, worried }` (the investors on board scale the next round's appetite), update hours are whole hours. An investor is met at most once a run (`unmetInvestors`); a round needs one left (`RoundView.investorsLeft`). `FundingEconomics.pitchedTooEarly`. `PlayerView.history[].investmentCents`.
- Bots: `RunResult.funding` (raised, rounds, founder share and value, first money week, rounds started, bankrupt while or after raising, pitched too early); report part `funding` (`--parts funding`, long mode), targets 31 to 37 (`evaluateFundingTargets`), the "Raising money" table; Growing counts as a win (`isWin`). `docs/seeds.md` rows can be long mode (`kantino (long)`), with Growing reached by the raising bots.
- Web: Plan section `raise` ("Money from investors", organised "Raise"), `setFunding`, `noFunding()`; a chasing and admin chip on every working member and the freelancer; "Who owns what" (organised "Cap table") on the Money tab; investment weeks marked on the statement; landing tests left per market in long mode; the post-mortem's funding lines; best runs count Growing as a win and show the founder's share (`RunRecord.founderShareBp`).

### Plan 2 step 5: funded founder salary and weak-traction terms (engine 0.14.0)

- Content: `FundingConfig.founderSalaryCents?` becomes a visible fixed company cost named "Founder salary" when the first round closes. `RoundConfig.weakTractionTerms?` lowers the cheque and pre-money valuation before that round's visible revenue bar, so a premature raise is costly in its terms rather than in a hidden pass chance. Both are Kantino long-mode content: its changed fingerprint refuses old long saves while all 60 week replays remain unchanged.

### Step 3: situational events as a general system (engine 0.14.0)

- Condition language (closed grammar `path op number`, zod-validated): new paths `team.size`, `runwayWeeks` (the runway shown, or the weeks left when money is not shrinking), and the sender paths `sender.overdue` and `sender.silent`. Sender paths read the message's sender and may only appear in an effect's `when` of an event with a customer or lead sender (`EventSchema` refuses them in `when`/`trigger` and in events from nobody). `SENDER_PATHS`.
- Engine: `conditionsHold(state, conditions, sender)` and `conditionValue(state, path, sender)`; effects pass their message. `viewConditionValue(view, path, message)` and `viewConditionsHold` read the same paths from `PlayerView` (a bot test checks every path agrees with the engine on played runs), so outcomes depend only on what the player sees. `PlayerView.customersWon`, `customersLost`.
- Content: the year 2 chase effects declare their situation (`invoicePayChance` with `when: [sender.overdue == 1]`). The 60 week files are unchanged, so their fingerprints stay locked.
- Bots: `fromConditions(event, view, message)` reads an answer off the declared conditions; reader rules marked `READ_CONDITIONS` (18 Kantino and shared events, and their Zollstock twins) use it instead of hand-written code.
- Authoring rule for new content: a condition in an event must be stated in its text, so a player can read the situation; new events use declared conditions rather than reader code.

### Step 4: the bookings model (tourism engine, engine 0.14.0)

- Content: `ScenarioFile.bookings?: BookingsConfig` (`docs/tourism-proposal.md`): calendar start, season noise, peak months, policy lock, weather (monthly odds, forecast accuracy, demand and cancellation factors), platform (commission), website product, partnerships, outreach, reach cap, role factors, fit base, per segment `BookingSegment` (demand at peak, unit, starting prices, size, lead weeks, season, channel responses, cancellation, strict conversion, weather sensitivity, invoiced, review weight), per feature `BookingProduct` (capacity, serves, one-off, monthly and unit costs, months, weather closed, alternative), per role `StaffRole` (pay per shift, units per shift per product, availability per month, founder hours per shift), reviews. Cross-checked against segments and features.
- State: `GameState.bookings: BookingsState | null` (bookings, prices, policy, platform listing, partnerships, repeat guests, rating, reviews, weather, forecast, turned away) and `hidden.bookings` (demand at peak, season curves, next week's weather). `WeekLedger.bookingRevenueCents` (part of revenue) and `bookingCostsCents` (company costs: in the net change and the win test). Monthly revenue of a bookings run is its guests' payments over the last four weeks.
- Plan: `WeekPlan.bookings?: BookingsPlan` (shifts, founder shifts, prices, policy, platform, partnerships, outreach); `PlanIssue` `invalid_bookings`. Founder shifts, outreach and new partnerships count as selling hours.
- Turn: in a bookings scenario `applyBookings` replaces sales, walk-ins, referrals and churn. Landing tests are a signal only there; pre-sale commits join the repeat guests and pay now.
- View: `PlayerView.bookings: BookingsView | null` (week of year, month, peak, weather, forecast, policy, platform, partnerships, rating, prices, segments, products, roles, a 12 week calendar per product with last year's figure, this week's bookings, revenue of the last four weeks). `ReportEntry` gained `weather`, `bookings_new`, `turned_away`, `guests_served`, `bookings_cancelled`, `company_cancelled`, `shifts_paid`, `review`.

### Step 5: the outdoor scenario (`gratwanderung`, engine 0.14.0)

- Content: scenario `gratwanderung` (long mode only: `ScenarioFile.mode: long`, `loadScenario` uses a scenario's first mode). Shared tourism events in `packages/content/src/shared/tourism/` (`ScenarioSources.sharedEvents` holds them for a bookings scenario). `win.overMonths` (optional): the last this many months together must cover every cost (company, freelance, bookings and living costs) instead of each of the last `profitableMonths` months being profitable; Gratwanderung 13. `InterviewConfig.budgetSmallStepCents` (optional): rounding step of budget quotes under 200 EUR; Gratwanderung 10 EUR. Milestone `count` gained `of: guests` (guests served).
- Effects and conditions (O0): effects `guests` and `review`; condition paths `tour.forecast`, `tour.peak`, `tour.month`, `tour.rating`, `tour.reviews`, `tour.bookedWeek`, `tour.bookedAhead`, `tour.listed`.
- Turn: reach of a segment also adds an office stage's walk-in rate for that segment (a base in town) and word of mouth, `0.2 x min(1, repeat guests / website.repeatsFull)`. Both are 0 in the 60 week game and in Kantino long mode (no bookings).
- Event guests (step 5, later): the `guests` effect adds to `BookingsState.eventGuests` (optional, absent in older saves): next turn they ask to book in groups of the segment's mean size, after the segment's own requests, without the strict policy's conversion roll; each group turned away for lack of room leaves a 2 star review. Office walk-ins add to reach beyond `reachCap`; outreach reach is multiplied by `1 + founder.skills.selling`.
- `PostMortem.guests: GuestsEconomics | null` (step 5): per segment units served and pay net of commission, platform share, commission, units the company and guests cancelled, units turned away in the last 12 weeks, booking costs, rating and reviews. Null outside bookings scenarios.

### Step 6: the bank loan (engine 0.14.0)

- Content: `ScenarioFile.loan?: LoanConfig` (`docs/loan-proposal.md`): bank name, plan and meeting hours, decision and retry weeks, own share, unproven ceiling, revenue multiple, min, max and step, yearly rate range in basis points, terms and repayment-free months offered, missed payment fee, early repayment fee share, most loans at once. Optional `bridgeMonthsHint` is visible bank advice about the months to the first useful season; it changes no lending rule.
- State: `GameState.loan: LoanState | null` (plan hours, application, offer, accepted terms, refusal, loans). `Loan` holds principal, balance, rate, term, free months, start week, months passed, payment, interest and fees paid, missed payments, status (`running`, `repaid`, `called`). The rate is drawn once per run from the stream `${seed}/loan`, so the game's `rng` is untouched.
- Plan: `WeekPlan.loan?: LoanPlan` (plan hours, an application with amount, term and free months, accept, decline, repay a loan in full). Plan and meeting hours are admin. `PlanIssue` `invalid_loan`.
- Turn: `applyLoan` before finance (plan hours, application, the bank's answer when due, accept or decline); `settleLoans` in finance at month ends, before the savings top up (payout, then payments from cash and savings; a payment they cannot meet is missed, with a fee on the balance). `WeekLedger` gained `loanInCents` (never revenue, not in the net change) and `loanPrincipalCents`, `loanInterestCents`, `loanFeeCents` (outgoings in the net change and in the seasonal win test). All 0 without a loan.
- Ending `bank_called` (post-mortem cause `bank_called`) after a second missed payment in a row, checked after bankruptcy.
- View: `PlayerView.loan: LoanView | null`, including `bridgeMonthsHint: number | null`. Report entries `loan_applied`, `loan_refused` (reason `own_money`, `no_guests`, `missed_payment`, `too_many`), `loan_offer`, `loan_accepted`, `loan_paid_out`, `loan_payment`, `loan_missed`, `loan_repaid`.
- Step 6 additions: `BookingProduct.requires?` (sells only once that product shipped too), `BookingProduct.unitCostShare?` (share of the price added to each unit's cost when served), `OfficeStage.qualityBonus?` (added to the review quality while working there). Condition paths `loan.balanceEur`, `loan.missed`, `loan.running`.
- Restaurant additions (step 6): `LoanConfig.leverageSpreadBp?`; `BookingsState.archived?: BookingTotal[]` (finished bookings older than a year as totals per status, segment and channel, with their units, gross and first week); `bookingTotals(bookings)` combines the archive and the kept bookings; `BookingsView.products[].unitCostShare`; `Loan.firstMissedWeek?`. An ending `bank_called` also when the money runs out with a loan payment missed. Scenario `hinterhof` (long mode only, with a loan, no funding).

### Step 7: the hotel (engine 0.14.0)

- Content: `BookingProduct.capacityOf?` (sells from that product's capacity; both count against one pool), `BookingSegment.depositShare?` (share of the price paid when booked), `BookingSegment.capacityShare?: { peak, off }` (share of a product's capacity the segment can use). Scenario `seeblick` (long mode only, with a loan, no funding).
- State: `Booking.depositCents?` (paid when booked; the stay or its invoice asks for the rest). The calendar shows a sharing product's pool capacity and what the whole pool has booked.

### Tourism fixes (engine 0.14.0, view only)

- View: `BookingsView.servedByWeek: number[]`, units served in each of the last five weeks played, oldest first (fewer at the start). The headline shows guests, covers or occupancy from it. No state, plan or rule changed, so saves replay as before.

### Plan 2 step 1: the spec features of the tourism engine (engine 0.14.0)

- Content (`BookingsConfig`, all optional): `trials` (per id: `name`, `hours`, `cents`, `weeks`, `people`, `reach` per segment, `choose`, `rate { base, perPain }`, `paid`, `reviewFrom`, `repeat`, `max`, `before?`), `vouchers` (`hoursPerBatch`, `batchSize`, `rate`, `segments`, `units`, `maxBatches`, `redeemShare`, `redeemWeeks`), `renovation` (`product`, `feature`, `rooms`, `unitsPerRoom`, `centsPerRoom`, `weeks`, `mustHaveRooms`, `atOnce`, `qualityPerRoom`), `minStay` (`segments`, `months`, `conversion`, `extraUnits`), `floor { stretch, penalty }`. `BookingProduct.prepared?`. `StaffRole.kind?: 'serve' | 'kitchen' | 'floor'` and `StaffRole.contracts?` (per kind `permanent`, `part_time`, `seasonal`: `centsPerWeek`, `shifts`, `noticeWeeks?`, `months?`, `quality`, `max`).
- State: `BookingsState.vouchers?: Voucher[]` (`id`, `segmentId`, `soldWeek`, `units`, `valueCents`, `redeemedWeek`), `contracts?: StaffContract[]` (`id`, `roleId`, `kind`, `name`, `startWeek`, `endWeek`), `prep?`, `wasteCents?`, `renovated?`, `works?: { startWeek, endWeek }[]`, `minStay?`. `HiddenBookings.voucherWeeks?` (the week each voucher's guests ask for a date, or null). `Booking.voucherId?`. `PendingExperiment.kind` adds `trial` and `voucher`, with `trialId?`. Evidence adds `trial` (`trialId`, `people`, `responses`, `priceCents`) and `voucher` (`prospects`, `sold`, `priceCents`). `WeekLedger.voucherCents?` (cash, never revenue, not in the net change) and `voucherRedeemedCents?` (counted as earned in the tourism win test).
- Plan: `BookingsPlan.trials?`, `vouchers?`, `hire?`, `endContracts?`, `prep?`, `renovate?`, `minStay?`. A scenario with trials or vouchers refuses landing tests and pre-sales (`invalid_bookings`).
- View: `BookingsView.contracts`, `trials`, `vouchers`, `prep`, `lastWeek` (per product, guests who came and were served last week), `renovation`, `minStay`; `roles[].kind` and `roles[].contracts`; calendar capacity less rooms under works. `SegmentView.trials?` and `vouchers?` in tourism. `PendingExperimentView.trialId?`. `ReportEntry` adds `trial_result`, `voucher_result`, `vouchers_redeemed`, `food_waste`, `contract_signed`, `contract_ended`, `contracts_paid`, `works_started`, `works_done`; `company_cancelled.reason` adds `sold_out` and `works`. `GuestsEconomics.vouchers?`, `wasteCents?`, `contracts?`.
- The tourism fingerprints change; the 60 week and Kantino long ones do not, and no rule of theirs changed (proven in the step 1 report).

### Plan 2 step 3: hosting hours (engine 0.14.0)

- Content: `BookingsConfig.hosting?: { hoursPerUnit, maxHours }`. Engine: `hostingHours(state)` counts as admin hours in the week's plan. View: `BookingsView.hostingHours`. Ten new shared tourism events; guests effects in 17 events gained conditions. Tourism fingerprints change; 60 week and Kantino long do not.

### Plan 3 step 1: office stages 3 to 5 (engine 0.14.0, long mode content only)

The 60 week games keep their fingerprints: every new content field is optional with no default.

- Content: `OfficeStage` gains `oneOffCents?`, `depositCents?` (part of the one-off back on notice), `moveWeeks?` (default 2), `desks?` (people at once, the founder included; absent: no limit), `maxMembers?` (team size here), `demoFactor?`, `searchWeeksLess?`, `segmentFactors?` (a subscription segment's trial conversion, a bookings segment's requests), tourism `capacity?` (units a week per product), `staffFactors?` (units per shift per role), `wasteFactor?`, `hostingHoursLess?`, `weatherPlanFor?` (products that run in dangerous weather), `contractMax?` (per role), `needsContract?` (a role; without a working contract the stage before applies that week). (`established?`, the UI stage at a stage, was removed after the plan 3 review; see below.) `ScenarioFile.office?: { noticeWeeks, moveHoursPerWeek }`. Effect `officeMove { stage }` (accept an offer). `ScenarioEvent.openWeeks?`; a triggered event may now be `once: false` with `cooldownWeeks` (it comes back after them while a trigger holds and no copy is open). Condition paths `office.stage`, `office.weeksAtStage`, `office.desksFree`, `office.busy`, `months.coveringAll`, `months.profitable`, `tour.turnedAwayWeeks`, `tour.peakTurnedAwayWeeks`, `tour.occupancy`. `ScenarioSources.officeEvents?` (`messages/events/office.yaml`), loaded in long mode only.
- State: `CompanyState.office: OfficeState { sinceWeek, move: OfficeMove | null, notice: { endWeek } | null, prepaid: string[], stays: OfficeStay[] }`. `UiStage` gains `established`. `WeekPlan.office?: { notice: boolean }`; plan issue `invalid_office`. `LoanTerms.stage?` and `Loan.stage?` (a stage's one-off in the bank's plan, prepaid at payout).
- Turn: after the inbox, `applyOfficeWeek` completes a move in its ready week (the stage's effects), starts or ends notice (deposit back as other income, one stage down) and takes `moveHoursPerWeek` of next week while a move runs. Accepting pays the one-off at once as an other cost (none if prepaid) and moves the rent at once.
- View: `PlayerView.office: OfficeView` (stage, rent, desks and people, move, notice, `canGiveNotice`, the month and turned-away counters, prepaid stages). `LoanView.plan.stages`. An offer whose stage a loan paid shows `costCents: 0`.
- Report entries: `office_accepted`, `office_moved`, `ui_established`, `office_notice`, `office_left`. Post-mortem: `PostMortem.office: OfficeEconomics[]` (when, one-off, rent, deposit back, total, revenue before and at the end, team before and after, guests).
- Bots: `RunResult.office { offered, taken }` (stage numbers); `Behaviours.office` and `TourismRule.office`: `careful` (default), `never`, `always`; strategies `validate_then_build_never_move`, `validate_then_build_always_move` (team part), `tourism_never_move`, `tourism_always_move`; targets O1 to O3 (Kantino long 38 to 40, tourism T19 to T21).

### Plan 3 step 3: the established UI stage (engine 0.14.0, view only)

- View: `PlayerView.history[]` gains `inCents` and `outCents`, money received and paid out that week as the runway counts them (the established Cash flow card). No game change.
- Web: `uiStage` `established` (see below for when); `data-stage` and `data-scenario` on `<html>`; `theme/established.css` and the Bricolage Grotesque font load on first reaching the stage. Labels take an optional `established` wording and fall back to the organised one. Dev builds preview a stage with `?stage=established` (`StoreDeps.previewStage`).

### Plan 3 review: the established stage follows growth

- Content: `ScenarioFile.establishedAt?: { monthsCoveringAll, officeStage?, funded? }` (long modes: Kantino long 8 months, stage 4, funded; Gratwanderung 7, Hinterhof 8 and Seeblick 8 months, stage 4). `OfficeStage.established?` removed. (A first version had `people` instead of `officeStage` and `funded`; dropped after review.)
- Turn: after milestones and the organised switch, the UI turns `established` once `monthsCovering(all)` reaches `monthsCoveringAll`, or the current office stage's number reaches `officeStage`, or with `funded` once a round has closed (a stake exists); never back. Report entry `ui_established` loses `place`. The game itself is unchanged; the long mode content fingerprints change, so their old saves get the usual notice.
- Bots: `RunResult.establishedWeek: number | null`; target E1 (Kantino long 41, tourism T22) and the report's "The established look" section.

### Start screen redesign (web and content only, no engine change)

- Content: `about.yaml` gains `category`, `short` and `tags` (two or three); `categories.yaml` lists the categories (`id`, `name`, `order`). `ScenarioAbout` is `{ id, name, category, short, tags, lines, modes }`; `ScenarioCategory` is `{ id, name, order }`, from `scenarioCategories()`. Not part of `Scenario`, so no save fingerprint changes. The run length tag on a row comes from `modes`, not from the file.
- UI store: `UiState.categories`, `category` (the category shown; null for the category grid of seven or more), `sheetOpen`, `saves: SavedGame[]` (`{ scenarioId, mode, week, maxWeeks, cashCents }`, the most recently played first; `maxWeeks` and `cashCents` null for a save from before the notes) and `recent: ScenarioId[]`. Actions `selectCategory(id | null)`, `openSheet(id)`, `closeSheet()`; `continueRun(scenarioId?, mode?)` continues any saved slot. `leaveRun` shows the played company's category. `StoreDeps.categories?` for fixtures.
- Storage: `SaveStorage.slots()` lists the slots with a save. `ProfileStorage` gains `lastCategory`, `recentScenarios` and `saveNotes` (`SaveNote = { slot, week, maxWeeks, cashCents }`, written with every autosave and on Continue) with their setters, under `founder-mode.category.v1`, `founder-mode.recent.v1` and `founder-mode.saveNotes.v1`. Every access is wrapped; without storage the Start screen opens on the picked company's category and lists in content order.


### Plan 4 step 1: abroad mechanics (engine 0.14.0, off unless a scenario's YAML has them)

See `docs/abroad-mechanics.md`. Every new content field is optional with no default, so earlier scenarios keep their fingerprints and draws.

- Content, `BookingsConfig`: `weather` is now optional; a scenario has exactly one of `weather` and `conditions: ConditionsConfig` (`states` in order, one or two `slots`, `monthly` chances per slot and state, `persistence`, `forecastAccuracy`, optional trip `spot { name, slot, shift }`, optional whole-week `review { bad, perBadSlot, good?, perGoodSlot?, shelter?, shelterFactor? }`). `trips?: { policyWeeks, start? }`, `tender?: TenderConfig` (`costId`, `higherFactor`, `keep { min, max, perContract }`, `lost { walkIn, partnership }`, `hotel { factor, revenueShare, walkIn, partnership }`), `costSteps?: { week, factor, fixedCosts, roles, unitCosts }[]`.
- Content, `BookingProduct`: `runsIn?` (states), `slots?`, `wholeWeek?`, `course? { level, sameStay? { share, products }, nextSeason? { direct, platform, products } }`, `needsLevel?`, `dayTrip? { perTrip, days, costCents, asset? }`, `waitWeeks?` (a licence). `BookingSegment.levels?` (levels its guests hold). Effect `tender { bid: higher | same | hotel }`.
- State: `BookingsState.abroad?: AbroadState` (`forecast` and `lastWeek` as `ConditionsWeek` = per slot the state of each day, `byMonth` slots per state, `lost` per product, `moved`, `ladder: LadderYear[]` per run year, `trips? { min, sinceWeek, run, wasted, guests, costCents }`, `tender? { bid, kept, week }`). `HiddenBookings.nextConditions?`, `returns?: ReturnRequest[]` (graduates asking again a year later). `FeatureProgress.readyWeek?` (a licence waiting). `BookingsPlan.trips?: { min: number | null }`.
- View: `FeatureView.readyWeek`, `BookingsView.abroad: AbroadView | null` (states, slots, forecast day by day and counted, last week, the spot, `runsOn` per product, the ladder this year and in all, moved, lost, trips with `locked` and `most`, tender, cost steps), and per product `course`, `needsLevel`, `dayTrip`, `wholeWeek`. A conditions product's calendar capacity is what it can sell: this week's forecast slots, later weeks the share its month usually suits (never the chances themselves).
- Report entries: `conditions`, `conditions_moved` (to `slot`, `alternative`, `next_week`), `conditions_cancelled`, `trips`, `trips_cancelled`, `graduates`, `graduates_returned`, `licence_applied`, `costs_rose`, `tender`; `company_cancelled` gains the reason `conditions`.
- Post-mortem: `GuestsEconomics.abroad?: AbroadEconomics` (months, lost per product, moved, ladder, trips, tender).

### Plan 4 step 2: Rückenwind (engine 0.14.0, off unless a scenario's YAML has them)

- Content, `BookingProduct`: `priceFactor?` (a unit costs the segment's price times it; reviews judge value at the base price), `appeal?` (with any product naming it, guests pick among products with room by these weights, 1 when absent). New scenario `rueckenwind` (category tourism, tags Abroad and Wind).
- State: `Booking.waited?: true` (a trip guest who waited a week for a group).
- View: `BookingsView.products[].priceFactor`.
- Reviews: guests cancelled for the conditions count with `reviews.cancelPenalty` instead of `understaffPenalty`.
- Bots: `Strategy.scenarios?` (plays only there); `RunResult.tourism.abroad?` (year 2 returners by channel, trips, the tender). Report targets may be named (`W1`): `Target.id` is a number or a string.

### Plan 4 step 3: assets and Tiefgang (engine 0.14.0, off unless a scenario has `assets`)

- Content: `BookingsConfig.assets?: Record<id, AssetConfig>` (`name`, `products`, optional `buy { product, upkeepMonthlyCents, crewWeekCents, haulOut? { month, weeks, cents }, breakdown { weekly, perYear, weeks, repairCents }, ageYears, valueLossPerYear }`, `lease { seasonCents, upfrontShare, months, minMonths, crewWeekCents }`, `share { capacity, unitCents, revenueShare, takeBack? { chance, share, months }, peakRule? { months, shoulderMonths, needWeeks, byWeek } }`). Effects `asset { id, option: lease | share | none }` and `assetRepair { id }`. Condition paths `asset.owned`, `asset.leased`, `asset.shared`, `asset.none`, `asset.broken`. New scenario `tiefgang`.
- State: `BookingsState.assets?: Record<id, AssetState>` (`option`, `sinceWeek`, `leaseFromWeek`, `boughtWeek`, `brokenUntil`, `breakdowns`, `takenBack`, `peakReleased` calendar years, `weeksUsed`, `costCents`).
- View: `BookingsView.assets: AssetView[]` (option, products, the purchase product, broken until, next haul-out, value, breakdowns, weeks used, spent, the lease's minimum, the peak rule, and the terms of every option).
- Report entries `asset_option`, `asset_broke`, `asset_repaired`, `asset_haul_out`, `asset_taken_back`; `company_cancelled` reason `asset`. Post-mortem `GuestsEconomics.assets?: AssetEconomics[]`.

### Plan 4 step 4: Leinen los (engine 0.14.0, off unless a scenario names them)

- Content, `BookingsConfig`: `hold?: { products }`, `minSail?: { product, perUnit, options, weeksBefore, moveCents, policyWeeks }`, `friction?: { product, chance, penalty, themed?, themedFactor?, themedConversion? }`; `BookingProduct.closesAsset?: { asset, weeks }`, `wtpFactor?: Record<segment, number>`. New scenario `leinenlos`.
- State: `BookingsState.held?: number[]`, `minSail?: { min, move, sinceWeek }`. Plan: `BookingsPlan.hold?: { week, on }[]`, `minSail?: { min, move }`.
- View: `BookingsView.cruise: CruiseView | null` (the season's weeks with held, chartered, cabins sold, closed; the minimum to sail and its options; themed weeks).
- Report entries `cruise_cancelled`, `friction`.

### Tuning 1 (engine 0.14.0, off unless a scenario names them)

- Content, `BookingsConfig.requestsAhead?: boolean`: requests follow the season of the weeks they ask for (the week made plus each lead time alike), and each request's lead time is drawn in proportion to those weeks' season. Absent: the season of the week they are made, as before. Leinen los only.
- Bots: `RunResult.netWealthCents`, final cash and savings plus owned assets' resale value less the loans left (equal to `finalWealthCents` without assets). The asset targets compare money with it. `assetsEconomics` is exported from the engine.
- State: `BookingsState.cancelledWeeks?: CancelledWeek[]` (`{ week, cabins, lostCents, savedCents, costCents }`), added when a week is cancelled below the minimum to sail. Post-mortem: `GuestsEconomics.cancelledWeeks?` (present where the scenario has a minimum to sail), shown as a total line, a line per week and the marginal cost lesson.
- Content, `BookingProduct.ownDemand?: number` (a share): guests who come for this product alone, as a share of each segment it serves, asking on top of the segment's own requests; the segment's other guests never pick it. When the product cannot sell (not built, or trips not run) they do not ask. Rückenwind's kite trips only.
- Content, `ContractSchema.months` with `noticeWeeks` (tuning 1): the contract sleeps outside its months instead of ending: unpaid and not working there, back every year, ended only by notice (the Spanish fijo discontinuo). No type change; the view shows it as a contract with both months and notice (`tour.contract.noteSleeps`). Rückenwind's permanent and part time contracts.

## Plan 5: optional indoor leisure mechanics

`bookings.leisure` enables the indoor model instead of weather or day conditions. It names weekly slots, per-segment visit shares and churn drivers, per-product hard and comfortable slot capacity, class hours and physical rooms, independently priced membership offers, a check-in aggregator, freshness and local theme pools, build-out waits, opening requirements and date holds. All additions are optional without defaults in older scenarios.

`BookingsState.leisure` stores opening week, the selected initial areas, offers and timetable, individual contracts and owed pack visits/value, freshness and completed setting hours, construction payments, held dates, aggregator contract/slots/user monthly visit counts, and observed weekly history. `HiddenBookings.leisure` holds finite local theme pools and the run's check-in payout. `Booking` optionally names a slot, membership or aggregator user. No fields are added to protected states without leisure content.

`BookingsPlan.leisure` changes offers, timetable, weekly setting hours, refreshes, aggregator slots/notice and hold policy. `leisureStart` inbox effects select initial build-out products. Membership packs use the existing voucher cash/earned ledger columns. Fixed annual terms last 52 weeks; recurring bills follow the game's existing four-week financial months.

`BookingsView.leisure` and the optional post-mortem leisure field contain observed slot loads, memberships/owed visits, paid check-ins, cancellations, freshness words and work history, holds and construction progress. Numeric freshness, comfort thresholds, local pool sizes, conversion chances and cannibalisation shares stay outside the player view.

Construction payments are recorded in `buildPaid` at the start of the wait. An accepted loan's payout reimburses an already bridged item instead of debiting its purchase again; a newly requested plan cannot list an already paid build. Initial `leisureStart` choices must be once-only events from a named non-customer sender. They are created in week 1 without an extra PRNG draw and replay from the ordinary response log. Setting work accumulates in `settingProgress`; only a complete reset restores freshness.

`leisure.instructors` draws one hidden following share per role for the run. The `leisureInstructor` effect names a role or `most_followed` (the largest following among current members). Departures stop followers attending, honour fixed terms and monthly notice, preserve pack obligations, and append observed departure counts. Only those counts and role names enter `LeisureView`; following shares never do. Locked-in inactive members reduce service reviews while their fees remain due.

Leisure event conditions read only observable facts, identically through game state and `PlayerView`: `leisure.open`, `leisure.weeksOpen`, `leisure.members`, `leisure.cancellations`, `leisure.packed`, `leisure.aggregator`, `leisure.checkins`, `leisure.holds`, `leisure.tired`, and `leisure.instructorLosses`. None exposes a following share, local pool, demand, comfort threshold or numeric freshness.

Intro conversions preserve `joinedWeek` for the January cohort and use optional `billingWeek` for the new recurring billing cycle. Agreed per-contract prices stay fixed; changes to an offer price affect new contracts. The view distinguishes the current offer price from the summed `agreedMonthlyCents` of existing recurring contracts.

Each leisure week records refused new requests in `turnedAway` by the slot the guest asked for, without inventing a requested product when all products were full. The view exposes a copied `turnedAwayBySlot` for the last week and copied records in history. Membership waitlist and platform capacity denials join those slot totals; already-booked guests cancelled at service remain separately reported cancellations.

Finite local theme pools include outstanding reservations across slots/dates. Completed rebuilds replenish the theme audience, and future dates can use the rebuilt pool. Freshness words also reflect a depleted local audience; its numeric size stays hidden. Optional per-product `reviewPenalty` weights stale-product reviews, and `refresh.lostCapacity` names the known slot capacity lost during a zero-week reset (for example a morning of route setting).

The leisure view's `slotCalendar` reports public hard capacity, confirmed units and held units separately for twelve weeks, including areas under construction once their opening date is known. It uses one booking/hold pass to build the counts. Optional `courses` contains observed students, follow-ups and returning graduates, plus yearly totals; indoor courses do not acquire a weather forecast. Course follow-ups, returners and vouchers receive slots and obey their capacity in the indoor model.

Optional `leisure.slotPrices` defines initial per-segment, per-slot peak/off-season prices. State, actions and view carry copied price maps and `salesSlots` (open for new enquiries). These prices affect willingness to book once, at the requested date and slot, and are fixed on accepted bookings. Closing sales leaves existing reservations and voucher obligations intact. Without this content block the earlier pricing path is unchanged.

Optional `leisure.space` defines physical spaces and the features using them. Started design work, construction and shipped features reserve their space; plans cannot start more than fits. The view exposes capacity, used space and stated feature requirements. A segment's optional `minimumAreas` requires that many opening areas to be ready on its requested date; this public prerequisite is copied into the leisure view.

Bot results optionally record indoor `openingWeek`, rooms built and completed refreshes under `tourism.leisure`. Leisure T4 subtracts the actual opening week, while earlier reports keep absolute weeks. Leisure reports omit the out-of-scope office expansion targets and retain E1 and their scenario's named targets.

### Venue capacity and temporary closures

Optional `leisure.buildOut.<id>.closes` lists physical leisure pools closed from
completed preparation until `readyWeek`. Other pools stay open; dates on/after
readiness remain available. Public build rows copy `closes` only when configured.

Optional `leisure.slotUpgrades.<feature>` names one pool/slot, additional weekly
units and integer-cent cost per served unit beyond that pool's ordinary capacity.
At most one upgrade covers a pool/slot. An installed feature adds capacity only
to its named slot. Cancelled/held units do not earn a turnaround charge; aliases
sharing the pool are counted together. `LeisureWeek.turnaroundCents` records the
actual cost by upgrade, only when configured; the normal operating-cost ledger
pays it once. Public optional `LeisureView.upgrades` gives stated capacity/cost,
installation status and observed cumulative paid cents. View history copies these
maps; no new fields or random draws occur in earlier games without these blocks.

Leisure pools now honour the existing asset modes: unavailable equipment gives
zero capacity; owned/leased/shared equipment follows its actual availability at
the requested date. An alias's own required products and asset must also be ready,
even when it shares another pool. Hired equipment supplies the same physical
must-have as the purchase feature without pretending that purchase has shipped.
The ordinary asset ledger charges per served unit; returning hire does not destroy
the pool for other products. Slot history/load and freshness aggregate aliases into
their physical pool. Asset calendars evaluate each date because seasonal leases or
maintenance may change availability inside the twelve-week view. These adaptations
are limited to leisure; boat behaviour and fields are unchanged.

### Venue complaints and ancillary receipts

Optional `leisure.noise` lists late products, an insulation feature, dedicated setup
products, hidden complaint chances, warning/restriction counts, a rolling week
window and restriction duration. `LeisureState.noise` records observed complaint
weeks, restrictions with inclusive start/exclusive end, served late events, actual
net receipts and attributable variable/staff/asset/turnaround/setup costs. Setup
items count once whether financed or bridged. A restriction blocks new late dates
and cancels/refunds previously accepted events falling inside it; other products
stay available. State/view condition paths `leisure.complaints` (rolling count) and
`leisure.restricted` read identical observable facts.

Optional `leisure.extras.<feature>.segments` specifies an agreed gross basis, known
venue revenue share and unit cost per served booking unit. For example,10% of an
estimated catering package is earned only when the event is served. Enabled
features earn integer cents in the ordinary ledger once, including on member
visits; enquiries, holds and cancellations earn nothing. `LeisureState.extras` and
optional `LeisureWeek.extras` store actual units/receipts/costs by feature.

Public optional `LeisureView.noise` shows complaint counts, real restriction dates
and late-event contribution with its cost breakdown, never complaint chances.
`LeisureView.extras` shows stated financial terms, installation status and observed
cumulative/last-four-week receipts and costs. Paid weekly staff is attributed to
late events in proportion to due booking units, including current service cancellations but excluding dates already released in
advance; asset
use fees follow actual asset product usage. Turnaround cost is allocated over the
served units in that pool/slot. Dedicated setup is charged in full; shared rent and
other fixed overhead remain in the business ledger rather than this incremental
contribution. Optional maps are copied into the view. Without these blocks, no
fields or random draws are added.

Known restrictions release affected future late bookings and paid holds at the
restriction is recorded, returning their advances immediately. The beginning of
a booking step also releases any affected reservation already present in a save. Optional
`Booking.refundedCents` / `LeisureHold.refundedCents` mark returned advances so they
are not refunded again on the original event date. Noise state/view count those
cancellations, released holds and actual restriction refunds. Public held-date
rows include the returned fee when present. These are returned liabilities, not a
new cost subtracted from the late-event contribution. Normal client-decided hold
releases remain in the ordinary weekly hold counts; restriction releases have
their separate observed counter. No markers are added to earlier games.

### Permit decisions

Optional `leisure.permits.<build>` supplies a hidden approval chance and a stated
refundable component no larger than its price. It requires a build-out wait. At
readiness, the PRNG decides once: approval ships normally; refusal stores optional
`FeatureProgress.refusedWeek`, removes readiness and prevents retrying that same
application. The construction charge was paid once at the wait's start (or through
the existing bank item settlement). A refusal reverses the stated cost once,
recorded in optional `LeisureState.permitRefunds` by product/week/cents. It is a cost
refund, not new venue sales. This follows the existing cash-basis expense window;
capital timing remains part of the plan's documented ending-window limitation.

The optional public build `permit` exposes refundable cents, actual refusal week
and returned cents, never approval chance. `permit_refused` report entries state
the returned amount and remaining application cost. Observable condition
`leisure.permitRefusals` counts actual refusals identically in state and view.
Unconfigured builds, fields and random draws remain as before.

### Deposit-only cancellation terms

Optional `leisure.strictKeepsDeposit: true` makes strict guest cancellations keep
only the paid advance. Platform commission applies to that retained amount; its
fee is settled immediately even for normally invoiced customers, without creating
a negative invoice. Served bookings still settle their full price, and flexible
or company cancellations still return the advance. Without the flag, strict
cancellations keep the full agreed payment as before, including Ausgesperrt.

### Venue bot observations

Bot `RunResult.tourism.leisure.venue` is optional and present only with the noise
configuration. It records actual late service, restriction count, late receipts,
attributable costs/net and observed hold/converted/late-release counts. V3 uses
no-insulation runs with actual late events as its restriction denominator; late
contribution includes setup even in runs with no late sales. Ordinary player views
and earlier bot results gain no new fields.

Leisure offers may finish preparation before equipment is acquired; actual sale/service
still requires available equipment. This does not relax an asset purchase’s own company
prerequisite or the existing non-leisure preparation rules. Venue bots recognise hired
equipment when expanding dependencies,without marking its purchase feature shipped.

### Optional monthly leisure pricing and offer access

`leisure.wtpBasis: monthly` means hidden segment budgets and interview hints are
monthly. Joining tests the actual monthly-equivalent offer fee once. Direct ticket
requests test ticket price times segment visits/week times weeks/month,once after
choosing their date. Member service reviews use the paid monthly-equivalent offer
fee;direct ticket reviews use the same normalisation. No such block retains the
earlier price paths and draw order.

`leisure.respectSlotPreferences: true` excludes membership offers with no positive
preferred-slot overlap,including intro migration. Optional `memberships[id].products`
restricts member visits to the named leisure products,including waiting-list
failures;ordinary/unrestricted offers retain their earlier product routing. Premium
offers therefore need an explicit paid product restriction rather than giving
every unlimited membership free premium equipment access. No hidden fields
are introduced by these config additions,apart from optional public
`LeisureView.members[].products`,a copied list of the stated allowed class products.

Optional `leisure.products[id].classPlacesWhen: { feature, places }` replaces
that class's normal seat count once the named feature is ready. Capacity remains
class count times actual seats;shared room/timetable hours do not increase. The
public timetable's `places` reports the actual installed seat count. Before the
conversion,and without this block,the original capacity and view are unchanged.

### Optional timetable-aware staffing

`leisure.classStaffing: true` consumes one eligible serve-role shift for each
scheduled class,in configured slot order and sorted product order. Instructor
coverage is per class/slot,not pooled weekly guests. Empty rostered classes use
their shift;uncovered classes cannot serve. Existing explicit shift wages are
paid once,including empty classes,and contract/founder cover uses the same pool.
The existing physical-room hour limit remains in force.

Optional `LeisureState.classCoverage[product][slot]` records actual covered class
counts for the week. Public `LeisureView.timetable[].coveredClasses` is a copied
map of those counts. Original games without the switch receive no new fields
and keep the original guest-based staffing path.

### Optional premium niche and founding following

`leisure.premiumNiche` names the premium feature/paid offers/segments,a hidden
run-level interest-share range,and a budget multiplier for that paid premium
service. `HiddenLeisure.premiumInterest` is drawn only with this block. Its
customers prefer premium offers when available;actual joins still test the paid
monthly-equivalent fee. The same premium budget basis applies to price churn
and service-value reviews. Intro migration uses the same observed-offer eligibility
and preference routing. Premium service restrictions remain in offer product lists.

Interviews can mention the premium feature from actual underlying niche interest,
using the existing public mentioned-feature evidence. The share stays hidden;
players/bots can learn from real mentions and actual paid enrolment,not a seed key.

`leisure.foundingFollowing: {segment,count,weeks}` draws a finite opening cohort
in `HiddenLeisure.foundingFollowing`. Over the configured first open weeks,it
adds those people to genuine membership enquiries,independent of advertising.
The ordinary paid-offer/price test still applies;they are people,not free revenue
or guaranteed signed members. Optional `LeisureState.foundingFollowing` and
`LeisureView.foundingFollowing` record only actual introductions and paid joins.
The total estimate and premium share never enter the public view. Unconfigured
games draw nothing extra and receive no fields.

### Identified class-instructor workload

Optional `leisure.instructorWorkload: {maxClasses,penaltyPerOverloadedClass}`
requires class-aware staffing. Actual covered classes use the founder first,
then working named contracts in their stable signing order,then anonymous
per-class cover. Founder classes across roles count as one person's workload;
contracts count individually. A review penalty weights excess classes over the
stated limit by all covered classes. Flexible anonymous shifts are a pool of
people,and do not pretend that all cover is one person.

`LeisureState.instructorLoads` optionally records actual founder/contract identities
and class counts. Public `LeisureView.instructorWork` copies those loads and the
stated maximum;the review coefficient is not public. These optional fields and
calculations do not exist for earlier games without the content block.

Optional `leisure.products[id].availableStages` restricts its physical capacity
to those actually occupied office stages. Prepared classes cannot use an annex
before the move completes. The public timetable optionally reports `available`;
without the block,no field or restriction is added. Distinct annex class aliases
share an annex room-hour budget and need their own instructor coverage.

Instructor following eligibility also honours a membership's optional product
list. A departing mat teacher cannot take members whose paid offer permits only
premium classes taught by somebody else. Unrestricted offers keep their old path.

### Optional paid administrative relief

`bookings.hosting.relief: {role,hoursPerShift}` lets paid weekly/contract desk
cover reduce the following week's automatic founder administration from actual
served visits. It never supplies instructor coverage. Optional
`BookingsState.hostingReliefHours` records that week's paid cover,capped by the
hosting maximum and reset each week. Public `BookingsView.hostingReliefHours`
shows actual cover;`hostingHours` shows the remaining founder hours,never negative.
Unconfigured games retain their previous hosting path and get no fields.

Class-aware timetables additionally expose optional `classHours`, the stated duration
of one class. Existing member bookings cancelled at service add a failed visit to waitlist
history without redeeming pack visits or value; this behaviour is unchanged.

Fitness bot results optionally record `tourism.leisure.fitness` with counts of
actual instructor departures and followers stopped. This report-only aggregate
is absent without class-aware staffing and does not enter player decisions.

For class-aware membership offers, `LeisureView.members[].visits` optionally
exposes the stated visits per purchased pack, distinct from aggregate owed visits.

Class-aware leisure keeps optional `LeisureState.traffic`:one product-count row
per week for served,arrived and non-cancelled visits,retaining the same54-week
window as the earlier individual history. Finished individual class visits older
than one week fold into existing lifetime archive totals. Calendar year comparisons,
recent occupancy and office visit counts read the compact history;future bookings,
member credit,ledger and action logs retain their existing rules. Traffic records
are not copied into PlayerView. Member lookup maps are local to a calculation.
No compact records or shorter retention apply without class-aware content.

Class-aware visit compaction retains the current service week as individual bookings and54weeks of product/week traffic aggregates. Lifetime status/segment/channel totals remain in the ordinary archive. Hosting hours use the aggregate previous-week served count too,including an ending shown before the week increments. No public fields or outcome formulas change.
