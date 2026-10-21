# Schweißperle isolated preparation

Draft only. Do not claim implementation or register the scenario before the venue
source/tests are frozen. Any isolated preparation must merge only after step3's gate.

Touch list when step4 starts:content/schema.ts;engine/types.ts and systems/leisure.ts,
bookings.ts,experiments.ts (only where needed);schema.md;fixture tests;then scenario,
bots,labels/components/browser tests and docs. No old behaviour or new RNG calls
without an explicit optional leisure switch.

Price units:membership offers already convert packs and intros to monthly units.
Add optional monthly-WTP basis,with per-segment visitsPerWeek*weeksPerMonth as the
booking/drop-in equivalence. Separate base enquiry demand from drop-in conversion:
joining performs the membership price test once;direct requests perform their own
normalised unit-price test once. Apply consistent units to service-value reviews.
Do not multiply a monthly membership price again in churn. No old rounding/RNG
changes for unconfigured games.

Offer usability:when enabled,eligible offers need overlap between preferred slot
shares and allowed slots. Choose only accessible offers;do not turn an evening-only
customer into an early user. Visits continue to honour the actual selected offer.
Optional offer product restrictions are needed for paid premium reformer access.
Enforce at joining,intro migration and visit routing,not just the control screen.

Room conversion:configured feature may replace studio classPlaces18 with8 across
mat-room classes;reformer also has8. Both stay in the same physical room timetable
budget. No free third room. Stage2 is adjoining same-building shop space only.

Initial following:30–60 actual first-month members is distinct from hidden
instructor-departure shares. A content-gated opening cohort must join valid paid
offers and consume class capacity;no unearned cash or silent members before opening.
Use public actual joins and payments to explain it.

Teacher workload:existing founder-energy tired flag is not the stated per-instructor
12-class limit. If individual people are not modelled,define the aggregation
explicitly and avoid applying a12-class penalty to a role covered by several people.
Paid freelance shifts are per class;contract/founder class limits need honest units.

Premium niche:must vary per run,affect actual paid premium enrolment and be discoverable
from observed tests/requests. Do not infer niche truth from a bot seed or make every
unlimited member eligible for free premium classes. Candidate model requires a
content-defined hidden affinity with observable enquiry/trial outputs;decide/test
before writing the scenario's final premium promise.

Reuse:classPlaces/classHours/room timetable limits;pack owedCents;52-week terms;
founderHours qualification by role;aggregator visit caps/leaving notice;instructor
following/departure counters. Show only observable facts in PlayerView/UI.

Required meaningful fixtures:monthly-vs-visit units;no double join price curve;
evening-only rejects offpeak;premium members route only allowed products;conversion
18to8 preserves room hours;founding cohort pays and consumes capacity;departure
retains annual obligations/packs;qualified founder only spin/strength;determinism,
purity,replay. Full protected+earlier-leisure main1000 test proof after shared changes.

## Targets and adaptations to implement

T1–T10,T12–T18,E1 and F1–F5 apply. T4 starts at opening;T8 compares real
aggregator dependence. T11's strict/flexible cancellation comparison does not
apply to membership notice/annual-term offers:rewarding an irrelevant booking
policy would measure a label instead of the contractual choice. Report T11 as
not applicable,with offer/term trade-offs measured in actual membership flows.
Office targets T19–T22 remain outside scope.

Use fictional Turnsaldo because Sportflat is an existing real-world name.
Showers belong to the paid fit-out;the zero-hour standalone feature draft must
not be integrated. Corporate membership units are paid employees,with company
invoices aggregated by segment;do not call one employee an entire firm.
Published studio/reformer comparisons and all unverified cost estimates must
be clearly distinguished in scenario-fitness.md section15.

Merge only after the frozen venue's phase gate,protected proof,event table and
plan5-venue milestone. Preserve both local branches;no rewrite or push.
