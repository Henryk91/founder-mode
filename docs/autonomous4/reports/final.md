# Plan 4: final report

Plan 4 added three tourism scenarios abroad on top of the bookings engine: Rückenwind (watersports, Mallorca), Tiefgang (diving, Larnaca) and Leinen los (gulet cruises, Fethiye). Local tags: `plan4-baseline`, `plan4-engine`, `plan4-watersports`, `plan4-dive`, `plan4-gulet`, `plan4-complete`. Step reports are in this folder.

## What was built

- **Engine** (`docs/abroad-mechanics.md`; each part is off unless a scenario's YAML names it):
  - day conditions by the half day, with a forecast
  - courses and progression, with returns a year later by channel
  - day trips decided on the forecast
  - licences with a wait, the tender and local cost steps
  - assets to buy, lease or share, with breakdowns and haul-outs
  - products priced as a factor of a segment's price
  - the gulet's held weeks, minimum to sail, friction, refit and flexible cruise dates
- **Content:** three scenario folders (about 40 events each, intro cards, quotes, company names), with specs carrying sources and values as built (`docs/scenario-watersports.md`, `docs/scenario-dive.md`, `docs/scenario-gulet.md`).
- **Bots:** 20 new strategies, plus the W, D and G targets (`packages/bots/src/abroadTargets.ts`).
- **UI:**
  - the forecast strip, product labels and the trip policy
  - the students card and ladder
  - the boat card
  - the season calendar, holds and the minimum to sail
  - results lines, the scenario words, five scene drawings and three accents
  - browser tests at 375, 390, 430 and 1440 px in Chrome and WebKit

## The full report (run once)

Every scenario, 1,000 seeds with 10,000 wide seeds and event tables. That is the full 60-week report, the full Kantino long report, and `--events` for each of the six tourism scenarios, in about 3 hours 7 minutes. `pnpm seeds` wrote 153 seeds.

**Protected games:** the sections for Kantino, Kantino long, Zollstock, Gratwanderung, Hinterhof and Seeblick are identical, timings aside, to `docs/balancing.md` at `plan4-baseline`.

| Scenario | Careful wins | Top strategy | Failing targets |
|---|---|---|---|
| Rückenwind | 36.8% ±3.0 | trips_never 41.5% | T7, T14, W2 |
| Tiefgang | 25.8% ±2.7 | naive_careful 29.9% | T2, T3, T6, D3 (T16 marginal) |
| Leinen los | 30.9% ±2.9 | gulet_lease 41.4% | T3, T5, T6, T11, E1 (T22), G1, G3, G4 |

These do not apply as written:
- **Every abroad scenario:** T15, T20 and T21. There is no second loan and no office stages beyond 2.
- **Leinen los only:** T4, T9, T14 and T15 to T18. The cruises start in week 18, there is one host a week, there are no contracts, and the bank lends only for buying.

No hard stop: the careful bot sits between 15% and 55% everywhere and no strategy reaches 70%.

## Open issues

Copied to `docs/BACKLOG.md` section 3, with the options in `docs/decisions.md` (plan 4, steps 2 to 5).

- **Leinen los: buying (G1) and holding weeks (G3).** Buying rarely pays and the careful bot rarely holds. The step 5 round, which held more and raised charter demand, lowered the careful bot to 22.4%, so it was reverted.
- **Leinen los: the minimum to sail (G4).** Six cabins loses everywhere. The option may simply be a trap, which a game may contain. Henry should decide.
- **Rückenwind: kite trips (W2).** Never running kite trips is slightly ahead (+4.7). The trips' risk is not yet paid for.
- **Tiefgang: the share option (D3).** The bot that shares seats keeps the most money in its wins. The step 3 round with a cheaper boat failed.

## For Henry

See "For Henry to review" in `docs/autonomous4/STATUS.md`. The largest items are Leinen los's money, which is far from the spec so the game can be played at all, and the formula round that lets groups move to the season's next weeks.
