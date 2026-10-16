# Autonomous plan 4: three tourism scenarios abroad (first pass)

This plan is written for **any coding agent** (Claude Code, OpenAI Codex, or another). It is self-contained: everything you need is in this file and the files it names. Henry, the owner, will not review each step. You make the decisions this file leaves open, record them, and keep going.

**First pass** means: each scenario is built, playable from start to finish, every new mechanic is visible and explained, and every target is measured. Tuning gets a limited budget (section 1.7). Targets still failing after it are open issues, not blockers.

## 0. Before anything else

### 0.1 Read, in this order

1. `CLAUDE.md`: the project rules, including **"Bot report budget"**. They apply to you whatever tool you are. Where this plan and the budget disagree, the budget wins.
2. This file, completely.
3. `docs/autonomous4/STATUS.md` if it exists: it tells you where the run is. Continue from "Next action" and do not redo finished steps.
4. `docs/abroad-mechanics.md`: the shared engine additions.
5. The three specs, in build order: `docs/scenario-watersports.md` (Rückenwind), `docs/scenario-dive.md` (Tiefgang), `docs/scenario-gulet.md` (Leinen los).
6. For context: `docs/tourism-proposal.md`, `docs/scenario-outdoor.md`, `docs/scenario-hotel.md` (sections 14 to 16 of each show how values changed while tuning), `docs/office-stages.md`, `docs/design/design.md`, `docs/design/established.md`, `docs/balancing.md` (the tourism targets T1 to T22), the latest sections of `docs/decisions.md`.
7. The code you will extend: `packages/engine/src/systems/bookings.ts`, `packages/content/src/schema.ts`, one existing tourism scenario folder (`packages/content/src/scenarios/seeblick/`), `packages/content/src/categories.yaml`, `packages/bots/src/args.ts` (the current bot flags), and the tourism bot strategies in `packages/bots/src/strategies/`.

### 0.2 Is plan 3 finished?

Check for the git tag `plan3-complete`. If it is missing, stop: write the reason in `docs/autonomous4/STATUS.md` under "Stopped" and end. Plan 4 builds on the office stages and the established look.

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
- **At step 0 only:** if the working tree has changes other than the plan 4 docs, do not revert them. If lint and tests pass with them, commit them on their own with the message "Work in progress found before plan 4". Otherwise stash them (`git stash push -u -m plan4-found`) and record that in STATUS.md.
- Before later steps, the tree must be clean. Your own leftovers: generated reports or docs are committed with a message saying so; code is kept only if tests and lint pass, otherwise reverted, and you record which.

### 1.4 Protected games

**Kantino and Zollstock (60 weeks), Kantino long, Gratwanderung, Hinterhof and Seeblick must not change in this plan at all.**

- The 60 week content fingerprints are locked by a test; keep it green.
- Every engine addition is off unless a scenario's YAML switches it on (`docs/abroad-mechanics.md` section 1).
- Prove it after every step that touches the engine, shared content or shared bot code: the main part of each protected game on 1,000 seeds must match the step 0 baseline exactly, apart from timings. The engine is deterministic, so this is proof; 10,000 seeds are never needed for it.
- Bump the engine version only if replaying an existing save could give a different game. It should not.

### 1.5 Engine and content rules (from CLAUDE.md, repeated because they matter most)

- The engine is pure and deterministic: no `Math.random`, `Date` or locale functions in `packages/engine`. Use the PRNG in state, and never mutate inputs.
- The UI only receives `PlayerView`. No hidden values or probabilities on screen.
- Numbers and texts live in `packages/content` YAML, validated with zod. Interface strings go in the labels table, by `uiStage`.
- Money in integer cents, time in hours. Tap only. Phone first.
- Saves are seed plus action log, with engine version and content fingerprint.
- Game text: British English, dry humour, 2 to 4 sentences per message, no em dashes or en dashes, fictional names only (the specs list the exceptions: real places, and the Zenobia wreck).
- No humour built on national stereotypes. The locals in these scenarios are business partners, staff and officials, written as people.
- `docs/schema.md` changes in the same commit as any type change.

### 1.6 Measuring, within the bot report budget

