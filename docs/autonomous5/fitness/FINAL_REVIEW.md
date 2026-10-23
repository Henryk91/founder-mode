# Fitness final first-pass main review

Sourcea6060e0. Main only:30 policies,1,000 paired `test` seeds each,eight workers.
1,142 seconds wall time,8,862 summed seconds of play. No wide parts/full report.
Values2/2 and formula1/1 are exhausted. No more first-pass tuning is allowed.

Careful44.7%±3.1,top naive51.8%±3.1,no-tests0.3%±0.3. The plan's playability
bounds are met;there is no playability hard stop. T1 passes at the upper limit.
T3,T5–T7,T12,T14,F3,F4 remain open. F1 passes at the limit:all slots lose only
0.7±1.9 points,so the advantage itself is not statistically established. T17's
own-loan-caused miss rate2.3%±0.9 is close to its3% limit.

| # | Target | Final value | Margin | Status |
|---|---|---|---|---|
| T1 | tourism_careful wins (Sustainable or Growing) 25 to 45% of runs | 44.7% | ±3.1 | at limit |
| T2 | No strategy wins over 60%; tourism_no_tests under 5% | top tourism_naive_careful 51.8%; no tests 0.3% | ±3.1; ±0.3 | pass |
| T3 | tourism_careful win rates across the viable segments lie within 15 points | 28.8 points (corporate 62.1%, yoga_crowd 33.3%, young_professionals 37.8%) | ±7.3 | fail |
| T4 | The first viable-segment group is served by the twelfth week from opening in the median winning run | week 2.0 from opening |  | pass |
| T5 | Decision news in at least 85% of weeks 1 to 20 and 70% of weeks 53 to 104 | 71.7%; year 2 92.9% |  | fail |
| T6 | Reading the inbox pays: tourism_careful beats leaving every message to its default by at least 3 points, and blind effort gains at most a third of that | reading +13.8, blind effort +12.6 | ±2.3 | fail |
| T7 | Seasonal pricing pays: tourism_careful (prices from hints per season) beats tourism_price_blind by 2 to 10 points | -1.0 | ±1.5 | fail |
| T8 | Platform dependence is a trap: tourism_platform_only loses at least 3 points to the careful mix | -36.3 | ±3.0 | pass |
| T9 | Staffing is a decision: over and understaffing each lose at least 3 points to the careful roster | over -44.2, under -34.6 | ±3.1, ±3.0 | pass |
| T10 | Reviews matter: tourism_review_blind loses at least 2 points | -7.0 | ±1.7 | pass |
| T11 | Cancellation-policy comparison | Inapplicable to membership notice/annual terms,decided before measurement | | not applicable |
| T12 | 1000 runs complete in under 150 seconds (slowest strategy) | 462.1 s per 1000 runs |  | fail |
| T13 | A player without scenario-specific bot knowledge can win: tourism_naive_careful wins at least 20% and no more than 10 points less than tourism_careful | 51.8%; gap +7.1 | ±3.1; ±2.0 | pass |
| T14 | Every staff contract kind wins somewhere: on the seeds where its single-kind bot signs it, permanent, seasonal and part time each beat weekly shifts by their paired margin | permanent +1.2 (signed in 42.1%); seasonal +0.6 (signed in 47.5%); part time +3.3 (signed in 91.1%) | ±1.4; ±1.8; ±1.5 | fail |
| T15 | L1. An optional loan for later rooms is a real choice: borrowing and funding later rooms from retained cash are within 5 points of each other | second loan +2.1 against none (second loan taken in 44.1% of runs) | ±1.4 | pass |
| T16 | L2. Borrowing for a temptation no segment requires (tourism_overborrow: every item the bank lists and the most working capital, early) loses clearly against borrowing only what the business needs: at least 3 points | -44.7 | ±3.1 | pass |
| T17 | L3. Debt is dangerous: tourism_reckless (the most the bank lends, a temptation included, no repayment-free start) ends with the loan called or bankrupt owing the bank at least 15 points more often than tourism_careful, and tourism_careful misses a payment the business itself could carry in under 3% of runs | ending owing: reckless 100.0%, careful 49.6% (gap +50.4); careful loan-caused misses 2.3% | ±3.1; ±0.9 | at limit |
| T18 | L4. The post-mortem names each loan's interest, what it paid for, and whether it was paid back (tourism_careful's borrowers) | 100.0% borrowed; median interest and fees 8728 EUR |  | pass |
| E1 | E1. The established look comes once the company has made it: the careful bot reaches it in at least 40% of its winning runs, in clearly fewer of its losing runs, and in year 2 (median week after 52) | 95.3% of 447 wins, 7.1% of 553 losses; median week 68 | ±2.0, ±2.1; ±1.5 | pass |
| F1 | Quiet-slot aggregator access beats all slots and no aggregator by at least 2 points each | all -0.7; none -30.8 | ±1.9; ±2.9 | at limit |
| F2 | Keeping the January waitlist class peak loses at least 2 points | -13.8 | ±2.2 | pass |
| F3 | Buying reformers and keeping the regular studio are within 5 points, with wins unique to each policy | -22.1; buy-only 34, no-buy-only 255, ties 711 | ±3.0 | fail |
| F4 | Instructor departure visibly stops followers; never matching loses at least 2 points | +0.1; 30426 followers stopped in 945 runs | ±1.6 | fail |
| F5 | Building the recovery room in year one loses at least 3 points | -7.0 | ±2.0 | pass |

