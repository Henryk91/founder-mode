# Autonomous plan 8: fixes from the QA runs

This plan is written for **any coding agent**. It uses the rules of `docs/AUTONOMOUS_PLAN_4.md` section 1, the working practice of `docs/AUTONOMOUS_PLAN_TUNING_2.md` section 1.3 and the efficiency rules of `docs/AUTONOMOUS_PLAN_6.md` section 1.3, with the changes below. Henry, the owner, will not review each step. You make the decisions this file leaves open, record them, and keep going.

**This plan fixes bugs and confusing screens. It adds no features and does no balancing,** apart from checking that win rates stay in range where a fix changes real money.

The findings come from two manual QA runs on the deployed game, 5 November 2026, all before plan 7: Leinen los (weeks 1 to 41, findings 1 to 25), the 60 week Kantino (two runs, 21 weeks, findings K1 to K24), and Griffig, Fabriketage, Rückenwind and Hinterhof (five runs, 96 weeks, findings G, F, R, H and S in section 3.7). The reports are not kept, so everything needed is in section 3. Their figures are what the testers saw on screen; reproduce each finding before fixing it.

The Kantino tester found the cash arithmetic correct in every week. The missing payments of findings 1 to 3 are a bookings-engine problem (tourism, abroad, leisure). Kantino's losses without reasons are already handled by plan 7; check that plan 7 covers them and do not redo it.

## 0. Before anything else

### 0.1 Read, in this order

1. `CLAUDE.md`, including **"Bot report budget"**.
2. This file, completely.
3. `docs/autonomous8/STATUS.md` if it exists. Continue from "Next action".
4. `docs/scenario-gulet.md`, `docs/abroad-mechanics.md`, `docs/schema.md`, the latest sections of `docs/decisions.md`.
5. The code: `packages/engine/src/systems/finance.ts` (`WeekExtras`, the week ledger, `netChangeCents`, runway), `bookings.ts`, `loan.ts`, `milestones.ts`, `apps/web/src/screens/Results.tsx` (`Numbers`), the Money and Bookings screens, the loan form, `apps/web/src/labels.ts` and the tourism labels.

### 0.2 Preconditions

- The tag `plan7-complete` must exist.
- The tag `plan8-baseline` must not exist, unless STATUS.md says this plan is in progress.

If a check fails, write the reason in `docs/autonomous8/STATUS.md` under "Stopped" and end.

## 1. Rules

### 1.1 Names and branch

Status in `docs/autonomous8/STATUS.md`, reports in `docs/autonomous8/reports/`, tags `plan8-*`.

Work directly on `main`. No worktrees or long-lived branches. Every tag points to a commit on `main`. Do not push.

### 1.2 What may change

| Kind of fix | Outcomes |
|---|---|
| Display only (report totals, labels, wording, calendar layout, help) | Must not change: the main part of every scenario stays identical |
| Money rules that are wrong (transfer charge, refunds when you cancel, terms fixed at booking, milestone conditions, loan form steps) | May change, in the scenarios they reach. Check those scenarios' playability once (careful bot 25 to 45%, no strategy over 60%); tune at most 2 rounds only if one leaves its range |

Kantino, Zollstock and Kantino long are reached only by shared fixes (the report totals, the loan form, the invariant test). Their outcomes must not change unless a fix is a real money rule that applies to them; record any such case.

### 1.3 Saves

A rule fix that changes outcomes bumps the engine version; the existing save notices cover old runs. A change that would lose player data in a way the notices cannot cover is a hard stop.

### 1.4 Reproduce first

For every finding: reproduce it (a test from a seed and action sequence, or a short scripted run) before changing code, and keep the test. If a finding cannot be reproduced, record that and move on.

## 2. Step 0: set up

1. Create `docs/autonomous8/STATUS.md` from section 8.
2. Commit this file and any uncommitted docs. Handle other uncommitted changes as in `docs/AUTONOMOUS_PLAN_4.md` section 1.3, step 0. **Do not commit** QA screenshots or reports lying in the project root; leave them untracked.
3. Baseline: the results committed at `plan7-complete`. Do not rerun anything.
4. Tag `plan8-baseline`.

## 3. The findings

### 3.1 Money that does not add up (high)

