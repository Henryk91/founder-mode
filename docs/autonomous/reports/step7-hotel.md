# Step 7: the hotel (Seeblick)

## What changed

- Content: scenario `seeblick` (long mode only, from the first week of November): twelve rooms as they are, a renovation block, breakfast, booking engine, company invoicing, workspace, early breakfast, an event room, a catering partner, whole-house packages and the wellness temptation; a tired and a refreshed house (an inbox offer, the optional second loan); 45 events of its own and the shared tourism ones, quotes, names, intro, two house drawings.
- Engine (optional, absent in the protected games): shared capacity (`capacityOf`) for whole-house bookings and the roster serving them from the pool; deposits at booking (`depositShare`); a segment's share of capacity (`capacityShare`, couples at weekends).
- Bots: the refit loan read from the scenario; a careful borrower bridges long lead times and a November opening; optional purchases keep that bridge.
- Fixed: Hinterhof's "per person" labels now say "per cover".

## Tests

Engine: shared capacity (booking and serving), deposits, capacity share. Web: nine scene drawings; browser: axe and no sideways scrolling in Seeblick at 375, 390, 430 and 1440 px in Chrome and WebKit. Lint and all tests pass.

## Targets (1,000 seeds, prefix `test`, `docs/balancing.md`)

Pass: T4, T5, T8, T10, T12, L1, L4. Fail: T1 careful 51.9% (limit 45; under the 55% hard stop), T2 (top strategy fine, no tests 24.8%), T3 spread 47.5 (groups 28.6, leisure 76.1, project guests 51.3), T6, T7 (-0.4), T9 (overstaffing -0.1), T11, L2 (+1.3), L3. The budget for T1 and T3 (three value and two formula rounds) is used; all open for step 8, where every open issue gets a fresh budget.

## Protected games

60 week Kantino and Zollstock, Kantino long, Gratwanderung and Hinterhof: see STATUS.md and the tag message.
