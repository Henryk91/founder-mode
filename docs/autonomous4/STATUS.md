# Autonomous run 4 status

## Current
Step: 4 (Leinen los), content written (not yet registered)
Last commit: (see git log)
Next action: step 4.1, the gulet engine additions (hold weeks for charters, minimum to sail with cancellation 3 weeks out, friction on mixed cabin weeks, the purchase gated by the local company, the refit closing the boat); then register leinenlos (content files are in packages/content/src/scenarios/leinenlos), bots, UI, tuning.

## Checklist
- [x] Step 0: set up and baseline (tag plan4-baseline)
- [x] Step 1: shared engine additions (tag plan4-engine)
- [x] Step 2: Rückenwind (tag plan4-watersports)
- [x] Step 3: assets and Tiefgang (tag plan4-dive)
- [ ] Step 4: Leinen los (tag plan4-gulet)
- [ ] Step 5: wrap up (tag plan4-complete)

## Open issues
- Tiefgang T2: the no-tests bot (builds everything, the boat included, sells to resort beginners) wins 21.4% against under 5% after two value rounds. Options: dearer upkeep for products nobody asks for; resort beginners less forgiving when not the market; restate T2 where a broad product range is legitimately strong.
- Tiefgang T3: dive clubs win about 5% (certified 36.5%, resort 37.2%) after two value rounds. Options: club weeks priced per group with a better margin, clubs needing the boat less, shorter lead times.
- Tiefgang D3: owning fails 27 points more often than seats (as wanted) but the seats bot's wins hold the most money (108,838 against 98,625 EUR). A cheaper boat made it worse. Options: count the boat's resale value in the final cash; a bigger owned boat; dearer seats.
- Tiefgang T6 (+1.0 ±1.6) and L2 (-4.9 ±2.4) fail at 1,000 seeds after passing at 500: at the limit, no further rounds.
- Rückenwind T7 (seasonal pricing): -2.1 ±1.7 against 2 to 10 after two value rounds (flat starting prices, peak June to September). Options: let the bot price shoulder months as peak by bookings; restate T7 for a two-season engine with a three-season scenario; a price per product.
- Rückenwind T14 (contracts): permanent -8.5, part time -5.2 in a business closed November to March. Options: cheaper winter (fijo discontinuo as a contract that sleeps), restate T14 for seasonal businesses (also open in Seeblick).
- Rückenwind W2 (kite trips): never running trips is +4.7 ±1.5 ahead of a group of two; always is -0.7. Options: kite as its own demand instead of a share of the segment's; cheaper trip days; a second van.

## For Henry to review (non-blocking)
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
