# Scenario spec: small lakeside guesthouse (working name "Seeblick")

Source of truth for the third tourism scenario. Read `docs/AUTONOMOUS_PLAN.md` (sections 7 and 8), `docs/tourism-proposal.md`, `docs/scenario-outdoor.md` and `docs/scenario-restaurant.md` (including Part A, the bank loan) first. Anything not stated here works as in those scenarios. Where the engine design differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates and must be checked against current sources and cited, or kept and labelled as estimates. Tune everything against the targets.

"Seeblick" means lake view. Half the guesthouses in Bavaria are called that, which is the joke.

## 1. Premise

The player leases a tired family guesthouse with 12 rooms in a fictional village on a Bavarian lake, about an hour from Munich. The previous owners retired; the rooms are clean but from 1994. The player has worked in hotels but never run one. Three kinds of guests might fill the rooms. In each run only some of them come in numbers and pay enough.

### What this scenario teaches

1. **Occupancy and price pull against each other.** A full house at a low rate can earn less than three quarters full at a good rate. Revenue per available room is the number that matters.
2. **Booking platforms own the guest.** They fill rooms fast and take a large cut. Direct bookings take years to build.
3. **Renovation is a bet.** New rooms raise prices and reviews, cost a loan, and close rooms while the work is done.
4. **Seasons and weekends.** Summer and weekends fill themselves; November and weekdays decide the year.
5. **Big bookings carry big risk.** A wedding fills the house for three nights and can cancel.

## 2. Starting values

| Value | Start | Note |
|---|---|---|
| Mode | Long only, 104 weeks | Week 1 is the first week of November, the quietest month, so the player has a winter to prepare |
| Rooms | 12 doubles, all "tired" | Each room can be renovated separately |
| Company cash | 30,000 own money put in (est.) | |
| Personal savings | 14,250 | As elsewhere |
| Founder living costs | 675 per week, rising a tenth from week 53 | The founder lives in a small flat in the house; this is already counted |
| Lease | 5,500 a month (est., verify for a 12 room guesthouse on a Bavarian lake) | |
| Other fixed costs per month | Insurance 250, utilities 2,200 (est., higher in winter), accountant 300, property management system and channel manager 180 (est.), licences and fees 100 | |
| Bank loan | Available (Part A of the restaurant spec), for renovation and the first winter | |

## 3. Segments

| | Leisure couples | Business and project guests | Groups and weddings |
|---|---|---|---|
| Id | `leisure` | `business` | `groups` |
| Description shown | Couples and friends on a weekend or holiday by the lake | Fitters, consultants and project staff working at firms in the area | Weddings, family celebrations, clubs and company retreats booking the whole house |
| Booking unit | Room nights, 1 to 7 nights | Room nights, often Monday to Friday, sometimes weeks | The whole house for 2 to 4 nights |
| Room nights per week at peak (reachable) | 30 to 90 | 15 to 60 | 0.1 to 0.6 whole-house bookings a week |
| Willingness to pay per room night | 110 to 190 (est.) | 75 to 115 (est.) | 1,200 to 2,200 per night for the house (est.) |
| Lead time | 1 to 60 days, short in summer | 1 to 21 days | 3 to 12 months |
| Season shape (hidden, roughly) | High June to September and on weekends all year, dead in November | Flat across the year, low in August and over Christmas | May to September, mostly Saturdays |
| Must haves | `breakfast`, `online_booking`, `renovated_rooms` (at least 4) | `invoice_billing`, `workspace`, `early_breakfast` | `event_room`, `catering_partner`, `whole_house_booking` |
| Channel response: booking platforms | high | medium | none |
| Channel response: own website | low, grows with reviews and repeat guests | low | medium |
| Channel response: partnerships | the tourism office: medium | local firms' office managers: high | wedding planners and venues: high |
| Channel response: phone and in person | low | medium | high |
| Cancellation tendency | Medium, high under a flexible policy | Low, but projects end early | Low, but one cancellation is a month's revenue |
| Invoices | Paid at stay | Firms: 30 days mean, 2% never pay | Deposit 30% at booking, balance before the event |

Roles viable, mediocre and trap shuffled per run. A polite trap segment: wedding planners who visit, admire the view, ask for a discount and book elsewhere; or business guests who love the quiet but whose firms cap rates below cost.

## 4. Products (the equivalent of features)

| Id | Name shown | Prep hours | One-off cost | Effect | Required by |
|---|---|---|---|---|---|
| `breakfast` | Breakfast buffet | 15, plus daily hours | ingredients per guest (est. 8 to 12) | Raises willingness to pay for leisure | leisure |
| `online_booking` | Booking engine on your website | 15 | system fee | Direct bookings possible | leisure |
| `renovated_rooms` | A renovated room | 10 per room to plan | 8,000 to 15,000 per room (est., verify); the room is closed for 3 weeks | Higher willingness to pay and reviews for that room | leisure (at least 4 rooms) |
| `invoice_billing` | Company rates and invoices | 10 | none | | business |
| `workspace` | Desks, fast internet, quiet rooms | 15 | 2,500 (est.) | | business |
| `early_breakfast` | Breakfast from 6 am | 5, plus staff hours | | | business |
| `event_room` | Turn the old breakfast room into an event room | 25 | 12,000 (est.) | Group events possible | groups |
| `catering_partner` | A catering partner for events | 15 | a cut per event | | groups |
| `whole_house_booking` | Whole house packages and contracts | 15 | none | Block bookings with deposit rules | groups |
| `wellness` | A small sauna and spa room | 40 | 60,000 to 90,000 (est.), usually needs a loan | Brochure appeal | nobody |

