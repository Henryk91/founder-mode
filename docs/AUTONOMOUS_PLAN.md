# Autonomous plan: Phase 9 completion to the hotel scenario

This file is the single source of truth for a long, autonomous run. Henry (the owner) will not review each step. You make the decisions this file leaves open, record them, and keep going. Read this whole file before doing anything, then read `docs/autonomous/STATUS.md` to see where the run is.

Read also, in this order: `CLAUDE.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/phase9-proposal.md`, `docs/decisions.md`, `docs/balancing.md`, `docs/design/design.md`, `docs/scenario-kantino.md`, `docs/scenario-zollstock.md`, and from step 4 on the tourism specs `docs/scenario-outdoor.md`, `docs/scenario-restaurant.md` (which also specifies the bank loan) and `docs/scenario-hotel.md`.

## 0. How to run

### 0.1 Resuming

- `docs/autonomous/STATUS.md` holds the progress checklist, the current step, the last commit, the next action, and a list of decisions for Henry to review later. Create it from section 9 if it does not exist.
- At the start of every session, and after any context compaction, read STATUS.md and continue from "Next action". Do not redo finished steps.
- Update STATUS.md after every commit.

### 0.2 Do not stop to ask

- Henry is not in the loop. Do not end a turn with a question, a proposal waiting for approval, or "say go".
- Where earlier work stopped for a decision, you now decide, using section 2 and the defaults in this file, and record the decision.
- Every decision that a reasonable person could have made differently goes into `docs/decisions.md` with the heading `AUTONOMOUS:` and one line into the "For Henry to review" list in STATUS.md. Non-blocking.
- Only the hard stops in 0.4 end the run early.

### 0.3 Git

- Commit after every sub-step with a clear message. Never push. Henry pushes and deploys himself.
- Tag milestones locally with annotated tags (listed per step). Never push tags.
- Never rewrite history, never force anything, never delete branches.
- Before starting a step, make sure the working tree is clean. If it is not, commit what is there with a message saying it was left over, after running tests.

### 0.4 Hard stops (the only reasons to stop)

1. Tests or lint cannot be made green after three honest attempts at the same failure.
2. A change would lose player data in a way the save notices cannot cover.
3. A scenario is unplayable after the full tuning budget (section 2.4): the careful bot wins under 15% or over 55%, or a single strategy wins over 70%.
4. Something needs an account, a credential, a payment or a network service outside the repo.
5. The 60 week game changes when a step says it must not, and you cannot find why after two attempts.

On a hard stop: write the reason, what you tried, and the options into STATUS.md under "Stopped", commit, and end the turn.

### 0.5 Model and sessions

Use Opus. If a session ends for any reason, the next session resumes from STATUS.md. Keep STATUS.md short enough to read in one go: move finished detail into `docs/decisions.md`.

## 1. Fixed rules (unchanged from CLAUDE.md, repeated because they matter most)

- Engine: pure, deterministic, seeded, immutable transitions, no React, DOM or Node in `packages/engine`.
- The UI only gets `PlayerView`. Hidden values appear only in the post-mortem after a run ends. No probabilities shown to the player.
- Content in YAML, validated with zod. Labels in the labels table. Money in integer cents, time in hours.
- Saves are seed plus action log with engine version and content fingerprint. Bump the engine version whenever replaying an old log could produce a different game.
- Phone first, tap only, no hover or drag dependence. Notebook planner rules in `docs/design/design.md` (44 px lines, approved sizes).
- Text: British English, dry humour, short. No em dashes or en dashes anywhere in player-facing text or docs. 2 to 4 sentences per event.
- After any engine, content or bot change: run the relevant report parts. Sample sizes: 10,000 seeds for targets judged on small differences (as listed in `docs/balancing.md`), 1,000 for the rest. The event table only at the end of a step.
- A result within its own 95% margin of a limit counts as "at the limit" and passes. Record it as at the limit.

### 1.1 Protected games

- **The 60 week game (Kantino and Zollstock) must not change** in any step of this plan unless the step says so. Prove it at the end of every step that touches the engine or shared content: 60 week main and paired parts on 10,000 seeds, both scenarios, identical number for number apart from timings. The 60 week fingerprints are locked by a test; keep it.
- From step 2 on, **Kantino long mode** is protected in the same way, once it has passed its targets.
- From the end of each tourism scenario, that scenario is protected too.

