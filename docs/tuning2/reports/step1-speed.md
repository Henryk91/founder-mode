# Step 1: simulation speed

## Scope and baseline

Every scenario is protected during this step. Engine, content and bot outcomes must
match the committed plan5-complete main results on 1,000 paired test seeds.
No baseline simulations were replayed. Full report budget remains unused.

Before coding, planned files: `packages/engine/src/systems/leisure.ts`,
focused engine tests if needed, and this report, STATUS and decisions.
The profile decides any additional files before they are changed.

The baseline full report times include concurrent workers and are not controlled
comparisons against these profiles. Schweißperle's plan text quotes 303 s;
the actual final full report records 574.0 s (its step report records 462.1 s).
Ausgesperrt and Fabriketage also exceed T12 in the final full report, so all four
are profiled. The 34-target inventory remains historical; speed covers all four.

## Before profiles

Node inspector CPU profiler, one slowest main policy per scenario, 100 seeds
`test-0` to `test-99`. No tests or browser tests ran during the profiles.
Profile tooling: `packages/bots/scratch/tuning2-profile.tmp.ts` (ignored local file).
Raw profiles and complete results: `docs/tuning2/state/profiles/` (ignored).
Top costs below are self-sampled CPU time; anonymous functions use Vite's
transformed source location rather than claiming an original TypeScript line.

### ausgesperrt

Policy `leisure_quarterly_rooms`: 13.464 s for 100 games.

| Function | Self CPU share | Source |
|---|---|---|
| bookingsView | 9.5% | packages/engine/src/systems/bookings.ts (transformed line 1693) |
| (garbage collector) | 7.7% | Node runtime (transformed line 0) |
| entries | 7.7% | packages/engine/src/systems/leisure.ts (transformed line 49) |
| (anonymous) | 6.9% | packages/engine/src/systems/leisure.ts (transformed line 460) |
| getView | 6.7% | packages/engine/src/view.ts (transformed line 40) |
| applyBookings | 6.1% | packages/engine/src/systems/bookings.ts (transformed line 403) |
| leisureCapacity | 4.7% | packages/engine/src/systems/leisure.ts (transformed line 269) |
| leisureView | 2.7% | packages/engine/src/systems/leisure.ts (transformed line 566) |
| endWeek | 2.1% | packages/engine/src/turn.ts (transformed line 39) |
| (anonymous) | 2.0% | packages/engine/src/systems/leisure.ts (transformed line 654) |

### fabriketage

Policy `venue_free_holds`: 6.804 s for 100 games.

| Function | Self CPU share | Source |
|---|---|---|
| (garbage collector) | 6.8% | Node runtime (transformed line 0) |
| entries | 6.6% | packages/engine/src/systems/leisure.ts (transformed line 49) |
| bookingsView | 6.2% | packages/engine/src/systems/bookings.ts (transformed line 1693) |
| leisureCapacity | 5.9% | packages/engine/src/systems/leisure.ts (transformed line 269) |
| (anonymous) | 4.4% | packages/engine/src/systems/leisure.ts (transformed line 812) |
| leisureOpen | 4.0% | packages/engine/src/systems/leisure.ts (transformed line 247) |
| applyBookings | 3.4% | packages/engine/src/systems/bookings.ts (transformed line 403) |
| plansOf | 3.1% | packages/engine/src/systems/trials.ts (transformed line 27) |
| leisureView | 3.1% | packages/engine/src/systems/leisure.ts (transformed line 566) |
| bookedAt | 2.5% | packages/engine/src/systems/bookings.ts (transformed line 1744) |

### schweissperle

Policy `tourism_careful`: 29.065 s for 100 games.

| Function | Self CPU share | Source |
|---|---|---|
| leisureCapacity | 11.3% | packages/engine/src/systems/leisure.ts (transformed line 269) |
| applyBookings | 8.1% | packages/engine/src/systems/bookings.ts (transformed line 403) |
| entries | 7.3% | packages/engine/src/systems/leisure.ts (transformed line 49) |
| (garbage collector) | 6.9% | Node runtime (transformed line 0) |
| leisureOpen | 5.3% | packages/engine/src/systems/leisure.ts (transformed line 247) |
| (anonymous) | 4.1% | packages/engine/src/systems/leisure.ts (transformed line 817) |
| (anonymous) | 2.7% | packages/engine/src/systems/leisure.ts (transformed line 342) |
| readyAt | 2.6% | packages/engine/src/systems/leisure.ts (transformed line 40) |
| leisureProductCapacity | 2.3% | packages/engine/src/systems/leisure.ts (transformed line 295) |
| bookingsView | 2.2% | packages/engine/src/systems/bookings.ts (transformed line 1693) |

### griffig

Policy `tourism_careful`: 40.511 s for 100 games.

