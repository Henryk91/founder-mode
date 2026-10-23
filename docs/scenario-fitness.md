# Scenario spec: boutique fitness studio in Munich (working name "Schweißperle")

Source of truth for the third leisure scenario. Read `docs/leisure-mechanics.md` first (slots, memberships, the aggregator). Anything not stated here works as in that file and the earlier tourism scenarios. Where the engine design differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates. Check them against current Munich sources and cite them in section 15, or keep the label. Tune everything against the targets.

"Schweißperle" is a bead of sweat. The founder wanted something cleaner; the logo designer won.

## 1. Premise

The player taught spin and strength classes in big Munich gyms for six years and has a following of a few dozen people. They lease a former shop in the Glockenbachviertel with room for a spin room (20 bikes) and a studio room (18 mats), and open a boutique class studio: no machines, only classes, booked by app.

### What this scenario teaches

1. **The evening is full, the afternoon is empty.** Classes sell by the slot. Off-peak needs its own customers and price.
2. **January is a trap.** Resolutions sign up in January and are gone by March. Staff and space planned for January cost money in April.
3. **The platform fills the empty slots and empties the memberships.** Open it where you have room.
4. **People follow people.** Members come for an instructor. An instructor who leaves can take members with them.

## 2. Starting values

| Value | Start | Note |
|---|---|---|
| Mode | Long only, 104 weeks | Week 1 is the first week of July. The fit-out takes 8 weeks (est.); the studio opens in September, when Munich comes back from holiday |
| Company cash | 45,000 | Own money put in (est.) |
| Personal savings | 14,250 | As elsewhere |
| Founder living costs | 675 per week, rising a tenth from week 53 | |
| Company fixed costs per month | Lease, 190 m², 5,800 (est.), insurance 200 (est.), booking app 250 (est.), music licences 120 (est., verify), electricity and heating 500 (est.), accountant 225, cleaning 800 (est.) | |
| Fit-out | Needed before opening: floors, sound, mirrors, showers and changing rooms. 60,000 (est.) | |
| Spin bikes | 20 at 1,500 each (est.), or leased at 50 each a month | |
| Founder | Teaches spin and strength (about 1.5 h per class with set-up); a following of 30 to 60 people who come in the first month (hidden) | |
| Bank loan | Available (fictional "Isartal Sparkasse"). Items: fit-out, bikes, reformers, the recovery room (the temptation), working capital | |
| Funding | Not available | |

## 3. Slots and timetable

| Slot | Hours |
|---|---|
| Early | Weekdays 06:30 to 09:00 |
| Midday | Weekdays 12:00 to 14:00 |
| Afternoon | Weekdays 14:00 to 17:00 |
| Evening | Weekdays 17:00 to 21:00 |
| Weekend | Saturday and Sunday mornings |

The player sets a weekly **timetable**: classes per slot per room. Each class needs an instructor who teaches that class type. Hard capacity: bikes or mats. Full classes keep a waitlist; a member on the waitlist three times in a month churns a little more.

## 4. Products

### 4.1 Class types

| Id | Name shown | Room | Capacity | Instructor | Required by |
|---|---|---|---|---|---|
| `spin_classes` | Spin | Spin room | 20 | spin | young professionals |
| `strength_classes` | Strength and HIIT | Studio | 18 | strength | young professionals |
| `yoga_classes` | Yoga | Studio | 18 | yoga | yoga crowd |
| `reformer_pilates` | Reformer pilates | Studio, replaces mats | 8 reformers at 4,500 each (est.) | pilates | none (a premium choice) |
| `lunch_classes` | 30-minute lunch classes | Either | as the room | any | corporate |

`reformer_pilates` is not a trap. It sells at about twice the price per class (est.) to a segment that may or may not exist in a run, and it takes the studio room's capacity from 18 to 8.

### 4.2 Memberships and offers

Each is a product the player switches on and prices (`docs/leisure-mechanics.md` section 3):