## 2. Judgement rules (apply these where Henry used to review)

These are the checks that caught real problems in earlier phases. Apply them to your own work at every report point and write the answers into the step's section of `docs/decisions.md`.

### 2.1 Before tuning game values

1. **Does the bot play the system competently?** When a target fails after a mechanics change, first check that the bot uses the new system sensibly. Fix bots before game values. Several earlier "balance problems" were bot problems.
2. **Is the sample big enough?** Never judge a difference smaller than its margin. Use 10,000 seeds when the margin at 1,000 is wider than the effect.
3. **Is it the real cause?** Measure contributions (switch one thing off at a time) before changing things. Do not change events one by one on a hunch.

### 2.2 Design checks for every new option the player gets

1. **Never always right, never always wrong.** If one choice wins in nearly every situation, it is a chore, not a decision. If it never wins, it is a trap; traps are allowed only when they teach a named lesson and the post-mortem explains them in one or two sentences.
2. **Signals on screen.** The player must be able to learn the right call from what they can see. If the right call depends on a hidden number with no visible signal, add an honest, noisy signal (as with budget hints in interviews).
3. **Realism.** Money, salaries, prices, commissions, interest and costs must be believable for Munich and Bavaria. Research current figures and cite them in the scenario doc. If you cannot verify a figure, mark it "estimate" in the doc.
4. **No dominant strategy.** No single strategy over 60% (target 3 equivalent), and the best careful play stays in its band.
5. **Fairness across hidden setups.** Which market or segment turns out viable is luck. The spread of win rates across viable ones stays within the scenario's limit.

### 2.3 Integrity of targets

- Never restate a target just because the result missed it. Restate only when the old wording measured the wrong thing, and write down why, including what the old wording would have rewarded.
- Never pick a threshold that the current result passes by a whisker without a reason that existed before you saw the result.
- Report every target as pass, at the limit, or fail. Never hide a failure.

### 2.4 Tuning budget

- Per tuning goal: up to 3 rounds with scenario values, then up to 2 rounds with formulas.
- If a target still fails after that, and it is not a hard stop (0.4.3), record it as an open issue in STATUS.md and `docs/decisions.md`, with the closest result and the options you see, and continue.
- Keep a running "open issues" list in STATUS.md. At the end of the plan, revisit all open issues once with a fresh budget of 3 rounds each.

### 2.5 Reports

At the end of each step, write a short report into `docs/autonomous/reports/<step>.md`: what changed, every target with its result and status, decisions taken, open issues, and how the protected games were proven unchanged. This replaces the reports Henry used to read.

## 3. Step 0: finish C3 if needed

If C3 (long mode tuning, see `docs/phase9-proposal.md` and the C3 instructions in STATUS.md or the last report) is not finished, finish it under the rules of this file. C3's goals:

- Target 29: the careful bot hiring from revenue beats solo by at least 2 points overall, and hiring early on savings loses to solo.
- Target 20: burst and steady pairs as restated in proposal 10.3.
- Targets 22 (careful bot 25 to 45%) and 24 (spread within 15) in long mode.
- Year 2 events carry real weight: reading the long inbox worth roughly +12 points. Check whether year 1 reader rules are wrong for year 2 before changing events. The event text names the situation, the outcome follows it, the reader follows the text.
- Target 11 in long mode judged again. Target 27 keeps passing.
- Full long mode report with the event table into `docs/balancing.md`.

### 3.1 Decisions after C3a stopped (target 29 failed after three rounds)

C3a found that at the default price of 450 EUR and about 15 customers, a full time salesperson hired around week 60 cannot pay back before week 104, the founder already fills most of the channel room, and write-offs pile up in year 2. These decisions apply:

