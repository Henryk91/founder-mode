# Plan 6, step 3: Leinen los

Tag `plan6-leinenlos`.

## What was built

- **Stages 2 to 4:**
  - Stage 2, the harbour shop: walk-in cabin guests.
  - Stage 3, the crew house: owners' crew 10% cheaper.
  - Stage 4, the Munich desk: cabin guests and charters from Germany +15%, and the established look.
- **The spec's stage 5 is the second gulet,** built as the boat's second unit (`second_gulet`: manage, lease or buy), not an office move. The Office card therefore shows four stages.
- **Offers:** three office offers, `second_gulet_offer` and the second gulet's engine failure, in `messages/events/office.yaml`.
- **UI and tests:** stage drawings, and tests in `plan6Stages.test.ts`.

## Changes during measurement

- **Engine bug fix (found here, affects Tiefgang too):** `splitServed` gave guests beyond the first boat's plain capacity share to the second unit even when nobody had taken it. Those guests then cost no crew, seat fee or owner's share, which lifted never_move from 50.0% to 75.3%. Now only units working that week serve guests. There is a regression test in `secondSites.test.ts`. Products with one asset or none are untouched, so the protected games are too.
- **E1 round 1:** the established look comes after 11 months covering all costs (was 10).
- **B1 bot fix:** the careful bot may manage a second gulet (no fixed fee) after a year in profit. It weighs a lease only when no managed boat is offered.
- **B1 round 2:** the managed second gulet's owner keeps 80% (was 70%), and the offer says so.

## Targets

1,000 test seeds, main part, long mode. Labels: ll-m1 (before the fix), ll-m2, ll-r1, ll-r2, ll-full.

| Target | Result | |
|---|---|---|
| O1 | careful 47.7, never_move 48.8; paired −0.1 (±0.3) | met |
| O2 | always_move 42.4 (−5.3) | met |
| E1 | 52.2% of careful wins (±4.5), 1.0% of losses (±0.8), median week 55 | met |
| B1: the second gulet appears in some careful wins | taken in 9 careful runs, 7 won | met |
| B1: always adding it loses at least 3 points | always_second 44.8, never_second 47.8 (−3.0) | met, at the edge |
| S1 | no second site in Leinen los | not applicable |
| Playability | careful 47.7 (±3.1), top gulet_lease 50.1 | careful over 45, not tuned again (step 1 spent its rounds) |

## Other strategies

Against step1-v2:

- always_move fell from 48.9 to 42.4 (O2).
- inbox_effort fell from 38.0 to 29.5; it takes the second gulet in 352 runs.
- always_manage fell from 32.4 to 23.9. It took the second gulet in only 12 runs, so the drop comes from elsewhere (probably the stages or the later established look); not investigated further.
- gulet_buy fell from 32.7 to 29.0.
- hold_all_peak fell from 25.8 to 23.4.
- no_tests rose from 12.4 to 15.8.
- Most others fell by 1 to 1.5 points, in line with careful (48.9 to 47.7).

T7 is −2.1 (price-blind 49.8).

## Checks

`pnpm seeds` was rerun; `pnpm test` (663 web, 1,454 other) and `pnpm lint` pass.

## For Henry to review

- Careful 47.7, over the band, as after step 1.
- always_manage lost 8.5 points without using the second gulet.
