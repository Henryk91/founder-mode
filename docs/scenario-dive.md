# Scenario spec: dive centre on Cyprus (working name "Tiefgang")

Source of truth for the second abroad scenario. Read `docs/abroad-mechanics.md` and `docs/scenario-watersports.md` first. Anything not stated here works as in those files and the earlier tourism scenarios. Where the engine design differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates. Check them against current sources for Cyprus (2025 or 2026) and cite them in section 16, or keep the label. Tune everything against the targets.

"Tiefgang" is a ship's draught, and also depth of thought. Dive centre owners use it for the first meaning and claim the second.

## 1. Premise

The player is a dive instructor from Munich who has guided holiday divers in other people's centres for years. They move to Cyprus and open their own centre in Larnaca, close to the Zenobia: a ferry that sank off Larnaca in 1980 and is one of the best-known wreck dives in Europe.

The big resorts (Ayia Napa and Protaras) are about 45 minutes' drive away (est.). They are full of holidaymakers who have never dived and might try.

Three kinds of customer might pay. In each run only some of them really do.

### What this scenario teaches

1. **The famous site is not the business.** The wreck draws certified divers, but beginners trying diving for the first time often pay the rent.
2. **The ladder matters.** Try dive, entry course, advanced course, wreck: each step is a sale, and each needs the step before.
3. **The boat is the bottleneck.** Own it, lease it, or buy seats on someone else's. Each is right for some businesses and wrong for others.
4. **The season is long, but not all year.** Fixed costs run in January too.

## 2. Starting values

| Value | Start | Note |
|---|---|---|
| Mode | Long only, 104 weeks | Week 1 is the first week of February. Guests start in April |
| Company cash | 70,000 | Own money put in (est.). The compressor and starting gear are already bought |
| Personal savings | 14,250 | As elsewhere |
| Founder living costs | 575 per week (est.), rising a tenth from week 53 | |
| Company fixed costs per month | Shop with a classroom near the seafront 1,600 (est.), insurance 450 (est.), compressor service and tank tests 150 (est.), accountant 200 (est.), phone and software 100 | |
| Starting gear | A compressor, 24 tanks, 12 rental sets (jacket, regulator, wetsuit, computer) | |
| Founder | Teaches the entry and advanced courses, guides certified divers, speaks German and English. No skipper's licence | |
| Bank loan | Available (fictional "Larnaka Cooperative Bank"), as in Seeblick | Items: the dive boat, the minibus, nitrox, more gear, the technical diving kit (the temptation), working capital |
| Funding | Not available | |

## 3. Conditions

Day conditions (`docs/abroad-mechanics.md` section 2), two slots a day. Boat dives run in the morning.

| State | Sea | What runs |
|---|---|---|
| `calm` | Flat to small waves | Everything |
| `moderate` | Some swell | Everything; beginners' shore dives with a lower review |
| `rough` | Swell over about 1.5 m (est.) | No boat dives, no shore dives. Pool sessions and classroom only |
| `storm` | | Nothing |

Monthly probabilities (est., shape only):

| Month | calm / moderate / rough / storm (both slots) |
|---|---|
| April | 0.45 / 0.35 / 0.17 / 0.03 |
| June to September | 0.65 / 0.30 / 0.05 / 0.00 |
| November | 0.40 / 0.35 / 0.20 / 0.05 |
| December to February | 0.30 / 0.35 / 0.27 / 0.08 |

Afternoons a little rougher than mornings in summer (est.). Persistence 0.6. Forecast accuracy 0.85.

Water temperature (shown for flavour, and it drives demand): about 17 °C in February to about 28 °C in August (est., verify).

## 4. Products

### 4.1 The ladder

