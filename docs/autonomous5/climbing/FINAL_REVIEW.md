# Griffig final first-pass main review

Source27756b3. Main only,32policies×1,000paired test seeds,eight workers.
1,713wall seconds,13,376summed seconds. Raw table:griffig-main-formula.md.
Values2/2 and formula1/1 exhausted;no more first-pass tuning. No full report.

Careful30.8%±2.9,top boulder-first39.0%±3.0,no-tests0%. The plan's
playability bounds are met. K5 passes at its limit;all other passing rows
pass outright. Open:T3,T5–T7,T9,T11,T12,T14,T15,K1–K3.

## Complete target table

The raw evaluator follows the plan's margin rule. K5 is at its limit.
T14 explicitly needs an advantage beyond the paired margin;seasonal+0.6±0.9
therefore fails. T15+6.8±1.6 is outside its5-point cap even allowing its exact
unrounded margin;do not round it into a pass.

| # | Target | Value | Margin | Met |
|---|---|---|---|---|
| T1 | tourism_careful wins (Sustainable or Growing) 25 to 45% of runs | 30.8% | ±2.9 | yes |
| T2 | No strategy wins over 60%; tourism_no_tests under 5% | top climbing_boulder_first 39.0%; no tests 0.0% | ±3.0; ±0.0 | yes |
| T3 | tourism_careful win rates across the viable segments lie within 15 points | 31.1 points (committed 12.9%, families 34.4%, students 44.0%) | ±6.4 | no |
| T4 | The first viable-segment group is served by the twelfth week from opening in the median winning run | week 2.0 from opening |  | yes |
| T5 | Decision news in at least 85% of weeks 1 to 20 and 70% of weeks 53 to 104 | 82.6%; year 2 100.0% |  | no |
| T6 | Reading the inbox pays: tourism_careful beats leaving every message to its default by at least 3 points, and blind effort gains at most a third of that | reading +2.6, blind effort +3.7 | ±1.1 | no |
| T7 | Seasonal pricing pays: tourism_careful (prices from hints per season) beats tourism_price_blind by 2 to 10 points | -0.5 | ±1.0 | no |
| T8 | Platform dependence is a trap: tourism_platform_only loses at least 3 points to the careful mix | -10.2 | ±2.0 | yes |
| T9 | Staffing is a decision: over and understaffing each lose at least 3 points to the careful roster | over +1.1, under -4.9 | ±1.5, ±1.7 | no |
| T10 | Reviews matter: tourism_review_blind loses at least 2 points | -5.0 | ±1.5 | yes |
| T11 | The cancellation policy is a real decision: always strict and always flexible each win in some segment split, and neither is ahead by more than 5 points overall | strict ahead by -0.9 overall; committed -0.6, families -2.0, students +0.0 | ±0.9 | no |
| T12 | 1000 runs complete in under 150 seconds (slowest strategy) | 811.9 s per 1000 runs |  | no |
| T13 | A player without scenario-specific bot knowledge can win: tourism_naive_careful wins at least 20% and no more than 10 points less than tourism_careful | 38.8%; gap +8.0 | ±3.0; ±1.8 | yes |
| T14 | Every staff contract kind wins somewhere: on the seeds where its single-kind bot signs it, permanent, seasonal and part time each beat weekly shifts by their paired margin | permanent +4.5 (signed in 81.5%); seasonal +0.6 (signed in 100.0%); part time +1.2 (signed in 86.5%) | ±1.5; ±0.9; ±1.0 | no |
| T15 | L1. An optional loan for later rooms is a real choice: borrowing and funding later rooms from retained cash are within 5 points of each other | second loan +6.8 against none (second loan taken in 55.8% of runs) | ±1.6 | no |
| T16 | L2. Borrowing for a temptation no segment requires (tourism_overborrow: every item the bank lists and the most working capital, early) loses clearly against borrowing only what the business needs: at least 3 points | -30.8 | ±2.9 | yes |
| T17 | L3. Debt is dangerous: tourism_reckless (the most the bank lends, a temptation included, no repayment-free start) ends with the loan called or bankrupt owing the bank at least 15 points more often than tourism_careful, and tourism_careful misses a payment the business itself could carry in under 3% of runs | ending owing: reckless 100.0%, careful 65.5% (gap +34.5); careful loan-caused misses 0.9% | ±2.9; ±0.6 | yes |
| T18 | L4. The post-mortem names each loan's interest, what it paid for, and whether it was paid back (tourism_careful's borrowers) | 100.0% borrowed; median interest and fees 28322 EUR |  | yes |
| E1 | E1. The established look comes once the company has made it: the careful bot reaches it in at least 40% of its winning runs, in clearly fewer of its losing runs, and in year 2 (median week after 52) | 99.4% of 308 wins, 5.3% of 692 losses; median week 69 | ±0.9, ±1.7; ±0.5 | yes |
| K1 | Each first-wall policy wins or jointly wins on at least15%of paired seeds with different win/loss outcomes | boulder_first 91.8% (287 sole,103 joint); rope_first 31.5% (35 sole,99 joint); both_first 0.9% (0 sole,4 joint); differing 425,all-outcome ties 575 | ±2.6; ±4.4; ±0.9 | no |
| K2 | Half the careful route-setting hours loses at least3points;twice the hours loses at least2 | half -1.4; double -1.4 | ±0.9; ±1.0 | no |
| K3 | Quiet-slot aggregator access beats all slots and no aggregator by at least2points each | all +1.0; none -4.0 | ±0.7; ±1.9 | no |
| K4 | On seeds where rope-first opens rope walls,omitting belay and lead courses loses at least3points | -13.3; rope-opened 1000,no-rope baseline 0 | ±2.1 | yes |
| K5 | Building the speed wall in year one loses at least3points | -2.3 | ±1.0 | yes |
## Contributions and open options for step6