| # | Finding | Known cause or lead |
|---|---|---|
| 1 | W11 (Leinen los): the Turkish company costs 4,000; cash falls by 4,000 but the report says "Company received 0, Company paid 0" | `Numbers` in `Results.tsx` sums "paid" from fixed costs, freelance, the founder's draw, ads and other costs only. It leaves out `bookingCostsCents` (shifts, unit costs, products' one-off costs), loan principal, interest and fees, and possibly more. Cash is right; the summary is not |
| 2 | W21 onward: owned-boat upkeep (1,250 a month, about 312 a week) is taken from cash but missing from "Company paid". The tester also could not tell it is charged weekly | Same cause; also show when upkeep is charged |
| 3 | W33 to W37: crew, hosts, tests and transfers missing from "Company paid" (W37: 4,100 of tests shown as 450) | Same cause |
| 5 | W21 to W24: runway says one week and Money says "Week 22: we are out of money" with 46,215 cash and 5,250 savings; the business is fine, and runway later jumps to 80 weeks | Runway uses the last 4 weeks' pace (`netChangeCents`). A loan-financed boat purchase (paid by the bank to the seller) or other one-offs probably count as weekly burn. Find out, then exclude financed purchases and one-off investments from the pace, or show them separately |

### 3.2 Money rules that look wrong (high)

| # | Finding | Expected |
|---|---|---|
| 4 | W34 to W37: the minimum-to-sail option quotes 150 a cabin for moving guests to a partner boat; the charge was 1,980 for 3 cabins and 1,155 for 2 | Charge what is quoted, or quote every component (refunds, fare differences) before the player chooses and itemise it in the report |
| 8 | W2 a guest pays 255 for a cabin; W5 the company cancels them (no staff on the roster). No refund is shown and cash keeps the 255 | When the operator cancels, refund what the guest paid, as a visible line. All bookings scenarios |
| 17 | W34 the policy changes from flexible to strict; W35 "4 guests cancelled and paid anyway, as your policy says" for bookings made under flexible terms (needs reproduction) | Store price, deposit and cancellation terms on each booking when it is made, and settle by those terms |
| 10 | W15 and W18: "A month of guests covers company costs" and "covers all costs, you included" are awarded with 0 guests served, from deposits | Base these milestones on money earned from guests served (deposits count when the guest sails), or rename them to say they count cash collected. All bookings scenarios |

### 3.3 The loan form (high, every scenario with a bank)

| # | Finding | Expected |
|---|---|---|
| 6 | Working capital "up to three months of fixed costs: 2,880"; the only step is "Borrow 5,000 more", which is disabled, so none can be chosen (`stepCents: 500000`) | Steps that fit the cap (a smaller step, or a last step to exactly the cap) |
| 7 | With nothing selected, "The plan asks for 10,000 in all" (`minCents: 1000000`); selecting the gulet makes it 200,000 | Derive the total from the chosen items; if there is a minimum loan, say so, and do not allow an empty application |
| 23 | "12 months without repayments" is interest-only (2,123 a month in interest) | Say "interest only for 12 months", and show the first interest date, the first repayment date and the schedule before the player accepts |

### 3.4 Screens that mislead (medium)

| # | Finding | Expected |
|---|---|---|
| 9 | "2 guests served: 3,470 paid on the day" while 3,470 is all receipts, including new bookings' deposits | Separate deposits for new bookings, balances on departure and other receipts, each with its week |
| 11 | The calendar repeats one boat-week's occupancy under the route and the charter product; enabling products (company, invoices, booking, purchase) get calendars saying "not running" | One calendar row per boat and week (cabins sold, or a charter); readiness of enabling products shown elsewhere |
| 12 | W36 private charter: the summary shows 16 guests booked, but the roster coverage row shows only the cabin route ("0 booked, the roster covers 0") | Coverage per boat-week, across booking types |
| 13 | After a 200,000 financed purchase the boat card says "Spent on it so far: 313" | Show purchase price, financing and running costs separately, or rename to "Running costs since you bought it" |
| 14 | The lease is offered "with its crew", yet Money lists crew at 1,800 a week used | State the full terms in one place: lease, deposit, what crew, fuel and food cost, and when each is paid |
| 15 | The organised stage in Leinen los introduces "the share of demos that turn into trials"; tab names change between stages (Bookings to Calendar, Who works to Roster, Getting guests to Channels); Help says "Finance" while the tab is "Money" | Tourism wording at every stage (enquiries, quotes, deposits, confirmed cruises); stable tab names, or a one-line notice when they change; Help built from the current labels. Extend the tourism word check so it catches this |
| 16 | "1 calm days", "Adults-only and family weeks is ready", "You use The gulet by the place", "16 new bookings from Private charters" for one charter | Plurals, agreement, scenario-specific wording, "one charter for 16 guests". Check the same patterns in every scenario |
| 21 | The header's revenue and guests have no time window; guests fell from 43 to 41 with nobody new served | Label the window ("last 4 weeks") |
| 18 | The plan says "0 of 50 h" while the bar says "free 65 h" | "Normal 50 h, at most 65 h", with overtime shown differently |

