# Plan 5, step 1: shared indoor leisure engine

## Built

All additions require `bookings.leisure`; weather, day conditions and indoor leisure are
mutually exclusive. Earlier content receives no new defaults or random draws. Engine
version remains 0.14.0.

| Requirement | Implementation and verification |
|---|---|
| Slots and crowding | Named weekly slots, hard caps at request and service, optional comfort caps, load words and observed rejected demand. Tests cover a full preferred slot even when another has space. |
| Memberships | Independent offers and prices, monthly notice, annual terms, off-peak access, prepaid visit liabilities and intro conversion. Tests cover January cohorts, unused pack expiry and inactive annual members who still owe fees. |
| Aggregator | Separate contract and access slots, exit notice, served check-ins only, per-user calendar-month caps and membership substitution including corporate plans. Tests cover closing all slots, rejected visits and delayed departure. |
| Freshness | Time/use wear, finite local audiences reserved across future bookings, refresh costs and closures, cumulative setting hours and optional review penalties. Tests cover tourists outside the local pool and reopening bookings. |
| Date holds | Free, fee and no-hold policies; capacity reservation, conversion, credited fees and late releases. Calendar separates actual bookings and holds. |
| Construction | Initial build choice in week one, elapsed build time, closed areas, observed opening week, one-time payment and bank reimbursement for bridged construction. |
| Category | Leisure, order 3. |
| View and post-mortem | Observable slot loads, member cohorts, platform receipts and stated departure reasons, theme life, builds, holds and factual indoor course totals. No hidden pool sizes, churn probabilities or comfort thresholds. UI presentation follows in scenario steps. |
| Determinism and saves | Action replay, input immutability and nested action copies tested using a small fixture. Protected content/save fingerprints are unchanged. |

Existing course follow-ups and returning graduates now reserve indoor slots. Individual
climbing qualifications and course-to-membership conversion will be checked against the
climbing spec in step 5, under the plan's engine-gap rule.

## Checks

`pnpm lint` passed, including all four package typechecks. `pnpm test` passed all
77 files: **1,430 passed, 18 skipped**, including Chromium and WebKit browser checks.
The fixture has 34 leisure tests; the course suite has 18 tests. All nine protected
content fingerprints match the immutable step 0 snapshot.

## Protected outcomes

The required comparison is **main only, 1,000 seeds per strategy, prefix `test`**,
one scenario per process, at most two concurrent processes with three workers each.
No event tables, wide parts or full report ran. Snapshots are in `../protected-step1/`.

The comparison helper strips strategy timings and the timing target by its wording,
covering standard target 5, Kantino long target 30 and tourism T12. It retains the
engine version and every outcome row. The first two scheduler comparisons predated
that helper correction and flagged only timings; the saved reports compare cleanly
without rerunning simulations.

All nine comparisons pass exactly apart from timings. Existing target failures in the
protected games remain unchanged and outside this plan's tuning scope.

| Game | Main strategies | Wall time | Outcome comparison |
|---|---|---|---|
| Kantino, standard | 11 | 161 s | Identical |
| Zollstock, standard | 11 | 160 s | Identical |
| Kantino, long | 24 | 236 s | Identical |
| Gratwanderung, long | 19 | 184 s | Identical |
| Hinterhof, long | 22 | 285 s | Identical |
| Seeblick, long | 22 | 218 s | Identical |
| Rückenwind, long | 30 | 686 s | Identical |
| Tiefgang, long | 27 | 563 s | Identical |
| Leinen los, long | 29 | 330 s | Identical |

## Decisions and open work

Decisions are recorded under “Plan 5, step 1” in `docs/decisions.md`: four-week billing
with 52-week annual terms, fixed agreed contract prices, lead instructors per role,
paid-at-start construction, cumulative resets and a twelve-week slot calendar. No
new scenario target has been measured yet. The full report remains reserved for step 6.

Milestone: `plan5-engine`.
