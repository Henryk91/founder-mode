# Autonomous plan 7: fair channel tiredness, several channels per market, reasons for losses

This plan is written for **any coding agent**. It uses the rules of `docs/AUTONOMOUS_PLAN_4.md` section 1, the working practice of `docs/AUTONOMOUS_PLAN_TUNING_2.md` section 1.3 and the efficiency rules of `docs/AUTONOMOUS_PLAN_6.md` section 1.3, with the changes below. Henry, the owner, will not review each step. You make the decisions this file leaves open, record them, and keep going.

The spec is `docs/plan7-sales-feedback.md`. **This plan is small and lean.** It changes the subscription games only.

## 0. Before anything else

### 0.1 Read, in this order

1. `CLAUDE.md`, including **"Bot report budget"**.
2. This file, completely.
3. `docs/autonomous7/STATUS.md` if it exists. Continue from "Next action".
4. `docs/plan7-sales-feedback.md`.
5. `docs/scenario-kantino.md`, `docs/scenario-zollstock.md`, the latest sections of `docs/decisions.md`, and `docs/balancing.md` (targets 1 to 37).
6. The code: `packages/engine/src/systems/sales.ts` (outreach, `effectiveHours`, `recentOutreach`, trials, churn), the plan types in `packages/engine/src/types.ts`, the save loader, `apps/web/src/screens/Plan.tsx` (`SellBody`), `Results.tsx`, `Pipeline.tsx`, and `packages/engine/src/postmortem.ts`.

### 0.2 Preconditions

- The tag `plan6-complete` must exist.
- The tag `plan7-baseline` must not exist, unless STATUS.md says this plan is in progress.

If a check fails, write the reason in `docs/autonomous7/STATUS.md` under "Stopped" and end.

## 1. Rules

### 1.1 Names

Status in `docs/autonomous7/STATUS.md`, reports in `docs/autonomous7/reports/`, tags `plan7-*`.

### 1.2 Protected games

| Must not change | May change |
|---|---|
| The outcomes of every bookings scenario: Gratwanderung, Hinterhof, Seeblick, Rückenwind, Tiefgang, Leinen los, Ausgesperrt, Fabriketage, Schweißperle, Griffig (step 2b changes their UI only) | Kantino and Zollstock (60 weeks) and Kantino long. This is a deliberate change: update the 60 week content fingerprint lock in the same commit as the change, and say so in the report |

Prove the bookings scenarios unchanged once, at the end (main part, 1,000 seeds each), because shared engine code changes.

### 1.3 Targets and tuning

- **Tuned:** the targets in `docs/plan7-sales-feedback.md` section 5.
- **Budget:** at most 2 rounds per target, bot fixes first.
- **Hard stop:** in any of the three games, the careful bot outside 15 to 55% or one strategy over 70%, after its budget.
- **Other targets** of the three games (1 to 37) are measured once at the end. Any that gets worse beyond its margin is tuned with at most 2 rounds or listed for Henry.

### 1.4 Saves

Old action logs store one channel per market. Convert them on load, test that an old save loads and replays without errors, and bump the engine version (outcomes change). A change that would lose player data in a way the save notices cannot cover is a hard stop, as before.

## 2. Step 0: set up

1. Create `docs/autonomous7/STATUS.md` from section 6.
2. Commit this file, the spec and any uncommitted docs. Handle other uncommitted changes as in `docs/AUTONOMOUS_PLAN_4.md` section 1.3, step 0.
3. Baseline: the results committed at `plan6-complete`. Do not rerun anything.
4. Tag `plan7-baseline`.

## 3. Step 1: channels (spec sections 1 and 2)

1. **Engine:**
   - the new tiredness rule;
   - hours per market and channel in the plan;
   - the tiredness word per market and channel in `PlayerView`;
   - save conversion and the engine version bump.
2. **Tests:**
   - both properties of spec 1.2 over many random histories;
   - several channels in one week;
   - an old save loads and replays;
   - determinism.
