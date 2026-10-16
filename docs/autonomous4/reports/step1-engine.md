# Plan 4, step 1: shared engine additions

## What changed

Built `docs/abroad-mechanics.md` sections 2, 3, 5, 6 and 7 (section 4, assets, waits for step 3), in `packages/engine/src/systems/abroad.ts` and hooks in the bookings step. Everything is off unless a scenario's bookings block has `conditions` (or `tender`, `costSteps`, a product's `waitWeeks`):

- **Day conditions:** ordered states, one or two slots a day, monthly chances per slot, spells, a forecast per slot one state off when wrong, a trip spot one state windier. A product sells the slots that suit it; ahead of time, the share its month usually suits. Guests beyond a week's real slots go to the alternative, next week under a strict policy, or are refunded. Whole-week products never cancel; bad slots cost review quality, less with the shelter product.
- **Courses:** graduates per course, same-stay next steps, next-season returns by channel (the platform's guests through the platform), products that need a level, segments that hold levels.
- **Day trips:** a policy (smallest group, or never; locked for weeks), trips on forecast days, one staff shift each, fuel per trip, wasted trips on a wrong forecast.
- **Licences:** `waitWeeks` after the prep hours; shipped when the wait is over.
- **Tender:** effect `tender` (higher, as before, a hotel's beach), with a lost spot or a hotel's beach reaching fewer walk-ins and partners, and a hotel's revenue share.
- **Local cost steps:** fixed costs, staff pay and unit costs from a week, by a factor.
- **View and post-mortem:** `BookingsView.abroad`, product fields, `FeatureView.readyWeek`, new report entries with results lines, `GuestsEconomics.abroad`.
- Tests: `packages/engine/test/abroad.test.ts` on a fixture (`test/abroad.ts`): draws, spells, forecast, the spot, suitable slots, the view hiding chances and truth, selling only suitable slots, cancel, alternative, strict move, whole-week reviews and shelter, graduates, levels, returns, trips (policy, lock, waste, shifts), licences, the tender, cost steps, replay of a saved game.

## Targets

None in this step (no scenario uses the mechanics yet).

## Decisions

See `docs/decisions.md`, "Plan 4, step 1". All AUTONOMOUS items are listed in STATUS.md.

## Protected games

Main part, 1,000 seeds, prefix `test`, the same two commands as step 0: identical to the baseline apart from timings (`docs/autonomous4/compare.sh`), in Kantino, Zollstock, Kantino long, Gratwanderung, Hinterhof and Seeblick. A first version copied every open booking each week; that changed no outcome but made Hinterhof 1.7 times slower (T12 at 179 s), so it was dropped. The engine version stays 0.14.0: replaying an existing save gives the same game.
