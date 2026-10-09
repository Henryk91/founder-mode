# Scenario spec: Kantino

Source of truth for `packages/content/src/scenarios/kantino/`. Translate these tables into YAML.

**All values are invented starting points and have not been tested.** They are meant to be tuned by bot runs (see the balancing targets in the implementation plan). When a value changes, update this file and note it in `docs/decisions.md`.

Money is given in EUR here for readability. Store it as integer cents.

## 1. Premise

The player is a solo founder in Munich building Kantino, software that lets a workplace collect and place a shared daily lunch order. Three kinds of customers might want it. In each run only some of them really do, and the player does not know which.

## 2. Starting values

| Value | Start |
|---|---|
| Company cash | 10,000 (Phase 3 tuning, was 15,000) |
| Personal savings | 12,000 |
| Founder living costs | 450 per week, paid from personal savings |
| Company fixed costs | Tools and hosting 120 per month, accountant 150 per month |
| Default price | 300 per month per customer (player can change it at any time; customers keep the price they signed at) |
| Founder hours | 50 per week, up to 65 can be planned |
| Energy | 80 of 100 |
| Skill: interviewing | 0.10 |
| Skill: selling | 0.10 |
| Product | Nothing shipped, quality 70, 0 bugs |
| Office stage | Kitchen table |
| Max weeks | 78 |

"Profitable" for the winning ending means: money received from customers in a 4 week period is at least company fixed costs plus founder living costs for that period.

## 3. Segments

### 3.1 Fixed properties

| | Small offices | Coworking spaces | Medical practices |
|---|---|---|---|
| Id | `small_offices` | `coworking` | `medical` |
| Description shown to player | Agencies and firms with 10 to 50 staff | Shared workspaces with many small tenants | Doctors and dentists with shift based teams |
| Size (reachable companies) | 800 to 2000 | 100 to 300 | 400 to 1200 |
| Willingness to pay per month | 200 to 450 | 600 to 1500 | 180 to 320 |
| Must have features | `basic_ordering`, `invoice_export`, `chat_integration` | `basic_ordering`, `multi_site`, `member_billing` | `basic_ordering`, `allergy_filter`, `shift_schedule` |
| Channel response: cold email | 0.05 to 0.10 | 0.025 to 0.06 | 0.01 to 0.03 |
| Channel response: phone | 0.04 to 0.075 | 0.05 to 0.11 | 0.06 to 0.125 |
| Channel response: in person | 0.025 to 0.125 | 0.075 to 0.15 | 0.05 to 0.10 |
| Invoice lateness, mean days | 5 | 12 | 20 |
| Share that never pays | 5% | 3% | 8% |

Each value given as a range is drawn uniformly at game creation from the seed.

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
| Landing page test | 8 h plus an ad budget of 200 or 500 | 2 weeks | 1.50 per visitor, so 133 or 333 visitors |
| Pre-sale | 6 h per batch of 5 prospects | 1 week | Requires at least 5 leads in that segment |

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
| Trial length | 2 weeks |
| Skill gain | selling +0.005 per demo held, capped at 0.80 |
| Chase an invoice | 1 h, raises the chance of payment next week by 0.30 |

Funnel formulas are in the implementation plan, section 4.5. The scenario sets their constants:

| Constant | Value | Was before Phase 3 tuning |
|---|---|---|
| Lead to demo per week | 0.18 x (0.4 + 0.6 x pain) | 0.25 x (0.4 + 0.6 x pain) |
| Demo to trial | 0.05 + 0.40 x fit | 0.20 + 0.60 x fit |
| Monthly churn | 0.03 + 0.20 x (1 - fit) + 0.01 x bugs, capped at 0.6 | 0.02 + 0.25 x (1 - fit) + 0.01 x bugs |

Reason: a bot that found the viable market ended with about 19 customers when 7 make the company profitable, so finding the market was the whole game. Now fewer demos turn into trials and selling skill grows half as fast. Churn stays moderate (about 11% a month for a good fit without bugs), because a leaky bucket is less fun than a slow funnel; a churn of 0.06 + 0.45 x misfit was tried and gave 20 to 30% a month for products that fit.

## 7. Founder energy

| Rule | Value |
|---|---|
| Each planned hour above 50 | Energy -2 |
| Each planned rest hour | Energy +1.5 |
| Week with 50 h or fewer planned | Energy +3 |
| Energy below 30 | All success probabilities x 0.85 |
| Energy at 0 for 3 weeks in a row | Burnout ending |

## 8. The one hire

| | Developer | Salesperson |
|---|---|---|
| Monthly cost to the company | 4,200 | 3,800 |
| Weekly output | 30 build hours x true skill | 25 outreach hours x true skill, and holds demos |
| True skill (hidden) | 0.5 to 1.2 | 0.5 to 1.2 |

- Search: 6 h, then 3 candidates after 2 weeks
- Interview impression shown to the player: true skill + N(0, 0.25), displayed as one of "weak", "solid", "strong", "outstanding"
- Start: 4 weeks after the offer
- Letting someone go: 4 weeks of salary
- Only one hire in total in the early MVP

## 9. Office stages

| Stage | Trigger | Effect |
|---|---|---|
| Kitchen table | Start | None |
| Coworking desk | Offered by an inbox event once from week 8 or after the first paying customer | Adds a fixed cost of 250 per month, energy +1 per week, in person channel response x 1.2 |

The player may decline. The scene image follows the stage.

## 10. Rough sanity check (by hand, not simulated)

A founder who identifies a viable small offices segment, ships its three must have features (85 h), and then spends about 15 h per week on outreach should get roughly one new lead per week early on and a new paying customer every two to three weeks, reaching profitability somewhere in the second half of the run. A founder who builds for the trap segment should get friendly interviews and almost no paying customers.

This estimate is a back of the envelope calculation. Treat the bot report as the real answer.