| Id | Name shown | Prep hours | Equipment (est.) | Capacity per staff and slot | Runs in | Price (est.) | Level needed, level reached |
|---|---|---|---|---|---|---|---|
| `try_dive` | Try dives: an hour in the pool and a shallow dive from the shore | 6 | rental sets; a pool | 4 per instructor | pool part always; shore part calm, moderate | 80 a person | none, none. The starter product |
| `entry_course` | The entry course (four days, four open water dives, a licence) | 15 | rental sets; the pool | 4 per instructor | calm, moderate (pool and classroom slots in rough) | 450 a person, 4 slots | none, `open_water` |
| `advanced_course` | The advanced course (two days, five dives, one deep, one on the wreck) | 15 | needs the boat | 4 per instructor | calm, moderate | 350 a person, 3 slots | `open_water`, `advanced` |
| `shore_dives` | Guided shore dives on the reefs | 5 | rental sets for those without gear | 8 per guide | calm, moderate | 40 a dive | `open_water`, none |
| `wreck_dives` | Wreck dives on the Zenobia | 10 | needs the boat | 8 per guide; 12 divers per boat trip | calm, moderate, mornings | 60 a dive | `advanced`, none |

Courses use the progression rules (`docs/abroad-mechanics.md` section 3):

| Course | Same stay | Next season |
|---|---|---|
| Try dive | The entry course (est. 0.15) | Entry course (est. 0.05, direct channels) |
| Entry course | Shore dives (est. 0.4), the advanced course (est. 0.1) | Advanced course, shore and wreck dives (est. 0.15 direct, 0.02 platform) |
| Advanced course | Wreck dives (est. 0.6) | Wreck dives (est. 0.2 direct) |

### 4.2 Support products

| Id | Name shown | Prep hours | Cost (est.) | Required by |
|---|---|---|---|---|
| `pool_partnership` | A hotel pool for sessions | 8 | 8 a person per session | resort beginners |
| `hotel_pickup` | Pick-ups from the resort hotels | 6 | a minibus leased at 700 a month, or bought for 30,000; 40 a day in fuel | resort beginners |
| `nitrox` | Nitrox fills (air with more oxygen, for longer wreck dives) | 10 | a fill station at 6,000; 8 a fill charged extra | certified divers |
| `group_packages` | Club rates, free places for group leaders, invoices | 10 | none | dive clubs |
| `online_booking` | Online booking with instant confirmation | 15 | system 40 a month | certified divers |
| `centre_licence` | The centre's licence | 20 | fee 1,000 (est.), 6 weeks' wait | everything except pool sessions |

Cyprus licenses dive centres (my understanding; verify the authority, fee and waiting time). Until the licence arrives, only pool sessions can be sold.

### 4.3 The boat

An asset with three options (`docs/abroad-mechanics.md` section 4), offered by an inbox message in week 1 and again each winter:

| Option | Terms (est.) | Capacity |
|---|---|---|
| Buy | A used 11 m dive boat for 70,000, through the bank or cash. Maintenance 400 a month, insurance 2,500 a year, mooring 3,000 a year, a 3 week haul-out in January (2,500). Needs a skipper on every trip | 12 divers, two trips a morning |
| Lease | 3,000 a month from April to November, 8 months minimum. Needs a skipper | As bought |
| Seats | A partner's boat at 30 a diver a trip. At most 6 seats a trip; on peak weekends the partner keeps a seat back with a chance of 0.4 | 6 divers a trip |

A skipper is a staff role (section 8). The founder cannot skipper.

### 4.4 The temptation

| Id | Name shown | Prep hours | Cost (est.) | Effect |
|---|---|---|---|---|
| `tech_diving` | Technical diving: rebreathers, trimix and deep courses | 40 | 35,000 | A few certified divers want it, at a high price. The Zenobia's deepest parts are the advert. Nobody's must-have |

## 5. Segments

