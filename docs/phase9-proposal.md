# Phase 9 proposal: freelancer, long mode, funding

Part A of Phase 9: design only. No code and no values have changed. Every number here is a starting value to be measured by bots, like every number in the plan.

Read with `docs/IMPLEMENTATION_PLAN.md` (section 7 for targets 1 to 18), `docs/balancing.md` and `docs/decisions.md`.

## 0. Summary

| Part | What | Recommendation in one line | Size (part time) |
|---|---|---|---|
| B | Freelancer | Rented developer or salesperson at a fixed, visible output: about 1.4 times the hire's cost per hour of real work, no search, one week's notice. It adds no random draws while unused, so the 60 week report stays identical until a bot books one | 1.5 to 2 weeks |
| C | Long mode | 104 weeks, picked on the Start screen, the same scenario with a `long` override block. Year 2 brings a living cost step and market saturation (segment size finally used). Also more than one hire, so a bootstrapped company can grow from revenue | 4 to 5 weeks |
| D | Funding | Angel and seed round only, long mode only, raised through an investor pipeline that costs founder hours, with money arriving at closing. Ownership goes into the post-mortem and best runs, plus one new ending for a funded company that is still growing | 4 to 6 weeks |
| E | UI | Mode picker, freelancer and team in the Plan tab, a "Raise" section, a cap table on Money, investor letters, ownership in the post-mortem. Screen review at 375 and 1440 px | 2 to 3 weeks |

Biggest risks: balancing funding (D), because "neither strategy dominates" needs two measures, how often you win and how much you own. Next is keeping year 2 of long mode from going dead (C). The freelancer is low risk as long as the reference bot does not have to use it (see 1.9).

### My view on your starting choices

1. **Funding only in long mode: agree.** A 60 week run has money for about 30 weeks. A seed round takes 10 to 14 weeks of meetings and closing, so funded money would arrive with 15 to 25 weeks left to spend it. It would also move every one of the 18 targets.
2. **Freelancer in both modes: agree, with one caveat.** No salary pays back within 60 weeks (decisions log, "Hire (after review)"), so in the 60 week game the freelancer competes with doing the work yourself, not with the hire. "Freelancer or hire" can only be a real choice in long mode. The targets below are split that way (19 for 60 weeks, 20 for long mode).
3. **More than one hire in long mode: agree, but build it in Part C, not D.** A bootstrapped founder in year 2 hires from revenue. That is the bootstrapped path's growth lever, and without it the funding comparison in D has no fair opponent. It also lets the hire lesson (target 29) be tuned before investor money muddies it.

One more challenge, to Part B as planned: **"retune the 60 week game until all 18 targets pass again" should not be needed.** If the freelancer adds no random draws while nobody books one, every existing strategy plays exactly as today. The report must then come out identical, which is the same gate referrals passed in Zollstock part B. Retuning is only needed if you want `validate_then_build` itself to use the freelancer (open question Q1).

---

## 1. Freelancer

### 1.1 The problem it teaches

Renting work before committing to a salary. A freelancer costs more per hour of work, but there is no search, no wait, no severance and no long commitment. Rent for a burst (a long build, a few weeks of outreach); hire for steady work that lasts months.

### 1.2 Mechanics

