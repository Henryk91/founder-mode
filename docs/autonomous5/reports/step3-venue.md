# Step 3: Fabriketage, in progress after resumed stop

The draft is committed separately on `plan5-venue-work`;the user resumed the UI stop in `5c8abf2`,
in `/private/tmp/founder-mode-plan5-venue`. It is not merged into main. Main's
completed milestone is `plan5-escape` at `d9381dc`.

## Built in the isolated draft

Optional venue mechanics cover pool closures, weekday reset capacity/cost, real
furniture hire and purchase, catering receipts, actual complaints/restrictions,
immediate single refunds for restricted future reservations, waited permit decisions
and one-time partial refunds, and deposit-only strict cancellation terms. All are
content-gated. Forward sales reuse existing readiness-aware bookings. Engine/schema
changes and fixture tests are committed together;87 focused engine tests pass.

Content has51 events,150 interview quotes,four intro cards and the same-building
conference breakout offer.221 content tests pass,24 skipped. Sources and initial
estimates are in the draft spec's section15. Early guest balances, a separately
bookable second hall, supplier selection and capital expense/refund timing remain
explicit first-pass limitations. Venue bots use observable holds, interview mentions,
calendar dates and actual complaints.68 focused bot checks and replay pass.

UI draft includes hold controls/expiries/refunds, slot prices, closures, permit
terms/decisions, actual ancillary receipts and late contribution; two native SVG
scenes and accent#7A3E1D. All16 terminology/Help/results/post-mortem browser cases
pass. The venue matrix passes23/24 cases and axe is clean. The established375px
WebKit heading still clips after three repairs; see STATUS.md Stopped. Lint and
typechecks pass. Full phase tests and protected proof for this draft are pending.
Screenshots are outside the repo in the system temp `founder-mode-venue` folder.

## Initial measurement, before any value tuning

[Raw report](../tuning/fabriketage-main-initial.md):main only,28 strategies,
1,000 `test` seeds per strategy,one worker,engine0.14.0.506 seconds wall;slowest
29.2 seconds per1,000. Careful25.8%±2.7,top companies-only32.8%±2.9. These figures
are playable but not a completed phase. No value rounds(0/2),formula rounds(0/1),
venue event table or full report have run.

## Targets (tourism)

The tourism target template (`docs/tourism-proposal.md` section 13), judged on `tourism_careful`; differences are paired on the same seeds. Target 6 (the inbox) needs the inbox part and is reported with the scenario.

| # | Target | Value | Margin | Met |
|---|---|---|---|---|
| T1 | tourism_careful wins (Sustainable or Growing) 25 to 45% of runs | 25.8% | ±2.7 | yes |
| T2 | No strategy wins over 60%; tourism_no_tests under 5% | top venue_companies_only 32.8%; no tests 0.0% | ±2.9; ±0.0 | yes |
| T3 | tourism_careful win rates across the viable segments lie within 15 points | 50.3 points (companies 52.2%, private_parties 21.9%, weddings 1.9%) | ±5.5 | no |
| T4 | The first viable-segment group is served by the twelfth week from opening in the median winning run | week 2.0 from opening |  | yes |
| T5 | Decision news in at least 85% of weeks 1 to 20 and 70% of weeks 53 to 104 | 75.4%; year 2 98.2% |  | no |
| T6 | Reading the inbox pays: tourism_careful beats leaving every message to its default by at least 3 points, and blind effort gains at most a third of that | reading +2.6, blind effort +5.6 | ±1.6 | no |
| T7 | Seasonal pricing pays: tourism_careful (prices from hints per season) beats tourism_price_blind by 2 to 10 points | +0.7 | ±1.2 | no |
| T8 | Platform dependence is a trap: tourism_platform_only loses at least 3 points to the careful mix | -23.5 | ±2.6 | yes |
| T9 | Staffing is a decision: over and understaffing each lose at least 3 points to the careful roster | over -18.0, under -4.1 | ±2.4, ±1.4 | yes |
| T10 | Reviews matter: tourism_review_blind loses at least 2 points | -0.8 | ±1.0 | no |
| T11 | The cancellation policy is a real decision: always strict and always flexible each win in some segment split, and neither is ahead by more than 5 points overall | strict ahead by -1.8 overall; companies -4.4, private_parties +0.0, weddings -0.9 | ±1.6 | no |
| T12 | 1000 runs complete in under 150 seconds (slowest strategy) | 29.2 s per 1000 runs |  | yes |
| T13 | A player without scenario-specific bot knowledge can win: tourism_naive_careful wins at least 20% and no more than 10 points less than tourism_careful | 21.5%; gap -4.3 | ±2.5; ±1.7 | yes |
| T14 | Every staff contract kind wins somewhere: on the seeds where its single-kind bot signs it, permanent, seasonal and part time each beat weekly shifts by their paired margin | permanent +0.0 (signed in 6.6%); seasonal +0.0 (signed in 21.1%); part time -0.8 (signed in 24.5%) | ±0.0; ±0.0; ±1.1 | no |
| T15 | L1. An optional loan for later rooms is a real choice: borrowing and funding later rooms from retained cash are within 5 points of each other | - |  | not measured |
| T16 | L2. Borrowing for a temptation no segment requires (tourism_overborrow: every item the bank lists and the most working capital, early) loses clearly against borrowing only what the business needs: at least 3 points | -25.8 | ±2.7 | yes |
| T17 | L3. Debt is dangerous: tourism_reckless (the most the bank lends, a temptation included, no repayment-free start) ends with the loan called or bankrupt owing the bank at least 15 points more often than tourism_careful, and tourism_careful misses a payment the business itself could carry in under 3% of runs | ending owing: reckless 100.0%, careful 72.7% (gap +27.3); careful loan-caused misses 2.1% | ±2.8; ±0.9 | yes |
| T18 | L4. The post-mortem names each loan's interest, what it paid for, and whether it was paid back (tourism_careful's borrowers) | 100.0% borrowed; median interest and fees 6966 EUR |  | yes |
| E1 | E1. The established look comes once the company has made it: the careful bot reaches it in at least 40% of its winning runs, in clearly fewer of its losing runs, and in year 2 (median week after 52) | 94.2% of 258 wins, 0.7% of 742 losses; median week 60 | ±2.9, ±0.6; ±1.0 | yes |
| V1 | Holds are a decision: granting every hold freely and granting none each lose at least 2 points to careful | free -1.4; none +5.2 | ±1.4; ±1.5 | no |
| V2 | The calendar has two businesses: careful beats companies-only and weddings-only by at least 3 points each | companies +7.0; weddings -25.6 | ±2.4; ±2.7 | no |
| V3 | Late events without insulation restrict at least 20% of runs that hold them; careful late events pay more than their attributable costs | restricted 58.5% (276/472); careful mean net 16997 EUR/run | ±4.4; ±1649 EUR | yes |
| V4 | The roof terrace is a trap: building it in the first year loses at least 3 points | -20.0 | ±2.5 | yes |


