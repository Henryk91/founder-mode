# Scenario spec: neighbourhood restaurant (working name "Hinterhof") and the bank loan

Source of truth for the second tourism scenario and for the bank loan system. Read `docs/AUTONOMOUS_PLAN.md` (sections 7 and 8), `docs/tourism-proposal.md` and `docs/scenario-outdoor.md` first. Anything not stated here works as in the outdoor scenario. Where the engine design differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates and must be checked against current sources and cited, or kept and labelled as estimates. Tune everything against the targets.

## Part A: the bank loan (build first, general system)

The loan is a general system that any tourism scenario can offer, and long mode too if it fits. The restaurant needs it to open; the hotel needs it to renovate; the outdoor company may use it for gear.

### A.1 Mechanics

| Rule | Starting value |
|---|---|
| Who lends | A fictional local bank ("Stadtsparkasse" is a real type of bank, so invent a name such as "Isartaler Bank"). The terms may be modelled on a public start-up loan programme, cited, but the programme is not named in the game |
| Application | Founder hours for a business plan (20 to 40 h), then a meeting. The bank judges only what the player can see: own money put in, revenue so far, bookings ahead, the plan's numbers, and the founder's track record in the run |
| Own money | The bank wants the founder to put in at least 15 to 20% of the total (est., verify) |
| Amount | 30,000 to 150,000 for the restaurant (est.) |
| Interest | Fixed rate drawn per run from a realistic range for small business start-up loans in Germany now (est. 4 to 8%, verify and cite) |
| Term | 5 to 10 years, with an optional repayment-free first 6 to 12 months (interest only) |
| Personal guarantee | Required. If the company cannot pay, the founder's savings pay. A default with savings gone ends the run |
| Missed payment | A reminder event, then a fee, then default after two missed months. Default ends the run as "Bank called the loan" |
| Early repayment | Allowed with a small fee (est.) |
| Refusal | Possible, with a reason in plain words ("Your numbers do not show enough guests yet" or "You are putting in too little yourself"). The player can try again after improving the named weakness |

The loan is its own ledger entry. Loan money never counts as income for runway. Repayments count as outgoings.

### A.2 What it teaches

1. Debt buys time and assets, not demand.
2. Repayments start whether the guests come or not.
3. A personal guarantee makes company risk personal.
4. Borrowing too much is as dangerous as borrowing too little.

### A.3 Targets

- Where a loan is optional, borrowing and not borrowing are both viable: neither wins by more than 5 points overall.
- Over-borrowing (the maximum, early) loses to borrowing what the plan needs.
- Default is reachable but avoidable: the careful bot defaults in under 3% of runs, a reckless bot in over 15%.
- Post-mortem: the loan's total interest, what it paid for, and whether it paid back.

## Part B: the restaurant

### B.1 Premise

The player is a trained cook who takes over a small, tired restaurant in a residential part of Munich (fictional street, real-feeling neighbourhood). Forty seats inside, a courtyard that could hold twenty more in summer. They need a loan for the takeover and a basic fit-out. Three kinds of guests might come. In each run only some of them come back and pay enough.

### B.2 What this scenario teaches

1. **Fixed costs decide everything.** Rent, staff and loan payments run every week. The player must know their break-even number of covers.
2. **Food cost is a percentage you manage.** Menu prices against ingredient costs and waste.
3. **Staffing follows peaks.** Too many staff on a quiet Tuesday burns money, too few on a Friday burns reviews.
4. **Lunch and dinner are different businesses.** Volume and speed against margin and atmosphere.
5. **Delivery platforms are a trap that looks like growth.** Orders go up, margin disappears.

### B.3 Starting values

| Value | Start | Note |
|---|---|---|
| Mode | Long only, 104 weeks | Week 1 is the first week of January. The restaurant opens when the player decides the fit-out is done (at the earliest week 6) |
| Company cash | 25,000 own money put in (est.) | Not enough to open without a loan |
| Personal savings | 14,250 | As elsewhere |
| Founder living costs | 675 per week, rising a tenth from week 53 | |
| Takeover and fit-out | 60,000 to 110,000 depending on what the player chooses (est., verify) | Kitchen equipment, furniture, the previous tenant's handover fee |
| Rent | 4,500 a month for about 120 square metres (est., verify for Munich) | Starts at the takeover, not at opening |
| Other fixed costs per month | Insurance 150, accountant 300, utilities 900 (est.), POS and booking system 120, music licence 60 (est.) | |
| Licences | Opening needs a hygiene check and a licence: founder hours plus a small fee, and a wait of a few weeks (est.) | |

### B.4 Segments