| | Resort beginners | Certified divers | Dive clubs |
|---|---|---|---|
| Id | `resort_beginners` | `certified_divers` | `dive_clubs` |
| Description shown | Holidaymakers in the resorts who have never dived and are curious | Divers on holiday who want the wreck, often for a week | Clubs and dive travel organisers from Germany, Britain and Scandinavia booking a week for a group |
| Booking unit | Per person (a try dive or a course place) | Per dive, in packages of 4 to 10 | Per group of 8 to 20 divers, about 10 dives each |
| Requests per week at peak (reachable, est.) | 20 to 70 people | 30 to 120 dives | 0.1 to 0.6 groups |
| Willingness to pay | 0.8 to 1.2 times the list price | 0.9 to 1.3 | 0.7 to 1.0 (they negotiate) |
| Lead time | 0 to 1 week | 1 to 12 weeks | 12 to 40 weeks |
| Season shape (hidden, roughly) | June to September, high in August | April to November, peaks in May, June, September and October | Spring and autumn, almost none in August |
| Must haves | `pool_partnership`, `hotel_pickup` | `wreck_dives`, `nitrox`, `online_booking` | `group_packages`, `wreck_dives` |
| Channel response: platform | high | medium | none |
| Channel response: own website | low | high once reviewed | medium |
| Channel response: partnerships | hotel receptions and tour reps: high | none | dive travel organisers: high |
| Channel response: outreach (phone, email, dive shows at home) | low | low | high |
| Cancellation tendency | High (a hangover, a sunburn, a whim) | Low; rough seas move them, not cancel them | Low, but a cancelled group is a month |
| Payment | At booking | At booking | Deposit 30%, the rest by invoice, 30 days, 2% never pay (est.) |

Roles viable, mediocre and trap, shuffled per run.

A polite trap example: dive clubs that love the wreck, ask for six free leader places and a discount, and book in Malta.

## 6. Experiments

| Experiment | Version here | Signal |
|---|---|---|
| Interview | Hotel guests at the pool, certified divers at the harbour, club leaders by phone | Pain buckets, product mentions, budget hints |
| Pool taster | Free try dives in a hotel pool for eight guests one afternoon | Bookings afterwards, a review |
| Test listing | Two weeks on the activity platform at a test price | Bookings, mostly resort beginners |
| Dive show stand | A stand at a dive show at home (a weekend and travel, 1,500, est.) | Interest from clubs and certified divers, months ahead |

## 7. Channels

| Channel | Cost | Effect |
|---|---|---|
| Activity platform | 20 to 25% (est., verify) | Resort beginners fast, some certified divers. The guest belongs to the platform |
| Own website | Founder hours, some ads | Certified divers and returning graduates |
| Hotel partnerships | Founder hours, a 10 to 15% cut (est.) | Resort beginners |
| Dive travel organisers | Founder hours, 15% (est.) | Clubs and groups |
| The shop | Free | A few walk-ins |

## 8. Staff

