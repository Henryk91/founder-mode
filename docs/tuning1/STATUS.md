# Tuning run 1 status

## Current
Step: 2, Tiefgang
Last commit: dff0dc7 Tuning 1 step 1.7-1.9: Leinen los budget rounds (T11 passes with shorter charter leads; T3, G1, G3 open), T4 restated for out-of-season starts, targets that do not apply, step report (tag tuning1-gulet)
Next action: Step 2.1-2.2, Tiefgang: D2 passes and D3 fails by 1,026 EUR with the net measurement; find why naive careful beats careful (ablate channels, reader rules, loan knowledge).

## Checklist
- [x] Step 0: set up (tag tuning1-start)
- [x] Step 1: Leinen los (tag tuning1-gulet)
- [ ] Step 2: Tiefgang (tag tuning1-dive)
- [ ] Step 3: Rückenwind (tag tuning1-watersports)
- [ ] Step 4: shared targets T14, T7, O3 (tag tuning1-shared)
- [ ] Step 5: older scenario targets (tag tuning1-older)
- [ ] Step 6: wrap up (tag tuning1-complete)

## Open issues
- Leinen los T3: 68.0 points (cabin 79.4%, charters 44.7%, retreats 11.4%); retreat runs go bankrupt around week 40 with a lease and few weeks sailed. Options: retreats pay their balance before sailing; a shoulder-season lease; retreat demand as its own share.
- Leinen los G1: buying best in 6.3% of differing seeds. Owned crew at 3,000 a week passes (21.7%) but the no-tests bot wins 12.9%; revisit if a cost for unasked-for products lands in step 2.
- Leinen los G3: never holding ties the careful bot (-0.3 ±0.9): with requests ahead charters book the peak first. Options: restate G3 (holding every peak week is the trap); cabin guests booking further ahead.
- Leinen los E1: 48.9% of wins but median week 48; no month count gives both. Options: closed months do not break the streak; restate the week rule for runs whose first season ends after week 52.
- Leinen los T7: -0.2 ±1.7 (was +2.1), to step 4.

## For Henry to review (non-blocking)
- Step 1: AUTONOMOUS restatement: T4 for runs that start out of season; E1 months raised to 10, not lowered (decisions, tuning 1 step 1).
- Step 1: AUTONOMOUS restatement: Leinen los G4 as a trap with a post-mortem lesson (decisions, tuning 1 step 1).
- Step 1: AUTONOMOUS Leinen los starts in October, with a new engine option `requestsAhead`; demand and the lease back to the spec values (decisions, tuning 1 step 1).
- Step 1: AUTONOMOUS restatement: G1, G2, D2, D3 compare money net of the boat (decisions, tuning 1 step 1).
- Step 1: AUTONOMOUS careful bot leases the gulet when expected weeks cover the lease and the year's costs (decisions, tuning 1 step 1).

## Stopped
