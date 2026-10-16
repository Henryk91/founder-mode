# Scenario spec: gulet cruises from Fethiye (working name "Leinen los")

Source of truth for the third abroad scenario. Read `docs/abroad-mechanics.md`, `docs/scenario-dive.md` and `docs/scenario-hotel.md` first. Anything not stated here works as in those files. Where the engine design differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates. Check them against current sources for Fethiye and the Turkish coast (2025 or 2026) and cite them in section 16, or keep the label. Tune everything against the targets.

"Leinen los" means "cast off". It is what German skippers shout, and what German founders say when they quit their job.

## 1. Premise

The player worked for a Munich tour operator for years and sailed on a gulet every summer. A gulet is a traditional wooden motor sailer with cabins, a crew and a long deck. They move to Fethiye, on Turkey's south-west coast, to run week-long cruises for German-speaking guests along the coast towards Kekova: the "Blue Cruise".

They have savings, a list of past customers, and three offers from boat owners in the harbour.

Three kinds of customer might book. In each run only some of them really do.

### What this scenario teaches

1. **Own, lease or share.** Owning a boat has the best margin and the worst risk. Managing someone else's has none of the risk and little of the margin. You should know how many weeks you can fill before you choose.
2. **A week is sold once.** Hold it for a private charter or sell its cabins one by one. A half-sold cruise still sails, or is cancelled at a cost.
3. **Strangers on one boat.** Mixing guests fills cabins and can sink reviews.
4. **Prices in euros, costs in lira.** Local costs rise, and the price list has to follow.

## 2. Starting values

| Value | Start | Note |
|---|---|---|
| Mode | Long only, 104 weeks | Week 1 is the first week of January. Cruises run from May to October, so the player has 17 weeks to sell the first season |
| Company cash | 50,000 | Own money put in (est.) |
| Personal savings | 14,250 | As elsewhere |
| Founder living costs | 450 per week (est.), rising a tenth from week 53 | |
| Company fixed costs per month | A desk in a harbour office 300 (est.), insurance 300 (est.), accountant 150 (est.), website and booking software 120, phone 50 | |
| Local cost steps | Food, fuel, crew pay and harbour fees rise 15% from week 53 (est.) | `docs/abroad-mechanics.md` section 7. Turkey's inflation in lira is far higher; in euro terms the rise is smaller and uncertain |
| Founder | Hosts guests in German and English, plans routes, sells. Cannot skipper or cook. Hosting a cruise takes the whole week (about 45 h) | |
| Bank loan | Available (fictional "Likya Bankası"), only for owning, and only once the local company exists | Items: the boat, the refit (the temptation), working capital |
| Funding | Not available | |

All prices and costs are in EUR (`docs/abroad-mechanics.md` section 1).

## 3. The boat

The core decision. An inbox message in week 1 brings three offers (`docs/abroad-mechanics.md` section 4). It comes again each winter (November to February), when the current terms allow a change.

| Option | Terms (est.) | Who runs the boat | Your income |
|---|---|---|---|
| **Manage** an owner's gulet ("Mavi Rüya", 8 cabins) | No fixed cost. You sell the weeks; the owner takes 75% of the revenue and pays crew, food and fuel. He keeps July and August for his own agents unless you have sold at least 6 weeks of May, June, September and October by the end of March | The owner's crew | 25% of what you sell |
| **Lease** a crewed gulet for the season ("Deniz Yıldızı", 8 cabins) | 110,000 for May to October: 30% on signing, the rest in monthly parts. You pay food and fuel, about 1,800 a cruising week | The owner's crew | All revenue, less food and fuel |
| **Buy** a used 24 m gulet (8 cabins) | 450,000. Needs a Turkish company first (8 weeks, 4,000 in fees). The bank lends up to 70% of the price. Crew on seasonal contracts (section 8), food and fuel 1,800 a week, mooring 6,000 a year, insurance 9,000 a year, a winter haul-out and maintenance of 15,000 between November and March. Breakdowns as in `docs/abroad-mechanics.md` section 4 | Your crew | All revenue, less every cost. The boat's resale value counts in the post-mortem |

