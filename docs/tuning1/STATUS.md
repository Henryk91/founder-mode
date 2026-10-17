# Tuning run 1 status

## Current
Step: 6, wrap up
Last commit: 5777711 Tuning 1 step 5: older targets (Seeblick T6 diagnosed and open, Gratwanderung school demand researched, fingerprints for Hinterhof and Seeblick, step report) (tag tuning1-older)
Next action: Step 6.1: the one-process full report ran out of memory in its events part (nothing written); it is rerunning one scenario at a time (scratchpad full2.sh, as plan 4 did). Then seeds, BACKLOG, final report, tag.

## Checklist
- [x] Step 0: set up (tag tuning1-start)
- [x] Step 1: Leinen los (tag tuning1-gulet)
- [x] Step 2: Tiefgang (tag tuning1-dive)
- [x] Step 3: Rückenwind (tag tuning1-watersports)
- [x] Step 4: shared targets T14, T7, O3 (tag tuning1-shared)
- [x] Step 5: older scenario targets (tag tuning1-older)
- [ ] Step 6: wrap up (tag tuning1-complete)

## Open issues
- Kantino long 20 (burst +0.0, steady -2.4) and 32 (traction -5.3, value 1.20x): unchanged.
- Seeblick T6: blind effort +6.7 against reading +9.1; the high-hours answers are the right ones in the costliest events.
- Gratwanderung school demand: plausible by derived estimate, not established by a source.
- Leinen los T3: 68.0 points (cabin 79.4%, charters 44.7%, retreats 11.4%); retreat runs go bankrupt around week 40 with a lease and few weeks sailed. Options: retreats pay their balance before sailing; a shoulder-season lease; retreat demand as its own share.
- Leinen los G1: buying best in 6.3% of differing seeds. Owned crew at 3,000 a week passes (21.7%) but the no-tests bot wins 12.9%; revisit if a cost for unasked-for products lands in step 2.
- Leinen los G3: never holding ties the careful bot (-0.3 ±0.9): with requests ahead charters book the peak first. Options: restate G3 (holding every peak week is the trap); cabin guests booking further ahead.
- Leinen los E1: 48.9% of wins but median week 48; no month count gives both. Options: closed months do not break the streak; restate the week rule for runs whose first season ends after week 52.
- Tiefgang T3: 18.9 points (clubs 16.9%) after three value rounds. Options: club weeks priced per group; clubs needing the boat less.
- Tiefgang T6: reading +2.7 ±1.6 (at the limit), blind effort +2.5 (allowed about 0.9). No single event behind it.
- Rückenwind W2: always -0.9 ±1.2 (at the limit), never -0.3 ±1.5 (fails), after ownDemand. Options: a cheaper trip day for the instructor (a course place costs a whole shift); kite seekers as a larger, separate segment.
- Rückenwind T7: -0.7 ±1.7 after flat off-season prices; its starting prices already sit at the market level. T14 passes (fijos discontinuos).
- T14 open in Gratwanderung (permanent -20.6, part time -15.2), Hinterhof and Seeblick (no effect beyond margins). Options: restate T14 for businesses whose work pattern suits only some kinds.
- Leinen los T7: -0.2 ±1.7; flat off-season prices give +3.0 but careful 48.2% (T1).

## For Henry to review (non-blocking)
- Step 5: AUTONOMOUS restatement of Kantino long 33 (against bootstrap); target 11 judged with margins; Hinterhof upkeep; Seeblick strict conversions (decisions, tuning 1 step 5).
- Step 4: AUTONOMOUS contracts that sleep (fijo discontinuo) in Rückenwind; careful bot prices the off season at hint level in Hinterhof, Seeblick, Rückenwind; O3 restated (decisions, tuning 1 step 4).
- Step 3: AUTONOMOUS engine option `ownDemand` (guests who come for one product alone); the tender reader always bids as before (decisions, tuning 1 step 3).
- Step 2: AUTONOMOUS L2 judged by section 1.5; Tiefgang products cost upkeep when unbooked (decisions, tuning 1 step 2).
- Step 1: AUTONOMOUS restatement: T4 for runs that start out of season; E1 months raised to 10, not lowered (decisions, tuning 1 step 1).
- Step 1: AUTONOMOUS restatement: Leinen los G4 as a trap with a post-mortem lesson (decisions, tuning 1 step 1).
- Step 1: AUTONOMOUS Leinen los starts in October, with a new engine option `requestsAhead`; demand and the lease back to the spec values (decisions, tuning 1 step 1).
- Step 1: AUTONOMOUS restatement: G1, G2, D2, D3 compare money net of the boat (decisions, tuning 1 step 1).
- Step 1: AUTONOMOUS careful bot leases the gulet when expected weeks cover the lease and the year's costs (decisions, tuning 1 step 1).

## Stopped
