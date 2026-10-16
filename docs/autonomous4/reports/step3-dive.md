# Plan 4, step 3: assets, then Tiefgang (diving, Cyprus)

## What changed

- **Engine, assets** (`packages/engine/src/systems/assets.ts`, off unless a scenario has `assets`): buy (a purchase product, so the bank's loan items and a required local company work unchanged), lease and share (inbox answers in week 1 and each winter, effect `asset`), capacity by option (a share's part, take-backs, a managed boat's peak rule), upkeep, lease fees, crew per week used, seat fees and revenue shares, breakdowns with a repair message (effect `assetRepair`), haul-outs, ending a lease early, the value at the end, condition paths, the view (`BookingsView.assets`), report entries and the post-mortem's asset lines. Tests: `packages/engine/test/assets.test.ts` (none, lease, share, buy with breakdowns, repairs and the haul-out, the peak rule, replay).
- **Content:** `packages/content/src/scenarios/tiefgang/` (id `tiefgang`, shown "Tiefgang", tags Abroad and Boats): the ladder (try dive, entry course, advanced course, shore and wreck dives), the centre licence (six weeks' wait), the boat with three options, the sea in two slots, three segments with levels, a pool centre as stage 2, the bank, 4 intro cards, 41 events, 10 quotes per bucket per segment.
- **Bots:** the careful bot shares first and leases at a winter offer once its peak seats were half used (turned-away divers included), and repairs breakdowns; five Tiefgang bots for D1 to D4; D targets in the report.
- **UI:** the boat card on Finance (how you have it, places, condition, haul-out, value, what it cost, the terms of each option, how to change), a boat drawing, the ladder line and the students card on the bookings screen, the conditions strip (from step 2), results lines for the asset entries, Tiefgang's words for all three stages, two scene drawings (`dive_shop`, `pool_centre`), the accent `#1E4E79` (white on it 8.7:1). Browser tests include Tiefgang (plan, established look, tourism words) at 375, 390, 430 and 1440 px in Chrome and WebKit; screenshots in `$TMPDIR/founder-mode-established/tiefgang-*.png`.
- **Research:** spec section 16 (Zenobia trip and course prices, the 2025 diving law and its licences).

## Targets

`pnpm bots --runs 1000 --seed-prefix test --scenario tiefgang --mode long --parts main` (main part, 1,000 seeds), in `docs/balancing.md`:

| # | Result | Status |
|---|---|---|
| T1 | 25.8% ±2.7 | pass |
| T2 | no tests 21.4% ±2.5 (top naive careful 29.9%) | **fail** (open) |
| T3 | 32.5 points (certified 36.5, clubs 4.7, resort 37.2) | **fail** (open) |
| T4 | week 12 | pass |
| T5 | 88.5%; year 2 93.8% | pass |
| T6 | reading +1.0 ±1.6 | **fail** (passed at 500 seeds: +1.8 ±2.2) |
| T7 | +3.2 ±1.7 | pass |
| T8 | -6.1 | pass |
| T9 | over -21.6, under -13.9 | pass |
| T10 | -18.4 | pass |
| T11 | -1.1 overall; certified -6.3, clubs -5.0, resort +7.7 | pass |
| T12 | 114.2 s | pass |
| T13 | 29.9%, gap +4.1 | pass |
| T14 | permanent +12.0, seasonal +8.8, part time +7.0 | pass |
| T15 to T18 | L1 not applicable; L2 -4.9 ±2.4 (**fail**, passed at 500 seeds); L3 gap +51.6; L4 23.5% borrowed | L3, L4 pass |
| T19 to T21 | do not apply in this pass | n/a |
| T22 E1 | 38.8% ±5.9 of wins, 0.5% of losses, week 93 | at the limit, pass |
| D1 certified only loses 3 | -7.1 ±2.9 | pass |
| D2 each boat option best in 15% of differing seeds | buy 17.8%, lease 22.6%, share 59.6% of 668 | pass |
| D3 owning risky, owners' wins richest | failed 48.5% against 21.3% (gap +27.2 ±4.0); median cash in wins buy 98,625, lease 91,882, share 108,838 EUR | **fail** (open) |
| D4 no ladder loses 3 | -5.9 ±2.7 | pass |

Event table (`--parts events`, 1,000 seeds, 19 min), in `docs/balancing.md`. `rough_june_week` never arrived (gate lowered from ten booked to four afterwards, no rerun); the boat offers and the breakdown message work as designed; the hotel's free pool, the organiser's catalogue and the Divebook feature never win when accepted.

## Decisions and open issues

`docs/decisions.md`, "Plan 4, step 3". Open: T2, T3, D3; T6 and L2 fail at 1,000 seeds after passing at 500 (recorded with the open issues, no further rounds in this pass).

## Protected games and Rückenwind

After the asset engine, and again at the end of the step (bots changed): the main part of every protected game on 1,000 seeds (60 week games with the baseline command, long modes with `--scenario <id>`), and Rückenwind's main part on 1,000 seeds against its step 2 section of `docs/balancing.md`. All identical apart from timings.
