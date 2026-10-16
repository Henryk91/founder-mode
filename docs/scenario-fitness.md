# Scenario spec: boutique fitness studio in Munich (working name "Schweißperle")

Source of truth for the third leisure scenario. Read `docs/leisure-mechanics.md` first (slots, memberships, the aggregator). Anything not stated here works as in that file and the earlier tourism scenarios. Where the engine design differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates. Check them against current Munich sources and cite them in section 15, or keep the label. Tune everything against the targets.

"Schweißperle" is a bead of sweat. The founder wanted something cleaner; the logo designer won.

## 1. Premise

The player taught spin and strength classes in big Munich gyms for six years and has a following of a few dozen people. They lease a former shop in the Glockenbachviertel with room for a spin room (20 bikes) and a studio room (18 mats), and open a boutique class studio: no machines, only classes, booked by app.

### What this scenario teaches

1. **The evening is full, the afternoon is empty.** Classes sell by the slot. Off-peak needs its own customers and price.
2. **January is a trap.** Resolutions sign up in January and are gone by March. Staff and space planned for January cost money in April.
3. **The platform fills the empty slots and empties the memberships.** Open it where you have room.
4. **People follow people.** Members come for an instructor. An instructor who leaves can take members with them.

## 2. Starting values

| Value | Start | Note |
|---|---|---|
| Mode | Long only, 104 weeks | Week 1 is the first week of July. The fit-out takes 8 weeks (est.); the studio opens in September, when Munich comes back from holiday |
| Company cash | 45,000 | Own money put in (est.) |
| Personal savings | 14,250 | As elsewhere |
| Founder living costs | 675 per week, rising a tenth from week 53 | |
| Company fixed costs per month | Lease, 190 m², 5,800 (est.), insurance 200 (est.), booking app 250 (est.), music licences 120 (est., verify), electricity and heating 500 (est.), accountant 225, cleaning 800 (est.) | |
| Fit-out | Needed before opening: floors, sound, mirrors, showers and changing rooms. 60,000 (est.) | |
| Spin bikes | 20 at 1,500 each (est.), or leased at 50 each a month | |
| Founder | Teaches spin and strength (about 1.5 h per class with set-up); a following of 30 to 60 people who come in the first month (hidden) | |
| Bank loan | Available (fictional "Isartal Sparkasse"). Items: fit-out, bikes, reformers, the recovery room (the temptation), working capital | |
| Funding | Not available | |

## 3. Slots and timetable

| Slot | Hours |
|---|---|
| Early | Weekdays 06:30 to 09:00 |
| Midday | Weekdays 12:00 to 14:00 |
| Afternoon | Weekdays 14:00 to 17:00 |
| Evening | Weekdays 17:00 to 21:00 |
| Weekend | Saturday and Sunday mornings |

The player sets a weekly **timetable**: classes per slot per room. Each class needs an instructor who teaches that class type. Hard capacity: bikes or mats. Full classes keep a waitlist; a member on the waitlist three times in a month churns a little more.

## 4. Products

### 4.1 Class types

| Id | Name shown | Room | Capacity | Instructor | Required by |
|---|---|---|---|---|---|
| `spin_classes` | Spin | Spin room | 20 | spin | young professionals |
| `strength_classes` | Strength and HIIT | Studio | 18 | strength | young professionals |
| `yoga_classes` | Yoga | Studio | 18 | yoga | yoga crowd |
| `reformer_pilates` | Reformer pilates | Studio, replaces mats | 8 reformers at 4,500 each (est.) | pilates | none (a premium choice) |
| `lunch_classes` | 30-minute lunch classes | Either | as the room | any | corporate |

`reformer_pilates` is not a trap. It sells at about twice the price per class (est.) to a segment that may or may not exist in a run, and it takes the studio room's capacity from 18 to 8.

### 4.2 Memberships and offers

Each is a product the player switches on and prices (`docs/leisure-mechanics.md` section 3):