### 3.5 Optional, if time allows

| # | Suggestion |
|---|---|
| 20 | Quote private charters per boat-week, with the guests included, instead of per person |
| 25 | A booking ledger on the Bookings or Money tab: each booking with boat, week, party size, price, policy, deposit, balance, fees, refunds |
| 22 | Say "four-week months" where money is shown per month, and explain the "last 13 months" goal in those terms |

Not in this plan: hosting fatigue (19) and feature effect descriptions (24). Add them to `docs/BACKLOG.md`.

### 3.6 Kantino (60 weeks), also Zollstock and Kantino long where the same screens apply

Forecasts (high):

| # | Finding | Expected |
|---|---|---|
| K1 | W15: "Week 17: we are out of money. Unless Isarblick Werbeagentur pays." The invoice was 10; the gap was about 760 | Name a payment only if it actually changes the outcome; otherwise "10 may come in; the gap stays about 760". Show the dated cash schedule behind the forecast |
| K2 | W9 to W12: a 3,300 a month hire was agreed (start W11), but runway still said 10 weeks and "Week 22: out of money"; after the first salary it fell to 3 weeks, failure in W16. At the known costs about 6 weeks was right | A forward forecast that includes agreed hires from their start date, rent, scheduled one-offs and month-end dates. Label the trailing measure "at the last 4 weeks' pace" if it stays |
| K3 | B4 to B5: runway jumped from 29 to 48 weeks after 1,350 of refundable deposits, with no paying customers | Deposits, financing and one-offs are not a recurring pace. Show deposits as owed until delivered, with their refund date |

Together with finding 5 (Leinen los), these call for **one forecast rule for every scenario**: known obligations and their dates ahead, recurring income only, one-off inflows and financed purchases excluded. Decide it once, in step 1.

Screens and copy (medium unless stated):

