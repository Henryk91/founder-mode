# Autonomous plan 5: four leisure businesses in Munich (first pass)

This plan is written for **any coding agent** (Claude Code, OpenAI Codex, or another). It is self-contained: everything you need is in this file and the files it names. Henry, the owner, will not review each step. You make the decisions this file leaves open, record them, and keep going.

**First pass** means: each scenario is built, playable from start to finish, every new mechanic is visible and explained, and every target is measured. Tuning gets a limited budget (section 1.7). Targets still failing after it are open issues, not blockers.

## 0. Before anything else

### 0.1 Read, in this order

1. `CLAUDE.md`: the project rules, including **"Bot report budget"**. They apply to you whatever tool you are. Where this plan and the budget disagree, the budget wins.
2. This file, completely.
3. `docs/autonomous5/STATUS.md` if it exists: it tells you where the run is. Continue from "Next action" and do not redo finished steps.
4. `docs/leisure-mechanics.md`: the shared engine additions.
5. The four specs, in build order:
   - `docs/scenario-escape-room.md` (Ausgesperrt);
   - `docs/scenario-event-venue.md` (Fabriketage);
   - `docs/scenario-fitness.md` (Schweißperle);
   - `docs/scenario-climbing.md` (Griffig).
6. For context:
   - `docs/abroad-mechanics.md` and `docs/AUTONOMOUS_PLAN_4.md` with its final report `docs/autonomous4/reports/final.md` (plan 5 reuses courses, assets, licences and cost steps from plan 4);
   - `docs/tourism-proposal.md`, `docs/scenario-hotel.md`;
   - `docs/design/design.md`, `docs/design/established.md`;
   - `docs/balancing.md` (the tourism targets T1 to T22);
   - the latest sections of `docs/decisions.md`;
   - `docs/BACKLOG.md`.
7. The code you will extend:
   - the bookings engine (`packages/engine/src/systems/bookings.ts` and what plan 4 added);
   - `packages/content/src/schema.ts`;
   - one tourism scenario folder;
   - `packages/content/src/categories.yaml`;
   - `packages/bots/src/args.ts` (the current bot flags);
   - the tourism bot strategies in `packages/bots/src/strategies/`.

### 0.2 Is plan 4 finished?

Check for the git tag `plan4-complete`. If it is missing, stop: write the reason in `docs/autonomous5/STATUS.md` under "Stopped" and end. Plan 5 needs plan 4's courses, assets and licences.

## 1. Rules for an unattended run

### 1.1 Do not stop to ask

- Henry is not in the loop. Do not end a turn with a question or a proposal waiting for approval.
- Decide using this file and the specs. Record every decision a reasonable person could have made differently in `docs/decisions.md` under a heading for the step, with the prefix `AUTONOMOUS:`. Add one line to "For Henry to review" in STATUS.md.
- If your tool ends a session or runs out of context, the next session continues from STATUS.md. Keep it current after every commit, and short enough to read in one go.

### 1.2 Hard stops (the only reasons to stop early)

1. Tests or lint cannot be made green after three honest attempts at the same failure.
2. A change would lose player data in a way the save notices cannot cover.
3. A new scenario is unplayable after its full tuning budget: the careful bot wins under 15% or over 55%, or one strategy wins over 70%.
4. Something needs an account, a credential, a payment or a network service outside the repo.
5. A protected game changes (section 1.4) and you cannot find why after two attempts.

On a hard stop: write the reason, what you tried and the options under "Stopped" in STATUS.md, commit, and end.

### 1.3 Git

- Commit after every sub-step with a clear message. **Never push.** Henry pushes and deploys himself.
- Tag milestones locally with annotated tags (listed per step). Never push tags.
- Never rewrite history, force anything or delete branches.
- **At step 0 only:** if the working tree has changes other than the plan 5 docs, do not revert them. If lint and tests pass with them, commit them on their own with the message "Work in progress found before plan 5". Otherwise stash them (`git stash push -u -m plan5-found`) and record that in STATUS.md.
- Before later steps, the tree must be clean. Your own leftovers: generated reports or docs are committed with a message saying so; code is kept only if tests and lint pass, otherwise reverted, and you record which.

