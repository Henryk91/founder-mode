# Autonomous plan 3: office stages and the established UI

This plan is written for **any coding agent** (Claude Code, OpenAI Codex, or another). It is self-contained: everything you need to run it is in this file and the files it names. Henry, the owner, will not review each step. You make the decisions this file leaves open, record them, and keep going.

## 0. Before anything else

### 0.1 Read, in this order

1. `CLAUDE.md`: the project rules. They apply to you whatever tool you are. (`AGENTS.md` points to the same file.)
2. This file, completely.
3. `docs/autonomous3/STATUS.md` if it exists: it tells you where the run is. Continue from "Next action" and do not redo finished steps.
4. `docs/office-stages.md` and `docs/design/established.md`: the two specs this plan builds.
5. The mockups: `docs/design/office-stages.html`, `docs/design/established-desk-v2.html`, `docs/design/established-phone.html`. Open them in a browser or read their markup.
6. `docs/design/design.md`, `docs/decisions.md` (skim the latest sections), `docs/balancing.md` (the current targets), `docs/IMPLEMENTATION_PLAN.md`.

### 0.2 Is plan 2 finished?

Look for the git tag `plan2-complete` (`git tag --list 'plan2-*'`).

- If it exists, start with step 0 below.
- If it does not exist, **finish plan 2 first**: read `docs/AUTONOMOUS_PLAN_2.md` and `docs/autonomous2/STATUS.md`, and follow plan 2 from its "Next action" until it is tagged `plan2-complete`. Plan 2 refers to rules in `docs/AUTONOMOUS_PLAN.md`; section 1 of this file restates them, so you can follow plan 2 with this file's rules. Then come back here.

## 1. Rules for an unattended run

### 1.1 Do not stop to ask

- Henry is not in the loop. Do not end a turn with a question or a proposal waiting for approval.
- Decide using this file and the specs. Record every decision a reasonable person could have made differently in `docs/decisions.md` under a heading for the step, with the prefix `AUTONOMOUS:`, and add one line to "For Henry to review" in STATUS.md.
- If your tool ends a session or runs out of context, the next session continues from STATUS.md. Keep it current after every commit and short enough to read in one go.

### 1.2 Hard stops (the only reasons to stop early)

1. Tests or lint cannot be made green after three honest attempts at the same failure.
2. A change would lose player data in a way the save notices cannot cover.
3. A scenario becomes unplayable after the full tuning budget: the careful bot wins under 15% or over 55%, or one strategy wins over 70%.
4. Something needs an account, a credential, a payment or a network service outside the repo.
5. A protected game changes (section 1.4) and you cannot find why after two attempts.

On a hard stop: write the reason, what you tried and the options under "Stopped" in STATUS.md, commit, and end.

### 1.3 Git

- Commit after every sub-step with a clear message. **Never push.** Henry pushes and deploys himself.
- Tag milestones locally with annotated tags (listed per step). Never push tags.
- Never rewrite history, force anything or delete branches.
- Before a step, make sure the working tree is clean. Leftover generated reports or docs: commit them with a message saying so. Leftover code: keep it only if tests and lint pass, otherwise revert it, and record which.

### 1.4 Protected games

- **Kantino and Zollstock, 60 weeks: must not change in this plan at all.** Their content fingerprints are locked by a test; keep that test green. Prove it at the end of every step that touches the engine, shared content or bots: run the gate (section 1.6) and compare with `docs/balancing.md`. Numbers must match apart from timings.
- **Kantino long, Gratwanderung, Hinterhof, Seeblick:** may change in steps 1 and 2 only. From the end of step 2 they are protected again, and step 3 (UI) must not change them.

### 1.5 Engine and content rules (from CLAUDE.md, repeated because they matter most)

- The engine is pure and deterministic: no `Math.random`, `Date` or locale functions in `packages/engine`; use the PRNG in state; never mutate inputs.
- The UI only receives `PlayerView`. No hidden values or probabilities on screen.
- Numbers and texts live in `packages/content` YAML, validated with zod. Interface strings in the labels table, by `uiStage`.
- Money in integer cents, time in hours. Tap only. Phone first.
- Saves are seed plus action log with engine version and content fingerprint. Bump the engine version when replaying an old log could give a different game.
- Game text: British English, dry humour, 2 to 4 sentences per message, no em dashes or en dashes, fictional names only.
- `docs/schema.md` changes in the same commit as any type change.