1. Apply the basics in long mode: channel limit 24 h a week, salesperson selling 1.0, chasing capacity that scales with the number of customers. Add the results-based let-go rule from C3a round 3 (let a salesperson go after 16 weeks unless their customers pay half their salary).
2. Any hire, and the freelancer, can be given chasing and admin as their task. Realistic, and it addresses the write-offs.
3. In long mode the careful reference bot reads budget hints and prices as the hint-reading bot does, because a careful player reads the hints.
4. Measure hiring in two situations, each against its own solo counterpart on the same seeds: (a) with hint pricing (higher price per customer); (b) an expansion bot that, once its first market runs out of new leads in year 2, uses a developer to build the second market's must haves and a salesperson to sell there.
5. Target 29 becomes situational, the same shape as targets 19 and 20: the careful bot's hiring is not worse than solo overall (within margin); hiring early on savings clearly loses to solo; and in at least one situation from point 4, hiring beats its solo counterpart by at least 2 points. This restatement is allowed under 2.3 because the old wording rewarded hiring that pays on average, while the lesson is that hiring pays only when the business can carry it.
6. Do not change salaries or the default price to force target 29. Realistic economics come first. If no situation reaches +2 within the tuning budget, record target 29 as an open issue and continue with C3b.
7. Then C3b as listed above.
8. Note for step 1: funding mostly buys hires. In step 1, check early whether funded hires create revenue growth (the "Growing" ending measures growth, not profit). If funding cannot be viable, make it the top open issue with options, and prefer options that keep cash discipline as a lesson (for example judging long mode wins on recurring revenue as well as cash).

Tag: `phase9-c3`.

## 4. Step 1: Part D, funding (Kantino long mode)

Follow `docs/phase9-proposal.md` for the mechanics. Decisions already made by Henry:

- Funding exists only in long mode. Angels and a seed round only. No bank loan in this step (it comes in step 6).
- Simple terms: amount and equity. No liquidation preferences, vesting or convertible notes.
- Realistic amounts for a Munich startup, cited. Realistic full time salaries (already in long mode).
- Investors judge only what the player can see. Raising costs founder hours, moves through a pipeline, money arrives at closing, so the company can run out while raising.
- Investment is its own ledger entry and never counts as income for runway.
- Strings attached: investor updates, growth expectations, pressure events when missed.
- Ownership appears in the post-mortem and as a column in best runs. It does not decide the ending.
- New ending "Growing": a win only with at least 12 months of runway at the current burn and revenue growth over the last quarter (starting values, tunable). Otherwise "Still searching".
- Cap landing test spending so funded runs cannot buy leads without limit.

Targets 31 to 37 as in the proposal: bootstrapping and raising both viable, neither dominates, raising on weak traction is punished, running out while raising is possible. Bots: raise early, raise on traction, never raise, raise when not needed.

Apply section 2 throughout. Kantino long mode targets 20 to 30 must still pass after funding. Tag: `phase9-d`.

## 5. Step 2: Part E, Phase 9 UI, docs and report

- UI for everything in Phase 9 that lacks it: mode choice, team of several hires, funding pipeline, term offers, ownership, investor updates, "Growing" ending, year 2 notices. The organised UI stage may show a simple cap table and investor updates.
- Screen review at 375, 390, 430 and 1440 px, in Playwright WebKit and Chromium. axe must find nothing. Notebook rules hold. No control leaves its paper.
- Post-mortem covers hires, freelancers, funding, ownership and write-offs.
- Docs: implementation plan, schema, scenario docs, README, seeds per ending for long mode (with the replay test).
- Full reports for both modes into `docs/balancing.md`.
- Tag: `phase9-done`.

## 6. Step 3: situation dependent events as a general system

Goal: an event's outcome can depend on what the player can see (customers, bugs, runway, team, season, bookings, weather), declared in YAML instead of hand-coded.

- Design a small, typed condition language in content (for example `when: { customers: ">=3" }`), validated by zod, evaluated by the engine on PlayerView-visible state only.
- Convert the existing hand-built situational events (at least six) to the new system. **The 60 week game and Kantino long mode must come out identical** after the conversion.
- The reader bot reads conditions the way a player reads the text: each condition must be stated in the event text.
- Do not convert other existing events in the protected games. New content (tourism) uses the system from the start.
- Tests for the condition language, the conversion, and determinism.
- Tag: `situational-events`.

## 7. Step 4: tourism engine design (write it, then build it)

Read the three tourism specs (`docs/scenario-outdoor.md`, `docs/scenario-restaurant.md`, `docs/scenario-hotel.md`) before designing, so the engine serves all three. Write `docs/tourism-proposal.md` first, deciding everything yourself under section 2, then build. Tourism scenarios are long mode only (104 weeks), because seasons need two years: one to learn, one to apply.

