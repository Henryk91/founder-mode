# Scenario spec: Kantino

Source of truth for `packages/content/src/scenarios/kantino/`. Translate these tables into YAML.

**All values are invented starting points and have not been tested.** They are meant to be tuned by bot runs (see the balancing targets in the implementation plan). When a value changes, update this file and note it in `docs/decisions.md`.

Money is given in EUR here for readability. Store it as integer cents.

## 1. Premise

The player is a solo founder in Munich building Kantino, software that lets a workplace collect and place a shared daily lunch order. Three kinds of customers might want it. In each run only some of them really do, and the player does not know which.

## 2. Starting values

| Value | Start |
|---|---|
| Company cash | 9,000 |
| Personal savings | 14,250 |
| Founder living costs | 675 per week (2,700 per 4 week month), paid from personal savings |
| Company costs | Tools and hosting 180 per month, accountant 225 per month |
| Default price | 450 per month per customer (player can change it at any time; customers keep the price they signed at) |
| Founder hours | 50 per week, up to 65 can be planned |
| Energy | 80 of 100 |
| Skill: interviewing | 0.10 |
| Skill: selling | 0.10 |
| Product | Nothing shipped, quality 70, 0 bugs |
| Office stage | Kitchen table |
| Max weeks | 60 |

Cash and savings together last about 30 weeks (7.5 months) at 3,105 a month without revenue. History: Phase 3 cut cash from 15,000 to 10,000; engine 0.7.0 set 6,000 cash, 9,500 savings and 60 weeks; then every money value was scaled by 1.5 (ratios unchanged).

"Profitable" for the winning ending means: money received from customers in a 4 week period (paid invoices and pre-sale deposits) is at least company costs plus founder living costs for that period.

## 3. Segments

### 3.1 Fixed properties

| | Small offices | Coworking spaces | Medical practices |
|---|---|---|---|
| Id | `small_offices` | `coworking` | `medical` |
| Description shown to player | Agencies and firms with 10 to 50 staff | Shared workspaces with many small tenants | Doctors and dentists with shift based teams |
| Size (reachable companies) | 800 to 2000 | 100 to 300 | 400 to 1200 |
| Willingness to pay per month | 375 to 720 | 900 to 2250 | 390 to 630 |
| Must have features | `basic_ordering`, `invoice_export`, `chat_integration` | `basic_ordering`, `multi_site`, `member_billing` | `basic_ordering`, `allergy_filter`, `shift_schedule` |
| Channel response: cold email | 0.05 to 0.10 | 0.025 to 0.06 | 0.04 to 0.08 |
| Channel response: phone | 0.04 to 0.075 | 0.05 to 0.11 | 0.06 to 0.125 |
| Channel response: in person | 0.025 to 0.125 | 0.06 to 0.12 | 0.06 to 0.12 |
| Invoice lateness, mean days | 5 | 12 | 20 |
| Share that never pays | 5% | 3% | 8% |
| Share that pays only once chased | 25% | 25% | 25% |

Each value given as a range is drawn uniformly at game creation from the seed.

Engine 0.7.0: willingness to pay medical 260 to 420 (was 180 to 320) and small offices 250 to 480 (was 200 to 450), at the old money scale, because at the default price a viable medical market sat below it in 86% of runs. Tuning round 1 raised medical cold email (was 0.01 to 0.03) and in person (was 0.05 to 0.10) and lowered coworking in person (was 0.075 to 0.15). All money then scaled by 1.5.

Phase 3 tuning: willingness to pay was 150 to 400 for small offices and 100 to 250 for medical practices. At the default price of 300 the medical market converted at a quarter of the rate, so a run where it was viable was nearly unwinnable (11% for the best bot against 75% for coworking). Every channel response was also halved, so the best channel finds about 0.07 leads per hour at the starting selling skill (one lead per 15 h, as in section 10). Before, 45 h of in person outreach found 7 to 8 leads a week.

### 3.2 Roles, assigned randomly per run

At game creation the engine shuffles three roles across the three segments. The role sets the hidden pain and politeness. This guarantees one good market and one trap in every run, in a different place each time.

| Role | Pain | Politeness bias in interviews |
|---|---|---|
| Viable | 0.60 to 0.85 | 0.05 to 0.15 |
| Mediocre | 0.35 to 0.55 | 0.25 to 0.40 |
| Trap | 0.10 to 0.25 | 0.50 to 0.65 |

The trap is designed so that early interviews sound encouraging while pre-sales fail. With an untrained interviewer all three markets average "Painful": the viable market sounds most in pain only about 60% of the time after 5 interviews each. Practice (lower politeness bias) and feature mentions tell them apart. (Phase 3 tuning: politeness was 0.10 to 0.20, 0.15 to 0.30, 0.28 to 0.35, and viable pain 0.65 to 0.90.)

## 4. Features

