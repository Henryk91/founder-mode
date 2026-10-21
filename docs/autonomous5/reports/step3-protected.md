# Step3 protected-game proof

All ten required comparisons pass:main only,1,000 test seeds per strategy,one
scenario per process,two processes concurrently,one worker each. Both standard
60-week games and all seven older long games match their step0 raw baselines
exactly apart from timings. Ausgesperrt matches its frozen step2 baseline.
The comparison strips per-strategy/main timing and T12 timing judgement only;
no outcomes or other target rows are removed.

| Game | Recorded main timing | Comparison |
|---|---|---|
| ausgesperrt-long | 28 strategy runs, 2071 s (2071 s of play over 1 processes) | identical |
| gratwanderung-long | 19 strategy runs, 287 s (287 s of play over 1 processes) | identical |
| hinterhof-long | 22 strategy runs, 433 s (433 s of play over 1 processes) | identical |
| kantino-long | 24 strategy runs, 343 s (342 s of play over 1 processes) | identical |
| kantino-standard | 11 strategy runs, 58 s (58 s of play over 1 processes) | identical |
| leinenlos-long | 29 strategy runs, 849 s (849 s of play over 1 processes) | identical |
| rueckenwind-long | 30 strategy runs, 1072 s (1071 s of play over 1 processes) | identical |
| seeblick-long | 22 strategy runs, 276 s (276 s of play over 1 processes) | identical |
| tiefgang-long | 27 strategy runs, 790 s (790 s of play over 1 processes) | identical |
| zollstock-standard | 11 strategy runs, 57 s (56 s of play over 1 processes) | identical |

Raw reports,compare output and fingerprints:../protected-step3/. All nine
older content fingerprints match exactly;Ausgesperrt stays ea908900d9f19996.
Engine version stays0.14.0. Logs are preserved outside the repo under
/tmp/plan5-protected-step3-logs;controller:/tmp/plan5-protected-step3.log.

The earliest four workers loaded before the final equipment-preparation repair.
That repair requires leisure with asset-backed offer requirements;none of the
nine older games or Ausgesperrt can enter it. Non-leisure prerequisites retain
the old path and are covered by the fixture checks. The venue-only reader/T15
changes also cannot apply. Retain the matching proof rather than rerunning
unchanged games to reconfirm it. Later source-isolated fitness additions need
their own protected/earlier-leisure comparison at step4's gate.

No event tables or10,000-seed unchanged-proof runs were used. Venue's required
once-only event table is independent and still running. Full report never run.
