# Implementation Plan: Startup Simulation Game (working title "Founder Mode")

Scope: from empty repo up to and including the **early MVP**.
Audience: Claude Code, working phase by phase with a human reviewer.

All numeric values in this plan are **starting values to be tuned by bot runs and playtests**, not researched benchmarks. Time estimates are rough guesses for one part time developer.

---

## 0. Decisions and assumptions

These are defaults. Change them here before starting and Claude Code will follow.

| Decision | Default | Notes |
|---|---|---|
| Working title | Founder Mode | Placeholder, repo and packages use `founder-mode` |
| First scenario | "Kantino": B2B lunch ordering software for office kitchens | Matches the mockups |
| Setting | Germany, EUR, light legal flavour only | No real tax rules in early MVP |
| UI language | English | All strings via a label table so German can follow |
| Platform | Browser, phone layout first, desktop layout second | No native wrapper yet |
| Backend | None | Everything runs client side, saves in the browser |
| Package manager | pnpm workspaces | |
| Run length | Max 78 weeks, target 60 to 90 minutes of play | |
| Turn | 1 week, 50 founder hours | |
| Team in early MVP | Solo founder plus at most one hire | No cofounder yet |
| Funding in early MVP | Bootstrapping plus personal savings | No loans, angels, or VC yet |

### In scope for the early MVP

1. Deterministic, seeded simulation engine in pure TypeScript
2. One scenario with 3 customer segments and hidden demand
3. Validation experiments: interviews, landing page test, pre-sale
4. Product building: features, quality, bugs
5. Sales pipeline: outreach, demo, trial, paying, churn
6. Finance: cash, invoices with late payers, fixed costs, bookkeeping backlog
7. Founder: hours, energy, personal savings, two skills that improve with use
8. One hire (developer or salesperson)
9. Inbox with events and choices (target 60 events)
10. Endings, post-mortem screen, milestones, best runs
11. Phone layout (primary) and desktop desk layout
12. "Scrappy" visual style, plus one visible UI upgrade step at a milestone
13. Local saves as seed plus action log
14. Bot players and a balancing report

### Explicitly out of scope (do not build)

Cofounders, investors, loans, term sheets, board, legal form choice, real tax rules, multiple scenarios, competitors that react, cloud saves, accounts, telemetry backend, LLM generated dialogue, animated scene, established stage UI, company branding, sound, PWA or store packaging.

Keep the architecture open for these, but write no code for them.

---

## 1. Tech stack

| Concern | Choice |
|---|---|
| Language | TypeScript, `strict: true` |
| Monorepo | pnpm workspaces |
| Front end | React 18+ with Vite |
| UI state | Zustand (thin store around the engine) |
| Styling | CSS Modules plus CSS custom properties for theming |
| Content validation | zod schemas, validated at build time and in tests |
| Tests | Vitest |
| Lint and format | ESLint, Prettier |
| Fonts | IBM Plex Sans, IBM Plex Mono, Caveat (handwriting) |
| Hosting | Any static host |

---

## 2. Repository structure

```
founder-mode/
  CLAUDE.md
  docs/
    IMPLEMENTATION_PLAN.md     this file
    schema.md                  game state and content schemas (kept in sync with code)
    balancing.md               latest bot report and tuning notes
    decisions.md               short log of design decisions
  packages/
    engine/                    pure TS, no React, no DOM, no Node APIs
      src/
        index.ts               public API only
        types.ts               GameState, PlayerView, actions, events
        rng.ts                 seeded PRNG
        create.ts              createGame
        turn.ts                endWeek pipeline
        systems/
          founder.ts
          market.ts            hidden demand, segments
          experiments.ts
          product.ts
          sales.ts
          finance.ts
          team.ts
          inbox.ts             event selection and choice effects
          milestones.ts
          endings.ts
        view.ts                GameState -> PlayerView (strips hidden data)
        save.ts                serialise, replay
        postmortem.ts
      test/
    content/
      src/
        scenarios/kantino/
          scenario.yaml        segments, ranges, starting values
          features.yaml
          events/*.yaml
          messages/*.yaml      interview quotes, customer texts
        schema.ts              zod schemas
        load.ts
      test/
    bots/                      Node CLI, imports engine and content
      src/
        strategies/*.ts
        run.ts
        report.ts
  apps/
    web/
      src/
        main.tsx
        store.ts               Zustand store wrapping the engine
        labels.ts              label table keyed by ui stage
        theme/                 CSS variables per ui stage
        screens/               Inbox, Plan, Pipeline, Money, Team, Results, PostMortem, Start
        layouts/               PhoneLayout, DeskLayout
        components/
```

