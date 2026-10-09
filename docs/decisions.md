# Decisions

Short log of design and tuning decisions. One or two lines each, newest last.

## Phase 0

- Workspace packages export TypeScript source directly (`exports: ./src/index.ts`), with no build step. Vite and tsx compile on the fly.
- `pnpm lint` runs ESLint, a Prettier check, and `tsc` typecheck in every package.
- The engine tsconfig has no DOM or Node types, and ESLint also blocks `Math.random`, `Date`, `Intl`, and locale methods there.
- React 19 (the plan says 18 or later).

## Phase 1

- `Scenario` is the zod inferred type in content. The engine uses `import type` only (ESLint enforced), so zod and YAML never enter the engine.
- `GameState` carries its `scenario`, because `endWeek` and `getView` take no scenario argument. The save file does not; `replay` takes it.
- YAML is loaded with Vite `?raw` imports. Bots must run under `vite-node` instead of `tsx` from Phase 3.
- PRNG is sfc32 seeded by xmur3. Normal noise is Irwin-Hall (12 uniforms), because `Math.log` and `Math.cos` can differ between browsers and would break replays.
- A month is 4 weeks. Fixed costs land in weeks 4, 8, 12 and so on.
- Bankrupt rule (confirmed): living costs come from savings, and the company pays any shortfall (founder draw). Negative company cash is topped up from savings automatically. Bankrupt means cash is still negative after the top up.
- Founder draws, automatic top ups, and manual savings transfers each appear in `WeekReport.entries` and in `eventLog` with amounts. The manual transfer stays as a week plan action. Private money put in = manual transfers + top ups (`privateMoneyInCents`).
- Week limit: after week 78 resolves, `sustainable` if each of the last two 4 week months was profitable (scenario doc definition), else `still_searching`. `week` does not advance after the run ends.
- Energy rules from scenario section 7 apply from Phase 1; rest counts as planned hours. The low energy penalty and burnout wait for Phase 4.
- Interviews run in scenario segment order, so a plan's key order cannot change the outcome.
- Skills are not in `PlayerView`: they are raw 0..1 values that tune hidden bias.
- `features.yaml` added in Phase 1 as data only, so `mustHave` references can be validated and interviews can mention features. 2 quotes per segment and bucket for now; Phase 5 raises it to 10.

## Phase 2

- Engine version is 0.2.0: the `WeekPlan` shape changed, so Phase 1 saves cannot be replayed. The UI warns and starts fresh (plan 4.14).
- A lead that agrees to a demo moves to stage `demo` with the weekly chance from plan 4.5. The founder then holds the demo for 3 h, booked per lead in the Pipeline tab. Demos can only be held with answering leads in that stage.
- Outreach is one channel and one hour count per segment per week, to keep the phone UI small. Outreach leads are `floor(x)` plus one with probability `x - floor(x)`.
- Revenue (until Phase 4 invoices): at each month end every customer won in an earlier week pays the monthly price in the same week. Churn runs after that, so a churning customer still pays for their last month.
- Quality is `startQuality - qualityPerBug * bugs` (70 and 3). Fixing bugs costs 4 h each, with carry over of partial hours. Build hours cannot exceed a feature's remaining hours.
- The price cannot be changed yet, and shutting down on purpose is not an ending yet; both are outside the Phase 2 list. The low energy penalty still waits for Phase 4.
- `Math.exp` is replaced by `expNeg` in `math.ts` (Taylor series on x/256, squared 8 times), for the same reason as the Irwin-Hall normal: bit identical replays in every browser.
- Company names are drawn from a per segment pool in `messages/company_names.yaml` (15 to 20 each for now, about 27 each in Phase 5) so a coworking name never shows up as a small office. Names are unique per run; if a pool runs out a number is appended.
- Runway is unknown until 4 weeks are played. Before that the window has no month end, and "cash is not shrinking" was misleading.
- The UI keeps `GameState` in the store closure only. `useGame` hands screens `UiState`, which holds `PlayerView`, the draft plan, and the last `WeekReport`. `checkPlan` gives the UI planned hours and issues without the state.
- The web app imports `@founder-mode/content` only in `store.ts` (to load the scenario) and hands it to the engine. Screens never see it. The scenario still ships in the browser bundle, so its hidden ranges are readable there; hiding them is a Phase 8 topic at most.
- Phase 2 styling is plain: scrappy colour tokens (subset) in `theme/scrappy.css`, system font, white cards on dark green. Fonts, the scene, and the corkboard arrive in Phase 6.
- Phase 2 tabs are Plan, Market (interview notes), Pipeline, and Money. Inbox and Team arrive with their systems. The pipeline tab is named "Who pays" at the scrappy stage.
- The informed test script (`informedPlan` in the engine tests) knows the hidden truth and wins about 35 of 40 runs. It only proves the loop can be won; balancing happens in Phase 3 with honest bots.
- The fit formula constants (0.5 and 0.5) live in `scenario.yaml` under `product` (`fitBase`, `fitPerQuality`), so no scenario number is in engine code. UI step sizes (build 5 h, money 100 and 1,000 EUR) stay in the UI.

