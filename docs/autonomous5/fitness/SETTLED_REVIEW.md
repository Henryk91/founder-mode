# Fitness settled baseline review

Source: **85d9b2b**, after sensible pricing/slot/review bots and explicit direct
aggregator settlement. Main only: 30 policies, 1,000 paired `test` seeds each,
four workers. 2,294 seconds wall time, 9,160 summed seconds of play. Full target
table: `schweissperle-main-settled.md`. No event table, wide parts or full report.
Value rounds **0/2**, formula rounds **0/1** at this baseline.

Careful wins 93.7% ±1.5; never-reformer tops the table at 99.0% ±0.6.
No-tests wins 27.4% ±2.8. T1/T2 require substantial difficulty correction.
T3, T4, T8, T9, T13, T15–T18 and E1 pass; T9 understaffing and F2 pass at the
limit. T5–T7, T10, T12, T14, F1 and F3–F5 fail. T11 is inapplicable.

## Contributions before values

- Quiet aggregator versus all slots: all +1.1 ±1.3 points; versus none: none
  +0.6 ±1.7. Neither difference establishes an advantage. The current migration
  and churn formula depends on joining, regardless of open-slot overlap. Do not
  change that formula before using the allowed value rounds.
- Platform-only loses 5.4 ±2.2 points, so T8 now passes.
- Buying reformers wins 61.0% versus 99.0% without them, a paired loss of
  38.0 ±3.0 points. Buy-only wins: zero; no-buy-only: 380. The premium pack uses
  the segment's general 2.5–3 weekly visits, making its monthly price basis
  EUR320–384. A once-weekly premium customer pays EUR128/month equivalent.
- Reading beats defaults by 11.0 ±2.1 points, but blind effort gains 11.5 points.
  Blanket maintenance is cheap and usually shares the beneficial action. Check
  realistic call-out costs while the studio is brought closer to break-even.
- Fixed prices beat careful by 0.8 ±1.1 points, an insignificant difference.
  Small budget quotes currently round to EUR500 even for EUR60–160 budgets.
  This forces most hint-based fees to their upper bound. Correct the YAML step
  as part of the first value round, rather than starting another baseline.
- Ignoring reviews loses 0.7 ±1.2 points; never matching gains 0.4 ±1.0 despite
  91,940 followers stopping in 998 runs; early recovery gains 0.7 ±1.2. None
  establishes the intended outcome effect at this difficulty.
- Permanent, seasonal and part-time contracts versus flexible shifts:
  -0.2 ±0.7, -0.7 ±0.8 and +0.2 ±0.7 points. No demonstrated benefit yet.
- January expansion loses 2.0 ±1.3 points, at the target limit.
- Careful median net wealth is EUR253,107 after two years. Median customer
  receipts are EUR690,973, with a broad distribution. There is ample headroom
  before extra spending threatens the win condition.

## Pacing and runtime

Three complete careful diagnostics (`test-0` to `test-2`) locate recurring
opening decision gaps in weeks8–12, after the early preparation cards run out
and before opening. Early decision news is 71.8%; year two is 94.1%. Keep the
85% target; do not fill the gap with routine updates relabelled as decisions.

Slowest policy: 404.4 seconds per1,000. A phase-local capacity-cache candidate
preserved21 complete results/public traces and every result on1,000 careful
seeds, but its353 seconds versus348 under different loads demonstrated no
speed gain. It was discarded. Existing compaction remains; T12 still fails.

## First value round scope

Halve the reachable enquiry ranges, retaining believable published prices and
fixed Munich cost estimates. Correct small-budget rounding to EUR10 and set
premium pack use to one visit per week, openly displayed in its terms. Price
three maintenance call-outs as explicit estimates: urgent showers EUR650,
extra deep cleaning EUR300 and the bike service block EUR480, versus EUR120
for each initially. These make unnecessary blanket repairs an actual expense.

Measure the affected main part again on1,000 paired seeds. Do not change the
aggregator formula, contract tariffs, January rule or recovery-room costs in
this round. The demand reduction may make their existing trade-offs matter;
review their paired contributions before the next change. No tuning result is
claimed until that matrix finishes.
