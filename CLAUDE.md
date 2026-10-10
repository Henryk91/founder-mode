# CLAUDE.md

## Project

"Founder Mode" (working title, package scope `founder-mode`): a turn based, single player startup simulation game that runs entirely in the browser. One turn is one week. The player allocates founder hours, answers inbox messages, and tries to find paying customers before the money runs out. Demand is hidden and must be inferred from noisy experiments.

The full plan is in `docs/IMPLEMENTATION_PLAN.md`. Follow its phases in order and respect its out of scope list.

## Reference docs

- `docs/IMPLEMENTATION_PLAN.md`: scope, architecture, formulas, phases
- `docs/scenario-kantino.md`: segments, features, and starting values for the first scenario. Source of truth for the content YAML.
- `docs/design/design.md`: layout, colour and font tokens, component mapping, and three HTML mockups. Read before any UI work.
- `docs/schema.md`: game state, player view, save file, content schemas. Update it in the same change as any type change.
- `docs/balancing.md`: latest bot report
- `docs/decisions.md`: short log of design decisions and tuning changes

## Commands

- `pnpm install`
- `pnpm dev`: run the web app
- `pnpm test`: all tests
- `pnpm lint`
- `pnpm bots --runs 1000`: balancing report

## Structure

- `packages/engine`: pure TypeScript simulation. No React, DOM, or Node APIs.
- `packages/content`: YAML scenario data and zod schemas
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
- After any change to formulas or scenario values, run the bots and update `docs/balancing.md`.
- After any change to engine types, content fields, or bot logic, rerun the bot report with `--events` and commit the regenerated `docs/balancing.md` in the same piece of work.
- Record design or tuning decisions in `docs/decisions.md` in one or two lines each.
- Stop at the end of each phase and summarise.

## Writing style for game text

- Short messages, 2 to 4 sentences, dry humour
- Fictional company and person names only
- British spelling, EUR, metric units
- No em dashes