## Phase 2b

- Intro cards and founder's note texts live in `messages/intro.yaml` (`intro`, `founderNotes`), validated by zod, including a `goal` card and the allowed placeholders. They reach the UI through `PlayerView.guidance`. Money in them is `{name:eur}`, filled by the UI so the engine never formats.
- The note rules are an engine function over observable state (`systems/guidance.ts`), first match wins, weeks 1 to 4 only. Dismissal is UI state per run and is not saved; a reload brings a dismissed note back. The engine version stays 0.2.0, since replays are unaffected.
- The intro shows for every new run and never for Continue. Help reopens the goal card and a five step "how a week works" list from the label table.
- Explanations for Runway, Cash, Energy and hours are label table text, opened by tapping the term (the runway and cash in the top band, `?` buttons at hours and energy). The band is now 44 px high so those are real tap targets.
- Plan action lines say cost, product and timing, in one or two sentences. Numbers that come from the scenario (interview hours, bug fix hours, demo hours, trial weeks) are passed in, not written into labels.
- The Market tab gains a per segment tally of features people asked for ("asked for by 2 of 5"), an observable fact with its sample size.

## Playtest fixes (before Phase 3)

- Engine version 0.3.0: `WeekPlan` gained `priceCentsPerMonth`, and name and quote draws changed, so 0.2.0 saves cannot be replayed.
- Runway covers company cash plus personal savings, at the net change of the last 4 weeks (revenue minus fixed and living costs). Before 4 weeks it uses known costs. The playtest showed 218 weeks while savings drained, because living costs were left out.
- The week report splits the numbers into company money and the founder's: living costs paid from savings and savings left are now shown.
- Price is a week plan field (null keeps it), applied at the start of the week, with a stepper on the Money tab (10 to 5,000 EUR, UI limits). Customers keep the price they signed at, so raising the price cannot squeeze existing customers without any churn effect.
- The outreach channel is remembered per segment as `SegmentView.lastChannel`, read from the action log, so it also survives a reload.
- Company names are built from two word lists per segment (`first` x `second`, 720 to 750 combinations each), drawn from the unused ones. A numbered name remains only as a fallback once every combination is used.
- 10 interview quotes per segment and bucket. A quote not yet heard in that segment and bucket is picked first, so nothing repeats within a week and a run hears every quote before any repeat.

## Phase 3

- Bots see only `PlayerView` before a week and `WeekReport` after it, like a human. The runner reads the hidden truth for the report only (which market was viable). Bots may read observable scenario facts such as the bucket order.
- Bots run under `vite-node` (content loads YAML through `?raw`). `pnpm bots` writes `docs/balancing.md` and keeps its hand written "Tuning notes" section. `--out -` prints instead, `--only a,b` runs some strategies.
- Strategies: the five from the plan plus `playtest`, which replays the hand playtest (always coworking) on every seed. Pre-sales and landing pages do not exist until Phase 4, so `validate_then_build` validates with interviews: score = mean bucket + share of interviews that asked for a feature. It builds every feature its market asked for and moves to the next market after 12 weeks of selling without a customer there.
- Target 4 counts every losing run of every strategy, still searching runs included (length 78). Target 5 is judged on the slowest strategy per 1000 runs.
- Burnout and the low energy penalty are Phase 4. Until then the overworker cannot burn out, and energy has no effect in the bots.
- Tuning 1, interview signals: trap and mediocre politeness up, viable down, noise 0.30, skill gain 0.01, Urgent from 0.90, mention chance 0.3 + 0.3 x pain. The viable market sounded Urgent 5 of 5 in the playtest; now all three average Painful to an untrained interviewer and the viable one leads after 6 interviews in about 60% of runs.
- Tuning 2, lead volume: all channel responses halved, so the best channel finds about 0.07 leads per hour at the start (one per 15 h, scenario section 10). The playtest found 7 to 8 leads from 45 h a week.
- Tuning 3, starting cash 10,000 EUR (was 15,000): about 42 weeks of runway with savings. Losing runs lasted a median of 55 weeks, now 44 (target 4).
- Tuning 4, willingness to pay: small offices 200 to 450 EUR, medical 180 to 320 EUR. At the default price a viable medical market was almost unwinnable (11% against 75% for coworking). Coworking stays high (600 to 1,500); a player who raises the price there gains, and the bots never change the price.
- Tuning 5, funnel: lead to demo base 0.18, demo to trial 0.05 + 0.40 x fit, selling skill +0.005 per demo, viable pain 0.60 to 0.85, churn 0.03 + 0.20 x misfit. Winners overshot (19 customers for a 7 customer target). Higher churn was rejected: it met the targets but gave 20 to 30% monthly churn for good products.
- Tuning 6 (formula), energy: the low energy penalty (x0.85 on sales chances below 30) and burnout (3 weeks at 0) from scenario section 7 were pulled forward from Phase 4. Without them 65 h weeks were free and the overworker was the best strategy. Engine 0.4.0. Energy rules reach the UI only as the scenario thresholds, in the explanation and a Plan tab warning.
