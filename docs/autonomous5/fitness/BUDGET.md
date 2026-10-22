# Schweißperle tuning budget

Content is registered in the isolated fitness branch;bots and UI are implemented. Initial values are unmeasured. No fitness event table or full report has run. Values0/2,formula0/1 for every applicable target.

T1–T10,T12–T18,E1,F1–F5 apply;T4 starts at opening,T8 uses the aggregator.
T11 does not measure membership notice/annual terms and is not applicable.
First sensible bots,then contributions,then values. Main/affected parts only,
1,000 test seeds;event table once at the end. Full report only step6,once.

Initial measurement queued:schweissperle long,main only,1,000 test seeds,two workers. This is the new-scenario measurement allowed by CLAUDE.md,not the full report. Keep values0/2 and formula0/1 until contributions are reviewed.

## Initial results still in progress

Careful864/1,000 wins(86.4%±2.1) in the original main matrix. The class-history
bookkeeping check repeats careful only on the same1,000 test seeds:864 wins,
T3spread9.6±5.1,T4two weeks from opening,E1medianweek60. Recorded play time
371.3s versus628.9s before compaction;both ran under concurrent load,so this is
not a controlled speedup claim. T12 still fails.21 complete diagnostics across
seven policies have exact RunResult and public-view trace matches.

The original all-policy matrix remains running;do not tune from provisional
counts. Values0/2,formula0/1. No fitness event table or full report.

## Resumed after user-requested process stop

The original matrix was interrupted before the report writer ran;its thirteen completed policies survive as summary counts only. Restart main only,1,000 test seeds,two workers,with durable task results under the path recorded in checkpoint-location.txt. This repeats lost detailed results out of necessity,not to reconfirm them. No tuning budget spent. Ten protected comparisons are preserved;only interrupted Ausgesperrt is resumed. Full report still never run.

## Initial matrix complete

30policies,main only,1,000test seeds. Initial review records all contributions
before any value change. Careful86.4%,top95.7%;fix bot pricing/slot/repair policies
first. Values0/2,formula0/1. Current-week archive timing:careful301s/1,000,
864wins unchanged. T12still fails. Protected-step4:all eleven main reports match.