---

## 3. Architecture rules (hard constraints)

1. **Engine purity.** `packages/engine` imports nothing from React, the DOM, Node, or `apps/`. Enforce with an ESLint `no-restricted-imports` rule.
2. **Determinism.** No `Math.random`, `Date.now`, or locale dependent calls inside the engine. All randomness comes from the PRNG whose state lives in `GameState`. Same seed plus same actions must give an identical state. A test enforces this.
3. **Immutable transitions.** Every engine function is `(state, input) => newState`. No mutation of the input state.
4. **Hidden information boundary.** The UI never receives `GameState`. It only receives `PlayerView`, produced by `view.ts`, which contains no hidden fields. A test asserts that hidden keys do not appear in the serialised view.
5. **Content as data.** Events, segments, features, and texts live in YAML and are validated by zod. No scenario specific text or numbers in engine code.
6. **Labels through a table.** No hardcoded UI strings in components. `labels.ts` maps a key and the current `uiStage` to a string, for example `pipeline.title` gives "Who might pay us" at stage `scrappy` and "Sales pipeline" at stage `organised`.
7. **Tap only.** No interaction may depend on hover, drag and drop, or right click.
8. **Money in cents, time in hours.** Integers only, to avoid float drift.

---

## 4. Engine design

### 4.1 Public API (`packages/engine/src/index.ts`)

```ts
createGame(scenario: Scenario, seed: string): GameState
getView(state: GameState): PlayerView
respond(state: GameState, messageId: string, choiceId: string): GameState
validatePlan(state: GameState, plan: WeekPlan): PlanIssue[]
endWeek(state: GameState, plan: WeekPlan): { state: GameState; report: WeekReport }
toSave(state: GameState): SaveFile
replay(scenario: Scenario, save: SaveFile): GameState
buildPostMortem(state: GameState): PostMortem
```

### 4.2 Game state (summary, full version goes in `docs/schema.md`)

```ts
type GameState = {
  engineVersion: string
  scenarioId: string
  seed: string
  rng: RngState
  week: number                       // starts at 1
  status: 'running' | 'ended'
  ending?: EndingId

  founder: {
    hoursPerWeek: number             // 50
    energy: number                   // 0..100
    savingsCents: number
    livingCostCentsPerWeek: number
    skills: { interviewing: number; selling: number }   // 0..1
  }

  company: {
    cashCents: number
    priceCentsPerMonth: number
    fixedCosts: FixedCost[]
    bookkeepingBacklogHours: number
    uiStage: 'scrappy' | 'organised'
  }

  hidden: {
    segments: Record<SegmentId, HiddenSegment>   // never leaves the engine
    candidates: Record<string, HiddenCandidate>
  }

  knowledge: Record<SegmentId, Evidence[]>       // what the player has observed
  product: { features: Feature[]; quality: number; bugs: number }
  leads: Lead[]
  customers: Customer[]
  invoices: Invoice[]
  team: TeamMember[]
  inbox: Message[]
  scheduled: ScheduledEffect[]       // things that land in a future week
  milestones: MilestoneId[]
  actionLog: LoggedAction[]          // for saves and replay
  eventLog: LoggedEvent[]            // for post-mortem, includes rolls and expected values
}
```

### 4.3 Hidden demand model

Each segment has hidden parameters drawn from scenario ranges at game creation:

| Field | Meaning | Range in scenario file |
|---|---|---|
| `size` | Reachable companies | e.g. 200 to 2000 |
| `pain` | How much they need this, 0..1 | e.g. 0.1 to 0.9 |
| `wtpCents` | Willingness to pay per month | per segment |
| `mustHave` | Feature ids they require | fixed per segment |
| `politeness` | Bias added to interview answers, 0.1..0.35 | per segment |
| `channelResponse` | Reply rate per outreach channel | per segment |
| `paymentDelayDays` | Typical lateness of invoices | per segment |

The scenario guarantees that at least one segment is viable and at least one is a trap (high politeness, low pain).

Derived values:

```
coverage    = share of mustHave features that are shipped (0..1)
fit         = pain * coverage * (0.5 + 0.5 * quality / 100)
priceFactor = price <= wtp ? 1 : exp(-2 * (price / wtp - 1))
```

### 4.4 Experiments (noisy signals)

| Experiment | Cost | What the player sees | Formula |
|---|---|---|---|
| Interview | 2 h each | One of 5 text buckets plus a quote | `pain + politeness * (1 - skills.interviewing) + N(0, 0.2)` |
| Landing page test | 8 h + ad budget, result after 2 weeks | Visitors and sign ups | `signups ~ Binomial(visitors, 0.02 + 0.15 * pain)` |
| Pre-sale | 6 h per 5 prospects, result after 1 week | Number who commit money | `Binomial(n, 0.5 * pain * priceFactor)` |

Rules:
- Each result is stored in `knowledge` with its sample size, so the UI can show "based on 3 interviews".
- `skills.interviewing` rises slightly with every interview, which reduces the politeness bias. This rewards practice.
- Interviews measure what people say. Pre-sales measure what they do. The post-mortem compares both to the truth.

### 4.5 Sales pipeline

Stages: `lead -> demo -> trial -> paying`, plus `lost`.

| Step | Driver | Starting formula |
|---|---|---|
| New leads | Outreach hours on a segment and channel | `hours * channelResponse * (0.5 + skills.selling)` |
| Lead to demo | Needs 3 h of founder time in the week | `0.25 * (0.4 + 0.6 * pain)` per week |
| Demo to trial | After the demo is held | `0.2 + 0.6 * fit` |
| Trial to paying | After 2 weeks of trial | `fit * priceFactor` |
| Ghosting | Any open lead not touched | 10% per week to go silent, then lost after 4 weeks |
| Churn | Monthly per customer | `0.02 + 0.25 * (1 - fit) + 0.01 * bugs`, capped at 0.6 |

Leads show only observable facts (company name, size, last contact, what they said). Never show probabilities.

### 4.6 Product

- Features have a cost in hours and may be a `mustHave` for one or more segments. The player does not know which until evidence suggests it.
- Build hours add progress to the chosen feature. Shipping a feature adds 1 to 3 bugs.
- `quality` drops with bugs and rises with bug fixing hours.
- A hired developer adds build hours per week.

### 4.7 Finance

- Weekly: founder living costs are deducted from personal savings.
- Every 4th week: fixed costs (tools, coworking seat, salaries) are deducted from company cash.
- Customers are invoiced monthly. Each invoice gets a due week and an actual payment week drawn from the segment's delay distribution. Some pay late, a few never pay.
- `chaseInvoice` hours raise the chance of payment in the following week.
- Bookkeeping needs 2 h per week. Unspent hours accumulate in `bookkeepingBacklogHours`. Above 12 h a penalty event fires (late fee, lost time).
- The founder can move money from personal savings into the company as an action.
- Runway shown to the player = weeks until cash reaches zero at the average net change of the last 4 weeks.

### 4.8 Founder

- 50 hours per week. The player may plan up to 65.
- Hours above 50 cost energy. Planning `rest` hours restores it.
- Energy below 30: all success probabilities are scaled by 0.85. Energy at 0 for 3 consecutive weeks: burnout ending.

### 4.9 Team (one hire)