### 1.4 Protected games

**Every earlier scenario must not change in this plan at all:** Kantino and Zollstock (60 weeks), Kantino long, Gratwanderung, Hinterhof, Seeblick, Rückenwind, Tiefgang and Leinen los.

- The 60 week content fingerprints are locked by a test; keep it green.
- Every engine addition is off unless a scenario's YAML switches it on (`docs/leisure-mechanics.md` section 1).
- Prove it after every step that touches the engine, shared content or shared bot code: the main part of each protected game on 1,000 seeds must match the step 0 baseline exactly, apart from timings. The engine is deterministic, so this is proof; 10,000 seeds are never needed for it.
- Bump the engine version only if replaying an existing save could give a different game. It should not.

### 1.5 Engine and content rules (from CLAUDE.md, repeated because they matter most)

- The engine is pure and deterministic: no `Math.random`, `Date` or locale functions in `packages/engine`. Use the PRNG in state, and never mutate inputs.
- The UI only receives `PlayerView`. No hidden values or probabilities on screen.
- Numbers and texts live in `packages/content` YAML, validated with zod. Interface strings go in the labels table, by `uiStage`.
- Money in integer cents, time in hours. Tap only. Phone first.
- Saves are seed plus action log, with engine version and content fingerprint.
- Game text: British English, dry humour, 2 to 4 sentences per message, no em dashes or en dashes, fictional names only. Real places in Munich may be named; real businesses, venues, gyms, clubs and brands may not.
- `docs/schema.md` changes in the same commit as any type change.

### 1.6 Measuring, within the bot report budget

Read `packages/bots/src/args.ts` for the current flags.

| When | Run | Seeds |
|---|---|---|
| Step 0 baseline, and after any engine, shared content or shared bot change | `--parts main` for each protected game: the 60 week games without `--mode`, the long games with `--mode long --scenario <id>` | 1,000, `--seed-prefix test` |
| Tuning a new scenario | `--scenario <id> --mode long --parts <only the parts whose targets can move>` | 1,000; 10,000 only for a target being tuned whose effect is smaller than its margin at 1,000 |
| A new scenario's events, once they are written | `--scenario <id> --mode long --parts events` | 1,000 |
| Step 6 only | The full report, once | As in `CLAUDE.md` |

- Never run the full report before step 6, and never rerun a run to re-confirm what an earlier run showed.
- Before any run expected to take longer than 15 minutes, check this table and the budget in `CLAUDE.md`.
- Every report says which parts and how many seeds were run.
- A result within its own 95% margin of a limit counts as "at the limit" and passes. Say so when you report it.

### 1.7 Judgement rules

1. When a target fails, first check that the bots play the new mechanic sensibly. Fix bots before game values.
2. Never judge a difference smaller than its margin.
3. Measure contributions (switch one thing off at a time) before changing things.
4. Every new player option must be right in some situations and wrong in others. An option that always wins is a chore; one that never wins is a trap, allowed only if it teaches a named lesson the post-mortem explains (the VR room, the roof terrace, the recovery room and the speed wall are such traps).
5. The player must be able to learn the right call from what is on screen.
6. Money must be believable for Munich. Research and cite figures in the spec's sources section, or keep them labelled "estimate".
7. Never restate a target because a result missed it. Restate only when the old wording measured the wrong thing, and write down what it would have rewarded.
8. **Which tourism targets apply:** at the start of each scenario step, decide which of T1 to T18 and E1 apply to that scenario (for example T11 needs a cancellation policy), record the list and the reasons in `docs/decisions.md`, and measure those. T4 is measured from the opening week.
9. **First pass tuning budget, per failing target:** up to 2 rounds with scenario values, then 1 round with formulas. If it still fails, record it as an open issue with the closest result and options, and continue.

