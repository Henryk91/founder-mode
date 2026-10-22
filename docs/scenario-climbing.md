# Scenario spec: climbing gym in Munich (working name "Griffig")

Source of truth for the fourth leisure scenario. Read `docs/leisure-mechanics.md` (slots and crowding, memberships, the aggregator, freshness, build-out) and `docs/abroad-mechanics.md` section 3 (courses and progression) first. Anything not stated here works as in those files and the earlier tourism scenarios. Where the engine design differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates. Check them against current Munich sources and cite them in section 15, or keep the label. Tune everything against the targets.

"Griffig" means grippy, and also catchy. Climbers will use the first meaning, marketing the second.

## 1. Premise

The player is a route setter and climbing coach who has worked in Munich's big halls for ten years. They lease an empty warehouse hall in Freimann: 1,800 m² of floor and 15 m high (est.), with room for bouldering walls, rope walls, a training area and a café counter. They cannot afford to build everything at once. They choose what to build first, open, and grow the gym from there.

Munich already has very large climbing centres, some run by the alpine club with discounts for its members. The new gym has to be different, not cheaper.

### What this scenario teaches

1. **What you build first decides who comes.** Bouldering brings students and evenings; rope walls bring committed climbers and courses; a kids' area brings weekends.
2. **The routes are the product.** A wall nobody has reset in a month is a wall people have finished. Route setting is a cost that keeps members.
3. **Evenings are packed and the hall is soft.** People still come when it is crowded; they just stop coming back.
4. **Summer is outdoor season.** Members climb on real rock from May to September and the hall goes quiet.

## 2. Starting values

| Value | Start | Note |
|---|---|---|
| Mode | Long only, 104 weeks | Week 1 is the first week of June. The first build-out takes 12 to 16 weeks (est.); the gym opens in autumn, the start of the indoor season |
| Company cash | 120,000 | Own money and a family loan with no interest, paid back after the run (est.; the post-mortem mentions it) |
| Personal savings | 14,250 | As elsewhere |
| Founder living costs | 675 per week, rising a tenth from week 53 | |
| Company fixed costs per month | Hall lease 16,000 (est., about 9 a square metre for a warehouse), insurance 900 (est.), heating and electricity 2,500 (est., more in winter), booking and access software 300, accountant 300, cleaning 1,200 (est.) | |
| Basic fit-out | Needed before opening: floor mats, toilets, changing rooms, a reception. 80,000 (est.) | |
| Founder | Sets routes (about 25 hours per wall section a reset), coaches courses, runs the desk | |
| Bank loan | Available (fictional "Isartal Sparkasse"). Items: every wall section, the fit-out, the café, the speed wall (the temptation), working capital | |
| Funding | Not available | |

## 3. Walls and areas

Build-out products (`docs/leisure-mechanics.md` section 7). In week 1, an inbox message asks which to build before opening; the player can pick any combination they can pay for. Later sections can be built at any time; a section under construction closes nothing else.

| Id | Name shown | Cost (est.) | Build weeks | Capacity (comfortable / hard, at once) | Serves |
|---|---|---|---|---|---|
| `boulder_area` | Bouldering area, 300 m² of walls | 140,000 | 12 | 80 / 140 | students, families (with care) |
| `rope_walls` | Rope walls, 24 lines, 15 m | 260,000 | 16 | 48 / 60 (2 per line) | committed climbers, families |
| `auto_belays` | Six auto-belay lines | 25,000 | 4 | 12 / 12 | families, beginners without a partner |
| `kids_area` | A kids' bouldering area | 30,000 | 6 | 25 / 35 | families |
| `training_area` | A training area: system boards, fingerboards, weights | 20,000 | 4 | 20 / 30 | committed climbers |
| `cafe_counter` | Café counter | 25,000 | 6 | n/a | Raises time spent and reviews; 2 to 4 EUR margin per visitor (est.) |

The rope walls need climbers who can belay, so they come with the course ladder (section 4.2).

## 4. Products

### 4.1 Tickets and memberships

| Id | Price (est.) |
|---|---|
| Day ticket, bouldering | 15 |
| Day ticket, all areas | 20 |
| 10-visit card | 140, valid 1 year |
| Monthly membership | 69 a month |
| 12-month membership | 59 a month |
| Off-peak membership (weekdays before 16:00) | 45 a month |
| Student prices | About a fifth less (est.) |
| Shoe and harness rental | 5 and 3 |

