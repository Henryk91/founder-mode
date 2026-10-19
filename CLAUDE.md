# CLAUDE.md

## Project

"Founder Mode" (working title, package scope `founder-mode`): a turn based, single player startup simulation game that runs entirely in the browser. One turn is one week. The player allocates founder hours, answers inbox messages, and tries to find paying customers before the money runs out. Demand is hidden and must be inferred from noisy experiments.

The full plan is in `docs/IMPLEMENTATION_PLAN.md`. Follow its phases in order and respect its out of scope list.

## Reference docs

- `docs/IMPLEMENTATION_PLAN.md`: scope, architecture, formulas, phases
- `docs/scenario-kantino.md`: segments, features, and starting values for the first scenario. Source of truth for the content YAML.
- `docs/scenario-zollstock.md`: the second scenario (trade businesses), written as differences from Kantino.
- `docs/abroad-mechanics.md`: the engine additions of the abroad scenarios (day conditions, courses, day trips, assets with buy, lease and share, licences, the tender, local cost steps).
- `docs/scenario-watersports.md`, `docs/scenario-dive.md`, `docs/scenario-gulet.md`: the abroad scenarios Rückenwind, Tiefgang and Leinen los, with sources and values as built.
- `docs/design/design.md`: layout, colour and font tokens, component mapping, and three HTML mockups. Read before any UI work.
- `docs/schema.md`: game state, player view, save file, content schemas. Update it in the same change as any type change.
- `docs/balancing.md`: latest bot report
- `docs/decisions.md`: short log of design decisions and tuning changes

## Commands

- `pnpm install`
- `pnpm dev`: run the web app
- `pnpm test`: all tests
- `pnpm lint`
- `pnpm bots --runs 1000`: balancing report for every scenario in the 60 week game (`--scenario <id>` for one, `--mode long` or `--mode all` for long mode)
- `pnpm seeds`: rewrite `docs/seeds.md` (seeds per ending) after the engine, content or bots change

## Structure

- `packages/engine`: pure TypeScript simulation. No React, DOM, or Node APIs.
- `packages/content`: YAML scenario data (one folder per scenario, plus events shared by all in `src/shared`) and zod schemas
- `packages/bots`: headless strategies and balancing report
- `apps/web`: React UI

## Hard rules

1. The engine is deterministic. Never use `Math.random`, `Date`, or locale dependent functions in `packages/engine`. Use the PRNG in `GameState`.
2. Engine functions are pure: `(state, input) => newState`. Never mutate the input.
3. The UI receives only `PlayerView` from `getView`. Never pass `GameState` or anything under `hidden` to `apps/web` components.
4. Never show probabilities or hidden values to the player. Show observable facts and costs in hours.
5. Scenario numbers and texts live in `packages/content` YAML, not in code.
6. No hardcoded UI strings. Use `labels.ts` with the current `uiStage`.
7. Tap only interactions. No hover, drag and drop, or right click dependencies.
8. Money is integer cents. Time is hours.
9. Phone layout first. Every screen must work at 390 px width.
10. Do not build anything on the out of scope list in the plan.

## Working style

- Before coding a phase, list the files you will touch and any ambiguity.
- Write tests alongside each system. A phase is done only when its "Done when" criteria hold and `pnpm test` and `pnpm lint` pass.
- Bot runs follow "Bot report budget" below. Update `docs/balancing.md` with whatever parts you ran.
- Record design or tuning decisions in `docs/decisions.md` in one or two lines each.
- Stop at the end of each phase and summarise.

## Writing style for game text

- Short messages, 2 to 4 sentences, dry humour
- Fictional company and person names only
- British spelling, EUR, metric units
- No em dashes

## Bot report budget

The full bot report (every scenario, 10,000 wide seeds, event tables) takes about two hours. It slows development badly, so run it only when it is truly needed. These rules override any plan file that asks for more.

What to run, by kind of change:

- **UI, labels, docs, game text only** (no numbers, no engine, no bots): `pnpm lint` and `pnpm test`. No bot runs.
- **Only the view or the UI stage changes, not outcomes:** lint, tests, and the main part (`--parts main`) of the affected scenarios on 1,000 seeds to prove outcomes are identical. Minutes, not hours.
- **Content values or bot logic of one scenario:** only that scenario, only the parts whose targets can move, 1,000 seeds. 10,000 only for a target being tuned whose effect is smaller than its margin at 1,000.
- **Engine changes:** the main part of every scenario on 1,000 seeds. The engine is deterministic, so identical results on 1,000 seeds prove a game is unchanged; 10,000 seeds are never needed to prove "unchanged".
- **Event content:** the event table (`--events`) for the affected scenario only.
- **End of a whole plan, before a release, or when Henry asks:** the full report, once.
- **How to run the full report:** one scenario per process, never all scenarios in one (that runs out of memory after about an hour and writes nothing). For Kantino long, name the parts explicitly and include `team` and `funding`, because the default parts leave them out.

Rules:

- Never run the full report at the end of every step, and never rerun it to re-confirm something an earlier run already showed.
- Before starting any run expected to take longer than 15 minutes, check this list. If the change is not under an item that requires it, do not run it.
- When you report results, say which parts and how many seeds you ran.