- One boat at a time in this pass. A second boat is out of scope.
- Owning a commercial boat as a foreigner in Turkey normally needs a local company or partner. That is my understanding, not checked: verify, and keep it simple.

## 4. Products

| Id | Name shown | Prep hours | Cost (est.) | Effect | Required by |
|---|---|---|---|---|---|
| `blue_cruise` | The week-long route, Fethiye to Kekova and back | 10 | none | The starter product. One departure a week, 8 cabins, 16 guests | none |
| `cabin_sales` | Selling single cabins, with rules for who shares a boat | 10 | none | Cabin guests can book | cabin guests |
| `charter_contracts` | Whole-boat charter contracts, deposits and a menu choice | 10 | none | Private charters can book | private charters |
| `german_host` | A German-speaking host on board | 5 | The founder (a whole week) or a hired host, 700 a week | Cabin guests' must-have; raises reviews | cabin guests |
| `chef_menu` | A better menu with a named cook's dishes | 10 | +250 a week in food | Raises willingness to pay, mostly for private charters | private charters |
| `retreat_setup` | Shade sails, mats, a flexible daily plan | 15 | 2,500 | Retreat groups can book | retreats |
| `airport_transfers` | Transfers from Dalaman airport | 5 | 120 a transfer (est.) | | cabin guests |
| `sheltered_route` | A second route through the sheltered bays near Göcek | 15 | none | The shelter product: rough days hurt reviews less (section 5) | none |
| `themed_weeks` | Adults-only and family weeks | 8 | none | Lowers the review penalty for mixed groups (section 6) | none |
| `online_booking` | Online booking with instant confirmation | 15 | system 40 a month | Direct bookings possible | none |
| `invoice_billing` | Invoices for organisers | 5 | none | | retreats |

### The temptation

| Id | Name shown | Prep hours | Cost (est.) | Effect |
|---|---|---|---|---|
| `luxury_refit` | Air conditioning in every cabin, a new teak deck, a deck jacuzzi | 30 | 120,000; the boat is out for 8 weeks | Only an owner can do it. Raises private charter prices a little. Brochure appeal, a large loan, and two lost weeks if done late |

## 5. Conditions

Day conditions with one slot a day (`docs/abroad-mechanics.md` section 2). A cruise is sold by the week and never cancels for weather. Rough days lower that week's review quality, unless the boat has the `sheltered_route`.

| State | Sea | Effect on the week |
|---|---|---|
| `calm` | Flat | Better reviews |
| `breezy` | The afternoon wind | None |
| `rough` | The strong summer westerly, or a spring storm | Review quality down a little per rough day (seasick guests); halved with the sheltered route |

Monthly probabilities (est.): May and October 0.5 / 0.35 / 0.15, July and August 0.35 / 0.45 / 0.2, June and September 0.5 / 0.4 / 0.1. Persistence 0.6.

## 6. Selling a week

- **Hold or sell.** Each week of the season is open, held for a private charter, sold to a charter, or selling cabins. Once a cabin is sold, the week cannot go to a charter. Holding a week stops cabin sales for it.
- **Minimum to sail.** A player setting: sail with any number of cabins, or only with at least 4, 5 or 6 of 8 sold. Changed at most every 4 weeks. Below the minimum, the cruise is cancelled 3 weeks before departure. Guests get a full refund, or a free move to a partner's boat at 150 a cabin (est.).
- **Mixed guests.** On cabin weeks, each mix of groups has a hidden chance of friction (families with a party group, est. 0.2). Friction costs review quality. `themed_weeks` halves it, but also lowers cabin guests' conversion by a tenth (fewer weeks to choose from).

## 7. Segments

