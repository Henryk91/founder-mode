# Founder Mode

A turn based startup simulation that runs entirely in your browser. You are a solo founder in Munich with a few months of money and no customers. Each turn is one week: split your hours between talking to people, testing demand, building, selling and resting, answer the inbox, set your price, and try to find paying customers before the cash runs out.

Demand is hidden. You cannot read it off a dial; you infer it from noisy experiments such as interviews, landing page tests, pre-sales and sales outreach. When a run ends, the post-mortem shows what was really going on in each market.

**Play it:** https://henryk91.github.io/founder-mode/

Two scenarios, picked on the Start screen:

- **Kantino**: lunch ordering software for offices, coworking spaces and medical practices.
- **Zollstock**: job plans and quotes for trade businesses that run on paper and phone calls.

A run lasts up to 60 weeks, roughly 45 to 70 minutes of play. It ends in a sustainable business, bankruptcy, burnout, a shut down, or still searching at week 60. Saves and best runs live in your browser (`localStorage`), so they are per device and per address. The same seed gives the same market.

## Run it locally

Requires Node 20.19 or later and pnpm 10.

```sh
pnpm install
pnpm dev      # run the web app at http://localhost:5173
pnpm test     # all tests (browser tests run where Chrome is installed, or set CHROME_PATH)
pnpm lint     # eslint, prettier, typecheck
pnpm build    # production build into apps/web/dist
```

To start a run on a particular seed, type it into "Seed (optional)" on the Start screen before pressing New run.

## Bots and the balancing report

Headless bot players use the same engine and see only what a player sees. They check that the game is winnable, that careful play beats careless play, and that no single trick wins.

```sh
pnpm bots --runs 1000                        # report for every scenario into docs/balancing.md
pnpm bots --runs 1000 --scenario zollstock   # one scenario, keeps the other's section
pnpm bots --runs 1000 --wide-runs 10000 --seed-prefix test --events   # the full report, as committed (about 25 minutes)
pnpm seeds                                   # rewrite docs/seeds.md: seeds that reach each ending
```

The targets the report checks are in `docs/IMPLEMENTATION_PLAN.md`, section 7. After any change to formulas, scenario values, engine types or bot logic, rerun the report and commit `docs/balancing.md` with the change. `packages/bots/test/seeds.test.ts` replays every seed in `docs/seeds.md` and fails when one no longer reaches its ending; `pnpm seeds` then finds new ones.

## How it is organised

| Path               | What it holds                                                          |
| ------------------ | ---------------------------------------------------------------------- |
| `packages/engine`  | Pure, deterministic TypeScript simulation. No React, DOM or Node APIs. |
| `packages/content` | YAML scenario data (segments, features, events) and zod schemas        |
| `packages/bots`    | Headless strategies, the balancing report and the seeds per ending     |
| `apps/web`         | React UI, phone layout first, desk layout from 1200 px                 |

A few rules shape the code:

- The engine is deterministic and pure: `(state, input) => newState`, seeded PRNG held in the game state, no `Math.random` or `Date`.
- The UI only ever sees `PlayerView`. Hidden demand never reaches a component.
- Scenario numbers and texts live in content YAML, UI strings in `labels.ts`.
- Money is integer cents, time is hours.
- Everything is tap only, works by keyboard, and must work at 375 px width.

## Docs

- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md): scope, architecture, formulas, phases, and what comes after the early MVP
- [`docs/scenario-kantino.md`](docs/scenario-kantino.md) and [`docs/scenario-zollstock.md`](docs/scenario-zollstock.md): segments, features and starting values
- [`docs/design/design.md`](docs/design/design.md): layout, tokens and mockups
- [`docs/schema.md`](docs/schema.md): game state, player view, save file, content schemas
- [`docs/balancing.md`](docs/balancing.md): latest bot report
- [`docs/seeds.md`](docs/seeds.md): seeds that reach each ending
- [`docs/decisions.md`](docs/decisions.md): design and tuning decisions
- [`CLAUDE.md`](CLAUDE.md): working rules for Claude Code

## Deployment

Pushing to `main` (or starting the workflow by hand) runs `.github/workflows/deploy.yml`: install, lint, test, build, then publish `apps/web/dist` to GitHub Pages at https://henryk91.github.io/founder-mode/. A failing test stops the deploy. The Vite `base` is `/founder-mode/` for production builds and `/` in dev, so every asset path is relative. In the repository settings, Pages must use the "GitHub Actions" source.

The build parses the content YAML into JSON ahead of time and ships fonts cut down to Latin-1 (regenerate them with `pnpm --filter @founder-mode/web fonts`). Saves are tied to the engine version and a fingerprint of the scenario: after a change to either, an old save gets a notice instead of replaying into a different game, and best runs are kept.

## Status

Early MVP complete (local tag `mvp-early`). Values are invented starting points tuned by bots and playtests, not researched benchmarks, and the game is not startup advice.
