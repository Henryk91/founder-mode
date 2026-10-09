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
