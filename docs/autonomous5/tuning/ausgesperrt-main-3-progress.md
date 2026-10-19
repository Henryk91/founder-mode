# Ausgesperrt main-3 progress

**Main only, 1,000 seeds per strategy, prefix `test`.** The complete measurement
is still running; this records completed strategy counts from its progress log,
not a final target table. Each row has its individual 95% rate margin. Differences
need the final paired margins. No value/formula tuning, event table or full report
has run. Engine 0.14.0; bots retain unfinished rooms and use the corrected loan policy.

| Strategy | Wins / 1,000 | Rate | Margin |
|---|---:|---:|---:|
| leisure_one_room | 8 | 0.8% | ±0.6 |
| leisure_quarterly_rooms | 675 | 67.5% | ±2.9 |
| leisure_theme_blind | 445 | 44.5% | ±3.1 |
| leisure_no_daytime | 366 | 36.6% | ±3.0 |
| leisure_vr_first_year | 461 | 46.1% | ±3.1 |
| leisure_no_later_loan | 488 | 48.8% | ±3.1 |
| tourism_careful | 423 | 42.3% | ±3.1 |
| tourism_platform_only | 356 | 35.6% | ±3.0 |
| tourism_overstaffing | 27 | 2.7% | ±1.0 |
| tourism_understaffing | 200 | 20.0% | ±2.5 |

The careful rate passes T1’s 25–45% band. Quarterly rooms exceed the 60% T2 limit.
The remaining complete targets and their paired comparisons are pending in
`ausgesperrt-main-3.md`. Timings overlap full tests and protected runs and are not
an uncontended runtime measurement. The raw log is `/tmp/plan5-ausgesperrt-main-3.log`.
