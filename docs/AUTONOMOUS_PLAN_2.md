# Autonomous plan 2: finishing what was built

This plan finishes the open issues of the first autonomous run (`docs/AUTONOMOUS_PLAN.md`, final report `docs/autonomous/reports/final.md`). Henry will not review each step. You make the decisions this file leaves open, record them, and keep going.

Read this whole file first, then `docs/autonomous2/STATUS.md` to see where the run is. Read also: `CLAUDE.md`, `docs/AUTONOMOUS_PLAN.md` (sections 0, 1 and 2 apply here unchanged unless this file says otherwise), `docs/autonomous/STATUS.md`, `docs/autonomous/reports/final.md`, `docs/autonomous/reports/tourism-fixes.md` (if it exists), `docs/decisions.md`, `docs/balancing.md`, `docs/design/design.md`, `docs/tourism-proposal.md`, `docs/loan-proposal.md`, and the three tourism specs `docs/scenario-outdoor.md`, `docs/scenario-restaurant.md`, `docs/scenario-hotel.md`.

## 0. How to run

Everything in sections 0, 1 and 2 of `docs/AUTONOMOUS_PLAN.md` applies: resuming from a status file, not stopping to ask, recording decisions as `AUTONOMOUS:` entries, git rules (commit often, never push, local tags only), the hard stops, the fixed engine and text rules, the judgement rules, the target integrity rules, the tuning budget, and the step reports. The differences:

- Status file: `docs/autonomous2/STATUS.md` (template in section 9). Reports: `docs/autonomous2/reports/<step>.md`.
- Protected games in this plan:
  - **Kantino and Zollstock, 60 weeks:** must not change in any step. Prove it at the end of every step that touches the engine or shared content.
  - **Kantino long mode:** must not change before step 5. Step 5 may change it.
  - **The three tourism scenarios:** may change in steps 1 to 4. From the end of step 4 they are protected, except where step 6 revisits open issues.
- Before you start: the tourism fixes session (commits "Tourism fixes A" to "Tourism fixes D 17-18") was stopped by Henry while it ran its final bot reports, so `docs/autonomous/reports/tourism-fixes.md` may not exist and its gate may not have run. Step 0 handles this. If the working tree is dirty, look at what changed: generated reports or docs from that session are kept and committed with a message saying so; code changes are kept only if tests and lint pass, otherwise reverted to HEAD, and either way recorded in STATUS.md.

## 1. Step 0: take stock and finish the tourism fixes

1. Clean up the working tree as described under "Before you start".
2. Reconstruct what the tourism fixes session did from its commits ("Tourism fixes A" to "Tourism fixes D 17-18"), `docs/decisions.md` and any notes it left. Its task list is in this plan's appendix A. Note any item that is missing or only partly done, and finish it.
3. If `docs/autonomous/reports/tourism-fixes.md` does not exist, write it: what each item changed, and the results of items 17 and 18 (the "naive careful" bot per tourism scenario and the tourism event table). If those results are not recorded anywhere, run those measurements now.
4. Run the full report for every scenario and mode once, on the agreed sample sizes. This is both the baseline for this plan and the gate the fixes session did not finish: Kantino and Zollstock 60 weeks and Kantino long must match `docs/balancing.md` apart from timings. If they do not, find out which fix changed them and undo that part (the fixes were allowed to change tourism scenarios only).
5. Carry over into this plan's STATUS.md: the tourism event table results (events that dominate, are broken, or fail the "at least a third favour the cheap choice" rule), the naive careful results, and every open issue.
6. Record the baseline in `docs/autonomous2/reports/step0-baseline.md` and regenerate `docs/balancing.md`.
7. Tag: `plan2-baseline`.

## 2. Step 1: the spec features left out of the tourism engine

Build the features the tourism specs define but the first run simplified or left out. Each is a general engine feature in the bookings module, used by the scenarios named. Follow the specs for intent; where a spec gives numbers, they are starting points.

### 1a. Real experiments instead of subscription ones