### 1.8 Reports

At the end of each step, write `docs/autonomous5/reports/<step>.md`. It covers:

- what changed;
- every target with its result and status (pass, at the limit, fail);
- decisions taken and open issues;
- how the protected games were proven unchanged, with parts and seeds.

## 2. Step 0: set up and baseline

1. Create `docs/autonomous5/STATUS.md` from section 8 if it does not exist.
2. Handle a dirty working tree as in section 1.3.
3. Commit the plan 5 docs if not committed: this file, `docs/leisure-mechanics.md` and the four specs.
4. Run the baseline (section 1.6, first row) and record it in `docs/autonomous5/reports/step0-baseline.md`.
5. Tag `plan5-baseline`.

## 3. Step 1: shared engine additions

Build `docs/leisure-mechanics.md`.

1. **Slots and crowding** (section 2): slots, `slotShare`, capacity per slot, hard and soft capacity, load words, turned-away counts.
2. **Memberships** (section 3): the contract types as products, joining peaks, usage by slot, churn drivers including the January fade, 12-month terms, class packs as owed visits, intro offers.
3. **The aggregator** (section 4): joining and leaving, slots open to it, payout per check-in, visit caps, cannibalisation, the corporate effect.
4. **Freshness** (section 5): decay by use or by time, the local pool for escape rooms, refresh by rebuild or by setting hours, words on screen.
5. **Date holds** (section 6): holds with a policy, conversion, late releases.
6. **Build-out** (section 7): build-out products with weeks, closed areas, the start choice message, the opening week (and targets measured from it).
7. **Category:** `leisure` in `categories.yaml`.
8. **View fields and post-mortem lines** for all of the above (section 9), with no UI yet beyond what tests need.
9. **Tests:**
   - slots: capacity, crowding, turning away;
   - memberships: joins, churn drivers, terms, packs as owed visits;
   - the aggregator: payout, caps, cannibalisation, slot limits;
   - freshness and refresh;
   - holds: policy, conversion, late releases;
   - build-out and opening;
   - determinism, and replay of a saved game.

   Use a small test scenario fixture, not the real specs.
10. Prove the protected games unchanged (section 1.6).

Tag `plan5-engine`.

## 4. Steps 2 to 5: the four scenarios

Build them in this order, one step each. Each step follows the same sub-steps.

| Step | Scenario id | Name shown | Spec | Tags | Accent | Tag when done |
|---|---|---|---|---|---|---|
| 2 | `ausgesperrt` | Ausgesperrt | `docs/scenario-escape-room.md` | `Rooms`, `Bookings` | `#5B2A86` | `plan5-escape` |
| 3 | `fabriketage` | Fabriketage | `docs/scenario-event-venue.md` | `Events`, `Bookings` | `#7A3E1D` | `plan5-venue` |
| 4 | `schweissperle` | Schweißperle | `docs/scenario-fitness.md` | `Members`, `Classes` | `#B0284F` | `plan5-fitness` |
| 5 | `griffig` | Griffig | `docs/scenario-climbing.md` | `Members`, `Build-out` | `#2F6B3A` | `plan5-climbing` |

Sub-steps for each:

1. **Targets:** decide which of T1 to T18 and E1 apply (section 1.7.8) and record them.
2. **Content:**
   - `about.yaml`: category `leisure`, the tags above, the two sheet lines;
   - `scenario.yaml`, `features.yaml`;
   - messages: intro cards, at least 40 events, interview quotes;
   - labels for `scrappy`, `organised` and `established`;
   - stages 1 and 2 with their offers.

   Check that white text on the accent reaches 4.5:1, and adjust the shade if not.