### 7.1 Defaults to start from (change them only with a recorded reason)

**Turn and core loop.** One turn is one week. The hidden demand core stays: each scenario has three customer segments with roles viable, mediocre and trap, shuffled per run, with pain, politeness bias, willingness to pay and must haves. Discovery happens through cheap tests before big commitments.

**Business model module.** The engine gets a second revenue model next to subscriptions: bookings. Keep it a clean module so Kantino and Zollstock are untouched (fingerprints locked).

**Capacity that expires.** Each product has weekly capacity (tours times group size, tables times seatings, rooms times nights). Capacity unsold by the end of the week is gone. Capacity needs staff and sometimes equipment.

**Bookings.** Requests arrive per segment with a lead time, so the player sees bookings ahead (an occupancy calendar replaces the pipeline). Deposits, cancellations and no-shows. The cancellation policy (flexible or strict) is a player decision with a trade off: strict loses bookings, flexible loses money to late cancellations.

**Seasonality and weather.** A demand curve over the year per segment, hidden in shape but signalled by bookings and by honest noisy hints (locals, the tourism office, last year's numbers in year 2). Weekly weather for outdoor products: cancellations, safety calls, indoor alternatives.

**Pricing.** Per product and per season (peak and off season), using the existing smooth price curve and decline reasons ("Too expensive"). Budget hints adapted per scenario.

**Channels.** Own website (slow, cheap, needs effort), booking platforms (fast reach, commission, the dependence trap), partnerships (hotels, corporate HR, tourism office), walk-ins (location). Platform commissions must be realistic and cited.

**Staff.** Scheduled per week in the planner. Understaffing caps capacity and hurts reviews; overstaffing wastes money. Uses the multi-hire system from Phase 9, with seasonal and part time contracts. The founder works shifts too, with the energy system.

**Reviews.** A public rating driven by service (staffing ratio, founder energy, product quality, weather handling). It raises conversion on platforms and drives word of mouth. Built from the referral system. Reviews must matter: switching off care for reviews costs at least 2 points.

**Costs.** Fixed (lease, insurance, licences), staff, variable per guest (food, consumables, transport), commissions, equipment. All cited or marked as estimates.

**Endings.** As in long mode, including "Growing". A loan default ends the run (step 6).

**UI.** Phone first, the scrappy style, the notebook planner (a staff roster section), an occupancy calendar instead of the pipeline, a reviews panel. Each scenario gets its own scene drawings per stage in the existing muted style.

### 7.2 Build order

1. Engine module and content schema, with Kantino and Zollstock proven identical.
2. Bots that can play bookings: a careful bot, a platform-only bot, an overstaffing bot, a no-tests bot, a price-blind bot.
3. A generic set of tourism targets (section 7.3), adapted per scenario.
4. UI components shared by all three scenarios.

Tag: `tourism-engine`.

### 7.3 Target template for each tourism scenario

Mirror the core targets with the same limits unless a recorded reason says otherwise: careful bot 25 to 45%, no strategy over 60%, no-tests bot under 5% (or a scenario specific floor with reason), spread across viable segments within 15 points, first booking or first paying segment early enough to keep the early weeks interesting, decision news in most weeks, inbox reading worth clearly more than blind policies (blind effort at most a third of reading's gain), no event repeats, no dry inbox. Plus:

- Seasonal pricing pays: a hint-reading price bot beats fixed prices, within a cap.
- Platform dependence is a trap: platform-only loses to a mixed channel strategy.
- Staffing is a decision: both over and under staffing lose to the careful roster.
- Reviews matter: at least 2 points.
- The cancellation policy is a real decision: each policy wins in some situations.

## 8. Steps 5 to 8: the scenarios

Build each scenario completely (design doc, content, bots, tuning, UI, scene drawings, post-mortem texts, seeds per ending, report) before starting the next. Each scenario has a spec written by Henry's design reviewer: `docs/scenario-outdoor.md`, `docs/scenario-restaurant.md` and `docs/scenario-hotel.md`. They are the starting point and the source of truth for intent: what the scenario teaches, the segments, products, the temptation, experiments, channels, staff, seasons and event ideas. Their numbers are starting points; figures marked (est.) must be verified against current sources and cited in the spec, or kept and labelled as estimates. Where the engine or the targets force a change, change the spec, keep its intent, and record why in `docs/decisions.md`. The bank loan is specified in Part A of the restaurant spec and is built before the restaurant. No real firms or people; invent names in the right voice. At least 40 scenario specific events per scenario using situational events, plus the shared ones that fit. Interview quotes: at least 10 per bucket per segment.

### 8.1 Step 5: outdoor adventure company

Premise: a guided outdoor company in the Bavarian Alps, within reach of Munich. Products such as guided hikes, via ferrata, canyoning in summer and snowshoe tours in winter. Small equipment costs, so no loan is needed; funding from step 1 is available but optional.

Segment ideas (roles shuffled per run): international tourists (platforms, English, short lead time), Munich companies booking team events (invoice, transport, bad weather alternative, long lead time), school and youth groups (polite, safety paperwork, low price). Weather is the signature risk. Lessons: weather and seasonality, platform dependence, safety and staffing, pricing by season.

Tag: `scenario-outdoor`.

### 8.2 Step 6: bank loan, then the restaurant

**Bank loan first** (general system, available to tourism scenarios and, if it fits, long mode): amount, interest, repayment schedule, personal guarantee, a decision based on visible numbers and a business plan the founder spends hours on. Missed payments lead to default, which ends the run. Use current German small business lending figures, cited. A public start-up loan programme may serve as the model, but the in-game bank is fictional. Targets: borrowing and not borrowing both viable where a loan is optional; over-borrowing punished; default reachable but avoidable.

**Restaurant.** Premise: a neighbourhood restaurant in Munich. A fit-out that needs a loan, seats times seatings as capacity, food cost per cover, kitchen and service staff, lunch and dinner as different products. Segment ideas: office lunch, evening locals, tourists. Lessons: fixed costs and break even covers, menu pricing, food cost, staffing peaks, reviews, delivery platform dependence.

Tag: `scenario-restaurant`.

### 8.3 Step 7: the hotel

Premise: a small hotel or guesthouse in Bavaria. Rooms times nights as capacity, a renovation that needs a loan, booking platform dependence with realistic commissions, housekeeping and front desk staff, seasonal demand. Segment ideas: leisure couples, business travellers, groups and weddings. Lessons: occupancy against average rate, direct against platform bookings, renovation risk, seasonality.

Tag: `scenario-hotel`.

### 8.4 Step 8: wrap up

- Revisit every open issue once (section 2.4).
- Final screen review of every scenario at 375, 390, 430 and 1440 px, WebKit and Chromium, axe clean.
- Performance: first load LCP under 2.5 s on the emulated mid range phone; code split per scenario if needed.
- Docs: implementation plan, README, scenario docs, balancing report for every scenario and mode, seeds per ending for every scenario.
- A final report `docs/autonomous/reports/final.md`: what was built, every target in every scenario and mode, all open issues, and the "For Henry to review" list in priority order.
- Tag: `tourism-complete`.

## 9. STATUS.md template

Create `docs/autonomous/STATUS.md` with this structure:

```
# Autonomous run status

## Current
Step: <step and sub-step>
Last commit: <hash and message>
Next action: <one or two sentences>

## Checklist
- [ ] Step 0: C3 (tag phase9-c3)
- [ ] Step 1: funding (tag phase9-d)
- [ ] Step 2: Phase 9 UI, docs, report (tag phase9-done)
- [ ] Step 3: situational events system (tag situational-events)
- [ ] Step 4: tourism engine (tag tourism-engine)
- [ ] Step 5: outdoor adventure company (tag scenario-outdoor)
- [ ] Step 6: bank loan and restaurant (tag scenario-restaurant)
- [ ] Step 7: hotel (tag scenario-hotel)
- [ ] Step 8: wrap up (tag tourism-complete)

## Open issues
<target, scenario, closest result, options>

## For Henry to review (non-blocking)
<one line each, newest first, with a pointer into docs/decisions.md>

## Stopped
<empty unless a hard stop happened>
```

## 10. Out of scope for this plan

Zollstock long mode and funding, cofounders, a competitor, the established UI stage, more office stages, VAT rules, sound, real illustration, cloud saves, and the next batch of 60 week changes (chasing with an early-chase risk, automatic reminders). Do not start them. If one becomes necessary for a step, record why in STATUS.md and do the minimum.
