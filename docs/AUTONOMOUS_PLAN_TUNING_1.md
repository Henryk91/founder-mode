# Autonomous tuning plan 1: fix the open targets

This plan is written for **any coding agent**. It is self-contained apart from the rules it takes from `docs/AUTONOMOUS_PLAN_4.md`. Henry, the owner, will not review each step. You make the decisions this file leaves open, record them, and keep going.

It adds no new scenarios and no new features. It fixes open targets in two parts:

- **Part A:** the three abroad scenarios from plan 4.
- **Part B:** the targets left open from plans 2 and 3.

It runs **before** plan 5 (the leisure scenarios).

## 0. Before anything else

### 0.1 Read, in this order

1. `CLAUDE.md`, including **"Bot report budget"**. Where this plan and the budget disagree, the budget wins.
2. This file, completely.
3. `docs/tuning1/STATUS.md` if it exists. Continue from "Next action".
4. `docs/AUTONOMOUS_PLAN_4.md` section 1 (the rules this plan uses).
5. `docs/BACKLOG.md` section 3, including "Patterns across the open targets".
6. `docs/autonomous4/STATUS.md`, `docs/autonomous4/reports/final.md` and the step reports for the scenarios you are working on.
7. `docs/autonomous3/STATUS.md` and `docs/autonomous2/STATUS.md` (the older open issues and their options).
8. `docs/balancing.md` (current results for every target), and the relevant sections of `docs/decisions.md`.
9. The specs of the scenarios you are tuning, including their "values as built" and "what changed" sections.

### 0.2 Preconditions

- The tag `plan4-complete` must exist.
- The tag `plan5-baseline` must **not** exist: plan 5 must not have started.

If either check fails, write the reason in `docs/tuning1/STATUS.md` under "Stopped" and end.

## 1. Rules

Use `docs/AUTONOMOUS_PLAN_4.md` section 1 (sections 1.1 to 1.8) with these changes.

### 1.1 Names

Status in `docs/tuning1/STATUS.md`, reports in `docs/tuning1/reports/`, tags `tuning1-*`.

### 1.2 Protected games

| When | Must not change | May change |
|---|---|---|
| Always | Kantino and Zollstock, 60 weeks (fingerprint test) | |
| Part A (steps 1 to 3) | Kantino long, Gratwanderung, Hinterhof, Seeblick | The scenario of the current step. A finished abroad step's scenario must stay unchanged in later steps, unless a shared change is the reason (then re-measure all its targets and record it) |
| Part B (steps 4 and 5) | Each scenario outside the current sub-step | The scenarios the current sub-step names |

Prove "unchanged" as in plan 4: the main part on 1,000 seeds against the last committed result.

### 1.3 Tuning budget

This is a tuning plan, so the full budget applies per failing target:

- up to **3 rounds** with scenario values;
- then up to **2 rounds** with formulas;
- bot fixes do not count as rounds, but come first (judgement rule 1).

If a target still fails, record it as an open issue with the closest result and options, and continue.

### 1.4 Restating a target

Allowed only under judgement rule 7: the old wording measured the wrong thing. Write in `docs/decisions.md` what the old wording would have rewarded and why the new one is right. Then add the restated target to `docs/balancing.md`'s target list and the scenario spec.

### 1.5 "At the limit" means within the margin

A result passes "at the limit" only if the limit lies within the result's own 95% margin. Example: +1.0 ±1.6 against "at least 3" fails, because 1.0 + 1.6 is below 3.

### 1.6 Baseline

Use the results committed at `plan4-complete` (`docs/balancing.md` and `docs/autonomous4/baseline/`) as the baseline. Do not rerun anything to create one.

### 1.7 Bot runs

Only the affected scenario and the parts whose targets can move, on 1,000 seeds; 10,000 only for a target whose effect is smaller than its margin at 1,000. The full report runs once, in step 6.

## 2. Step 0: set up

1. Create `docs/tuning1/STATUS.md` from section 8.
2. Commit this file and any uncommitted docs. If other uncommitted changes exist, handle them as `docs/AUTONOMOUS_PLAN_4.md` section 1.3 says for step 0.
3. Tag `tuning1-start`.

## 3. Part A, step 1: Leinen los

Work in this order. Re-measure after each item; keep a change only if it helps its target without breaking a passing one beyond its margin.

