# Step 5: the outdoor adventure company (Gratwanderung)

## What changed

- Content: scenario `gratwanderung` (long mode only, 104 weeks), from `docs/scenario-outdoor.md`: three markets (tourists, Munich team days, school and youth groups), 14 products (guided hikes, via ferrata, canyoning, snowshoe tours, team day, school day, transfer, bad weather plan, English tours, online booking, invoicing, safety concept, group pricing, and the e-bike fleet temptation), mountain guides and hiking leaders by the shift, a platform at 25% commission, a base in town offered by an inbox event, 43 events of its own and 20 shared tourism events (`shared/tourism`), 10 interview quotes per bucket per market, company names, intro. Cited figures and changes from the spec are in the spec's new section 14.
- Engine (bookings scenarios only): a seasonal win test (`win.overMonths`: the last 13 months together cover every cost), finer budget quotes under 200 EUR (`budgetSmallStepCents`), milestone count of guests, event guests as booking requests next turn (`BookingsState.eventGuests`) that complain with a 2 star review when turned away, office walk-ins beyond the reach cap, word of mouth from repeat guests, outreach scaled by the founder's selling skill, `PostMortem.guests`.
- Bots: tourism bot fixes (founder shifts first, cheapest paid role per guest, a second market once the first is served, extra products within a fifth of the money, hint pricing for every market from the median of three hints, spare hours into outreach), the tourism reader (`tourismReader.ts`), `tourism_overworker`, `tourism_inbox_none`, `tourism_inbox_effort`, target T6, ending routes and seeds for tourism.
- UI: scene drawings for the van garage and the base in town, the Guests section of the post-mortem; fixed picking a long-only scenario and starting it in the browser.

## Tests

Content: tourism scenarios get their own rules (long only, at least 40 own events, recurring events name a cooldown, organised at all costs, quotes per bucket), the subscription rules where they apply. Engine: event guests as requests, complaints, guests economics. Web: the outdoor run from the Start screen to its post-mortem, five scene drawings, no inline source the bundle cannot read; browser: axe and no sideways scrolling at 375, 390, 430 and 1440 px in Chrome and WebKit. 746 tests, 50 browser tests, lint: pass.

## Targets (report on 1,000 seeds, prefix `test`, in `docs/balancing.md`)

| Target | Result | Verdict |
|---|---|---|
| T1 careful 25 to 45% | 44.2% (±3.1) | pass |
| T2 no strategy over 60%, no tests under 5% | top 44.7%, no tests 0.0% | pass |
| T3 spread within 15 points | 3.6 | pass |
| T4 first guest by week 12 | week 11 | pass |
| T5 decision news | 97.2%, year 2 94.4% | pass |
| T6 reading pays, blind effort at most a third | reading +14.6, effort +9.3 | fail (open) |
| T7 seasonal pricing 2 to 10 points | +1.8 (±2.1) | at the limit |
| T8 platform only loses 3 | -34.6 | pass |
| T9 over and understaffing lose 3 | -44.2, -19.0 | pass |
| T10 reviews matter 2 | -13.5 | pass |
| T11 policy a real decision | +0.5 overall; flexible ahead for schools and teams, strict for tourists | pass |
| T12 speed | 47 s per 1000 runs | pass |

Seeds per ending (Sustainable, Still searching, Bankrupt, Burnout, Shut down) in `docs/seeds.md`. The report's event table (`--events`) forces answers on the subscription bots and has no tourism version yet; the outdoor events were measured with forced-answer runs of the tourism bots instead (decisions, step 5).

## Protected games

See STATUS.md and the tag message: 60 week Kantino and Zollstock (main, paired, inbox) and Kantino long (main, inbox, funding) on 10,000 seeds.

## Open issues

New: T6 (blind effort gains 60 to 65% of what reading gains; budget used). Deviation from the spec worth a look: school demand 6 to 12 groups a week at peak (spec 0.3 to 1.2).
