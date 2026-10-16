# Scenario spec: outdoor adventure company (working name "Gratwanderung")

Source of truth for the first tourism scenario. Read `docs/AUTONOMOUS_PLAN.md` (sections 7 and 8) and `docs/tourism-proposal.md` first: this file assumes the bookings engine, capacity that expires, seasons, weather, staff rosters, reviews and situational events from steps 3 and 4. Where the engine design differs from what is assumed here, keep the intent and adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates and must be checked against current sources and cited in this file, or kept and labelled as estimates. Tune everything against the targets. Money in EUR here, integer cents in content.

A "Gratwanderung" is a ridge walk, and also a German idiom for a balancing act. The player can rename the company at the start if the game supports it; otherwise keep the name.

## 1. Premise

The player is a state-certified hiking and climbing guide who starts a guided outdoor company in a fictional Alpine market town about an hour south of Munich. They have a van, some gear, a lot of mountain knowledge and no business experience. Three kinds of customer might want guided days out. In each run only some of them really do, and the player does not know which.

### What this scenario teaches

1. **Seasons decide cash flow.** Most money arrives in four summer months. The player must survive November and April, and decide what winter is for.
2. **Weather is a business risk.** Bad weather cancels days. The cancellation policy and a bad weather alternative decide who pays for it.
3. **Booking platforms are fast and expensive.** They fill tours early but take a large cut and own the customer relationship.
4. **Safety and staffing limit growth.** Certified guides are scarce in peak season. Every extra group needs one.
5. **The lucrative customer is slow.** Companies pay well per day but book months ahead and pay invoices late.

## 2. Starting values

| Value | Start | Note |
|---|---|---|
| Mode | Long only, 104 weeks | Week 1 is the first week of March, so the player has about 12 weeks before summer |
| Company cash | 18,000 | Includes the founder's own money put in (est.) |
| Personal savings | 14,250 | As in Kantino |
| Founder living costs | 675 per week, rising a tenth from week 53 | As Kantino long mode |
| Company fixed costs per month | Liability insurance 300 (est.), van lease 750 (est.), phone, software and booking system 120, accountant 225, storage garage 250 (est.) | |
| Starting gear | Hiking kit for 12 people (poles, first aid, radios). No via ferrata, canyoning or snowshoe sets | |
| Founder | Can guide hikes and via ferrata alone, canyoning only with a second certified guide. English good | |
| Funding | Available as in long mode, optional | |
| Bank loan | Available from step 6 if built, optional | |

## 3. Segments

### 3.1 Fixed properties

| | Tourists | Team events | School and youth groups |
|---|---|---|---|
| Id | `tourists` | `team_events` | `school_groups` |
| Description shown | Visitors from Germany and abroad on holiday in the region | Munich companies booking a day out for a team | Schools, clubs and youth groups on class trips |
| Booking unit | Per person, groups of 1 to 6 | Per group of 10 to 30 | Per group of 20 to 30, priced per person |
| Weekly requests at peak (reachable) | 15 to 45 | 0.5 to 2.0 | 0.3 to 1.2 |
| Willingness to pay | 70 to 140 per person per day (est.) | 1,800 to 4,500 per group day (est.) | 15 to 35 per pupil per day (est.) |
| Lead time | 1 to 14 days | 4 to 12 weeks | 8 to 24 weeks |
| Season shape (hidden, roughly) | High June to September, small peak in winter weekends | Spring (April to June) and autumn (September to October), almost none in August and December | May to July and September only |
| Must haves | `english_tours`, `online_booking` | `bad_weather_plan`, `transfer`, `invoice_billing` | `safety_concept`, `group_pricing` |
| Channel response: platforms | high | none | none |
| Channel response: own website | low at first, grows with reviews | medium | low |
| Channel response: partnerships | hotels and holiday flats: medium | HR and event agencies: medium | tourism office and youth hostels: medium |
| Channel response: phone and in person | low | medium | high (teachers want to talk to a person) |
| Cancellation tendency | High, mostly weather and last minute | Low, but a cancelled group is a big loss | Medium, illness and school rules |
| Invoice lateness and never pays | Paid at booking | 30 days mean, 3% never pay (lose the customer) | 20 days mean, 1% never pay |