## Open work and contributions

T3,T5,T6,T7,T10,T11,T14,V1 andV2 fail. T15 is not measured:the cash-funded
later-investment variant is still scoped only to Ausgesperrt. Add a venue comparison
before claiming all targets measured. Thresholds remain unchanged.

V3 uses actual late-serving runs as its denominator:276/472 no-insulation runs
restricted,58.5%±4.4. Careful's mean actual late net is16,997 EUR/run±1,649,including
dedicated setup. V4's roof variant loses20.0±2.5 points. V1's free-hold loss
1.4±1.4 passes at the two-point limit, but no-holds gains5.2±1.5 and fails. V2's
companies-only gains7.0±2.4;weddings-only loses25.6±2.7.

Initial hold values warrant inspection before tuning:company/wedding/private
no-hold conversion(.65/.40/.95) exceeds free-hold conversion(.50/.33/.65) in every
market,while free holds also tie up dates. Paid holds add another acceptance loss.
Do not hide this dominance by changing a target. Sensible value estimates and
observable bot adaptation should be considered after the hard stop is resolved.
Market spread is50.3±5.5 points;wedding-viable seeds win1.9%,private21.9%,company52.2%.
Investigate long-lead cash timing, payroll and actual cross-market contribution
before changing values. Earlier financing/bot ordering repairs already preceded
this initial measurement and do not count as game-value rounds.

## Protected games and stopping rule

Main's step2 proof remains valid:all nine protected main reports/fingerprints match
baseline apart from timings,and the full suite passes79 files/1,542 tests/21 skipped.
The isolated venue engine/shared-bot changes have not yet received their required
fresh nine-game plus Ausgesperrt main comparison. They must remain unmerged.

Plan section1.2.1 requires stopping after three honest attempts at the same failing
test. Font-load listeners,stable flex/post-layout checks,and text-range measurement
left the375px WebKit name cut off. No fourth repair attempted. STATUS.md records
logs/options. Steps4,5 and6 are unfinished;the full report has never run. No push.

## Resumed progress

The user requested continuation. The repaired heading passes all80 venue/earlier
established browser cases and lint. The full suite then identified a real equipment
preparation prerequisite and missing seed examples:the first is fixed with109
focused checks passing;the second adds18 venue examples with all190 checks passing
and every earlier row byte-identical. A venue-specific T15 comparison and no-cost
reader correction are being measured in a corrected main baseline(all29 strategies,
1,000 test seeds). No value rounds used. Protected main proof is running;main is
still at the Ausgesperrt milestone and the venue draft remains isolated.