| Role | Pay (est., verify) | Does |
|---|---|---|
| Dive instructor | 120 a day freelance; seasonal about 1,800 a month plus a share | Teaches all courses, guides |
| Divemaster | 80 a day | Guides certified divers, assists courses (raises an instructor's course group from 4 to 6) |
| Skipper | 130 a day | Drives the boat; needed for every trip with an owned or leased boat |
| Shop and compressor help | 70 a day | Fills, rental gear, the desk; frees about 6 founder hours a week |

Contracts as in the other tourism scenarios.

## 9. Pricing and policies

- Prices per product and season, with the existing price curve.
- Cancellation policy as elsewhere; conditions cancellations as in `docs/abroad-mechanics.md` section 2.2. A rough morning moves wreck dives to the next calm morning when the boat has room.

## 10. Reviews

As elsewhere, plus:

- guide ratio on shore dives;
- moved against cancelled dives;
- worn rental gear;
- a full boat (more than 10 divers) lowers certified divers' reviews a little.

## 11. Safety incidents

New products and tired staff raise the chance of an incident (an out-of-air drill that was not a drill, a diver surfacing far from the boat, an ear injury). Incidents cost a review point and sometimes a refund. A serious one (very rare, est. 0.2% a season with an untrained crew) closes the centre for 2 weeks while the authority checks.

## 12. Stages

Stages 1 and 2 only in this pass.

| Stage | Name | Rent | One-off (est.) | Effect |
|---|---|---|---|---|
| 1 | Shop with a classroom | as start | | as start |
| 2 | A bigger centre with its own small pool | +1,200 a month | 25,000 | No pool fees; try dives at any time; courses half a slot shorter; walk-ins +20% |

Scene drawings: a narrow shop with a dive flag and tanks on a rack by the door; then a wider centre with a small blue pool behind a fence. Same muted style.

## 13. Content

| Type | Target |
|---|---|
| Intro cards | 4. Card 1: the move from Munich. Card 2: Larnaca and the wreck. Card 3: three kinds of customer, and the ladder from a try dive to the wreck. Card 4: the boat question and the season |
| Scenario events | At least 40. Ideas below |
| Interview quotes | At least 10 per bucket per segment |
| Names | Invented: hotels ("Hotel Kalamaki Sands"; check that an invented name is not a real hotel), clubs ("Tauchclub Isarperle"), partners, staff. The Zenobia may be named: it is a real wreck and a public place |

Event ideas:

| Idea | Tension |
|---|---|
| The partner boat keeps your seats for its own divers on Saturday | Refund, move, or rent a second boat for the day |
| A club cancels its October week, deposit paid | Keep the deposit or rebook them for spring |
| The compressor breaks in August | Rent fills from a rival, or repair at a premium |
| A rough week in June; 18 wreck dives booked | Move, refund, or offer shore dives |
| A hotel offers its pool free in return for a 20% cut on its guests | A partnership at a price |
| An instructor wants to leave mid-season for a liveaboard job | Pay more or let go |
| A diver posts a video of the wreck's lorries in the hold | Demand you may not have seats for |
| The authority audits the centre's logbooks | Hours now or a fine |
| A tour rep wants a cut of every try dive sold at her welcome meetings | Volume at a price |
| A tech diver offers to run deep courses from your centre for a share | The temptation, without paying for it |
| Jellyfish in the shallows for a week | Try dives fall, the wreck is fine |
| A British dive club wants 16 places in August, the busiest month | Big money, no seats |

Interview quote examples (tone guide only):

| Bucket | Example |
|---|---|
| Not a problem | "I can see fish from the pool bar. That is enough nature." |
| Mild | "My son wants to try it. I want to watch from the boat with a drink." |
| Noticeable | "Last centre packed 20 of us on one boat. I saw the wreck through someone's fins." |
| Painful | "I need nitrox for the deep part, and nobody here fills it on a Sunday." |
| Urgent | "We fly in on Friday, 14 divers, our centre just closed, and the club chairman is my father-in-law." |

## 14. Rough expectation (by hand, not simulated)

Spring is for the licence, the pool partnership and the boat decision. A player who starts with seats on a partner's boat and fills the try dives and entry courses in summer learns where the demand is before signing a lease. A player who buys the boat in February has a beautiful boat and a skipper to pay in a quiet April.

Year 2 is easier for a player whose graduates booked them directly and come back for the wreck.

This is a back of the envelope expectation. The bot report is the real answer.

## 15. Scenario targets

On top of T1 to T18 and E1 (`docs/balancing.md`). Office targets T19 to T21 do not apply in this pass.

| # | Target |
|---|---|
| D1 | The famous site is not the business: a bot that sells only to certified divers (wreck and shore dives, no try dives or entry courses) loses at least 3 points to the careful bot |
| D2 | No boat option is always right: on paired seeds, each of `always_buy`, `always_lease` and `always_share` has the best result of the three in at least 15% of the seeds where they differ, money counted net of the boat (restated in tuning 1) |
| D3 | Owning is risky: `always_buy` ends bankrupt or with the loan called at least 10 points more often than `always_share`, and its median final money net of the boat (cash plus resale value less the loan left) among its wins is the highest of the three (restated in tuning 1) |
| D4 | The ladder pays: a bot that sells try dives but no courses loses at least 3 points |

## 16. Sources and values as built

Filled in by plan 4, step 3 (October 2026). Decisions: `docs/decisions.md`, "Plan 4, step 3".

### Checked figures (searched October 2026)

| Figure | Source | Use |
|---|---|---|
| Zenobia trips: two dives 110 to 210 EUR (tanks and weights, often lunch and a transfer); advanced open water or the like required | Expedia and Travelocity listings (Alpha Divers, about 178 to 181 USD private); PADI Travel (Cyprus Diving Centre, two dives about 188 USD); GetMyBoat operators (110 EUR with equipment; 195 to 210 EUR with transfer and lunch) | 60 a dive, the advanced level for the wreck, kept |
| Open water course about 450 EUR | A Larnaca operator on GetMyBoat (undated) | 450 kept (5.6 times a try dive) |
| Licensing: Cyprus's "Law on Diving and Providers of Recreational Diving Services of 2025" licenses centres, schools, instructors and boats through the Deputy Ministry of Tourism; three-year licences, qualified instructors, ISO 24803 compliance and insurance | Cyprus Mail (November and December 2025); Fast Forward (2025); CBN | The licence product kept; its fee (1,000) and the six weeks' wait stay estimates, as the fee was not published |
| Activity platforms take 20 to 30% | As in `docs/scenario-watersports.md` section 17 | Divebook at 22% |

Not found from a current source, so still estimates: the shop's rent, boat prices, the lease, seats on a partner's boat, the skipper's and instructors' day rates, the sea's monthly odds and water temperatures.

### Values as built that differ from the spec

| Value | Spec | As built | Why |
|---|---|---|---|
| Prices | per product | per segment (a try dive 70, a dive 55, a club dive 46 at the start) with a factor per product (entry course 5.6, advanced 5.8, shore dives 0.67) | The engine prices by segment; opening prices a little low and flat (T7) |
| Course places per instructor day | 4 per instructor per slot | entry course 1, advanced course 2, try dives 8 | A four-day course takes four instructor days for four students |
| The skipper | a staff role | a crew cost per week the boat is used (buy or lease) | The roster adds up roles, it cannot require two; decisions |
| Resort beginners | 20 to 70 a week | 10 to 34 | T2 and T3 rounds 1 and 2, then T1 |
| Certified divers | 30 to 120 dives a week | 46 to 150 | T3 round 2, T1 round 1 |
| Dive clubs | 0.1 to 0.6 groups of 8 to 20 divers, 10 dives each, 12 to 40 weeks ahead | 60 to 160 dives a week at peak in groups of 40 to 100 dives, 8 to 30 weeks ahead, willing to pay 50 to 70 EUR a dive (listed at 54) | A group bigger than the seats could never book (round 1); round 2 for T3; more demand and a better price per dive in tuning 1 (T3) |
| Technical diving | 35,000 | 35,000 and 500 a month | T2 round 2: the temptation should cost while it waits |
| Strict policy | | certified divers convert 0.75, clubs 0.7 | T11 round 1 |
| Shop and compressor help | a staff role freeing 6 founder hours | a summer job offered by an event (a fixed cost and energy) | No role without units on the roster |
| The boat's price | 70,000 | 70,000 (55,000 was tried for D3 and made owning worse) | |
| Upkeep of products | none beyond the stated costs | the entry course 600 a month (pool hire, rental sets), the advanced course 300, nitrox 300 (estimates) | Tuning 1 (T2): a product nobody books should still cost something; the no-tests bot built everything for free |
| The established look | after 8 months covering all costs | after 7 | Tuning 1, after the upkeep (E1) |