- Starting a search costs 6 h and produces 3 candidates after 2 weeks.
- Each candidate has a hidden `trueSkill` and a visible, noisy `interviewImpression`.
- Roles: developer (adds build hours) or salesperson (adds outreach hours and handles demos).
- Salary is a fixed cost. Letting them go costs 4 weeks of salary.

### 4.10 Inbox and events

Event definition (YAML):

```yaml
id: late_payer_first
weight: 3
once: true
when:                     # all conditions must hold
  - customers.count >= 1
  - invoices.overdueDays >= 14
from: customer            # resolves to a real customer
text: messages.late_payer_first.body
choices:
  - id: reminder
    label: Send a friendly reminder
    hours: 0.5
    effects:
      - { type: invoicePayChance, delta: 0.15 }
  - id: call
    label: Call their accounting team
    hours: 2
    effects:
      - { type: invoicePayChance, delta: 0.45 }
  - id: pause
    label: Pause their account
    hours: 0
    effects:
      - { type: invoicePayChance, delta: 0.6 }
      - { type: churnChance, delta: 0.35 }
```

- Conditions use a small, safe expression set evaluated by the engine. No `eval`.
- Effects are a closed union type. Adding a new effect type means adding it to the engine and to the zod schema.
- Each week the engine selects up to 3 eligible events by weighted draw. Unanswered messages expire with a default choice.
- Choices show their cost in hours, never their probabilities.

### 4.11 Turn resolution order (`turn.ts`)

1. Validate plan against available hours
2. Apply inbox responses made this week
3. Founder: hours, energy
4. Experiments: start new ones, resolve those that are due
5. Product: build progress, shipping, bugs
6. Sales: outreach, stage transitions, ghosting
7. Team: search progress, hire start, weekly output
8. Finance: invoices issued and paid, weekly costs, monthly costs on every 4th week
9. Churn check on every 4th week
10. Scheduled effects that land this week
11. Milestones
12. Endings
13. Select new inbox events for next week
14. Advance week, append to logs, return `WeekReport`

### 4.12 Milestones and UI stage

Milestones: first interview, first sign up, first paying customer, 1,000 EUR monthly revenue, first hire, break even month, 52 weeks survived.

`uiStage` switches from `scrappy` to `organised` at the first hire or at 2,000 EUR monthly revenue, whichever comes first. This is the single UI upgrade step in the early MVP: labels change, the pipeline shows one new number (conversion from demo to trial), and the handwriting font is replaced on that panel only.

### 4.13 Endings

| Ending | Condition |
|---|---|
| Bankrupt | Company cash below zero and no savings left to inject |
| Burnout | Energy at 0 for 3 consecutive weeks |
| Shut down | Player chooses to stop |
| Still searching | Week 78 reached, not profitable |
| Sustainable business | Week 78 reached, profitable for the last 8 weeks |

### 4.14 Save format

```ts
type SaveFile = {
  engineVersion: string
  scenarioId: string
  seed: string
  actions: LoggedAction[]   // week plans and inbox responses in order
}
```

`replay` rebuilds the state by applying actions to a fresh game. Autosave after every action. Loading a save from a different `engineVersion` shows a warning and starts a new run.

### 4.15 Post-mortem

Built only from `eventLog`, `knowledge`, and `hidden`:

1. **What ended the run**, in one sentence, with the chain of the last 3 decisive events
2. **Truth reveal:** per segment, the real pain and willingness to pay next to what the player's evidence suggested
3. **Misread signals:** cases where evidence pointed the wrong way, and the sample size behind it
4. **Hours breakdown:** share of time on validation, building, selling, admin
5. **Luck:** for the 5 highest impact random outcomes, the roll compared with its expected value, so players can separate bad decisions from bad luck
6. **One suggestion** for the next run, selected by rule from a fixed list

---

## 5. Content for the early MVP

| Type | Target count |
|---|---|
| Scenario | 1 (Kantino) |
| Segments | 3: small offices, coworking spaces, medical practices |
| Features | 8, of which each segment requires 2 or 3 |
| Events | 60, spread over validation, sales, product, finance, founder, team |
| Interview quotes | 10 per segment per bucket band (low, mid, high) |
| Company name pool | 80 fictional names |

