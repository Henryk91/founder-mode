# Autonomous run 4 status

## Current
Step: 5 (wrap up), not started
Last commit: (see git log)
Next action: step 5.1, revisit every open issue once with a fresh budget of 2 rounds each (decide which are worth it), then 5.2 the full report once (every scenario), pnpm seeds, docs and final report.

## Checklist
- [x] Step 0: set up and baseline (tag plan4-baseline)
- [x] Step 1: shared engine additions (tag plan4-engine)
- [x] Step 2: Rückenwind (tag plan4-watersports)
- [x] Step 3: assets and Tiefgang (tag plan4-dive)
- [x] Step 4: Leinen los (tag plan4-gulet)
- [ ] Step 5: wrap up (tag plan4-complete)

## Open issues
- Leinen los T3 (retreats 7.6%, charters 19.2% against cabin-led runs 65.5%), T4 (first guest in week 19: cruises start in May), T5 (decision news 80.7%, year 2 67.6%), T6, T11, E1 (18.4% of wins), G1 (buying best in 5.7% of differing seeds), G3 (the careful bot rarely holds, so never holding ties it), G4 (six cabins loses everywhere). T9, T14, T15 to T18 do not apply as written. Options in reports/step4-gulet.md and decisions, plan 4 step 4.
- Tiefgang T2: the no-tests bot (builds everything, the boat included, sells to resort beginners) wins 21.4% against under 5% after two value rounds. Options: dearer upkeep for products nobody asks for; resort beginners less forgiving when not the market; restate T2 where a broad product range is legitimately strong.
- Tiefgang T3: dive clubs win about 5% (certified 36.5%, resort 37.2%) after two value rounds. Options: club weeks priced per group with a better margin, clubs needing the boat less, shorter lead times.
- Tiefgang D3: owning fails 27 points more often than seats (as wanted) but the seats bot's wins hold the most money (108,838 against 98,625 EUR). A cheaper boat made it worse. Options: count the boat's resale value in the final cash; a bigger owned boat; dearer seats.
- Tiefgang T6 (+1.0 ±1.6) and L2 (-4.9 ±2.4) fail at 1,000 seeds after passing at 500: at the limit, no further rounds.
- Rückenwind T7 (seasonal pricing): -2.1 ±1.7 against 2 to 10 after two value rounds (flat starting prices, peak June to September). Options: let the bot price shoulder months as peak by bookings; restate T7 for a two-season engine with a three-season scenario; a price per product.
- Rückenwind T14 (contracts): permanent -8.5, part time -5.2 in a business closed November to March. Options: cheaper winter (fijo discontinuo as a contract that sleeps), restate T14 for seasonal businesses (also open in Seeblick).
- Rückenwind W2 (kite trips): never running trips is +4.7 ±1.5 ahead of a group of two; always is -0.7. Options: kite as its own demand instead of a share of the segment's; cheaper trip days; a second van.

## For Henry to review (non-blocking)
- Step 4: AUTONOMOUS Leinen los's money moved far from the spec to be playable at all: lease 80,000 with 15% down, manager keeps 30%, an older gulet at 200,000 with the bank at 80% (decisions, plan 4 step 4; spec section 17).
- Step 4: AUTONOMOUS groups flex to the season's next weeks (the formula round that took the careful bot from 12.8% to 30.4%).
- Step 3: AUTONOMOUS buying is a purchase product; lease and seats are inbox answers; the crew is a cost per week used, not roster roles (decisions, plan 4 step 3).
- Step 3: Tiefgang's segments retuned well away from the spec (resort 10 to 34 a week, club weeks of 40 to 100 dives) (decisions, plan 4 step 3; spec section 16).
- Step 2: AUTONOMOUS product price factors and appeal (prices are per segment in the engine) (decisions, plan 4 step 2).
- Step 2: AUTONOMOUS course places per instructor day, rescue boat leased, 14 gear sets, peak June to September, flat starting prices (decisions, plan 4 step 2).
- Step 2: event table: the beach station, the hotel's exclusive deal and the Strandklick promotion never win (reports/step2-watersports.md).
- Step 1: AUTONOMOUS day conditions aggregated per week; bookings ahead fill the share a month usually suits (decisions, plan 4 step 1).
- Step 1: AUTONOMOUS courses without course slots; graduates return through the channel they came by (decisions, plan 4 step 1).
- Step 1: AUTONOMOUS trips decided on the forecast, trips first on the roster, "never" closes the product (decisions, plan 4 step 1).
- Step 1: AUTONOMOUS licence fee paid on grant; tender acts when answered; cost steps as one scenario list (decisions, plan 4 step 1).
- Step 1: AUTONOMOUS bookings still change in place (copying made Hinterhof 40% slower) (decisions, plan 4 step 1).
- Plan 4 starts from `plan3-complete` plus the Start screen commits after it (HEAD `1653bc1`).

## Stopped
