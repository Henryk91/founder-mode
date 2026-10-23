# Fitness value round two review

Sourcea6a1c8c. Main only:30 policies,1,000 paired `test` seeds each,eight workers.
1,109 seconds wall time,8,626 summed seconds of play. Raw table:
`schweissperle-main-round2.md`. Values2/2 exhausted;formula0/1 remains.
No event table,wide parts or full report has run.

Careful65.6%±2.9;top naive73.9%±2.7;no-tests0.7%±0.5. T1 and top-T2 fail.
Pass:T3,T4,T8–T10,T13,T15–T18,E1,F2,F5.
Fail:T5–T7,T12,T14,F1,F3,F4. T11 is inapplicable.

## Contributions

- All aggregator slots:+0.1±2.0 points against careful,none:-38.2±3.1.
  Platform-only:-36.3±3.3. The platform is useful,but quiet selection still has
  no demonstrated advantage over admitting everybody.
- Over/understaffing:-65.0±3.0/-42.1±3.1;review-blind:-3.9±1.8.
- Reading:+20.8±2.7 versus defaults,blind effort:+22.6. Fixed prices beat hints
  by3.8±1.9. These remain open;do not add an unbudgeted price/damage sweep.
- Permanent/seasonal/part-time versus flexible:+1.4±1.3/+0.0±1.3/+2.1±1.5.
  Seasonal does not establish the required benefit.
- Buying reformers21.8%,never68.2%;paired loss46.4±3.1,buy-only3,no-buy-only467,
  ties530. Waiting eight open weeks removed an initial-financing confound,but
  did not make the investment balanced. General enquiries currently accept an
  ordinary offer automatically when their sampled specialist preference cannot
  be met. Premium capacity mostly redirects existing ordinary demand rather
  than serving the latent specialist niche described by the spec.
- January:-17.2±2.5,recovery:-5.8±2.1. Never matching:+0.8±1.8 despite39,316
  followers stopping in978runs. The observed loss is real,but its win effect fails.
- Later loan:+2.4±1.8,taken in48.5%. Reckless ends owing100%,careful27.4%;
  own-loan-caused misses2.4%±0.9. Median interest/feesEUR10,346.

Careful median receiptsEUR368,353,net wealth−EUR25,109,and liquid wealthEUR48,334.
Viable-segment win rates:corporate70.0%,yoga60.4%,young66.1%. Median net wealth:
−EUR6,064/−EUR35,079/−EUR28,101. Further numeric tuning is not permitted now.
Early decision news71.6%,year two93.3%;slowest410.3seconds/1,000.

## Mechanic checks before the formula round

Nine complete diagnostics (three policies ontest0–2,no target estimates) show
careful opens an average4.77–4.90 of five platform slots. Member refusals are
0.4–1.0% of requests in these three careful runs. The allocator always reserves
members first,then platform visitors;the platform cannot displace those member
reservations. Existing class reviews divide actual attendance by a hard limit,
so refused member reservations do not directly lower the review score. Raw
counts:`waitlist-diagnostic.json`;runner backup is outside the repo.

## Sole formula round decision

Enable an optional shared member/platform booking queue with seeded ordering
and real capacity/failed-member records. Add class-review consequences for
actual denied member reservations,using the existing cancellation penalty.
Enable optional strict specialist preference for normal enquiries:when their
preferred offer is unavailable,they decline rather than always substituting.
The founder's finite spin/strength following retains its existing fallback and
still faces normal paid conversion. Ordinary customers are not given a
segment-wide premium must-have. Existing interview mentions remain the signal.

These changes address missing causal trade-offs,not another numeric round.
All prices,costs,demand ranges,niche shares and usage frequencies stay fixed.
New switches are absent in earlier games. Test purity,determinism,legacy-off
behaviour,shared capacity,real refusals and specialist/founding conversion.
After the formula main matrix,obey the plan's playability hard stop if required;
otherwise record remaining failed targets and finish the phase gate.
