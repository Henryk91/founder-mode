# Step 4: tourism retune

Completed against 1,000 `test` seeds per strategy with the event matrix. The canonical sections are in `docs/balancing.md`.

## Result

- Gratwanderung: T1 to T13 pass. T3 closes from 17.2 to 9.5 points after the school-demand realism trials and three spread rounds. T11 now passes. T14 remains open: permanent -17.5, seasonal +1.0 and part time -11.5 points on seeds where each contract was signed.
- Hinterhof: T1 and T4 to T13 pass, as do L1 to L4. Careful wins 27.0%; the reckless debt gap is +17.9 points. T2 remains open because no-tests wins 20.6%; T3 is just outside at 15.9 points. T14 remains open: permanent and seasonal are neutral and part time is +0.9, none beyond its margin.
- Seeblick: T1 to T5, T7 to T13 and L1 to L4 pass. The segment spread closes from 22.4 to 2.7 points, the policy target passes, and the visible six-month bridge raises naive careful to 21.2%, 1.8 points behind careful. T6 remains open (reading +9.5, blind effort +6.8); T14 remains open because permanent and seasonal never sign and part time is inconclusive at -2.2 points on only 4.6% of signed seeds.

## Changes kept

- Added T13 and T14, their strategies and report measurements; loan targets are T15 to T18.
- Contracts are considered against the weekly shifts they replace, and already-paid contract shifts are rostered before founder or weekly shifts. Three later contract-formula rounds were tried and reverted because they either left contracts neutral or harmed the careful game.
- Gratwanderung keeps school demand at 9 to 12 groups at peak. Trials at 2 to 4 and 4 to 8 were below the playability floor; 5 to 10 widened the spread to 25.6 points. Team-event strict conversion is 0.70.
- Hinterhof raises evening-local and tourist reach. The delivery temptation is retained in greedy loan plans. A lower office-lunch range was tried and reverted because it damaged playability, pricing and the debt lesson.
- Seeblick rebalances leisure, group and project demand, raises group cancellation risk, and exposes `loan.bridgeMonthsHint` through the typed player view and bank plan. Both careful bots use that visible bridge consistently.
- Current rent listings are cited in the restaurant and hotel specs. Hinterhof and Seeblick figures remain estimates for the reasons recorded there.

## Protection and gates

- Tourism fingerprints were renewed only after the final content values: Gratwanderung `729a0e559cfc68e3`, Hinterhof `0ddd9910e0c559ee`, Seeblick `b4be2a32cc3ae104`.
- Ending seeds were regenerated after the final engine, content and bot changes.
- Open targets move to the fresh Step 6 budget; unsuccessful rounds are recorded in `docs/decisions.md`.
