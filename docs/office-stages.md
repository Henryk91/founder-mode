# Office stages 3 to 5: spec

Source of truth for the new office stages. Stages 1 and 2 exist in every scenario and stay as they are. Drawings: `docs/design/office-stages.html`. The established UI: `docs/design/established.md`; since the review after plan 3 it follows the company's growth, not a stage (section 6).

**All numbers are starting points.** Figures marked (est.) are estimates: check them against current sources for Munich and Bavaria and cite them, or keep the label. Tune against the targets in section 5.

## 1. Scope

- **Long mode only**: Kantino long, Gratwanderung, Hinterhof, Seeblick. The 60 week games (Kantino and Zollstock) do not change at all.
- Zollstock has no long mode, so it gets no new stages.
- Stages are scenario content in YAML, like stages 1 and 2. Every number below is a content value.

## 2. How a stage works (all scenarios)

| Rule | Value |
|---|---|
| Offer | An inbox event, sent once the stage's condition holds (section 4). The text names the costs. Declining is free; the offer comes back after 12 weeks if the condition still holds |
| Accepting | One-off cost (fit-out, furniture, deposit) paid at once, rent from the next month end. Optional loan financing in scenarios with a bank (the bank's plan lists it as an item) |
| Moving in | Takes 2 to 4 weeks, during which the old stage still applies and the move costs the founder 4 h a week |
| Going back | "Give notice" on the Finance tab's Office card: 3 months' notice, rent until then, the deposit part comes back, the stage drops by one. The UI stage never goes back |
| Visible | The scene drawing, the stage name, "stage N of 5", rent, desks or capacity used, all on the Office card and in the Plan's Office section |
| Post-mortem | Each stage: when, what it cost in total, and what changed after it (guests, revenue, hires) |

### Desks (Kantino long)

Every person needs a desk, the founder included. No hire can start when all desks are used. The current long mode cap of four people at once stays the upper limit unless stage 5 raises it.

## 3. Stage effects per scenario

### 3.1 Kantino (long mode)

| Stage | Name | Desks | Rent per month | One-off | Effects |
|---|---|---|---|---|---|
| 1 | Kitchen table | 2 | 0 | 0 | as today |
| 2 | Coworking desk | 2 | as today | as today | as today |
| 3 | Small office in a back courtyard | 4 | 1,500 (est.) | 6,000 (deposit and furniture, est.) | Energy +1 a week; demos may be held in the office (demo to trial a little better, around +5%) |
| 4 | Office floor | 6 | 3,800 (est.) | 15,000 (est.) | Energy +2; demo to trial around +10%; a hire search takes one week less |
| 5 | Front desk and a proper meeting room | 10 | 7,500 (est.) | 25,000 (est.) | Hire cap raised from 4 to 8 people at once; the highest paying segment converts around +10% better (visiting firms trust what they see) |

Lesson: space is a fixed cost that buys capacity. Moving up before the team or the customers need it burns runway.

### 3.2 Gratwanderung

| Stage | Name | Rent | One-off | Effects |
|---|---|---|---|---|
| 1 | Van and garage | as today | | as today |
| 2 | Base in town | as today | as today | as today |
| 3 | Gear store and meeting point | 1,400 (est.) | 8,000 (est.) | Gear sets for 12 more people; tourist walk-ins around +30%; vouchers sell from the shop; product prep hours a third lower |
| 4 | Guiding centre with changing rooms | 3,200 (est.) | 25,000 (est.) | Counts as the bad weather alternative for team events; canyoning capacity +50%; room for permanent guides beyond two |
| 5 | A second base in the next valley | 1,800 (est.) | 15,000 (est.) | Tourist reach around +40% (a second valley's guests); snowshoe demand up in winter; needs a permanent guide stationed there, or it closes that week |

Lesson: a base helps only the segment it serves. A guiding centre is wasted on a company whose real market is school groups bussed in for a day.

### 3.3 Hinterhof

| Stage | Name | Rent change | One-off | Effects |
|---|---|---|---|---|
| 1 | Inherited dining room | as today | | as today |
| 2 | Own fit-out | as today | as today | as today |
| 3 | A bigger kitchen | 0 | 35,000 (est., loan likely) | Covers per kitchen shift around +40%; waste from prep a quarter lower |
| 4 | The shop next door, knocked through | +2,800 (est.) | 45,000 (est.) | Seats from 40 to 70; a private table for parties and office events (group bookings for evening locals and office lunch) |
| 5 | Deli and catering kitchen across the street | 2,200 (est.) | 30,000 (est.) | Catering capacity doubled; a takeaway lunch counter (office lunch revenue without seats); needs a cook on every lunch shift |

Lesson: a full restaurant on Friday does not mean you need more seats. Expansion pays only where the bottleneck is.

### 3.4 Seeblick

| Stage | Name | Rent change | One-off | Effects |
|---|---|---|---|---|
| 1 | Tired guesthouse | as today | | as today |
| 2 | Refreshed house | as today | as today | as today |
| 3 | An annex with four more rooms | +900 (est.) | 120,000 (est., loan needed) | Rooms from 12 to 16; building takes 12 weeks, no rooms lost meanwhile |
| 4 | A garden pavilion and a proper reception | 0 | 40,000 (est.) | Weddings and groups convert better (around +20%), reception takes 5 h a week off the founder |
| 5 | A second house in the village | 4,000 (est.) | 30,000 (est.) | Eight more rooms, no lake view (leisure couples pay around 15% less there); needs its own housekeeping |

Lesson: more rooms help only when the house is full at a good rate. An annex on a half-empty house is a loan paid by nobody.

## 4. When each stage is offered

| Stage | Kantino long | Tourism scenarios |
|---|---|---|
| 3 | One hire or more, or revenue covering all costs for two months | Revenue covering all costs for two months, or bookings turned away in 3 of the last 8 weeks |
| 4 | All desks used, or three profitable months | Stage 3 for at least 12 weeks, and guests turned away or groups declined for lack of space in 3 of the last 8 weeks |
| 5 | Stage 4 for at least 12 weeks, and a funding round closed or four people on the team | Stage 4 for at least 16 weeks, and either occupancy above 80% (hotel), covers turned away (restaurant), or tourists turned away (outdoor) in peak weeks |

Conditions use only facts the player can see. The offer's text states the condition it reacts to ("Your desks are full and Lena has a cousin who needs one too.").

## 5. Targets (judged on 10,000 seeds where the effect is small, 1,000 otherwise)

| # | Target |
|---|---|
| O1 | Moving at the right time costs little: the careful bot with stage rules loses at most 1 point against a "never move" bot, in each long mode scenario (restated, see below) |
| O2 | Moving early loses: a bot that accepts every offer at once loses to the careful bot by at least 3 points, in each scenario |
| O3 | No stage is always right: among the careful bot's winning runs, each of stages 3 to 5 is taken in some and declined in others (taken in at most 90% of winning runs where it was offered) |
| O4 | Costs are visible: the offer text names the one-off cost, the rent and the effect; the post-mortem names what each stage cost and what changed after it (a test checks both) |
| O5 | All existing targets of each long mode scenario still pass, or stay open issues no worse than before this work |

**O1 restated (after plan 3).** The first wording was "moving at the right time pays: the careful bot beats never moving by at least 2 points". Two-year runs cannot pay back a fixed-cost move: the careful bot moves only in runs it is already winning, a move costs money there, and even half the one-offs and two thirds of the rents left the difference between -1.0 and +0.1 points (`docs/decisions.md`, plan 3 step 4). The old wording rewarded something the game cannot deliver. O1 now asks that moving at the right time costs at most 1 point; O2 (moving early loses) stays, and the post-mortem says plainly what each move cost and what changed after it.

## 6. The established UI stage

After the review of plan 3, the established look comes once money coming in has covered all costs, the founder's living costs included, for a number of months in a row, or when a move into office stage 4 completes, or (Kantino long) once a funding round has closed (`establishedAt` in the scenario). It never goes back, and a results line marks the switch. A first version also asked for three people at the company; the game teaches that hiring seldom pays, so successful players rarely had three, and it was dropped.

| # | Target |
|---|---|
| E1 | The established look marks a company that has made it: the careful bot reaches it in at least 40% of its winning runs, in clearly fewer of its losing runs (the losing share plus its margin below the winning share less its margin), and its median week falls in year 2 (after week 52), in each long mode scenario |

**E1 restated.** The first wording asked for 40 to 80% of winning runs and a median week of 60 to 90. That band was a rough guess, not the intent: Hinterhof's high share (93.6%) comes almost entirely from winning runs (2.7% of its losing runs), which is exactly what the look should mean. The months are tuned per scenario between 4 and 8 and kept: Kantino long 8, Gratwanderung 7, Hinterhof 8, Seeblick 8 (`docs/decisions.md`, plan 3 review).
