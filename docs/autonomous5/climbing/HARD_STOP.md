# Plan5 hard stop:established WebKit heading fit

Stopped23October2026,18:45UTC under AUTONOMOUS_PLAN_5.md section1.2.1:
tests cannot be made wholly green after three honest attempts at the same
established-heading font/fit failure family. No more fixes,bot runs or tuning were
started after reaching the limit;only the mandated stop bookkeeping continued. No playability or player-data stop applies.

## Attempts

| Final-source attempt | Test revision | Result | Remaining failure |
|---|---|---|---|
|1|27756b3:font-ready promise plus two frames|1,960pass,2fail,30skip|Gratwanderung WebKit390/430:header cut on every tab|
|2|c9dbf3f:actual face plus repeated exact-metric stability|1,961pass,1fail,30skip|Rückenwind WebKit390:added stability wait times out|
|3|dd789c1:one actual face load,then original fit criteria|1,961pass,1fail,30skip|Rückenwind WebKit375:fits remains false after15seconds|

Full logs:/Users/henry/Documents/DevProjects/Personal/founder-mode-plan5-state/plan5-climbing-final-full-tests.log,
/Users/henry/Documents/DevProjects/Personal/founder-mode-plan5-state/plan5-climbing-final-full-tests-retry.log,
/Users/henry/Documents/DevProjects/Personal/founder-mode-plan5-state/plan5-climbing-final-full-tests-final.log.
Committed failure excerpts:TEST_FAILURES.txt.

The focused final established suite passes56/56cases;the last full suite
passes55/56ofthose cases and107other test files. Lint/typechecks pass.
No original per-tab cut,one-line,minimum12px or axe assertion was removed.
No product geometry,engine,bot or scenario value changed in these attempts.

A progress update incorrectly said all56cases also passed inside the full
suite after inspecting successful individual-case output. That claim was
premature and is corrected here:only the focused56-case run was wholly green.
The complete full-suite summary governs the gate.

## Preserved work and stopped processes

Climbing outcome source27756b3 is frozen:main only,32policies×1,000paired test
seeds,careful30.8%±2.9,top39.0%,no-tests0%. Values2/2 and formula1/1 are
exhausted. Final seeds225rows,only Griffig changed;all seed replay cases pass.
All12earlier-game main comparisons are identical apart from timings.

The first/only climbing event campaign was interrupted at the hard stop.
Its exact-source careful baseline was reused;no baseline games were replayed.
Preserved:32complete main task checkpoints and
48complete forced-answer checkpoints,containing
40,026actually played forced-answer games. Every JSON file parses,
its seeds are unique,and all32main tasks contain1,000results. File hashes/counts
are committed in EVENT_CHECKPOINTS.json. In-flight incomplete tasks were stopped;
there is no completed griffig-events.md and no final event-table claim.

Cache:/Users/henry/Documents/DevProjects/Personal/founder-mode-plan5-state/plan5-climbing-formula-checkpoints-27756b3.
Runner backup:/Users/henry/Documents/DevProjects/Personal/founder-mode-plan5-state/plan5-climbing-events-runner.ts.
Event log:/Users/henry/Documents/DevProjects/Personal/founder-mode-plan5-state/plan5-climbing-events.log.
The identified event driver and its worker/service descendants were terminated;
all recorded PIDs are confirmed gone. No run-owned background job remains.

Climbing worktree:/Users/henry/Documents/DevProjects/Personal/founder-mode-plan5-climbing,
branch plan5-climbing-work. No climbing milestone/tag/merge was made.
Fitness remains complete at plan5-fitness,merged into main. Step6 and the full
bot report have NEVER started. No push.

## Next investigation and resumption options

1. Instrument TopBar.useFitOneLine in WebKit with delayed established CSS/font
   arrival,recording glyph/client/scroll widths and ResizeObserver callbacks.
   The full-load case may expose an actual fitting/settling defect that a test
   readiness wait cannot repair. Keep the real cut/minimum-size assertions.
2. Isolate concurrent-load effects using the same full suite with bot workers
   stopped. A focused pass alone is not sufficient to declare the gate green.
3. Once validation is resolved,resume this SAME interrupted event campaign with
   its exact source/cache and only missing tasks. Do not start a fresh event
   table or rerun completed tasks for confirmation. Restore its temporary entry
   from the backup and use the original command:

```sh
cp /Users/henry/Documents/DevProjects/Personal/founder-mode-plan5-state/plan5-climbing-events-runner.ts packages/bots/src/plan5-climbing-events.ts
pnpm --filter @founder-mode/bots exec vite-node src/plan5-climbing-events.ts -- --scenario griffig --mode long --parts events --runs 1000 --seed-prefix test --jobs 8 --out docs/autonomous5/climbing/griffig-events.md
```

Only after the full gate should the climbing report/tag/merge and step6continue.
Read-only step6preparation and the34-target inventory are listed in STATUS;
none is a completed tuning round or full report.