`wellness` is the temptation. Every guest survey mentions a sauna, every competitor advertises one, and it costs more than all twelve rooms' renovation. No segment requires it. It raises leisure willingness to pay a little, which makes it look sensible in the numbers it does not show: the loan payments.

Shipping a product has no bugs. A renovated room has a **snagging risk**: a small chance in its first weeks of a complaint (a dripping shower, a loose lamp) that costs a review point unless fixed.

## 5. Experiments

| Experiment | Version here | Signal |
|---|---|---|
| Interview | Talking to guests, office managers at local firms, wedding planners | Pain buckets, feature mentions, budget hints |
| Test rates | Listing some rooms at a test price on a platform for two weeks | Bookings by segment and price, mostly leisure |
| Open house | An afternoon for wedding planners and office managers. Costs a day and some cake | Interest from groups and business, honest remarks about the rooms |
| Pre-sale | Gift vouchers at Christmas, early booking discounts for summer | Cash in winter, evidence of leisure demand |

## 6. Channels and bookings

| Channel | Cost | Effect |
|---|---|---|
| Booking platforms | 15 to 18% commission per booking (est., verify) | Fast reach for leisure, some business. Ranking rises with reviews and availability |
| Own website and booking engine | Founder hours, some ads, a small fee per booking | No commission, slow, grows with repeat guests and reviews |
| Partnerships | Founder hours, sometimes a small cut | Local firms send business guests, planners send groups, the tourism office sends leisure |
| Phone and in person | Founder hours | Groups and business |

**Cancellation policy** (player decision): flexible or non-refundable rates, or both side by side with a price gap. **Deposit policy** for groups. Neither policy is always right.

**Minimum stay** (player decision): one night or two on summer weekends. Two nights fill fewer weekends but avoid empty Sundays.

## 7. Staff

| Role | Pay (est., verify against current German rules) |
|---|---|
| Housekeeping | Minimum wage or slightly above, part time or minijobs, scheduled by occupied rooms |
| Breakfast help | Minijob |
| Front desk help | Part time; otherwise the founder covers reception, which costs founder hours every day |
| Caretaker | Hourly, for repairs and snagging |

Use the current German minimum wage and minijob limit, cited. Housekeeping must match occupied rooms: rooms not cleaned cannot be sold the next night, and rushed cleaning costs reviews.

## 8. Seasons and weather

- Season shapes as in section 3, hidden in exact form. Signals: forward bookings, last year's occupancy in year 2, the tourism office's statistics newsletter, local events (a regatta, a Christmas market).
- Weather moves short-lead leisure bookings: a sunny weekend forecast fills rooms, a wet one empties them.
- Winter heating raises utilities in December to February.

## 9. Pricing

Room rates per season and per weekday or weekend, with the smooth price curve and "Too expensive" reasons. Business rates are agreed per firm and fixed for months. Group rates per package. The post-mortem shows occupancy, average rate and revenue per available room by month, next to what each segment would have paid.

## 10. Reviews

A public rating out of 5, driven by: room state (tired or renovated), cleanliness (housekeeping against occupancy), breakfast, the founder's energy at reception, snagging, value for money. Reviews raise platform ranking and direct bookings, and feed word of mouth.

## 11. Stages

| Stage | Trigger | Effect |
|---|---|---|
| Tired guesthouse | Start | Leisure willingness to pay capped while fewer than 4 rooms are renovated |
| Refreshed house | When at least 8 rooms are renovated and the facade is painted (an inbox offer after month 6, a cost of about 20,000, est.) | Lifts the cap, improves platform ranking. A poor investment if leisure is the trap |

Scene drawings: a white house with wooden balconies and faded shutters by a grey lake in November, then the same house with fresh paint, flower boxes and a few boats on a summer lake.

## 12. Content

| Type | Target |
|---|---|
| Intro cards | 4. Card 2 the house and the village, card 3 the three kinds of guests and that an empty room tonight is gone forever |
| Scenario events | At least 40, using situational events |
| Interview quotes | At least 10 per bucket per segment |
| Names | Invented guests, firms, planners and villagers. No real firms or hotels |

Event ideas:

| Idea | Tension |
|---|---|
| A platform offers a "preferred partner" badge for 3% more commission | Ranking against margin |
| A wedding party cancels four months out and wants the deposit back | The contract says no, the reviews might say otherwise |
| The heating fails in January with 9 rooms booked | Emergency repair, refunds, or blankets and an apology |
| A local firm wants 6 rooms for 8 weeks at a fixed low rate | Guaranteed occupancy against summer weekends |
| A guest leaves a review about the 1994 bathroom | Renovate, reply, or ignore |
| The housekeeper quits in July | Clean yourself, pay an agency, or close rooms |
| The village plans a summer festival on your best weekend | Raise rates, set a minimum stay, or both |
| A travel blogger asks for two free nights | Reach against two room nights |
| The tourism office asks you to join a package with the boat company | A partnership at a commission |
| The owner of the building wants to raise the lease | Negotiate, accept, or look at leaving |
| A guest books 12 rooms for one night through a platform, then cancels free | Policies matter |
| November: 2 of 12 rooms booked all week | Close some rooms, discount, or market to business guests |

## 13. Rough expectation (by hand, not simulated)

The first winter is quiet and expensive, which is the time to test, renovate a few rooms and build partnerships. A player who reads the segments, renovates only as far as their guests need, and balances platforms with direct bookings enters the second summer with a better rate and better reviews. A player who takes a big loan for wellness and renovation before knowing who comes faces the second November with loan payments and empty rooms.

This is a back of the envelope expectation. The bot report is the real answer.

## 14. Sources and values as built (step 7)

Checked figures:

- Booking platforms: about 11 to 15% commission in Germany, depending on place (2025 reports quoting the largest platform's European management; secondary FAQ sites). Content: 15%.
- Bathroom renovation: 3,600 to 10,500 EUR for 3 square metres (aroundhome.de, immoportal.com); a room with paint, floors and furniture about 10,000 (estimate).
- Minimum wage 13.90 EUR from January 2026; housekeeping and reception shifts priced with employer costs (estimates).
- Current listings checked again 14 October 2026. An 11-room renovated hotel in Lam is offered for lease but the rent is on request ([ImmobilienScout24](https://www.immobilienscout24.de/expose/171278462)); the comparable lakeside results are sales or development sites rather than leases. No priced, comparable twelve-room lakeside lease was found, so lease and utilities remain labelled estimates.

Changed from this spec while tuning (reasons in `docs/decisions.md`, step 7): lease 4,800 and utilities 1,800 a month; leisure 25 to 75 and project guests 12 to 50 room nights at peak; groups about one whole-house booking a week at peak, booked 8 to 30 weeks ahead, with a 30% deposit; couples use about a third of the rooms outside the summer (weekends); renovation in one block of four rooms; no minimum stay. A run is won when its last 13 months together cover every cost, loan repayments included.

## 15. What changed in plan 2, and why

Reasons in `docs/decisions.md`, plan 2 steps 1 to 4 and the plan 2 audit.

- **Experiments (5):** test rates (some rooms on the platform for two weeks, mostly leisure) and an open house (an afternoon for wedding planners and office managers) replace the landing tests and pre-sales. Gift vouchers sell to leisure guests and are owed until redeemed.
- **Renovation room by room:** 10,000 EUR a room, each closed for three weeks, at most three at once, instead of one block of four rooms. The bank can finance rooms.
- **Minimum stay:** two nights on summer weekends (June to September) for leisure guests: fewer bookings, but no empty Sundays.
- **Staff contracts:** permanent, part time and seasonal contracts for housekeeping and reception.
- **The bank lends against a plan:** workspace, event room, the wellness area (the temptation) and rooms, plus at most three months of working capital, and says how many months a guesthouse that opens in November should bridge (six). Guests take 0.15 h a room night of the founder's week, up to 15 h.
- **Demand and terms:** leisure 16 to 48 room nights a week at peak, groups 34 to 60, project guests 15 to 52; a group cancels with 12% (was 8%), so a strict policy can protect the house; from the plan 2 audit, laundry, amenities and breakfast cost 25 EUR a room night (was 30, est.).
- **Events:** the wedding planner and the wedding fair send couples only once there is an event room, and the plant's office manager sends fitters only once you can invoice them, as their texts say.

## 16. What changed in plan 3, and why

Reasons in `docs/decisions.md`, plan 3 steps 1, 2 and 4; the stages in `docs/office-stages.md`.

- **Office stages 3 to 5:** an annex with four more rooms (120,000 EUR, 900 a month for its share of the lease and heating, twelve weeks of building with the old rooms open), a garden pavilion and a proper reception (40,000; weddings and groups book more readily, the reception takes 5 h a week off the founder) and a second house in the village (4,900 a month, 30,000; eight more rooms without a lake view and their own housekeeping shifts). Stage 3 is offered once the money has covered two months or guests were turned away for lack of room in 3 of the last 8 weeks; stage 4 when they keep being turned away; stage 5 when they are turned away at the peak. Estimates.
- **Bots:** a careful guesthouse moves only when guests are turned away and a year's surplus carries twice the added rent.
- **Open:** the annex is a large debt for a few peak weekends; moves come in runs already won and cost money there (T19 and T21, O3; O1 restated after review: moving costs at most 1 point).
- **The established look:** once money coming in has covered all costs, the founder's living costs included, for eight months in a row, or on moving into stage 4 (target E1).
