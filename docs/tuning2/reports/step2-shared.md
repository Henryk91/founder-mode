# Step 2: shared leisure patterns

## Scope and files

Protected: all nine earlier scenario/mode units. Only the four leisure units may
change. Full report remains unused; main comparisons and affected event tables
use 1,000 paired seeds. All economic budgets start unused at this step.

Planned files: tourism strategy and leisure bot tests, content schema, Booking
type, bookings/venue accounting and tests, Fabriketage YAML; shared event changes
in each leisure scenario; mechanics/spec/schema docs, decisions, budget and status.
Ambiguity: balances must remain distinct from the original deposit to honour
strict deposit-only terms. requestsAhead is already true in Fabriketage.

## Bot correction first

Two focused regressions reproduced inbox snag repairs by the escape/venue
review-blind policies. The existing fitness/climbing safeguard now covers all
leisure scenarios, keeping old non-leisure paths unchanged. Isolated comparisons
run only these two affected policies, 1,000 paired test seeds each, reusing the
saved careful result. Venue balance configuration is removed in this diagnostic
so payment changes cannot explain the measured bot effect.

## Advance-balance accounting

Optional leisure balanceWeeksBefore maps segments to deadlines, configured only
for venue weddings (4) and private parties (1). Track balancePaidCents separately
from depositCents, collect once, deduct both at service, settle commission once,
and refund according to agreed terms. Future restrictions refund both once.
Negative settlements never create negative invoices. Unconfigured paths and RNG
are unchanged. Type documentation updated with the type change.

Charge venue T3 formula round 1; no numeric change can add the missing payment
ledger. Full target measurement is pending, so this is not a claim of improvement.
The 99 focused accounting, venue and bot tests pass. They cover deadline/repeat/
late collection, served/flexible/strict/company settlement, commission, refunds,
negative invoices, future restriction refunds and input purity.


Isolated review-blind results, 1,000 seeds each (no balance setting): escape
+4.7 ±2.1 → −31.7 ±3.0 points against unchanged saved careful; venue −1.8 ±1.4
→ −31.2 ±2.9. Complete evidence: ../proof/review-fix-<scenario>.json.
This corrects the comparator's unintended repairs; it is not an economic penalty.


## First-loan scope, contracts and pricing (bot corrections)

Eight example seeds each for escape, venue and climbing trace actual applications,
not target win rates (state/loan-scope/). Venue submitted a common-fit-out-only
plan in week 1, then borrowed again for AV. It now prepares the plan while
interviewing, submits after the first evidence, and includes observed equipment
needs. Corporate escape visits need two areas, but the bot postponed planning the
second until opening. Its initial plan now includes that public minimum. Climbing
already funds its essential first wall and six months of working capital; later
kids-area/expansion purchases are genuine investments, so terms are unchanged.

Leisure contract bots use six weeks of average paid utilisation, rather than the
minimum of those weeks; one quiet week no longer vetoes a useful contract.
Existing coverage, notice and affordability checks remain, and no victory lookup
is introduced. A regression exercises a quiet week before signing while running.

Fitness/climbing hint pricing keeps day-ticket off-season receipts at the same
hint-based level as peak prices, following the earlier per-scenario finding.
Membership terms and prices retain their existing hint rules. Fixed-price
comparators retain published starting tickets. No price sweep or global curve
change. T7 remains unjudged until the paired main results arrive.

## Contextual content, value round 1

Ten rewritten sales cards per leisure unit use five observable contexts: season,
last week's crowding, outstanding snags, energy and available cash. Each offers a
useful lower-effort response in its situation, a paid invitation campaign where
there is room and readiness, and retaining the budget. Printing/promotion costs
are quoted, invitations enter the existing demand pool rather than guarantee
sales, and packed-slot promises can receive complaints. No bot/seed/hidden-role
conditions. Fixed reader replies for rewritten cards are removed; the existing
public-condition reader selects the appropriate answer.

Fitness/climbing each gain five genuine pre-opening decisions from weeks 7–11:
teacher/club contacts, founding-member planning and invitations. Each has an
actual quoted fee and prospect effect when a funded opening plan and cash buffer
support it, with ordinary price/capacity/staffing applying on attendance. These
are new decisions, not reclassified routine entries. Costs are gameplay estimates.
Inventory: ../proof/context-events-round1.json. Charge T6 value round 1 for all
four units and T5 value round 1 for fitness/climbing. No target pass is claimed yet.

