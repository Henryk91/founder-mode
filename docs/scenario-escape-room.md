# Scenario spec: escape room in Munich (working name "Ausgesperrt")

Source of truth for the first leisure scenario. Read `docs/leisure-mechanics.md` first, then `docs/scenario-hotel.md` (whole bookings, deposits, the loan). Anything not stated here works as in those files. Where the engine design differs from what is assumed here, keep the intent, adapt the mechanics, and record the change in `docs/decisions.md`.

**All numbers are starting points.** Figures marked (est.) are my estimates. Check them against current Munich sources (2025 or 2026) and cite them in section 15, or keep the label. Tune everything against the targets.

"Ausgesperrt" means locked out. The founder's previous employer used the word about their access badge.

## 1. Premise

The player was a game designer at a Munich software company until it closed. They lease a basement in Untersendling with space for four rooms, and build their first escape room. Groups of two to six people get 60 minutes to escape a themed room by solving puzzles, with a game master watching on camera and dropping hints.

### What this scenario teaches

1. **A product has a life.** Every local group plays a room once. When the city has played it, demand fades. The next room must be ready before that.
2. **Theme is a market choice.** A horror room thrills friends and scares off company teams. A Munich history room sells to tourists.
3. **Evenings and weekends are the business.** A weekday afternoon slot is nearly worthless unless someone sells it to companies.
4. **Building is a bet.** Each room costs as much as a year's profit from one room.

## 2. Starting values

| Value | Start | Note |
|---|---|---|
| Mode | Long only, 104 weeks | Week 1 is the first week of August. The first room opens after its build (8 weeks), in early autumn, the start of the indoor season |
| Company cash | 55,000 | Own money put in (est.) |
| Personal savings | 14,250 | As elsewhere |
| Founder living costs | 675 per week, rising a tenth from week 53 | As Kantino long mode |
| Company fixed costs per month | Basement lease, 240 m², 4,200 (est., about 17.50 a square metre), insurance 200 (est.), booking software 80, accountant 225, electricity and internet 350 (est.) | |
| First room | Being built at the start: 30,000 (est.), ready in week 9. The player picks its theme in week 1 (section 4) | |
| Founder | Designs puzzles (prep hours), builds with help, can be the game master for one room at a time | |
| Bank loan | Available (fictional "Isartal Sparkasse"). Items: each new room, the meeting room, the VR room (the temptation), working capital | |
| Funding | Not available | |

## 3. Slots

| Slot | Hours | Games per room |
|---|---|---|
| Weekday daytime | Monday to Friday, 10:00 to 17:00 | 4 a day |
| Weekday evening | Monday to Friday, 17:00 to 23:00 | 3 a day |
| Weekend | Saturday and Sunday, 10:00 to 23:00 | 7 a day |

A game takes 60 minutes plus 30 minutes for briefing and reset (est.). Hard capacity: one group per room per game.

## 4. Products

### 4.1 Rooms

Each room is built once with a theme. Building takes 8 weeks (est.) and closes nothing else. A room can be rebuilt with a new theme later (25,000, 6 weeks, the room closed).

| Theme | Build cost (est.) | Appeal |
|---|---|---|
| `heist` (a bank vault) | 30,000 | Everyone; companies like it |
| `horror` (an abandoned asylum) | 30,000 | Friends love it; companies avoid it; families avoid it |
| `munich_history` (a 1920s brewery mystery) | 32,000 | Tourists and families; locals somewhat |
| `kids_adventure` (a pirate ship, for 8 to 12 year olds) | 28,000 | Families and birthday parties, weekend daytime |
| `vr_room` (virtual reality) | 40,000, headsets replaced every 2 years | The temptation (4.3) |

Freshness (`docs/leisure-mechanics.md` section 5): each theme has a hidden local pool of groups who would ever play it (est. 2,500 to 6,000 groups for a mainstream theme). Every local game uses one up, and demand from locals falls as the pool empties. Tourists come fresh every week; companies return slowly.

### 4.2 Support products

| Id | Name shown | Prep hours | Cost (est.) | Required by |
|---|---|---|---|---|
| `online_booking` | Online booking with time slots | 10 | system 80 a month | locals |
| `english_games` | Games and hints in English | 15 per room | translation and props, 800 per room | tourists |
| `team_package` | Team events: two rooms in parallel, a debrief, invoices | 15 | none | companies |
| `meeting_room` | A small room for briefings, snacks and the debrief | 10 | 8,000, uses the fourth room's space | companies |
| `gift_vouchers` | Vouchers for birthdays and Christmas | 5 | none | none; locals buy them in December |

### 4.3 The temptation

`vr_room`: every visitor asks about it, the trade magazines love it, and the hardware is out of date in two years. Locals try it once. Nobody's must-have.

## 5. Segments