| Function | Self CPU share | Source |
|---|---|---|
| entries | 16.3% | packages/engine/src/systems/leisure.ts (transformed line 49) |
| (garbage collector) | 7.8% | Node runtime (transformed line 0) |
| applyBookings | 7.1% | packages/engine/src/systems/bookings.ts (transformed line 403) |
| (anonymous) | 6.6% | packages/engine/src/systems/leisure.ts (transformed line 49) |
| (anonymous) | 3.3% | packages/engine/src/systems/leisure.ts (transformed line 342) |
| leisureCapacity | 2.7% | packages/engine/src/systems/leisure.ts (transformed line 269) |
| leisureOpen | 2.5% | packages/engine/src/systems/leisure.ts (transformed line 247) |
| pickProduct | 2.4% | packages/engine/src/systems/leisure.ts (transformed line 1080) |
| finishLeisure | 2.2% | packages/engine/src/systems/leisure.ts (transformed line 1213) |
| (anonymous) | 1.9% | packages/engine/src/systems/leisure.ts (transformed line 1081) |

## First round decision

Sorted scenario-record entries are repeatedly rebuilt in visit selection,
capacity availability and views. Griffig spends 22.9% of sampled time in the
entries helper and its comparator. Memoise sorted entries of immutable content
records only, using weak references as existing scenario-hash and weather-share
helpers do. Dynamic state/history records continue to use fresh entries.
No capacity cache, state copy policy, RNG call, or numerical rule changes.
Keep this only if complete outcome comparisons and replay remain identical.

Round 1 is implemented. Focused leisure/qualification tests: 53 passed.
`pnpm lint` passes. The first edit accidentally replaced three unsorted
`Object.entries` call sites too; those were restored before measurements.
Local diagnostics were renamed to the repository's `*.tmp.ts` convention before
lint passed. No assertion or lint rule was changed.

Original-engine save verification: 21 complete saved states across all 13
scenario/mode units replay identically under the optimisation. Leisure also covers
no-tests and naive policies. Logs, saved action histories and full-state hashes are
in `state/replays/` and `state/round1-replay.log`.

Early 100-seed result checks: Griffig 40.511 → 29.275 s and Schweißperle
29.065 → 25.180 s; all complete RunResult records identical. These profiles are
not idle 1,000-run T12 measurements. All four main matrices are now complete.

## Round 1 main proof

Ausgesperrt: all 28 policies × 1,000 paired `test` seeds match every saved
RunResult field exactly. Checkpoints and SHA256 comparisons:
`state/round1/ausgesperrt-long/comparison.json`. The slowest policy's summed
worker time is 253.84 s; this is not an idle T12 measurement.

Fabriketage: all 29 policies × 1,000 paired test seeds match every saved
RunResult field exactly. Evidence: state/round1/fabriketage-long/comparison.json.

Schweißperle: all 30 policies × 1,000 paired test seeds match every saved
RunResult field exactly. Evidence: state/round1/schweissperle-long/comparison.json.

Griffig: all 32 policies × 1,000 paired test seeds match every saved RunResult
field exactly. Evidence: state/round1/griffig-long/comparison.json.

Committed proof hashes for all four units: `../proof/round1-*.json`.
Total: 119 policies, 119,000 identical complete results. All 517 engine tests
(57 files) pass after the bot processes exit; log: state/round1-engine-all.log.
Lint passed on this source. Engine remains 0.14.0 and content is unchanged.

| Scenario | Slowest policy in the parallel campaign | Summed worker seconds |
|---|---|---|
| Ausgesperrt | leisure_quarterly_rooms | 253.843 |
| Fabriketage | venue_free_holds | 130.326 |
| Schweißperle | tourism_naive_careful | 482.437 |
| Griffig | climbing_boulder_first | 657.041 |

These times do not establish idle T12. After the final round, select the slowest
policy from that matrix and measure 1,000 seeds serially with no competing jobs.

## Second and final speed round

Planned files: leisure.ts, leisure.test.ts, this report, decisions, STATUS and budget.
Keep alias-specific readiness/requirements but delegate pool products directly to
leisureCapacity, which already checks them. Select the product with most remaining
room in one alphabetical pass instead of filtering and sorting with repeated room
calls. Preserve the existing tie-break, qualifications, sold offers and every RNG
call. Add a regression for deterministic equal-capacity selection.

This is removal of duplicate work, not a capacity cache. No content or economic
formula changes. Apply only after the first round is committed; validate before
starting its main comparisons. The nine earlier units get their required 1,000-seed
main proof on the final speed source, avoiding a duplicate intermediate campaign.

## Round 2 checks and profile

The added alphabetical tie-break test passes on the original round 1 source and
the final source. Full engine project: 518 passed in 57 files. Lint and all
workspace typechecks pass. The same 21 original saved action logs replay to the
exact original full-state SHA256, without generating another original baseline.
Logs: state/round2-engine-all.log, round2-lint.log and round2-replay.log.

