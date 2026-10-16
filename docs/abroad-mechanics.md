# Abroad scenarios: shared mechanics

Source of truth for the engine additions used by the three abroad scenarios:

| Scenario | Spec | Place |
|---|---|---|
| Rückenwind (watersports centre) | `docs/scenario-watersports.md` | Mallorca, Bay of Alcúdia |
| Tiefgang (dive centre) | `docs/scenario-dive.md` | Cyprus, Larnaca |
| Leinen los (gulet cruises) | `docs/scenario-gulet.md` | Fethiye, Turkey |

Read `docs/tourism-proposal.md`, `docs/scenario-outdoor.md` and `docs/scenario-hotel.md` first. The bookings engine, seasons, weather, rosters, staff contracts, reviews, trials, vouchers, the bank loan and office stages are assumed. This file only adds what those scenarios need on top.

Where the engine as built differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

## 1. Principles

- **Additive and switched by content.** Every addition is off unless a scenario's YAML has the block. Kantino, Zollstock, Kantino long, Gratwanderung, Hinterhof and Seeblick must play exactly as before: same results on the same seeds.
- **Deterministic and view only**, as everywhere: the PRNG in state, `PlayerView` for the UI, no hidden values on screen.
- **No currency system.** All three scenarios price and pay everything in EUR. In Turkey this is a simplification: many gulet operators quote foreign guests in euros, but local costs are really paid in lira. The spec models the effect (local costs rising in year 2) instead of exchange rates. Say so in the scenario's help text.
- **Metric and Beaufort.** Wind is shown in Beaufort force with a word ("4 Bft, good wind"), never knots. Water temperature in °C.

## 2. Day conditions (wind and sea)

The existing weather is one state per week. Water businesses live by the day and by the half day: a calm morning and a windy afternoon are two different businesses on one beach.

### 2.1 Model

| Field | Meaning |
|---|---|
| `states` | Ordered list of condition states with an id and a name shown, for example calm, light wind, good wind, strong wind, storm |
| `slotsPerDay` | 1 or 2. With 2, each day has a morning and an afternoon slot, each with its own monthly probabilities |
| `monthly` | For each month and slot: the probability of each state |
| `persistence` | Chance that a day repeats the previous day's state in that slot (wind comes in spells, not coin flips) |
| `forecast` | Shown before the week: the count of slots per state ("Afternoons: 3 good wind, 2 strong, 2 light"). Each slot's forecast is right with `accuracy`; wrong ones shift by one state |

A scenario has either the old `weather` block or a `conditions` block, never both.

### 2.2 Products and conditions

