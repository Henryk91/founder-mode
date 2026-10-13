# Tourism engine proposal (step 4 of the autonomous plan)

Design for a second business model next to subscriptions: **bookings of capacity that expires**. It serves the three tourism specs (`docs/scenario-outdoor.md`, `docs/scenario-restaurant.md`, `docs/scenario-hotel.md`). Decided in the autonomous run under `docs/AUTONOMOUS_PLAN.md` section 2; choices a reasonable person could make differently are logged in `docs/decisions.md` ("Step 4") with the heading AUTONOMOUS.

Every number below is a starting value for the bots to measure. Formulas are written once here and referenced by the engine's comments.

## 1. Principles

1. **One engine, two models.** A scenario with a `bookings` block plays the bookings model; without it, the subscription model plays exactly as before. The Kantino and Zollstock fingerprints stay locked and their games identical (proven at the end of the step).
2. **Reuse before inventing.** The hidden demand core (segments, roles, pain, politeness, willingness to pay, must haves), interviews and budget hints, landing tests (here: test listings), pre-sales (here: vouchers and pilot days), the smooth price curve and its "Too expensive" reasons, invoices for business customers, the inbox with situational events, the freelancer idea, funding, energy and endings all carry over. Features become **products**; bugs become **snags** (teething trouble that costs reviews instead of customers).
3. **The player sees bookings, not demand.** Requests, conversion and season curves are hidden. The calendar of bookings ahead, last year's numbers in year 2, the forecast, reviews and honest noisy hints are the signals.
4. **Weekly turns stay.** A booking is for a week, not a day. A week's capacity is the sum of its services; within a week the engine does not model days. Weekend and weekday differences enter as each segment's share of a week, not as separate days.

## 2. Calendar and seasons

- `bookings.startWeekOfYear`: week 1 of a run is this week of the year (outdoor 10, early March; restaurant 1; hotel 44, early November). `weekOfYear(w) = ((start - 1 + w - 1) mod 52) + 1`. Runs are 104 weeks (long mode only).
- **Season curve** per segment: twelve monthly multipliers in YAML (the spec's rough shape), interpolated by week. Hidden per run: each month's value times a draw in `[1 - seasonNoise, 1 + seasonNoise]` (start 0.2), so the shape is known roughly and its details are not. The post-mortem draws each segment's real curve.
- Signals: the calendar (bookings come in ahead of the season, more for segments with long lead times), year 2's "this week last year" figures on the calendar, situational events (the tourism office newsletter, hotel partners' remarks), and interview remarks.

## 3. Weather (outdoor and the restaurant's courtyard; hotel leisure bookings)

- Four states: good, mixed, bad, dangerous. Monthly probabilities in YAML; one draw per week.
- **Forecast**: next week's state is shown, right with probability 0.8, else a neighbouring state.
- Effects (per segment and product, YAML): a demand factor for short lead bookings made in the week before (good 1.15, mixed 1, bad 0.7, dangerous 0.5); a cancellation factor for bookings that week; products marked `weatherClosed` (canyoning, via ferrata, the courtyard) cannot run on dangerous weeks (bookings cancelled by the company, refunded) unless an `alternative` product is shipped (the climbing hall partnership), which runs them indoors at its own cost.

## 4. Products, capacity and the roster

- A **product** is a feature with extra fields: `prepHours` (the build hours), `oneOffCents`, `monthlyCents`, `unitCostCents` (per guest or cover: food, hall fee, transfer), `capacity` (units per week it can sell when staffed: seats times seatings, rooms times nights, groups times days), `seasonMonths`, `weatherClosed`, `snags` (teething trouble at launch, like bugs), and `serves` (segments it sells to). A segment buys a product whose `serves` lists it, once its must haves have shipped (fit, section 5).
- **Staff roles** per scenario (guide, hiking leader; cook, service, kitchen help; housekeeping, front desk, breakfast help): pay per shift, units per shift for the products they staff, and availability per week (scarce in peak for freelance guides). The founder can take shifts in roles they qualify for; each founder shift costs `shiftHours` of the founder's week.
- **The roster** is part of the weekly plan: shifts per role this week. A product's capacity this week = min(its capacity, units its staffed shifts cover). Staff are paid for every shift planned. **Capacity that is not sold by the end of the week is gone.**
- **Understaffing**: bookings beyond this week's staffed capacity are cancelled by the company (refunded, a review hit). **Overstaffing**: shifts paid with no guests. The staffing ratio (staffed units over booked units) also enters service quality (section 8).
- **Permanent staff** (the multi-hire system) is deferred: every role is rostered per shift (freelance days, minijobs, seasonal part timers). AUTONOMOUS: shifts cover all three specs' staff and keep one system; a salaried cook or housekeeper is a later option.

