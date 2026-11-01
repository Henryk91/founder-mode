# Plan 6, step 3: Griffig

Tag `plan6-griffig`.

## What was built

- **Stages 3 to 5:**
  - Stage 3, an outdoor bouldering area beside the hall (45,000 EUR).
  - Stage 4, a training centre for youth teams and competitions (20,000 EUR): the established look.
  - Stage 5, the Moosach boulder hall: a second, smaller hall in another district (176,000 EUR) that needs the desk on contract there, or the founder.
- **Offers:** three office offers in `messages/events/office.yaml`, next to the existing mezzanine offer.
- **UI and tests:** three stage drawings, and the shared stage tests in `plan6Stages.test.ts`.

## Changes during measurement

- **The outdoor boulders offer comes at stage 1 or 2** (was stage 2 only), as in the other scenarios.
- No tuning round was spent.

## Targets

1,000 test seeds, main part, long mode. Labels: leis-m1, leis-full. Baseline step1-lv1.

| Target | Result | |
|---|---|---|
| O1 | careful 46.3, never_move 44.1 (+2.2) | met |
| O2 | always_move 37.1 (−9.2) | met |
| E1 | 99.1% of careful wins (±0.8), 3.4% of losses (±1.5), median week 69 | met |
| S1 | the careful bot never opens the Moosach hall; always_second opened it in 6 runs, 1 of them paying | not shown |
| Playability | careful 46.3 (±3.1), top boulder_first 71.3 | careful in band within the margin; boulder_first over 70 |

boulder_first was 70.7% at the plan 6 baseline and 69.5% after step 1. The stages add 1.8 points (within ±2.9), as they add 0.9 to careful. The lead comes from the climbing content (tuning plan 2 target K1, in `docs/BACKLOG.md`), not from plan 6, so it is not treated as a plan 6 hard stop and was not tuned.

## Other strategies

Against step1-lv1:

- always_move rose from 34.4 to 37.1: here the stages help even when taken early.
- understaffing rose from 38.7 to 41.4, boulder_first from 69.5 to 71.3, aggregator_none from 38.7 to 39.9.
- Everything else is within 1 point.

T7 is +0.5.

## Checks

`pnpm seeds` was rerun (no change). `pnpm lint` passes. `pnpm test`: 1,454 non-web tests pass; in the web project, one climbing browser case (scrappy at 375 px, a 15 s wait) timed out once and all 24 climbing cases passed on rerun, as in Rückenwind (flaky, unrelated). The content and engine changes reach only this scenario, so no protected proof was needed (plan section 1.3); the full report in step 4 covers it.

## For Henry to review

- boulder_first 71.3%, over 70%, as at the plan 6 baseline (70.7%).
- overstaffing 64.2%, over 60%, as at baseline (63.2%).
