# Autonomous plan 6: price realism, office stages 3 to 5, second boats and second locations

This plan is written for **any coding agent**. It uses the rules of `docs/AUTONOMOUS_PLAN_4.md` section 1 and `docs/AUTONOMOUS_PLAN_TUNING_2.md` section 1.3, with the changes below. Henry, the owner, will not review each step. You make the decisions this file leaves open, record them, and keep going.

The spec is `docs/plan6-features.md`.

**This plan is deliberately lean.** It builds features and checks a few targets that a player would feel. It does not chase every target: other targets are measured, reported and left alone.

## 0. Before anything else

### 0.1 Read, in this order

1. `CLAUDE.md`, including **"Bot report budget"**. Where this plan and the budget disagree, the budget wins.
2. This file, completely.
3. `docs/autonomous6/STATUS.md` if it exists. Continue from "Next action".
4. `docs/plan6-features.md`.
5. `docs/office-stages.md`, `docs/abroad-mechanics.md`, `docs/leisure-mechanics.md`.
6. `docs/tuning2/reports/final.md`, `docs/BACKLOG.md`, and the specs of the scenario you are working on.

### 0.2 Preconditions

- The tag `tuning2-complete` must exist.
- The tag `plan6-baseline` must not exist, unless STATUS.md says this plan is in progress.

If a check fails, write the reason in `docs/autonomous6/STATUS.md` under "Stopped" and end.

## 1. Rules

### 1.1 Names

Status in `docs/autonomous6/STATUS.md`, reports in `docs/autonomous6/reports/`, tags `plan6-*`.

### 1.2 Working practice

As `docs/AUTONOMOUS_PLAN_TUNING_2.md` section 1.3:

- no worktrees, caches or notes under `/tmp`;
- no tests while bot jobs run;
- the split test command stays;
- the full report runs one scenario per process;
- STATUS.md stays readable.

### 1.3 Efficiency

1. **No event tables** until the final report.
2. **Protected proof** (main part, 1,000 seeds) only when engine or shared bot code changed in a way that could reach those games. When only one scenario's content or scenario-only bot code changed, the content fingerprints plus an unchanged engine hash are enough; say so in the report.
3. **During a scenario's work,** run only the careful bot plus the strategies whose targets the change can move. Run that scenario's full strategy set once, at the end of its step.
4. **Bugs found on the way** are fixed and noted. They do not restart finished measurements of other scenarios unless the fix reaches them.

### 1.4 Protected games

| When | Must not change | May change |
|---|---|---|
| Always | Kantino, Zollstock (60 weeks) and Kantino long | |
| Step 1 (price realism) | | Every bookings scenario, through the price model only |
| Steps 2 to 4 | Every scenario except the one the current sub-step names | The current scenario |

### 1.5 Targets and tuning

- **Tuned in this plan:** the targets in `docs/plan6-features.md` section 6 (P1, P2, S1, B1, playability, and O1, O2 and E1 for the new stages).
- **Budget:** at most 2 rounds per target, bot fixes first.
- **Hard stop:** careful bot under 15% or over 55%, or one strategy over 70%, after its budget.
- **Every other target** is measured at the end of each step and in the final report, but not tuned. If one gets clearly worse (beyond its margin), list it under "For Henry to review".

## 2. Step 0: set up

1. Create `docs/autonomous6/STATUS.md` from section 7.
2. Commit this file, `docs/plan6-features.md` and any uncommitted docs. Handle other uncommitted changes as in `docs/AUTONOMOUS_PLAN_4.md` section 1.3, step 0.
3. Use the results committed at `tuning2-complete` as the baseline. Do not rerun anything. Tuning plan 2 skipped the full report, so `docs/balancing.md` is out of date for the four leisure scenarios: their baseline is `docs/tuning2/measurements/final-*.md` and `docs/tuning2/proof/final-main-manifest.json`. The other scenarios' baseline is `docs/balancing.md`.
4. Tag `plan6-baseline`.

## 3. Step 1: price realism

Build `docs/plan6-features.md` section 1.

1. **Engine:**
   - segment elasticity, drawn per run from content ranges;
   - the volume factor with its clamp;
   - the optional shoulder price and shoulder months;
   - the post-mortem's price line per season.

   Off unless a scenario's YAML sets elasticity.