### 1.6 Measuring

- Commands: `pnpm install`, `pnpm test`, `pnpm lint`, `pnpm dev`, `pnpm bots` (balancing report), `pnpm seeds` (seeds per ending, after engine, content or bot changes).
- The full gate as used in plan 2 (about 1 h 45 min on 9 processes):
  - `pnpm bots --runs 1000 --wide-runs 10000 --seed-prefix test --events` (both 60 week scenarios)
  - `pnpm bots --scenario kantino --mode long --runs 1000 --wide-runs 10000 --seed-prefix test --parts main,paired,inbox,team,funding,events`
  - `pnpm bots --scenario <gratwanderung|hinterhof|seeblick> --mode long --runs 1000 --wide-runs 10000 --seed-prefix test --events`
  - If a flag has changed since, read `packages/bots` and the latest step report in `docs/autonomous2/reports/` for the current form.
- During tuning, run only the parts affected, never the event table. 10,000 seeds for targets judged on small differences, 1,000 for the rest.
- A result within its own 95% margin of a limit counts as "at the limit" and passes. Say so when you report it.

### 1.7 Judgement rules (apply them where Henry used to review)

1. When a target fails after a mechanics change, first check that the bots play the new system sensibly. Fix bots before game values.
2. Never judge a difference smaller than its margin.
3. Measure contributions (switch one thing off at a time) before changing things.
4. Every new player option must be right in some situations and wrong in others. An option that always wins is a chore; one that never wins is a trap, allowed only if it teaches a named lesson the post-mortem explains.
5. The player must be able to learn the right call from what is on screen.
6. Money must be believable for Munich and Bavaria. Research and cite figures, or label them "estimate".
7. Never restate a target because a result missed it. Restate only when the old wording measured the wrong thing, and write down what it would have rewarded.
8. Tuning budget per goal: up to 3 rounds with scenario values, then up to 2 rounds with formulas. If a target still fails, record it as an open issue with the closest result and options, and continue.

### 1.8 Reports

At the end of each step write `docs/autonomous3/reports/<step>.md`: what changed, every target with its result and status (pass, at the limit, fail), decisions taken, open issues, and how the protected games were proven unchanged.

## 2. Step 0: set up and baseline

1. Create `docs/autonomous3/STATUS.md` from section 7 if it does not exist.
2. Commit the new docs if not committed (`docs/AUTONOMOUS_PLAN_3.md`, `docs/office-stages.md`, `docs/design/established.md`, the three mockups, `AGENTS.md`).
3. Run the full gate (1.6) and record the baseline in `docs/autonomous3/reports/step0-baseline.md`.
4. Tag `plan3-baseline`.

## 3. Step 1: office stages 3 to 5 (long mode)

Build `docs/office-stages.md`.

1. **Engine (general):** stages as scenario content with: name, desks or capacity effects, rent, one-off cost, move-in weeks, offer condition, effects. Offer by inbox event, accept or decline, move-in period, give notice (3 months, deposit back, stage drops by one). Desks limit hires in Kantino long. Optional loan financing through the bank's plan in scenarios with a bank. View fields for the Office card. Post-mortem lines.
2. **Content:** the stages of section 3 of the spec for Kantino long, Gratwanderung, Hinterhof and Seeblick, with offer events in each scenario's voice (each states its condition and costs) and results lines. Check and cite the (est.) figures where you can.
3. **Drawings:** redraw the twelve scenes from `docs/design/office-stages.html` in the app's scene format, same size and style as the existing scenes.
4. **Bots:** stage rules for the careful bot (move when the condition the spec names is real: desks full, guests turned away, a sustained profit), plus `never_move` and `always_move` variants for targets O1 and O2. Every other bot keeps its behaviour unless a stage blocks it (desks).
5. **UI:** the Office section in the plan and the Office card on the money tab, in the current scrappy and organised styles (the established style comes in step 3). Notebook rules hold; no cut-off text; axe clean at 375, 390, 430 and 1440 px in Chromium and WebKit.
6. **Tests:** offer conditions, accept, move-in, notice, desks blocking a hire, loan financing of a stage, determinism, post-mortem lines.