Validation: all 151 focused bot/content tests pass; the loan interview fixture was
corrected to use the actual public InterviewView shape, and its targeted rerun
passes. Lint and all typechecks pass. The earlier complete non-web gate had only
stale leisure seed examples and a new rounding expectation; regenerated examples
and the 244-test rerun pass. New content requires one more seed refresh before the
full shared source gate. No tests have run alongside any bot job.


## Confidence audit and full-gate wording fixes

Leisure T6 used the reading comparison's margin for the distinct blind-effort
limit. Correct it to the paired variance of E − 2N/3 − C/3 on the same seeds,
where C, N and E are careful, no-inbox and effort wins. Report the reading and
blind-limit margins separately. Wording and thresholds remain unchanged; this is
a measurement correction, not a target restatement or an economic round.
A regression demonstrates 34% blind wins within its own margin of the 33 1/3%
limit when reading gains exactly 100 points, while 40% fails. Reading's margin is
zero in both, so the old calculation incorrectly rejected the boundary case.

The first full source gate found two wording failures across 32 browser cases:
venue's “forecast” and an existing fitness “paid premium trial” option reached by
the changed simulation. Change those to “sales estimate” and “premium taster”.
No assertion or forbidden-word rule changes. Full gate rerun follows.


## Validated shared candidate

Full root gate attempt 2 passed: web 599, other projects 1,381, total 1,980 tests
passed and 30 skipped. Lint and all workspace typechecks passed. Logs:
state/step2-shared-full-tests-2.log and state/step2-shared-final-lint.log.
Seed generation writes 225 actual examples; every earlier-game row is unchanged.
The baseline T6 confidence audit reuses saved main results without new games and
leaves all four failures open (../proof/baseline-t6-confidence.json).

The tested candidate is committed before its required measurements. All target
passes, cancellation/loan follow-up decisions and the shared milestone remain
pending. Engine changes require all 13 main units, 1,000 paired seeds per policy;
this campaign includes neither wide seeds nor event tables nor the full report.
Source stays frozen while it runs. Runner: scratch/tuning2-shared-main.tmp.ts;
driver: state/shared1-main.sh; per-unit state: state/shared1/<scenario>-<mode>/.
Reporting metadata matches the normal CLI, including playtest, market build hours
and first-season week. Nine protected units must reproduce every complete result
against tuning2-speed; changed leisure units produce their full target tables.


## Shared round 1: Ausgesperrt complete

28 policies × 1,000 paired test seeds. Main only; no events or wide seeds.
Full table: ../measurements/shared1-ausgesperrt.md. Careful 40.1% ±3.0;
T10 passes (review-blind −30.8 ±2.9), T13 passes (naive 32.0%, gap −8.1 ±2.5).
T6 fails: reading +14.9 ±2.7, blind gain +9.9, own blind-limit margin ±2.0.
Later-loan gain improves from +16.5 to +9.9 ±2.4, taken in 84.5%; still fails.
T3 spread 37.7 ±6.8; companies 21.3%, locals 59.0%, tourists 40.3%.
Seasonal contracts +1.6 ±2.1 still fail the own-margin advantage criterion;
permanent +3.8 ±2.6 and part time +6.7 ±2.6 pass.

Passing-target regressions at this candidate: X1 quarterly rooms +11.7 ±2.5
rather than losing at least 3; T16 temptation borrowing −0.1 ±2.8 rather than
losing at least 3. Record both, investigate contributions and resolve before
accepting the final source. Do not hide them behind improvements elsewhere or
relax thresholds. Source remains frozen for the campaign; no further edits yet.
The parallel 273.9 s T12 entry is distinct from step 1's isolated measurements.


## Shared round 1: Fabriketage complete

29 policies × 1,000 paired test seeds, main only. Full table:
../measurements/shared1-fabriketage.md. Careful 33.8% ±2.9. T13 now passes:
naive 33.0%, gap −0.8 ±1.8. This is a result, not a claim that the requested
forward-calendar/cash-gap hint is already implemented; that remains step 3 work.
T15 improves from +40.6 to +11.0 ±2.0, later loan taken in 56.8%; still fails.

T3 fails: spread 55.8 ±5.6 (companies 59.6%, private 36.2%, weddings 3.8%).
T6 fails: reading +5.8 ±2.0, blind +5.5, blind-limit margin ±1.6. T11 still
has no established strict/flexible segment trade-off. T14 permanent −0.8 ±1.1,
seasonal 0 ±0, part time −1.9 ±1.7, all fail. No passing venue target regressed.
All four venue-specific targets remain passing. Further contributions and values
are needed; early settlement alone does not make long-lead weddings viable.


## Shared round 1: Schweißperle complete

