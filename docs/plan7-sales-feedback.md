# Plan 7 features: fair channel tiredness, several channels per market, and reasons for losses

Source of truth for `docs/AUTONOMOUS_PLAN_7.md`. It changes the subscription games only: Kantino and Zollstock (60 weeks) and Kantino long. The bookings scenarios (tourism, abroad, leisure) have their own outreach and do not change.

**All numbers are starting points.** Figures marked (est.) are estimates.

## 1. Channel tiredness that never punishes more work

### 1.1 The flaw today

`effectiveHours` in `packages/engine/src/systems/sales.ts` gives each market and channel a budget of `saturationHours × saturationWeeks` hours over the last weeks (36 in the 60 week game). Hours inside it count fully, hours beyond it at `saturatedFactor` (0.3). The window counts **raw** hours, including those that only counted at 30%, so steady overspending keeps it used up.

Effective hours per week at a steady number of hours (60 week values):

| Hours per week | 12 | 14 | 16 | 18 | 20 | 30 | 40 |
|---|---|---|---|---|---|---|---|
| Effective | 12.0 | 9.8 | 7.6 | 5.4 | 6.0 | 9.0 | 12.0 |

Working harder finds fewer customers. Real outreach has diminishing returns, never negative ones.

### 1.2 The rule

Two properties must hold, each with a test:

1. **Within a week:** with the same history, more hours in a market and channel never give fewer effective hours that week.
2. **Steady state:** spending the same hours every week, more hours a week never give fewer effective hours per week.

Suggested formula, which satisfies both: count **effective** hours in the window instead of raw ones. With the 60 week values, steady effective hours become `(36 × 0.7 + 0.3x) / 2.4` above 12 hours: 12 at 12 h, 13 at 20 h, 14.3 at 30 h. The agent may choose a different formula if it keeps both properties, and records why.

A heavy week may still lower the next weeks' fresh hours. That is realistic (a market you called all week is tired of you), and it is shown (1.3).

### 1.3 What the player sees

Each market and channel shows its state for the coming week, from the visible history:

| Word | Meaning |
|---|---|
| Fresh | Under half the window's budget used |
| Tiring | Half to all of it used |
| Worn out | Over the budget: extra hours count at a fraction |

Keep `saturationHours` per scenario and mode as now (12 in the 60 week games, 24 in Kantino long). The plan's hint "Channels tire" may stay, with the words beside each channel.

## 2. Several channels per market in one week

### 2.1 The rule

- The plan stores hours **per market and channel**, not one channel per market. Any channel the scenario offers can get hours in the same week.
- Each market and channel has its own tiredness (1.3).
- The salesperson's and freelancer's outreach tasks stay as they are (one market and channel per task).
- **Saves:** old action logs store one channel per market. Convert them on load, so replays still work. The formula change alters outcomes, so bump the engine version; the existing save notices tell players an old run was made with an earlier version.

### 2.2 UI

In "Find customers": per market, a row per channel with its own stepper and its tiredness word. On phones, keep each market as one card with its channel rows inside. The summary line lists the channels used. Notebook rules hold: rows at least 44 px, no cut-off text, axe clean at 375, 390, 430 and 1440 px in Chromium and WebKit, in all three UI stages.

## 3. Reasons for losses, where the player looks

### 3.1 Real causes

The engine already knows why a trial is declined or a customer leaves. Name the real cause on each loss (hidden state):

| Cause | Trial declined when | Customer cancels when |
|---|---|---|
| `price` | The price is above what they would pay (today's "Too expensive") | The price share of churn (today's `overPrice`) |
| `missing_feature` | A must-have feature is missing (name the feature) | Misfit churn: a must-have missing |
| `quality` | Bugs lowered fit below what converts | Bugs or low quality raised churn |
| `no_need` | Low pain: the segment manages without it | The pain faded (low pain, mediocre or trap segments) |
| `silent` | Went silent (existing) | Not used for cancellations |
| `stopped_paying` | | Existing: written off |

Where several causes apply, pick by their share of the chance, from the PRNG.

### 3.2 What they say

| Rule | Value |
|---|---|
| Unprompted | About a fifth (est.) send a short reason with the loss |
| Ask why | A button on a lost lead or a cancelled customer, within 4 weeks of the loss. Costs 1 founder hour in the plan. About two thirds answer the next week (est.) |
| Honesty | The stated reason matches the real cause with a chance per segment: lower in polite segments (est. 0.5 to 0.6), higher in blunt ones (est. 0.8 to 0.9). Otherwise they give a softer reason: "budget freeze", "bad timing", "maybe next year" |
| A missing feature is named | When they tell the truth about a missing feature, they name it, in their own words |
| Content | For each scenario and segment, 3 to 5 texts per cause and per soft reason, 2 to 4 sentences, dry, in the scenario's voice |

### 3.3 Where it shows

- **Weekly results:** each lost lead and cancelled customer with the reason they gave, or "no reason given" with the "Ask why" option.
- **Inbox:** the answer to "Ask why" arrives as a short message.
- **Pipeline:** the lost list at the bottom of the Pipeline tab shows the stated reason instead of only a tag. It also lists **customers who cancelled** (today they disappear from every screen once the weekly report is closed), with how long they paid and their stated reason. It shows every loss, newest first, with "Show all" after the first 8, and an "Ask why" button on losses still inside the 4-week window.
- **Post-mortem:** stated reasons against real causes, counted per segment ("3 of 5 said budget; 2 of them really missed the invoice export").

Never show the real cause during the run, only what they said.

### 3.4 Lesson

Lost customers are your best research, but politeness bends what they tell you.

## 4. Nothing in the weekly report is lost

Today the weekly report closes when the player starts the next week, and some of what it said can't be found anywhere else. Customers who cancelled are one known example.

### 4.1 Audit

List every report entry kind (`ReportEntry` in `packages/engine/src/types.ts`, about 90 kinds across all scenarios) and, for each, where the same information can be found after the report is closed. Record the table in the step report. Likely gaps (not checked): cancelled customers, lost leads older than the last 8, experiment results, the actual weather or conditions of a past week, and guests turned away in a past week.

### 4.2 Fix

1. **A persistent home** for the information a player needs to act on: cancelled customers in the lost list (section 3.3); experiment results with their experiment; anything else the audit finds that a decision depends on.
2. **Past weeks:** a list of earlier weeks on the results screen or in Help, where any earlier week's report can be reopened. The reports are rebuilt while a saved game loads (the load already replays the action log), kept in memory, and never stored in the save.

This changes the UI only, in every scenario. Outcomes must not change: the main part of every scenario stays identical.

## 5. Targets

Few and player-facing:

| # | Target |
|---|---|
| M1 | Both properties of 1.2 hold (tests over many random histories) |
| M2 | Spreading pays: in the 60 week Kantino, the careful bot (spreading hours when a channel tires) beats a bot that uses one channel per market by at least 2 points |
| R1 | Asking pays: the careful bot (asks after losses it can afford the hour for) beats a bot that never asks by at least 2 points, in the 60 week Kantino |
| R2 | The post-mortem shows stated reasons against real causes (a test) |
| H1 | Every report entry kind has a home after the report closes, or is reachable through Past weeks (a test per kind) |
| Playability | Kantino, Zollstock and Kantino long: the existing win range targets hold (careful bot within each game's band, no strategy above its cap) |
| Existing | All other targets of the three games are measured; any that gets worse beyond its margin is tuned (at most 2 rounds) or listed for Henry |