| Id | Price (est.) |
|---|---|
| Monthly unlimited | 139 a month |
| 12-month unlimited | 115 a month |
| Off-peak unlimited (early, midday, afternoon) | 79 a month |
| 10-class pack | 230, valid 6 months |
| Drop-in | 26 |
| Intro offer, 3 weeks unlimited | 49 |
| Corporate plan | A company pays per employee who joins, at a discount, by invoice |

### 4.3 Support products

| Id | Name shown | Prep hours | Cost (est.) | Required by |
|---|---|---|---|---|
| `booking_app` | Booking app with waitlists | 10 | in the fixed costs | young professionals |
| `showers` | Showers and changing rooms good enough for before work | in the fit-out | | young professionals, corporate |
| `quiet_studio` | Sound insulation between the rooms | 10 | 12,000, the studio closed for a week | yoga crowd |
| `corporate_plans` | Corporate plans with invoices and a company page | 15 | none | corporate |

### 4.4 The temptation

`recovery_room`: an infrared sauna and a cold plunge. 35,000 (est.) plus electricity. Every member mentions one they saw on social media. Nobody's must-have, and it takes the space of a future second studio room.

## 5. Segments

| | Young professionals | Yoga crowd | Corporate |
|---|---|---|---|
| Id | `young_professionals` | `yoga_crowd` | `corporate` |
| Description shown | People in their twenties and thirties working in the city, who train before or after work | Regulars who want calm, steady practice | Companies that pay for their employees' memberships |
| Unit | Members and visits | Members and visits | Members through a company plan |
| Joins per week at peak (reachable, est.) | 6 to 20 | 3 to 10 | 0.2 to 1 companies, 5 to 30 employees each |
| Willingness to pay (est.) | 110 to 160 a month | 90 to 140 | 60 to 100 per employee (the company pays) |
| Visits per week | 2 to 3 | 2 to 4 | 1 to 2 |
| Slots | Early and evening | Early, midday, weekend | Midday, early evening |
| Season shape (hidden) | Peaks in January and September; low in August | Steady; low in August | September to November, January |
| Churn | High, especially January joiners | Low | Low while the company pays; a company can end the plan |
| Must haves | `booking_app`, `showers`, `spin_classes` or `strength_classes` | `yoga_classes`, `quiet_studio` | `corporate_plans`, `lunch_classes`, `showers` |
| Aggregator use | High | Low | Medium (companies may buy the aggregator instead) |
| Channel response: aggregator | high | low | medium |
| Channel response: own website and social media | medium | medium | low |
| Channel response: partnerships | none | physiotherapists: medium | HR networks: high |
| Channel response: outreach | low | low | high |
| Channel response: walk-ins (the shop window) | medium | medium | none |

Roles viable, mediocre and trap, shuffled per run.

A polite trap example: companies whose HR team loves the idea, runs a free lunch class, and then buys the aggregator for everyone.

## 6. Experiments

| Experiment | Version here | Signal |
|---|---|---|
| Interview | Gym-goers, yoga students, HR people | Pain buckets, preferred slots, budget hints |
| Free class week | A free week of classes before opening, or a week of free trial classes for one segment | Sign-ups and remarks on slots and classes |
| Test listing | Two weeks on the aggregator with a few slots | Check-ins, which slots they fill |
| Pre-sale | Founding memberships at a discount before opening | Cash now, evidence of demand; owed as classes |

## 7. Staff

| Role | Pay (est., verify) | Teaches |
|---|---|---|
| Spin instructor | 40 a class freelance | Spin |
| Strength instructor | 40 a class | Strength and HIIT, lunch classes |
| Yoga teacher | 45 a class | Yoga |
| Pilates instructor | 50 a class; scarce | Reformer pilates |
| Front desk | 15 an hour; minijob | Frees founder hours, sells memberships at the desk |

Contracts as elsewhere: permanent instructors cost less per class but are paid in August too. Each instructor has a hidden **following**: some members join for them and churn when they leave. Instructors who teach more than 12 classes a week tire and teach worse (est.).

## 8. Pricing

Per membership type and per class pack. Off-peak price separately. Intro offers and their conversion. The existing price curve and "Too expensive" reasons apply.