## Contributions and open options

- T3:final spread28.8±7.3 points (corporate62.1%,yoga33.3%,young37.8%). The
  earlier6.8±3.6 spread came with93.7% overall wins and is not a playable final
  configuration. Revisit corporate reachable demand versus the ordinary/specialist
  split in the plan's fresh step6 budget;do not alter protected games.
- T5:early decisions71.7%,year two92.9%. Closest early result71.8%. The known
  pre-opening weeks8–12 gap remains. Add genuine contextual preparation decisions,
  rather than relabelling routine updates or filling the inbox with empty chores.
- T6:reading+13.8±2.3 versus defaults,blind effort+12.6. This is the closest
  blind/read ratio so far,but far above one third. Current replies still too
  often reward the same effort choice;review contextual trade-offs in step6.
- T7:hints lose1.0±1.5 to fixed fees;closest earlier−0.8±1.1. Budget units and
  quote rounding are now correct. Review confidence/shrinkage or observable price
  feedback,without using hidden willingness or numerical counterfactual sweeps.
- T12:slowest462.1seconds/1,000. Closest complete matrix404.4;careful-only301
  did not measure the slowest policy. Loads differ,so these are not controlled
  speed comparisons. Existing compaction preserves outcomes;the capacity cache
  with no demonstrated gain was discarded. Profile membership-history costs.
- T14:permanent+1.2±1.4,seasonal+0.6±1.8,part-time+3.3±1.5 against flexible
  cover on signing seeds. Seasonal's closest earlier+0.8±0.8 came in a too-easy
  game. Review schedule-aware contract selection/commitment,not implausible wages.
- F3:buying23.2%,never45.3%,paired−22.1±3.0. Both choices now have unique
  wins:34buy-only,255no-buy-only,711ties. This is the closest measured result.
  Specialist demand is real,but funding/timing and lost mat capacity still make
  conversion too costly overall. Preserve actual equipment/teacher/seat costs
  when reviewing affordability and forecast rules in step6.
- F4:never match+0.1±1.6;30,426followers stop in945runs. The observed membership
  loss is real,but the required win-rate loss is not established. Earlier−0.8±1.5
  passed at the limit in an83.7%-win configuration. Review retention persistence
  and its observable financial contribution without claiming an outcome effect.

Other main contributions:platform-only−36.3±3.0;over/understaffing−44.2±3.1/
−34.6±3.0;review-blind−7.0±1.7;January peak−13.8±2.2;recovery−7.0±2.0.
Later loan+2.1±1.4,taken in44.1%. Reckless ends owing100%,careful49.6%,with
median interest/feesEUR8,728. Established look:95.3% of447wins,7.1% of553losses,
medianweek68. Every raw target and margin remains in the main report.

## Remaining phase gate

The fitness event table runs once now,1,000 test seeds,using the exact-source
careful baseline from this matrix rather than replaying it. Final protected proof
runs main only,1,000 seeds per earlier game. Seed regeneration/full tests and the
step report/tag/merge remain required. All24 final browser cases and782 broad
checks/27 skips plus lint/typechecks already pass. Full report only step6,once.