| # | Finding | Expected |
|---|---|---|
| K4 | Post-mortem: "1 of 10 paid a deposit at 10" for two pre-sale batches at 450 (0 of 5) and 10 (1 of 5) | Keep each test's price and size: "450: 0 of 5; 10: 1 of 5; 1 of 10 in all". Same for landing tests |
| K5 (low) | A lead found by phone "has replied to your first email" | Copy chosen from the lead's actual channel, or channel-neutral |
| K6 | Inbox keeps "3 leads want a demo" after all three demos are booked in the plan | Count only demos not yet booked; show "3 booked this week" |
| K7 | An accepted hire shows as "Your Salesperson" with "Let go (3,300)" a week before starting; the W9 report does not mention the accepted offer | "Offer accepted, starts week 11", the first salary date and amount, from the moment of the offer. Report the acceptance |
| K8 | "Candidates arrive in week 8", but they appear in week 8's results and can be chosen in week 9 | Say when they can be chosen ("you can choose in week 9"), or deliver them at the start of week 8 |
| K9 | With three deposits paid, Who pays still says "A lead becomes one after a demo and a trial"; deposit customers activate when the product is ready, without a demo | Describe both paths; for deposit customers: "activate when what they need is ready" |
| K10 | Deposit cards show no amount, no refund date, nothing about what they are waiting for | Show the amount and the refund date, and the features they asked for that the player has heard about (from interviews and their messages). Do not reveal hidden must-haves the player has not learned; say "they may need more" |
| K11 | The header "Revenue" is the monthly subscription rate, not cash received | "Monthly revenue (subscriptions)" or "MRR", explained in Help; cash received shown elsewhere |
| K12 (low) | After week 1 resolves, the header says "Week 2 of 60" while the report says "Week 1" | "Results of week 1", "Next: plan week 2" |
| K13 | Post-mortem: "Revenue peaked at 10 a month, and you and the company cost 6,795" with no time unit | "6,795 per four-week month at the end", with run totals shown separately |
| K14 (low) | Failure timeline: "The company pays your living costs from here", then "Closed" | Message conditional on the company surviving |
| K15 | Generic advice "talk to more people before you build" next to a specific analysis saying interviews would not have helped, only deposits | Put the specific bottleneck first; generic advice only when it fits the run's evidence |
| K16 (low) | "You have 1 leads", "1 h are already spent", "1 deposits" | Plurals everywhere (0, 1, many). One shared helper, a test per scenario's messages |
| K17 | Accepting a 15 a month bank fee and a 225 accountant payment left the Money preview at "Costs 405"; 645 was paid | The preview includes the week's queued decisions: new recurring costs and one-offs |
| K18 (low) | "Company received 1,000" lumps a transfer from savings with customer money | Customer receipts, financing and transfers as separate lines (the same ledger work as step 1) |
| K19 | The failure timeline leaves out the 3,300 hire and the 375 desk, the main causes | Commitments and cost steps in the timeline |
| K20 (low) | The tab "Who pays" becomes "Pipeline" at the organised stage | Same rule as finding 15: stable names, or a one-line notice when they change |
| K21 | Forced hours and fines ("2 h thanks to a fine or something you promised") do not name the message they came from; repeated 600 accountant penalties | Link each forced hour and charge to its source message and choice; show upcoming defaults and their cost before End week |
| K22 | A part-time hire costs the full 3,300 at the first month end after about two working weeks; nothing explains it | Explain the pay rule at the offer (full month or pro rata, and whether employer costs are included); preview the first salary |
| K23 (low) | Intro: savings "last about seven months"; 14,250 at 675 a week is about 5 four-week months alone, about 7.5 with company cash | Correct the sentence: "together with company cash, about seven four-week months" |
| K24 | Inbox defaults applied at week end are shown only on the message | The same upcoming-defaults list as K21 |

To the backlog, not this plan: what the Kantino price buys (S01), per-customer costs as it scales (S02), bug severity and quality explained (S05), uncertainty in the luck summary (S07).

### 3.7 Griffig, Fabriketage, Rückenwind, Hinterhof

Critical and high: wrong money or wrong outcomes.

| # | Finding | Expected |
|---|---|---|
| H-01 (critical) | Hinterhof: accepting the 75,000 loan and completing the 60,000 takeover in the same week (the payout week) takes 60,000 twice: the run closed at −16,460 where one charge gives about +43,540 combined. The same market with the takeover completed a week after payout charged it once | Every purchase is paid exactly once, whether its preparation finishes before, in, or after the payout week. Regression tests for all three orders, in every scenario with a bank and purchases |
| G-02, F-02 | Griffig W28 and Fabriketage W24: "the bank called the loan after two missed payments in a row", though every earlier interest payment was reported as paid; the first shortfall was that week | Find whether the counter or the message is wrong. Show due, paid, arrears and the missed-payment count on the loan card. The failure text names the real trigger (insolvency, or misses that really happened). Never count two parts of one instalment as two periods |
| S-03 | Interest is annual rate ÷ 12 charged every four-week month: 13 charges a year, about 8% more than the stated rate (Griffig 260,000 at 5.98%: 1,296 thirteen times a year) | Charge per four-week period at the annual rate × 4 ÷ 52, or say the rate is per four-week period. Check rent, wages and every other "a month" amount for the same 12 against 13 problem, and state the convention in Help |
| H-03 | Hinterhof W9 and W10: "covers company costs" and "covers all costs, you included" awarded on gross revenue (8,180 and 10,300) while costs, ingredients excluded, were 9,924 and 12,624 | Same fix as finding 10, stated more strictly: milestones on money earned after ingredients, waste, commissions, staff, fixed costs, loan payments and (for "you included") living costs. Show the calculation |
| G-06 | Griffig W5: a landlord offers an expansion "now that the hall pays its way, or climbers are being turned away", before the hall has opened (turned-away guests of a closed hall counted) | Stage offers and anything else that counts turned-away guests use only weeks the business was open |
| G-03 | Griffig post-mortem: every slot shows "0 packed, 308 quiet" after 28 weeks with 3 open (308 = 28 weeks × 11 areas), including closed slots | Count open services only; separate closed, unbuilt, quiet and full |
| G-04 | Griffig failure screen: visits stay at the week before (727), revenue updates, post-mortem says 1,008 | Finalise every metric before the failure screen |

