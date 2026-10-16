# Leisure scenarios: shared mechanics

Source of truth for the engine additions used by the four leisure scenarios in Munich:

| Scenario | Spec | Business |
|---|---|---|
| Ausgesperrt | `docs/scenario-escape-room.md` | Escape room |
| Fabriketage | `docs/scenario-event-venue.md` | Event venue |
| Schweißperle | `docs/scenario-fitness.md` | Boutique fitness studio |
| Griffig | `docs/scenario-climbing.md` | Climbing gym |

All four run on the bookings engine (`docs/tourism-proposal.md`), long mode only, with the bank loan, staff contracts, reviews, trials and office stages as built.

Plan 4's additions (`docs/abroad-mechanics.md`) are assumed done: courses and progression, assets, licences and concessions, cost steps. Where the engine as built differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

## 1. Principles

- **Additive and switched by content.** Every addition is off unless a scenario's YAML has the block. Every earlier scenario plays exactly as before, the abroad ones included.
- Deterministic, `PlayerView` only, no hidden values on screen, money in cents, time in hours.
- **No weather.** These are indoor businesses. Seasons still apply: January resolutions, the summer dip in indoor sport, the autumn event season.

## 2. Time of day and crowding

A gym is full at 6 pm and empty at 2 pm. Selling more memberships than the evenings can hold is the classic mistake.

### 2.1 Slots

| Field | Meaning |
|---|---|
| `slots` | Named parts of the week with their hours, for example weekday morning, weekday midday, weekday evening, weekend |
| Segment `slotShare` | How a segment's visits or bookings spread over the slots (hidden; roughly shown through what members say and what the booking screen shows) |
| Product capacity per slot | Places, classes, rooms or the hall, per slot |

### 2.2 Hard and soft capacity

- **Hard capacity** (an escape room game, a class place, an event date): a booking beyond it is turned away. The turned-away count is shown.
- **Soft capacity** (a climbing hall): above the comfortable number, visitors still come. But each visit's quality falls with crowding, up to a hard limit (safety, fire rules). Crowding lowers reviews and raises members' churn.
- The player sees load per slot as "quiet", "busy" or "packed", plus the turned-away count. The exact comfort numbers are hidden. Members' remarks name the packed slots ("Tuesday evenings are a queue with walls").

### 2.3 Lesson

Capacity is sold by the hour, not by the month. Off-peak needs its own customers and its own price.

## 3. Memberships

### 3.1 Contract types

| Type | Price | Terms |
|---|---|---|
| Monthly membership | List price per month | Cancel with notice (4 weeks, est.) |
| 12-month membership | Lower monthly price (est. 15 to 20% less) | Fixed for 12 months, then monthly |
| Off-peak membership | Lower price, only in the slots the player names | |
| Class pack or 10-visit card | Per visit, prepaid, valid 6 months | Unused visits expire: owed until used, as vouchers |
| Drop-in or day ticket | Per visit | |
| Intro offer | A low price for the first 2 to 4 weeks | Converts to a membership with a hidden chance |

Each type is a product the player switches on and prices. Some segments need some types (spec tables).

### 3.2 Members over time

- **Joining:** members join from the channels, as bookings do now. Two hidden peaks: January (resolutions) and September (back from holiday).
- **Usage:** each member visits some times a week with a segment's distribution, spread over slots by `slotShare`. Usage fills capacity.
- **Churn** per week rises with:
  - crowding in the member's usual slots;
  - low freshness (section 5);
  - a lost favourite instructor (event);
  - the price against willingness to pay;
  - and for January joiners, a planned fade (most resolutions end by March).

  12-month members cannot churn before their term ends. They stop visiting instead, which frees capacity but sours reviews.
- **Shown:** members by type, joins and cancellations this month, visits per slot.

### 3.3 Lesson

Monthly revenue is members times price. But the members you keep matter more than the members you sign.

## 4. The aggregator