Read `packages/bots/src/args.ts` for the current flags. The forms below were current when this plan was written.

| When | Run | Seeds |
|---|---|---|
| Step 0 baseline, and after any engine, shared content or shared bot change | `--parts main` for each protected game: the 60 week games without `--mode`, the long games with `--mode long --scenario <id>` | 1,000, `--seed-prefix test` |
| Tuning a new scenario | `--scenario <id> --mode long --parts <only the parts whose targets can move>` | 1,000; 10,000 only for a target being tuned whose effect is smaller than its margin at 1,000 |
| A new scenario's events, once they are written | `--scenario <id> --mode long --parts events` | 1,000 |
| Step 5 only | The full report, once | As in `CLAUDE.md` |

- Never run the full report before step 5, and never rerun a run to re-confirm what an earlier run showed.
- Before any run expected to take longer than 15 minutes, check this table and the budget in `CLAUDE.md`.
- Every report says which parts and how many seeds were run.
- A result within its own 95% margin of a limit counts as "at the limit" and passes. Say so when you report it.

### 1.7 Judgement rules

1. When a target fails, first check that the bots play the new mechanic sensibly. Fix bots before game values.
2. Never judge a difference smaller than its margin.
3. Measure contributions (switch one thing off at a time) before changing things.
4. Every new player option must be right in some situations and wrong in others. An option that always wins is a chore; one that never wins is a trap, allowed only if it teaches a named lesson the post-mortem explains (the eFoil fleet, technical diving and the luxury refit are such traps).
5. The player must be able to learn the right call from what is on screen.
6. Money must be believable for the place. Research and cite figures in the spec's sources section, or keep them labelled "estimate".
7. Never restate a target because a result missed it. Restate only when the old wording measured the wrong thing, and write down what it would have rewarded.
8. **First pass tuning budget, per failing target:** up to 2 rounds with scenario values, then 1 round with formulas. If it still fails, record it as an open issue with the closest result and options, and continue.

### 1.8 Reports

At the end of each step, write `docs/autonomous4/reports/<step>.md`. It covers:

- what changed;
- every target with its result and status (pass, at the limit, fail);
- decisions taken and open issues;
- how the protected games were proven unchanged, with parts and seeds.

## 2. Step 0: set up and baseline

1. Create `docs/autonomous4/STATUS.md` from section 8 if it does not exist.
2. Handle a dirty working tree as in section 1.3.
3. Commit the plan 4 docs if not committed: this file, `docs/abroad-mechanics.md`, the three specs and `docs/BACKLOG.md`.
4. Run the baseline (section 1.6, first row) and record it in `docs/autonomous4/reports/step0-baseline.md`.
5. Tag `plan4-baseline`.

## 3. Step 1: shared engine additions

Build `docs/abroad-mechanics.md` sections 2, 3, 5, 6 and 7. Section 4 (assets) waits for step 3, where its first real user is.

1. **Day conditions** (section 2): states, slots, monthly tables, persistence, forecast, `runsIn`, moving and cancelling bookings, alternatives, the whole-week review effect with shelter. A scenario has `weather` or `conditions`, never both.
2. **Courses and progression** (section 3): course slots, levels, `requires`, graduate pools by segment, level and channel, same-stay and next-season demand, platform guests excluded from next season.
3. **Day trips** (section 5): a whole instructor day, an asset per trip, the trip spot's own conditions, the trip policy, wasted trips.
4. **Licences and concessions** (section 6): `waitWeeks` on products; concession fees with a term; the tender event with its choices.
5. **Abroad framing** (section 7): cost steps on fixed costs, unit costs and role pay. If the Start screen needs anything for a third tag, do it, but `about.yaml` tags should already carry "Abroad".
6. **View fields and post-mortem lines** for all of the above (section 8), with no UI yet beyond what tests need.
7. **Tests:**
   - conditions: draws, forecast accuracy, moving, cancelling under both policies, alternatives, the review effect;
   - courses: slots, levels gating products, progression shares, the platform exclusion;
   - trips: the policy, wasted trips;
   - licences: waiting, the tender;
   - cost steps;
   - determinism, and replay of a saved game.

   Use a small test scenario fixture, not the real specs.
