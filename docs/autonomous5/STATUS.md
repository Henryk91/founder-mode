# Autonomous run 5 status

## Current

Step: 5 complete (report f1559b2, tag plan5-climbing, merged into main). Step 6 next.
Last commit: the merge of plan5-climbing-work into main.
Next action: step 6 as changed by Henry. Copy every open target, with its closest result and options, to docs/BACKLOG.md; then the full report once (one scenario per process), pnpm seeds, docs, the final report and the tag plan5-complete.

Henry's resume instructions. Rerun the full suite on the climbing branch with no other jobs running.

Henry's resume instructions override the plan where they differ:

1. Secure the state outside /tmp (done).
2. Never run the test suite or any browser test while bot or event jobs are running.
3. Fix the WebKit heading-fit failure: (a) rerun the full suite with nothing else running; (b) if it still fails, fix the cause in TopBar.tsx, not in the test.
4. Resume the same interrupted climbing event campaign (missing tasks only), finish the climbing report, tag plan5-climbing, merge into main.
5. Step 6 changed: do not revisit open targets. Copy them, with closest results and options, to docs/BACKLOG.md. Then the full report once (one scenario per process), pnpm seeds, docs, the final report and the tag plan5-complete.

## Locations

- Climbing worktree: /Users/henry/Documents/DevProjects/Personal/founder-mode-plan5-climbing, branch plan5-climbing-work. Main has not received the climbing code.
- State folder: /Users/henry/Documents/DevProjects/Personal/founder-mode-plan5-state
  - Event checkpoint cache: plan5-climbing-formula-checkpoints-27756b3 (80 files, identical to the /tmp original).
  - Event runner backup: plan5-climbing-events-runner.ts (checkpointRoot now points at the cache above). plan5-climbing-formula-runner.ts is the identical formula-round copy.
  - Event log of the interrupted campaign: plan5-climbing-events.log.
  - Full-suite logs of the three earlier attempts: plan5-climbing-final-full-tests.log, -retry.log, -final.log.
  - Step 6 notes: plan5-step6-docs-notes.md, plan5-step6-full-notes.md, plan5-step6-issue-candidates.md, plan5-step6-open-issue-inventory.json, plan5-step6-inbox-diagnostic.ts and .log.

## Active jobs

None.

## Checklist

- [x] Step 0 baseline: plan5-baseline
- [x] Step 1 engine: plan5-engine
- [x] Step 2 Ausgesperrt: plan5-escape
- [x] Step 3 Fabriketage: plan5-venue, main 75f180b
- [x] Step 4 Schweißperle: plan5-fitness, 325ebbf, merged into main bd84bcf
- [x] Step 5 Griffig: plan5-climbing, report f1559b2, merged into main
- [ ] Step 6 wrap up: backlog, full report, seeds, docs, final report, plan5-complete

## Climbing

Final main source 27756b3: careful 30.8% ± 2.9, top 39.0%, no-tests 0%; 32 policies × 1,000 paired test seeds. Playability bounds met. Values 2/2 and formula 1/1 exhausted. Open T3, T5 to T7, T9, T11, T12, T14, T15, K1 to K3; K5 at limit. Contributions, closest evidence and options: climbing/FINAL_REVIEW.md.

24 features, 49 events, 150 quotes, four intros, two scenes. 225 ending seeds generated; only Griffig rows change and all replay. Twelve earlier-game comparisons remain valid; engine 0.14.0.

Event table (first and only): complete after two resumes from checkpoints. 100 policies, 76,588 of 100,000 games played; 49 events judged, 33 favour the cheapest answer, 16 a more effortful one. Every event except the first-wall choice moves outcomes by less than noise. Raw table: climbing/griffig-events.md.

