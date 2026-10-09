# Schemas

Source of truth for the shapes shared between engine, content, bots, and UI. Update this file in the same change as any type change.

Status: Phase 1. Engine types live in `packages/engine/src/types.ts`, content schemas in `packages/content/src/schema.ts`.

## Conventions

- Money is integer cents (`...Cents`). Time is integer hours (`...Hours`).
- Probabilities and hidden values live only under `GameState.hidden` (and in `eventLog`) and never reach `PlayerView` or `WeekReport`.
- Ids are lowercase snake case strings, for example `small_offices`.
- A "month" is 4 weeks (`scenario.finance.weeksPerMonth`). Monthly charges land in weeks 4, 8, 12, and so on.

## GameState

Never passed to the UI. Fields from plan section 4.2 that are not listed here arrive with their systems: product, leads, customers (Phase 2), invoices, team, inbox, scheduled, `hidden.candidates`, `bookkeepingBacklogHours` (Phase 4), milestones (Phase 7).

```ts
type GameState = {
  engineVersion: string
  scenario: Scenario            // the scenario the run was created from; not in the save file
  scenarioId: string
  seed: string
  rng: RngState                 // sfc32 state { a, b, c, d }, signed 32 bit integers
  week: number                  // starts at 1; stays on the final week once the run ends
  status: 'running' | 'ended'
  ending: EndingId | null       // 'bankrupt' | 'still_searching' | 'sustainable'

  founder: {
    baseHoursPerWeek: number    // 50
    maxHoursPerWeek: number     // 65
    energy: number              // 0..scenario.founder.energy.max, may be fractional (x.5)
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
  ledger: WeekLedger[]                       // one entry per resolved week
  actionLog: LoggedAction[]
  eventLog: LoggedEvent[]
}
```

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
  quoteIndex: number                  // into scenario.interviewQuotes[segmentId][bucketId]
  mentionedFeatureId: FeatureId | null   // a must have the interviewee asked for, if any
}
```

### WeekLedger

Money movements of one resolved week. Outflows are positive numbers.

```ts
type WeekLedger = {
  week: number
  revenueCents: number          // 0 until Phase 2
  fixedCostsCents: number       // sum of fixedCosts at month end, else 0
  livingCostsCents: number      // founder living costs for the week
  founderDrawCents: number      // part of living costs paid by the company because savings ran out
  transferCents: number         // planned transfer from savings to company
  autoTransferCents: number     // savings moved automatically to cover negative company cash
  cashEndCents: number
  savingsEndCents: number
}
```

Invariants (tested): `cash' = cash + revenue - fixedCosts - founderDraw + transfer + autoTransfer` and `savings' = savings - (livingCosts - founderDraw) - transfer - autoTransfer`.

### LoggedAction and LoggedEvent

```ts
type LoggedAction = { type: 'endWeek'; week: number; plan: WeekPlan }

// Input for the post-mortem: random outcomes with their expected value, and money moves.
type LoggedEvent = InterviewEvent | MoneyEvent

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
  restHours: number                       // counts as planned hours
  transferToCompanyCents: number          // from personal savings
}

type PlanIssue =
  | { code: 'game_over' }
  | { code: 'invalid_number'; field: string }          // negative or not an integer
  | { code: 'unknown_segment'; segmentId: string }
  | { code: 'too_many_hours'; plannedHours: number; maxHours: number }
  | { code: 'transfer_exceeds_savings'; savingsCents: number }
```

`emptyPlan()` returns a plan with nothing planned. `endWeek` throws on a plan with issues.

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
    savingsCents: number
    livingCostCentsPerWeek: number
  }
  company: {
    cashCents: number
    priceCentsPerMonth: number
    fixedCosts: { id: string; name: string; monthlyCents: number }[]
    monthlyFixedCostsCents: number
    runwayWeeks: number | null    // null when there is no history or cash is not shrinking
    uiStage: 'scrappy' | 'organised'
  }
  costs: { interviewHours: number }
  segments: SegmentView[]         // in scenario order
  history: { week: number; cashCents: number; savingsCents: number }[]
}

type SegmentView = {
  id: SegmentId
  name: string
  description: string
  interviews: InterviewView[]     // sample size = interviews.length
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

Runway is `floor(cash / (-sum(operatingNet) / n))` over the last `n <= 4` weeks, where `operatingNet = revenue - fixedCosts - founderDraw` (transfers excluded).

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

type ReportEntry = MoneyMovement   // more kinds arrive with later systems
```

## SaveFile

```ts
type SaveFile = {
  engineVersion: string         // replay refuses a save from another engine version
  scenarioId: string
  seed: string
  actions: LoggedAction[]
}
```

`replay(scenario, save)` creates a fresh game from the seed and applies each action in order. It throws on a version or scenario mismatch, or when an action's week does not match.

## Content: Scenario

zod schema `ScenarioSchema` in `packages/content/src/schema.ts`; `Scenario = z.infer<typeof ScenarioSchema>`. The engine imports it with `import type` only. `loadScenario(id)` merges three YAML files:

| File | Becomes |
|---|---|
| `scenarios/<id>/scenario.yaml` | everything except `features` and `interviewQuotes` |
| `scenarios/<id>/features.yaml` | `features` |
| `scenarios/<id>/messages/interview_quotes.yaml` | `interviewQuotes` |

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
    energy: { max: number; perHourOverBase: number; perRestHour: number; weekWithinBase: number }
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
  features: Feature[]
  interviewQuotes: Record<SegmentId, Record<BucketId, string[]>>
}
```

Cross checks in `superRefine`: unique ids, one role per segment, `maxHoursPerWeek >= baseHoursPerWeek`, start energy within max, every `mustHave` id is a feature, bucket bounds ascend with only the last unbounded, and every segment has quotes for every bucket.

## Content: Feature

Data only in Phase 1 (used by interview mentions and reference checks). The product system arrives in Phase 2.

```ts
type Feature = {
  id: FeatureId
  name: string
  buildHours: number
  bugsOnShip: IntRange
  mention: string               // what an interviewee says when asking for it
}
```

## Content: Event

Arrives in Phase 4. See plan section 4.10.
