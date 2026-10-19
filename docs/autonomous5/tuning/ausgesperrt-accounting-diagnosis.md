# Ausgesperrt accounting diagnosis

The second initial measurement requested main only, 1,000 seeds per strategy,
prefix `test`, three workers. Nine strategies completed before inspection found
that cancelled reservations retained advance deposits. Its remaining simulations
were deliberately stopped, rather than finishing a report of known invalid economics.
No event table or full report ran. These are diagnostic win counts, not final targets.

| Strategy | Wins / 1,000 |
|---|---:|
| One room | 54 |
| Quarterly rooms | 294 |
| Theme blind | 146 |
| No daytime | 218 |
| VR first year | 332 |
| Careful | 147 |
| Platform only | 93 |
| Overstaffing | 5 |
| Understaffing | 857 |

A `test-0` trace confirmed the cancellation accounting gap. Leisure now returns
advances for company cancellations and flexible guest cancellations; strict guest
cancellations retain the agreed payment. Four settlement cases also assert purity.
The repair is gated to leisure. No scenario values were changed.

Bot review found two planning gaps: capacity expansion waited only for freshness,
and an accepted startup loan remained a false refusal ceiling on later borrowing.
The careful bot now uses three of eight weeks of observed packing/refusals and
clears that ceiling on accepting an offer. Tests cover both policies. In the traced
careful seed the two accepted loans total EUR50,000 and two rooms serve 3,357 games;
the understaffing comparison serves 1,953 and cancels 1,638. These single-seed traces
are diagnosis, not balance evidence.

The interrupted log is `/tmp/plan5-ausgesperrt-main-1.log`; verified task-owned
processes received SIGTERM. A six-strategy measurement launched after the refund
repair isolates the money change, but predates the second-loan bot fix. Label it
accordingly. The next complete main measurement must include that bot fix.

No scenario-value or formula tuning rounds have been consumed. Correctness repairs
and sensible bot play precede tuning under plan section 1.7.