Tone: dry humour, short messages (2 to 4 sentences). No real company names.

---

## 6. User interface

### 6.1 Screens

| Screen | Content |
|---|---|
| Start | New run (optional seed), continue, best runs |
| Inbox | "Things that need you" summary, message feed, choices |
| Plan | Hours per activity with steppers, remaining hours, energy warning |
| Pipeline | Leads grouped by stage, tap for detail and actions |
| Money | Cash, runway, recent and upcoming payments, open invoices, savings transfer |
| Team | Founder status, hire search, team member |
| Results | End of week sequence: what happened, in order |
| Post-mortem | See 4.15 |

Pinned on every screen: week, cash, runway, End week button.

### 6.2 Layouts

- **PhoneLayout** (under 900 px): one screen at a time, bottom tab bar with 5 tabs.
- **DeskLayout** (900 px and up): inbox left, scene image plus plan and pipeline centre, money and upcoming right. Same screen components, arranged side by side.

Reference mockups exist on a design canvas: phone inbox, scrappy desk, established desk (the last one is out of scope and shown only as a direction).

### 6.3 Scrappy style

- Dark green ground, white paper cards, yellow sticky notes, corkboard for the pipeline, ruled notebook for the plan
- Handwriting font for notes and the plan, mono font for money
- Scene: one static image per office stage (kitchen table, coworking desk). Placeholder illustrations are acceptable.
- All colours and fonts come from CSS variables in `theme/`, selected by `uiStage`

### 6.4 Headline numbers

Always visible: cash, runway, monthly revenue, paying customers. Each shows its change over the last 4 weeks. Customer acquisition cost and churn rate appear only after enough data exists (10 closed leads, 3 months of customers).

---

## 7. Bots and balancing

`packages/bots` runs complete games without UI.

| Strategy | Behaviour | Expected result |
|---|---|---|
| random | Random valid plans | Almost always loses |
| build_only | Builds features, never talks to customers | Loses more than 90% |
| sell_first | Outreach immediately, no validation | Loses often, wins sometimes |
| validate_then_build | Interviews and pre-sales, picks best segment, builds must haves, then sells | Best results, but not guaranteed |
| overworker | Plans 65 h every week | Burns out |

Command: `pnpm bots --runs 1000 --seed-prefix test`

Report per strategy: ending distribution, median week of death, median peak revenue. Written to `docs/balancing.md`.

Targets for the early MVP:

1. `build_only` reaches "Sustainable business" in under 5% of runs
2. `validate_then_build` reaches it in 25 to 45% of runs
3. No strategy exceeds 60%
4. Median run length for losing runs is between week 20 and week 50
5. 1000 runs complete in under 60 seconds

If a target fails, tune scenario values first and formulas second, and record the change in `docs/decisions.md`.

---

## 8. Testing

| Area | Tests |
|---|---|
| Determinism | Same seed and actions give deep equal state |
| Replay | `replay(toSave(state))` equals `state` |
| Hidden boundary | Serialised `PlayerView` contains no hidden keys |
| Purity | Input state is unchanged after `endWeek` (deep freeze in tests) |
| Systems | Unit tests per system with fixed seeds |
| Content | Every YAML file passes its zod schema, every referenced id exists |
| Invariants | Property style test over 200 random runs: hours never negative, cash arithmetic consistent, no NaN |
| UI | Smoke test: start a run, end 3 weeks, reach the results screen |

All tests run with `pnpm test`. A phase is not done until tests pass and lint is clean.

---

## 9. Phases

Work strictly in order. Stop at the end of each phase for review.

### Phase 0: Setup (about 1 day)

- Monorepo, TypeScript config, ESLint with the engine import restriction, Prettier, Vitest
- Empty packages with one passing test each
- `CLAUDE.md`, `docs/schema.md` skeleton

**Done when:** `pnpm install`, `pnpm test`, `pnpm lint`, and `pnpm dev` all work.

### Phase 1: Engine core (about 1 week)

