# Plan 6, step 3: Fabriketage

Tag `plan6-fabriketage`.

## What was built

- **Stages 3 to 5:**
  - Stage 3, an in-house catering kitchen (70,000 EUR).
  - Stage 4, a full-service planning team (10,000 EUR): the established look.
  - Stage 5, the Giesing hall: a second venue in another district (72,000 EUR) that needs an event host on contract there, or the founder.
- **Offers:** three office offers in `messages/events/office.yaml`, next to the existing breakout floor.
- **UI and tests:** three stage drawings, and the shared stage tests in `plan6Stages.test.ts`.

## Changes during measurement

- **The catering kitchen offer comes at stage 1 or 2** (was stage 2 only), as in the other scenarios.
- **E1 round 1:** the established look comes after 10 months covering all costs (was 8). With 8, the careful bot's median week was 49, still in year 1.

## Targets

1,000 test seeds, main part, long mode. Labels: leis-m1 (five strategies), fb-r1 (careful after round 1), leis-full (all strategies). Baseline step1-full.

| Target | Result | |
|---|---|---|
| O1 | careful 39.5, never_move 39.5 (0.0) | met |
| O2 | always_move 0.0 (−39.5) | met |
| E1 | 92.2% of careful wins (±2.7), 2.3% of losses (±1.2), median week 57 | met after round 1 (week 49 before) |
| S1 | one careful win has the Giesing hall; always_second wins nothing | not shown |
| Playability | careful 39.5 (±3.1), top permanent 40.7 | in band |

always_move and always_second win nothing: the stage 3 offer can now arrive at stage 1 (around week 13), and taking it at once goes bankrupt. That is O2 at its extreme, not a bug.

## Other strategies

Against step1-full, every strategy is within 0.2 points except always_move (20.0 to 0.0).

T7 is +1.2.

## Checks

`pnpm seeds` was rerun (no change). `pnpm lint` passes. `pnpm test`: 1,454 non-web tests pass; in the web project, one climbing browser case (scrappy at 375 px, a 15 s wait) timed out once and all 24 climbing cases passed on rerun, as in Rückenwind (flaky, unrelated). The content and engine changes reach only this scenario, so no protected proof was needed (plan section 1.3); the full report in step 4 covers it.

## For Henry to review

- A player who takes the first stage offer at once always goes bankrupt; the offer may want a later floor.
