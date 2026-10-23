# Step5: Griffig

**Complete first pass.** Final main, one event table, earlier-game proof and a green
full test suite pass the phase gate. The run stopped on 23 October under plan section
1.2.1 ([hard-stop record](../climbing/HARD_STOP.md)) and resumed on Henry's instruction.

## What was built

A long-only Munich climbing hall with24features,49events,150interview quotes,
four intro cards and two native360×170hall/mezzanine scenes. All three interface
voices use the existing design. Accent#2F6B3A gives white contrast6.39:1.

- Real common fit-out and boulder/rope first-build invoices,construction waits,
  opening progress and bank working capital. The internal mezzanine is a paid
  same-building offer,with no second location or safety-capacity increase.
- Actually staffed opening hours,separate paid/founder desk cover,shared wall
  capacity for ordinary visitors and coached groups,and setting work from
  actual founder hours or paid setters. Only the reset morning closes.
- Individual earned belay/lead skills,prerequisite course ladders and paid
  membership enquiries from actual graduates. No segment-wide free skills,
  invented members or free coaching from the front desk.
- Monthly/annual/off-peak/student agreements,owed ten-visit cards,weekly clubs
  and ten real birthday places. Café/rental baskets earn on served visits;
  café receipts also need dedicated paid throughput cover. No shop simulation.
- Aggregator slots,caps,leaving and membership migration. Optional seeded
  member/platform arrivals compete for the same actual places and preserve
  personal qualifications. The existing interface explains the common queue.
- Visitor refund controls are visible separately from membership notice. All
  controls use PlayerView and the existing notebook/Calendar components.

All additions are optional. Completed fitness milestone325ebbf was imported
before registration8a3a423. Hall traffic compaction and shared-formula import
preserve27complete diagnostic results and public traces,including six funded
104-week rope/course fixtures. An inconclusive further cache was discarded.

## Measurement and tuning

Every matrix below is main only,32policies×1,000paired test seeds. Corrected
policy-only measurements reuse all unaffected tasks;raw superseded evidence
remains labelled in the detailed reviews. No full report has run.

| Outcome source | Measurement | Careful | Top | Budget |
|---|---|---|---|---|
|8a3a423 /4e92152|Initial,review-blind corrected|51.6%±3.1|56.4%|values0/2,formula0/1|
|78cae39 /26f5ecb|Value1,overstaffing corrected|24.0%±2.6 at limit|26.5%|values1/2,formula0/1|
|8c931a1|Value2|31.6%±2.9|39.6%±3.0|values2/2,formula0/1|
|27756b3|Sole formula:shared arrivals|30.8%±2.9|39.0%±3.0|values2/2,formula1/1|

The first value round adjusted estimated demand,fictional own-money share and
reset work. The final value round raised committed enquiries and calendar
freshness loss. Fees,rent,wages,equipment prices and loan ceiling stayed fixed.
The sole formula activates existing shared-arrival code for Griffig;it adds no
engine change or numeric penalty. Sources/estimates:scenario-climbing.md15.

Final main takes1,713wall seconds/13,376summed seconds over eight workers.
Careful30.8%±2.9,top39.0%±3.0,no-tests0% meet the plan's playability bounds.
No further first-pass tuning is allowed. Step6 has its separate fresh budget.

## Final first-pass main targets

T1–T18,E1,K1–K5 apply. T4 starts at actual opening. The initial T11exclusion
was corrected after audit found an operative visitor-refund control hidden by
the shared membership form;its original wording/limits are retained. K1 counts
sole/joint leaders on differing paired binary outcomes and reports all ties.
K4 judges actually opened rope baselines and separately reports absent ropes.

Source27756b3,main only1,000paired seeds per policy. “Yes” uses the plan's
margin rule. K5passes at its limit;all other passing rows pass outright.
T14needs an advantage beyond its paired margin,so seasonal+0.6±0.9fails.
T15+6.8±1.6 stays outside5using the exact unrounded margin.

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

## Decisions and open issues

Open:T3,T5–T7,T9,T11,T12,T14,T15,K1–K3. Full contributions,closest evidence
and options are in [FINAL_REVIEW.md](../climbing/FINAL_REVIEW.md),with the
preceding numeric review in [ROUND2_REVIEW.md](../climbing/ROUND2_REVIEW.md).