- `rng.ts`, `types.ts`, `createGame`, `endWeek` skeleton with the resolution order
- Systems: founder, market (hidden segments), experiments (interviews only), finance (cash and fixed costs), endings (bankrupt, week limit)
- `view.ts`, `save.ts`
- Minimal Kantino scenario file with 3 segments

**Done when:** a scripted test can play 78 weeks, determinism, replay, and hidden boundary tests pass.

### Phase 2: Playable prototype, phone layout (about 1 week)

- Zustand store, Start, Plan, Money, Results screens, plain styling
- Add product (features, shipping) and a simple sales pipeline
- Autosave and continue

**Done when:** a person can play a full run on a phone browser from start to an ending. This is the version to playtest for fun. **Pause here for a human playtest before continuing.**

### Phase 3: Bots and first balancing (about 3 days)

- `packages/bots` with the five strategies and the report
- First tuning pass against the targets in section 7

**Done when:** the report runs and targets 1 and 5 are met.

### Phase 4: Full early MVP systems (about 3 weeks)

- Landing page test and pre-sale experiments
- Invoices with late payers, chasing, bookkeeping backlog
- Energy, overwork, burnout ending
- Founder skills
- One hire with noisy candidates
- Inbox system, event schema, condition evaluator, effects
- First 25 events

**Done when:** all systems have tests, bots are updated to use the new actions, all five balancing targets are met.

### Phase 5: Content (about 2 weeks, parallel to phase 6)

- Remaining events up to 60, interview quotes, name pools
- Content validation tests

**Done when:** content counts in section 5 are reached and 20 consecutive manual weeks show no repeated event.

### Phase 6: Scrappy UI and desktop layout (about 2 weeks)

- Theme variables, fonts, paper, sticky note, corkboard, notebook components
- Inbox, Pipeline, and Team screens in final form
- DeskLayout
- Static scene images for two office stages
- Headline numbers with changes
- End of week results sequence

**Done when:** both layouts are usable, no string is hardcoded, and nothing depends on hover or drag.

### Phase 7: Post-mortem, milestones, UI stage step (about 1 week)

- `buildPostMortem` and its screen
- Milestones with a short notice in the results sequence
- `uiStage` switch to `organised` with changed labels and one unlocked number
- Best runs on the Start screen

**Done when:** every ending leads to a post-mortem that names a cause, shows the truth reveal, and lists at least one misread signal when one exists.

### Phase 8: Hardening (about 1 week)

- Final balancing pass, update `docs/balancing.md`
- Save version check
- Accessibility: contrast, touch targets of 44 px or more, real buttons, keyboard focus
- Performance check on a mid range phone
- Static build and deploy

**Done when:** a new player can finish a run without explanation. This is the early MVP.

---

## 10. How to start with Claude Code

1. Create an empty repo, add this file as `docs/IMPLEMENTATION_PLAN.md` and the provided `CLAUDE.md` at the root.
2. First prompt:

   > Read CLAUDE.md and docs/IMPLEMENTATION_PLAN.md. Implement Phase 0 only. Then stop and summarise what you created and how to run it.

3. For each following phase:

   > Implement Phase N from docs/IMPLEMENTATION_PLAN.md. Before coding, list the files you will create or change and any ambiguity you see. Update docs/schema.md for every type you add or change. Stop when the "Done when" criteria are met and show me the test output.

4. After Phase 2, play it yourself and with 3 to 5 other people before investing in Phases 4 to 8. If the core loop is not fun, change the design, not the polish.

---

## 11. Known risks

| Risk | Mitigation |
|---|---|
| Core loop is not fun | Playtest gate after Phase 2 |
| A dominant strategy exists | Bot targets, run after every formula change |
| Content repeats too quickly | `once` flags, weights, 60 events minimum |
| Hidden data leaks into the UI | `PlayerView` boundary and its test |
| Scope creep | Section 0 out of scope list; additions need an entry in `docs/decisions.md` |
| Realism claims | Values are invented starting points. Have real founders review whether winning strategies would be good advice in reality |
