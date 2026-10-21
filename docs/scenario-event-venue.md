# Scenario spec: event venue in Munich (working name "Fabriketage")

Source of truth for the second leisure scenario. Read `docs/leisure-mechanics.md` and `docs/scenario-hotel.md` first (whole bookings, deposits, cancellation policy, the loan). Anything not stated here works as in those files. Where the engine design differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates. Check them against current Munich sources and cite them in section 15, or keep the label. Tune everything against the targets.

"Fabriketage" is a factory floor. Every converted one in Germany is called a loft, which this one refuses to do.

## 1. Premise

The player planned events for a Munich agency for eight years. They lease the empty top floor of a former print works in Obersendling: 650 m², brick walls, a goods lift, and 120 seats at dinner or 220 standing (est.). They fit it out and rent it for company events, weddings and private parties.

### What this scenario teaches

1. **Every date is sold once.** An unsold Saturday is gone for good, and a held one may come back too late.
2. **The calendar has two businesses.** Companies book weekdays in autumn, couples book Saturdays in summer. Each pays differently, books at a different lead time and cancels differently.
3. **Neighbours are stakeholders.** Late, loud events earn the most and risk the licence.
4. **Partners make the money.** Caterers and technicians make the event; the venue's margin depends on its deals with them.

## 2. Starting values

| Value | Start | Note |
|---|---|---|
| Mode | Long only, 104 weeks | Week 1 is the first week of March. The fit-out takes 10 weeks (est.); the first events are possible from mid May |
| Company cash | 40,000 | Own money put in (est.) |
| Personal savings | 14,250 | As elsewhere |
| Founder living costs | 675 per week, rising a tenth from week 53 | |
| Company fixed costs per month | Lease 11,000 (est., about 17 a square metre for an industrial floor), insurance 400 (est.), electricity and heating 1,200 (est.), accountant 250, software and website 150, cleaning contract base 600 (est.) | |
| Fit-out | Needed before opening: toilets and a prep kitchen for caterers, floors, lighting. 90,000 (est.), usually with the loan | |
| Founder | Sells, plans and runs events (an event day takes about 12 founder hours); knows caterers and technicians from the agency | |
| Bank loan | Available (fictional "Isartal Sparkasse"), the fit-out and the items below | |
| Funding | Not available | |

## 3. Slots

| Slot | Note |
|---|---|
| Weekday | Monday to Thursday; conferences, workshops, launches. Some days take a daytime and an evening event |
| Friday | Company parties, private parties |
| Saturday | Weddings, private parties |
| Sunday | Rarely booked; markets and film shoots |

Hard capacity: one event per slot day (two on weekdays with `split_days`, below). An event is one booking unit.

## 4. Products

| Id | Name shown | Prep hours | Cost (est.) | Effect | Required by |
|---|---|---|---|---|---|
| `fit_out` | The fit-out | 40 | 90,000, 10 weeks | Events possible | everything |
| `furniture` | Tables and chairs for a seated dinner of 120 | 5 | 18,000 (or hired per event at 900) | Seated events possible | weddings |
| `av_tech` | Sound, light and a projector, installed | 10 | 25,000; a technician per event | | companies |
| `caterer_list` | A list of approved caterers with a 10% commission to the venue | 15 | none | Commission on catering; the caterers' quality affects reviews | weddings, private |
| `conference_package` | Day rates with tech, coffee breaks and a host | 10 | none | | companies |
| `wedding_package` | Wedding package with a coordinator on the day | 15 | none | | weddings |
| `split_days` | Daytime and evening events on one day (a turnaround crew) | 10 | 400 a turnaround | Two weekday events per day | none |
| `sound_insulation` | Insulated windows and a sound limiter | 10 | 30,000, the floor closed for 2 weeks | Fewer neighbour complaints | none |
| `late_licence` | Agreed late-event conditions | 15 | fee 1,500 (est.), 8 weeks' wait; may come with conditions | Late events possible; they pay about a quarter more | private parties |
| `online_enquiries` | An enquiry form with a live calendar | 10 | 50 a month | | none |

Noise rules after 22:00 are strict in residential parts of Munich (my understanding; verify how a late licence works for a venue like this). In the game, late events without insulation raise the hidden chance of a neighbour complaint. Three complaints in a year bring the authority's warning event, and a fourth may restrict events to 22:00 for a season.

### The temptation

`roof_terrace`: a terrace on the roof for summer drinks. 120,000 (est.), a building permit with a hidden chance of refusal after 12 weeks of waiting, and noise. Every client asks about outdoor space. Nobody's must-have.

## 5. Segments

