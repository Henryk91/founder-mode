# Fabriketage implementation draft

Prepared on branch plan5-venue-work in an isolated worktree while the frozen step 2
source finishes its event table/full tests. Merge only after the step 2 gate passes.
No scenario has been registered and no venue measurement has run.

## Targets

T1–T18 and E1 apply: paid event units, market discovery, noisy budgets, booking
channels, cancellations, reviews, founder hours, three contract kinds and optional
borrowing all have meaningful comparisons. T4 starts at actual opening. V1–V4 apply
unchanged. Office targets T19–T22 remain outside scope, as in Ausgesperrt.

## Files and gaps

- Content schema; engine types, leisure, bookings, product, market/fit and asset
  integration as needed; schema docs in every type-change commit. New behaviour is
  off unless explicit venue YAML enables it. No defaults or PRNG draws in earlier games.
- Small fixture tests for existing forward sales, closure, upgrades/turnaround charges,
  hired versus bought equipment, permit refusal/refund, noise restriction and
  ancillary service receipts; purity/determinism/replay cases.
- Later content: about/scenario/features, four intro cards, at least 40 events,
 150 interview quotes, same-building stage 2 offer, source notes. Native SVG scenes.
- Later bots/report: observable hold conversion, calendar mix, late insulation and
  named roof trap; V1–V4 comparisons. No hidden quality or demand shortcuts.
- Later UI: existing notebook components, labels/Help and public view only. Hold
  policy/calendar, actual complaints/restriction dates, permit progress/refunds,
  furniture costs and real ancillary receipts. No displayed chances.

## Explicit adaptations

- A booking unit is one event. Company/wedding/private base demand is therefore
  also event requests; the escape room's multiple room-games per team do not carry over.
- The lower floor remains in this building. For this first pass it is conference
  breakout/briefing space, not a second independently bookable 120-person main hall.
  It must have a useful company-work benefit with a real monthly cost; record the
  separate 60-person booking limitation in the spec/backlog and measure whether the
  option is ever worth taking. Do not claim two simultaneous events are implemented.
- Catering commission uses explicitly estimated catering-package values with 10%
  paid to the venue on actual service. Caterer quality is represented by authored
  service incidents/reviews, not a fictional hidden supplier-selection roster.
- Late permission is 'Agreed late-event conditions', a simplified operating/noise
  review. The EUR1500/eight-week wait and complaint thresholds are gameplay estimates,
  not a claim about a universal Munich late licence. Primary city sources are in
  /tmp/plan5-research-notes.md, 21 October entry; incorporate direct links in the spec.
- Furniture purchase versus per-event hire must be real. Reuse assets if feasible,
  but fix their missing leisure capacity gating and do not require the purchase
  feature when hired furniture supplies the same must-have.
- Existing fitOf already recognises prepared readyWeek builds, and sells() checks
  readiness on the requested date. Reuse/test this for forward deposits; no new
  forward-sales switch is needed. An unstarted design cannot promise reservations.
- Wedding/private balance timing differs from generic on-service settlement. Add
  explicit early-balance timing with correct refunds, or label any retained timing
  adaptation plainly. Do not claim four-week prepayment without implementing it.

## Proof and budgets

After shared changes, all nine protected games plus Ausgesperrt main on 1,000 test
seeds must match their saved raw baselines exactly apart from timings. Escape hash
is ea908900d9f19996, engine 0.14.0. Baseline/ausgesperrt-long.md is unannotated for
comparison; tuning/ausgesperrt-values-2.md is the annotated target report.

Venue tuning: up to two value rounds then one formula allowance per failing target;
zero used. First sensible bots, then contributions. Main/affected parts only, 1,000
seeds. Event table once at the end. Full report exactly once in step 6, never before.
