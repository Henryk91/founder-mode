# Plan 6, step 3: Rückenwind

Tag `plan6-rueckenwind`.

## What was built

- **Stages 3 to 5:**
  - Stage 3, the kite base: more kite places, no van.
  - Stage 4, the watersports centre: the established look.
  - Stage 5, the second beach: "The Pollença station". It is a second site that needs an instructor on contract, or the founder there.
- **Offers:** three office offers in `messages/events/office.yaml`, plus three gear events.
- **The fleet:** the rescue boat can be bought (`rescue_boat_purchase` replaces the hired boat; it is in the loan items). Modern gear, wing foils and kite trips wear out with use.
- **UI and tests:** three stage drawings, Office card lines, and `packages/engine/test/rueckenwindStages.test.ts`.

## Changes during measurement

- **The kite base offer comes at stage 1 or 2** (was stage 2 only). The beach station (stage 2) is a one-time finance offer that the careful bot declines. With "stage 2 only", no careful run in 20 seeds ever saw stages 3 to 5.
- **`tourism_always_second` takes every office offer at once.** Before, it never left stage 1.
- **S1 round 1:** the second beach is offered from stage 3 or 4, after 12 weeks there (was stage 4 after 16). Its text now names the rent it brings (4,600 EUR a month), since the step depends on the current stage.

## Targets

All on 1,000 test seeds, main part, long mode. Labels: rw-m1, rw-r1 (S1 round 1), rw-full (all strategies).

| Target | Result | |
|---|---|---|
| O1: careful loses at most 1 point against never moving | careful 45.2, never_move 42.4 (+2.8) | met |
| O2: always moving loses at least 3 points | always_move 6.2 (−39.0) | met |
| E1: established look | 47.6% of careful wins (±4.6), 4.7% of losses (±1.8), median week 91 | met |
| S1: opening in year 1 loses at least 3 points | 83 always_second runs opened it in year 1; careful 80.7 points ahead on those seeds | met |
| S1: pays in some runs and not in others | the careful bot opened it in 1 run (week 95) | not shown |
| Playability | careful 45.2 (±3.1), top price_blind 48.2 | in band, within the margin |

S1 round 2 was not spent. The careful bot's first move waits for a year's surplus (the rule O1 rests on), so it reaches stage 3 around week 70. Stage 5 is out of its reach in a two-year game, whatever the offer timing.

## Other strategies

Against step1-v1 (before stages 3 to 5), most strategies moved by under 2 points. The clear moves:

- always_move fell from 44.8 to 6.2: moving at once now leads into stages it cannot pay for, as O2 wants.
- reckless rose from 19.2 to 24.8.
- overborrow rose from 26.7 to 32.4.
- no_tests fell from 6.3 to 2.2.
- never_move fell from 44.8 to 42.4.

T7 is −3.0 (price-blind 48.2).

## Checks

- `pnpm seeds` was rerun.
- `pnpm test`: one climbing browser screenshot failed once and passed on rerun (flaky; it is unrelated to Rückenwind). `pnpm lint` passes.
- The office browser test passes at 375, 390, 430 and 1440 px, in Chromium and WebKit. Its second-site cases now find a run at stage 5, since always_second takes every move.

## For Henry to review

- S1 cannot be shown for a careful player in a two-year Rückenwind. Either the second beach is a year-3 option, or the careful move rule should look at less than a year of history.