- Each product lists the states it can run in (`runsIn`) and, optionally, the slot (`slots: [morning]`).
- Weekly capacity is the per-slot capacity times the number of suitable slots in the week, as staff allow.
- Bookings for a slot that turns out unsuitable are **moved** to a suitable slot in the same week if there is room. Otherwise they are cancelled: a flexible policy refunds, a strict policy gives a voucher for a later week.
- A product may name an **alternative** (as Gratwanderung's bad weather plan does): a guest whose slot was cancelled is offered it instead. Guests who got an alternative do not review lower for the cancellation.
- Products that sell a whole week (a gulet cruise) never cancel for conditions. Instead, each slot in a bad state lowers that week's review quality, unless a product named as `shelter` softens it.

### 2.3 What the player sees

- On the plan: a strip for the coming week, with the forecast counts per state and a small label per product line: "Runs on 5 of 7 afternoons".
- In the results: the actual days, the bookings moved, and the cancellations with their reason ("Tuesday afternoon: 7 Bft, catamaran course moved to Thursday").
- In the post-mortem: slots per state per month, and the bookings each product lost to conditions.

### 2.4 Lesson

A mix of products that run in different conditions earns on more days. The best-paid product often runs on the fewest days.

## 3. Courses and progression

Watersports and diving sell a ladder: a beginner course leads to hire or a next course, during the same holiday or on a later visit.

### 3.1 Model

| Field | Meaning |
|---|---|
| `course.slots` | Slots a course place takes in its week (a four-morning course takes 4 morning slots of an instructor's group) |
| `course.level` | The level a graduate reaches, for example `windsurf_basic`, `open_water`, `advanced` |
| `requires` | On any product: the level a guest needs to book it. A guest without it is turned away or offered the course |
| `progression.sameStay` | Share of graduates who book a listed next product the next week (they are still on holiday) |
| `progression.nextSeason` | Share of graduates who come back the next season and book a next product. Only through the own website, email or walk-in, never through the platform: the platform owns the guest |
| `progression.decayWeeks` | How fast the same-stay pool empties |

Graduates are a pool per segment and level, kept in hidden state with week and channel. The player sees the counts ("31 students finished a course this season, 6 came back for more").

### 3.2 Lesson

Courses earn less per hour than hire. But they make next season's customers, and only if those customers booked you directly.

## 4. Assets with three ways to get them

The dive boat, the gulet and the watersports rescue boat are assets that provide capacity. The gulet and the dive boat come with a real choice of how to get them.

### 4.1 Options

| Option | Costs | Capacity | Risks |
|---|---|---|---|
| **Buy** | Price paid at once or through the bank (a loan item). Maintenance per month, insurance per year, a winter haul-out (weeks and cost), mooring | Full, every week | Breakdowns: a weekly chance that rises with age and use, closing the asset's products for 1 to 3 weeks unless repaired at a cost (an inbox decision). Resale value at the end of the run |
| **Lease** | A fee per month or per season, paid whether the asset is used or not. A minimum term | Full, in the leased months | The owner repairs breakdowns. Ending early costs the remaining fee or a penalty |
| **Share** (seats, a revenue share, or managing an owner's asset) | A fee per unit used, or a share of the revenue | Limited: a set number of units, and the owner can take units back at peak times with a chance per week | Little: no fixed cost. But peak weeks may not be yours, and margins are thin |

- The choice is made through an inbox message with the three options. Each option states its costs and limits.
- Switching is possible at the end of a season (a winter offer event), with the notice terms of the current option.
- Owning in Turkey needs a local company: a one-off fee and a waiting time before the purchase completes. The bank lends only once the company exists.

### 4.2 Money and the ending

- The win condition stays as in every tourism scenario: the last 13 months together cover every cost, loan repayments included.
- An owned asset is not depreciated as a weekly cost. The post-mortem shows its value at the start and at the end, the loan left, and what a sale would have brought. The run summary may show "net of the boat".
- A breakdown message states the repair cost, the weeks lost, and the bookings at stake.

### 4.3 Lesson

Owning has the best margin and the worst risk. Sharing has no risk and the thinnest margin. Which is right depends on how many weeks you can fill, and you should know that before you sign.

## 5. Day trips

Used for the kite trips in Rückenwind (spec section 4.3).

| Field | Meaning |
|---|---|
| `dayTrip.travelHours` | Hours there and back. The instructor's whole day (both slots) is used, whatever the lesson length |
| `dayTrip.asset` | The asset needed (the van). One trip per asset per day |
| `dayTrip.runsIn` | States at the trip's spot, which can differ from the home beach (a separate monthly table, or the home table shifted one state up) |
| `dayTrip.minGroup` | The smallest group the player is willing to take |
| Trip policy | Player setting: run on forecast suitable days "with at least N booked" (N from 1 to the trip's capacity), or "never". Changed at most every 2 weeks |

- The trip is decided on the forecast. A wrong forecast means a wasted day: fuel and the instructor's pay are spent, and the guests are moved or refunded.
- On strong wind days the home beach also wants its best instructors (wind regulars and wing courses). The roster decides who goes. This conflict is the point of the mechanic.

## 6. Licences, permits and concessions

- A **licence** is a product with a fee, prep hours and a waiting time (`waitWeeks`) before it counts as shipped. Products that require it cannot be sold until then. Examples: the dive centre's licence, the Turkish company for owning a gulet.
- A **concession** is a fixed cost with a term. In year 2 a **tender event** offers choices: bid higher and keep the spot; bid as before with a chance of losing it; or move to a worse spot (fewer walk-ins, a lower stage). The chance is hidden; the message says how many others are bidding.

How these work in each country is my understanding, not checked. Each spec says which parts need verifying.

## 7. Abroad framing

- **Category and tags.** `category: tourism` and the tag `Abroad` in `about.yaml`, plus one or two more tags ("Wind", "Boats").
- **Premise.** In every intro: the founder moved from Munich. Their home network is a channel (clubs, friends, a German-speaking audience), and their German is an advantage with German-speaking guests.
- **Living costs** per scenario, rising a tenth in year 2 as elsewhere.
- **Local cost steps.** A new optional field: fixed costs, unit costs and role pay may each name steps (`steps: [{ week: 53, factor: 1.15 }]`). Used for Turkey's rising local costs. If the engine already has an equivalent, use it.
- **Season start.** All three runs start in winter (January or February), with several weeks to prepare before the first guests.

## 8. View, labels and post-mortem

- Every new field the player needs reaches the UI through `PlayerView` only: the forecast strip, condition labels per product, course and graduate counts, the asset card (option, costs, capacity, condition, next haul-out), trip policy, the tender message.
- Labels for `scrappy`, `organised` and `established` in each new scenario. Accent colours are in each spec. White text on each accent must reach 4.5:1: check, and adjust the shade if needed.
- Post-mortem lines: conditions per month and bookings lost to them, the course ladder (students, graduates, returners by channel), the asset (option, total cost, weeks used, breakdowns, value at the end), trips (run, wasted, guests), and the tender's outcome.

## 9. Bots

The existing tourism bots must keep their behaviour in the existing scenarios. For the new mechanics:

- `tourism_careful` learns to: offer products for the forecast; run courses and push graduates to the own website; choose an asset option from evidence (the units it expects to fill); set the trip policy from the bookings and forecast; bid in the tender when the spot carries the business.
- Single-choice variants for the targets: one bot per asset option (`always_buy`, `always_lease`, `always_share`), trip policy extremes (`trips_always`, `trips_never`), and product mix extremes per spec.
- A bot that plays the new mechanics badly must lose for a reason the post-mortem can explain.