| Id | Price (est.) |
|---|---|
| Monthly unlimited | 139 a month |
| 12-month unlimited | 115 a month |
| Off-peak unlimited (early, midday, afternoon) | 79 a month |
| 10-class pack | 230, valid 6 months |
| Drop-in | 26 |
| Intro offer, 3 weeks unlimited | 49 |
| Corporate plan | A company pays per employee who joins, at a discount, by invoice |

### 4.3 Support products

| Id | Name shown | Prep hours | Cost (est.) | Required by |
|---|---|---|---|---|
| `booking_app` | Booking app with waitlists | 10 | in the fixed costs | young professionals |
| `showers` | Showers and changing rooms good enough for before work | in the fit-out | | young professionals, corporate |
| `quiet_studio` | Sound insulation between the rooms | 10 | 12,000, the studio closed for a week | yoga crowd |
| `corporate_plans` | Corporate plans with invoices and a company page | 15 | none | corporate |

### 4.4 The temptation

`recovery_room`: an infrared sauna and a cold plunge. 35,000 (est.) plus electricity. Every member mentions one they saw on social media. Nobody's must-have, and it takes the space of a future second studio room.

## 5. Segments

| | Young professionals | Yoga crowd | Corporate |
|---|---|---|---|
| Id | `young_professionals` | `yoga_crowd` | `corporate` |
| Description shown | People in their twenties and thirties working in the city, who train before or after work | Regulars who want calm, steady practice | Companies that pay for their employees' memberships |
| Unit | Members and visits | Members and visits | Members through a company plan |
| Joins per week at peak (reachable, est.) | 6 to 20 | 3 to 10 | 0.2 to 1 companies, 5 to 30 employees each |
| Willingness to pay (est.) | 110 to 160 a month | 90 to 140 | 60 to 100 per employee (the company pays) |
| Visits per week | 2 to 3 | 2 to 4 | 1 to 2 |
| Slots | Early and evening | Early, midday, weekend | Midday, early evening |
| Season shape (hidden) | Peaks in January and September; low in August | Steady; low in August | September to November, January |
| Churn | High, especially January joiners | Low | Low while the company pays; a company can end the plan |
| Must haves | `booking_app`, `showers`, `spin_classes` or `strength_classes` | `yoga_classes`, `quiet_studio` | `corporate_plans`, `lunch_classes`, `showers` |
| Aggregator use | High | Low | Medium (companies may buy the aggregator instead) |
| Channel response: aggregator | high | low | medium |
| Channel response: own website and social media | medium | medium | low |
| Channel response: partnerships | none | physiotherapists: medium | HR networks: high |
| Channel response: outreach | low | low | high |
| Channel response: walk-ins (the shop window) | medium | medium | none |

Roles viable, mediocre and trap, shuffled per run.

A polite trap example: companies whose HR team loves the idea, runs a free lunch class, and then buys the aggregator for everyone.

## 6. Experiments

| Experiment | Version here | Signal |
|---|---|---|
| Interview | Gym-goers, yoga students, HR people | Pain buckets, preferred slots, budget hints |
| Free class week | A free week of classes before opening, or a week of free trial classes for one segment | Sign-ups and remarks on slots and classes |
| Test listing | Two weeks on the aggregator with a few slots | Check-ins, which slots they fill |
| Pre-sale | Founding memberships at a discount before opening | Cash now, evidence of demand; owed as classes |

## 7. Staff

| Role | Pay (est., verify) | Teaches |
|---|---|---|
| Spin instructor | 40 a class freelance | Spin |
| Strength instructor | 40 a class | Strength and HIIT, lunch classes |
| Yoga teacher | 45 a class | Yoga |
| Pilates instructor | 50 a class; scarce | Reformer pilates |
| Front desk | 15 an hour; minijob | Frees founder hours, sells memberships at the desk |

Contracts as elsewhere: permanent instructors cost less per class but are paid in August too. Each instructor has a hidden **following**: some members join for them and churn when they leave. Instructors who teach more than 12 classes a week tire and teach worse (est.).

## 8. Pricing

