# Founder Mode

A turn based startup simulation that runs entirely in your browser. You are a solo founder in Munich with a few months of money and no customers. Each turn is one week: split your hours between talking to people, building, selling and resting, answer the inbox, and try to find paying customers before the cash runs out.

Demand is hidden. You cannot read it off a dial, only infer it from noisy experiments such as interviews, landing page tests, pre-sales and sales outreach.

**Play it:** https://henryk91.github.io/founder-mode/

The first scenario is "Kantino", lunch ordering software for office kitchens, with three customer segments. A run lasts up to 60 weeks, roughly 45 to 70 minutes of play. Saves live in your browser (`localStorage`), so they are per device and per address.

## Run it locally

Requires Node 20.19 or later and pnpm 10.

```sh
pnpm install
pnpm dev      # run the web app
pnpm test     # all tests
pnpm lint     # eslint, prettier, typecheck
pnpm build    # production build into apps/web/dist
pnpm bots --runs 1000   # balancing report from headless bot players
```

## How it is organised

| Path               | What it holds                                                          |
| ------------------ | ---------------------------------------------------------------------- |
| `packages/engine`  | Pure, deterministic TypeScript simulation. No React, DOM or Node APIs. |
| `packages/content` | YAML scenario data (segments, features, events) and zod schemas        |
| `packages/bots`    | Headless strategies and the balancing report                           |
| `apps/web`         | React UI, phone layout first                                           |

A few rules shape the code:

- The engine is deterministic and pure: `(state, input) => newState`, seeded PRNG held in the game state, no `Math.random` or `Date`.
- The UI only ever sees `PlayerView`. Hidden demand never reaches a component.
- Scenario numbers and texts live in content YAML, UI strings in `labels.ts`.
- Money is integer cents, time is hours.
- Everything is tap only and must work at 390 px width.

## Docs

- [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md): scope, architecture, formulas, phases
- [`docs/scenario-kantino.md`](docs/scenario-kantino.md): segments, features and starting values
- [`docs/design/design.md`](docs/design/design.md): layout, tokens and mockups
- [`docs/schema.md`](docs/schema.md): game state, player view, save file, content schemas
- [`docs/balancing.md`](docs/balancing.md): latest bot report
- [`docs/decisions.md`](docs/decisions.md): design and tuning decisions
- [`CLAUDE.md`](CLAUDE.md): working rules for Claude Code

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: lint, test, build, then publish `apps/web/dist` to GitHub Pages. The Vite `base` is `/founder-mode/` for production builds only. In the repository settings, Pages must use the "GitHub Actions" source.

## Status

Early MVP in progress. Values are invented starting points tuned by bots and playtests, not researched benchmarks, and the game is not startup advice.