Do not tune beyond keeping each scenario playable. Report every long mode target before and after. Protected: the 60 week games. Tag `plan3-stages`.

## 4. Step 2: retune long mode with office stages

1. Targets O1 to O5 from the spec, in each long mode scenario.
2. All existing targets of Kantino long and the three tourism scenarios. The open issues carried from plan 2 stay open issues; this step must not make any of them worse.
3. Kantino long specifically: desks now limit hiring. Check targets 20 and 29 (hiring) and the funding targets 31 to 37 still hold, or are no worse.
4. Use the tuning budget (1.7.8). Record open issues.
5. Full gate, `pnpm seeds`, regenerate `docs/balancing.md`.

From the end of this step, all long mode scenarios are protected. Tag `plan3-tuned`.

## 5. Step 3: the established UI stage

Build `docs/design/established.md` from the mockups. This step changes no game logic or values: the gate must show every scenario unchanged.

1. `uiStage` gains `established`, reached the week a move into office stage 4 completes; it never goes back. A results line marks the switch.
2. Tokens in `apps/web/src/theme/established.css`; Bricolage Grotesque bundled via @fontsource with a Latin-1 subset (as the other fonts are); accent per scenario, white text on it at least 4.5:1.
3. Every screen in the established style, phone and desktop, following the component mapping in the spec: top bar, metrics band, Inbox, This week (plan as a form), Pipeline, Market, Finance (Cash flow, Office, Cap table, Invoices, Loan), Occupancy for tourism, results screen, post-mortem, Help.
4. Labels: an `established` set for every long mode scenario, starting from the spec's table.
5. A dev-only preview of the stage (not in the production build).
6. Checks: axe clean, no sideways scrolling, no cut-off text, tourism word check, notebook test equivalents for the form (rows at least 44 px, controls on their card), all at 375, 390, 430 and 1440 px in Chromium and WebKit. Screenshots of each scenario in the established stage at 390 and 1440 px, kept outside the repo; say where.
7. First load: the established CSS and font load only when needed, so the Start screen's LCP stays under 2.5 s on the emulated mid range phone.
8. Add a short section to `docs/design/design.md` pointing to `established.md`, and mark `desk-established.html` as superseded.

Tag `plan3-established`.

## 6. Step 4: wrap up

1. Revisit every open issue from this plan once, with a fresh budget of 3 rounds each.
2. Full gate, `pnpm seeds`, regenerate `docs/balancing.md`.
3. Docs: `docs/IMPLEMENTATION_PLAN.md` (stages and UI stages), `README.md`, scenario specs (a section per spec listing what changed and why), `docs/schema.md`, `docs/decisions.md`.
4. Final report `docs/autonomous3/reports/final.md`: what was built, every target in every scenario and mode with its status, open issues, and the "For Henry to review" list in priority order.
5. Tag `plan3-complete`.

## 7. STATUS.md template

```
# Autonomous run 3 status

## Current
Step: <step and sub-step>
Last commit: <hash and message>
Next action: <one or two sentences>

## Checklist
- [ ] Plan 2 complete (tag plan2-complete)
- [ ] Step 0: set up and baseline (tag plan3-baseline)
- [ ] Step 1: office stages (tag plan3-stages)
- [ ] Step 2: retune long mode (tag plan3-tuned)
- [ ] Step 3: established UI (tag plan3-established)
- [ ] Step 4: wrap up (tag plan3-complete)

## Open issues
<target, scenario, closest result, options>

## For Henry to review (non-blocking)
<one line each, newest first, with a pointer into docs/decisions.md>

## Stopped
<empty unless a hard stop happened>
```

## 8. Out of scope

Zollstock long mode and funding, cofounders, a competitor, VAT rules, price per market, the "a bit steep" warning, the next batch of 60 week changes (chasing with an early-chase risk, automatic reminders), summarised inbox reports (the old established mockup's "you no longer see the individual messages"), sound, real illustration, cloud saves. Do not start them. If one becomes necessary, record why in STATUS.md and do the minimum.