- **What you book:** one freelancer at a time, as a developer or a salesperson (the hire's two roles), for 10 or 20 hours a week.
- **Start:** booked in the Plan tab, works from next week. No search and no candidates.
- **Output:** fixed and visible: 0.9 of booked hours become build hours or outreach hours. There is no hidden skill. The lesson is commitment, not picking people; the hire already teaches picking. A developer builds the feature the plan names. A salesperson does outreach in the market and channel the plan names, at a selling skill of 0.2 (the hire's is 0.3), and **holds no demos**. Demos stay with the founder or the hire.
- **Downsides:**
  - First week of every booking at half output, while they find their way around (onboarding).
  - Developer: every feature they put hours into ships with 1 extra bug. They do not know the code.
  - Salesperson: no demos, lower selling skill.
- **Notice:** ending a booking takes effect after the following week, which is billed. Changing 10 h to 20 h starts next week without new onboarding.
- **Billing:** weekly, from company cash, as a company cost.
- **With the one hire limit (60 weeks):** the freelancer does not count as the hire. Both can work at once. A freelancer does not reach the `first_hire` milestone and does not turn the UI organised.
- **In long mode:** the same, at most one freelancer at a time. Booking a freelancer as a candidate's "trial" before hiring is a nice idea, but left out.

### 1.3 Starting values (Kantino money scale; Zollstock the same)

The hire costs 3,900 EUR (developer) and 3,300 EUR (salesperson) per 4 week month for 20 h a week: 48.75 and 41.25 EUR per paid hour, at a hidden skill averaging 0.85.

| Value | Developer | Salesperson |
|---|---|---|
| Rate per hour | 75 EUR | 60 EUR |
| Per hour of real work (rate / 0.9) | 83 EUR | 67 EUR |
| Hire, per hour of real work (salary / 80 h / 0.85) | 57 EUR | 49 EUR |
| Premium over the hire | about 1.45x | about 1.4x |
| Week at 20 h | 1,500 EUR | 1,200 EUR |
| Hours a week | 10 or 20 | 10 or 20 |
| Notice | 1 week | 1 week |
| Onboarding | first week at half | first week at half |
| Extra bugs | 1 per feature worked on | none |
| Selling skill | | 0.2 |

Break-even against the hire, by hand: the hire costs a 6 h search, about 4 weeks before any work and 4 weeks of severance (3,900 EUR). The freelancer's premium is about 500 EUR a week at 20 h. So the freelancer should win for work under about 8 weeks and the hire for over about 14. Target 20 measures this.

**First step of Part B, before any pricing:** measure what a free freelancer is worth by situation (developer until the must haves ship, salesperson for 8 weeks after the first customer), the way the free salesperson (+10 points) was measured for the hire. Then set the rate so a burst pays when the build is long and loses when it is short. A 4 week developer burst costs 6,000 EUR at the rate above, a quarter of the starting money, so the rate is likely to come down or the 10 h block will be the useful one.

### 1.4 Options

| Option | What | For | Against |
|---|---|---|---|
| **A (recommended)** | Hours a week at a fixed, visible output | One model for both roles. No hidden values. Adds no random draws, so the report gate holds | The player manages hours each week |
| B | A fixed price quote per feature ("Daily group order, 3,400 EUR, 3 weeks") | Real freelance practice; no weekly management | Developer only. Sales has no "feature" to quote |
| C | A marketplace of three freelancers with noisy reviews | Adds picking | Repeats the hire's lesson. Adds hidden values and draws |

### 1.5 What the player sees

Name, role, rate per hour, hours a week, cost per week, "starts next week", "one week's notice", and two plain lines: "Needs a week to find their way around" and, for a developer, "Does not know your code. Expect a bug more per feature." These are rules of the game, not hidden values. The weekly results show the hours worked and the bill. The post-mortem's money section adds "freelancer: cost, and what they built or found", next to the hire's line. No probabilities.

### 1.6 Engine and save changes

- `TeamState.freelancer: { role, hoursPerWeek, startWeek, endWeek | null } | null`.
- `WeekPlan.freelance: { book: { role, hoursPerWeek } | null, end: boolean, build: FeatureId | null, outreach: { segmentId, channel } | null }`. Validation: one booking at a time, a valid feature and channel.
- `teamOutput` returns the freelancer's output next to the member's. Product adds their bugs at shipping; sales runs their outreach through the existing outreach code with its own selling skill and saturation.
- **Money:** a new `WeekLedger.freelanceCents`. It must count as a company cost in `profitableForMonths`, in runway, and in the "covers company costs" milestones. See blocker 3 in section 5: today only fixed costs and living costs count towards the win, so a freelancer booked as an "other cost" would slip past the win test while a salary does not.
- `Lead.source` gains `freelancer`, so target 15 and the post-mortem sources count it.
- Condition path `hasFreelancer` for inbox events. About 4 shared events: a freelancer is late, raises the rate, offers to stay on as a hire (a hint, no mechanic), asks for a review.
- Scenario: `team.freelance` block (rates, blocks, output share, onboarding, extra bugs, selling, notice). Engine 0.12.0. Saves from 0.11.0 get the restart notice; the fingerprint changes with the new keys anyway.
- Gate test: with no booking, a fixed list of seeds per strategy gives deep equal states to 0.11.0 (as for referrals).

### 1.7 Bots

| Bot | Rule |
|---|---|
| `validate_then_build_freelance_build` | Books a developer for 20 h when it picks its market, if the unbuilt must haves it believes in come to 100 h or more. Ends the booking when they ship |
| `validate_then_build_freelance_sales` | Books a salesperson for 20 h for 8 weeks after the first customer, outreach in its market |
| Free freelancer diagnostic | Both at a rate of 0, report only, to size the value of the work (step 1) |
| Long mode: `hire_burst`, `freelance_burst`, `hire_steady`, `freelance_steady` | For target 20: a developer for the build only, and a salesperson from the first customer to the end, each by hire or by freelancer |

### 1.8 New targets

**19. The freelancer is a decision, not a default (60 weeks, each scenario, 10,000 seeds).** `validate_then_build_freelance_build` against `validate_then_build` on the same seeds, split by the build hours of the market the bot chose (observable on screen): with 120 h or more it gains at least 2 points; with 90 h or less it loses or stays within its margin of 0. Overall it is not more than 5 points ahead. Within its own margin of a limit counts as at the limit, as for 17.

**20. Rent for a burst, hire for the long run (long mode, each scenario, 10,000 seeds).** Same seeds: for the build burst, `freelance_burst` beats `hire_burst` by at least 2 points; for steady sales from the first customer to the end, `hire_steady` beats `freelance_steady` by at least 2 points.

Also reported, without a target: the freelancer variants in targets 2, 3, 6 and 15. A freelancer variant above 45% would show the freelancer is too cheap.

### 1.9 Risk to existing targets

- **If the reference bot does not book (recommended):** none. The report is identical by construction; the gate test proves it.
- **If `validate_then_build` books situationally:** targets 2 (45% cap), 6 (spread: the long builds are coworking and contractors, so their viable runs would gain most), 14, 15, 17 and 18 move. Target 18 (Kantino at 23.6 of 25) and Zollstock's 17 worst market are the likeliest to tip. Expect one or two tuning rounds of the freelancer's own values, not the scenario's.

### 1.10 Size

Engine 3 days, content and events 1 day, bots and report 2 days, diagnostic and pricing 2 to 3 days, docs 1 day. **About 1.5 to 2 weeks.** Long mode's target 20 waits for Part C.

---

## 2. Long mode (104 weeks)

### 2.1 The problem it teaches

The second year: once the first customers pay, what keeps a company alive? Rising personal costs, a market that runs out of easy leads, churn that compounds over time, and whether to grow with people (hires) or stay small. In D it also becomes the room in which funding makes sense.

### 2.2 How the player picks it

The Start screen gets a second choice under the scenario picker: "60 weeks: bootstrapped" or "104 weeks: the long game". The text names what is different (a second year, more than one hire and, after Part D, investors). The last choice is remembered per scenario, like the scenario itself.

### 2.3 Where the values live

| Option | What | For | Against |
|---|---|---|---|
| **A (recommended)** | A `modes.long` block in each `scenario.yaml` that overrides base values (deep merge, arrays replaced). The content loader resolves `loadScenario(id, mode)` into an ordinary `Scenario` with `mode: 'long'` | The engine stays unaware of modes beyond reading values. The standard scenario resolves to exactly today's object, so its fingerprint is unchanged and saves stay valid. Each mode is balanced by its own values | Override blocks can grow; the zod schema needs a partial of the scenario |
| B | A separate scenario per mode (`kantino-long`) with an `extends` key | Simple to reason about | Duplicates ids in the picker, best runs and saves; two fingerprints drift apart by accident |
| C | Mode multipliers in engine code | Little content | Breaks rule 5 (numbers in YAML) |

So yes, these are **scenario values per mode**, as overrides.

### 2.4 Values that change in long mode

| Value | 60 weeks | Long mode (start) | Why |
|---|---|---|---|
| `maxWeeks` | 60 | 104 | |
| Starting cash and savings | 9,000 and 14,250 | **Same** | Same pressure at the start. The first 30 weeks play like today, so target 25 mirrors 7 and 8 cleanly. More money is what funding is for |
| Living costs | 675 a week | 675, then **+10% from week 53** (`founder.livingSteps`) | A second year that costs more; the flat and the founder's patience. One visible message announces it |
| Win condition | Profitable in each of the last 2 months | Profitable in each of the **last 3 months** (`win.profitableMonths`; today a constant in `endings.ts`) | A long game should prove it lasts |
| Market saturation | Off | **On**: each segment's reachable companies (`size`, drawn today but unused) shrink with every lead found there. Outreach response x (1 - found / size), with a floor of 0.3 | Year 2 asks whether to widen the market. It makes the small, rich markets (coworking 100 to 300, contractors 120 to 320) a real trade off. Sizes need retuning for this |
| Churn | As today | As today, plus a **renewal check** at each customer's 52nd week (an extra churn roll at the monthly formula) | Teaches that the first year's customers come up for renewal. Option, see below |
| Team | One hire | **Up to 4 members**, see 2.6 | |
| Events | 109 per scenario | About 150 needed, see 2.7 | |
| Milestones | Up to `weeks_52` | Adds `weeks_78`, `weeks_104` | |

Options for year 2 pressure:

| Option | Pressure | For | Against |
|---|---|---|---|
| A | None, the run is just longer | No new systems | Winners at week 60 coast for 44 weeks; strugglers get 44 weeks to stumble into a win. The careful bot would likely win well over 45% |
| **B (recommended)** | Living cost step plus saturation | Two clear, visible pressures, and a use for `size` | Saturation risks target 24 (spread across markets), because the small markets saturate first |
| C | B plus renewals | Most realistic | Three new forces to tune at once |

### 2.5 Endings at week 104

As today, judged at week 104: Sustainable (profitable in each of the last 3 months), Still searching, Bankrupt, Burnout, Shut down. Part D adds one funded ending (3.6). The post-mortem's "what ended the run" gains year 2 causes (living costs rose past revenue, market ran dry).

### 2.6 More hires

- `team.maxMembers`: 1 in 60 weeks, 4 in long mode. One search at a time; a new search may start while others work.
- Roles unchanged (developer, salesperson), part time as today. Long mode adds **full time** for each role (40 h, 1.9 times the salary), since a funded company needs more than 20 h people.
- **Management overhead:** each working member takes 2 h of founder time a week, taken off the plan like forced hours. It makes a team cost founder hours, which keeps a solo founder with 4 hires from being free.
- Each member gets their own task in the plan (feature or market and channel). Salespeople hold demos in order of the leads, so two salespeople do not book the same demo.
- Let go per member, at the same severance.
- The organised stage still comes at the first hire or at revenue covering all costs.

### 2.7 Events pool

A 60 week run draws up to about 86 messages from 109 events. At the same rate, 104 weeks draw about 150. The weighted draw drops ineligible events before it uses any random number (`drawMessages`), so events that cannot appear in a 60 week run leave 60 week runs identical.

| Option | What | Cost |
|---|---|---|
| A | Write 45 to 50 new events | About 2 weeks of content, the slowest route |
| **B (recommended)** | About 30 new long mode events (20 shared year 2 events about the founder's life, renewals, the team and a second market; 5 per scenario), plus about 20 existing events that may come back **once a year** in long mode (`recurAfterWeeks: 52`, counted as recurring on purpose for target 16) | About a week of content |
| C | Lower the draw chance in year 2 | No content, but a quieter year 2, against target 26 |

Long mode only events need a condition. Recommended: a `modes: [long]` field on events (default both), filtered before the draw. Team events for several hires (about 6) and the funding events of Part D come on top.

### 2.8 Best runs, milestones and saves

- **Saves:** one open run per scenario **and** mode: `founder-mode.save.v1.<id>` for 60 weeks (unchanged key, so existing saves continue) and `founder-mode.save.v1.<id>.long`. `SaveFile` gains `mode` (missing means 60 weeks). `replay` resolves the scenario by id and mode, and `saveProblem` gains `mode` for a mismatch. The fingerprint is of the resolved scenario, so a long save breaks only when long values change.
- **Best runs:** kept per scenario and mode (`founder-mode.profile.v1.<id>` unchanged, plus `.long`), shown under a mode heading. Runs of different lengths are never compared. Long mode adds "largest share at the end" once Part D exists.
- **Milestones:** shared, plus `weeks_78` and `weeks_104` in the long block. "Last suggestion" is remembered per scenario and mode.
- **Continue:** shows the open run's mode ("Kantino, week 71 of 104").

### 2.9 Bots and targets for long mode without funding

Every existing strategy runs in long mode (`--mode long`). The careful bot needs year 2 rules: open a second market when its leads per hour fall below half of its first 8 weeks of selling (saturation is visible as fewer leads), and hire by the payback rule, which already reads `maxWeeks`. `validate_then_build_hire` becomes a hire rule allowing several hires.

| # | Target (long mode, each scenario) | How measured |
|---|---|---|
| 21 | `build_only` under 5%; no strategy above 60% | Mirrors 1 and 3, 1000 seeds |
| 22 | `validate_then_build` wins 25 to 45% | Mirrors 2, 1000 seeds |
| 23 | Median losing run length between week 30 and week 70 | Mirrors 4, all strategies |
| 24 | `validate_then_build` win rates across viable markets within 15 points | Mirrors 6, 10,000 seeds |
| 25 | First paying customer in week 4 to 10 in the median winning run; by week 10, 70% have a customer or have left a market that is not viable | Mirrors 7 and 8 |
| 26 | Decision news in at least 85% of weeks 1 to 20 **and** at least 70% of weeks 53 to 104 | Mirrors 9, plus year 2 must not go quiet |
| 27 | Inbox: each blind policy gains at most a third of reading's gain, reading beats every blind policy by 4 points; no event arrives twice unless it recurs on purpose; a dry week in under 1% of careful runs | Mirrors 11 and 16, 10,000 seeds; the pool table |
| 28 | **Year 2 matters.** Of careful runs profitable in weeks 53 to 60, at most 85% end Sustainable; of careful runs alive but not profitable at week 60, at least 15% end Sustainable | Split of `validate_then_build` by its state at week 60 |
| 29 | **The hire can pay in long mode.** The careful bot with its payback hire rule loses at most 1 point overall against no hire, and gains at least 2 points in at least one split by viable market | Paired, 10,000 seeds |
| 30 | 1000 long runs in under 120 seconds | Mirrors 5 |

Targets 10, 13, 14, 15, 17 and 18 are reported in long mode for information only. If one drifts badly it becomes a target later.

### 2.10 Keeping the report runtime reasonable

Today: about 23 minutes for both scenarios (main 25 s, paired 212 s, inbox 63 s, price 150 s, events 904 s). Careful runs last about 51 weeks; in long mode they will last about 85. A naive long report would take about 50 minutes, most of it the event table.

1. **Skip forced answer runs that cannot differ (exact).** A forced answer game equals the reading game up to the week the event arrives. On a seed where the event never arrives in the reading run, the forced run *is* the reading run. Reuse that result instead of playing it. Events arrive in roughly 50 to 85% of seeds, so this saves 15 to 50% of the events part in both modes, with identical numbers. A test checks a sample of skipped seeds against full runs.
2. **Modes are separate reports.** `--mode standard|long|all`. The 60 week report stays as today (about 23 minutes, less with step 1). `docs/balancing.md` gets one `#` section per scenario and mode.
3. **Long mode's event table** runs on 1000 seeds only for events new in long mode or recurring; existing events on 500 seeds, for information (target 10 is not judged in long mode).
4. **No price part in long mode** unless pricing drifts (17 and 18 are information only there).
5. **Funding gets its own part** (`--parts funding`), so tuning funding never reruns the inbox.
6. Later, if needed: branch forced answer runs from the week the event arrives instead of week 1. It needs bots that can be cloned mid run (`Player.clone`), which today's bots are not built for.

Estimate after 1 to 5: long mode report about 25 to 30 minutes, both modes about 45 to 50 minutes. That is only for the final full run. Tuning runs pick parts and stay under the 20 minute rule.

### 2.11 Risk to existing targets

None if the standard scenario resolves to today's exact object (fingerprint test) and long only events are filtered before the draw. The multiple hire code touches the one hire path that 60 week runs use, so the gate test from Part B runs again here: 60 week reports identical.

### 2.12 Size

Mode plumbing (content resolution, schema, saves, storage keys, best runs) 3 days. Living step, win months, saturation and renewals 3 days. Multiple hires 4 to 5 days. About 36 events 5 days. Bots, report per mode and runtime work 4 days. Balancing 5 to 8 days. **About 4 to 5 weeks.**

---

## 3. Funding (long mode only)

### 3.1 The problems it teaches

- Raising too early on vanity numbers: interviews and sign ups do not impress investors; paying customers and growth do.
- Raising when you do not need to: dilution with nothing to buy.
- Running out of money while raising: the money arrives at closing, weeks after the first meeting.
- Money buys people, and people raise the burn. A funded company that does not grow dies faster than a bootstrapped one.

### 3.2 Sources

| Source | First version? | Why |
|---|---|---|
| **Angel** | Yes | Small, fairly quick, possible before much traction. The "raise early" temptation lives here |
| **Seed round (fund)** | Yes | Large, slow, needs real traction. Growth expectations and pressure come with it |
| Friends and family | No: an inbox event at most | Its lesson (money with a personal cost) fits one message; as a system it overlaps the angel |
| Bank loan (KfW style) | No | Teaches debt against equity, a different lesson. Loans stay on the out of scope list |
| Grants, accelerators, revenue based financing, crowdfunding | No | Grants already exist as an event |

### 3.3 Raising as a pipeline

Raising reuses the sales pipeline's shape: investors are like leads, moved by founder hours.

1. **Start a round** (angel or seed) in the Plan tab. Preparing the deck and numbers takes 8 h once per round type (12 h for seed).
2. **Pitch hours** each week, like outreach. Each 3 h brings a meeting with an investor from the scenario's pool (fictional names in YAML; angels in an angel round, funds in a seed round). There is no list to pick from.
3. **First meeting** (in the plan, 2 h): the investor says yes to a second look or passes, with a reason.
4. **Second look** (angel: 3 h; seed: a partner meeting, 4 h).
5. **Term sheet:** amount and share, as an official letter with Accept and Decline.
6. **Closing:** angel 2 weeks (the notary), seed 4 weeks of due diligence (6 h of founder time) and then the notary. **The money arrives at closing.**

Founder hours, by hand: an angel round about 20 to 25 h over 4 to 7 weeks; a seed round about 50 to 70 h over 10 to 14 weeks. The founder sells less meanwhile, which is the real cost.

### 3.4 How investors judge, from what they can see

An investor sees only what the player sees: monthly revenue; growth over the last 3 months; paying customers; customers lost in the last 3 months; runway in weeks; whether one market brings most of the revenue (focus); the product shipped. Plus how well the founder pitches: selling skill, and the deck hours spent.

- Each round type has a **public bar**, stated in the round's description and the investor's first letter, for example "We look at companies with paying customers and growing revenue" (angel) or "Monthly revenue of about 6,000 EUR, growing about a tenth a month" (seed). These are observable facts, like the price.
- Each investor has a **hidden appetite**, drawn from a range, that shifts their bar a little. Hidden like willingness to pay; revealed in the post-mortem.
- Each meeting compares a score from the visible numbers, times the pitch factor, plus noise, with that investor's bar. It is one roll per meeting, logged as `odds` for the luck section.
- Interviews, landing sign ups and deposits count for almost nothing in the score. That is the vanity lesson: a player who raises on them gets polite passes.

**How a pitch fails, with the reason shown:** "Too early: come back with paying customers"; "Growth is flat"; "Too many customers leave"; "You would run out of money before we close" (runway under the closing time); "We do not see a focus"; or, after due diligence, "Your books are a mess" (a books backlog, which ties in the receipts events) or "Revenue dropped while we looked" (revenue fell by more than a tenth during due diligence). A term sheet can be withdrawn in due diligence. That is how you run out of money while raising.

### 3.5 Terms, dilution and ownership

Values at the game's money scale (winning runs reach about 4,000 to 5,000 EUR a month at week 60). They are placeholders, to be set once the bots show what revenue long mode reaches. Q7 asks whether you want this scale or realistic amounts.

| | Angel | Seed |
|---|---|---|
| Amount | 30,000 to 60,000 EUR | 200,000 to 400,000 EUR |
| Valuation before the money | the larger of 200,000 EUR and 6 times yearly revenue | the larger of 800,000 EUR and 10 times yearly revenue |
| Share given | about 10 to 20% | about 20 to 30% |
| Bar | at least one paying customer, better growing | about 6,000 EUR monthly revenue, growing |
| Strings | monthly update | monthly update, a growth milestone, a check-in every 12 weeks (4 h) |

- The founder starts at 100%. An angel at 15% then a seed at 25% leaves 63.75%. No option pool, no liquidation preference, no board. Those stay out of scope.
- **Cap table:** founder and each investor, share, amount, week.
- **Ownership at the end:** recommended **not** in the ending itself, which stays about the company, but in the post-mortem and best runs: "You own 64% of a company worth about X". X is a visible rule (a multiple of yearly revenue plus cash, a scenario value), not a hidden value. A bankrupt company is worth 0.

### 3.6 Endings with funding

A funded company burns money on purpose, so "profitable in the last 3 months" would mark nearly every funded run as a loss.

| Option | What |
|---|---|
| **A (recommended)** | A new ending, **Growing** ("Still burning money, but the investors are happy"): the company raised, reached the milestone in its seed terms (or, after only an angel, doubled monthly revenue since closing), and has at least 26 weeks of runway at week 104. It counts as a win. Sustainable still beats it in the post-mortem's wording |
| B | Only Sustainable wins; funded runs must also be profitable | Simple, but raising almost always loses, so target 31 fails by design |
| C | Ownership value decides the win | Mixes the founder's wealth into the company's survival; hard to explain in one sentence |

### 3.7 Strings attached

- **Investor updates:** a monthly letter from each investor, "How is it going?" Choices: a proper update (2 h), a short one (0.5 h), or nothing (0 h, the default). A hidden confidence per investor rises or falls with the answer and with the numbers. The player sees it only as the tone of the next letter (pleased, patient, worried).
- **Growth expectations:** the seed term sheet names a milestone in plain numbers ("8,000 EUR a month by week 90"). It is shown on the milestone bar while open.
- **Pressure when missed, or when confidence is low:** investor events (about 12, `from: investor`): push to hire a salesperson now; push to raise the price; push to enter a second market; an extra check-in (4 h); a bridge offer at half the valuation; no follow-on money. They are answered like any message, with hours and money shown, never chances.
- **When it goes well:** introductions to customers (new leads), to a seed fund (fewer pitch hours), and a follow-on offer.

### 3.8 More hires

Part C's team (up to 4, part or full time, 2 h a week of management each) is what money buys, together with freelancers. Nothing more in v1. A third role (customer success, which would lower churn) and paid advertising are left out.

One existing system becomes a paid lead channel once there is money (blocker 9 in section 5). Landing tests have no cap and turn every 5 sign ups into a lead: 750 EUR buys about 8 leads in a viable Kantino market. That may be fine (money buying leads is real), but it threatens target 15 in funded runs. Measure it first, then decide whether landing tests need a cap per market.

### 3.9 Bots

| Bot | Rule |
|---|---|
| `bootstrap` | `validate_then_build` in long mode, never raises (the Part C bot) |
| `raise_on_traction` | Raises an angel once revenue covers company costs and grew in each of the last 2 months, with at least 20 weeks of runway; a seed once it reaches the stated bar. Spends towards a burn that keeps 9 months of runway: hires by payback, freelancers for builds |
| `raise_early` | Starts an angel round in week 3, on interviews and sign ups, and a seed round as soon as it has an angel |
| `raise_always` | As `raise_on_traction`, but raises an angel at the first chance even when revenue already covers costs |
| `raise_late` | Bootstraps and starts raising only when runway falls under 12 weeks |
| Update policies | Always proper, always short, never, for a check like target 11 |

### 3.10 New targets

| # | Target (long mode, each scenario, 10,000 seeds) | How measured |
|---|---|---|
| 31 | **Both paths are viable.** `bootstrap` and `raise_on_traction` each win 25 to 45%, within 8 points of each other | Wins are Sustainable plus Growing |
| 32 | **Neither dominates.** `bootstrap` wins at least as often as `raise_on_traction` (within its margin), and the raiser's median founder share value in winning runs is at least 1.3 times the bootstrapper's | Share value = ownership x company value rule (3.5) |
| 33 | **Raising on weak traction is punished.** `raise_early` wins at least 8 points less than `raise_on_traction` and less than `bootstrap`, and the post-mortem names the round as a cause in at least half of its losing runs | Paired seeds, post-mortem cause ids |
| 34 | **Raising when you do not need to costs you.** On the seeds `bootstrap` wins, `raise_always` ends with a lower median founder share value than `bootstrap` and wins no more often | Paired on the bootstrapper's winning seeds |
| 35 | **Running out while raising is real.** `raise_late` goes bankrupt with a round still open in at least 25% of its runs; `raise_on_traction` in under 5% | Round state at the ending |
| 36 | **Updates are worth a little, not a lot.** Always proper beats never by 1 to 5 points for `raise_on_traction` | Update policy runs |
| 37 | No funding strategy above 60%; 1000 funded runs in under 150 s | Mirrors 3 and 5 |

### 3.11 What the organised stage could show (sized in Part E)

The scrappy stage shows a raise as a short list ("Who might give us money"). The organised stage, which a funded company usually reaches through its first hire, shows:

- A **cap table** card on Money: founder and investors, share, amount, week; scrappy label "Who owns what", organised label "Cap table".
- A **round pipeline** in the Raise section: investors as cards by stage, reusing the corkboard and flat card components.
- **Investor letters** in the inbox with the official look; the open seed milestone on the milestone bar.
- Post-mortem: ownership and share value in the money section; the round in the chain of events.

### 3.12 Engine and save changes

- `GameState.funding: { round: Round | null, investors: InvestorState[], capTable: Stake[], milestone: … | null }`. Hidden appetite and confidence go under `hidden.investors`.
- `WeekPlan.raise: { start: 'angel' | 'seed' | null, pitchHours, meetings: string[], acceptTerms: string | null, declineTerms: string | null }`. Term sheets could instead be inbox letters with choices: simpler for the UI, but the choice needs new effect types (`acceptTerms`), which keeps it in the closed effects union. Recommended: letters with new effects.
- **Money:** `WeekLedger.investmentCents`, kept out of revenue, out of `netChangeCents` (today any income counts there, so a 50,000 EUR cheque would make runway read "not shrinking" for a month) and out of the profitability test.
- New ending `growing`; post-mortem causes `bankrupt_while_raising`, `bankrupt_after_raise`; a funding section; `odds` events for pitches.
- Condition paths `raised`, `investorConfidence` (bucketed, for events), `roundOpen`.
- Scenario: `funding` block in `modes.long` only (sources, ranges, bars, valuation rule, closing weeks, investor pool, value rule).
- Engine 0.14.0. Long saves from Part C restart.
- Plan section 0: take "investors" and "term sheets" off the out of scope list; keep loans, board, legal form and cofounders on it. Record this in `docs/decisions.md`.

### 3.13 Risk

No risk to the 60 week targets: funding lives in `modes.long` only. Risk to the long mode targets of Part C: a funded bot is a new strategy, so 21 (no strategy above 60%) is the one at stake. The main risk is internal. Targets 31 to 34 pull against each other, and the right size of money for the game's scale is unknown until long mode bots show what revenue a good run reaches.

### 3.14 Size

Engine (round pipeline, investors, terms, cap table, updates, pressure, ending, post-mortem) 7 to 9 days. Content (investor pool, about 20 events, texts) 3 days. Bots and report part 4 days. Balancing 6 to 10 days. **About 4 to 6 weeks.**

---

## 4. Part E: UI (sized)

| Item | Days |
|---|---|
| Start screen: mode choice, Continue per mode, best runs per mode | 2 |
| Plan: freelancer section (book, hours, task, end) | 1.5 |
| Plan: team of up to 4, a task per member, management hours | 2.5 |
| Plan: Raise section with the round pipeline | 3 |
| Money: cap table, investment lines, freelancer bill | 1.5 |
| Inbox: investor letters, term sheet letter | 1 |
| Results and post-mortem: new lines, causes, ownership | 2 |
| Labels for both stages, help text, intro card for long mode | 1.5 |
| Screen review at 375 and 1440 px (plus 1199 and 1200), axe checks, notebook browser tests | 2 |
| Docs (`schema.md`, plan, scenario docs, decisions) and the full report | 1.5 |
| **Total** | **about 18 days, 2.5 to 3 weeks** |

---

## 5. What in the current engine blocks this (found in the code)

1. **One hire is built in everywhere.** `validatePlan` refuses any search or offer once `team.members.length > 0`. `workingMember` and `teamOutput` return one member. `WeekPlan` has one `teamBuild`, one `teamOutreach` and `letGo: boolean` without an id. `TeamView` has one `member` and `hadHire`. `hireEconomics` reads `members[0]`. Condition `hasHire` is a yes or no. All need a per member form (Part C).
2. **Salaries are fixed costs charged only at month ends.** A hire who starts in week 3 pays a whole month in week 4, and fixed costs cannot express weekly billing. The freelancer needs its own weekly cost line.
3. **The win test counts only fixed costs and living costs.** `profitableForMonths` ignores ad spend, inbox costs, severance and refunds. A freelancer billed as an "other cost" would slip past the win while a salary does not. Investment money as "other income" is not counted as revenue, which is right, but…
4. **…runway counts every income.** `netChangeCents` adds `otherIncomeCents`, so an investment would read as a month without burn. Investment needs its own ledger field outside the net change.
5. **The win rule is a constant.** `SUSTAINABLE_MONTHS = 2` in `systems/endings.ts`; it needs to be a scenario value per mode.
6. **No mode anywhere.** `maxWeeks` is one scenario value; `SaveFile` has no mode; storage and best runs are keyed by scenario only (`storage.ts`). Adding a `modes` key to the YAML changes the 60 week fingerprint unless the resolved scenario leaves it out (2.3 option A does).
7. **The event pool is sized for 60 weeks** (109 events, up to about 86 drawn). Good news from `drawMessages`: ineligible events are filtered before any random draw, so gated long only events keep 60 week runs identical.
8. **The report assumes 78 weeks.** "Week the run ended" has fixed bins up to "71 to 78"; long mode needs bins per mode.
9. **Landing tests are an uncapped paid lead channel** (3.8). Harmless while money is scarce, but not once it is plentiful.
10. **Segment `size` is drawn and unused** (a known leftover). Long mode saturation would use it, which needs its ranges retuned.
11. **Existing report bug, unrelated to Phase 9.** The leave-one-out table in `docs/balancing.md` prints its rows as "without " with no name. `report.ts` cuts each variant's id by the length of the full run's id, which is now the wide reading run `validate_then_build inbox:reader`, so the cut removes the behaviour name. Worth fixing at the start of Part B, since that table's numbers (target 13) are right but unreadable.

---

## 6. Total estimate and risk

| Part | Estimate | Main risk |
|---|---|---|
| B Freelancer | 1.5 to 2 weeks | No price makes a burst pay in 60 weeks (as with the hire). If so, target 19 becomes "pays only for the longest builds" or the freelancer gets cheaper; the step 1 diagnostic shows it early |
| C Long mode | 4 to 5 weeks | Year 2 is either decided at week 60 (fails 28) or chaotic (saturation breaks 24). Content volume |
| D Funding | 4 to 6 weeks | Targets 31 to 34 pull against each other; the money scale is unknown until C's bots run. **The largest risk overall** |
| E UI | 2.5 to 3 weeks | The Plan tab is already dense at 375 px; team and raise sections must fit the notebook rules |
| **Total** | **about 12 to 16 weeks part time** | |

---

## 7. Open questions only you can answer

1. **Should `validate_then_build`, the reference careful player, use the freelancer?** Recommended: no. It stays the benchmark, the 60 week report stays identical, and freelancer variants are judged on their own (target 19). Yes means a retune of the 60 week game.
2. **Does ownership count in the ending?** Recommended: no. The ending is about the company; ownership is in the post-mortem and best runs.
3. **Is "Growing" (a funded company still burning but on plan) a win?** Recommended: yes. Otherwise raising cannot be viable.
4. **Funding sources:** angel and seed only, friends and family as an event, no loan. Agree? This takes "investors" and "term sheets" off the out of scope list.
5. **Save slots:** one open run per scenario and mode (two Continue buttons per scenario), or one per scenario, where starting the other mode ends the open run?
6. **Year 2 pressure:** living cost step plus saturation (recommended), and renewals or not?
7. **Money scale:** funding amounts sized to the game (an angel of 30,000 to 60,000 EUR against 4,000 EUR monthly revenue), or realistic (an angel of 100,000 to 250,000 EUR, which would then need larger markets and prices in long mode)?
8. **More hires in Part C** rather than D: agree?
9. **Long mode at launch for both scenarios,** or Kantino first and Zollstock after its own balancing?
10. **Should the long mode report be part of every "full report" from now on** (about 45 to 50 minutes for both modes), or run only when long mode or shared code changes?

---

## 8. Owner's answers (Part A review, 2026-10-12)

Part A approved with its three corrections: "freelancer or hire" is a real choice only in long mode; more hires come in Part C; Part B should need no retune of the 60 week game.

| # | Question | Answer |
|---|---|---|
| 1 | Reference bot and the freelancer | In the 60 week game `validate_then_build` never books one; a separate freelancer bot measures target 19. In long mode the reference bot may use it |
| 2 | Ownership | Shown in the post-mortem and as its own column in best runs. It does not decide the ending |
| 3 | "Growing" | A win only with at least 12 months of runway at the current burn and revenue growth over the last quarter; otherwise the run ends Still searching. Both numbers are starting values |
| 4 | Sources | Angel and seed only. Investors and term sheets leave the out of scope list. Terms are amount and equity only: no liquidation preferences, vesting or convertible notes |
| 5 | Saves | One save per scenario and mode |
| 6 | Year 2 pressure | Only the living cost rise at week 53 and markets running out of leads. A competitor joins the parked list |
| 7 | Money scale | Realistic amounts for a Munich startup, with realistic full time salaries in long mode, so money raised and money spent keep their real ratio. Sources below |
| 8 | More hires | In Part C |
| 9 | Long mode | Kantino first, through Parts C and D. Zollstock long mode follows once funding is balanced in Kantino |
| 10 | Reports | Not in every full report. After any engine change, run the main targets for both modes; the full report with the event table per mode only at the end of a part |

### 8.1 Realistic money (question 7), checked October 2026

| Value | Figure | Source |
|---|---|---|
| Angel ticket, Germany | No angel under 25,000 EUR; 54% of accredited angels invest 100,000 to 500,000 EUR per deal (2019 activity, BAND survey) | [BAND, Insights Angel Investing in Deutschland, 12/2020](https://www.business-angels.de/wp-content/uploads/2020/12/BAND-Thema-im-Fokus_InsightsAngelInvestinginDeutschland_12-2020.pdf) |
| Pre-seed round, Europe | Median 1.6 million EUR (vendor blog, treat with care) | [Peony, pre-seed investors Germany](https://www.peony.ink/blog/pre-seed-investors-germany) |
| Pre-seed and seed valuation, DACH | Median 6.3 million EUR (2025) | [PitchBook, 2025 DACH private capital breakdown](https://pitchbook.brightspotcdn.com/03/0f/6f2592774d5b9bc4cf39579e4721/2025-dach-private-capital-breakdown.pdf) |
| Seed round, priced, US benchmark | Median 4.1 million USD at 24.3 million post money, founders give 18% (Carta, 2026) | [WaveUp, seed round benchmarks](https://waveup.com/blog/seed-round-benchmarks/) |
| German rounds, all stages | Median 4 million EUR (Q4 2025) | [KfW VC Dashboard Q4 2025](https://www.kfw.de/PDF/Download-Center/Konzernthemen/Research/PDF-Dokumente-Dashboard/KfW-VC-Dashboard-Q4-2025_EN.pdf) |
| Software engineer, Munich | Median total pay about 84,000 EUR, middle half 68,000 to 105,000 | [levels.fyi, Munich](https://www.levels.fyi/t/software-engineer/locations/munich-metro-region) |
| IT developer, Munich | Base 73,500 EUR (April 2026) | [TalentUp, Munich](https://talentup.io/salary/IT%20Developer/munich) |
| Account executive, Germany | Median base about 52,000 EUR; SaaS scale-ups in Berlin or Munich 60,000 to 80,000 fixed, plus variable | [JOIN, account executive salary](https://join.com/en/job-guides/account-executive/salary) |
| Employer's social security | About 21% on top of gross pay (2025 rates) | [AOK, Beitragssätze 2025](https://www.aok.de/fk/hessen/tools/weitere-inhalte/beitraege-und-rechengroessen-der-sozialversicherung/beitragssaetze/beitragssaetze-2025/) |
| Freelance software developer, Germany | Median 90 EUR net per hour, half between 80 and 100 | [freelancermap, Stundensatz Softwareentwickler](https://www.freelancermap.de/blog/?p=72121) |
| IT freelancers, all, Germany | Average 104 to 105 EUR per hour (Freelancer-Kompass 2025) | [Computerwoche](https://www.computerwoche.de/article/3853444/freelancer-kompass-2025-it-freiberufler-verdienen-105-euro-in-der-stunde.html) |

What this means for long mode (to settle in Parts C and D, not now):

- A full time developer costs about 75,000 EUR gross plus 21%, about 91,000 EUR a year to the company: about 7,000 EUR per 4 week game month. A salesperson at 65,000 EUR fixed costs about 6,000 EUR. Today's part time hire (3,900 EUR for 20 h) is in line with half of that.
- Realistic rounds: an angel of 100,000 to 250,000 EUR, a seed round of 1 to 3 million EUR at a valuation around 6 million. A seed round would then pay 12 to 35 people-years, so a funded company must reach far more than today's 7 to 10 customers to justify it.
- **Consequence for Part C:** at 450 EUR a month per customer, a seed round's burn needs hundreds of customers. Long mode's markets (sizes, response, possibly price ranges) must allow that scale, or funding can only lose. This is the largest open design point for Parts C and D and is flagged here so it is decided before Part D starts.
- A freelance developer at 90 EUR an hour is about 1.4 times a full time employee's cost per hour (91,000 EUR over about 1,650 working hours is 55 EUR), which matches the starting ratio of 1.4 proposed in 1.3.

The competitor joins the parked ideas in the plan.

---

## 9. Part B result: the freelancer (engine 0.12.0)

Built as proposed in section 1, with the owner's answers. Details and numbers are in `docs/decisions.md` (Phase 9, part B) and `docs/balancing.md` ("The freelancer (target 19)").

- **No extra random draws:** with nobody booked, main and paired on 10,000 seeds are identical to engine 0.11.0, and every reference number in `docs/balancing.md` matches.
- **Free freelancer, 60 weeks:** a developer for the build is worth about +1.3 points; a salesperson for 8 weeks about +2. The founder builds a market in 3 to 4 weeks alone, so a rented developer has little to do (median 17 hours).
- **Price:** 1.4 times the hire's hourly cost, 68 EUR (developer) and 58 EUR (salesperson). It already loses about 4 points at 1.0 times; break-even is about 12 EUR an hour.
- **Target 19 fails at any realistic price,** as the hire's old target 12 did. The freelancer is never the right call in the bootstrapped 60 weeks with these bots.

Options for target 19 (owner to choose):

| Option | What | Effect |
|---|---|---|
| **A (recommended)** | Restate 19 for 60 weeks as a lesson that holds today: "renting never beats doing the work yourself, and a short rental costs less than a hire" (the freelancer bot loses fewer points than `validate_then_build_early_hire`), and move "the right call in some situations" to target 20 in long mode, where salaries and money are larger | No change to the game. The 60 week lesson becomes "your own hours are the cheapest" |
| B | Make the founder's hours scarcer in 60 weeks (for example a slower build, or outreach that needs more hours), so renting can pay | Moves all 18 targets; a retune of the 60 week game that Part B was meant to avoid |
| C | Drop target 19, like target 12 | Simplest; the freelancer stays a choice that rarely pays |

### 9.1 Owner's decision and the energy check

The owner chose option A after one check: does renting pay when the founder is running out of energy? A careful bot that, below 40 or 30 energy, plans 10 h fewer and rents a 10 h freelancer for that work until energy recovers was compared with the same bot without the rule (10,000 seeds, both scenarios, 68 and 58 EUR):

| Hours planned a week | Plain | Rent when tired | Cut the same hours, no rent |
|---|---|---|---|
| 50 (the careful bot) | 32.1% / 29.6% won, never below 40 energy | rule never fires | rule never fires |
| 58 | every run burns out | +0.2 / +0.3 points (no burnout, but the bills bankrupt it) | +19.4 / +19.2 |
| 65 (the overworker) | every run burns out | no change | no change |

Renting does not pay when tired; resting does. So target 19 (60 weeks) now reads: **renting never beats doing the work yourself, and costs less than an early hire.** Result: freelance developer for the build -5.9 (Kantino) and -6.6 (Zollstock) against the careful bot; early hire -21.5 and -24.8; freelancer ahead by 15.6 and 18.2. Passes in both scenarios. "The right call in some situations" moves to target 20 in long mode (section 1.8), unchanged.

Post-mortem line for a freelancer in a run that did not end sustainable: "Freelancers cost €4,080 for 60 h booked, and 17 h of those found work. The same hours from you would have cost about €230 in rent and food, which you were paying anyway."

## 10. Part C2: long mode baseline and target wording (Kantino, engine 0.13.0)

Current values, no tuning. Numbers after the runway fix (section 10 was measured again; every target kept its result, no value moved beyond its margin). Main part on 1000 seeds; targets marked "10,000" on the wide seeds (the careful bot's reading run and the team variants, paired). Full tables: `docs/balancing.md`, "Kantino, long mode".

### 10.1 Owner's decisions before C2

- Part time hires in long mode at half the full time salary (3,500 and 3,025 EUR for 20 h), offered beside full time; the 60 week part time hire keeps its tuned salary.
- The bots build a team in long mode before the baseline is measured (rules in 10.2).

### 10.2 The bots' team rules

Every money test reads what the player sees: "a month" is the change in cash plus savings averaged over the last three months (money received, not invoiced; one month of late invoices paid at once is not growth), and the runway shown.

- **Careful (the reference, `validate_then_build` in long mode):** looks for a hire once a month makes money, cash and savings would pay what the hire adds to the monthly loss for 6 months, and at least 26 weeks are left once the hire starts. A developer while the features its market asks for need 40 h or more, else a salesperson; full time; the best impression. The next search waits until the newest hire has worked 8 weeks. The newest hire is let go once the runway shown falls below 3 months, a developer once every feature has shipped.
- **Solo (`validate_then_build_solo`):** never hires or rents.
- **On savings (`validate_then_build_savings_hire`):** the first search as soon as building starts (week 3) while cash and savings hold three salaries; that hire is kept until the runway shown falls below 1 month. Later hires as careful.
- **Part time only (`validate_then_build_part_time`):** the careful rule with part time hires.
- **Freelancer first (`validate_then_build_freelance_first`):** until its first hire is on the way, a 20 h freelancer in the limiting role: a developer for the build from week 3 while money covers the whole build left at the freelancer's rate plus 3 months of the current loss, else a salesperson from the first paying customer while money covers the added loss for 3 months. Notice when the role changes, the runway falls below 3 months, or a hire search starts.
- **Target 20's situations:** the solo bot plus one person in a fixed role. Burst: a developer for the build, looked for in week 3 and kept until the wanted features ship. Steady: a salesperson from the first paying customer to the end. Each as a 20 h freelancer or a part time hire.

What the careful bot does with them (10,000 seeds): it hires in 7.4% of runs, 0.07 hires a run; offers in weeks 57, 65 and 71 (25th, median, 75th; 109 in weeks 27 to 52, 640 in weeks 53 to 78, none before 27 or after 78). 13 runs make a second hire, none a third. Median team at week 104: 0, also among runs that hired (most hires are let go when the runway falls below 3 months). One full time salesperson finds about one customer before being let go: at selling 0.3, 45 h of their outreach finds fewer leads than 10 h of the founder's.

### 10.3 Targets 20 to 30: wording, limits and baseline

| # | Wording and limits | Mirrors | Baseline | Met |
|---|---|---|---|---|
| 20 | Freelancer or hire is each the right call in its own situation: for a burst (the build, from week 3 until it ships) a 20 h freelance developer beats a part time developer hire by at least 2 points; for steady work (selling from the first paying customer to the end) a part time salesperson hire beats a 20 h freelance salesperson by at least 2 points. On top of the solo careful bot, paired, 10,000 seeds | New (the half of old target 19 that moved, section 9.1) | Burst: freelancer ahead by -0.1 ±0.9 (both -3.2 against solo; the hire arrives in week 8 and is used in 52% of runs). Steady: hire ahead by -2.9 ±0.8 (freelancer -8.6, hire -11.5 against solo) | no |
| 21 | `build_only` wins under 5%; no strategy above 60% | 1 and 3, unchanged | 0.0%; top `price_aware` 34.8% | yes |
| 22 | `validate_then_build` wins 25 to 45% | 2, unchanged | 25.9% ±2.7 | yes, at the edge |
| 23 | Median losing run length, all strategies, week 30 to 70 | 4, limits scaled from 20 to 40 because runs are longer | week 30.0 ±0.5 | yes, at the edge |
| 24 | `validate_then_build` win rates across the three viable markets within 15 points, 10,000 seeds | 6, unchanged | 13.9 ±2.0 (coworking 17%, medical 31%, small offices 31%) | yes, at the edge |
| 25 | First paying customer in week 4 to 10 in the median winning careful run, and by week 10 at least 70% of careful runs have a customer or have left a market that is not viable | 7 and 8, unchanged (the first 30 weeks play as in 60 weeks) | week 5; 96.0% | yes |
| 26 | Decision news in at least 85% of weeks 1 to 20 for the careful bot and playtest, and in at least 70% of weeks 53 to 104 for the careful bot | 9, plus a year 2 floor so the second year cannot go quiet | 100.0% and 96.3%; year 2 99.8% | yes |
| 27 | Target 11 holds on 10,000 seeds; no event arrives twice unless it recurs on purpose; under 1% of careful runs have a dry inbox week | 11 and 16, plus dry weeks: in 104 weeks the pool can run out | 11: effort +3.1 (23% of reading), cheapest -0.4, reading +13.4; 0 repeats; **dry in 45.5% of runs** (first dry week 74 in the median) | no |
| 28 | Year 2 matters: of careful runs profitable in each of the two months to week 60, at most 85% end Sustainable; of runs alive but not profitable at week 60, at least 15% end Sustainable. 10,000 seeds | New | 67.6% of 1,809; 43.6% of 3,141 | yes |
| 29 | The hire can pay: the careful bot with its team rule loses at most 1 point against the solo bot, and gains at least 2 points in at least one viable market. Paired, 10,000 seeds | New (the long mode answer to old target 12) | -1.6 ±0.3 overall; best market coworking -0.5 | no |
| 30 | 1000 long runs in under 120 s (slowest strategy, timed while the other processes run) | 5, limit doubled for runs about twice as long | 36.7 s | yes |

Information only, worded as in the 60 week report: 10 (51 of 95 events favour the cheap choice), 13 (chase -9.8, landing -2.7, books -2.5), 14 (`presale_max` -5.0), 15 (in person outreach 31.8% of customers) would all be met. 17 and 18 (pricing) were not run in long mode.

What fails and why:

- **20 and 29: no hire pays in long mode at current values.** Every variant that adds a person loses against solo: careful -1.6, part time only -4.2 (23.3%), freelancer first -5.9 (21.6%), on savings -22.0 (5.5%), and the burst and steady pairs -3 to -11.5. A full time salesperson costs 6,050 EUR a month plus 4 weeks of severance and brings about one customer at 450 EUR a month. The cause is the hire's selling skill (0.3) and output, and the salaries, not the bot rules: these are C3's first values to tune.
- **27: the event pool runs dry.** 109 events are not enough for 104 weeks: 45.5% of careful runs have a dry week, from week 74 in the median. This needs the long mode events of proposal 2.7 (about 30 new events plus yearly recurrence), which is content work outside C3's values-and-formulas rounds. Owner to decide whether it belongs to C3 or to its own step.
- **22, 23, 24 pass at the edge.** Making hires pay (C3) will move 22 and 24.

### 10.4 Energy curve (10,000 seeds, the careful bot planning each number of hours every week)

| Hours | Kantino 60 weeks: won / burnout | Zollstock 60 weeks: won / burnout | Kantino long: won / burnout |
|---|---|---|---|
| 45 | 25.0% / 0% | 27.1% / 0% | 20.4% / 0% |
| 50 | 32.1% / 0% | 29.6% / 0% | 25.9% / 0% |
| 52 | 0.0% / 85.6% (median week 31) | 0.0% / 81.0% (31) | 0.0% / 85.2% (31) |
| 55 | 0% / 100% (13) | 0% / 100% (13) | 0% / 100% (13) |
| 58 | 0% / 100% (9) | 0% / 100% (9) | 0% / 100% (9) |
| 60 | 0% / 100% (8) | 0% / 100% (8) | 0% / 100% (8) |

**A cliff, at 50 h, not between 50 and 58.** The cause is the formula: a week within the 50 h base gains 3 energy, and a week over it loses 2 per extra hour and gains nothing. No number of hours above 50 is sustainable, so any steady week over base burns out, only later: 52 h hits zero around week 20 and burns out from week 23 at the earliest; the median burnout week measured is 31. Below 30 energy the sales penalty adds to it, which is why 52 h loses even its runs that are not burnt out. A human can still work 58 h for a few weeks and then rest; the bots plan the same hours every week.

Halving the drain alone (1 per hour over base, values only, 1000 seeds) keeps the cliff and only moves it: 52 h wins 19.8% in 60 weeks and 0% in long mode; 55 h burns out 97 to 98% of runs from week 25.

Options (no change made):

| Option | What | Curve | Risk to existing targets |
|---|---|---|---|
| A | Keep it, and say it on screen: "Weeks over 50 h never recover energy" | Cliff at 50 h | None |
| B | Recovery every week, less 2 per hour over base (`3 - 2 x overtime`) | Sustainable up to 51.5 h; 55 h burns out around week 15, 58 h around week 9 | Small (see C) |
| **C (recommended)** | Recovery every week, less 1 per hour over base (`3 - 1 x overtime`) | A slope: sustainable up to 53 h; 55 h burns out around week 43, 58 h around 19, 60 h around 14 (from 80 energy, before the sales penalty) | Bots planning 50 h never go over base, so targets 1 to 30 move only through bots that do: the random bot (30 to 65 h) and the overworker (65 h, burns out around week 10 instead of 6). Target 19's energy check (58 and 65 h) changes and should be rerun. Inbox answers that cost energy matter less. Applied to both modes it changes both 60 week fingerprints, so open 60 week saves get the "retuned" notice; as a long mode override (`founder.energy` plus one new formula value) the 60 week game stays exact |

Recommendation: C, in long mode first (an override, the 60 week game untouched), and in both modes once the owner has played it. It is a formula change, so it belongs to C3's "formulas second" round.

### 10.5 Runtime of the long mode report (Kantino, 9 processes)

`pnpm bots --runs 1000 --wide-runs 10000 --mode long --parts main,paired,inbox,team,energy,events`: 1,167 s (19.5 minutes) in all. Main 31 s, paired 174 s, inbox 52 s, team 220 s (8 variants on 10,000 seeds), energy 88 s, events 598 s (154,379 of 233,000 games played, the rest reused). Without the energy curve, which is a one off, about 18 minutes. Price and freelance parts were not run in long mode (17, 18 and 19 are not long mode targets).