A fictional sports flat-rate platform ("Sportflat"; check the name is not a real brand) whose users visit many studios for one monthly fee. It pays the studio per check-in (est. 8 to 15 EUR, unknown and hidden per run within a range).

| Rule | Value |
|---|---|
| Joining | Free; the player can leave with 3 months' notice |
| Slots | The player chooses which slots aggregator users may book (all, or off-peak only) |
| Visits per user | Capped per month by the platform (est. 4 at one studio) |
| Demand | A large pool of users, strongest with students and young professionals |
| Cannibalisation | Some people who would have joined as members use the aggregator instead (hidden share per segment, est. 0.1 to 0.4) |
| Corporate | Companies may buy the aggregator for their staff instead of a corporate plan with you |

The player sees check-ins per slot, the payout, and how many of last month's cancellations said they "moved to Sportflat".

**Lesson:** the platform fills empty slots and empties full memberships. Open it where you have room, not where you have members.

## 5. Freshness

Some products lose appeal as the same people use them. They need refreshing.

| Field | Meaning |
|---|---|
| `freshness` | 0 to 100 per product, falling with use (escape rooms: with each local group that played; climbing walls: with weeks since routes were reset) |
| Effect | Lower freshness lowers demand from segments that care (locals for escape rooms, committed climbers for walls) and raises churn |
| Refresh | Escape room: build a new room or rebuild a theme (money and weeks, the room closed). Climbing: route setting hours per wall section per week |
| Shown | A product's state in words ("new", "known", "tired") and, for escape rooms, how many local groups have played it. Never the number |

For escape rooms, the pool of local groups who would ever play a theme is finite per run (hidden). Tourists are a new pool every week, and companies come back slowly.

**Lesson:** a product has a life. Plan the next one before the current one fades.

## 6. Date holds (event venue)

| Rule | Value |
|---|---|
| Hold | A client asks to hold a date (an option) for 2 to 4 weeks while they decide. A held date cannot be sold to anyone else |
| Policy | The player sets: grant holds freely, grant only with a small hold fee (est. 500, counted against the price if they book), or no holds |
| Outcome | A hold turns into a booking with a hidden chance per segment, or is released, sometimes too late to resell the date |
| Deposits and cancellation | As in Seeblick, with terms per segment |

Shown: the calendar with held, booked and free dates, and the hold policy.

**Lesson:** a held date is unsold stock. Flexibility wins clients; too much of it loses Saturdays.

## 7. Build-out with closed areas

For the climbing gym and the escape room. Large parts of the business are built in stages.

- A **build-out product** costs money, takes weeks to build, and closes the affected area while it is built. A new wall section closes nothing; rebuilding a room closes that room.
- A **start choice** may let the player pick which parts to build before opening (the climbing gym's walls). The business opens when the first build-out finishes.
- Targets measured "from opening" use the opening week, not week 1.

## 8. Category and labels

- Add `leisure` to `packages/content/src/categories.yaml`: name "Leisure", order 3. All four scenarios use it, each with two or three tags.
- Labels for `scrappy`, `organised` and `established` in each scenario. Leisure wording: "Members" instead of "Customers", "Timetable" for classes, "Calendar" for the venue, "Rooms" for the escape room, "Walls" for the climbing gym.

## 9. View and post-mortem

New view fields:

- load per slot;
- members by type with joins and cancellations;
- aggregator check-ins and payout;
- freshness words;
- the hold calendar;
- build-out progress.

Post-mortem lines:

- the slots that were packed and empty;
- members kept against members signed;
- what the aggregator paid against the cancellations it caused;
- each room's or wall's life;
- holds granted, converted and lost.

## 10. Bots

`tourism_careful` keeps its behaviour in every earlier scenario. For the new mechanics, it learns to:

- price off-peak separately;
- open the aggregator in off-peak slots only when those slots are quiet;
- refresh before freshness turns "tired";
- set the hold policy from how often holds convert.

Single-choice variants for each spec's targets.