### 4.2 Courses (the ladder)

Uses courses and progression from `docs/abroad-mechanics.md` section 3.

| Id | Name shown | Level needed, level reached | Price (est.) | Slots | Capacity per coach |
|---|---|---|---|---|---|
| `intro_course` | Intro to bouldering | none, none | 35 | 1 | 10 |
| `belay_course` | Belay course (top rope) | none, `belay` | 89 | 2 | 6 |
| `lead_course` | Lead climbing course | `belay`, `lead` | 149 | 3 | 4 |
| `kids_club` | Weekly kids' climbing club | none, none | 55 a month per child | weekly | 8 |
| `birthday_parties` | Kids' birthday parties | none, none | 199 a party of 10 | 1 weekend slot | 10 |

Rope climbing without a coach needs the `belay` level. Same stay here means "the next few weeks" (they live in Munich). Graduates become members with a higher chance (est. belay 0.35, lead 0.5).

### 4.3 Route setting

Each wall section has freshness (`docs/leisure-mechanics.md` section 5) that falls week by week. The player sets **setting hours per week** per area, from the founder's time or freelance setters. A reset section closes for a morning. Committed climbers care most; students care; families hardly notice.

### 4.4 The temptation

`speed_wall`: a competition speed wall. 60,000 (est.), 6 weeks. It looks like the Olympics on social media. A handful of people use it. Nobody's must-have.

## 5. Segments

| | Students and young adults | Committed climbers | Families |
|---|---|---|---|
| Id | `students` | `committed` | `families` |
| Description shown | Students and people in their twenties who boulder with friends after lectures and work | Climbers who train several times a week and climb outside in summer | Parents with children, for weekends, courses and birthdays |
| Unit | Visits, cards, memberships | Memberships | Visits, courses, parties |
| Visits or joins per week at peak (reachable, est.) | 150 to 500 visits | 4 to 15 joins | 60 to 200 visits |
| Willingness to pay | Price sensitive; 0.7 to 1.0 times list | 0.9 to 1.2 | 0.8 to 1.1 |
| Slots | Weekday evenings, weekends | Weekday evenings, early mornings | Weekend mornings, weekday afternoons in school holidays |
| Season shape (hidden) | October to April; low in the semester break and summer | October to April; summer dip to about half (outdoor season) | October to April; rainy summer weekends |
| Churn | High | Low, if the routes are fresh and the evenings bearable | Medium; children grow and move on |
| Must haves | `boulder_area`, student prices | `rope_walls` or `boulder_area`, `training_area`, fresh routes | `kids_area` or `auto_belays`, `kids_club` or `birthday_parties` |
| Aggregator use | High | Low | Low |
| Channel response: aggregator | high | low | low |
| Channel response: own website and social media | high | medium | medium |
| Channel response: partnerships | university sports: high | none | schools and kindergartens: medium |
| Channel response: word of mouth | high | high | medium |
| Channel response: walk-ins | medium | low | medium |

Roles viable, mediocre and trap, shuffled per run.

A polite trap example: committed climbers who praise the setting, never buy a membership because they already have one at a big club hall, and come on the aggregator.

## 6. Experiments