| Id | Name shown | Build hours | Required by | Bugs added on shipping |
|---|---|---|---|---|
| `basic_ordering` | Daily group order | 40 | all three | 2 to 3 |
| `invoice_export` | Invoice export for accounting | 25 | small offices | 1 to 2 |
| `chat_integration` | Order reminders in team chat | 20 | small offices | 1 to 2 |
| `multi_site` | Several locations in one account | 45 | coworking | 2 to 3 |
| `member_billing` | Charge each member separately | 50 | coworking | 2 to 3 |
| `allergy_filter` | Allergy and diet filter | 30 | medical | 1 to 2 |
| `shift_schedule` | Orders by shift | 35 | medical | 1 to 2 |
| `supplier_portal` | Portal for restaurants | 60 | nobody | 2 to 3 |

Total build hours to fully serve a segment: small offices 85, medical 105, coworking 135.

`supplier_portal` is a deliberate temptation: it sounds valuable in events and messages, but no segment requires it.

The player sees feature names and build hours. The "Required by" column is hidden and must be inferred from interviews, where customers of a segment mention their must have features with a probability that rises with pain.

## 5. Experiments

| Experiment | Cost | Delay | Parameters |
|---|---|---|---|
| Interview | 2 h each | Same week | Noise N(0, 0.30). Skill gain +0.01 per interview, capped at 0.80 |
| Landing page test | 8 h plus an ad budget of 300 or 750 | 1 week | 2.25 per visitor, so 133 or 333 visitors. Sign up chance (0.02 + 0.15 x pain) x price factor at the price shown. Every 5 sign ups become an open lead |
| Pre-sale | 6 h per batch of 5 cold prospects | 1 week | No leads needed, at most 3 batches per market. Commit chance 0.25 x pain x price factor. A commit pays a one month deposit, becomes a customer once the market's must haves ship (first month prepaid), or is refunded after 8 weeks |

### Interview text buckets

The observed value (see the formula in the implementation plan) is shown only as text:

| Observed value | Bucket | Example quote |
|---|---|---|
| below 0.20 | Not a problem | "We just each bring something. It works." |
| 0.20 to 0.40 | Mild | "It is a bit chaotic some days, I suppose." |
| 0.40 to 0.60 | Noticeable | "Someone always ends up collecting money. It is annoying." |
| 0.60 to 0.90 | Painful | "I lose half an hour every day on this." |
| above 0.90 | Urgent | "If you can fix this I want it next week." |

Write at least 10 quotes per bucket per segment. In each interview there is also a chance of 0.3 + 0.3 x pain that the person mentions one of the segment's must have features in their own words.

Phase 3 tuning: noise was 0.20, skill gain 0.02, the Urgent bound 0.80, and the mention chance 0.3 + 0.5 x pain.

## 6. Sales

| Value | Start |
|---|---|
| Demo | 3 h of founder time, or done by a hired salesperson |
| Trial length | 1 week |
| Skill gain | selling +0.005 per demo held, capped at 0.80 |
| Chase an invoice | 1 h, pays it next week with chance 0.30, including the quarter of invoices that are only paid once chased |
| Outreach saturation | One channel in one market works fully up to 36 h over the current and previous two weeks, then 0.3 per hour |

Funnel formulas are in the implementation plan, section 4.5. The scenario sets their constants:

| Constant | Value | Was before Phase 3 tuning |
|---|---|---|
| Lead to demo per week | 0.18 x (0.4 + 0.6 x pain) | 0.25 x (0.4 + 0.6 x pain) |
| Demo to trial | 0.05 + 0.40 x fit | 0.20 + 0.60 x fit |
| Monthly churn | 0.03 + 0.20 x (1 - fit) + 0.01 x bugs, plus 0.15 x (price / willingness to pay - 1) above the willingness to pay (Phase 8), capped at 0.6 | 0.02 + 0.25 x (1 - fit) + 0.01 x bugs |

Reason: a bot that found the viable market ended with about 19 customers when 7 make the company profitable, so finding the market was the whole game. Now fewer demos turn into trials and selling skill grows half as fast. Churn stays moderate (about 11% a month for a good fit without bugs), because a leaky bucket is less fun than a slow funnel; a churn of 0.06 + 0.45 x misfit was tried and gave 20 to 30% a month for products that fit.

## 7. Founder energy

| Rule | Value |
|---|---|
| Each planned hour above 50 | Energy -2 |
| Each planned rest hour | Energy +1.5 |
| Week with 50 h or fewer planned | Energy +3 |
| Energy 70 or more | Sales chances x 1 |
| Energy between 70 and 30 | Sales chances fall in a straight line from x 1 to x 0.85 |
| Energy 30 or below | Sales chances x 0.85 |
| Energy at 0 for 3 weeks in a row | Burnout ending |

"All success probabilities" means the sales chances: leads found, lead to demo, demo to trial, trial to paying. These two rules were planned for Phase 4 and arrived in Phase 3 tuning, because without them planning 65 h every week had no cost and was the best strategy.

## 8. The one hire

| | Developer | Salesperson |
|---|---|---|
| Monthly cost to the company | 3,900 | 3,300 |
| Hours | Part time, 20 h a week | Part time, 20 h a week |
| Weekly output | 20 build hours x true skill | 20 outreach hours x true skill, holds demos first; outreach at its own selling skill of 0.3 |
| True skill (hidden) | 0.5 to 1.2 | 0.5 to 1.2 |