1. **Measure owned assets fairly** (shared with Tiefgang).
   - In the bot report, results that compare money between strategies (G1, G2, D2, D3, and any "final cash" comparison) use **final cash plus the owned asset's resale value minus the loan left**. The post-mortem already computes "net of the boat"; use the same number.
   - The win condition does not change.
   - Record this as a restatement under section 1.4: the old comparison ignored a boat worth most of its price at week 104.
2. **Fix the careful bot's boat choice.** Always leasing (41.4%) beats the careful bot (30.9%) by about 10 points.
   - The careful bot should choose from expected value: weeks it expects to fill (from bookings and enquiries) times the margin per week under each option, against each option's fixed cost and risk.
   - Managing in season 1 is right only when expected weeks are few.
   - Bot fixes come first and do not use the budget.
3. **Start the run in October.**
   - Week 1 becomes the first week of October, so the first season is sold over a full winter, as real gulet operators do.
   - Check that 104 weeks still contain two nearly full seasons; use mid-September if October cuts the second season short.
   - Update the intro cards, the spec and every week-based rule (the peak rule's `byWeek`, cost steps at week 53, offers).
   - This targets T3 and G3: charters and retreats book months ahead and lose the first season today.
4. **Restate G4 as a trap with a lesson.** A minimum of six cabins loses everywhere, and that is probably right: once the boat is paid for, a half-empty cruise earns more than a cancelled one saves (food and fuel only).
   - New G4: "Sailing half-empty beats cancelling: always sailing beats a minimum of six cabins by at least 3 points, and the post-mortem shows each cancelled week's lost revenue against the costs it saved."
   - Add that post-mortem line.
5. **Content for T5 and T6.**
   - Add events for the winter selling months and for year 2, until decision news reaches the target.
   - Check that reading the inbox pays (T6), with choices whose right answer depends on what the player can see.
   - At least 15 new events, in the scenario's voice.
6. **E1.** Lower the established look's months of covering all costs (now 8) until E1 passes, but not below 5.
7. **Then, with the budget:** T3 (charters and retreats against cabin-led runs), G1 (each option best somewhere, now measured with the boat's value), G3 (holding weeks), T11 (cancellation policy).
8. **Record the money realism** in the spec's section 17:
   - the lease at 80,000;
   - your 30% for managing;
   - the 200,000 gulet with the bank lending 80%, which is optimistic for a 20-year-old boat and a new foreign-owned company. Keep it for playability and say so.
9. **Targets that do not apply** (T4, T9, T14, T15 to T18 as written): restate the ones that measure something real in this scenario (for example T4 as "first guest in the first season's first month"). Mark the rest "not applicable" with the reason in `docs/balancing.md`.

Tag `tuning1-gulet`.

## 4. Part A, step 2: Tiefgang

1. **D2 and D3** with the asset measurement from step 1.1.
2. **The careful bot against the naive bot.** Naive careful (29.9%) beats careful (25.8%). Find what the scenario-specific rules do wrong (likely the boat choice or the ladder), and fix the bot first.
3. **T3: dive clubs at about 5%.** Options, in this order:
   - let club weeks arrive with some bookings already in the pipeline at the start (organisers book this season's weeks before the run begins);
   - shorter lead times;
   - club weeks priced per group with a better margin.
4. **T2: the no-tests bot wins about a fifth.** Building everything, the boat included, is too safe. Options:
   - monthly upkeep on products nobody asks for (gear, nitrox, the pickup);
   - resort beginners less forgiving when they are not the run's market;
   - a restatement if a broad product range is legitimately strong in diving (section 1.4).
5. **T6** (+1.0 ±1.6 against at least 3) fails. Treat it as failing (section 1.5) and tune it.
6. **L2** (overborrowing): check how it was judged, and confirm pass or fail by section 1.5.

Tag `tuning1-dive`.

## 5. Part A, step 3: Rückenwind

1. **W2: never running kite trips is ahead.** Kite trips should pay where kite demand exists. Options:
   - kite demand as its own share of learners and wind regulars (people who come for kite), not taken from the segment's other bookings;
   - cheaper trip days;
   - a second van.

   Fix the bot's trip policy first.
2. **T7** and **T14** are shared with older scenarios. Leave them to step 4, but note Rückenwind's results there.
3. The careful bot is 4.7 points behind the strongest bot (41.5% against 36.8%). Check whether the strongest bot plays a legitimate strategy the careful bot should learn.

Tag `tuning1-watersports`.

## 6. Part B, step 4: targets shared by several scenarios

These change several scenarios at once. Measure every affected scenario's targets before and after.

1. **T14, staff contracts, in every tourism scenario.** The plan 2 audit found the target cannot show a contract paying, because contract bots sign only once a run is already won. Do this in order:
   1. fix the contract bots to sign when the roster has been full for several weeks, whether or not the run is won;
   2. add a contract that sleeps in the closed months, paid only while working (the Spanish fijo discontinuo; a German seasonal contract works similarly). Make it a content option, used by the seasonal scenarios;
   3. only if both fail, restate T14 under section 1.4.
2. **T7, seasonal pricing,** open in Hinterhof, Seeblick and Rückenwind (careful against price-blind about 0 to -2, target +2 to +10).
   - First measure why: is the price curve too flat near willingness to pay, does peak demand exceed capacity so price hardly matters, or does the careful bot price badly?
   - Then fix the cause, bot first.
   - Rückenwind's three seasons against the engine's two may need a shoulder price; if so, add it as a content option.
3. **O3,** no office stage is always right, in all four long modes from plan 3.
   - Stage 5 is never offered, and stage 4 is rarely taken.
   - Check whether O3 measures the wrong thing. Stages offered in under 5% of wins cannot be judged.
   - Restate or tune as section 1.4 allows.

Tag `tuning1-shared`.

## 7. Part B, step 5: older scenario targets

One sub-step per scenario. Only that scenario may change in its sub-step.

1. **Kantino long 20** (renting against hiring), **27** (reading the inbox), **32** and **33** (funding).
   - For 32 and 33, the plan 2 audit's options include: founder salary in the founder's value, and judging 33 against bootstrap.
   - The plan 3 note says four desks instead of three at the kitchen table and coworking desk would restore 32 and 33.
   - Bot fixes first, then values, then restatements under section 1.4.
2. **Hinterhof T2** (the no-tests bot wins about 16%, target under 5%) and **T7** (if step 4 did not fix it).
3. **Seeblick T6, T7** (if not fixed) and **T11**.
4. **Gratwanderung school demand.**
   - The game uses 5 to 8 groups a week at peak against the spec's estimate of 0.3 to 1.2.
   - Research how many school classes book guided outdoor days in a Bavarian Alpine region in June and July.
   - If a source supports the game's figure, update the spec and close the issue.
   - If not, record what the source says and the options.

Tag `tuning1-older`.

## 8. Step 6: wrap up

1. **The full report, once:** every scenario. Then `pnpm seeds`, and regenerate `docs/balancing.md`.
2. Docs:
   - the specs' "values as built" sections;
   - `docs/decisions.md`;
   - `docs/schema.md` if types changed;
   - `docs/BACKLOG.md`: remove what this plan closed, keep what is still open with the closest result, and update the date.
3. Final report `docs/tuning1/reports/final.md`:
   - every target that was open at the start, with before, after and status;
   - every restatement with its reason;
   - what is still open;
   - the "For Henry to review" list in priority order.
4. Tag `tuning1-complete`.

## 9. STATUS.md template

```
# Tuning run 1 status

## Current
Step: <step and sub-step>
Last commit: <hash and message>
Next action: <one or two sentences>

## Checklist
- [ ] Step 0: set up (tag tuning1-start)
- [ ] Step 1: Leinen los (tag tuning1-gulet)
- [ ] Step 2: Tiefgang (tag tuning1-dive)
- [ ] Step 3: Rückenwind (tag tuning1-watersports)
- [ ] Step 4: shared targets T14, T7, O3 (tag tuning1-shared)
- [ ] Step 5: older scenario targets (tag tuning1-older)
- [ ] Step 6: wrap up (tag tuning1-complete)

## Open issues
<target, scenario, before, closest result, options>

## For Henry to review (non-blocking)
<one line each, newest first, with a pointer into docs/decisions.md>

## Stopped
<empty unless a hard stop happened>
```

## 10. Out of scope

- New scenarios, new features, new UI. Small view or post-mortem lines that a fix needs are allowed (the G4 lesson line, a sleeping contract's row).
- Everything in `docs/BACKLOG.md` sections 1, 2 and 4.
- Plan 5.
