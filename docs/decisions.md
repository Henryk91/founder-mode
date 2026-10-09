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
