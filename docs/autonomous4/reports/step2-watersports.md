# Plan 4, step 2: Rückenwind (watersports, Mallorca)

## What changed

- **Content:** `packages/content/src/scenarios/rueckenwind/` (id `rueckenwind`, shown "Rückenwind", category tourism, tags Abroad and Wind): 15 products, three segments, day conditions in two slots with a kite spot, courses with next steps, kite trips, the beach licence tender, a beach station as stage 2, the bank loan (Banc de la Badia), 4 intro cards, 42 events of its own (plus the shared tourism events), 10 interview quotes per bucket per segment, invented names.
- **Engine** (off unless a scenario uses it): `priceFactor` and `appeal` on products; wind cancellations count against reviews with `cancelPenalty`; trips start only full groups, and a group too small or unable to finish waits a week once. The bookings view now reads the bookings in one pass instead of several (same values, faster).
- **Bots:** the careful bot rosters conditions products to the forecast, counts all the week's purchases against its money, builds the graduates' next step, sets the trip policy and bids in the tender when the spot carries the business. Eight Rückenwind bots for W1 to W5. W targets in the report.
- **UI:** the forecast strip ("Wind and sea, as forecast", counts per slot and at the kite spot), "runs on N of 7 afternoons" per product, the trip policy row, the products' prices at this season's price, a "Students and graduates" card on the bookings screen, the forecast on the bookings screen, results lines for conditions, trips, graduates, licences, cost steps and the tender, the scenario's words for all three stages, two scene drawings (`container_flag`, `beach_station`), the accent `#1F6A86` (white on it 6.1:1).
- **Research:** spec section 17 (course and lesson prices in Alcúdia, platform commissions, Spanish self-employed contributions, eFoil prices); the rest stays "estimate".
- **Tests:** content loads with its offers and events; every bot plays a full Rückenwind run with valid plans; careful runs trips, courses and the tender; the plan, established and tourism-word browser tests include Rückenwind at 375, 390, 430 and 1440 px in Chrome and WebKit (axe clean, nothing cut short, tourism words only). `docs/seeds.md` has Rückenwind's endings.
- Screenshots at 390 and 1440 px: `$TMPDIR/founder-mode-established/rueckenwind-*.png` (here `/var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-established/`), outside the repository.

## Targets

`pnpm bots --runs 1000 --seed-prefix test --scenario rueckenwind --mode long --parts main` (main part, 1,000 seeds), in `docs/balancing.md`:

| # | Result | Status |
|---|---|---|
| T1 careful wins 25 to 45% | 36.8% ±3.0 | pass |
| T2 no strategy over 60%, no tests under 5% | top trips_never 41.5%; no tests 3.1% | pass |
| T3 viable segments within 15 points | 3.6 points (hotel 34.8, learners 38.4, regulars 37.3) | pass |
| T4 first viable guest by week 12 | week 8 | pass |
| T5 decision news | 95.2%; year 2 90.5% | pass |
| T6 reading the inbox pays | +2.2 ±1.7, blind effort -3.6 | at the limit, pass |
| T7 seasonal pricing pays 2 to 10 points | -2.1 ±1.7 | **fail** (open) |
| T8 platform only loses 3 | -21.3 | pass |
| T9 over and understaffing lose 3 | -35.0, -22.5 | pass |
| T10 review blind loses 2 | -31.6 | pass |
| T11 policy is a decision | strict +0.9 overall; learners +4.7, regulars -3.8 (±2.0) | pass |
| T12 under 150 s per 1,000 runs | 131.6 s | pass |
| T13 naive careful | 41.0%, gap +4.2 | pass |
| T14 every contract kind wins somewhere | permanent -8.5, seasonal +4.1, part time -5.2 | **fail** (open) |
| T15 to T18 the loan | L1 not applicable (no refit item); L2 -15.9; L3 gap +42.4, careful misses 0.3%; L4 59.6% borrowed | L2 to L4 pass |
| T19 to T21 office stages | do not apply in this pass (stages 1 and 2 only) | n/a |
| T22 E1 established look | 39.9% ±5.0 of wins, 3.2% of losses, week 90 | at the limit, pass |
| W1 every kind of day | wind only -19.8, calm only -31.7 | pass |
| W2 kite trips a decision | always -0.7 ±1.3, never +4.7 ±1.5 | **fail** (open) |
| W3 courses pay, direct returners | no courses -18.8; year 2 direct 8,638, platform 1,072 | pass |
| W4 tender a decision | higher -2.6 ±1.6 against as before; each ahead in some seeds (21, 47) | pass |
| W5 eFoil a trap | -8.0 ±2.6 | pass |

Event table (`--parts events`, 1,000 seeds, 19.5 min), in `docs/balancing.md`. Notes: `north_wind_learners` never arrived (its gate needed ten guests booked in May; lowered to four afterwards, no rerun); the beach station (12,000 EUR) never wins when taken, nor do the hotel's exclusive deal and the Strandklick promotion. These are recorded as candidates for the wrap-up, not tuned now.

## Decisions and open issues

`docs/decisions.md`, "Plan 4, step 2: Rückenwind". Open: T7, T14, W2 (STATUS.md).

## Protected games

Engine and shared bot code changed, so the main part of every protected game ran on 1,000 seeds, prefix `test`: the 60 week games with the baseline command, the long modes with `--scenario <id>` each (the long report now holds Rückenwind too). Every section is identical to the step 0 baseline apart from timings (`docs/autonomous4/compare.sh`, sections cut with `docs/autonomous4/section.sh`).