## 9. Reviews

Driven by:

- crowding and waitlists;
- the instructor's quality;
- cleanliness (the cleaning contract against the number of visits);
- the showers at 7:45 on a weekday.

## 10. Stages

Office stages 1 and 2:

| Stage | Name | Effect |
|---|---|---|
| 1 | The shop with two rooms | After the fit-out |
| 2 | The neighbouring shop as a third room (+3,800 a month, 30,000 to fit out, est.) | A third room for any class type |

Scene drawings: a narrow shop with a neon sign, bikes in the window; then a wider frontage with a second door. Same muted style.

## 11. Content

| Type | Target |
|---|---|
| Intro cards | 4: the big gyms and the following, the shop, the three kinds of member and the slot question, the fit-out and the money |
| Scenario events | At least 40. Ideas below |
| Interview quotes | At least 10 per bucket per segment |
| Names | Invented: firms, staff, members. The aggregator is "Sportflat" (check it is not a real brand) |

Event ideas:

| Idea | Tension |
|---|---|
| Your best spin instructor is offered her own studio | Pay more, a share, or let her go with her following |
| January: 60 new members in two weeks, waitlists everywhere | More classes now, for members who may be gone by March |
| The aggregator raises its payout for off-peak slots | More check-ins, more cannibalisation |
| A large firm wants a corporate plan for 80 employees at a deep discount | Volume at a price; evenings fill |
| The showers break in February | Fix now or lose the before-work crowd |
| A member's video of a 6:30 class goes viral in a local group | Demand for a slot you may not have |
| A neighbour complains about the bass at 7 am | Insulation or quieter music |
| The music licence society sends a bill for last year | Pay up, and the fee goes up |
| A physiotherapist wants to send patients for a cut | A partnership at a price |
| An instructor cancels at 17:30 for an 18:00 class | Teach it yourself, cancel, or pay a premium cover |
| Summer: half the members are on holiday | Pause memberships or keep billing |
| A competitor opens a reformer studio round the corner | Your premium segment, contested |

Interview quote examples:

| Bucket | Example |
|---|---|
| Not a problem | "I run along the Isar. It is free and nobody shouts at me." |
| Mild | "My gym is fine. The music is from 2009 and so are the towels." |
| Noticeable | "The 18:00 spin class is full by Tuesday. I go at 20:00 and hate everyone." |
| Painful | "I need a class at 6:30 near the office or I do not train at all." |
| Urgent | "My wedding is in eight weeks and the suit was bought in a moment of optimism." |

## 12. Rough expectation

The first autumn fills the evenings with the founder's following and their friends. January brings a rush that leaves in March. A player who builds a timetable for the evenings, sells off-peak to the yoga crowd or companies, and opens the aggregator only in the quiet slots has a steady studio in year 2. A player who sells unlimited memberships to everyone and opens the aggregator everywhere has full evenings, angry members and a payout of eleven euros a visit.

This is a back of the envelope expectation. The bot report is the real answer.

## 13. Scenario targets

On top of T1 to T18 and E1 where they apply. T4 is measured from opening; T8 (platform dependence) is about the aggregator.

| # | Target |
|---|---|
| F1 | Open the platform where you have room: the careful bot (aggregator in quiet slots only) beats both all slots and no aggregator by at least 2 points each |
| F2 | January is a trap: a bot that adds classes and instructors for every January waitlist loses at least 2 points to the careful bot |
| F3 | Reformer pilates is a real choice: buying reformers and not buying them are within 5 points of each other overall, and each is ahead in some runs |
| F4 | Instructors matter: losing the instructor with the largest following costs the careful bot a visible drop in members (in the post-mortem), and a bot that never matches an instructor's offer loses at least 2 points |
| F5 | The recovery room is a trap: building it in the first year loses at least 3 points |

## 14. Accent

Established accent `#B0284F` (check white text reaches 4.5:1).

## 15. Sources and values as built

### Initial isolated content, 21 October 2026

