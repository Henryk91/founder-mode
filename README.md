# Founder Mode

A turn based startup simulation that runs entirely in your browser. You are a solo founder in Munich with a few months of money and no customers. Each turn is one week: split your hours between talking to people, testing demand, building, selling and resting, answer the inbox, set your price, and try to find paying customers before the cash runs out.

Demand is hidden. You cannot read it off a dial; you infer it from noisy experiments such as interviews, landing page tests, pre-sales and sales outreach. When a run ends, the post-mortem shows what was really going on in each market.

**Play it:** https://henryk91.github.io/founder-mode/

Five scenarios, picked on the Start screen:

- **Kantino**: lunch ordering software for offices, coworking spaces and medical practices.
- **Zollstock**: job plans and quotes for trade businesses that run on paper and phone calls.
- **Gratwanderung** (104 weeks only): guided days in the Bavarian Alps for tourists, Munich team days and school groups; weather, seasons, platforms and a staff roster.
- **Hinterhof** (104 weeks only): a neighbourhood restaurant in Munich that needs a bank loan to open; covers, food cost, crews per service, deposits and the delivery temptation.
- **Seeblick** (104 weeks only): a twelve room guesthouse on a Bavarian lake; room nights, renovation, weddings booking the whole house, and a loan for the first winter.

The three tourism scenarios replace subscriptions with bookings of capacity that expires: an occupancy calendar instead of the pipeline, a roster instead of hiring, reviews, seasons and weather. Each has its own experiments (a pilot day and a test listing, a pop-up dinner and a lunch test, test rates and an open house) and vouchers, which bring cash now and are owed until redeemed. Staff come by the shift or on permanent, part time or seasonal contracts. Hinterhof plans food per service, with cooks and servers apart; Seeblick renovates room by room and can set a minimum stay on summer weekends. Guests take some of the founder's week. Hinterhof and Seeblick offer a bank loan that lends against a business plan (fit-out, renovation, equipment and at most three months of working capital, nothing else), buys the listed items when the money arrives, takes repayments whether guests come or not, and can end the run with "Bank called the loan".

Kantino also has a long mode of 104 weeks: a second year with higher living costs and markets that run out of new leads, a team of up to four people, a freelancer, investors (an angel or a seed round, amount and equity only; an angel who invests before the stated revenue bar offers less money for more equity, and outside money starts a founder salary), and one more ending, Growing, for a funded company that still burns money but has a year of it left and growing revenue. In every long mode the company can grow through office stages 3 to 5 (a courtyard office, a gear store, a bigger kitchen, an annex, and so on), offered by letter with their one-off, rent and effect; in Kantino every person needs a desk. A company whose money coming in has covered all its costs for several months in a row (or that moves into stage 4, or in Kantino closes a funding round) switches to the established look. Saves and best runs live in your browser (`localStorage`), so they are per device and per address. The same seed gives the same market.

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
pnpm bots --runs 1000 --wide-runs 10000 --seed-prefix test --events   # the full 60 week report, as committed (about 25 minutes)
pnpm bots --runs 1000 --wide-runs 10000 --seed-prefix test --scenario kantino --mode long --parts main,paired,inbox,team,funding,events   # the full Kantino long report (about 55 minutes)
pnpm bots --runs 1000 --wide-runs 10000 --seed-prefix test --scenario hinterhof --mode long --events   # one tourism scenario's full report (likewise gratwanderung, seeblick)
pnpm seeds                                   # rewrite docs/seeds.md: seeds that reach each ending
```

The targets the report checks are in `docs/IMPLEMENTATION_PLAN.md`, section 7 (60 weeks), `docs/phase9-proposal.md` (long mode, 20 to 37), `docs/tourism-proposal.md` (tourism, T1 to T12), `docs/AUTONOMOUS_PLAN_2.md` (T13, a player without hidden knowledge can win, and T14, every staff contract kind wins somewhere), `docs/loan-proposal.md` (the bank loan, L1 to L4, reported as T15 to T18) and `docs/office-stages.md` (office stages, O1 to O5: Kantino long 38 to 40, tourism T19 to T21). The tourism scenarios run with `pnpm bots --runs 1000 --scenario gratwanderung --mode long` (likewise `hinterhof`, `seeblick`). After any change to formulas, scenario values, engine types or bot logic, rerun the report and commit `docs/balancing.md` with the change. `packages/bots/test/seeds.test.ts` replays every seed in `docs/seeds.md` and fails when one no longer reaches its ending; `pnpm seeds` then finds new ones.

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
- [`docs/phase9-proposal.md`](docs/phase9-proposal.md): the freelancer, long mode and funding
- [`docs/tourism-proposal.md`](docs/tourism-proposal.md) and [`docs/loan-proposal.md`](docs/loan-proposal.md): the bookings model and the bank loan
- [`docs/office-stages.md`](docs/office-stages.md) and [`docs/design/established.md`](docs/design/established.md): office stages 3 to 5 and the established UI stage
- [`docs/scenario-outdoor.md`](docs/scenario-outdoor.md), [`docs/scenario-restaurant.md`](docs/scenario-restaurant.md), [`docs/scenario-hotel.md`](docs/scenario-hotel.md): the tourism scenarios, with sources
- [`docs/autonomous/STATUS.md`](docs/autonomous/STATUS.md), [`docs/autonomous2/STATUS.md`](docs/autonomous2/STATUS.md) and [`docs/autonomous3/STATUS.md`](docs/autonomous3/STATUS.md): progress of the autonomous runs and the open issues; reports per step in their `reports/` folders
- [`CLAUDE.md`](CLAUDE.md): working rules for Claude Code

## Deployment

Pushing to `main` (or starting the workflow by hand) runs `.github/workflows/deploy.yml`: install, lint, test, build, then publish `apps/web/dist` to GitHub Pages at https://henryk91.github.io/founder-mode/. A failing test stops the deploy. The Vite `base` is `/founder-mode/` for production builds and `/` in dev, so every asset path is relative. In the repository settings, Pages must use the "GitHub Actions" source.

The build parses the content YAML into JSON ahead of time, loads each scenario's content and every screen after the Start screen as chunks after the Start screen has painted (the established stage's CSS and font only when a run reaches it), and ships fonts cut down to Latin-1 (regenerate them with `pnpm --filter @founder-mode/web fonts`). Saves are tied to the engine version and a fingerprint of the scenario: after a change to either, an old save gets a notice instead of replaying into a different game, and best runs are kept.

## Status

Early MVP complete (local tag `mvp-early`); Phase 9 (freelancer, long mode, funding) complete (local tag `phase9-done`); situational events, the tourism engine, three tourism scenarios and the bank loan complete (local tag `tourism-complete`); the tourism spec features, the loan against a plan, situational tourism inbox choices and Kantino long funding terms complete (local tag `plan2-complete`, audited and finished as `plan2-audited`); office stages and the established UI stage complete (local tag `plan3-complete`). Open balancing issues are listed in `docs/autonomous3/STATUS.md` and `docs/autonomous3/reports/final.md` (plan 2's in `docs/autonomous2/`). Values are invented starting points tuned by bots and playtests, not researched benchmarks, and the game is not startup advice.