2. **Content:** elasticity ranges for every segment of every bookings scenario (section 1.2's table as a guide, adjusted to the segment). Shoulder months and prices for Rückenwind, Tiefgang and Leinen los.
3. **Bots:** the careful bot already prices by season. Make it lower off-peak prices when capacity is idle and hold peak prices when full, from what it can see (bookings and load). The price-blind bot stays as it is: it is the comparison for T7.
4. **Tests:** volume factor and clamp, determinism, the shoulder price, replay of a saved game.
5. **Measure** every bookings scenario: careful bot, price-blind bot, and the playability check (all strategies once per scenario, 1,000 seeds). Kantino, Zollstock and Kantino long: main part, must be identical.
6. **Tune** P1, P2 and playability, at most 2 rounds per scenario. Adjust elasticity ranges and clamps first, then prices.

Tag `plan6-price`.

## 4. Step 2: shared engine for second sites and second boats

1. **Second location** (`docs/plan6-features.md` section 4): a site as a unit with its own rent, capacity and roster; cannibalisation and new reach; a shared brand rating; the founder's site per week; a manager role; giving it up. Stage 5 in a scenario can name it.
2. **Up to two units of one asset** (section 3), each with its own option, costs and breakdowns; the second unit's offer; one host per cruise in Leinen los.
3. **Rückenwind's fleet** (section 5): buying the rescue boat; gear sets with a lifetime.
4. **View fields and post-mortem lines** for all of these.
5. **Tests**, and the protected proof for every scenario (this is shared engine code).

Tag `plan6-engine`.

## 5. Step 3: stages, second sites and boats, scenario by scenario

One sub-step per scenario, in this order:

| Order | Scenario | Builds |
|---|---|---|
| 1 | Rückenwind | Stages 3 to 5 (5 is a second beach), the fleet |
| 2 | Tiefgang | Stages 3 to 5 (5 is a second centre in Protaras), a second boat |
| 3 | Leinen los | Stages 2 to 5 (5 is a second gulet) |
| 4 | Ausgesperrt | Stages 3 to 5 (5 is a second site) |
| 5 | Fabriketage | Stages 3 to 5 (5 is a second venue) |
| 6 | Schweißperle | Stages 3 to 5 (5 is a second studio) |
| 7 | Griffig | Stages 3 to 5 (5 is a second hall) |

Each sub-step:

1. **Content:** the stages from the spec section 2 table, with offer events in the scenario's voice (each states its condition, costs and effect), results lines, and labels for new UI words. Check the (est.) figures where a source exists.
2. **Drawings:** one scene per new stage, in the app's scene format and style.
3. **Bots:** stage rules for the careful bot (move when the condition is real and a year's surplus carries the added rent, as in plan 3), plus `never_move` and `always_move`; for second sites and boats, `always_second` and `never_second`.
4. **UI:** the Office card and offers as in the other scenarios; a second-site switch (which site you look at, where the founder works); a second boat on the boat card. Same checks as earlier plans: no cut-off text, axe clean at 375, 390, 430 and 1440 px in Chromium and WebKit.
5. **Tests:** offers, moving in, notice, the second site's opening, cannibalisation and founder presence, the second boat, determinism.
6. **Measure and tune:** O1, O2, E1, S1 or B1, playability, at most 2 rounds each. Then the scenario's full strategy set once, and every other target recorded, not tuned.
7. **Report:** `docs/autonomous6/reports/step3-<scenario>.md`.

Tag each: `plan6-<scenario id>`. After the last, tag `plan6-stages`.

## 6. Step 4: wrap up

1. **The full report, once** (one scenario per process, Kantino long with `team` and `funding`). Then `pnpm seeds`, and regenerate `docs/balancing.md`.
2. Docs:
   - `docs/office-stages.md` (the new stages);
   - each scenario spec (a "what changed in plan 6" section);
   - `docs/schema.md`, `docs/decisions.md`, `docs/IMPLEMENTATION_PLAN.md`, `README.md`;
   - `docs/BACKLOG.md`: remove price realism, office stages 3 to 5, the second boat, the second location and Rückenwind's fleet; add anything left open; update the date.
3. Final report `docs/autonomous6/reports/final.md`:
   - what was built;
   - the tuned targets with their status;
   - other targets that moved beyond their margin;
   - open issues;
   - "For Henry to review" in priority order.
4. Clean up your own worktrees, branches and state folders after merging.
5. Tag `plan6-complete`.

## 7. STATUS.md template

```
# Autonomous run 6 status

## Current
Step: <step and sub-step>
Last commit: <hash and message>
Next action: <one or two sentences>

## Checklist
- [ ] Step 0: set up (tag plan6-baseline)
- [ ] Step 1: price realism (tag plan6-price)
- [ ] Step 2: second sites, second boats, fleet engine (tag plan6-engine)
- [ ] Step 3: stages per scenario (tags plan6-<scenario>, then plan6-stages)
- [ ] Step 4: wrap up (tag plan6-complete)

## Running jobs and state
<what is running, where its checkpoints are; never under /tmp>

## Open issues
<target, scenario, result, options>

## For Henry to review (non-blocking)
<one line each, newest first>

## Stopped
<empty unless a hard stop happened>
```

## 8. Out of scope

- Tuning targets other than those in section 1.5.
- Office stages for Kantino, Zollstock or Kantino long beyond what exists.
- A third boat or a third site.
- Everything else in `docs/BACKLOG.md`.