This is unmeasured first-pass content, not tuning. Applicable targets are
T1–T10, T12–T18, E1 and F1–F5; T4 starts at opening and T8 concerns real aggregator
check-ins. T11's strict/flexible booking comparison does not measure monthly
notice or annual membership terms; it is not applicable. Office targets remain
outside scope. No fitness bot report or value/formula round has run.

[OM Company prices](https://om-company.de/preise) list 20–22 EUR drop-ins,
155–175 EUR ten-class offers,150 EUR/month and 120 EUR for twice-weekly membership.
[Orange Room](https://orange-room.de/preise/) lists 210 EUR/ten classes;
[Eisbachfit](https://www.eisbachfit.com/sample-page/eisbachfit-studio-indoor-training/)
lists 200 EUR/ten sessions. These are comparisons, not quotations for this fictional
studio. Unlimited 139/annual 115/off-peak 79, ten classes 230 and intro 49 remain
starting estimates with actual slot/term/owed-visit restrictions.

[Reformer Room](https://reformer-room.de/preise/) lists 30 EUR/drop-in and 250 EUR/ten;
[DNA Reformer](https://dna-reformer.com/) lists 30/270 and a 14 EUR aggregator
co-payment. These sources do not support calling every reformer class twice the
ordinary boutique price. The first-pass premium pack 320 and ticket price factor 1.4
are explicitly upper-end gameplay estimates. Premium willingness varies by run,
can surface in actual interview mentions and still tests the paid offer fee.
Premium access does not silently belong to ordinary unlimited membership.

[BMAS minimum-wage information](https://www.bmas.de/EN/Labour/Minimum-Wage/the-minimum-wage-questions-and-answers.html)
states 13.90 EUR gross/hour from January 2026. Freelance spin/strength 40, yoga 45,
pilates 50 per class remain estimates; employee contracts are employer-inclusive
estimates, not legal wage advice or a particular employment contract. The
[GEMA fitness-course tariff](https://www.gema.de/de/musiknutzer/tarifuebersicht/tarif-wr-ks-f)
is distinct from background music.120 EUR/month is still an estimate pending an
actual class-specific tariff calculation.

No matching current commercial lease/build/equipment quotation was found. Keep
190 m² lease 5,800 EUR/month, fit-out 60,000, equipment/works and neighbouring room
costs labelled estimates. Historical commercial-market summaries or residential
rent tables do not verify this 2026 leisure lease.

| Initial content value | Basis/adaptation |
|---|---|
| Company 45,000 EUR, personal 14,250, living 675/week | Original starting estimates; living rises 10% after week 52 |
| Fixed monthly costs 7,895 EUR | Lease 5,800, insurance 200, app 250, music 120, utilities 500, accountant 225, cleaning 800; estimates |
| Fit-out 60,000 EUR,40 preparation hours, eight elapsed weeks | Includes working showers and changing rooms; no invalid zero-hour extra shower purchase |
| Twenty bikes 30,000 EUR or 12,000 EUR per twelve-month lease | Estimate; real asset supply, minimum commitment and monthly settlement, not free capacity |
| Founder spin/strength two hours per class | Whole-hour preparation/teaching allowance rather than the proposed 1.5; room occupancy remains one hour, short lunch classes half an hour |
| Mat classes 18 places, reformer 8 | Reformer installation changes the existing studio to 8 seats; no free third room |
| Quiet studio 12,000 EUR, one closed week; reformer 36,000, two weeks | Estimates; affected studio dates close during work |
| Company joins 4–18 employees/week at peak | Aggregate paid employee units from the original 0.2–1 companies times 5–30 employees; not one employee called a whole company |
| Monthly WTP110–160/90–140/60–100 EUR | Original estimates; ticket and membership prices use consistent monthly-equivalent units |
| Following 30–60 people over first four open weeks | Finite genuine enquiries subject to paid-offer conversion, not guaranteed free members or revenue |
| Turnsaldo 9–13 EUR/check-in, eight/month, four-week notice | Fictional name; starting estimates. Sportflat is an existing real-world name and is not used |
| Retained instructor limit 12 classes | Founder counts across roles, named contracts individually; flexible per-class cover is a pool, not one fictitious teacher |
| Permanent 12 classes for ten freelance class fees/week; part-time five for four; seasonal 12 for eleven | Employer-inclusive estimates; regular contracts remain paid in their stated periods, including empty rostered classes |
| Recovery 35,000 EUR plus 180/month | Estimate; no new paid classes. Its hypothetical alternative room-use exclusion is deferred rather than pretending it blocks the separate adjoining shop |
| Adjoining room 30,000 EUR, six weeks,3,800/month | Same-building mat-class room for strength/yoga/lunch, one shared annex timetable. Extra spin bikes are not silently included |

Four intro cards,49 authored cards including offers and 150 interview quotes are
present. Inbox incidents handle conversations/one-off service consequences; lasting
timetable, offer and aggregator changes use their explicit controls. Trial listings
measure interest; actual paid check-ins come from the enabled aggregator pool.
Source notes distinguish all estimates from published comparisons. Front-desk cover now provides real administrative relief: a two-hour weekly shift
costs 36 EUR (18 EUR/hour employer-inclusive estimate); regular part-time cover
costs 138 EUR/week for four such shifts. The founder otherwise spends up to eight
hours on administration from visits actually served. Paid cover reduces the
following week's administration once and never supplies an instructor.


The initial native360×170 shop/annex drawings are integrated in the existing
scene format. White on the established accent#B0284F measures6.44:1,so the
specified shade is retained. Catalogue/static/lazy loading now register the
long-only scenario in the isolated branch;bots and membership/timetable UI
remain unfinished before the phase gate.

### Aggregator settlement correction before tuning

The initial report exposed corporate-labelled aggregator check-ins entering the
ordinary employer invoice path. The platform contract pays actual check-ins;
it does not sell a newEUR11class invoice to each visitor's employer. Fitness
now explicitly enables `aggregator.payOnVisit:true`. This removes those false
invoices,credit-risk rolls and chase work;company membership invoices remain
normal invoices. Older scenarios omit the switch and retain their exact path.
The corrected-policy matrix was stopped as superseded after its careful count
(951/1,000);its checkpoints remain available. Measure the settled game before
changing values. Value rounds0/2,formula0/1.

Optional per-offer weekly usage is now supported and displayed. This is needed
for products such as a once-weekly premium pack or a weekly children's club;
without it,the segment's general studio usage is applied to every offer. No
fitness offer frequency has been changed in this mechanics correction.


### Value round one,22 October2026

The settled main-only matrix (30 policies,1,000 paired test seeds,source85d9b2b)
measures careful93.7%±1.5 and never-reformer99.0%±0.6. Median two-year net
wealth is EUR253,107. Contributions were reviewed before changing values.

| Value | Before | Round one | Basis |
|---|---|---|---|
| Young-professional reachable enquiries/week at peak |6–20|3–10|Halve estimated reachable demand to bring the studio towards break-even|
| Yoga reachable enquiries/week at peak |3–10|1.5–5|Same estimate adjustment; fractional demand is sampled by the existing engine|
| Employee membership enquiries/week at peak |4–18|2–9|Same adjustment; units remain employees,not companies|
| Small interview budget step |EUR500|EUR10|Correct inherited coarse rounding for EUR60–160 monthly budgets|
| Premium pack usage |Segment default2.5–3/week|1/week|Estimate for once-weekly specialist classes,shown in public offer terms;EUR320/ten remains unchanged|
| Urgent shower repair call-out |EUR120|EUR650|Explicit emergency plumbing estimate,not a verified supplier quote|
| Extra deep-cleaning call-out |EUR120|EUR300|Explicit one-off cleaning estimate;the regular EUR800/month contract remains|
| Bike service block |EUR120|EUR480|Explicit equipment-service estimate;no quoted manufacturer tariff|

The original starting tables above remain the proposal,not a claim that those
unmeasured demand ranges produced the target difficulty. Rents,published price
comparisons,ordinary membership fees,contract tariffs,January behaviour and
recovery costs are unchanged in this round. Reformer equipment still costs
EUR36,000 and converts18 mat seats to8. The weekly usage assumption changes
real pack consumption and its monthly price basis,not just a report label.

These are value changes,not formula changes. Budget after application:1/2 value
rounds,0/1 formula rounds. Measure main only on1,000 paired test seeds;the event
table remains reserved for once at the end of the step. No full report.


### Value round two,22 October2026

Round one measured30 policies on1,000 paired test seeds (main only,sourcea0643aa).
Careful83.7%±2.3 and top88.8%±2.0 remain too easy. Median net wealth is
EUR30,149,with viable-market medians EUR89,499 corporate,EUR23,578 young and
EUR797 yoga. Reduce estimated reachable peak-week enquiries from3–10 to2–7
for young professionals,1.5–5 to1–4 for yoga,and2–9 to1–5.5 for employee
memberships. Corporate receives the larger proportional adjustment because
its measured receipts/wealth buffer are larger. No counterfactual sweep ran.

Premium usage changes from1 to an estimated1.5 visits/week,or three visits per
fortnight on average. The EUR320 ten-class pack then has a EUR192 monthly
equivalent,versus EUR128 at once weekly and EUR320–384 at the original general
studio usage. This preserves a genuine specialist revenue premium while
retaining the EUR36,000 purchase,eight seats and paid teacher. Actual whole
visits use the existing deterministic fractional-demand sampling.

The forced reformer buyer now waits eight open weeks before requesting the
conversion. Previously it changed the initial bank/fit-out plan before any
regular studio could open,confounding the buy/keep decision with start-up
sequencing. It still ignores hidden niche values and funds the requested
conversion through the normal bank/cash controls. Careful's evidence/cash
checks and already committed conversions retain their existing rules.

All other prices,costs and formulas remain unchanged. This correction is
recorded within round two and does not reset the budget:values2/2,formula0/1.
Measure affected main only on1,000 paired test seeds. Event table once at the
end of the step;full report only step6,once.


### Sole formula round,22 October2026

Both value rounds are spent. The second30-policy,1,000-paired-test-seed main
report measures careful65.6%±2.9,top73.9%±2.7,no-tests0.7%±0.5. F1 still
finds all slots +0.1±2.0 versus careful. F3 still finds buying−46.4±3.1,
with only3buy-only wins versus467no-buy-only wins. See ROUND2_REVIEW.md.

- Explicit `aggregator.sharedQueue:true` models member and platform reservation
  arrivals competing for the same real class places. The existing member-first
  allocator only let platform users take leftovers,so opening busy classes
  could not displace those reservations. Seeded ordering remains deterministic;
  slot choices,paid cover and hard limits still apply. The public contract card
  states the shared queue rule,without showing probabilities.
- Failed member reservation attempts now affect class reviews through the
  existing cancellation penalty and the actual refused-attempt fraction.
  Previously hard allocation prevented attendance exceeding hard capacity,
  leaving these waitlist failures out of the direct crowding review effect.
- Explicit `premiumNiche.requirePreferredOffer:true` makes latent specialist
  demand capable of declining an ordinary offer when its desired paid class
  is unavailable. Previously every such enquiry automatically substituted an
  ordinary offer,so installing equipment mostly redirected existing revenue.
  The founder's original spin/strength following and accepted ordinary intro
  renewals keep their existing fallback. They still pay normal fees and face
  ordinary conversion;there is no free founding membership or whole-market
  premium must-have. Existing interview mentions reveal specialist interest.

All demand ranges,fees,rents,wages,niche shares,payouts and usage frequencies
remain exactly as round two. These are optional mechanic/formula corrections,
not a third value round. Earlier content omits the new switches and class-aware
review path. Fitness's changed content fingerprint covers its debug-save notice;
the engine version remains0.14.0 because earlier games must replay identically.

Budget after application:values2/2,formula1/1. Measure affected main only on
1,000 paired test seeds. If playability still violates the plan's hard bounds,
record the stop and end;otherwise retain remaining failed targets as open issues.
The fitness event table is still unrun;full report remains step6 only,once.
