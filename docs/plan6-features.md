# Plan 6 features: price realism, office stages 3 to 5, second boats and second locations

Source of truth for `docs/AUTONOMOUS_PLAN_6.md`. Read `docs/office-stages.md`, `docs/abroad-mechanics.md` section 4 (assets) and `docs/leisure-mechanics.md` first. Where the engine as built differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates. Check them where a current source exists, or keep the label.

## 1. Price realism

### 1.1 The problem

Each segment has one willingness to pay per run. The price curve keeps a yes almost certain up to that price, so a discount below it wins almost nobody new. In real life, buyers differ: an off-season discount brings people who would not have come at the full price. Tuning plan 1 found this is why seasonal pricing (T7) barely pays.

### 1.2 The model

| Field | Meaning |
|---|---|
| Segment `elasticity` | Hidden, drawn per run from a range in content. How strongly the number of requests responds to price |
| Volume factor | Requests per week are multiplied by `(price / reference) ^ (-elasticity)`, clamped to a content range (est. 0.5 to 1.6) |
| Reference | The segment's willingness to pay for that product and season |
| Conversion | Unchanged: the existing curve still decides each request's yes or no |

Starting ranges (est.):

| Segment kind | Elasticity |
|---|---|
| Holiday guests, locals, students, private parties | 0.8 to 1.5 |
| Families, learners, cabin guests | 0.6 to 1.2 |
| Business, companies, corporate, clubs, charters, weddings | 0.2 to 0.6 |

- **Capacity still binds.** A discount at the peak fills nothing extra when the business is already full. So discounts pay off-peak and cost money at the peak.
- **Shoulder season.** Add an optional third price per product: peak, shoulder and off. A scenario names its shoulder months. Use it in Rückenwind, Tiefgang and Leinen los (their specs already describe a shoulder).
- **What the player sees:** requests and bookings per week, as now. After a price change, the change in requests shows over the following weeks. The post-mortem adds one line per season: price, requests and bookings against the season before.
- **Scope:** every scenario on the bookings engine, which is all tourism, abroad and leisure scenarios. Not Kantino or Zollstock (the subscription engine).

### 1.3 Lesson

Price is a lever on demand, not only on margin. Cut it where you have empty capacity; hold it where you are full.

## 2. Office stages 3 to 5 for the seven newer scenarios

Stages work as in `docs/office-stages.md` section 2: an offer by inbox once a visible condition holds, a one-off cost, rent from the next month, a move-in period, notice to give it back, and the established look from stage 4.

Conditions follow `docs/office-stages.md` section 4 (tourism column) unless stated: stage 3 when money covers two months or guests are turned away; stage 4 when they keep being turned away; stage 5 when they are turned away at the peak.

**Stage 5 is always a second location** (section 4) or, for the boat businesses, a second boat (section 3). That joins the backlog's "second location" and "second boat" items to the stages.

### 2.1 Rückenwind (stages 1 container, 2 beach station exist)

| Stage | Name | Rent | One-off (est.) | Effect |
|---|---|---|---|---|
| 3 | A small base at the kite spot | +700 | 15,000 | Kite courses run from the spot: no van trip, the instructor's day is shorter, kite capacity +50% |
| 4 | A watersports centre with a café and a rental shop | +1,800 | 40,000 | Walk-ins +40%; hire capacity +50%; café margin per visitor; **established look** |
| 5 | A second beach spot in another bay | second location | | Section 4 |

### 2.2 Tiefgang (stages 1 shop, 2 centre with a pool exist)

| Stage | Name | Rent | One-off (est.) | Effect |
|---|---|---|---|---|
| 3 | A base at the harbour next to the boat | +900 | 12,000 | Boat trips start 30 minutes sooner: three trips a morning instead of two; gear stays on board |
| 4 | A package partnership with a dive hotel | 0 | 8,000 | Certified divers and clubs convert better (est. +20%); packages sold by the week; **established look** |
| 5 | A second centre in Protaras | second location | | Section 4. Resort beginners from the big hotels; the wreck is 50 minutes away |

### 2.3 Leinen los (stage 1 harbour desk exists)

| Stage | Name | Rent | One-off (est.) | Effect |
|---|---|---|---|---|
| 2 | Your own office with a shopfront on the harbour | +600 | 6,000 | Walk-in cabin sales from holidaymakers in town; sales hours a quarter lower |
| 3 | A crew house and a store | +900 | 10,000 | Owners only: crew costs a tenth lower, turnarounds a day shorter (an extra day trip on change days) |
| 4 | A sales desk with a travel agency in Munich | +1,200 | 5,000 | Cabin guests and charters from Germany convert better (est. +15%); **established look** |
| 5 | A second gulet | second boat | | Section 3 |

### 2.4 Ausgesperrt (stages 1 basement, 2 second basement exist)

| Stage | Name | Rent | One-off (est.) | Effect |
|---|---|---|---|---|
| 3 | A lounge with a bar for groups | +1,200 | 25,000 | Companies and birthday groups stay longer: food and drink margin per group; companies convert better (est. +15%) |
| 4 | A flagship site near the city centre | +6,000 | 60,000 (two rooms rebuilt there) | Tourists +60%; walk-ins; **established look** |
| 5 | A second site in another district | second location | | Section 4. A fresh pool of local groups for every theme |

