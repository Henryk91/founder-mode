# Schemas

Source of truth for the shapes shared between engine, content, bots, and UI. Update this file in the same change as any type change.

Status: Phase 3 (engine 0.4.0). Engine types live in `packages/engine/src/types.ts`, content schemas in `packages/content/src/schema.ts`.

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

Invariants (tested): `cash' = cash + revenue - fixedCosts - founderDraw + transfer + autoTransfer` and `savings' = savings - (livingCosts - founderDraw) - transfer - autoTransfer`.

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
    runwayWeeks: number | null    // weeks until cash plus savings reach zero; null when not shrinking
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
| `scenarios/<id>/about.yaml` | not part of `Scenario`: `name` and exactly two `lines` for the Start screen, read by `scenarioCatalogue()` |

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
      perHourOverBase: number
      perRestHour: number
      weekWithinBase: number
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
  saveNotice: 'incompatible' | 'scenario_changed' | 'broken' | null
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

Autosave: a `SaveFile` is written under its scenario's localStorage key when a run starts and after every resolved week. `continueRun` replays it; a save from another `engineVersion` (or one that fails to replay) is dropped with a notice. The draft plan is not saved. A finished run clears its save when the player leaves it.

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