Willingness to pay and request rates are hidden per run, drawn from these ranges, as in Kantino. Budget hints in interviews work as in the existing scenarios.

### 3.2 Roles

Viable, mediocre and trap, shuffled across the three segments per run, with the same pain and politeness logic as Kantino. A polite trap segment says lovely things in interviews and books a free pilot day, then never books again or only at a price that does not cover the guide.

## 4. Products (the equivalent of features)

Products take founder hours to prepare (routes, risk assessments, partners), sometimes equipment, and they define what can be sold. A product's capacity per day depends on guides and gear.

| Id | Name shown | Prep hours | Equipment | Capacity per guide | Season | Required by |
|---|---|---|---|---|---|---|
| `half_day_hike` | Half day guided hike | 8 | none | 12 people | All year except deep snow | none, it is the starter product |
| `english_tours` | Tours in English | 10 | none | n/a | all | tourists |
| `online_booking` | Online booking with instant confirmation | 20 | booking system 40 a month | n/a | all | tourists |
| `via_ferrata` | Via ferrata day | 20 | sets at 180 each (est.) | 6 people | June to September | none |
| `canyoning` | Canyoning day | 30 | wetsuit, helmet and harness sets at 450 each (est.), needs two certified guides | 8 people per two guides | July to September, closed after heavy rain | none |
| `snowshoe` | Snowshoe tour | 15 | sets at 120 each (est.) | 10 people | December to March | none |
| `bad_weather_plan` | Bad weather alternative (climbing hall partnership) | 25 | hall fee per use | as booked | all | team events |
| `transfer` | Bus transfer from Munich | 10 | partner bus per use (est. 600 to 900 a day) | as booked | all | team events |
| `invoice_billing` | Invoices and offers for companies | 10 | none | n/a | all | team events |
| `safety_concept` | Written safety concept and consent forms | 30 | none | n/a | all | school groups |
| `group_pricing` | Group price list and free places for teachers | 5 | none | n/a | all | school groups |
| `ebike_fleet` | E-mountain bike tours | 40 | 12 bikes at about 4,000 each (est.), or a lease | 8 people | May to October | nobody |

`ebike_fleet` is the temptation: every visitor asks about e-bikes, the brochures are full of them, and it costs as much as the whole first summer's profit. No segment requires it. A player who builds it without evidence learns the lesson of Zollstock's client marketplace, in kit form.

Shipping a product has no bugs. Instead it has an **incident risk**: a new product's first runs carry a small chance of an incident (a sprained ankle, a lost hiker, a wet group) that costs a review point and sometimes a refund. The risk falls with each run of that product and rises with tired guides.

## 5. Experiments

| Experiment | Version here | Signal |
|---|---|---|
| Interview | As Kantino: a conversation with someone from a segment, in person or by phone | Pain buckets, feature mentions, budget hints |
| Pilot day | A free or cheap guided day for a few people from one segment. Costs a full founder day and some gear wear | Bookings and referrals afterwards, honest feedback, and a review if it was a tourist |
| Test listing | A listing on a booking platform for two weeks at a test price | Sign ups and clicks, mostly tourists; says almost nothing about the other two segments |
| Vouchers (pre-sale) | Gift vouchers sold in winter for summer tours | Cash now, and evidence of real demand. Unredeemed vouchers are a liability, not income |

## 6. Channels and bookings

| Channel | Cost | Effect |
|---|---|---|
| Booking platforms | 20 to 30% commission per booking (est., verify) | Fast tourist reach. Reviews on the platform raise conversion. The customer belongs to the platform: no repeat contact |
| Own website | Founder hours, some ads | Slow to start, no commission, grows with reviews and repeat guests |
| Partnerships | Founder hours, a small cut or free places | Hotels and holiday flats send tourists, agencies send teams, the tourism office and youth hostels send schools |
| Phone and in person | Founder hours | Works for schools and teams, barely for tourists |

**Cancellation policy** (player decision, can be changed every few weeks): flexible (full refund up to 24 hours before, rebooking on bad weather) or strict (no refund within 7 days, weather days rebooked only when the guide cancels). Flexible converts better, especially with tourists. Strict protects cash on bad weather weeks. Neither is always right.

