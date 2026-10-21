# Step 2: Ausgesperrt

Final values measured; event table and full phase checks are running. The milestone is not yet tagged.

## Built

Ausgesperrt is a long-only leisure business in a Munich basement, with four physical
spaces. The player chooses an initial theme, prepares it, pays for construction and
waits eight weeks for opening. Rooms use weekday daytime, evening and weekend slots;
accepted dates retain their reservations when the player closes new sales. Theme life
reflects wear and finite local groups; rebuilding costs EUR25,000, preparation hours
and six weeks closed. Company groups need two rooms ready on their requested date.

Content includes ten features, 50 events (eight before opening), four intro cards and
150 interview lines. Slots have segment-specific peak/off-season prices. Local and
visitor games are prepaid; company groups pay a deposit and receive an invoice for
the balance. Leisure company cancellations and flexible guest cancellations refund
the advance. Strict guest cancellations retain the agreed charge.

New leisure UI exposes slot load/refusals, future held/booked/free dates, freshness,
construction readiness, physical spaces, rebuilding costs and closures. The app uses
PlayerView only. Two native SVG scenes use the existing style and dimensions.

## Adaptations and decisions

- Stage 2 finishes reception in the original basement: the plan forbids a second
  location, although the draft spec proposed premises across the road.
- Corporate bookings are two to four room-games inside broad weekly slots, not exact
  headcounts or guaranteed simultaneous start times.
- Design hours and elapsed contractor construction are separate. Freelance help speeds
  design; it does not promise a calendar cut unsupported by the engine.
- Four spaces are reserved from design start; a meeting room uses one. New slot-price
  mode applies one price response at the requested slot/date and keeps voucher value.
- Bots use observed freshness and packing/refusals. Started rooms stay in the build
  queue; accepted loans clear their old refusal ceiling; simultaneous rebuilds share
  one budget. The retained-cash variant cannot bypass its policy via office finance.
- T15 compares real later-room borrowing with retained-cash finance, keeping its
  five-point threshold. The inherited refit pair would otherwise compare identical
  policies. Leisure T3 uses the combined margin of the extreme market splits.

Sources and estimates are in the escape-room spec’s section 15. Actual Munich group
prices support the initial group-price range. Building, rent, company premiums and
commissions remain labelled estimates. Staff pay includes assumed employer costs.

## Measurement and budget

T1–T18, E1 and X1–X4 apply; T4 is measured from actual opening. Office targets
T19–T22 are outside scope. Two scenario-value rounds used; formula allowance unused
by decision. No threshold was changed to turn a miss into a pass.

Final measurement: **main only, all 28 strategies, 1,000 seeds each, prefix `test`,
two workers**. Careful 42.8% ±3.1; top part-time 48.4% ±3.1. The slowest strategy takes
128.0 seconds per 1,000; wall time 1,434 seconds. This meets the hard playability
bounds. The complete report is [values2](../tuning/ausgesperrt-values-2.md); the raw
comparison baseline for later steps is [Ausgesperrt](../baseline/ausgesperrt-long.md).

| Target | Result | 95% margin | Status |
|---|---|---|---|
| T1 | 42.8% | ±3.1 | pass |
| T2 | top tourism_part_time 48.4%; no tests 22.1% | ±3.1; ±2.6 | fail |
| T3 | 32.5 points (companies 27.7%, locals 60.2%, tourists 40.6%) | ±7.0 | fail |
| T4 | week 2.0 from opening |  | pass |
| T5 | 100.0%; year 2 100.0% |  | pass |
| T6 | reading +10.8, blind effort +8.9 | ±2.8 | fail |
| T7 | +2.6 | ±2.8 | pass |
| T8 | -19.4 | ±2.8 | pass |
| T9 | over -42.8, under -41.8 | ±3.1, ±3.1 | pass |
| T10 | +4.7 | ±2.1 | fail |
| T11 | strict ahead by -3.4 overall; companies +3.8, locals -1.5, tourists -13.2 | ±2.7 | fail |
| T12 | 128.0 s per 1000 runs |  | pass |
| T13 | 35.8%; gap -7.0 | ±3.0; ±2.7 | pass |
| T14 | permanent +8.6 (signed in 80.7%); seasonal +1.9 (signed in 83.8%); part time +10.7 (signed in 85.8%) | ±3.0; ±2.2; ±2.7 | fail |
| T15 | second loan +16.5 against none (second loan taken in 98.7% of runs) | ±2.8 | fail |
| T16 | -5.7 | ±2.6 | pass |
| T17 | ending owing: reckless 42.6%, careful 38.7% (gap +3.9); careful loan-caused misses 2.6% | ±4.3; ±1.0 | fail |
| T18 | 100.0% borrowed; median interest and fees 4683 EUR |  | pass |
| E1 | 95.3% of 428 wins, 31.1% of 572 losses; median week 68 | ±2.0, ±3.8; ±2.0 | pass |
| X1 | one room -42.0; quarterly -1.4 | ±3.1; ±2.6 | at the limit |
| X2 | -2.9 | ±2.3 | pass |
| X3 | -20.9 | ±2.8 | pass |
| X4 | -14.9 | ±2.7 | pass |