## 5. Demand and bookings

For segment `s` in week `w`, requests (in booking units: persons, groups, covers, room nights) are drawn as a Poisson-like count (`randomRound`) of

```
λ = base_s × season_s(week of year) × reach_s(w) × fit_s × price_s × review_s × weather_s × role_s
```

- `base_s`: hidden, drawn from the spec's "weekly requests at peak (reachable)" range.
- `role_s`: viable 1, mediocre 0.45, trap 0.15 (start values). A trap segment is polite in interviews and books a pilot, then rarely books (spec 3.2).
- `reach_s(w) = Σ channels response_s,c × activity_c(w)`, capped at 1.5:
  - **Platform** (listed or not, a plan toggle per platform): activity 1 while listed. Commission per booking. Guests booked through it are the platform's: no repeat bookings.
  - **Own website** (a product to build): activity `0.3 + 0.7 × min(1, repeatGuests / websiteRepeatsFull)` times the review factor. No commission.
  - **Partnerships**: set up once (hours, sometimes a cut), activity 1 afterwards.
  - **Phone and in person**: outreach hours this week, `effectiveHours / outreachHoursFull`, with the existing channel wear.
  - **Walk-ins** (restaurant, the outdoor base): from the location, activity 1.
- `fit_s = 0` until at least one product serving `s` has shipped; then `fitBase + (1 - fitBase) × (must haves shipped / must haves)` times product quality (snags lower it).
- `price_s`: the smooth price curve on the segment's price against its hidden willingness to pay (the same curve and "Too expensive" reasons as subscriptions).
- `review_s`: `1 + reviewWeight_s × (rating - 3) / 2 × min(1, reviews / reviewsFull)`; before any review, 1. Platforms and the website weigh it more (spec: reviews raise conversion there).
- Each request has a **lead time** in weeks (drawn from the segment's range; short lead requests see this week's forecast) and a **size** (group size for groups; 1 unit otherwise). It becomes a **booking** if the week it asks for has unbooked capacity of a product serving `s`, and the cancellation policy does not put it off (strict converts `strictConversion_s` as often as flexible). Requests that find no room are lost and counted ("turned away") so the player sees demand they could not serve.
- **Repeat guests**: a booking made outside platforms adds to the segment's repeat pool, which feeds the website's activity and word of mouth.

## 6. Cancellations, no-shows, deposits

- Each booking has a cancellation chance `cancel_s` (segment tendency) times the week's weather cancellation factor. Under a **flexible** policy a cancelled booking is refunded; under **strict** (or a deposit policy) the guest pays anyway (no refund within the strict window). Strict converts less (section 5). Neither is always right: strict wins where cancellations are frequent and demand exceeds capacity; flexible wins where demand is scarce.
- No-shows (restaurant reservations): as cancellations on the day, without notice; a deposit policy turns them into revenue.
- The policy can change every `policyWeeks` (start 4).

## 7. Money