| | Cabin guests | Private charters | Retreats |
|---|---|---|---|
| Id | `cabin_guests` | `private_charters` | `retreats` |
| Description shown | Couples, friends and solo travellers booking a cabin on a shared cruise | Families and groups of friends booking the whole boat for a week | Yoga teachers, hiking guides and photographers who bring their own group |
| Booking unit | Per person per week, in groups of 1 to 4 | Per boat per week | Per boat per week |
| Requests per week at peak (reachable, est.) | 8 to 30 people | 0.2 to 1.0 | 0.1 to 0.5 |
| Willingness to pay (est.) | 750 to 1,150 a person, full board, peak; 550 to 850 off peak | 10,000 to 18,000 a week, peak; 7,000 to 11,000 off peak | 6,000 to 9,000 a week |
| Lead time | 2 to 20 weeks | 8 to 40 weeks | 12 to 40 weeks |
| Season shape (hidden, roughly) | June to September | July and August, school holidays | May, June, September and October |
| Must haves | `cabin_sales`, `german_host`, `airport_transfers` | `charter_contracts`, `chef_menu` | `retreat_setup`, `invoice_billing` |
| Channel response: platform | high | low | none |
| Channel response: own website | low, grows with reviews and past customers | medium | low |
| Channel response: partnerships | travel agents at home: medium | yacht charter brokers: high | none |
| Channel response: outreach (the founder's list and network) | medium | medium | high |
| Cancellation tendency | Medium | Low; a cancelled charter is a whole week | Medium: the organiser's group may not fill |
| Payment | 30% at booking, the rest 6 weeks before | 30% at booking, the rest 6 weeks before | 30% at booking, the rest by invoice after the week |

Roles viable, mediocre and trap, shuffled per run.

A polite trap example: retreat organisers who love the deck, promise twelve guests, and arrive with five and a request to pay later.

## 8. Crew and staff

Only when the player owns the boat. With a lease or managed boat, the owner's crew comes with it.

| Role | Pay (est., verify) | Needed |
|---|---|---|
| Captain | 2,800 a month in season | One, every cruising week |
| Cook | 1,800 a month | One |
| Deckhand | 1,200 a month | Two |
| Host | 700 a week | Optional, instead of the founder |

- Crew are on seasonal contracts (May to October), as in the other tourism scenarios.
- A week without a full crew cannot sail.
- A tired founder hosting every week loses energy as in the other scenarios. Hosting a cruise takes the founder's whole week, so they cannot sell that week.

## 9. Experiments

| Experiment | Version here | Signal |
|---|---|---|
| Interview | Past customers, travel agents and charter brokers by phone; yoga teachers at home | Pain buckets, product mentions, budget hints |
| Taster day | A day trip on the boat for 12 people from one segment (only with a boat available, so from May) | Bookings and a review |
| Test listing | Two weeks of cabins on a cruise platform at a test price | Bookings, mostly cabin guests |
| Travel fair stand | A stand at a travel fair at home, in winter (a weekend and 2,000, est.) | Interest from charters and retreats, months ahead |

## 10. Channels

| Channel | Cost | Effect |
|---|---|---|
| Cruise platform | 15 to 20% (est., verify) | Cabin guests fast. The guest belongs to the platform |
| Own website | Founder hours, some ads | Grows with reviews and past customers |
| Travel agents at home | 10% (est.) | Cabin guests, some charters |
| Charter brokers | 15% (est.) | Private charters |
| The founder's list and network | Founder hours | All three, retreats most |

## 11. Pricing

Per product and season (peak July and August, shoulder May, June, September and October). Cabin prices per person, charters and retreats per week. The existing price curve and "Too expensive" reasons apply. In year 2, local costs rise (section 2) and the prices should follow.

## 12. Reviews

As elsewhere, plus:

- rough days without the sheltered route;
- friction on mixed weeks;
- the host (founder, hired, or none);
- the menu;
- cancelled cruises.

## 13. Stages

Office stage 1 only (a desk in the harbour office). The boat options are this scenario's progression. Stages 2 to 5 are out of scope in this pass. The established look comes from sustained profitability (`establishedAt: { monthsCoveringAll: 8 }`, tune).

Scene drawings: a desk with a harbour window and a gulet's masts outside; the boat itself is shown on the Finance tab's boat card (a simple side view of a two-masted wooden gulet). Same muted style.

## 14. Content

| Type | Target |
|---|---|
| Intro cards | 4. Card 1: the move from Munich. Card 2: Fethiye, the coast and the gulets. Card 3: three kinds of customer. Card 4: the three offers from the harbour |
| Scenario events | At least 40. Ideas below |
| Interview quotes | At least 10 per bucket per segment |
| Names | Invented: boats ("Mavi Rüya", "Deniz Yıldızı"; check they are not well-known real boats), owners ("Kaptan Murat"), agents, guests. Places on the coast may be named |

Event ideas:

| Idea | Tension |
|---|---|
| The owner offers you two July weeks if you take a third week in May | Peak access at the cost of a weak week |
| A family wants the whole boat in August; you have sold four cabins that week | Move the cabin guests (cost, reviews) or decline |
| The cook quits in June | Hire at a premium, or the owner's cousin |
| The engine fails in Kekova with 16 guests aboard | Tow, repair, refund (owner only, or the owner pays) |
| A rough week; three guests seasick, one writes a novel of a review | Reply, refund, or ignore |
| A yoga teacher wants a week in May at a price below your costs | Fill a weak week or hold out |
| The harbour raises its fees | Accept or move the boat to another harbour |
| A guest posts the sunset from the deck; your inbox fills | Demand you may not have weeks for |
| A charter broker wants exclusivity for July and August at 15% | A partnership at a price |
| A coast guard check finds the life jacket count one short | A fine now, and a check of every boat you work with |
| The owner wants to sell the boat you manage | Buy it, move to another, or lose your weeks |
| A travel agent at home goes bust owing you three bookings | The money is gone; the guests are still coming |

Interview quote examples (tone guide only):

| Bucket | Example |
|---|---|
| Not a problem | "We go to the same hotel every year. The waiter knows our names." |
| Mild | "A boat sounds nice. Is there wifi? There is no wifi, is there." |
| Noticeable | "Last cruise, nobody could tell us where we were going or when lunch was." |
| Painful | "I need a boat for my retreat in May that takes twelve, and every agent wants a deposit I do not have." |
| Urgent | "Our charter was cancelled. Fourteen people, three generations, August, and my mother has bought a hat." |

## 15. Rough expectation (by hand, not simulated)

Winter is for selling. A player who manages an owner's boat in the first season learns which customers come and which weeks fill, without the risk. In year 2 they lease or buy with evidence. A player who buys in January has a beautiful boat, a loan, a crew to hire, and a May with three cabins sold.

This is a back of the envelope expectation. The bot report is the real answer.

## 16. Scenario targets

On top of T1 to T18 and E1 (`docs/balancing.md`). T9 (staffing) applies only to owners. T14 (contracts) applies to the crew. Office targets T19 to T21 do not apply.

| # | Target |
|---|---|
| G1 | No boat option is always right: on paired seeds, each of `always_manage`, `always_lease` and `always_buy` has the best result of the three in at least 15% of the seeds where they differ |
| G2 | Owning is risky: `always_buy` ends bankrupt or with the loan called at least 10 points more often than `always_manage`, and its median final cash among its wins is the highest of the three |
| G3 | Holding weeks is a decision: a bot that holds every peak week for charters and a bot that never holds each lose to the careful bot by at least 2 points |
| G4 | The minimum to sail is a decision: always sailing and sailing only with 6 or more each lead in some segment split, and neither is ahead by more than 5 points overall |

## 17. Sources and values as built

The agent fills this in: checked figures with sources and dates, and every value changed while tuning with a pointer to `docs/decisions.md`.