| | Office lunch | Evening locals | Tourists and visitors |
|---|---|---|---|
| Id | `office_lunch` | `evening_locals` | `tourists` |
| Description shown | People from the offices nearby, Monday to Friday | People from the neighbourhood, Thursday to Saturday evenings | Visitors to Munich, more in summer, during the Oktoberfest and at Christmas |
| Booking unit | Walk-in covers | Reservations, 2 to 6 people | Walk-ins and reservations, 2 to 4 people |
| Covers per week at peak (reachable) | 80 to 250 | 40 to 160 | 30 to 180 |
| Willingness to pay per cover | 12 to 18 (est.) | 32 to 55 (est.) | 22 to 45 (est.) |
| Lead time | none | 1 to 14 days | 0 to 7 days |
| Season shape (hidden, roughly) | Flat, dips in August and at Christmas | Higher in autumn and winter, lower in summer holidays | High in summer, a spike in late September and early October, a smaller one in December |
| Must haves | `fast_lunch`, `weekly_menu`, `card_payment` | `dinner_menu`, `wine_list`, `online_reservations` | `english_menu`, `open_sundays`, `courtyard` |
| Channel response: walk-in and location | high | medium | medium |
| Channel response: own website and maps listing | low | medium | high |
| Channel response: reservation platform | none | high | medium |
| Channel response: delivery platform | medium (orders, not covers) | low | none |
| Channel response: partnerships | office managers and catering: high | none | hotels nearby: medium |
| No-shows and cancellations | none | 5 to 15% of reservations without a deposit policy (est.) | medium |
| Invoices | Catering only: 25 days mean, 2% never pay | none | none |

Roles viable, mediocre and trap shuffled per run, as everywhere. A polite trap segment loves the food in interviews, comes once, and never returns at a price that covers the plate.

### B.5 Products (the equivalent of features)

| Id | Name shown | Prep hours | One-off cost | Effect | Required by |
|---|---|---|---|---|---|
| `fast_lunch` | Lunch in 30 minutes | 20 | none | Lunch service possible, one seating plus walk-ins | office lunch |
| `weekly_menu` | A changing weekly lunch menu | 10, plus 3 a week | none | Keeps lunch guests coming back | office lunch |
| `card_payment` | Card payment | 3 | terminal (est. small) | Fee per payment (est. 1 to 2%) | office lunch |
| `dinner_menu` | Dinner menu à la carte | 30 | none | Dinner service, up to two seatings | evening locals |
| `wine_list` | A proper wine list | 15 | stock 3,000 (est.) | Raises drinks spend per cover | evening locals |
| `online_reservations` | Online reservations | 8 | system fee | Reservations, and the deposit policy decision | evening locals |
| `english_menu` | Menu in English | 5 | none | | tourists |
| `open_sundays` | Open on Sundays | 0 | more staff hours | | tourists |
| `courtyard` | Courtyard seating in summer | 20 | furniture 4,000 (est.), a permit with a wait | 20 extra seats May to September, weather dependent | tourists |
| `catering` | Office catering | 25 | none | Invoiced orders, uses the kitchen outside service hours | nobody |
| `delivery` | Delivery through a platform | 10 | none | Orders through a platform at about 30% commission (est., verify) | nobody |

`delivery` is the temptation. Orders arrive fast, the dashboard looks like growth, and after commission, packaging and a cook's time the margin is about zero. No segment requires it. It also loses walk-in atmosphere if the kitchen is overloaded on a Friday.

Shipping a product has no bugs. A new menu has a **teething risk**: early services with a new menu carry a chance of a bad review from slow plates, falling with each service.

### B.5b Experiments

| Experiment | Version here | Signal |
|---|---|---|
| Interview | Talking to office workers, neighbours, hotel staff | Pain buckets, feature mentions, budget hints |
| Pop-up dinner | Cooking one evening in a borrowed kitchen or a friend's bar, before opening. Costs a day and ingredients | Real guests, real prices, honest table talk, a first review |
| Lunch test | Selling a lunch box to two or three offices for a week before opening | Order counts and repeat orders from office lunch only |
| Vouchers (pre-sale) | Opening vouchers sold to the neighbourhood | Cash before opening, evidence from evening locals. Unredeemed vouchers are a liability |

### B.6 Money per cover

| Item | Starting value |
|---|---|
| Food cost | 28 to 35% of food sales (est., verify), rises with waste when covers fall short of what was prepared |
| Drinks | 30% of the bill at dinner, 10% at lunch (est.), drinks cost about 25% of drinks sales (est.) |
| Waste | The player plans prep per service. Prepared and unsold food is lost: capacity that expires, in the kitchen |
| Tips | Go to staff, not the company, but raise staff morale |

### B.7 Staff

| Role | Pay (est., verify against current German rules and Munich levels) |
|---|---|
| Cook | 2,800 to 3,300 gross a month full time, plus employer costs |
| Kitchen help | Minimum wage or minijob |
| Service | 2,400 to 2,900 gross full time plus tips, or minijobs |
| Dishwasher | Minijob |