| | Companies | Weddings | Private parties |
|---|---|---|---|
| Id | `companies` | `weddings` | `private_parties` |
| Description shown | Firms booking conferences, launches, workshops and Christmas parties | Couples booking a Saturday for the wedding party | Birthdays, anniversaries, club nights, film shoots and markets |
| Booking unit | Per event | Per event | Per event |
| Requests per week at peak (reachable, est.) | 1 to 4 | 0.5 to 2 | 1 to 4 |
| Willingness to pay (est.) | 4,000 to 9,000 a day | 3,500 to 7,000 a Saturday | 1,500 to 3,500 |
| Lead time | 4 to 20 weeks; Christmas parties booked from June | 26 to 70 weeks | 2 to 12 weeks |
| Slots | Weekdays, Fridays | Saturdays | Fridays, Saturdays, Sundays |
| Season shape (hidden) | September to December peak (the autumn trade fair season, the weeks around Oktoberfest, Christmas parties), March to June | May to September | All year, December high |
| Must haves | `av_tech`, `conference_package` | `furniture`, `caterer_list`, `wedding_package` | `caterer_list`, `late_licence` |
| Holds | Ask often; convert about half (est.) | Ask always; convert about a third (est.), a couple holds three venues at once | Rarely |
| Cancellation | Low; budgets get cut in recessions (event) | Low, but a cancellation is a whole Saturday | Medium |
| Channel response: venue platforms (15%, est.) | medium | high | high |
| Channel response: own website | medium, grows with reviews | medium | medium |
| Channel response: partnerships | event agencies: high | wedding planners: high | none |
| Channel response: outreach | high (the founder's old contacts) | low | low |
| Payment | 30% deposit, rest by invoice after the event, 30 days | 30% at booking, rest 4 weeks before | 50% at booking, rest a week before |

Roles viable, mediocre and trap, shuffled per run.

A polite trap example: wedding planners who praise the brick walls, hold six Saturdays for their couples, and release five of them in March.

## 6. Experiments

| Experiment | Version here | Signal |
|---|---|---|
| Interview | HR and office managers, couples at a wedding fair, party hosts | Pain buckets, product mentions, budget hints |
| Open evening | An evening for event agencies and wedding planners (a day's work and 1,500 in drinks, est.) | Interest and holds from companies and weddings |
| Test listing | Two weeks on a venue platform | Enquiries, mostly private parties |
| Wedding fair stand | A weekend and 1,200 (est.) | Interest from couples, months ahead |

## 7. Staff

| Role | Pay (est., verify) | Does |
|---|---|---|
| Event technician | 300 a day freelance | Needed with `av_tech` |
| Event host | 25 an hour | Runs an event instead of the founder (saves about 10 founder hours) |
| Turnaround crew | 400 a turnaround | With `split_days` |
| Event manager | Permanent, about 4,200 a month with employer costs (est.) | Sells and runs events, takes holds and enquiries off the founder |

Cleaning after each event: 350 (est.), passed on in the price.

## 8. Policies and pricing

- Prices per segment and slot day, peak and off-peak.
- The hold policy (`docs/leisure-mechanics.md` section 6).
- The cancellation policy: flexible or strict, as elsewhere. A strict policy keeps deposits; a flexible one wins more weddings.

## 9. Reviews

Driven by:

- the caterer (a hidden quality per caterer on the list);
- the host or founder on the day;
- the technician;
- turnaround rush on split days;
- noise restrictions cutting a party short.

## 10. Stages

Office stages 1 and 2:

| Stage | Name | Effect |
|---|---|---|
| 1 | The top floor | After the fit-out |
| 2 | The floor below as a second, smaller room (+5,500 a month, 35,000 to fit out, est.) | A second event for 60 on the same day; breakout rooms for conferences |

Scene drawings: an empty brick floor with tall windows and a goods lift; then the same floor laid for a dinner, with a smaller lit room below. Same muted style.

## 11. Content

| Type | Target |
|---|---|
| Intro cards | 4: the agency years, the floor, the calendar's two businesses, the fit-out and the loan |
| Scenario events | At least 40. Ideas below |
| Interview quotes | At least 10 per bucket per segment |
| Names | Invented: firms, couples, caterers, agencies, neighbours |

Event ideas:

| Idea | Tension |
|---|---|
| A couple wants to hold three Saturdays while they "talk to the parents" | The hold policy, in person |
| A neighbour films your party at 23:40 and sends it to the authority | A warning, and what you do about it |
| The goods lift breaks two days before a launch for 200 | Pay for an emergency repair or carry everything up the stairs |
| A caterer serves cold food at a wedding | Refund, drop the caterer, or defend them |
| An agency wants exclusive Christmas party rights for December | Volume at a price |
| A film crew wants the floor for three days in a quiet week | Easy money, a messy floor |
| A recession: two firms cut their Christmas parties | Cancellation terms tested |
| A wedding fair offers a free stand if you host their after-party | Reach against a Saturday |
| The landlord offers the floor below | Stage 2, early |
| A start-up wants a launch next week and pays anything | A gap in the calendar, filled |
| A guest falls on the stairs | Insurance, a review, a procedure |
| The authority asks for a fire safety concept for over 200 people | Hours and a fee, or a capacity limit |

Interview quote examples:

| Bucket | Example |
|---|---|
| Not a problem | "We hold the Christmas party in the canteen. The canteen is free." |
| Mild | "Somewhere with character would be nice. Our last venue was a hotel ballroom with carpet from 1987." |
| Noticeable | "Every venue I like is booked two years ahead on Saturdays." |
| Painful | "I need 180 people seated, a stage and a projector in October, and the agency wants 40,000 euros." |
| Urgent | "Our launch venue went bust this morning. It is in eleven days. I have a budget and no dignity left." |

## 12. Rough expectation

The fit-out eats the spring. The first summer sells private parties and the odd wedding; the autumn is the test. A player who sold the autumn to companies through the founder's old contacts while couples booked year 2 has a full calendar by the second summer. A player who grants every hold and builds the roof terrace has a calendar full of maybes and a loan full of terrace.

This is a back of the envelope expectation. The bot report is the real answer.

## 13. Scenario targets

On top of T1 to T18 and E1 where they apply. T4 is measured from opening.

| # | Target |
|---|---|
| V1 | Holds are a decision: a bot that grants every hold freely and a bot that grants none each lose at least 2 points to the careful bot |
| V2 | The calendar has two businesses: the careful bot beats bots that sell only to companies and only to weddings by at least 3 points each |
| V3 | Late events are a trade-off: late events without insulation lead to a restriction in at least 20% of the runs that hold them, and the careful bot's late events pay more than they cost |
| V4 | The roof terrace is a trap: building it in the first year loses at least 3 points |

## 14. Accent

Established accent `#7A3E1D` (check white text reaches 4.5:1).

## 15. Sources and values as built

### Initial implementation, 21 October 2026

These are initial estimates, not measured tuning. The draft is isolated until the
Ausgesperrt gate passes. All T1–T18, E1 and V1–V4 apply unchanged; T4 starts at opening.

[Munich indoor-event notification](https://stadt.muenchen.de/service/info/sicherheit-und-ordnung/1063794/)
allows authority conditions for fire safety, noise, food and medical cover. It does
not establish a general right to operate loudly after 22:00.
[Alcohol-serving permission](https://stadt.muenchen.de/service/info/gaststattenerlaubnis/1063662/n0/)
for changed premises follows building/use-change clearance.
[Building permission](https://stadt.muenchen.de/service/info/referat-fur-stadtplanung-und-bauordnung/10331531/)
is normally required for alterations or changed use. Accordingly the game's late
permission is a simplified review of operating/noise conditions. Its 1,500 EUR fee,
eight-week wait, four-complaint threshold and 26-week restriction are gameplay
estimates. They are not a statement of Munich legal thresholds or processing times.

[Published 2026 venue prices](https://www.muenchenhoch5.de/kosten) list Freiraum at
5,500 EUR/day, the whole location at 9,500 EUR/day, plus charges. This is a headline
comparison, not a quote for the fictional print works. It corrects an earlier
preparation note that called the 5,500 rate the whole location. The game's company
6,500/5,200, wedding 5,500/4,400 and private 2,800/2,300 peak/off rates remain estimates.

| As built initially | Basis and limits |
|---|---|
| One event per booking unit; four weekday events, one Friday, Saturday and Sunday | Weekly aggregate of the original day slots; no simultaneous separate hall |
| Split weekdays add four events; 400 EUR for each actual served event beyond four | Estimate; empty or cancelled reset capacity costs nothing |
| Fit-out 90,000 EUR, 40 hours, ten weeks | Estimate; forward sales only for dates after prepared/paid readiness |
| Furniture 18,000 EUR to buy or 900 EUR per served dinner to hire | Estimate; hire genuinely supplies the wedding must-have |
| Installed AV 25,000 EUR; insulation 30,000 EUR with two closed weeks | Estimates; known closed dates cannot accept events |
| Event host 250 EUR per ten-hour shift; technician 300 EUR per event | Freelance estimates, not gross employee wages |
| Manager 1,050 EUR/week for five shifts; part time 450 for two; seasonal 1,100 for five | Estimated employer-inclusive cost; part time has a modest saving versus separate shifts, permanent payroll continues in quiet weeks |
| Catering commission 10% of estimated 4,000 EUR wedding / 2,000 EUR private packages | Actual service receipts of 400/200 EUR; no receipts from held or cancelled dates; authored supplier incidents affect reviews |
| Late-only enquiries 60% of the ordinary private enquiry base; late price x1.25 | Initial estimate using existing own-demand mechanics; keeps a real distinct late product rather than an alias never selected |
| Complaint draw per late event 0.24; insulated 0.02 | Hidden gameplay estimates; actual complaints, warnings, restriction dates and refunds are public |
| Roof 120,000 EUR, twelve weeks, 117,000 refundable on refusal | Estimate: remaining 3,000 EUR is application/preparation; decision once, no retry. Small WTP factors 1.03/1.06/1.04 make its outdoor promise real; it remains the named expensive temptation |
| Breakout rooms below: 35,000 EUR, six weeks, 5,500/month; company requests x1.45 | Same-building office upgrade, estimate. Does not create an independently bookable second event hall |
| Fixed monthly costs 13,600 EUR before upgrades | Original lease/insurance/utilities/accountant/software/cleaning estimates; no matching current commercial lease quote found |

### First-pass adaptations

Strict guest cancellations retain the advance only. Company-caused and flexible
cancellations return advances. Guest balances settle on the event date; the
proposed four-week wedding and one-week private balance collections are deferred.
Company balances are invoiced after service with 30-day terms. Deposits are paid
at booking and credited once at settlement. No supplier roster or hidden supplier
selection is simulated; authored caterer incidents affect real reviews.

The late alias takes five hours of launch preparation, rather than the invalid
zero-hour draft. It shares the main hall, needs the agreed late conditions and
uses a technician and host. Actual contribution includes attributable staff,
service costs, equipment/reset costs and dedicated setup. Shared rent stays in the
business ledger. Restrictions release affected future dates and refund advances
once immediately. The paid roof build returns its refundable component once if
refused; refunds reverse costs in the existing cash-basis accounting. Capital
purchase/refund timing in the ending window remains a first-pass limitation.

Content currently has four intro cards, 55 authored events including the fit-out,
furniture and breakout offers, and 150 interview quotes. Sources support only what
is explicitly attributed above; all other figures remain estimates.


### Value round1, initial calibration

All changes below are gameplay estimates,no new market-price claim. Both the initial
and corrected main contribution reports are retained in autonomous5/venue/.

| Value | Before | Round1 | Reason |
|---|---:|---:|---|
| No-hold acceptance,company/wedding/private | .65/.40/.95 | .35/.15/.90 | Clients who ask for an option do not all accept an immediate commitment;previous values dominated free holds in every market |
| Wedding acceptance of a paid hold | .50 | .85 | A credited hold fee should remain possible for serious couples,while a free hold retains broader acceptance |
| Strict-term acceptance,company/wedding/private | .98/.75/.85 | .995/.82/.97 | Retaining only the deposit gives much less cancellation compensation than full-price charging;company/private commitment needs a smaller conversion loss to form a trade-off |
| Unresolved snag review penalty | .15 | .30 stars per snag | Make actual unresolved faults matter without changing repair costs or inventing a bot-specific charge |
| Pre-opening eligible cards |8 once-only cards |8 originals plus4 recurring cards | Monthly cost reconciliation,conditional snag review,an agency progress tour and a rest/inspection choice provide decisions during construction |

The new cards recur no more than once per four weeks while closed. Their quoted
80 EUR duplicate charge and150 EUR tour catering are estimates. Tour enquiries
require the public conference/AV features;snag work helps only with actual snags.
These are real time/cash/rest choices,not empty pacing messages. Other prices,
lease/build/staff costs,demand and lead times stay at the corrected baseline.
Conservatively charge round1 to all targets;one value round and one formula allowance
remain. Measure all29 strategies,main only,1,000 test seeds. Event table once at end.

### Value round2, commitment and repairs

Round1 careful42.7%,top45.0%;T5 passes90.9% early decision coverage and T13
passes at the limit. V1 remains free+0.0±1.7/none−1.0±1.8;strict terms lead
in every market(+2.5±1.8 overall),and review-blind loses only0.5±1.3.

| Estimate | Round1 | Round2 | Reason |
|---|---:|---:|---|
| Paid-hold acceptance,company/wedding/private | .80/.85/.90 | .95/.90/.95 | A credited500 EUR payment is a smaller obstacle than the earlier acceptance estimates imply;free dates still attract everyone and can block the calendar |
| Wedding strict-term acceptance | .82 | .65 | Couples planning26–70 weeks ahead value a refundable option more than short-lead corporate/private bookings;strict retains the deposit |
| Unresolved snag review penalty | .30 | .50 stars per snag | A visible unresolved venue fault should affect reviews materially;fixing it keeps its existing hours and cost |

These are gameplay estimates,not research claims. Quoted money,market demand,
lead times,payroll,deposit shares and loan terms stay fixed. Conservatively debit
round2 to all targets. No formula allowance used;all29 main strategies measured
on1,000 test seeds. The event table remains once-only after final values.