## 7. Staff

| Role | Pay (est., verify) | Notes |
|---|---|---|
| Certified mountain guide (freelance) | 350 to 450 per day | Needed for via ferrata and canyoning groups beyond the founder. Scarce in July and August: bookings must be made weeks ahead or they are unavailable |
| Hiking leader (freelance) | 180 to 250 per day | Can lead hikes and snowshoe tours |
| Office help (part time or minijob) | Minijob rate as in current German rules (verify) | Takes over booking admin and phone hours |

Freelance guides are booked per day through the roster in the planner. They are the freelancer system from Phase 9, applied to days. An overbooked week without enough guides means cancellations by the company, which costs reviews.

## 8. Seasons and weather

- **Season curves** per segment as in 3.1, hidden in exact shape. Signals: last year's bookings in year 2, the tourism office's newsletter (an event), partner hotels' occupancy remarks, forward bookings in the calendar.
- **Weekly weather** in four states: good, mixed, bad, dangerous (thunderstorms or heavy rain). The forecast for the coming week is shown and is right most of the time. Bad days cancel tourist bookings under a flexible policy, dangerous days close canyoning and via ferrata whatever the policy.
- **Winter**: snow from December to March in the mountains, a dead season in November and April.

## 9. Pricing

Per product and per season (peak July and August, shoulder, winter). The existing smooth price curve and "Too expensive" reasons apply. Team events are priced per group, schools per pupil with free places for teachers.

## 10. Reviews

A public rating out of 5, starting with no reviews. Driven by: guide to guest ratio, founder energy on guiding days, incidents, cancellations by the company, weather handling (an alternative offered or a refund given). Reviews raise conversion on platforms and the own website, and drive word of mouth (the referral system).

## 11. Stages

| Stage | Trigger | Effect |
|---|---|---|
| Van and garage | Start | None |
| Small base in town | Offered by an inbox event once revenue covers costs for two months, or in week 30 | Rent 900 a month (est.), walk-ins from tourists, gear storage that cuts prep hours, and a shopfront for vouchers. Strong when tourists are viable, a cost when they are not |

Scene drawings: a van with roof boxes in front of a garage, then a small shopfront with ropes and helmets in the window and mountains behind. Same muted style as the existing scenes.

## 12. Content

| Type | Target |
|---|---|
| Intro cards | 4. Card 2 describes the company and the town, card 3 the three customer groups and that weather and seasons rule this business |
| Scenario events | At least 40, using situational events. Ideas below |
| Interview quotes | At least 10 per bucket per segment |
| Company and customer names | Invented: hotels ("Gasthof Zur Post Oberau"), firms ("Kessler Logistik GmbH"), schools ("Realschule Penzberg Klasse 8b"). No real firms |

Event ideas (Claude Code writes the texts, 2 to 4 sentences, dry):

| Idea | Tension |
|---|---|
| A thunderstorm warning for Saturday, 14 guests booked | Cancel early and refund, or wait and risk it |
| A guide calls in sick on the busiest weekend in August | Cancel a group, guide two groups yourself, or pay a premium guide |
| A booking platform offers "featured placement" for a higher commission | More bookings, smaller margin, more dependence |
| A tourist leaves a one-star review because the summit was in cloud | Reply publicly, offer a refund, or ignore |
| A company wants a team event for 60 people next week | Big money, not enough guides |
| The local mountain rescue asks for a donation | Goodwill and reputation against cash |
| A school teacher asks for the safety concept in writing, by Friday | Hours now against a group later |
| An influencer wants a free canyoning day | Reach against a day's capacity |
| The van fails its inspection | Cash, and no transfers until fixed |
| A hotel owner offers to send guests for a 15% cut | A partnership at a price |
| Heavy rain closes the canyon for a week in July | Refunds or rebooking |
| A competitor undercuts your hike price by a third | Match, hold, or differentiate |

Interview quote examples (tone guide only):

| Bucket | Example |
|---|---|
| Not a problem | "We just walk up the hill ourselves. It has a sign." |
| Mild | "A guide would be nice. The kids never listen to me on the mountain." |
| Noticeable | "Last year we booked a team day and the bus never came." |
| Painful | "I need forty people on a mountain in June and back by six, and nobody answers my emails." |
| Urgent | "Our offsite is in five weeks, the venue cancelled, I will pay what it costs." |