| | Locals | Tourists | Companies |
|---|---|---|---|
| Id | `locals` | `tourists` | `companies` |
| Description shown | Friends, couples and families from Munich and around | Visitors to Munich looking for something to do in the evening or on a rainy day | Teams booking an event, from start-ups to large firms |
| Booking unit | Per group of 2 to 6 | Per group of 2 to 6 | Per event of 6 to 24 people (2 to 4 rooms in parallel) |
| Requests per week at peak (reachable, est.) | 40 to 120 groups | 10 to 40 groups | 1 to 5 events |
| Willingness to pay (est.) | 100 to 150 a group | 110 to 170 a group | 30 to 45 a person, plus the package |
| Lead time | 0 to 3 weeks | 0 to 1 week | 2 to 8 weeks |
| Slots | Evenings and weekends | Any, mostly evenings | Weekday daytime and early evening |
| Season shape (hidden) | October to April high, summer low, December gift peak | Spring to autumn, Oktoberfest peak in late September | Autumn and November to December (Christmas parties), spring |
| Must haves | `online_booking` | `english_games` | `team_package`, `meeting_room` |
| Theme preference | Varies per run; horror loved or hated | History and heist | Heist; never horror |
| Channel response: platform (activity marketplace, 20%, est.) | medium | high | low |
| Channel response: own website | high, grows with reviews | low | medium |
| Channel response: partnerships | none | hotels and hostels: medium | event agencies: high |
| Channel response: outreach | low | none | high |
| Payment | At booking | At booking | Invoice, 30 days |

Roles viable, mediocre and trap, shuffled per run.

A polite trap example: company teams who love the idea, ask for a free test game for the HR team, then book a bowling alley.

## 6. Experiments

| Experiment | Version here | Signal |
|---|---|---|
| Interview | Friends, hotel concierges, HR people | Pain buckets, theme preferences, budget hints |
| Play test | Free test games for 4 groups from one segment in a finished room | Reviews, referrals, honest remarks about the theme and difficulty |
| Test listing | Two weeks on the activity platform | Bookings, mostly tourists and locals |
| Vouchers | Gift vouchers in December | Cash now, owed later |

## 7. Staff

| Role | Pay (est., verify) | Does |
|---|---|---|
| Game master | 15 an hour; minijob or part time | Runs one room at a time (two with experience) |
| Builder | 300 a day freelance | Speeds up a room build (2 weeks less with two builders) |

Minimum wage and the minijob limit as in the tourism scenarios (check the current values). Each game takes about 1.5 game master hours.

## 8. Pricing

Per room, per slot and per group size (a price for 2 and a price per extra person, est.). Off-peak (weekday daytime) may be priced lower. Company packages per person.

## 9. Reviews

Driven by:

- difficulty against the group (a hint policy: generous or strict);
- the game master's attention;
- freshness of the props (a worn room reviews lower);
- the theme against the segment.

## 10. Stages

The rooms are this scenario's progression. Office stages 1 and 2 only:

| Stage | Name | Effect |
|---|---|---|
| 1 | Basement with four room spaces | Start |
| 2 | Finish reception and briefing space in the existing basement (8,000 once, 500 a month, est.) | Better service; the same four physical spaces |

Scene drawings: a basement corridor with four doors and a camera desk; then a finished reception and briefing table in the same basement. Same muted style. The no-second-location rule in plan 5 takes precedence over the original across-the-road proposal.

## 11. Content

| Type | Target |
|---|---|
| Intro cards | 4: the job that ended, the basement, the three kinds of player and the theme question, the money and the build |
| Scenario events | At least 40. Ideas below |
| Interview quotes | At least 10 per bucket per segment |
| Names | Invented: firms, hotels, staff, groups |

Event ideas:

| Idea | Tension |
|---|---|
| A group breaks a prop trying to open a door that was never a door | Repair now or run it broken |
| A rival opens a horror room two streets away | Your locals' pool shrinks |
| A large firm wants all four rooms on a Saturday for 24 people | Turn away 7 local bookings or decline |
| A travel blogger's video of your history room | Tourists, and a theme you may not have |
| The fire inspector counts the exits | Hours and a fix, or a fine |
| A game master posts the solution online | Freshness falls overnight |
| A school class wants a morning game at a discount | Fill a dead slot cheaply |
| The landlord wants the fourth room for storage | Negotiate or lose the space |
| December: everyone wants vouchers | Cash now, a busy January |
| A group stays 20 minutes over; the next group waits | Policy on late finishes |
| The neighbours upstairs complain about screaming on Friday nights | Soundproofing, quieter games, or a letter from their lawyer |
| A puzzle designer offers to sell you a finished room design | Faster build, a fee |

Interview quote examples:

| Bucket | Example |
|---|---|
| Not a problem | "We play board games at home. The cat is the escape room." |
| Mild | "We did one in Hamburg. It was fine. The hints were rude." |
| Noticeable | "Every room in Munich is booked on Saturday by Wednesday." |
| Painful | "I need something for 18 people on a Thursday that is not bowling and not another brewery." |
| Urgent | "Our team event is in nine days, the venue cancelled, and my boss has already sent the invitation." |

