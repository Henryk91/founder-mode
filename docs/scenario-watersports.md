# Scenario spec: watersports centre on Mallorca (working name "Rückenwind")

Source of truth for the first abroad scenario. Read `docs/abroad-mechanics.md` first, then `docs/scenario-outdoor.md` and `docs/scenario-hotel.md`. Anything not stated here works as in those scenarios. Where the engine design differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates. Check them against current sources for Mallorca (2025 or 2026) and cite them in section 15, or keep the label. Tune everything against the targets. Money in EUR here, integer cents in content.

"Rückenwind" means tailwind, and also a lucky push from behind. Every second German windsurf school abroad has a name like this, which is the joke.

## 1. Premise

The player is a licensed windsurf instructor from Munich. After ten summers teaching on other people's beaches, they move to Mallorca and take over a beach spot in the Bay of Alcúdia, in a fictional resort strip called Sa Platgeta. They have a container, a van, some old boards and a seasonal beach licence from the town. The bay is long and shallow: calm in the morning, a sea breeze in the afternoon, and the odd day of strong north wind.

Three kinds of guest might pay. In each run only some of them really do, and the player does not know which.

### What this scenario teaches

1. **Sell for every kind of day.** Calm mornings sell paddling and snorkelling, windy afternoons sell sailing and windsurfing. A centre that only does one waits half the time.
2. **The best-paid product runs on the fewest days.** Kite and wing courses pay well, need strong wind and scarce instructors, and pull them away from the beach on exactly the days the beach needs them.
3. **Courses make next season's customers.** But only the guests who booked you directly come back to you.
4. **Gear is a fleet.** Every board and sail is capital that wears out and sits idle in bad conditions. Buy for the demand you have seen.
5. **The spot is rented, not owned.** The beach licence can be lost in a tender.

## 2. Starting values