3. **UI:** the channel rows with steppers and tiredness words in "Find customers", in all three UI stages, with the usual checks (no cut-off text, axe clean at 375, 390, 430 and 1440 px in Chromium and WebKit).
4. **Bots:** the careful bot spreads hours to a fresh channel when one tires, from the words it can see. Add `one_channel` (today's behaviour: one channel per market) for M2.
5. **Measure:** Kantino 60 weeks, careful and `one_channel`, 1,000 seeds; then the main part of all three games. Tune M2 and playability.

Tag `plan7-channels`.

## 4. Step 2: reasons for losses (spec section 3)

1. **Engine:**
   - the real cause on every loss;
   - the stated reason (unprompted or after asking) with honesty per segment;
   - the "Ask why" plan action (1 founder hour, within 4 weeks of the loss);
   - the answer as an inbox message the next week;
   - post-mortem lines with stated reasons against real causes.

   The real cause never reaches `PlayerView` during the run.
2. **Content:** for Kantino and Zollstock (both modes), each segment: 3 to 5 texts per cause and per soft reason, in each scenario's voice. Honesty per segment from its politeness (polite trap segments lowest).
3. **UI:**
   - lost leads and cancellations with the stated reason, or "no reason given" plus an "Ask why" button, in the weekly results;
   - the stated reason in the Pipeline's lost list;
   - the answer in the inbox.

   Same checks as step 1.
4. **Tests:** cause selection, honesty draws, asking and answering, the 4-week window, the hidden cause never in the view, the post-mortem lines.
5. **Bots:** the careful bot asks after losses when it has an hour spare, and uses the answers the way it uses interviews (a named missing feature counts as a mention). Add `never_ask` for R1.
6. **Measure:** Kantino 60 weeks, careful and `never_ask`, 1,000 seeds; tune R1 and playability.

Tag `plan7-reasons`.

## 4b. Step 2b: nothing in the weekly report is lost (spec section 4)

1. **Audit** every report entry kind and record where its information can be found after the report closes, in a table in the step report.
2. **Persistent homes** for what a player acts on: cancelled customers in the Pipeline's lost list (with how long they paid and their stated reason), experiment results with their experiment, and anything else the audit finds.
3. **Past weeks:** reopen any earlier week's report. Rebuild the reports while a saved game loads, keep them in memory, never store them in the save.
4. **Tests:** one per entry kind (it has a home or is reachable through Past weeks); an old save loads with its past weeks; the same checks as step 1 for the UI.
5. **Proof:** this step changes the UI only. The main part of every scenario must stay identical; run it once at the end of the plan with the step 3 proof, not separately.

Tag `plan7-history`.

## 5. Step 3: wrap up

1. **Report for the three changed games, once:** Kantino and Zollstock (60 weeks) with their standard parts and events, and Kantino long with its parts named, including `team` and `funding`. One process each. Update their sections in `docs/balancing.md`.
2. **Proof for the ten bookings scenarios:** main part, 1,000 seeds each, identical to `plan6-complete`.
3. `pnpm seeds`.
4. Docs:
   - `docs/scenario-kantino.md` and `docs/scenario-zollstock.md` (a "what changed in plan 7" section);
   - `docs/schema.md`, `docs/decisions.md`, `README.md`;
   - `docs/BACKLOG.md`: add anything left open; update the date.
5. Final report `docs/autonomous7/reports/final.md`:
   - what changed;
   - the tuned targets;
   - other targets that moved beyond their margin;
   - "For Henry to review" in priority order.
6. Tag `plan7-complete`.

## 6. STATUS.md template

```
# Autonomous run 7 status

## Current
Step: <step and sub-step>
Last commit: <hash and message>
Next action: <one or two sentences>

## Checklist
- [ ] Step 0: set up (tag plan7-baseline)
- [ ] Step 1: channels (tag plan7-channels)
- [ ] Step 2: reasons for losses (tag plan7-reasons)
- [ ] Step 2b: nothing in the weekly report is lost (tag plan7-history)
- [ ] Step 3: wrap up (tag plan7-complete)

## Running jobs and state
<what is running, where its checkpoints are; never under /tmp>

## Open issues
<target, game, result, options>

## For Henry to review (non-blocking)
<one line each, newest first>

## Stopped
<empty unless a hard stop happened>
```

## 7. Out of scope

- Any change to the outcomes of the bookings scenarios (tourism, abroad, leisure); step 2b changes their UI only.
- Exit reasons for the bookings scenarios (reviews and member remarks cover them).
- A full report of all scenarios: only the three changed games run in full.
- Everything else in `docs/BACKLOG.md`.
