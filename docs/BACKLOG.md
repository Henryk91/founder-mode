# Backlog

Everything planned or discussed that no plan builds yet. When a plan picks an item up, move it to that plan. When a plan leaves something out or opens an issue, add it here.

Last updated: 17 October 2026, at the end of plan 4.

## 1. Left out of plan 4 (the abroad scenarios)

| Item | Notes |
|---|---|
| Office stages 3 to 5 for Rückenwind and Tiefgang | Specs have stages 1 and 2 only. Stage 3 is the cheapest to add next |
| Office stages beyond stage 1 for Leinen los | The boat options are its progression for now |
| A second boat | A fleet of gulets or two dive boats |
| Motorised watersports | Water skiing, towed rides, jet skis. Decided against for Rückenwind |
| A choice of base for the dive centre | Larnaca (near the wreck) or Protaras (near the hotels). Fixed on Larnaca |
| A currency system | Everything is in euros. Turkey's rising local costs are a flat step in year 2 |
| Package travel law for the gulet | Selling cruises from Germany may count as package travel, with insolvency insurance |
| New mockups or a new visual style for the abroad screens | Plan 4 reuses existing components |
| Tuning beyond the first-pass budget | Plan 4's open targets are in section 3 |
| Buying the rescue boat in Rückenwind | Leased in season only; the asset mechanic could carry it |
| Gear as a fleet in Rückenwind | Buying more boards and rigs is one purchase per product, not a growing fleet |
| A separate skipper and crew on the roster | Crew is a cost per week the boat is used; the roster cannot require several roles together |
| A shop and compressor help role in Tiefgang | An event's summer job instead |
| Three seasons of prices | The engine has peak and off season; the abroad specs have a shoulder |
| A tender for Tiefgang's harbour berth or Leinen los's mooring | Only Rückenwind's beach licence is tendered |
| A surf school in Portugal | Atlantic swell, a different business from wind sports. A possible fourth abroad scenario |

## 2. Left out of plan 5 (the leisure scenarios)

Plan 5 (`docs/AUTONOMOUS_PLAN_5.md`) builds the escape room, event venue, fitness studio and climbing gym in Munich, under a new "Leisure" tab. It runs after plan 4.

| Item | Notes |
|---|---|
| Office stages 3 to 5 for the leisure scenarios | Specs have stages 1 and 2 only |
| A second location for any of them | A second studio, a second gym |
| A full gym with machines | The fitness studio is classes only |
| Personal training, physiotherapy or a shop as products | |
| A real booking or access-control integration | |
| New mockups or a new visual style for the leisure screens | Plan 5 reuses existing components |

## 3. Open targets

Details and options in `docs/autonomous3/STATUS.md`, `docs/autonomous2/STATUS.md` and `docs/decisions.md`. Plan 4 adds its own open issues in `docs/autonomous4/STATUS.md`; copy them here at its end.

| Scenario | Targets |
|---|---|
| Kantino long | 20, 27, 32, 33 (32 about 1 point worse since office stages) |
| All tourism scenarios | T14 (staff contracts; the target may measure the wrong thing, see the plan 2 audit) |
| Hinterhof | T2, T7 |
| Seeblick | T6, T7, T11 |
| Gratwanderung | School group demand well above the spec |
| All four long modes | O3 (no office stage is always right; offices are rarely taken) |
| Rückenwind (plan 4) | T7 (seasonal pricing, -2.1), T14 (permanent and part time contracts in a business closed all winter), W2 (never running kite trips is ahead) |
| Tiefgang (plan 4) | T2 (the no-tests bot wins about a fifth), T3 (dive clubs about 5%), D3 (the seats bot's wins hold the most money), T6 and L2 (at their limits) |
| Leinen los (plan 4) | T3 (charters and retreats well behind cabin-led runs), T5, T6, T11, E1, G1 (buying rarely best), G3 (holding weeks), G4 (the minimum to sail). T4, T9, T14 and the loan targets T15 to T18 do not apply as written |

These are better as their own small tuning plan than mixed into a content plan.

### Patterns across the open targets (review after plan 4)

| Pattern | Seen in | Proposed fix |
|---|---|---|
| Segments that book months ahead are weak in a run that starts close to the season | Leinen los charters and retreats (T3, G3), Tiefgang dive clubs (T3) | Start these runs earlier (Leinen los in October, a full winter of selling), or let long-lead segments arrive with bookings already in the pipeline |
| Owned assets are judged on cash only, so their remaining value is ignored | Leinen los G1, Tiefgang D3 | Count the asset's resale value minus the loan left in the target comparison (the post-mortem already has "net of the boat"). A measurement fix, not a value change |
| A single-choice bot beats the careful bot | Leinen los (always lease 41.4% against careful 30.9%), Tiefgang (naive careful 29.9% against 25.8%) | Fix the careful bot first: managing the gulet in season 1 costs about 10 points when the lease is this cheap |
| The minimum to sail always loses | Leinen los G4 | Probably correct: once the boat is paid for, a half-empty cruise beats a cancelled one. Keep it as a trap the post-mortem explains (marginal cost), and restate G4 |
| Staff contracts in seasonal businesses | T14 in every tourism scenario, Rückenwind most | A contract that sleeps in winter (the Spanish fijo discontinuo), or restate T14 for seasonal businesses |
| "At the limit" used for results outside their margin | Tiefgang T6 (+1.0 ±1.6 against at least 3) | Count it as failing |

## 4. Features not in any plan

| Item | Notes |
|---|---|
| Zollstock long mode | With funding and office stages |
| The next batch of 60-week changes | Chasing invoices with a risk of chasing too early; automatic reminders |
| Summarised inbox reports in the established look | From the old established mockup |
| Cofounders | |
| A competitor | |
| VAT rules | |
| Prices per market | |
| The "a bit steep" price warning | |
| Sound | |
| Real illustration | |
| Cloud saves | |

## 5. Housekeeping

| Item | Notes |
|---|---|
| Stale worktree records | Four agent scratch worktrees under `/private/tmp` whose folders are gone. `git worktree prune` clears them when no agent is running |
| `packages/bots/scratch/` | Six local debug scripts, excluded in `.git/info/exclude`, so never committed. Delete when no longer useful |