Use the current German minimum wage and minijob limit, cited. The weekly roster in the planner decides who works which service. A service with too few staff loses covers and reviews. A service with too many staff costs wages with nothing to show.

### B.8 Seasons and weather

- Segment season shapes as in B.4, hidden in exact form, with honest signals (last year's covers in year 2, the neighbours, the tourism office, Oktoberfest dates).
- Weather matters only for the courtyard and for walk-ins on very hot or very cold days.
- August is quiet for office lunch. The player may close for two weeks: fixed costs still run, staff take holiday.

### B.9 Pricing

Menu prices per service (lunch, dinner) and optional seasonal changes. The existing smooth price curve and "Too expensive" reasons apply, with reasons heard as table talk ("Fourteen euros for soup?").

### B.10 Reviews

A public rating out of 5, driven by: wait time (staff to covers), food quality (cook's energy, menu teething), cleanliness, value for money (price against willingness to pay), courtyard weather days. Reviews drive tourists through the maps listing and evening locals through word of mouth.

### B.11 Stages

| Stage | Trigger | Effect |
|---|---|---|
| Inherited dining room | Start | The previous tenant's furniture. Reviews capped slightly by "a bit tired" remarks |
| Own fit-out | Offered by an inbox event after month 9 if revenue covers costs, needs cash or a second loan | Lifts the review cap and evening willingness to pay. A loss when evening locals are the trap |

Scene drawings: a dark dining room with mismatched chairs and a chalkboard, then a warmer room with lamps over the tables and the courtyard through the window.

### B.12 Content

| Type | Target |
|---|---|
| Intro cards | 4. Card 2 the restaurant and the street, card 3 the three kinds of guests and that fixed costs never sleep |
| Scenario events | At least 40, using situational events |
| Interview quotes | At least 10 per bucket per segment |
| Names | Invented guests, suppliers, offices and hotels. No real firms |

Event ideas:

| Idea | Tension |
|---|---|
| The dishwasher breaks on a Friday at 7 pm | Pay for an emergency repair, or wash by hand and slow down |
| A food critic from a local blog books for two | Extra effort and cost for one table |
| A delivery platform rep offers lower commission for three months | Growth now, dependence later |
| The cook wants Saturdays off | Staff happiness against cover |
| A table of eight no-shows on a Saturday | Introduce a deposit policy, or accept it |
| The neighbours complain about courtyard noise | Close at 10 pm, or risk the permit |
| A supplier raises prices by 12% | Change the menu, raise prices, or eat the margin |
| The hygiene inspector arrives unannounced | Hours to prepare, and a risk if you skipped cleaning |
| An office manager wants catering for 80 people tomorrow | Big order, no staff, invoice paid in a month |
| Oktoberfest: the street fills with tourists for two weeks | Extra staff, Bavarian specials, or business as usual |
| A guest posts a photo of a hair in the soup | Reply, refund, or ignore |
| The bank asks for the quarterly numbers | Hours for the loan relationship |

## B.13 Rough expectation (by hand, not simulated)

The first months are all cost: rent from day one, a fit-out, a loan, no guests. A player who tests demand before opening (interviews, a pop-up dinner, talking to office managers) opens with the right services and a staff roster that fits. A player who opens every service with full staff runs out of money by summer. Year 2 is about tuning: prices, staffing to the real peaks, and deciding whether the fit-out is worth a second loan.

This is a back of the envelope expectation. The bot report is the real answer.

## C. Sources and values as built (step 6)

Checked figures:

- Public start-up loan the terms follow (not named in the game): up to 200,000 EUR, terms of 5 to 20 years, repayment-free years possible (fuer-gruender.de; business-on.de, December 2025); rates from about 3.7% (IHK Hanau, accountable.de). The game's bank draws 4.5 to 7.5% (estimate) plus a point for each multiple of own money borrowed beyond the first (estimate).
- Own money: 15 to 25% of the need (IHK Braunschweig); the game asks for 20%.
- Delivery platforms: about 30% commission with their couriers, 13 to 14% with your own (sumup.com, 2025).
- Cook pay about 2,830 to 2,980 EUR gross a month; union entry pay 3,000 in Bavaria (brutto-netto-gehaltsrechner.de, NGG). Minimum wage 13.90 EUR from January 2026.
- Not found: current Munich restaurant rents (kept as an estimate, 4,500 a month).

Changed from this spec while tuning (reasons in `docs/decisions.md`, step 6): staff are a cook and server crew per service plus a minijob helper; office lunch 170 to 380 covers a week at peak at 13 to 20 EUR; evening locals 35 to 140 covers; open services carry a standing monthly cost; the bank lends up to 120,000 EUR before any guest has paid. No investors in this scenario. A run is won when its last 13 months together cover every cost, loan repayments included.