8. Prove the protected games unchanged (section 1.6).

Tag `plan4-engine`.

## 4. Step 2: Rückenwind (watersports, Mallorca)

Build `docs/scenario-watersports.md`. Scenario id `rueckenwind`; the name shown is "Rückenwind".

1. **Content:** `about.yaml` (category `tourism`, tags `Abroad` and `Wind`, the two sheet lines), `scenario.yaml`, `features.yaml`, messages (intro cards, at least 40 events, interview quotes), and labels for `scrappy`, `organised` and `established`. The established accent is `#1F6A86` (check white text on it reaches 4.5:1, and adjust if not). Stages 1 and 2 with their offers.
2. **Research:** check the figures marked (est.) where a current source exists (prices of schools on the bay, gear prices, the platform's commission, wages, the beach licence) and cite them in the spec's section 17. Keep "estimate" where nothing current is found.
3. **Drawings:** the two stage scenes in the app's scene format, same size and style as the existing scenes.
4. **Bots:** the careful tourism bot plays conditions (products for the forecast), courses (pushing graduates to direct channels), the trip policy (from bookings and forecast) and the tender (bid higher when the spot carries the business). Add the target bots: wind only, calm only, `trips_always`, `trips_never`, no courses, tender always higher, tender as before, eFoil in spring.
5. **UI**, following `docs/design/design.md` and the existing tourism screens; no new look:
   - the forecast strip on the plan, and the "Runs on N of 7 afternoons" label per product line;
   - the trip policy row;
   - graduates on the bookings screen;
   - conditions in the results;
   - the tender message.

   Checks:
   - notebook rules hold; no cut-off text; the tourism word check passes;
   - axe is clean at 375, 390, 430 and 1440 px in Chromium and WebKit.

   Keep screenshots at 390 and 1440 px outside the repo and say where.
6. **Tests** for the scenario's content loading, its offers, and one full run per bot without errors.
7. **Tune** against T1 to T18, E1 and W1 to W5 (spec section 16), with the budget of section 1.7.8. Run the event table once at the end of the step.
8. Update the spec's section 17 with every value changed and why.

Tag `plan4-watersports`.

## 5. Step 3: assets, then Tiefgang (diving, Cyprus)

1. **Engine: assets with three options** (`docs/abroad-mechanics.md` section 4):
   - the choice message;
   - buy, lease and share terms;
   - breakdowns and repairs;
   - winter haul-outs;
   - the switch offer each winter, with notice terms;
   - a local company as a licence before buying;
   - the loan item;
   - the post-mortem's asset lines (value at the start and the end, loan left, a sale's proceeds).

   Then:
   - tests for each option, breakdowns, switching, the company wait and determinism;
   - prove the protected games unchanged, and Rückenwind too (its main part on 1,000 seeds, against its step 2 result).

   Use the rescue boat in Rückenwind only if it fits without changing that scenario's results; otherwise leave it as a product.
2. **Content** for `docs/scenario-dive.md`:
   - scenario id `tiefgang`, name shown "Tiefgang";
   - tags `Abroad` and `Boats`;
   - accent `#1E4E79` (check 4.5:1);
   - stages 1 and 2, the licence, the boat choice;
   - labels for all three UI stages, and at least 40 events.
3. **Research and sources** as in step 2.
4. **Drawings:** the two stage scenes.
5. **Bots:**
   - the careful bot climbs the ladder;
   - it chooses the boat from expected demand (seats first, then a lease or a purchase once a season shows the trips it can fill);
   - target bots: certified only, no courses, `always_buy`, `always_lease`, `always_share`.
6. **UI:**
   - the boat card on the Finance tab (option, costs, capacity, condition, next haul-out, the switch offer);
   - the ladder on the bookings screen (try dives to courses to the wreck);
   - the conditions strip from step 2.

   Same checks as step 2.
7. **Tests**, **tuning** (T1 to T18, E1, D1 to D4) and the event table, as in step 2.

Tag `plan4-dive`.

## 6. Step 4: Leinen los (gulet, Fethiye)