Medium: screens and rules that mislead.

| # | Finding | Expected |
|---|---|---|
| G-05 | Griffig: reception and auto-belays are ready, but "Not open yet. Complete the common fit-out and at least one chosen area"; the auto-belays do not count as an area and age as "tired" with no visits | Say before purchase what can open the hall. Either let the auto-belays count, or say they need a wall. Routes do not tire before opening |
| G-07 | Memberships "include" rope walls, children's area and training boards that were never built | "Available now" against "included once built" |
| G-08 | Contract offers of 10 shifts a week for every role: a route setter at 10 eight-hour days (80 h a week) | Contracts in hours per week per role; if a contract is a team, say so and show headcount |
| F-03 | Fabriketage: hold fees and advances appear as revenue before opening | Same as finding 10 and K3: advances owed until the event; earned revenue separate |
| F-04 | Fabriketage: 2.5 stars from 4 reviews before any event | Reviews only from served guests, or attributed to their source |
| F-05 | The bank's 20% own-money rule is checked only after applying (four weeks lost on a rejection) | Show the live own-money ratio and the largest loan that passes before applying |
| F-06 | A loan pays suppliers, but preparation is still 0 of 40 h; the opening date and cash at opening are nowhere | A timeline on the loan and build screens: funding, preparation, construction, opening, and cash at opening |
| R-02 (low) | "0 of 20 people bought a voucher, 0 in all. You owe them a visit." | No obligation line when nothing sold |
| R-03 | Rückenwind: the price stepper is a reference price; customers pay derived prices with unexplained multipliers | Label it, show what each product costs at it, or price products directly |
| R-04 (low) | The rescue boat gets a bookings calendar that says "not running" | Same as finding 11: support equipment in a readiness panel |
| R-05 | "Balance, last 8 weeks" lists 4 | Show 8, or say 4 |
| R-06 | "7 guests cancelled and paid anyway" with no amount; service receipts not split by activity | Itemise delivered, cancelled, refunded, fees, by activity; name the role and slot behind a roster cancellation |
| H-05 | A cook hired this week is missing from the roster preview ("cooks for 0") | The preview includes hires starting this week and departures |
| H-06 (low) | Server contracts cost more than the same casual shifts with no visible benefit | Explain the benefit, or price them as T14's sleeping contracts were |
| H-08 | Same-week walk-in demand is invisible when staffing (259 lunch covers arrived, 110 served) | A demand range per service from what the player has seen |
| S-01 | Header totals have no time window; runway moves against cash (Griffig 98,800 cash: 2 weeks) | Covered by the forecast rule (3.6) and K11 |
| S-02 | Steppers are too fine for large amounts: event prices around 5,000 move 5 per click; 30 clicks for opening hours | Coarse and fine steps scaled to the amount (as `priceSteps` already does for tourism prices), direct number entry, "apply to all slots" |
| S-04 | Empty loan plans show "50,000 in all" (Griffig), "10,000" (Fabriketage) | Same as finding 7 |
| S-05 | Living costs labelled "from your savings" when the company pays them; "Rent: none" next to rented premises | Labels from the current state; base premises costs itemised |

To the backlog, not this plan: the balance observations (Griffig's break-even in its first month, Fabriketage's default prices above willingness to pay, Rückenwind's empty winter weeks, Hinterhof's expansion economics).

### 3.8 Order of work

Findings that cost the player money or end runs wrongly come first, in step 1: H-01, G-02 and F-02, S-03. They change outcomes in every scenario with a loan; check playability there.

