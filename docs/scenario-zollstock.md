# Scenario spec: Zollstock

Source of truth for `packages/content/src/scenarios/zollstock/`. Same structure as `scenario-kantino.md`. Read that file first: anything not stated here is the same as in Kantino.

**All values are invented starting points and have not been tested.** They start from Kantino's tuned values and are meant to be tuned by bot runs against the same targets. When a value changes, update this file and note it in `docs/decisions.md`.

Money is given in EUR here for readability. Store it as integer cents.

## 1. Premise

The player is a solo founder in Munich building Zollstock, software for trade businesses: plan jobs, write quotes, and keep the customer informed. Three kinds of trade business might want it. In each run only some of them really do, and the player does not know which.

A Zollstock is the folding wooden rule every German tradesperson carries.

### What this scenario teaches that Kantino does not

Tradespeople do not read cold email and do not click on ads. They decide on trust: someone they know recommends it, or they have met you. So:

1. Cold email barely works. In person and phone carry the outreach.
2. Landing page tests are a weak signal here. Pre-sales and conversations matter more.
3. Happy customers bring new ones. Referrals are the main engine of growth once the first few customers are won, which makes product fit and bugs matter more than in Kantino.

## 2. Starting values

Identical to Kantino (same founder, same costs, same price, same price curve, price churn and budget quote noise from Phase 8, with its own quote texts and one interview in four naming a budget (Kantino: one in six); Kantino's Phase 8 demo to trial trim (0.35 x fit) does not apply here (0.40 x fit), same run length):

| Value | Start |
|---|---|
| Company cash | 9,000 |
| Personal savings | 14,250 |
| Founder living costs | 675 per week |
| Company costs | Tools and hosting 180 per month, accountant 225 per month |
| Default price | 450 per month per customer |
| Founder hours, energy, skills, product, office stage, max weeks | As Kantino |

## 3. Segments

### 3.1 Fixed properties

| | Small crews | Contractors | Property maintenance |
|---|---|---|---|
| Id | `small_crews` | `contractors` | `maintenance` |
| Description shown to player | Electricians, plumbers and painters with 3 to 8 people | Building firms with several crews and 10 to 40 people | Firms that look after buildings for landlords, on recurring contracts |
| Size (reachable companies; not used by the engine yet) | 900 to 2200 | 120 to 320 | 350 to 1000 |
| Willingness to pay per month | 375 to 720 | 700 to 1000 (Phase 8; was 900 to 2250) | 390 to 630 |
| Must have features | `job_board`, `site_quotes`, `customer_texts` | `job_board`, `crew_dispatch`, `material_lists` | `job_board`, `recurring_jobs`, `photo_reports` |
| Channel response: cold email | 0.008 to 0.025 | 0.02 to 0.045 | 0.015 to 0.035 |
| Channel response: phone | 0.045 to 0.09 | 0.06 to 0.12 | 0.06 to 0.12 |
| Channel response: in person | 0.06 to 0.12 | 0.05 to 0.10 | 0.08 to 0.15 |
| Invoice lateness, mean days | 10 | 25 | 15 |
| Share that never pays | 6% | 3% | 5% |
| Share that pays only once chased | 25% | 25% | 25% |

Willingness to pay mirrors Kantino's three ranges on purpose, so the price side starts balanced. The difference is in the channels: cold email is about a third as effective as in Kantino, in person is stronger.

Tuning (part C, see `docs/decisions.md`): round 1 raised maintenance phone (was 0.04 to 0.08) and in person (was 0.06 to 0.13), because maintenance won 9.9% of its viable runs against 29.8% for small crews. Round 2 raised contractors in person (was 0.04 to 0.09). Round 3 lowered small crews in person (was 0.07 to 0.14) and raised contractors phone (was 0.055 to 0.11), because small crews pulled 16.6 points ahead once the careful bot used all its pre-sales.

### 3.2 Roles, assigned randomly per run

Same as Kantino: viable, mediocre, and trap, shuffled across the three segments, with the same pain and politeness ranges.

## 4. Features

| Id | Name shown | Build hours | Required by | Bugs added on shipping |
|---|---|---|---|---|
| `job_board` | Job plan for the week | 40 | all three | 2 to 3 |
| `site_quotes` | Quotes written on site | 25 | small crews | 1 to 2 |
| `customer_texts` | Text messages to the customer | 20 | small crews | 1 to 2 |
| `crew_dispatch` | Several crews and vans | 45 | contractors | 2 to 3 |
| `material_lists` | Material list per job | 50 | contractors | 2 to 3 |
| `recurring_jobs` | Recurring jobs with checklists | 30 | maintenance | 1 to 2 |
| `photo_reports` | Photo reports for the landlord | 35 | maintenance | 1 to 2 |
| `client_marketplace` | Marketplace to find new clients | 60 | nobody | 2 to 3 |

Total build hours to fully serve a segment: small crews 85, maintenance 105, contractors 135. Same as Kantino.

`client_marketplace` is the temptation: every tradesperson says they want more clients, and it sounds like the obvious thing to build. No segment requires it.

## 5. Experiments

As Kantino, with one change:

| Experiment | Change |
|---|---|
| Interview | None |
| Landing page test | Sign up chance (0.01 + 0.08 x pain) x price factor. About half as informative as in Kantino, because this audience rarely clicks ads. Every 5 sign ups still become an open lead |
| Pre-sale | None |

If the landing test formula's constants are not yet scenario values, make them scenario values, with Kantino keeping its current numbers.

### Interview text buckets

Same thresholds as Kantino. Example quotes:

| Bucket | Example quote |
|---|---|
| Not a problem | "I have a wall calendar and a pencil. Thirty years, no complaints." |
| Mild | "Sometimes two jobs end up on the same morning. We sort it out." |
| Noticeable | "I write quotes at the kitchen table after ten at night. Not ideal." |
| Painful | "Last month a crew drove to the wrong address. Twice." |
| Urgent | "I am losing jobs because I answer too slowly. Tell me what it costs." |

Write at least 10 quotes per bucket per segment, in the voice of people who work with their hands and have little patience for software. Feature mentions work as in Kantino.

## 6. Sales

As Kantino, plus one new mechanic.

### Referrals (new, needs a small engine addition)

| Rule | Zollstock | Kantino |
|---|---|---|
| Each paying customer, each week, may refer one new lead in its own segment | Chance 0.11 x fit, reduced by 0.01 per open bug, never below 0 (was 0.08 before tuning round 2) | 0 (off) |
| A referred lead's weekly chance to ask for a demo | x 1.6 | not applicable |
| Shown to the player | The lead card says "Recommended by" and the customer's name. The weekly results name the referral | not applicable |

As built: `sales.referral` in scenario.yaml holds `chancePerFit` (0.11 after tuning, first 0.08), `chancePerBug` (0.01) and `demoBonus` (0.6, so x 1.6). Kantino sets all three to 0. Only customers paying since an earlier week refer, in the order they were won, once per week each; a chance of 0 never rolls.

Engine requirements:
- Both numbers are scenario values. With them at 0, behaviour and the Kantino bot report must be identical to before.
- A lead records its source: outreach channel, landing test, or referral.
- Referrals count toward the "largest single source of customers" target, as their own source.
- The post-mortem's hours and luck sections treat referrals as a source like the others.

Why this mechanic: it makes the trust lesson real. A founder who ships a product that fits and keeps bugs low gets a growing stream of warm leads. One who sells hard into a poor fit gets none.

## 7. Founder energy, 8. The one hire, 9b. Milestones

All as Kantino.

## 9. Office stages

The office stage is scenario content. Kantino's second office is a coworking desk whose walk-in leads come from its coworking market. Zollstock has no such market, so it defines its own:

| Stage | Trigger | Effect |
|---|---|---|
| Kitchen table | Start | None |
| Desk in a trades yard | Offered once by the inbox event `trades_yard`, in week 8 or the week after the first paying customer, whichever comes first | Company cost of 475 per month (Phase 8; was 375) and walk-in leads from `small_crews`, 0.9 a week on average, from the workshops downstairs. No energy effect |

Same logic as Kantino's desk: if small crews are the real market, the yard feeds you leads without outreach hours. If they are the polite trap, it fills the pipeline with friendly neighbours who never pay and pulls you towards the wrong market.

Values are Kantino's final desk (375 per month, 0.9 walk-ins a week); this spec first said 225 per month, energy +1 and one lead every two weeks, written before Kantino's desk was tuned. Taking it against declining on the same 1000 seeds (`pnpm bots --desk`, `validate_then_build`), split by the real role of small crews: viable +7.7 points (z 3.5), mediocre -3.3 (z -2.3), trap -5.2 (z -3.1). It clearly helps when small crews are the real market and clearly hurts when they are the trap. After tuning (part C, careful bot using all its pre-sales): viable +20.1 (z 7.0), mediocre -7.7 (z -2.9), trap -10.5 (z -3.8). Phase 8: rent 475, so that taking the desk without evidence comes out slightly negative, as in Kantino (10,000 seeds: all runs -3.2 against Kantino's -3.5; viable +12.3, mediocre -10.3, trap -11.3). The scene has its own drawing: a workbench, a pegboard of tools, a van outside the window.

## 9c. Events changed in tuning

| Event | Change | Why |
|---|---|---|
| `site_visit` | The lead lands only with 8 or fewer open leads; above that 2 h are lost. The text says so | Leads are worth more here than in Kantino, so a lead for sure made blind effort pay |
| `returning_prospect` | The lead lands only with 12 or fewer open leads; above that 2 h are lost. The text says so | As above |
| `cellar_signal` | Offline mode is a 10 h build that brings a bug (was 4 h, one bug fixed) | Spec tension "build effort for one loud customer"; the blind effort policy gained from it |
| `master_project` | The four hours of interviews also cost 3 energy | Blind effort |
| `receipts_pile` | Leaving the receipts risks a 750 EUR fine (Kantino 600) | Sorting the books was worth under 2 points |

## 10. Content

| Type | Target |
|---|---|
| Intro cards | 4, same structure as Kantino. Card 2 describes Zollstock, card 3 the three trade segments and that tradespeople trust people, not adverts |
| Events specific to this scenario | 43, matching Kantino's spread by area (12 validation, 13 sales, 12 product, 2 finance, 3 founder, 1 team), so the total of 109 matches Kantino's and a 60 week run never runs out. Includes its own `receipts_pile` (the books) and `family_lunch` (a Sunday dinner), under Kantino's ids. Each takes the mechanics of a Kantino event with a similar tension. Ideas below |
| General events | Shared with Kantino (accountant, laptop, family, bank and so on) |
| Interview quotes | At least 10 per bucket per segment |
| Company names | Pools large enough that a 60 week run never repeats a name. Pattern: trade word plus surname, such as "Elektro Aschauer", "Bauunternehmung Nagengast". Two open leads of a market never share the surname (the distinctive word). Surnames are deliberately uncommon so few generated names match real firms, and nothing negative is said about any firm that is not generated per run |
| Founder's notes and help text | Any line that mentions lunch or Kantino gets a Zollstock version |

Event ideas (Claude Code writes the texts, 2 to 4 sentences, dry humour):

| Idea | Tension |
|---|---|
| A master electrician offers to show the app to his guild evening | In person time against a room of the right people |
| A customer wants it to work without mobile signal, in a cellar | Build effort for one loud customer |
| A trade wholesaler offers a counter display for a fee | Paid reach of unclear value |
| A crew boss says his people will not type anything, ever | Feature request hidden in a complaint |
| A customer sends a voice message of four minutes | Time, and whether to listen |
| A lead asks if it also does payroll | Scope creep |
| A happy customer offers to bring you along to a site visit | Referral opportunity that costs half a day |
| A customer's apprentice set everything up wrong | Support time against churn |
| A trade fair booth, cheap, in February | Mostly cold, some leads |
| A contractor wants a discount for a three year contract | Cash now against price later |
| A competitor's rep left flyers at the wholesaler | Distraction |
| A landlord asks if reports can carry his logo | Small feature, one customer |

Keep the rules from the Kantino content pass: at least a third of events favour the cheap or free choice, and both blind inbox policies stay within 4 points of the default.

## 11. Rough expectation (by hand, not simulated)

Early weeks should feel harder than Kantino, because cold email fails and the player has to go out in person. Once three or four well served customers exist, referrals should make the second half of a winning run noticeably easier than in Kantino. A founder who builds for the trap segment gets friendly interviews, few customers, and no referrals.

This is a back of the envelope expectation. The bot report is the real answer.