1. **Engine, only what the gulet adds** (behind content switches):
   - weeks sold whole or by cabin, held for a charter;
   - the minimum to sail, with cancellation 3 weeks out, refunds or a paid move;
   - friction on mixed weeks, and themed weeks;
   - the whole-week review effect of conditions, with the sheltered route;
   - the manage option's peak week rule (July and August released only after enough shoulder weeks are sold).

   Then tests, and prove the protected games, Rückenwind and Tiefgang unchanged.
2. **Content** for `docs/scenario-gulet.md`:
   - scenario id `leinenlos`, name shown "Leinen los";
   - tags `Abroad` and `Boats`;
   - accent `#8A4B2A` (check 4.5:1);
   - the three offers, the crew roles (used only when owning), the local cost steps;
   - labels for all three UI stages, and at least 40 events.
3. **Research and sources** as in step 2. Verify the local company requirement and the boat prices as far as public sources allow.
4. **Drawings:**
   - the harbour office desk scene;
   - a simple side view of a two-masted wooden gulet for the boat card.
5. **Bots:**
   - the careful bot manages in the first season and moves to a lease or a purchase only on evidence (weeks filled, the margin it would have made);
   - it holds peak weeks for charters only when charter requests are coming in;
   - it sets the minimum to sail from bookings;
   - target bots: `always_manage`, `always_lease`, `always_buy`, hold every peak week, never hold, always sail, sail only at 6 or more.
6. **UI:**
   - a season calendar of the cruise weeks (open, held, chartered, cabins sold of 8), reusing the Occupancy component where it fits;
   - the boat card;
   - the minimum to sail setting;
   - the offer messages.

   Same checks as step 2.
7. **Tests**, **tuning** (T1 to T18 where they apply, E1, G1 to G4) and the event table, as in step 2.

Tag `plan4-gulet`.

## 7. Step 5: wrap up

1. Revisit every open issue of this plan once, with a fresh budget of 2 rounds each.
2. **The full report, once** (the only full run of this plan): every scenario, including the three new ones. Then `pnpm seeds`, and regenerate `docs/balancing.md`.
3. Docs:
   - `CLAUDE.md` reference docs list (the four new docs);
   - `docs/IMPLEMENTATION_PLAN.md` (abroad scenarios and the new mechanics);
   - `README.md`;
   - `docs/schema.md`;
   - `docs/decisions.md`;
   - each new spec's sources section;
   - `docs/BACKLOG.md`: add this plan's open issues and anything left out, remove what this plan built, and update the date.
4. Final report `docs/autonomous4/reports/final.md`:
   - what was built;
   - every target in every new scenario with its status;
   - proof that the protected games are unchanged;
   - open issues;
   - the "For Henry to review" list in priority order.
5. Tag `plan4-complete`.

## 8. STATUS.md template

```
# Autonomous run 4 status

## Current
Step: <step and sub-step>
Last commit: <hash and message>
Next action: <one or two sentences>

## Checklist
- [ ] Step 0: set up and baseline (tag plan4-baseline)
- [ ] Step 1: shared engine additions (tag plan4-engine)
- [ ] Step 2: Rückenwind (tag plan4-watersports)
- [ ] Step 3: assets and Tiefgang (tag plan4-dive)
- [ ] Step 4: Leinen los (tag plan4-gulet)
- [ ] Step 5: wrap up (tag plan4-complete)

## Open issues
<target, scenario, closest result, options>

## For Henry to review (non-blocking)
<one line each, newest first, with a pointer into docs/decisions.md>

## Stopped
<empty unless a hard stop happened>
```

## 9. Out of scope

Do not start these. If one becomes necessary, record why in STATUS.md and do the minimum. All of them, and the older backlog, are tracked in `docs/BACKLOG.md`.

- A second boat, office stages 3 to 5 for the new scenarios, and office stages beyond stage 1 for Leinen los.
- A currency system or exchange rates.
- Motorised watersports (water skiing, towed rides, jet skis).
- A choice of base for the dive centre (Larnaca or Protaras).
- Package travel law and insolvency insurance for the gulet.
- New mockups or a new visual style.
- Changes to the existing scenarios, and their balancing.
- Everything on the out of scope list in `docs/IMPLEMENTATION_PLAN.md` and `docs/AUTONOMOUS_PLAN_3.md` section 8.