Boulder and rope each have sole wins;both-first has only four joint wins and
no sole win. Half setting still misses its loss target. Shared arrivals provide
the real physical trade-off but all-slot access still has no established
outcome disadvantage. These remain open rather than being hidden by a strategy
penalty or relaxed threshold. Hint pricing,refund-market splits and seasonal
contract gains likewise remain inconclusive or miss their original targets.

Review-blind inbox and hall-overstaffing behaviour were corrected before
numeric compensation;only affected policies reran. Complete no-platform,
no-tests and overworker results remain exact across the final value/formula
comparison. No extra games were needed to compare those cached records.

The discarded capacity experiment preserves27results/public traces and2,000
paired benchmark results,but its1.1%timing difference is within uncertainty.
No optimisation was retained and no cross-load matrix speed gain is claimed.

For Henry:two-hour average coached wall occupancy,estimated café/rental baskets,
family-loan repayment beyond104weeks,shared arrivals and visible visitor refunds
are explicit adaptations in scenario-climbing.md15/decisions. No second site,
shop,personal training,physiotherapy or real integration was added.

## Validation and protected games

- 48 focused content, hall, qualification, queue, bot and target checks and lint/typechecks
  pass on the final outcome source. The queue preserves each visitor's actual belay
  skills, determinism and input immutability.
- Final seed generation writes 225 rows; only Griffig changes, and every example replays.
- Heading fit. After resuming, a full run with nothing else running still failed
  (WebKit 375, Gratwanderung and Tiefgang), so the cause was code, not load. The lazy
  established stylesheet supplies the heading face and letter spacing; with the face
  cached no `loadingdone` fires and the bar keeps its width, so the fitter never refitted.
  Fix 94047f1: in the established stage the name sits in its own inline-block span, and
  a ResizeObserver refits on the next frame when the span's width differs from what the
  fitter left. No test or assertion changed. The heading case passed in every full run
  since; an A/B run with the old TopBar failed it again.
- Test command. Every full run then ended with one vitest 3.2.7 "Timeout calling
  onTaskUpdate" error although all tests passed, even on an idle machine; the web project
  and the other projects each pass alone. Henry accepted the gate with `pnpm test` split
  into two runs, web first, exiting 0 only if both pass (23013dd; decisions, backlog).
- Gate run on 23013dd, idle machine: web 599 passed; all other projects 1,363 passed,
  30 skipped; exit 0. `pnpm lint` passes.
- All 24 Griffig Chromium/WebKit stage/width cases pass at 375/390/430/1440 px, including
  the shared-queue and refund controls. Screenshots at 390/1440 are outside the repo
  under /private/var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-climbing.
- All 12 earlier main comparisons are identical apart from timings, on 1,000 test seeds
  each. Eleven earlier fingerprints match; fitness is recorded and its complete 30-policy
  main matches the final formula baseline. See
  [proof provenance](../protected-step5/PROVENANCE.md). Changes after that proof are the
  TopBar fix and the test command, which move no outcomes.

## Once-only event table

Events part only, 100 policies, 1,000 paired test seeds each, source 27756b3, eight
workers. 76,588 of 100,000 games played; the rest reuse the exact-source careful
baseline. The campaign was interrupted at the hard stop and once more for a quiet test
window, and resumed both times from its checkpoints; no completed task was replayed.
Raw table: [griffig-events.md](../climbing/griffig-events.md). Its target rows lack the
main policies; the main table above is authoritative.

All 49 events were judged: 33 favour the cheapest answer, 16 a more effortful one.
Apart from the first-wall choice (boulder 39.0%, research 27.2%, rope 13.4%, both 0.4%),
every event's fixed answers sit within about 1.5 points of each other, inside noise at
these seed counts. Events barely move outcomes in Griffig, which matches the open T6.

## Milestone

Under Henry's resume instructions the open targets go to `docs/BACKLOG.md` for a later
tuning plan instead of a step 6 revisit. Annotated milestone `plan5-climbing` follows
this report. Full report only in step 6, once. No push.