### 2.5 Fabriketage (stages 1 top floor, 2 floor below exist)

| Stage | Name | Rent | One-off (est.) | Effect |
|---|---|---|---|---|
| 3 | An in-house catering kitchen | +1,500 | 70,000 | Catering margin instead of the 10% commission; needs a chef (staff role); caterer quality risk becomes your own |
| 4 | A full-service planning team | 0 | 10,000 | Weddings and companies pay more for planned events (est. +15%); an event manager role required; **established look** |
| 5 | A second venue: a hall in another district | second location | | Section 4 |

### 2.6 Schweißperle (stages 1 shop, 2 third room exist)

| Stage | Name | Rent | One-off (est.) | Effect |
|---|---|---|---|---|
| 3 | Proper changing rooms and a reception | +1,500 | 35,000 | Before-work members churn less; reviews up; the front desk frees founder hours |
| 4 | A flagship studio with a café and a retail corner | +4,000 | 50,000 | Walk-ins and intro offers convert better; café margin; **established look** |
| 5 | A second studio in another district | second location | | Section 4 |

### 2.7 Griffig (stages 1 hall, 2 mezzanine exist)

| Stage | Name | Rent | One-off (est.) | Effect |
|---|---|---|---|---|
| 3 | An outdoor bouldering area beside the hall | +800 | 45,000 | Summer dip halved for students and families; summer visits |
| 4 | A training centre: youth teams and competitions | 0 | 20,000 | Committed climbers convert better (est. +20%); team fees; competitions as events; **established look** |
| 5 | A second, smaller bouldering hall in another district | second location | | Section 4 |

### 2.8 Stage targets

Use O1 and O2 as restated after plan 3 (moving at the right time costs at most 1 point against never moving; moving early loses at least 3 points), and O3 as restated in tuning plan 1. No new stage targets.

## 3. A second boat

For Tiefgang (a second dive boat, as an asset outside the stages) and Leinen los (stage 5).

- The asset system (`docs/abroad-mechanics.md` section 4) allows **up to two units of one asset**, each with its own option: buy, lease or share. The second is offered by an inbox message once the first is full in the peak (Tiefgang: turned-away divers on boat days; Leinen los: charters or cabins turned away in 3 of the last 8 peak weeks).
- Each boat has its own costs, breakdowns, haul-out and crew (Leinen los owners) or skipper (Tiefgang).
- **The founder can host only one cruise a week.** Leinen los's second boat needs a hired host, or sails without one at a review cost.
- Post-mortem: each boat's weeks used, revenue and costs.

## 4. A second location

One generic mechanic for stage 5 in Rückenwind, Tiefgang, Ausgesperrt, Fabriketage, Schweißperle and Griffig.

| Rule | Value |
|---|---|
| What it is | A second site with its own rent, one-off fit-out (est. 70 to 90% of the first site's), capacity and staff roster |
| Demand | New reach (est. +50 to 80% of the first site's market), minus cannibalisation of the first site's demand (est. 10 to 25%, hidden per run) |
| Reviews | Shared brand rating, weighted by bookings at each site |
| The founder | Works at one site per week (the player chooses). The other site runs on staff: a manager role is required, and quality is lower without the founder (est. reviews -0.2) |
| Opening | Takes the fit-out weeks; the first site runs as normal meanwhile |
| Giving it up | Notice as for stages; the fit-out is lost |
| What the player sees | Both sites' bookings, load and costs, side by side; which site the founder is at |
| Post-mortem | Each site's revenue and costs; what the second site added after cannibalisation |

Lesson: a second site doubles the fixed costs and halves the founder. It pays only when the first site is full and runs without you.

## 5. Rückenwind's fleet

From the backlog, because they use the same asset system:

- **The rescue boat can be bought** (18,000, est.) instead of leased in season.
- **Gear as a fleet:** boards, rigs, wings and kites bought in sets, each set with a lifetime in uses (est. two seasons). Worn sets review lower and break more; replacement is a choice.

## 6. Targets for plan 6

Keep targets few and player-facing:

| # | Target |
|---|---|
| P1 | Price is a lever: in each bookings scenario, an off-peak discount brings visibly more requests (shown in the post-mortem), pays in some runs and loses in others |
| P2 | T7 (seasonal pricing pays, 2 to 10 points) in every bookings scenario |
| S1 | A second location pays in some runs and not in others; opening it in year 1 loses at least 3 points |
| B1 | A second boat pays only with enough filled weeks: it appears in some of the careful bot's wins, and always adding it loses at least 3 points |
| Playability | In every scenario: careful bot 25 to 45%, no strategy over 60% (hard stop outside 15 to 55% or over 70%) |
| Existing | O1, O2 and E1 in each scenario with new stages |

Every other target is measured and reported but **not tuned** in this plan. A target that moves by more than its margin in the wrong direction is listed for Henry, not chased.