The tourism scenarios currently reuse landing page tests and pre-sales. Replace them in tourism scenarios with the specs' experiments:

| Scenario | Experiments |
|---|---|
| Gratwanderung | Pilot day (a free or cheap guided day for a few people from one segment: a full founder day, some gear wear; signals: bookings and referrals afterwards, honest feedback, a review if tourists). Test listing (a platform listing for two weeks at a test price; mostly tourists, says little about the other segments) |
| Hinterhof | Pop-up dinner before opening (a day and ingredients; real guests, real prices, table talk, a first review). Lunch test (lunch boxes to two or three offices for a week; office lunch only) |
| Seeblick | Test rates (some rooms at a test price on a platform for two weeks; mostly leisure). Open house (an afternoon for wedding planners and office managers; interest from groups and business, remarks about the rooms) |
| All three | Vouchers instead of pre-sales: cash now, and evidence of demand. Unredeemed vouchers are a liability, not income: they appear on the Money tab, redemptions use capacity, and the post-mortem shows how many were never redeemed |

Each experiment gives an honest, noisy signal about one segment, never the hidden values. The 60 week and Kantino long games keep their landing tests and pre-sales.

### 1b. Staff contracts

Today tourism staff are shifts only. Add, as the specs describe:

- **Permanent staff**: a monthly salary, a notice period, available every week, better service than a shift worker (reviews), paid whether busy or not.
- **Seasonal contracts**: a fixed run of months (for example May to September), cheaper per hour than shifts, cannot be ended early.
- **Part time**: as permanent, fewer hours.

The lesson: fixed staff are cheaper per hour and better for reviews, flexible staff are safer when demand is uncertain. Target in step 4: each kind of contract wins in some situation (same shape as targets 19 and 20).

### 1c. Restaurant specifics (Hinterhof)

- **Prep and waste**: the player plans how many covers to prepare per service. Prepared and unsold food is lost. Running out turns guests away. Food cost rises with waste.
- **Kitchen and floor apart**: cooks and service staff as separate roles. Kitchen capacity limits covers per service, floor staff limit service quality and turn times. Keep it as simple as possible on screen.

### 1d. Hotel specifics (Seeblick)

- **Renovation per room** instead of one block, each room closed for about three weeks while it is done, so the player chooses when to lose capacity.
- **Minimum stay** on summer weekends (one or two nights), a player decision with a trade off: fewer weekend bookings but no empty Sundays.

### 1e. UI and checks for step 1

Every new control follows `docs/design/design.md` (notebook rules, 44 px lines, no cut-off text). Wording fits each scenario (the tourism word check from the fixes session must keep passing). Screen review at 375, 390, 430 and 1440 px in Chromium and WebKit, axe clean.

Do not tune in this step beyond keeping each scenario playable. Report every tourism target before and after. Tag: `plan2-features`.

## 3. Step 2: the bank loan teaches that debt is dangerous

The open issues: over-borrowing does not clearly lose (L2), and reckless borrowing rarely causes a default (L3), because borrowed money sits in the account and pays its own repayments.

Defaults to start from (change only with a recorded reason):

1. **The bank lends against a plan.** The business plan lists what the money is for: fit-out, renovation, equipment, and working capital. The bank lends for the listed items, plus working capital of at most three months of fixed costs. It never lends a free extra buffer. Say this plainly in the bank's text.
2. **Listed items are bought at payout.** Money for a fit-out or renovation goes straight out on that item. Only the working capital part stays in the account.
3. **The temptations can be financed.** The wellness area (Seeblick), a second fit-out (Hinterhof) and the e-bike fleet (Gratwanderung) can be put in a loan plan. That is how a player over-borrows: by borrowing for something no segment needs.
4. **Restate L2 and L3 accordingly, under rule 2.3 of the first plan** (the old wording measured a buffer the bank no longer gives):
   - L2: borrowing for a temptation that no segment requires loses clearly against borrowing only what the business needs (at least 3 points).
   - L3: a reckless bot that borrows the maximum, including a temptation, defaults or goes bankrupt with a loan outstanding in at least 15% of runs; the careful bot in under 3%.
   - Keep: where a loan is optional, borrowing what the plan needs and not borrowing are both viable (within 5 points).