30 policies × 1,000 paired test seeds, main only. Full table:
../measurements/shared1-schweissperle.md. Careful 47.8% ±3.1 (T1 at the limit).
T5 now passes: early 87.3%, year two 91.2%. T6 passes at the limit: reading
+17.8 ±2.7, blind gain +5.9, own limit excess −0.03 ±2.07. T10 −7.1 ±1.8 passes.

T3 spread 23.2 ±7.4 still fails (corporate 60.3%, yoga 37.1%, young 45.1%).
T14 permanent +0.4 ±1.4, seasonal −0.6 ±1.7 fail; part time +2.3 ±1.3 passes.
F3 reformers −23.2 ±3.2 remains open; F4 never matching −0.5 ±1.5, with 28,843
followers stopped in 930 runs, remains open. No passing target regressed.

The per-scenario ticket experiment does not fix T7 (−2.8 ±1.7). Restore the prior
ticket setting after the frozen campaigns, remeasure the affected main policies,
and record the price-curve limitation. Do not retain a failed fix or sweep prices.
No change is made while the common-source campaign is active.


## Shared round 1: Griffig complete

32 policies × 1,000 paired test seeds, main only. Full table:
../measurements/shared1-griffig.md. Careful 25.4% ±2.7 (T1 at the limit).
T5 passes at 89.9% early / 100% year two. T3 passes at the limit: spread
19.5 ±6.3 (committed 14.2%, families 27.7%, students 33.6%). Committed
climbers and first-wall economics still need the planned scenario investigation.
K2 passes at the limit: half setting −1.8 ±1.4, double −2.7 ±1.5.

T6 fails its reading condition: reading −1.9 ±1.8, blind gain −3.3. Reading the
new paid offers can be worse than taking defaults. The initial audit incorrectly
attributed this to capped repeat reach. A follow-up traced inbox `guests` effects
to `eventGuests`, then `sentRequests` in bookings: invitations add requests directly,
independent of the repeat-reach cap. Do not implement the proposed saturation
filter. Event-table contributions are needed to explain the losses.

T7 still fails at −1.5 ±1.4. The tested ticket setting does not fix either
fitness or climbing and is marked for reversion after source-frozen work.
Other open targets: T9 overstaffing +1.5 ±1.8; T11 no established policy split;
T14 only permanent has a proven signed-seed benefit; T15 +11.4 ±2.0;
K1 boulder 97.6%, rope 16.7%, both 0% of differing seeds; K3 all slots +1.1 ±0.9.
No previously passing complete climbing target regressed.

All four shared leisure matrices now total 119 policies / 119,000 complete
paired games. The required nine protected units continue on the same source.


## Complete shared1 main proof and next action

All 13 units completed on the same package-source SHA256. The nine protected
units reproduce every field of all 195,000 results exactly against tuning2-speed.
All four leisure matrices total 119,000 newly measured results. Manifest and
per-unit hashes: ../proof/shared1-main-manifest.json and shared1-*-comparison.json.
This is main only, 1,000 paired seeds per policy; no wide seeds or events.

Before event tables, restore the two ticket settings whose experiment did not fix
T7. Correct five fitness invitation references from nonexistent `yoga` to the actual
`yoga_crowd` segment. Focused tests validate every rewritten mailing's target and
preserve reader choices when repeat reach is full. These are corrections, not an
economic round. Collect event-table evidence against an identical-source careful
reference; no event tables have yet run.


## Follow-up correction and measurement scope

All 104 focused bot tests pass. The expanded invitation test checks guest segment
references in every event of all four leisure scenarios and preserves useful
invitations when repeat reach is full. Five fitness references were invalid:
three sales mailings and two preparation sessions. No reader filter remains.
Both ticket helpers return to their prior off-season calculations. No new value
or formula round is spent, and no target wording changes.

Only fitness/climbing main targets can move in this follow-up. Run their main
matrices on 1,000 paired test seeds against shared1; regenerate only the careful
escape/venue references needed for identical-source event-table reuse. The
previous 195,000-result protected proof remains applicable: this correction
changes only the two scenario-specific helpers, leisure tests and fitness data.
All four affected event tables remain required for the shared content changes.
No wide seeds and no full report are authorised at this point.

Seed regeneration completed with 224 examples; only fitness/climbing rows change.
All older-game rows remain identical. Full root tests run with no bot jobs active.

Correction gate passed: 599 web plus 1,380 other tests, 1,979 total and 30 skipped.
Lint and all typechecks pass. Logs: state/step2-botfix-full-tests.log and
state/step2-botfix-final-lint-2.log. Source e932b7d232ab590b5fbee2a9afd217c771fb4ab259ce08efc31f0e1d03cf1bd5.