Validation gate: the three earlier full attempts each failed one WebKit established-heading fit case. After the restart:
- 3a, full suite with nothing else running, unchanged code: still failed (WebKit 375, Gratwanderung and Tiefgang). So the cause is code, not load.
- Fix attempt 1: the name in its own span with a ResizeObserver on its width. Every browser heading case passed; a jsdom a11y markup check failed because the span showed in every stage.
- Fix attempt 2 (94047f1): the span only in the established stage. All 1,962 tests passed, 30 skipped, but the run exited 1 on one vitest "Timeout calling onTaskUpdate" worker error (no test failed). Two more unchanged runs: one passed every test but hit the same worker error; one hit it plus an a11y browser start-screen timeout (30 s).
- A/B with the pre-fix TopBar under the same conditions: the heading case fails again (Rückenwind WebKit 375), and the worker error appears too. So the fix works, and the worker error comes from the environment, not the fitter. Instrumented counts show the fitter settles (at most 7 fits per page, no loop).
- Load samples: another Claude session (sponsorship-platform) runs its own Playwright suite and Next server and overlapped both sampled runs (load up to 35 on 10 cores). Next full run waits until that project has been quiet for 2 minutes.
- Quiet-window run: the other session restarted mid-run; all tests passed, worker error again.
- maxWorkers 40% trial: worse (two chromium click timeouts plus the worker error). Reverted, not committed.
- Clean run (event campaign stopped at 96 checkpoints, sponsorship-platform stopped by Henry, no outside process in any load sample): all 1,962 tests passed, 30 skipped, but the worker error appeared again. The earlier claim that it tracks the other session was wrong: it happens on a clean machine.
- Timings run: no test exceeds 10.7 s and no file spends over 0.5 s outside its tests, so no long synchronous block explains vitest's 60 s RPC timer. The web project (599 tests) and the bots project (579 tests) each pass alone with no worker error; it appears only when the whole suite runs together.
- Gate accepted by Henry with one change: `pnpm test` now runs the web project, then all other projects, and exits 0 only if both pass (23013dd). Run on an idle machine: web 599 passed; others 1,363 passed, 30 skipped; exit 0. The vitest error is recorded in decisions and the backlog ("revisit when vitest is upgraded").
Logs in the state folder: resume-full-tests-*.log and resume-load-*.log.

## Completed results and open issues

Fitness: careful 44.7% ± 3.1, top 51.8%; values 2/2, formula 1/1 exhausted. Open T3, T5 to T7, T12, T14, F3, F4; F1 and T17 at limit. Event table complete once. Report: reports/step4-fitness.md.

Venue: careful 46.6% ± 3.1, top 47.6%; all V pass, V2 at limit. Open T3, T6, T11, T13, T14, T15. Report: reports/step3-venue.md. Event table complete once.

Ausgesperrt: careful 42.8% ± 3.1, top 48.4%; X1 at limit, X2 to X4 pass. Open T2, T3, T6, T10, T11, T14, T15, T17. Report: reports/step2-escape.md. Event table complete once.

Full bot report: never started.

## For Henry to review


- Griffig shared member and platform arrivals compete for real places; personal skills remain individual (step 5 formula round).
- Hall visitor refunds now visible separately from the membership notice; T11 applies with unchanged limits.
- Climbing round 1: tuned enquiry bands, 15% fictional own-money share, 32-hour reset estimate (scenario-climbing.md section 15, decisions).
- Climbing: two-hour average wall occupancy during longer courses, average café and rental baskets, family-loan repayment after 104 weeks.
- Fitness: studio and aggregator naming, instructor following, annex mat classes, recovery-room exclusion.
- First-pass open targets and deferred scope are in each step report.
- Screenshots at 390 and 1440 px outside the repo: /private/var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-fitness and founder-mode-climbing.

## History

- 23 October 2026, 18:45 UTC: mandatory hard stop (plan 1.2.1) after three attempts at the heading-fit failure.
- 23 October 2026: Henry authorised resuming; worktree moved out of /private/tmp and state copied to the state folder.