5. The post-mortem explains a loan that did not pay: what it bought, what it cost in interest, and whether that item ever paid for itself.

Measure in Hinterhof and Seeblick (and Gratwanderung if the e-bike loan is offered). Tag: `plan2-loan`.

## 4. Step 3: the tourism inbox becomes a decision

The open issue in all three tourism scenarios (T6): blind effort gains 60 to 100% of what reading gains, against a limit of a third. The first run's diagnosis: most effortful choices are mildly good, and founder hours are rarely scarce in tourism.

1. Start from the tourism event table built by the fixes session. Measure each event's share of the blind effort gain on 10,000 seeds per scenario (switch one event off at a time, as in C2b).
2. For the biggest contributors, make the effortful answer pay only in the situation its text names, using the situational events system (step 3 of the first plan). The text must name the situation; the reader follows the text.
3. Add events where the cheap or free answer is right and the effortful one is a waste in that situation. Keep at least a third of events favouring the cheap choice.
4. Check founder hours: if a careful player in tourism has many spare hours most weeks, effortful answers cost nothing. Consider making founder hours scarcer in season (shifts the founder works, guests to look after) rather than making every event harsher. Record what you chose and why.
5. Fix or remove any event the fixes session flagged as dominant or broken.
6. Target: T6 passes in all three (blind effort at most a third of reading's gain), reading clearly beats every blind policy.

Tag: `plan2-inbox`.

## 5. Step 4: retune the three tourism scenarios

Retune Gratwanderung, Hinterhof and Seeblick against all their targets after steps 1 to 3, with the tuning budget of the first plan (section 2.4). In addition:

- **Seeblick:** spread across segments within 15 points (now 22.4; groups win far less than leisure), seasonal pricing (T7) and the cancellation policy (T11) pass.
- **New target T13, all three: a player without hidden knowledge can win.** The "naive careful" bot from the fixes session (careful play without scenario-specific knowledge) wins at least 20%, and at most 10 points less than the careful bot. Where it falls short, add honest on-screen signals first (intro card, founder's note, an event, a Coming up note, the bank's own message) before changing values.
- **New target T14, all three: every staff contract kind wins somewhere** (from step 1b).
- **Gratwanderung realism:** school demand was raised to 6 to 12 groups a week at peak, against 0.3 to 1.2 in the spec. Check whether the scenario can work with a figure closer to the spec (for example 2 to 4), and record the result. Keep the higher figure only if it is needed for balance, and say so.
- Rents and leases are estimates without a source. Try again to find current sources and cite them; otherwise keep the "estimate" label.

At the end of this step the three tourism scenarios are protected. Tag: `plan2-tourism`.

## 6. Step 5: Kantino long mode, funding and target 20

Kantino long may change in this step. The 60 week games must not.

1. **Targets 31 and 32** (raising on traction beats bootstrapping by 3 to 4 points and sits just above 45%): try, in this order, a smaller angel pool, a founder salary once funded (realistic, and it raises burn), and investor pressure that costs founder hours. Neither path may dominate on win rate.
2. **Target 33** (raising early loses 6.8 against a needed 8): make an early raise visibly costly in the terms (more equity for less money) rather than in luck.
3. **Target 36** (investor updates do not pay for their hours): try updates as a 1 h task, and investor mood that matters (follow-on money, introductions that bring leads). If updates still cannot pay without being always right, restate 36 under rule 2.3 with the reason.
4. **Target 20** (freelancer against hire): at Kantino's size no part time person pays. Restate under rule 2.3 as "renting loses less than hiring for a burst of work, and hiring loses less than renting for steady work", measured as before. The old wording required that someone added pays, which the realistic economics of this company size do not support.
5. **Target 27 / 11 in long mode** (blind effort at the limit): leave unless steps above move it.

Tag: `plan2-kantino-long`.

## 7. Step 6: wrap up

1. Revisit every open issue once with a fresh budget of 3 rounds each (section 2.4 of the first plan). The tourism scenarios may change only for their own open issues.
2. Full reports for every scenario and mode into `docs/balancing.md`.
3. Screen review of everything new at 375, 390, 430 and 1440 px in Chromium and WebKit, axe clean, no cut-off text, the tourism word check passing.
4. Seeds per ending for every scenario, with the replay test.
5. Docs: implementation plan, README, scenario specs (each with a section listing what changed from the spec and why), schema, decisions.
6. Final report `docs/autonomous2/reports/final.md`: what was built, every target in every scenario and mode with its status, open issues, and the "For Henry to review" list in priority order.
7. Tag: `plan2-complete`.

## 8. Out of scope

The established UI stage, more office stages, Zollstock long mode and funding, cofounders, a competitor, VAT rules, price per market, the "a bit steep" warning, the next batch of 60 week changes (chasing with an early-chase risk, automatic reminders), sound, real illustration, cloud saves. Do not start them. If one becomes necessary for a step, record why in STATUS.md and do the minimum.

## 9. STATUS.md template

Create `docs/autonomous2/STATUS.md` with this structure:

```
# Autonomous run 2 status

## Current
Step: <step and sub-step>
Last commit: <hash and message>
Next action: <one or two sentences>

## Checklist
- [ ] Step 0: take stock (tag plan2-baseline)
- [ ] Step 1: spec features (tag plan2-features)
- [ ] Step 2: bank loan (tag plan2-loan)
- [ ] Step 3: tourism inbox (tag plan2-inbox)
- [ ] Step 4: retune tourism (tag plan2-tourism)
- [ ] Step 5: Kantino long, funding and target 20 (tag plan2-kantino-long)
- [ ] Step 6: wrap up (tag plan2-complete)

## Carried over from the tourism fixes
<event table findings, naive careful results, open issues>

## Open issues
<target, scenario, closest result, options>

## For Henry to review (non-blocking)
<one line each, newest first, with a pointer into docs/decisions.md>

## Stopped
<empty unless a hard stop happened>
```

## Appendix A: the tourism fixes task list (for step 0)

The fixes session was given these items. Check each against its commits.

- A1 to A3: no text in the notebook cut off with an ellipsis (bank loan sentence at every width, Who works summaries at 390 px), notebook text wraps onto whole ruled lines (except a section summary next to its title on a phone), and the "nothing cut short" browser test covers every section, tab and scenario at 375, 390, 430 and 1440 px in Chromium and WebKit.
- B4: no "Price per customer, per month" control in tourism scenarios; invoice text fits tourism.
- B5: a tourism measure in the headline bar instead of "Customers".
- B6: post-mortem uses each segment's price unit, counts guests or bookings, names the scenario's experiments.
- B7: incidents, teething problems and snagging instead of bugs; "ready" instead of "shipped".
- B8: experiments renamed per scenario through the labels table; gaps between mechanics and spec recorded.
- B9: Help screen in tourism terms per scenario.
- B10: week results phrasing for tourism segments ("You spoke to 3 people at Tourists").
- B11: "€0 paid on the day (€122 to the platform)" for invoiced business guests: logic or wording fixed.
- B12: a browser test that fails on subscription words in tourism screens, with an allow-list.
- C13: Who works role labels wrap onto whole lines at 390 px; only staffed products in the staffing summary.
- C14: price steps scaled to the price.
- C15: price buttons named with segment and season.
- C16: a way back to the company picker after a run.
- D17: every piece of scenario knowledge the tourism bots use listed, on-screen signals added where a player could not learn it, and a "naive careful" bot measured per tourism scenario.
- D18: a tourism event table, with the share of events favouring the cheap choice and any dominant or broken event per scenario.