## 4. Step 1: money bugs first, then one ledger and a test that it adds up

0. **First, the money bugs that end runs or charge twice** (section 3.8): H-01, G-02 and F-02, S-03, each reproduced first, with regression tests. These change outcomes; check playability (main part, 1,000 seeds) in every scenario with a loan afterwards.
1. **The invariant test.** For every scenario and mode, every bot, a sample of seeds (at least 50 runs per scenario), every week: `cash at the end = cash at the start + received − paid`, using exactly the totals the weekly report shows, and the same for savings. Run it before fixing anything and record which scenarios fail.
2. **Fix the report** so its totals come from the same ledger that changes cash: every field of the week ledger lands in "received" or "paid", or is shown as its own line (transfers between company and savings, investment, a loan paid out to a seller). Itemise the paid total into groups the player can open (running costs, staff, products and one-offs, loan, other).
3. **Forecast** (findings 5, K1, K2, K3): one rule for every scenario, as section 3.6 says. Tests with a financed purchase, an agreed hire before its start, and refundable deposits.
4. **Separate lines** for customer receipts, financing and transfers (K18), from the same ledger.
5. The invariant test passes everywhere. It stays in the suite.
6. **Proof:** display only, so the main part of every scenario must be identical (1,000 seeds), unless the forecast fix changes a bot that reads runway. If it does, record it and check playability in the affected scenarios.

Tag `plan8-ledger`.

## 5. Step 2: money rules and the loan form

1. Findings 4, 8, 17, 10 and H-03, G-06, G-03, G-04, each reproduced first.
2. The loan form: findings 6, 7, 23, F-05 and S-04.
3. Tests for each.
4. Check playability (main part, 1,000 seeds) in each scenario whose outcomes changed; at most 2 tuning rounds if one leaves its range.

Tag `plan8-rules`.

## 6. Step 3: screens and wording

1. Findings 9, 11, 12, 13, 14, 15, 16, 21 and 18, then K4 to K17 and K19 to K24, then G-05, G-07, G-08, F-03, F-04, F-06, R-02 to R-06, H-05, H-06, H-08, S-02 and S-05.
2. Then the optional items 20, 25 and 22, if they fit in about half the time steps 1 and 2 took.
3. UI checks as in earlier plans: no cut-off text, axe clean at 375, 390, 430 and 1440 px in Chromium and WebKit, all three UI stages.
4. Proof: display only, main part identical.

Tag `plan8-screens`.

## 7. Step 4: wrap up

1. The main part of every scenario on 1,000 seeds once, compared with `plan7-complete`: identical except in the scenarios a step 2 rule changed. **No full report** unless a step 2 fix moved a scenario's win rate by more than its margin; then run that scenario's full report only.
2. `pnpm seeds` if outcomes changed.
3. Docs: `docs/schema.md`, `docs/decisions.md`, the specs a rule change touched, `docs/BACKLOG.md` (add 19, 24, S01, S02, S05 and S07 from Kantino, the balance observations of 3.7, and anything left open; update the date).
4. Final report `docs/autonomous8/reports/final.md`: each finding with reproduced (yes or no), fixed (yes or no) and how; the invariant test's first results; scenarios whose outcomes changed; "For Henry to review".
5. Tag `plan8-complete`.

## 8. STATUS.md template

```
# Autonomous run 8 status

## Current
Step: <step and sub-step>
Last commit: <hash and message>
Next action: <one or two sentences>

## Checklist
- [ ] Step 0: set up (tag plan8-baseline)
- [ ] Step 1: money bugs, one ledger and the invariant test (tag plan8-ledger)
- [ ] Step 2: money rules and the loan form (tag plan8-rules)
- [ ] Step 3: screens and wording (tag plan8-screens)
- [ ] Step 4: wrap up (tag plan8-complete)

## Findings
<number, reproduced, fixed, note>

## For Henry to review (non-blocking)
<one line each, newest first>

## Stopped
<empty unless a hard stop happened>
```

## 9. Out of scope

- New features beyond the optional items in 3.5.
- Balancing beyond keeping changed scenarios in range.
- Everything else in `docs/BACKLOG.md`.