| Experiment | Version here | Signal |
|---|---|---|
| Interview | Climbers at the big halls, students at the university, parents at playgrounds | Pain buckets, which walls they want, budget hints |
| Open day | A free day once the first area is open (a day's work, est. 500 in costs) | Visits by segment, sign-ups, remarks on crowding |
| Test listing | Two weeks on the aggregator | Check-ins, which slots they fill |
| Pre-sale | Founding memberships at a discount before opening | Cash during the build, evidence of demand |

## 7. Staff

| Role | Pay (est., verify) | Does |
|---|---|---|
| Route setter | 250 a day freelance | Resets a wall section in about 25 hours (est.) |
| Coach | 30 an hour | Courses, the kids' club, birthdays |
| Front desk | 15 an hour; minijob or part time | Check-ins, rentals, sales; needed in every open slot unless the founder is at the desk |
| Café staff | 15 an hour | With `cafe_counter` |

Contracts as elsewhere. Opening hours set the desk shifts: long hours sell more and cost more.

## 8. Pricing and policies

Per ticket type and membership. Off-peak and student prices. Opening hours per slot (closing the early slot saves desk shifts).

## 9. Reviews

Driven by:

- crowding;
- route freshness;
- cleanliness and chalk dust;
- the courses' quality;
- the café.

## 10. Stages

The walls are this scenario's progression. Office stages 1 and 2:

| Stage | Name | Effect |
|---|---|---|
| 1 | The hall | Start |
| 2 | A mezzanine floor inside the hall (40,000, 6 weeks, est.) | Room for the training area and a café without using wall space; comfortable capacity +15% |

Scene drawings: an empty warehouse with a roller door; then a hall with coloured holds, mats and a mezzanine. Same muted style.

## 11. Content

| Type | Target |
|---|---|
| Intro cards | 4: the years setting routes, the hall, the three kinds of climber and the build question, the money and the loan |
| Scenario events | At least 40. Ideas below |
| Interview quotes | At least 10 per bucket per segment |
| Names | Invented: climbers, staff, universities' sports clubs by description, partners. The big halls are "the big club halls", never named |

Event ideas:

| Idea | Tension |
|---|---|
| The first snow: everybody is back from the rock at once | Packed evenings, new members |
| A setter offers a weekly reset of the whole bouldering area for a flat fee | Freshness against cost |
| A child falls badly from a boulder | Insurance, a procedure, a review |
| The aggregator's users are a third of Tuesday evening | Packed for eleven euros each |
| A university sports club wants a weekly group slot at a discount | Volume in a full slot, or move them to a quiet one |
| A competition organiser wants the hall for a weekend | Fees and fame against two weekend days |
| The roof leaks over the rope walls | Close a section or patch it |
| Chalk dust complaints; the ventilation is not enough | Invest or annoy |
| A well-known climber posts a video of your new problems | Visits you may not have room for |
| June: members pause and go to the rock | Freeze memberships or keep billing |
| The landlord offers the neighbouring hall | Stage 2, or more |
| A big club hall cuts its prices for students | Your students' loyalty, tested |

Interview quote examples:

| Bucket | Example |
|---|---|
| Not a problem | "I climb outside. The rock is free and the routes never change. That is the point." |
| Mild | "The big halls are fine. You need a map and a packed lunch." |
| Noticeable | "On Tuesday evenings I wait longer for a boulder than I spend on it." |
| Painful | "There is nowhere near here for my kids to climb on a Sunday morning without a two-hour course first." |
| Urgent | "I am going to Kalymnos in six weeks and I cannot lead climb." |

## 12. Rough expectation

The summer goes into building. A player who builds the area their viable segment needs (often bouldering first: cheaper, faster, and students fill it) and opens in October has a busy first winter, then learns about the summer dip. A player who builds everything at once opens later with a large loan and a hall that is half empty until November. In year 2, route setting and crowding decide who stays.

This is a back of the envelope expectation. The bot report is the real answer.

## 13. Scenario targets

On top of T1 to T18 and E1 where they apply. T4 is measured from opening; T8 (platform dependence) is about the aggregator.

| # | Target |
|---|---|
| K1 | No first build is always right: on paired seeds, each of boulder first, rope first and both at once has the best result of the three in at least 15% of the seeds where they differ |
| K2 | The routes are the product: a bot that sets too little (half the careful hours) loses at least 3 points, and one that sets twice as much loses at least 2 |
| K3 | Open the platform where you have room: the careful bot beats all slots and no aggregator by at least 2 points each |
| K4 | The ladder pays: a bot with rope walls but no belay or lead courses loses at least 3 points |
| K5 | The speed wall is a trap: building it in the first year loses at least 3 points |

## 14. Accent

Established accent `#2F6B3A` (check white text reaches 4.5:1).

## 15. Sources and values as built

The agent fills this in.

### Initial content preparation,22 October2026

Griffig remains unregistered until the fitness milestone. These are initial
scenario estimates,not a tuned or measured economy.

- [Einstein Munich prices and hours](https://muenchenwisesystem.einstein-boulder.com/preise-zeiten/),checked22October2026:adult dayEUR15.50,reducedEUR12.90,twelve visitsEUR155,monthlyEUR39 with a three-month initial term,annualEUR420,and shoe hireEUR4.50. This is a boulder-only comparator. Our mixed-hallEUR69/59/45 monthly fees remain estimates;the comparator does not establish them.
- [BMAS minimum-wage questions](https://www.bmas.de/EN/Labour/Minimum-Wage/the-minimum-wage-questions-and-answers.html),checked22October2026:EUR13.90 gross/hour in2026,EUR14.60 fromJanuary2027;employer contributions are additional. Desk/café shifts use an estimated employer costEUR18/hour,four hours per shift. CoachingEUR30/hour and settingEUR250/eight-hour day remain freelance estimates. Contract shifts quote the whole weekly bill.
- Prisma's website timed out on refresh. Its earlier preparatory prices are not used as verified current figures.
- Hall lease,build-out prices,utilities,insurance,cleaning,equipment,the platform payout and all demand/usage/churn ranges remain estimates. No supplier quotation or local rent evidence was found for this particular fictional hall. The bank'sEUR650,000 unproven ceiling and six-month working-capital allowance are fictional estimates sized to let the player propose any first-wall plan;approval and the player's repayment ability still matter.

### Units and adaptations before measurement

- Simultaneous capacities are converted to weekly visits using actual staffed slot hours and an estimated two-hour average visit. The four slots total75hours/week;closing hours removes capacity and saves desk cover. Comfort remains hidden;the mezzanine increases comfort15% without changing safety capacity.
- Common fit-out takes ten builder weeks after40preparation hours;the first wall takes its stated12/16weeks. Both must finish before opening. Course preparation and wall preparation are distinct. The children’s area can also open the business after common fit-out.
- TheEUR120,000 opening cash includes the family loan;it is not counted twice. Repayment after week104 is contextual,not simulated bank debt. The win condition uses the existing tourism rule:three profitable months in the last thirteen,including living costs and scheduled bank repayments. The rough spec wording did not change that inherited rule.
- Personal belay/lead skills gate independent access. Actual coached completion awards skills and may create a qualified paid-membership enquiry next week;35%/50% is not a guaranteed free membership. Two/three course sessions fit within one game week;the coach's four/six-hour shift covers the entire course. Course prices follow the segment ticket ratio,so student discounts also affect them.
- The all-area ticket basis isEUR20,with a boulder-only factor0.75 givingEUR15. Students pay80%:EUR16all areas orEUR12bouldering. Four separate student membership/card agreements cost80%of the corresponding regular fee,serve only students and require the student-price feature. Regular agreements serve the other segments. Course prices retain the same student discount.
- Children’s parties reserve ten real places atEUR19.90 each for theEUR199party. The club billsEUR55monthly and reserves one actual coached visit each week. Its coaches also cover parties;the roster cannot spend the same shift twice.
- Regular memberships admit available ordinary areas,not courses or parties. The ten-visit card owes ten visits for52weeks. Off-peak access is restricted to early/daytime slots.
- Paid route-setting hours supplement separately budgeted founder setting. A reset takes25hours and closes four daytime hours only in the reset week. Dedicated desk,setter and café roles do not produce free coaching.
- Café contribution is an estimatedEUR5average receipt lessEUR2service costs per served visitor,limited to50visitors per paid four-hour staff shift. Rental stock costsEUR2,500;an estimated average rental basket,not a shop or equipment inventory,earnsEUR1.50per casual visitor orEUR0.50per committed visit,lessEUR0.30cost. NominalEUR5/3rental prices remain background context.
- Follow-up event cards pay for immediate conversations,cover and their stated small effects. Persistent wall,staff,access and opening-hour changes remain weekly controls. Events do not silently award unearned qualifications or override safe capacity.

- The real internal mezzanine offer appears after week26 and two months covering all costs. It costsEUR40,000,takes six weeks and adds no rent or safety places. Careful play uses repeated observed crowding before considering it;the normal cash and whole-year surplus checks still apply.

- Courses,clubs and parties share the actual boulder/rope/children’s wall pool with ordinary visitors. Explicit allowed slots keep clubs and parties on weekends and courses in their stated periods. Coaching pay covers the full two/four/six-hour course;the first pass reserves one estimated two-hour wall visit per participant,with remaining coached time for demonstrations and off-wall practice. This is a weekly average,not an exact session timetable. Coaches still limit actual served participants;no extra wall places are created by a course product.

- Interview budgets below EUR200 round to EUR10, rather than the inherited EUR500 step. This preserves useful on-screen evidence at ticket and membership prices. Corrected before the first climbing measurement; no tuning round is spent.
