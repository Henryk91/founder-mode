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