Per membership type and per class pack. Off-peak price separately. Intro offers and their conversion. The existing price curve and "Too expensive" reasons apply.

## 9. Reviews

Driven by:

- crowding and waitlists;
- the instructor's quality;
- cleanliness (the cleaning contract against the number of visits);
- the showers at 7:45 on a weekday.

## 10. Stages

Office stages 1 and 2:

| Stage | Name | Effect |
|---|---|---|
| 1 | The shop with two rooms | After the fit-out |
| 2 | The neighbouring shop as a third room (+3,800 a month, 30,000 to fit out, est.) | A third room for any class type |

Scene drawings: a narrow shop with a neon sign, bikes in the window; then a wider frontage with a second door. Same muted style.

## 11. Content

| Type | Target |
|---|---|
| Intro cards | 4: the big gyms and the following, the shop, the three kinds of member and the slot question, the fit-out and the money |
| Scenario events | At least 40. Ideas below |
| Interview quotes | At least 10 per bucket per segment |
| Names | Invented: firms, staff, members. The aggregator is "Sportflat" (check it is not a real brand) |

Event ideas:

| Idea | Tension |
|---|---|
| Your best spin instructor is offered her own studio | Pay more, a share, or let her go with her following |
| January: 60 new members in two weeks, waitlists everywhere | More classes now, for members who may be gone by March |
| The aggregator raises its payout for off-peak slots | More check-ins, more cannibalisation |
| A large firm wants a corporate plan for 80 employees at a deep discount | Volume at a price; evenings fill |
| The showers break in February | Fix now or lose the before-work crowd |
| A member's video of a 6:30 class goes viral in a local group | Demand for a slot you may not have |
| A neighbour complains about the bass at 7 am | Insulation or quieter music |
| The music licence society sends a bill for last year | Pay up, and the fee goes up |
| A physiotherapist wants to send patients for a cut | A partnership at a price |
| An instructor cancels at 17:30 for an 18:00 class | Teach it yourself, cancel, or pay a premium cover |
| Summer: half the members are on holiday | Pause memberships or keep billing |
| A competitor opens a reformer studio round the corner | Your premium segment, contested |

Interview quote examples:

| Bucket | Example |
|---|---|
| Not a problem | "I run along the Isar. It is free and nobody shouts at me." |
| Mild | "My gym is fine. The music is from 2009 and so are the towels." |
| Noticeable | "The 18:00 spin class is full by Tuesday. I go at 20:00 and hate everyone." |
| Painful | "I need a class at 6:30 near the office or I do not train at all." |
| Urgent | "My wedding is in eight weeks and the suit was bought in a moment of optimism." |

## 12. Rough expectation

The first autumn fills the evenings with the founder's following and their friends. January brings a rush that leaves in March. A player who builds a timetable for the evenings, sells off-peak to the yoga crowd or companies, and opens the aggregator only in the quiet slots has a steady studio in year 2. A player who sells unlimited memberships to everyone and opens the aggregator everywhere has full evenings, angry members and a payout of eleven euros a visit.

This is a back of the envelope expectation. The bot report is the real answer.

## 13. Scenario targets

On top of T1 to T18 and E1 where they apply. T4 is measured from opening; T8 (platform dependence) is about the aggregator.

| # | Target |
|---|---|
| F1 | Open the platform where you have room: the careful bot (aggregator in quiet slots only) beats both all slots and no aggregator by at least 2 points each |
| F2 | January is a trap: a bot that adds classes and instructors for every January waitlist loses at least 2 points to the careful bot |
| F3 | Reformer pilates is a real choice: buying reformers and not buying them are within 5 points of each other overall, and each is ahead in some runs |
| F4 | Instructors matter: losing the instructor with the largest following costs the careful bot a visible drop in members (in the post-mortem), and a bot that never matches an instructor's offer loses at least 2 points |
| F5 | The recovery room is a trap: building it in the first year loses at least 3 points |

## 14. Accent

Established accent `#B0284F` (check white text reaches 4.5:1).

## 15. Sources and values as built

The agent fills this in.
