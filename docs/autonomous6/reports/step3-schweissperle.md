# Plan 6, step 3: Schweißperle

Tag `plan6-schweissperle`.

## What was built

- **Stages 3 to 5:**
  - Stage 3, proper changing rooms and a reception (35,000 EUR).
  - Stage 4, a flagship studio with a café and a retail corner (50,000 EUR): the established look.
  - Stage 5, the Haidhausen studio: a second studio in another district (40,000 EUR) that needs the front desk on contract there, or the founder.
- **Offers:** three office offers in `messages/events/office.yaml`, next to the existing neighbouring-keys build-out.
- **UI and tests:** three stage drawings, and the shared stage tests in `plan6Stages.test.ts`.

## Changes during measurement

- **The changing rooms offer comes at stage 1 or 2** (was stage 2 only), as in the other scenarios.
- No tuning round was spent.

## Targets

1,000 test seeds, main part, long mode. Labels: leis-m1, leis-full. Baseline step1-full.

| Target | Result | |
|---|---|---|
| O1 | careful 55.1, never_move 55.0 (+0.1) | met |
| O2 | always_move 0.0 (−55.1) | met |
| E1 | 98.9% of careful wins (±0.9), 4.9% of losses (±2.0), median week 65 | met |
| S1 | nobody opens the Haidhausen studio, not even always_second (0.0%) | not shown |
| Playability | careful 55.1 (±3.1), top naive_careful 60.8 | careful over 45 and naive_careful over 60, as before the stages (55.7 at the plan 6 baseline; naive_careful 60.9 after step 1) |

always_move and always_second win nothing: the stage 3 offer can now arrive at stage 1 (around week 32 to 43), and taking it at once goes bankrupt. That is O2 at its extreme, not a bug.

## Other strategies

Against step1-full, every strategy is within 0.2 points except always_move (53.7 to 0.0). The careful bot almost never takes a stage here (none in the traced runs), so its games are nearly the same as before.

T7 is −3.9 (price-blind 59.0).

## Checks

`pnpm seeds` was rerun (no change). `pnpm lint` passes. `pnpm test`: 1,454 non-web tests pass; in the web project, one climbing browser case (scrappy at 375 px, a 15 s wait) timed out once and all 24 climbing cases passed on rerun, as in Rückenwind (flaky, unrelated). The content and engine changes reach only this scenario, so no protected proof was needed (plan section 1.3); the full report in step 4 covers it.

## For Henry to review

- Careful 55.1 and naive_careful 60.8 predate plan 6 (careful 55.7 at the plan 6 baseline, naive_careful 60.9 after step 1); not a plan 6 hard stop.
- The careful bot almost never takes a stage, so the stages change next to nothing for it. A player who moves early always goes bankrupt; the stage 3 offer may want a later floor, such as stage 2 only after a year.
