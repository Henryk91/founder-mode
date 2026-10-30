# Autonomous tuning plan 2: speed, then the leisure targets

This plan is written for **any coding agent**. It is self-contained apart from the rules it takes from `docs/AUTONOMOUS_PLAN_4.md` and `docs/AUTONOMOUS_PLAN_TUNING_1.md`. Henry, the owner, will not review each step. You make the decisions this file leaves open, record them, and keep going.

It adds no new scenarios and no new features. It has two parts:

- **Part A: speed.** Make the slow scenarios fast, with identical results on the same seeds.
- **Part B: the 34 open targets** of the four leisure scenarios from plan 5 (Ausgesperrt, Fabriketage, Schweißperle, Griffig).

## 0. Before anything else

### 0.1 Read, in this order

1. `CLAUDE.md`, including **"Bot report budget"**. Where this plan and the budget disagree, the budget wins.
2. This file, completely.
3. `docs/tuning2/STATUS.md` if it exists. Continue from "Next action".
4. `docs/AUTONOMOUS_PLAN_4.md` section 1 and `docs/AUTONOMOUS_PLAN_TUNING_1.md` section 1 (the rules this plan uses).
5. `docs/BACKLOG.md`: section 3 "Plan 5 open targets" (each target with its closest result and options) and "Plan 5 first-pass adaptations".
6. `docs/autonomous5/reports/final.md` and the step reports for the scenario you are working on, plus `docs/tuning1/reports/final.md` (how the last tuning plan solved similar problems).
7. `docs/leisure-mechanics.md`, the four leisure specs, `docs/balancing.md`, and the relevant sections of `docs/decisions.md`.

### 0.2 Preconditions

- The tag `plan5-complete` must exist.
- The tag `tuning2-start` must not exist, unless STATUS.md says this plan is in progress.

If a check fails, write the reason in `docs/tuning2/STATUS.md` under "Stopped" and end.

## 1. Rules

Use `docs/AUTONOMOUS_PLAN_4.md` section 1 together with `docs/AUTONOMOUS_PLAN_TUNING_1.md` section 1, including:

- the strict "at the limit" rule;
- restatements only under judgement rule 7;
- the full tuning budget: 3 rounds of values and 2 rounds of formulas per failing target, with bot fixes first and not counted.

The changes below apply on top.

### 1.1 Names

Status in `docs/tuning2/STATUS.md`, reports in `docs/tuning2/reports/`, tags `tuning2-*`.

### 1.2 Protected games

| When | Must not change | May change |
|---|---|---|
| Part A (speed) | **Every scenario.** Results on the same seeds must be identical, apart from timings | Code only, never outcomes |
| Part B | Kantino, Zollstock, Kantino long, Gratwanderung, Hinterhof, Seeblick, Rückenwind, Tiefgang, Leinen los | Only the leisure scenarios the current sub-step names |

Prove "unchanged" as before: the main part on 1,000 seeds against the last committed result.

### 1.3 Working practice (learned from plan 5)

1. **No worktrees, caches, checkpoints or notes under `/tmp` or `/private/tmp`.** macOS may clear them on a restart. Use the repo, or a folder next to it (`../founder-mode-tuning2-state/`), and record every path in STATUS.md.
2. **Never run the test suite or any browser test while bot or event jobs are running.** Stop or finish bot jobs first.
3. **`pnpm test` runs in two halves** (web, then the rest). Keep it that way.
4. **The full report runs one scenario per process.** Kantino long needs its parts named, including `team` and `funding`, and may need a larger memory limit. Saved results may be reused only when the source they came from is identical (same commit for engine, content and bots).
5. **Keep STATUS.md readable:** normal spacing after punctuation, short lines, one fact per line.

### 1.4 Baseline

Use the results committed at `plan5-complete` (`docs/balancing.md` and `docs/autonomous5/`). Do not rerun anything to create a baseline.

## 2. Step 0: set up

