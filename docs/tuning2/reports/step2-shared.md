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
