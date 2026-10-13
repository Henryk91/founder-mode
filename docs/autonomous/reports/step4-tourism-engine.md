# Step 4: tourism engine

## What changed

- Design: `docs/tourism-proposal.md` (decisions in `docs/decisions.md`, "Step 4").
- Content: a `bookings` block (calendar, season curves, weather with forecasts, platform commission, website, partnerships, outreach, segments' demand, units, prices, lead times, channel strengths, cancellations, products' capacity and costs, staff roles with pay per shift and availability, reviews), cross-checked against markets and features.
- Engine: `systems/bookings.ts` replaces sales and churn in a bookings scenario: requests become bookings of capacity that expires, a weekly roster serves them, unstaffed and weather-closed guests are cancelled by the company, strict and flexible policies, invoices for business guests, reviews feeding demand, monthly revenue from guests' payments, money in the win test. The view has a 12 week calendar per product, the forecast, rating, prices, roles and products.
- Bots: `tourism_careful` and eight variants, played only on bookings scenarios; the tourism target template T1 to T12 and a guests table in the report.
- UI: roster, getting guests, and prices and policy sections; an occupancy calendar in place of the pipeline; results lines for every bookings entry.

## Tests

Engine: calendar and season curves, bookings ahead, guests turned away, roster coverage and company cancellations, invoices, strict policy and its lock, weather closures, validation, determinism. Bots: tourism bots play valid runs, the model filter, the tourism report section. Web: the tourism sections and calendar with a test scenario injected.

## Targets

The tourism targets are judged per scenario from step 5; the test fixture is not balanced. No Kantino or Zollstock target changed.

## Protected games

60 week game, both scenarios: main, paired and inbox on 10,000 seeds identical apart from timings and parts not run. Kantino long: main, inbox and funding on 10,000 seeds identical likewise.

## Open issues

Unchanged (STATUS.md). New, for step 5: permanent staff (salaried roles) deferred; guests turned away are recorded for the last 12 weeks only.
