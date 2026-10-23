# Griffig final value-round review

Source8c931a1. Main only,32policies×1,000paired test seeds,eight workers.
1,773wall seconds,13,771summed seconds. Raw report:griffig-main-round2.md.
Values2/2 exhausted,formula0/1. No climbing events or full report.

Careful31.6%±2.9,top boulder-first39.6%±3.0,no-tests0%. Playability bounds
are met. T1 now passes outright;T14 and K4 pass,K5 passes at its limit.
Open:T3,T5–T7,T9,T11,T12,T15,K1–K3. No further first-pass numeric edits.

## Contributions

- Viable committed12.9%,families36.2%,students44.5%;spread31.6±6.4.
  Committed improves from3.1%,but the segment-balance target remains open.
- First walls:boulder39.6%,rope13.7%,both0.3%. Among434differing paired
  outcomes,boulder leads91.2%,rope31.6%,both0.7%;both has no sole win.
  Real additional construction/bridge costs remain;do not remove the spec's
  explicit rope-or-boulder alternative merely to force rope-market selection.
- Half setting−1.6±1.1 still misses3;double−2.0±1.1 meets2.
- All platform slots+0.5±0.8,none−4.8±1.9. All-slot access still has no
  established disadvantage;platform-only loses11.3±2.0.
- Courses−13.7±2.1 on all1,000actually opened rope baselines. Early speed
  wall−2.6±1.2 passes the3-point target at its limit.
- Reading+3.3±1.2,blind effort+3.6;hint pricing−0.1±0.9. No benefit is
  established for changing prices from the current hints.
- Overstaff+0.4±1.6 despite real full hours/reset work;under−5.9±1.8.
  Review-blind−5.8±1.5. Strict refunds−2.0±1.1overall,committed0,
  families−4.4,students−1.5:the required opposite segment advantages fail.
- Contracts pass on signing seeds:permanent+4.4±1.4,seasonal+1.4±0.9,
  part-time+1.2±1.0. Later loans+7.8±1.8,taken55.7%,miss the5-point cap.
- Overborrow−31.6±2.9;reckless owing100%,careful65.1%,gap34.9±3.0;
  own-loan-caused misses0.7%±0.5. Median careful interest/feesEUR28,603.
- Established99.7%of316wins,4.8%of684losses,medianweek69±0.5.
  Early decision news82.6%still misses85;year two100%passes.
- Slowest646.4seconds/1,000,T12fails. Concurrent timings are not a controlled
  optimisation comparison;the earlier inconclusive cache trial stays discarded.

## Sole formula decision

Enable Griffig's existing optional shared member/platform arrival queue.
Currently leisureVisits reserves every member before any platform visitor,
so opening all slots cannot displace those already-reserved members. The
shared seeded arrivals use actual hard capacity and actual member waitlists,
with no extra draw when no platform request exists. The existing interface
explains the common queue;no hidden threshold or probability is exposed.
Personal qualifications survive both request paths (13focused checks/lint).

Touch scenario.yaml,spec sources,decisions,budget and status;no engine or
numeric change. All earlier content and applicable bot/engine paths remain
identical,so the completed twelve-unit proof remains applicable. Count this
as the sole formula round even though activation is a content switch.
Measure affected main on1,000paired test seeds before events once and final
validation. Unresolved targets become open first-pass issues;step6 has its
separate fresh budget. Do not invent strategy penalties to fill this round.

## Complete target table

“Yes” follows the plan's margin rule;K5 is specifically at its limit.