## 12. Rough expectation

The first autumn sells the first room to locals. By spring, the locals who wanted it have played it. A player who builds the second room over the winter, chooses its theme from what the interviews and bookings showed, and sells weekday slots to companies has a steady year 2. A player who builds four rooms at once owes the bank for rooms nobody books on Tuesday afternoons.

This is a back of the envelope expectation. The bot report is the real answer.

## 13. Scenario targets

On top of the tourism targets T1 to T18 and E1 where they apply (the plan decides which and records it). T4 is measured from opening.

| # | Target |
|---|---|
| X1 | Products have a life: a bot that never builds a second room loses at least 5 points, and a bot that builds a new room every three months loses at least 3 |
| X2 | Theme is a market choice: a theme-blind bot (random themes) loses at least 2 points to the careful bot |
| X3 | Selling dead slots pays: a bot that never sells weekday daytime to companies or at a lower price loses at least 2 points |
| X4 | The VR room is a trap: building it in the first year loses at least 3 points |

## 14. Accent

Established accent `#5B2A86` (check white text reaches 4.5:1).

## 15. Sources and values as built

Checked 19 October 2026. These are game estimates, not a quote for a real Munich lease or fit-out.

- [A Munich operator's price list](https://www.escaperooms-muenchen.de/preise/) lists EUR86 for two people, EUR120 for four and EUR144 for six. This supports the order of magnitude of a group game. The initial game prices, EUR125 local and EUR140 visitor at peak, remain estimates for a typical group. Company games include the debrief and administration; their EUR180 per room-game is an estimate.
- [BMAS minimum-wage guidance, dated January 2026](https://www.bmas.de/EN/Labour/Minimum-Wage/the-minimum-wage-questions-and-answers.html) gives EUR13.90 gross an hour in 2026 and says employer contributions are additional. The flexible game-master shift is five hours for EUR90, covering three 90-minute games and handover. This assumes EUR15 gross plus about 20% employer costs. Permanent, part-time and seasonal costs are estimates including employer costs; a fixed contract also pays for idle time. This abstracts employment categories rather than modelling individual minijobs or payroll law.
- Rent for the specific 240 m² basement, build prices, prop wear, translation, room refreshes, professional fees and activity-marketplace commission remain estimates. No matching current commercial lease or supplier quotation was found. A residential rent index would not substantiate a commercial basement rent.
- The local group pool, reachable demand, role multipliers, season curves and theme life are simulation estimates. They do not claim to count Munich residents who would buy a particular room. Every balancing change and measured result will be recorded below after the scenario's tuning rounds.

### Adaptations to the weekly model

- One unit is one room-game for a group. A company enquiry contains two to four room-games, representing a larger team; its price is per room-game rather than an invented exact headcount. Named slots describe parts of a week, not individual start times.
- The plan excludes a second location. Stage 2 therefore finishes reception and briefing space within the existing basement instead of leasing another basement across the road. The draft fit-out is EUR8,000 plus EUR500 a month, both estimates.
- Design work and elapsed construction are separate: founder preparation must finish before the eight-week construction wait. Contracted construction is included in the room price. A generic freelance builder can help with preparation; it does not promise an unsupported two-week cut to the calendar.

### Initial values in the YAML

These precede balancing; measured adjustments will be added here.

| Value | As built | Reason |
|---|---|---|
| Local games | Peak EUR125, off season EUR110; daytime EUR100 / EUR88 | A typical group; daytime discount is an estimate |
| Visitor games | Peak EUR140, off season EUR125; daytime EUR112 / EUR100 | English games, typical group; estimate |
| Company games | Daytime EUR180 / EUR160; evenings and weekends EUR207 / EUR184 | Per room-game, debrief and administration; estimate |
| Weekly room capacity | 20 daytime, 15 evening, 14 weekend | The spec's games per day, aggregated into weekly slots |
| Physical spaces | Four; each theme and the meeting room takes one | Meeting space competes with a fourth room |
| Company enquiry | Two to four room-games; at least two areas ready by the requested week | A larger group needs multiple rooms |
| Flexible staff | EUR90 per five-hour shift, three games | EUR15 gross plus assumed employer costs |
| Contracts | Permanent EUR720/week for eight shifts; part time EUR370 for four; seasonal EUR750 for eight | Includes employer costs and idle time; estimate |
| Stage 2 | EUR8,000 once, EUR500/month | Finished reception in the same basement; estimate |
| Construction | 24 founder preparation hours, then eight weeks | Design work and elapsed contracted building are distinct |

Room prices, rebuilds, local pools, demand, seasonal curves and platform commission otherwise retain the spec's starting estimates. There are 48 authored decision events plus the first-theme choice and reception offer, and 150 interview quotes.