## 13. Rough expectation (by hand, not simulated)

Spring is hard: little income, lots of preparation, and the temptation to buy gear. A player who validates in spring (interviews, a pilot day, vouchers) and enters summer with the right products and enough guides booked has a strong first summer and must then make the money last through the dead season. A player who builds for a polite trap segment has a quiet summer and an expensive winter. Year 2 should be easier for a player who learned the seasons, and the post-mortem should show the season curves they could have inferred.

This is a back of the envelope expectation. The bot report is the real answer.

## 14. Sources and values as built (step 5)

Checked figures (2025 and 2026 sources):

- Platform commission: GetYourGuide's supplier fee is 20 to 30% of the price (getyourguide.supply). Content: 25%.
- Mountain guide day: the German guides' association (VDBS) recommends about 480 to 550 EUR a day for private clients (secondary sources, e.g. wandernundmehr.at). Content: 480 EUR a freelance shift.
- Hiking leader: up to about 215 EUR a day with tour operators (asi-reisen.de job advert). Content: 215 EUR.
- Minimum wage 13.90 EUR an hour and minijob limit 603 EUR a month from January 2026 (informationsportal.de).
- Via ferrata lanyard about 88 to 127 EUR (check24, bergsteigen.com); e-MTB 3,000 to 6,000 EUR each (bike-magazin.de; estimate for a fleet price).

Changed from this file while tuning (reasons in `docs/decisions.md`, step 5): school groups demand 6 to 12 groups a week at peak (was 0.3 to 1.2) with four classes a day; tourists' willingness to pay 60 to 120 EUR (estimate, was 70 to 140); a run is won when its last 13 months together cover every cost.

## 15. What changed in plan 2, and why

Reasons in `docs/decisions.md`, plan 2 steps 1 to 4 and the plan 2 audit.

- **Experiments (5):** a pilot day (eight people from one group the player picks; tourists leave a review) and a test listing (two weeks on the platform, 85% tourists) replace the landing tests and pre-sales. Gift vouchers sell to tourists in winter and are owed until redeemed.
- **Staff contracts:** permanent, part time and seasonal contracts for guides and hiking leaders beside freelance shifts.
- **Guests take the founder's time:** 0.08 h a guest served last week, up to 20 h.
- **Events:** guests sent by events come only in the situation the text names (in season, with a good rating), and ten shared events reward effort only where their text says so.
- **School groups:** demand stays above the spec. After plan 2 step 4 kept 9 to 12 groups a week at peak, the plan 2 audit priced a school day at 750 EUR a class (30 EUR a pupil, est.; willingness to pay 500 to 1,100 a class) and lowered demand to 5 to 8 groups; 4 to 7 left schools 17 points behind the other groups. The spec's 0.3 to 1.2 cannot carry a school-focused company.
- **Team events:** a strict policy converts 70% of requests (was 80%, est.), so flexible terms are right for teams and strict terms for tourists.

## 16. What changed in plan 3, and why

Reasons in `docs/decisions.md`, plan 3 steps 1, 2 and 4; the stages in `docs/office-stages.md`.

- **Office stages 3 to 5:** a gear store and meeting point (1,400 EUR a month, 8,000 to move in; gear for twelve more on the via ferrata, a third more walk-ins), a guiding centre with changing rooms (3,200 a month, 25,000; canyoning half as big again, a weather plan for both mountain products, room for four permanent guides; moving in switches to the established look) and a second base in the next valley (5,000 a month, 15,000; snowshoe groups of 30). Stage 3 is offered once the money has covered two months or guests were turned away for lack of room in 3 of the last 8 weeks; stage 4 when they keep being turned away; stage 5 when they are turned away at the peak. Estimates.
- **Bots:** a careful company moves only when guests are turned away and its surplus over the last year (not a peak month) carries twice the added rent. Judged on a summer month, it moved into a winter's rent and won 19% of those runs against 56% for staying.
- **Open:** moves happen only in runs already won and cost money there (targets T19 and T21, O1 and O3).