- Search: 6 h, then 3 candidates after 2 weeks
- Interview impression shown to the player: true skill + N(0, 0.25), displayed as one of "weak", "solid", "strong", "outstanding"
- Start: 2 weeks after the offer
- Letting someone go: 4 weeks of salary
- Only one hire in total in the early MVP

Engine 0.7.0 made the hire junior and part time (was 4,200 and 3,800 at the old scale, full time). No salary tried pays back within 60 weeks, so the hire is a choice that rarely pays (see `docs/decisions.md`).

## 9. Office stages

| Stage | Trigger | Effect |
|---|---|---|
| Kitchen table | Start | None |
| Coworking desk | Offered by an inbox event (`coworking_desk`) for sure, once, in week 8 or the week after the first paying customer, whichever comes first | Adds a company cost of 375 per month. Walk-in leads from the coworking market, 0.9 a week on average (one in most weeks) |

Each office stage may name walk-in leads: the market they come from and a mean rate per week. Walk-in leads are ordinary open leads, marked as walk-ins on their card, named in the weekly results, and counted on their own in the post-mortem.

The desk is a real decision: it pays when coworking is the real market and costs when it is not. Taking it against declining it on the same seeds (`validate_then_build`, 1000 seeds): coworking viable +10.7 points, mediocre -13.6, trap -9.6. A careful founder takes it only when their own evidence puts coworking spaces first.

History: the spec desk (375 per month, energy +1, in person x 1.2) cost 9 points; a cheaper desk lifting every channel (225, x 1.3 and x 1.15) was neutral everywhere, shortening losing runs by one to two weeks and never changing who wins. Energy +1 changed nothing in any comparison (bots are never tired) and was dropped.

The player may decline. The scene image follows the stage.

## 9b. Milestones

In display order. The progress bar shows the first one not reached yet, skipping those marked off the bar.

| Id | Name | Reached when |
|---|---|---|
| `first_interview` | First interview | 1 interview |
| `first_deposit` | First deposit | 1 pre-sale deposit |
| `first_customer` | First paying customer | 1 customer (keeps its full screen moment) |
| `covers_company_costs` | Monthly revenue covers company costs | Monthly revenue at least the monthly company costs (tools, accountant, salary, office) |
| `covers_all_costs` | Monthly revenue covers all costs, you included | Monthly revenue at least company costs plus 4 weeks of living costs. Turns the UI organised, unless the first hire did earlier |
| `first_hire` | First hire | The hire starts work. Not on the bar. Turns the UI organised, unless revenue did earlier |
| `weeks_26` | 26 weeks survived | Week 26 is over and did not end the run |
| `weeks_52` | 52 weeks survived | Week 52 is over and did not end the run |

## 10. Rough sanity check (by hand, not simulated)

A founder who identifies a viable small offices segment, ships its three must have features (85 h), and then spends about 15 h per week on outreach should get roughly one new lead per week early on and a new paying customer every two to three weeks, reaching profitability somewhere in the second half of the run. A founder who builds for the trap segment should get friendly interviews and almost no paying customers.

This estimate is a back of the envelope calculation. Treat the bot report as the real answer.

## 11. Phase 4 and engine 0.7.0 values

Budget quotes (Phase 8): about one interview in four also names a rough monthly figure in the market's own words, honest on average (willingness to pay times 1 + N(0, 0.25)), rounded to 50 EUR below 1,000 and 100 EUR above. Five quotes per market in the scenario YAML.

Price (Phase 8, engine 0.11.0): with r = price / willingness to pay, the price factor is (1 + e^(-13.5)) / (1 + e^(10 x (r - 1.35))): 1 at no price, 0.97 at r 1, 0.82 at 1.2, a half at 1.35. It scales trials becoming customers, landing sign ups and pre-sale deposits. A trial lost to the price says so; a customer leaving over the price says so. Calibrated so the careful bot at the default price plays as before (target 2 within 1 point, 6 within 1, 7 within half a week).

Landing test 8 h, ads 300 or 750 EUR, 225 cents per visitor, 1 week, 5 sign ups per lead. Pre-sale 6 h per batch of 5 cold prospects, 1 week, commit rate 0.25 x pain x price factor, at most 3 batches per market, refund after 8 weeks. Invoices due after 14 days, written off 8 weeks after due, chase 1 h for 0.3; a quarter of invoices wait for a chase. Books: the accountant's message from week 3, weight 40 (Phase 5, to keep about 7 arrivals a run among 108 events), cooldown 5 weeks: sort (3 h), pay 225 EUR, or later (half the time a 600 EUR fine, half the time 4 h lost). Hire as in section 8, impression labels weak below 0.7, solid below 0.95, strong below 1.1. Inbox: up to 3 draws a week at 0.4 each, plus one guaranteed draw in a week without a new message while fewer than 2 are open; open 2 weeks, at most 4 open. Since Phase 5 every event arrives once per run except the books, which set their own cooldown; the inbox cooldown of 8 weeks no longer applies to any event. The coworking desk (section 9) arrived in Phase 7.
