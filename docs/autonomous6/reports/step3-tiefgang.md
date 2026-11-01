# Plan 6, step 3: Tiefgang

Tag `plan6-tiefgang`.

## What was built

- **Stages 3 to 5:**
  - Stage 3, the harbour base.
  - Stage 4, the dive hotel partnership: the established look.
  - Stage 5, the Protaras centre: a second site that needs a manager on contract, or the founder there.
- **The second dive boat** (`second_boat`, the second unit of `dive_boat`): it can be leased (24,000 EUR a season plus crew) or bought (`second_boat_purchase`, in the loan items). It is offered once the first boat turns divers away at the peak, and it can break down.
- **Office offers:** three, plus `second_boat_offer` and `second_boat_breakdown`, in `messages/events/office.yaml`.
- **UI and tests:** three stage drawings, and stage and second-unit tests in `plan6Stages.test.ts` and `secondSites.test.ts`.

## Changes during measurement

- **The harbour base offer comes at stage 1 or 2** (was stage 2 only), as in Rückenwind: the careful bot declines the one-time stage 2 offer.
- **Bot fix (shared with Leinen los):** the careful bot takes a second boat only when the last year's surplus carries a season of it (fee plus crew). Before the fix it leased one on a full peak alone, in 589 of 1,000 runs. That cost 12 points and pushed it under the band (23.7%).

## Targets

1,000 test seeds, main part, long mode. Labels: tg-m1, tg-b1 (after the bot fix), tg-full (all strategies), tg-full2 (all strategies again after the engine fix to `splitServed`, which Leinen los found: the same win rates except always_move, 25.5 to 24.2, and always_second, 15.1 to 15.0).

| Target | Result | |
|---|---|---|
| O1 | careful 35.9, never_move 36.0 (−0.1) | met |
| O2 | always_move 24.2 (−11.7) | met |
| E1 | 72.4% of careful wins (±4.6), 5.6% of losses (±1.8), median week 88 | met |
| B1: the second boat appears in some careful wins | leased in 4 careful runs, all won | met |
| B1: always adding it loses at least 3 points | always_second 15.0 (−20.9); inbox_effort and always_buy, which take it in 789 and 459 runs, lost 7.3 and 15.2 points against step 1 | met |
| S1 | the careful bot never opens the Protaras centre; always_second opened it in 99 runs, none in year 1 | not shown |
| Playability | careful 35.9, top naive_careful 38.4 | in band |

S1 was not tuned, for Rückenwind's reason: the careful bot moves only after a year's surplus, so stage 5 lies beyond a two-year game.

## Other strategies

Against step1-full:

- always_move fell from 36.0 to 24.2 (O2).
- always_buy fell from 32.0 to 16.8, inbox_effort from 34.7 to 27.4, and no_tests from 14.9 to 5.1. All three take the second boat by their own rules.
- Everything else is within 0.5 points.

T7 is 0.0.

## Checks

`pnpm seeds` was rerun; `pnpm test` (663 web, 1,453 other) and `pnpm lint` pass.

## For Henry to review

- S1 is not reachable for a careful player in two years, as in Rückenwind.