- **Revenue** of a booking is earned in the week it is served: units × price, less the platform commission when booked through one. Guests pay on the day; business segments (team events, catering, business guests' firms) get an **invoice** through the existing invoice system (due days, lateness, never pays, chasing).
- **Costs**: shifts paid weekly; unit costs (food, hall fees, transfer, breakfast); products' monthly costs; fixed costs as now. Refunds are other costs.
- **Vouchers** (pre-sale) are cash now and a liability: redeemed later as bookings at no revenue; unredeemed ones stay a liability in the ledger.
- The win test is unchanged in shape: profitable in each of the last three months (long mode). Runway counts only money received. Funding (Part D) applies.

## 8. Reviews

- A public rating out of 5 and a count, starting with none. Each week with guests served, a week's quality `q` is drawn around `qualityBase` adjusted by: staffing ratio (understaffed `-understaffPenalty × shortfall share`), founder energy below the tired mark (`-tiredPenalty`), snags of the products served, company cancellations (`-cancelPenalty` per share cancelled), weather handled badly (a dangerous week without an alternative), room or dining room state (hotel and restaurant stages), and value for money (price against willingness to pay). New reviews arrive at `reviewsPerUnit` of units served; the rating is the running mean.
- Reviews raise conversion (section 5) and word of mouth (repeat guests bring others: the referral system, reused).
- Target: switching off care for reviews (a bot that ignores staffing and snags) costs at least 2 points.

## 9. Experiments (reused)

| Tourism experiment | Engine system | Notes |
|---|---|---|
| Interviews | interviews | as now, with budget hints in the segment's unit |
| Test listing (outdoor, hotel) | landing test | visitors from platforms; signal mostly for platform segments |
| Pilot day, pop-up dinner, open house | pre-sale | a batch of prospects from one segment; "commits" are guests who book again; costs hours and money |
| Vouchers | pre-sale deposits | cash now, redeemed later as bookings; a liability until then |
| Lunch test (restaurant) | pre-sale | office lunch only |

## 10. The bank loan (built before the restaurant, step 6)

As restaurant spec Part A, in `systems/loan.ts`: application (business plan hours, then a decision on visible numbers: own money in, revenue, bookings ahead, the plan), amount, a fixed rate drawn per run from a cited range, term, an optional interest-only start, monthly repayments as outgoings, missed payments (a reminder, a fee, default after two missed months: the run ends "The bank called the loan"), early repayment with a fee. Loan money is its own ledger entry and never income.

## 11. UI (shared by the three scenarios)

- Plan tab sections: **Roster** (shifts per role, with this week's booked units and staffed capacity per product), **Products** (prep, buy equipment), **Channels** (platform toggles, outreach hours, partnerships), **Prices** (per segment, peak and off season) and **Policy**; the existing Talk, Test and Rest sections; Hiring and Raise as in long mode.
- An **occupancy calendar** replaces the pipeline tab: the next 12 weeks, booked units against capacity per product, with last year's figure in year 2 and the forecast for next week.
- A **reviews panel** on the Money or Inbox tab: rating, count, last remarks.
- Scene drawings per scenario and stage, in the existing muted style.

## 12. Bots

| Bot | Rule |
|---|---|
| `tourism_careful` | Interviews all segments, runs the cheap tests, picks the segment the evidence favours, prepares its must haves, lists on a platform only for platform segments and builds the website and partnerships, prices from hints and "Too expensive" answers per season, rosters to bookings plus a margin, flexible policy unless cancellations are high and the calendar full |
| `tourism_platform_only` | The careful bot, but sells only through platforms |
| `tourism_overstaffing` | Rosters for capacity, not bookings |
| `tourism_understaffing` | Rosters below bookings |
| `tourism_no_tests` | Builds the temptation and every product, no interviews or tests |
| `tourism_price_blind` | One price all year |
| `tourism_review_blind` | Ignores snags and staffing quality |
| policy variants | always flexible, always strict |

## 13. Targets (template, per scenario; plan 7.3)

| # | Target | Limit |
|---|---|---|
| T1 | `tourism_careful` wins (Sustainable or Growing) | 25 to 45% |
| T2 | No strategy wins over 60%; the no-tests bot under 5% (or a recorded scenario floor) | |
| T3 | Spread across the viable segments | within 15 points |
| T4 | First booking from the viable segment early enough: by week 12 in the median winning run | |
| T5 | Decision news in at least 85% of weeks 1 to 20 and 70% of year 2 | |
| T6 | Inbox: blind effort at most a third of reading's gain; reading beats every blind policy by 4 points; no repeats unless on purpose; no dry weeks | |
| T7 | Seasonal pricing pays: price by season (from hints) beats one price by at least 2 points, and no more than 10 | |
| T8 | Platform dependence is a trap: platform-only loses to the careful mix by at least 3 points | |
| T9 | Staffing is a decision: over and understaffing each lose at least 3 points to the careful roster | |
| T10 | Reviews matter: the review-blind bot loses at least 2 points | |
| T11 | The cancellation policy is a real decision: each policy wins in some situation (a split by segment or season where it is ahead by its margin) and neither is ahead by more than 5 points overall | |
| T12 | 1000 runs under 150 s | |

## 14. Build order (plan 7.2)

1. Content schema for `bookings` (calendar, seasons, weather, products, roles and shifts, channels, policy, reviews) and the engine module `systems/bookings.ts` with its turn step, view (calendar, roster, reviews) and post-mortem lines; the subscription model untouched and proven identical.
2. A minimal test scenario in content (`tourism_test`, not offered to players) to test the engine before the real scenarios.
3. Bots for the bookings model and the target template in the report (`--parts tourism`).
4. Shared UI components.
Tag `tourism-engine`. The outdoor scenario (step 5) brings real content and tuning.