3. **Research:** check the figures marked (est.) where a current Munich source exists (rents, prices, wages, equipment, platform fees) and cite them in the spec's sources section. Keep "estimate" where nothing current is found.
4. **Drawings:** the stage scenes in the app's scene format, same size and style as the existing scenes.
5. **Bots:** the careful bot plays the scenario's mechanics as `docs/leisure-mechanics.md` section 10 says. Add the target bots the spec's targets name.
6. **UI**, following `docs/design/design.md` and the existing tourism screens; no new look:
   - load per slot;
   - members and cancellations;
   - the aggregator card;
   - freshness words;
   - the hold calendar (venue);
   - the timetable (fitness);
   - the build-out choice and progress (escape room and climbing).

   Checks:
   - notebook rules hold; no cut-off text; the tourism word check passes, extended to leisure if it needs to be;
   - axe is clean at 375, 390, 430 and 1440 px in Chromium and WebKit.

   Keep screenshots at 390 and 1440 px outside the repo and say where.
7. **Tests** for the scenario's content loading, its offers, and one full run per bot without errors.
8. **Tune** against the targets with the budget of section 1.7.9. Run the event table once at the end of the step.
9. Update the spec's sources section with every value changed and why.
10. Prove the protected games and the earlier leisure scenarios unchanged (main part, 1,000 seeds) if this step touched shared code.

## 5. Engine gaps found later

If a scenario step needs an engine change that step 1 did not build, make it in that step, behind a content switch. Then prove every protected game and every earlier leisure scenario unchanged, and record the change in the step report.

## 6. Step 6: wrap up

1. Revisit every open issue of this plan once, with a fresh budget of 2 rounds each.
2. **The full report, once** (the only full run of this plan): every scenario, including the four new ones. Then `pnpm seeds`, and regenerate `docs/balancing.md`.
3. Docs:
   - `CLAUDE.md` reference docs list (the five new docs);
   - `docs/IMPLEMENTATION_PLAN.md` (the leisure scenarios and the new mechanics);
   - `README.md`;
   - `docs/schema.md`;
   - `docs/decisions.md`;
   - each new spec's sources section;
   - `docs/BACKLOG.md`: add this plan's open issues and anything left out, remove what this plan built, and update the date.
4. Final report `docs/autonomous5/reports/final.md`:
   - what was built;
   - every target in every new scenario with its status;
   - proof that the protected games are unchanged;
   - open issues;
   - the "For Henry to review" list in priority order.
5. Tag `plan5-complete`.

## 7. Out of scope

Do not start these. If one becomes necessary, record why in STATUS.md and do the minimum. All of them are tracked in `docs/BACKLOG.md`.

- Office stages 3 to 5 for the leisure scenarios.
- A second location for any of them (a second studio, a second gym).
- Full gyms with machines (the fitness studio is classes only).
- Personal training, physiotherapy or a shop as products.
- A real booking or access-control integration.
- New mockups or a new visual style.
- Changes to earlier scenarios, and their balancing.
- Everything on the out of scope list in `docs/IMPLEMENTATION_PLAN.md`, `docs/AUTONOMOUS_PLAN_3.md` section 8 and `docs/AUTONOMOUS_PLAN_4.md` section 9.

## 8. STATUS.md template

```
# Autonomous run 5 status

## Current
Step: <step and sub-step>
Last commit: <hash and message>
Next action: <one or two sentences>

## Checklist
- [ ] Step 0: set up and baseline (tag plan5-baseline)
- [ ] Step 1: shared engine additions (tag plan5-engine)
- [ ] Step 2: Ausgesperrt (tag plan5-escape)
- [ ] Step 3: Fabriketage (tag plan5-venue)
- [ ] Step 4: Schweißperle (tag plan5-fitness)
- [ ] Step 5: Griffig (tag plan5-climbing)
- [ ] Step 6: wrap up (tag plan5-complete)

## Open issues
<target, scenario, closest result, options>

## For Henry to review (non-blocking)
<one line each, newest first, with a pointer into docs/decisions.md>

## Stopped
<empty unless a hard stop happened>
```