X1's quarterly loss is 1.4 points against the three-point target, within its 2.6-point
margin, so it passes at the limit. T14 explicitly requires an advantage beyond the
paired margin; the seasonal gain remains inconclusive. T11 likewise requires
demonstrated opposite market advantages. No claim is made from a smaller effect
than its margin.

The first value round and corrected bot baseline remain in tuning/. Interrupted
correctness diagnoses are labelled intermediate; their figures are not final balance.
Final value estimates are documented in the spec, section 15. Ordinary-room upkeep
is EUR350/month; flexible cover EUR120/five hours including estimated employer cost.
Company base 4–14 means room-game units (roughly 1.3–4.7 requests at mean three games),
not 4–14 team enquiries. Earlier prose was corrected; measured YAML values stay intact.

## Open issues and formula review

The budget is an upper bound. No formula change is justified solely to make a
particular bot lose: the game is playable, and remaining failures have concrete
trade-off/design questions. The formula allowance is deliberately **unused**, not
claimed exhausted. Step 6 must revisit these eight issues once with its fresh budget.

| Target | Current result / closest measured evidence | Options for step 6 |
|---|---|---|
| T2 | No-tests 22.1% ±2.6, the lowest corrected measurement; top 48.4% passes its cap | Inspect broad-portfolio contribution and learnable theme preferences; keep the 5% threshold |
| T3 | Spread 32.5 ±7.0 points, closest corrected spread; companies 27.7%, locals 60.2%, tourists 40.6% | Corporate room-game demand/pricing, two-room plus meeting-space capital and cash timing |
| T6 | Reading +10.8, blind effort +8.9 ±2.8; first round reading +4.4/blind +5.6 was closer to the blind-effort limit | Use the once-only event table to find choices where effort substitutes for reading |
| T10 | Review-blind +4.7 ±2.1; corrected baseline +2.2 was closer but had 75.8% careful wins | Separate the cost of spare roster shifts from repair/review benefits; avoid an arbitrary review multiplier |
| T11 | Strict -3.4 overall; company +3.8/local -1.5/visitor -13.2, but the required split evidence is not established | More evidence or a clearer observable commitment trade-off; retain the five-point overall limit |
| T14 | Seasonal +1.9 ±2.2 on signed seeds; permanent +8.6 ±3.0 and part-time +10.7 ±2.7 pass | Seasonal coverage/idle-week decisions; 10,000 only if tuning this smaller-than-margin effect |
| T15 | Later loan +16.5 ±2.8; closest corrected baseline +12.5 had 75.8% careful wins | Loan terms/grace and investment timing, without a new hidden borrowing penalty |
| T17 | Reckless owing 42.6% vs careful 38.7%, gap 3.9 ±4.3; loan-caused misses 2.6% ±1.0. First value gap 7.1 was closer but careful 55.7% | Debt-service/grace exposure and actual owed endings; preserve the fifteen-point target |

Adding a strategy-specific expense, changing the ending window only for quarterly
rooms, magnifying tiny rating differences or treating a third value round as a
unit repair would be unjustified. Forward sales, equipment hire and other next-step
gaps are preparation for the venue, not concealed changes to this game.

## Checks and protected games

- Final lint/typechecks: pass, /tmp/plan5-values-2-lint.log.
- Focused content/bot checks: 235 passed, 21 skipped. All 36 leisure bot tests pass,
  including a complete game per strategy. Existing leisure engine coverage has 44 tests.
- Seed regeneration: 171 examples ; 172 coverage/replay tests pass. Eight Ausgesperrt
  rows changed, all protected-game seed rows byte identical.
- Full suite running: session 8519, /tmp/plan5-step2-final-full-tests.log. Before final
  bot/value changes, 79 files/1,539 passed/21 skipped; this is historical evidence.
- Once-only step 2 event table running: session 14569, /tmp/plan5-ausgesperrt-events.log;
  parts events, 1,000 `test` seeds, two workers. Its automatic careful baseline supports
  forced-answer reuse; use the main-only table above for the full target judgement.
- Axe, word/cut checks cover three stages, 375/390/430/1440 px, Chromium/WebKit;
  Help/results/post-mortem words at 390/1440. The complete rerun refreshes them.
  Screenshots outside repo: /var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-leisure.

All nine protected games match baseline exactly apart from timings: **main only,
1,000 test seeds per strategy**, one scenario per process. Details and fingerprints
are in [the protected proof](step2-protected.md). No engine/shared-bot changes occurred
in either value round; only Ausgesperrt values changed. Engine version stays 0.14.0.

The full bot report has **not** run; exactly once in step 6. No push was made.