- T3:committed12.9%,families34.4%,students44.0%,spread31.1±6.4. Closest
  playable spread is this round. The final value round increased committed
  cohort size,but financing/rope economics still lag. Review actual first-wall
  selection and service income,without deleting rope-or-boulder spec alternatives.
- T5:early decision news82.6%,year two100%;early remains the closest result.
  Inspect genuine pre-opening preparation decisions;do not relabel routine news.
- T6:reading+2.6±1.1,blind effort+3.7. Closest reading/blind gains were
  round1+2.0/+2.7 but the ratio still failed. Use the once-only event table to
  review contextual trade-offs;do not reward effort with arbitrary penalties.
- T7:hint pricing−0.5±1.0;closest round2−0.1±0.9. No established advantage
  from current budget hints. Review confidence/observable price feedback before
  changing player prices;no hidden willingness lookup or numerical sweep.
- T9:overstaff+1.1±1.5,under−4.9±1.7. Corrected round1over−2.1±1.5 passed
  at its limit. Full hours and actual reset work are now genuinely paid;extra
  freshness can offset their cost. Keep this real trade-off rather than adding
  a bot-specific cost. Understaffing passes.
- T11:strict−0.9±0.9overall;committed−0.6,families−2.0,students0. No
  opposite established market advantages. Round1committed+0.6 was inconclusive.
  Keep visitor refund controls distinct from membership notice;review actual
  lead times,foregone bookings and cancellation exposure in step6.
- T12:slowest811.9seconds/1,000;closest complete round1matrix515.5seconds.
  Loads differ and these are not controlled speed comparisons. The cache trial
  was discarded after only1.1%within uncertainty;do not repeat that candidate.
- T14:permanent+4.5±1.5,seasonal+0.6±0.9,part-time+1.2±1.0 on signing
  seeds (81.5/100/86.5%). Round2all three passed (+4.4/+1.4/+1.2),but final
  seasonal benefit is inconclusive. Review utilisation/commitment,not implausible
  pay cuts or a relaxed statistical threshold.
- T15:later loan+6.8±1.6,taken55.8%;closest round1+5.4±1.4 passed atlimit.
  Review timing/retained-cash bridge without a hidden borrowing penalty.
- K1:boulder leads91.8%,rope31.5%,both0.9% on425differing paired seeds;
  both0sole/4joint,575all-outcome ties. Rope and boulder each have sole wins;
  simultaneous build remains weak. Its closest raw win rate0.4% in this round
  does not establish a real advantage. Preserve actual construction and funding
  costs while reviewing staged opening and mixed-market utilisation.
- K2:half−1.4±0.9 fails3;double−1.4±1.0 passes2 at its margin individually.
  Round2half−1.6±1.1 was closest. Review observed tired weeks and paid reset
  closure timing;do not add a strategy-specific deduction.
- K3:all slots+1.0±0.7,none−4.0±1.9. Shared arrivals now have the correct
  physical trade-off but no all-slot disadvantage is established. Round2all+0.5
  was closest in a playable game. Review actual peak occupancy and paid visitor
  mix rather than claiming that common arrivals alone solved balance.

Other contributions:platform-only−10.2±2.0,review-blind−5.0±1.5;courses
−13.3±2.1 on1,000opened rope baselines,speed−2.3±1.0 at limit. Reckless
owing100%,careful65.5%,gap34.5±2.9;loan-caused misses0.9%±0.6. Median
careful interest/feesEUR28,322. Established99.4%of308wins,5.3%of692losses,
medianweek69±0.5. Complete RunResults for no-platform,no-tests and overworker
remain exact against the final value round;no extra games to compare them.

## Remaining phase gate

Final seed generation completed225rows;only Griffig rows changed. Full tests
run on this frozen source. Run the climbing event table once,events only on
1,000test seeds,reusing this exact-source careful baseline. All12earlier main
comparisons/fingerprints remain valid:the sole formula only enables existing
code for Griffig. Finish report/tag/merge after checks;full report only step6.