| # | Target | Value | Margin | Met |
|---|---|---|---|---|
| T1 | tourism_careful wins (Sustainable or Growing) 25 to 45% of runs | 31.6% | ±2.9 | yes |
| T2 | No strategy wins over 60%; tourism_no_tests under 5% | top climbing_boulder_first 39.6%; no tests 0.0% | ±3.0; ±0.0 | yes |
| T3 | tourism_careful win rates across the viable segments lie within 15 points | 31.6 points (committed 12.9%, families 36.2%, students 44.5%) | ±6.4 | no |
| T4 | The first viable-segment group is served by the twelfth week from opening in the median winning run | week 2.0 from opening |  | yes |
| T5 | Decision news in at least 85% of weeks 1 to 20 and 70% of weeks 53 to 104 | 82.6%; year 2 100.0% |  | no |
| T6 | Reading the inbox pays: tourism_careful beats leaving every message to its default by at least 3 points, and blind effort gains at most a third of that | reading +3.3, blind effort +3.6 | ±1.2 | no |
| T7 | Seasonal pricing pays: tourism_careful (prices from hints per season) beats tourism_price_blind by 2 to 10 points | -0.1 | ±0.9 | no |
| T8 | Platform dependence is a trap: tourism_platform_only loses at least 3 points to the careful mix | -11.3 | ±2.0 | yes |
| T9 | Staffing is a decision: over and understaffing each lose at least 3 points to the careful roster | over +0.4, under -5.9 | ±1.6, ±1.8 | no |
| T10 | Reviews matter: tourism_review_blind loses at least 2 points | -5.8 | ±1.5 | yes |
| T11 | The cancellation policy is a real decision: always strict and always flexible each win in some segment split, and neither is ahead by more than 5 points overall | strict ahead by -2.0 overall; committed +0.0, families -4.4, students -1.5 | ±1.1 | no |
| T12 | 1000 runs complete in under 150 seconds (slowest strategy) | 646.4 s per 1000 runs |  | no |
| T13 | A player without scenario-specific bot knowledge can win: tourism_naive_careful wins at least 20% and no more than 10 points less than tourism_careful | 38.6%; gap +7.0 | ±3.0; ±1.8 | yes |
| T14 | Every staff contract kind wins somewhere: on the seeds where its single-kind bot signs it, permanent, seasonal and part time each beat weekly shifts by their paired margin | permanent +4.4 (signed in 81.8%); seasonal +1.4 (signed in 100.0%); part time +1.2 (signed in 86.6%) | ±1.4; ±0.9; ±1.0 | yes |
| T15 | L1. An optional loan for later rooms is a real choice: borrowing and funding later rooms from retained cash are within 5 points of each other | second loan +7.8 against none (second loan taken in 55.7% of runs) | ±1.8 | no |
| T16 | L2. Borrowing for a temptation no segment requires (tourism_overborrow: every item the bank lists and the most working capital, early) loses clearly against borrowing only what the business needs: at least 3 points | -31.6 | ±2.9 | yes |
| T17 | L3. Debt is dangerous: tourism_reckless (the most the bank lends, a temptation included, no repayment-free start) ends with the loan called or bankrupt owing the bank at least 15 points more often than tourism_careful, and tourism_careful misses a payment the business itself could carry in under 3% of runs | ending owing: reckless 100.0%, careful 65.1% (gap +34.9); careful loan-caused misses 0.7% | ±3.0; ±0.5 | yes |
| T18 | L4. The post-mortem names each loan's interest, what it paid for, and whether it was paid back (tourism_careful's borrowers) | 100.0% borrowed; median interest and fees 28603 EUR |  | yes |
| E1 | E1. The established look comes once the company has made it: the careful bot reaches it in at least 40% of its winning runs, in clearly fewer of its losing runs, and in year 2 (median week after 52) | 99.7% of 316 wins, 4.8% of 684 losses; median week 69 | ±0.6, ±1.6; ±0.5 | yes |
| K1 | Each first-wall policy wins or jointly wins on at least15%of paired seeds with different win/loss outcomes | boulder_first 91.2% (294 sole,102 joint); rope_first 31.6% (38 sole,99 joint); both_first 0.7% (0 sole,3 joint); differing 434,all-outcome ties 566 | ±2.7; ±4.4; ±0.8 | no |
| K2 | Half the careful route-setting hours loses at least3points;twice the hours loses at least2 | half -1.6; double -2.0 | ±1.1; ±1.1 | no |
| K3 | Quiet-slot aggregator access beats all slots and no aggregator by at least2points each | all +0.5; none -4.8 | ±0.8; ±1.9 | no |
| K4 | On seeds where rope-first opens rope walls,omitting belay and lead courses loses at least3points | -13.7; rope-opened 1000,no-rope baseline 0 | ±2.1 | yes |
| K5 | Building the speed wall in year one loses at least3points | -2.6 | ±1.2 | yes |
