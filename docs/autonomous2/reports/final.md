# Autonomous plan 2: final report

Plan 2 is complete. It added the specified tourism experiments, staff contracts, restaurant and hotel mechanics, bank loans, situational tourism inbox choices, tourism retuning, and Kantino-long funding terms.

## Final verification

- Full 1,000-run / 10,000-wide-seed reports were regenerated in `docs/balancing.md` for both 60-week scenarios, Kantino long mode, and all three tourism long modes.
- `pnpm seeds`, `pnpm lint`, and `pnpm test` pass.
- The 60-week Kantino and Zollstock content fingerprints and results remain protected.

## Open issues

- Tourism T14: no staff-contract kind clears its paired margin consistently.
- Hinterhof T2/T3: no-tests wins 20.6% and the spread is 15.9 points.
- Seeblick T6: reading +9.5 and blind effort +6.8.
- Gratwanderung school demand remains 9 to 12 peak groups, above the source spec's range, because lower tested ranges broke playability or fairness.
- Kantino long T20: burst is neutral and the steady hire trails the freelancer; T27 is at the limit; T32 founder value is 1.23x rather than 1.3x; T33 early raising is not sufficiently punished.

## For Henry to review

1. Tourism staff contracts remain a useful visible option but do not yet clear T14's strict paired test.
2. Kantino long funding trades path balance against the 1.3x founder-value target; the final 2,500 EUR founder salary keeps neither path dominant.
3. Gratwanderung's school volume is deliberately above the cited starting range to keep the school segment playable.