| Value | Start | Note |
|---|---|---|
| Mode | Long only, 104 weeks | Week 1 is the first week of February. Guests start at Easter, about 9 weeks in |
| Company cash | 45,000 | Own money put in (est.) |
| Personal savings | 14,250 | As elsewhere |
| Founder living costs | 700 per week (est.: Mallorca rents are high), rising a tenth from week 53 | |
| Company fixed costs per month | Container and storage near the beach 800 (est.), insurance 350 (est.), van lease 600 (est.), accountant (a gestor) 180 (est.), phone and booking software 100, self-employed social security 300 (est.; Spain's contribution depends on income, verify) | |
| Beach licence | 9,000 per season, paid in March (est.). If the engine has no yearly cost, spread it over 12 months and record that | The town's seasonal authorisation for the spot. How this works in the town is my understanding, not checked |
| Starting gear | 8 stand up paddle boards, 4 kayaks, 6 beginner windsurf boards and rigs, snorkel sets for 12 | Bought second-hand from the previous tenant (counted in the cash) |
| Founder | Teaches windsurfing, stand up paddle and kids' groups; guides snorkel trips; holds a powerboat licence, so can drive the rescue boat. Cannot teach catamaran sailing, wing foiling or kitesurfing | |
| Bank loan | Available (fictional "Banc de la Badia"), as in Seeblick | Items: catamarans, wing and kite gear, the rescue boat, the eFoil fleet (the temptation), working capital |
| Funding | Not available | Nobody gives a beach shack a term sheet |

## 3. Conditions

Uses the day conditions of `docs/abroad-mechanics.md` section 2, with two slots a day.

| State | Wind | Who it suits |
|---|---|---|
| `calm` | 0 to 2 Bft | Paddling, kayak, snorkelling, kids |
| `light` | 3 Bft | Beginners on windsurf and catamaran, paddling |
| `good` | 4 to 5 Bft | Catamaran, advanced windsurf, wing foiling, kite at the kite spot |
| `strong` | 6 Bft | Experienced windsurfers and wing foilers, kite at the kite spot. Closes beginners and paddling |
| `storm` | 7 Bft and up | Nothing runs |

Monthly probabilities (est., shape only; check against local wind statistics and tune):

| Month | Mornings (calm / light / good / strong / storm) | Afternoons (calm / light / good / strong / storm) |
|---|---|---|
| April | 0.45 / 0.30 / 0.15 / 0.07 / 0.03 | 0.20 / 0.30 / 0.30 / 0.15 / 0.05 |
| June | 0.60 / 0.30 / 0.08 / 0.02 / 0.00 | 0.10 / 0.35 / 0.45 / 0.09 / 0.01 |
| August | 0.65 / 0.27 / 0.06 / 0.02 / 0.00 | 0.15 / 0.40 / 0.38 / 0.06 / 0.01 |
| October | 0.45 / 0.30 / 0.15 / 0.07 / 0.03 | 0.20 / 0.30 / 0.28 / 0.17 / 0.05 |
| November to March | Mostly calm or strong, with storms: about 0.40 / 0.20 / 0.15 / 0.15 / 0.10 for both | |

Interpolate the other months. The summer afternoon sea breeze is the reliable part; the strong days come mostly in spring and autumn from the north. Persistence 0.6. Forecast accuracy 0.8.

## 4. Products

### 4.1 Calm and no-wind activities

| Id | Name shown | Prep hours | Equipment (est.) | Capacity per staff and slot | Runs in | Price (est.) | Required by |
|---|---|---|---|---|---|---|---|
| `paddle_kayak_hire` | Paddle board and kayak hire | 4 | starting gear; more boards 700 each, kayaks 600 each | 20 hires per beach hand | calm, light | 20 a person per hour | none, the starter product |
| `paddle_lessons` | Stand up paddle lessons and sunrise tours | 6 | uses the hire boards | 8 per instructor | calm, light, mornings only for tours | 45 a person | none |
| `snorkel_trips` | Guided snorkel trips from the beach | 8 | starting sets; more at 60 each | 10 per instructor | calm | 40 a person | none |
| `kayak_tours` | Guided coastal kayak tours | 10 | uses the kayaks; double kayaks 900 each | 8 per instructor | calm, light | 55 a person | none |
| `kids_club` | Kids' club: five mornings of paddling, sailing games and windsurf | 20 | small boards and life jackets, 3,000 | 8 children per instructor | calm, light, mornings | 180 a child for the week | hotel guests |

### 4.2 Wind activities

| Id | Name shown | Prep hours | Equipment (est.) | Capacity per staff and slot | Runs in | Price (est.) | Required by |
|---|---|---|---|---|---|---|---|
| `windsurf_courses` | Windsurf beginner courses | 6 | starting rigs; more at 1,300 each | 6 per instructor | light (good with the rescue boat) | 220 a course (4 slots) | none |
| `licence_courses` | Courses that end with an international licence card | 15 | none | as the course | as the course | adds 30 a course | learners |
| `catamaran` | Catamaran sailing courses and hire | 20 | 2 catamarans at 11,000 each, needs the rescue boat and a sailing instructor | 4 boats, 2 people each, per sailing instructor | light, good | 290 a course (3 slots); hire 60 an hour | none |
| `wing_foil` | Wing foiling courses and hire | 20 | sets at 2,800 each, needs a wing and kite instructor | 3 per instructor | good, strong | 320 a course (3 slots) | none |
| `modern_gear` | Current boards, sails and wings for experienced guests | 10 | 10 sets at 2,500 each | hire, 20 per beach hand | good, strong | 260 a week's hire package | wind regulars |
| `rescue_boat` | A rescue boat on the water | 5 | a small rigid inflatable with an engine, 18,000, or leased in season at 900 a month | needs someone with a boat licence on shift (the founder or a beach hand) | all but storm | none | wind regulars; catamaran and windsurf in good wind |
| `online_booking` | Online booking with instant confirmation | 15 | system 40 a month | n/a | all | none | learners |

### 4.3 Kite trips

| Id | Name shown | Prep hours | Equipment (est.) | Capacity | Runs in | Price (est.) |
|---|---|---|---|---|---|---|
| `kite_trips` | Kitesurf courses at the kite spot | 25 | kite sets at 1,900 each, radio helmets; the van | 3 students per wing and kite instructor | good, strong **at the kite spot** | 420 a course of 3 trip days, transport included |

Kites are not allowed on the busy bay, so courses run at a fictional kite spot (Es Racó) about 50 minutes' drive away (est.). It works as a day trip (`docs/abroad-mechanics.md` section 5):

- one trip a day per van;
- the instructor is away for the whole day;
- the player sets the policy: run with at least N students on forecast days, or never.

The spot's wind is one state stronger than the bay's afternoon on most days (est.).

### 4.4 The temptation

| Id | Name shown | Prep hours | Equipment (est.) | Effect |
|---|---|---|---|---|
| `efoil_fleet` | Electric hydrofoil boards | 30 | 4 boards at about 10,000 each, batteries and a charger | Sells at 120 an hour in calm and light conditions. Everyone films them, few book them, and they break |

Nobody needs it. It is on every brochure and in every guest's phone, and it costs as much as the catamarans and the rescue boat together. A centre that buys it before its core products are full learns the lesson of Gratwanderung's e-bikes, on water.

### 4.5 Incidents

New products carry an incident risk in their first runs (a capsized beginner far out, a lost paddle, a sunburnt child), as in Gratwanderung. Without the rescue boat, wind products in good or strong conditions carry a higher risk.

## 5. Segments

| | Hotel guests | Learners | Wind regulars |
|---|---|---|---|
| Id | `hotel_guests` | `learners` | `wind_regulars` |
| Description shown | Families and couples staying at the bay's hotels, looking for something to do on the water | Adults on holiday who want to learn a wind sport properly | Experienced windsurfers, wing foilers and kiters on a sports holiday |
| Booking unit | Per person (a hire, a lesson, a tour place, a child's week) | Per person (a course place) | Per person (a week's hire package or a course) |
| Requests per week at peak (reachable, est.) | 60 to 200 | 15 to 50 | 8 to 30 |
| Willingness to pay | 0.7 to 1.1 times the list price | 0.8 to 1.3 | 0.9 to 1.4 |
| Lead time | 0 to 1 week | 0 to 6 weeks | 2 to 16 weeks |
| Season shape (hidden, roughly) | High July and August (school holidays), some in June and September | Easter to October, peaks in June and September | Spring and autumn (the windy months), less in August |
| Must haves | `kids_club` | `licence_courses`, `online_booking` | `modern_gear`, `rescue_boat` |
| Channel response: platform | medium | high | low |
| Channel response: own website | low | medium, grows with reviews and graduates | high once known |
| Channel response: partnerships | hotel receptions: high | travel agents at home: medium | windsurf clubs and forums in Germany: high |
| Channel response: walk-ins (the beach) | high | medium | low |
| Cancellation tendency | High on bad days | Medium | Low, but they cancel a whole week if the forecast is flat |
| Payment | At booking or at the desk | At booking | Deposit 30%, balance on arrival |

Roles viable, mediocre and trap, shuffled per run, with the usual pain and politeness logic.

A polite trap example: wind regulars who praise the spot on forums but only come with their own gear, and leave a review about the parking.

## 6. Progression

Uses courses and progression (`docs/abroad-mechanics.md` section 3).

| Course | Level reached | Next products, same stay | Next season |
|---|---|---|---|
| Windsurf beginner course | `windsurf_basic` | Rig hire (uses the beginner rigs as hire, 25 an hour), the advanced course in good wind | Advanced course, `modern_gear` hire |
| Catamaran course | `catamaran_basic` | Catamaran hire | Hire, a second course |
| Wing foil course | `wing_basic` | Wing hire | `modern_gear` hire |
| Kite course | `kite_basic` | More trip days | Kite trips, `modern_gear` hire |
| Kids' club | none | Paddling with the parents | The kids' club again, the next summer |

Starting shares (est.): same stay 0.25, next season 0.15 through direct channels and 0.02 through the platform.

## 7. Experiments

| Experiment | Version here | Signal |
|---|---|---|
| Interview | On the beach, at hotel receptions, and by phone with clubs at home | Pain buckets, product mentions, budget hints |
| Taster hour | A free hour on the water for six people from one segment. Costs a morning and some wear | Bookings and referrals afterwards; hotel guests leave a review |
| Test listing | Two weeks on the activity platform (fictional "Strandklick") at a test price | Bookings, mostly hotel guests and learners |
| Vouchers | Gift vouchers sold through the home network at Christmas for the summer | Cash now, evidence of demand, owed until used |

## 8. Channels

| Channel | Cost | Effect |
|---|---|---|
| Activity platform | 20 to 25% commission (est., verify) | Fast reach with hotel guests and learners. The guest belongs to the platform: no repeat contact |
| Own website | Founder hours, some ads | Slow, no commission, grows with reviews and returning graduates |
| Hotel partnerships | Founder hours and a 10% cut (est.) | Hotel guests, through the reception desk |
| Clubs and forums at home | Founder hours | Wind regulars and some learners |
| The beach | Free, a flag and a sign | Walk-ins, mostly hotel guests; better at stage 2 |

## 9. Staff

| Role | Pay (est., verify) | Teaches or does |
|---|---|---|
| Watersports instructor | 140 a day freelance | Windsurf, paddle, kids, snorkel, kayak tours |
| Sailing instructor | 150 a day | Catamaran, paddle |
| Wing and kite instructor | 180 a day; scarce from June to September | Wing foil, kite trips |
| Beach hand | 100 a day | The hire desk, rigging, and the rescue boat (holds a boat licence) |

- Freelance shifts, plus permanent, part time and seasonal contracts, as in the other tourism scenarios.
- In Spain, seasonal work is usually a "fijo discontinuo" contract (my understanding; verify).
- An instructor can only teach what their role lists. That is the certificate rule.

## 10. Pricing and policies

- Prices per product and per season (peak July and August, shoulder, winter), using the existing price curve and "Too expensive" reasons.
- Cancellation policy: flexible or strict, as elsewhere. Conditions cancellations follow `docs/abroad-mechanics.md` section 2.2.
- Kite trip policy: section 4.3.

## 11. Reviews

As in the other tourism scenarios, plus:

- conditions handling: a moved booking or an alternative offered, against a plain cancellation;
- worn gear (gear past its lifetime reviews lower);
- the rescue boat's presence on windy days.

## 12. The beach licence tender

In year 2, between weeks 40 and 48 of the run (est.), the town tenders the beach spots for the next seasons. The message names how many others bid. Options:

| Option | Effect |
|---|---|
| Bid higher | The licence costs 40% more (est.). The spot is kept |
| Bid as before | Kept with a hidden chance that falls with the centre's reviews and local hires (est. 50 to 85%). Otherwise lost: the centre moves to a worse spot |
| Join a hotel's own beach | Lower fee, a 15% revenue share with the hotel (est.), hotel guests only from that hotel, fewer walk-ins |

A lost spot means stage 1 at the end of the bay: walk-ins halved, the hotel partnerships near the old spot weaker.

## 13. Stages

Stages 1 and 2 only in this pass. Stages 3 to 5 come later.

| Stage | Name | Rent | One-off (est.) | Effect |
|---|---|---|---|---|
| 1 | Container and a flag on the beach | as start | | as start |
| 2 | A beach station with a shop, changing rooms and lockers | +900 a month | 12,000 | Walk-ins +30%; gear wear a quarter lower (stored dry); lockers raise wind regulars' conversion (est. +10%) |

Stage 2 is offered as in the other tourism scenarios (revenue covering all costs for two months, or guests turned away in 3 of the last 8 weeks).

Scene drawings: a blue container with a flag and boards on a rack in front of the sea; then a timber station with a small shop window, wetsuits on a rail and a row of catamarans. Same muted style as the existing scenes.

## 14. Content

| Type | Target |
|---|---|
| Intro cards | 4. Card 1: the move from Munich. Card 2: the bay and the spot. Card 3: three kinds of guest, and that the wind decides what you can sell each half day. Card 4: the money and the season |
| Scenario events | At least 40, using situational events. Ideas below |
| Interview quotes | At least 10 per bucket per segment |
| Names | Invented: hotels ("Hotel Platja Blava"), clubs ("Surfclub Ammersee West"), staff and guests. No real firms. The licence card is "an international licence card", not a named association |

Event ideas (the agent writes the texts, 2 to 4 sentences, dry):

| Idea | Tension |
|---|---|
| A strong north wind for three days in May, 14 learners booked | Move them, refund, or offer kayak tours in the lee |
| The wing and kite instructor is offered more money by the centre next door | Match, let go, or offer a season contract |
| A hotel wants an exclusive deal: their guests only, for a 20% cut | A partnership at a price |
| A catamaran capsizes in the shipping lane; the coast guard calls | A fine and a review, or worse without the rescue boat |
| A guest's eFoil video gets a million views | Demand for a product you may not have |
| The town inspects the beach licence and counts your boards | Paperwork hours now or a fine |
| Jellyfish season | Snorkel trips cancelled, paddling fine |
| A German windsurf club wants to book 12 places for a week in October | Big money in the shoulder; enough gear? |
| A storm in October damages the container | Repair costs, a closed week |
| A travel blogger wants a free kite course | Reach against a trip day |
| A competitor undercuts your hire price by a third | Match, hold, or differentiate |
| The van fails its inspection | No kite trips until fixed |

Interview quote examples (tone guide only):

| Bucket | Example |
|---|---|
| Not a problem | "We have a pool. It does not have waves." |
| Mild | "The kids get bored by Wednesday. Anything with a boat would do." |
| Noticeable | "Last year the school had no wind gear in my size and nobody spoke German." |
| Painful | "I fly down with two board bags and pay 150 euros each way for them. Please just have decent gear." |
| Urgent | "I promised my wife she would be windsurfing by the end of the week. It is Tuesday." |

## 15. Rough expectation (by hand, not simulated)

The first spring is cheap but slow: test with tasters and interviews, build the calm products, and decide which wind sport to add before the summer. A player who matches products to the bay's conditions and the viable guests has a strong first summer. They then have to carry the container, the licence and their own rent through the winter. In year 2 the tender and the returning graduates decide whether the business is solid.

A player who buys catamarans, kite gear and the eFoil fleet before knowing who comes has a busy beach and an empty bank account.

This is a back of the envelope expectation. The bot report is the real answer.

## 16. Scenario targets

Judged on 1,000 seeds, or 10,000 where the effect is smaller than its margin. These come on top of the tourism targets T1 to T18 and E1 in `docs/balancing.md`. Office targets T19 to T21 do not apply in this pass.

| # | Target |
|---|---|
| W1 | Selling for every kind of day pays: the careful bot beats a bot that offers only wind products, and a bot that offers only calm products, by at least 3 points each |
| W2 | Kite trips are a real decision: `trips_always` (run with one student) and `trips_never` each lose to the careful bot by at least 2 points |
| W3 | Courses pay over two seasons: a bot that sells hire and tours but no courses loses at least 3 points, and the careful bot's year 2 has more returning graduates through direct channels than through the platform |
| W4 | The tender is a decision: always bidding higher and always bidding as before are within 5 points of each other overall, and each is ahead in some runs |
| W5 | The eFoil fleet is a trap: buying it in the first spring loses at least 3 points against not buying it |

## 17. Sources and values as built

The agent fills this in: checked figures with sources and dates, and every value changed while tuning with a pointer to `docs/decisions.md`.