Profiles, 100 paired test seeds each, every RunResult equal to the stored prefix:

| Scenario/policy | Round 1 profile | Round 2 profile |
|---|---|---|
| Griffig careful | 29.275 s | 25.702 s |
| Schweißperle careful | 25.180 s | 23.001 s |
| Griffig boulder-first | not profiled | 29.436 s |

These are short profiles, not idle 1,000-run T12 judgements. Second and final
main proof ran 1,000 seeds per policy: four affected units first, then the
nine earlier units. No full report, wide seeds or events are part of this proof.

## Round 2 main proof

Ausgesperrt 28, Fabriketage 29 and Schweißperle 30 policies each reproduce every
complete result on 1,000 paired test seeds. Committed proof hashes:
`../proof/round2-<scenario>-long.json`. Griffig also reproduces all 32 policies × 1,000 paired seeds. All four
leisure units total 119,000 identical results. The nine earlier units are also
complete, giving 314,000 identical results across all 13 units.

Metadata-only availability check found all 314 main-policy baselines across the
13 units, without playing any baseline games. Log: state/baseline-availability.log.

The final speed source was committed after 518 engine tests, lint, 21 original
saved-state replays, and all four affected 1,000-seed main matrices. The nine
earlier-unit campaign then completed on the same frozen package bytes. No speed
milestone is tagged until idle T12 and the full suite finish.

Benchmark environment: Node v20.19.5, Darwin arm64, Apple M5, 10 available CPUs,
16 GiB RAM. Main proof uses eight seed workers; T12 will use one. Metadata:
`../proof/environment.json`.

## Complete final-source proof

All 13 scenario/mode units completed successfully: 314 policies, each on 1,000
paired test seeds, with all 314,000 complete RunResult records identical to the
saved plan 5 baseline. This includes the nine protected earlier units.
Every comparison carries the same current package-source SHA256:
`42148c7bc7257ef76ae0b7fc3761f0da9d9bf5ee93ef6afa4949998673a35eb8`.
All final comparisons are preserved in `../proof/round2-*.json`.
The campaign exited before serial T12 measurements started. No wide seeds,
event tables or full report were run.

## Remaining profile costs and isolated timing method

The final fitness profile still spends 15.0% self CPU in leisureCapacity and
8.7% in applyBookings. The final climbing boulder-first profile spends 10.5%
in applyBookings, 6.4% in garbage collection, 5.0% in leisureCapacity and 4.6%
in pickProduct. The repeated sorted-entry cost is no longer a leading entry.
Two speed rounds are the cap; further optimisation is deferred if T12 fails.

For each leisure unit, take the two slowest candidates from the completed main
matrix and time 1,000 paired seeds serially, with no concurrent bot or test jobs.
If the first exceeds 150 seconds, it already disproves T12, so do not run a second
candidate merely to reconfirm failure. Every timed complete result is hashed
against the proven main matrix. This checks the slowest candidates, rather than
claiming that every policy was timed in isolation. Normal desktop services remain
open; the preflight process check showed no competing sustained CPU workload.

Completed timings so far: Ausgesperrt 104.797 and 115.099 seconds; Fabriketage
51.127 and 54.865 seconds. Both candidates in each unit meet the 150-second limit.
Schweißperle tourism_naive_careful: 247.792 seconds. Griffig
climbing_boulder_first: 292.426 seconds. Both fail T12 after two rounds; their
complete outcomes remain identical. No second candidate was timed in either
failing unit. The full phase test gate follows after all timing jobs exit.

| Scenario | Plan 5 full report, concurrent worker seconds | Isolated final-source seconds | T12 |
|---|---:|---:|---|
| Ausgesperrt | 303.3 | 115.099 (maximum of two candidates) | candidates pass |
| Fabriketage | 152.4 | 54.865 (maximum of two candidates) | candidates pass |
| Schweißperle | 574.0 | 247.792 | fail |
| Griffig | 811.9 | 292.426 | fail |

The before and after columns use different concurrency and are not a controlled
speedup ratio. Controlled 100-seed profile pairs are reported separately above.
Committed serial timing evidence: `../proof/t12-<scenario>.json`.

Two rounds are exhausted. Keep both proven optimisations, preserve the remaining
speed failures and profile costs, and continue to Part B as the plan requires.
Future work can profile booking/view construction and repeated capacity predicates;
no third speed round or repeated capacity cache is attempted here.

## Phase gate

Full `pnpm test` passed after all bot jobs exited: web 599 passed, remaining
projects 1,364 passed and 30 skipped, total 1,963 passed. The initial sandbox
attempt could not bind local browser ports (EPERM); the permitted run exited 0.
No tests or assertions were weakened. `pnpm lint` and every workspace typecheck
passed. Logs: state/step1-full-tests.log and state/step1-final-lint.log.
Step 1 is complete; proceed to shared leisure patterns. Full report unused.