1. Create `docs/tuning2/STATUS.md` from section 7.
2. Commit this file and any uncommitted docs. If other uncommitted changes exist, handle them as `docs/AUTONOMOUS_PLAN_4.md` section 1.3 says for step 0.
3. Tag `tuning2-start`.

## 3. Part A, step 1: speed

**Goal:** target T12 (1,000 runs of the slowest strategy in under 150 seconds) in every leisure scenario.

| Scenario | 1,000 runs now |
|---|---|
| Griffig | 812 s |
| Schweißperle | 303 s (462 s in its own step report) |
| Ausgesperrt, Fabriketage | Check `docs/balancing.md` |

**Rules:** outcomes must not change.

1. **Profile before changing anything.** Run the slowest strategy of each slow scenario on 100 seeds with a CPU profile (`node --cpu-prof` or the equivalent through the bots runner). Record the ten most expensive functions in the step report. The backlog already suspects membership history and hall traffic. A capacity cache was tried in plan 5 and gained 1.1%, so do not repeat it.
2. **Fix the largest costs first.** Typical causes to look for:
   - per-member or per-visit objects rebuilt every week;
   - history arrays that grow for the whole run and are scanned each week;
   - deep copies of state where structural sharing would do (but note tuning plan 1's finding that copying bookings made Hinterhof 40% slower);
   - view or post-mortem work done inside bot runs that never read it.
3. **After each change, prove identical outcomes:**
   - the main part of that scenario on 1,000 seeds must match its last committed result exactly, apart from timings;
   - replaying a saved game must give the same game.

   If an optimisation changes any result, revert it.
4. **Then prove every scenario unchanged** (main part, 1,000 seeds each), since engine code is shared.
5. **Measure T12** for each leisure scenario with nothing else running on the machine.
6. **If a scenario still fails T12 after two honest rounds,** record the closest result and what the profile shows, and continue. Speed is not a hard stop.

Tag `tuning2-speed`.

## 4. Part B, step 2: patterns shared by the leisure scenarios

These targets fail in several leisure scenarios for similar reasons. Fix them once, then measure every leisure scenario they touch. Only leisure scenarios may change.

1. **Bookings far ahead lose the first season** (Fabriketage weddings at 9.7%).
   - Switch on `requestsAhead` (built in tuning plan 1 for Leinen los) where a segment books months ahead.
   - Collect balances before the event (weddings 4 weeks, private parties 1 week), with cancellation and refund accounting, as the backlog lists. Today everything is settled on the day.
2. **The later loan always wins** (T15: Ausgesperrt +16.5, taken in 98.7%; Fabriketage +40.6, taken in 100%; Griffig +6.8). Usually this means the first loan is too small for what the business needs, so a second one is free money.
   - Check the first loan's scope and timing first, then the terms.
   - Keep real borrowing costs, and add no hidden penalty.
3. **Reading the inbox** (T6 in all four). Blind effort gains nearly as much as reading in Ausgesperrt, Fabriketage and Schweißperle; in Griffig almost no event matters.
   - Use each scenario's event table to find choices where effort is always the right answer, and rewrite them so the right answer depends on what the player can see.
   - Give Griffig's events real consequences.
   - At least 10 rewritten or new events per scenario where T6 fails.
4. **Decision news before opening** (T5 in Schweißperle and Griffig). Add genuine preparation decisions for the build-out weeks (suppliers, opening offers, first hires, pre-sales). No relabelled routine messages.
5. **Staff contracts** (T14 in all four) and **cancellation policy** (T11 in three). Apply what tuning plan 1 learned: contract bots sign by utilisation, not by winning; a policy matters only if cancellations are frequent and costly enough to see.
6. **Seasonal pricing** (T7 in Schweißperle and Griffig). Tuning plan 1 found that a discount below willingness to pay wins almost nobody with the current price curve. Do not sweep prices. Check whether a per-scenario bot setting (as used in Hinterhof and Seeblick) fixes it. If not, record it for the price realism item in the backlog.

Tag `tuning2-shared`.

## 5. Part B, step 3: one sub-step per scenario

Only that scenario may change in its sub-step. For each failing target, follow the options listed in `docs/BACKLOG.md`.

### 5.1 Ausgesperrt

- **T2:** building rooms without testing wins 22%. Make the theme choice learnable and matter: theme preferences that interviews and play tests reveal, and a theme that does not suit the run's market should struggle.
- **T10:** reviews do not matter (ignoring them wins +4.7). Separate the cost of spare staff from the review benefit, and check the reviews' effect on locals' demand.
- **T3:** companies win only 27.7%, against locals at 60.2%.
- **T17:** debt is too safe (gap +3.9 against at least 15).
- **T11** and **T14** if step 2 did not fix them.

### 5.2 Fabriketage

- **T3** after step 2's wedding changes.
- **T13:** a player without scenario knowledge falls 14 points behind (limit 10). Make the forward calendar and the cost of a gap visible on screen. Check what the naive bot does differently.
- **T6, T11, T14** if not fixed.

### 5.3 Schweißperle

- **F3:** reformers lose 22 points, so they are a trap rather than a choice. Check affordability and when the bot buys (forecast rules) before changing equipment costs.
- **F4:** losing a star instructor costs nothing visible (+0.1). Make the followers' loss show in revenue and in the post-mortem.
- **T3:** corporate plans too strong (62.1% against 33.3 and 37.8%).
- **T5, T7, T14** if not fixed.

### 5.4 Griffig

- **K1:** bouldering first is the best start in 92% of differing seeds; building both first almost never. Options: a staged opening (open the first area while the second is built), cheaper finance for a combined build, or rope walls drawing committed climbers who pay more. Keep real construction costs.
- **K2:** route-setting hours barely matter (half the hours costs 1.4 points, needs 3). Freshness must visibly reduce visits and raise churn among committed climbers.
- **K3:** opening the aggregator in all slots is not punished (+1.0). Check that peak slots really get crowded with aggregator users.
- **T3:** committed climbers win only 12.9%.
- **T9:** overstaffing is not punished (+1.1).
- **T5, T6, T7, T11, T14, T15** if not fixed.

Tag `tuning2-scenarios`.

## 6. Step 4: wrap up

1. **The full report, once,** following section 1.3.4. Then `pnpm seeds`, and regenerate `docs/balancing.md`.
2. Docs:
   - the leisure specs' sources and "values as built" sections;
   - `docs/decisions.md`;
   - `docs/schema.md` if types changed;
   - `docs/BACKLOG.md`: remove what this plan closed, keep what is still open with the closest result, and update the date.
3. Final report `docs/tuning2/reports/final.md`:
   - the speed results per scenario, before and after;
   - every target that was open at the start, with before, after and status;
   - every restatement with its reason;
   - what is still open;
   - the "For Henry to review" list in priority order.
4. Clean up your own working state: remove worktrees and branches this plan created after merging, and leave nothing under `/tmp`.
5. Tag `tuning2-complete`.

## 7. STATUS.md template

```
# Tuning run 2 status

## Current
Step: <step and sub-step>
Last commit: <hash and message>
Next action: <one or two sentences>

## Checklist
- [ ] Step 0: set up (tag tuning2-start)
- [ ] Step 1: speed (tag tuning2-speed)
- [ ] Step 2: shared leisure patterns (tag tuning2-shared)
- [ ] Step 3: Ausgesperrt, Fabriketage, Schweißperle, Griffig (tag tuning2-scenarios)
- [ ] Step 4: wrap up (tag tuning2-complete)

## Running jobs and state
<what is running, where its checkpoints are; never under /tmp>

## Open issues
<target, scenario, before, closest result, options>

## For Henry to review (non-blocking)
<one line each, newest first, with a pointer into docs/decisions.md>

## Stopped
<empty unless a hard stop happened>
```

## 8. Out of scope

- New scenarios, new features, new UI. Small view or post-mortem lines a fix needs are allowed (a forward calendar hint, a followers' loss line).
- Changes to the non-leisure scenarios.
- The price curve redesign (backlog item); this plan only records findings for it.
- Everything in `docs/BACKLOG.md` sections 1, 2 and 4.
