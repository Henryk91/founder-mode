# Decisions

Short log of design and tuning decisions. One or two lines each, newest last.

## Phase 0

- Workspace packages export TypeScript source directly (`exports: ./src/index.ts`), with no build step. Vite and tsx compile on the fly.
- `pnpm lint` runs ESLint, a Prettier check, and `tsc` typecheck in every package.
- The engine tsconfig has no DOM or Node types, and ESLint also blocks `Math.random`, `Date`, `Intl`, and locale methods there.
- React 19 (the plan says 18 or later).

## Phase 1

- `Scenario` is the zod inferred type in content. The engine uses `import type` only (ESLint enforced), so zod and YAML never enter the engine.
- `GameState` carries its `scenario`, because `endWeek` and `getView` take no scenario argument. The save file does not; `replay` takes it.
- YAML is loaded with Vite `?raw` imports. Bots must run under `vite-node` instead of `tsx` from Phase 3.
- PRNG is sfc32 seeded by xmur3. Normal noise is Irwin-Hall (12 uniforms), because `Math.log` and `Math.cos` can differ between browsers and would break replays.
- A month is 4 weeks. Fixed costs land in weeks 4, 8, 12 and so on.
- Bankrupt rule (confirmed): living costs come from savings, and the company pays any shortfall (founder draw). Negative company cash is topped up from savings automatically. Bankrupt means cash is still negative after the top up.
- Founder draws, automatic top ups, and manual savings transfers each appear in `WeekReport.entries` and in `eventLog` with amounts. The manual transfer stays as a week plan action. Private money put in = manual transfers + top ups (`privateMoneyInCents`).
- Week limit: after week 78 resolves, `sustainable` if each of the last two 4 week months was profitable (scenario doc definition), else `still_searching`. `week` does not advance after the run ends.
- Energy rules from scenario section 7 apply from Phase 1; rest counts as planned hours. The low energy penalty and burnout wait for Phase 4.
- Interviews run in scenario segment order, so a plan's key order cannot change the outcome.
- Skills are not in `PlayerView`: they are raw 0..1 values that tune hidden bias.
- `features.yaml` added in Phase 1 as data only, so `mustHave` references can be validated and interviews can mention features. 2 quotes per segment and bucket for now; Phase 5 raises it to 10.

## Phase 2

- Engine version is 0.2.0: the `WeekPlan` shape changed, so Phase 1 saves cannot be replayed. The UI warns and starts fresh (plan 4.14).
- A lead that agrees to a demo moves to stage `demo` with the weekly chance from plan 4.5. The founder then holds the demo for 3 h, booked per lead in the Pipeline tab. Demos can only be held with answering leads in that stage.
- Outreach is one channel and one hour count per segment per week, to keep the phone UI small. Outreach leads are `floor(x)` plus one with probability `x - floor(x)`.
- Revenue (until Phase 4 invoices): at each month end every customer won in an earlier week pays the monthly price in the same week. Churn runs after that, so a churning customer still pays for their last month.
- Quality is `startQuality - qualityPerBug * bugs` (70 and 3). Fixing bugs costs 4 h each, with carry over of partial hours. Build hours cannot exceed a feature's remaining hours.
- The price cannot be changed yet, and shutting down on purpose is not an ending yet; both are outside the Phase 2 list. The low energy penalty still waits for Phase 4.
- `Math.exp` is replaced by `expNeg` in `math.ts` (Taylor series on x/256, squared 8 times), for the same reason as the Irwin-Hall normal: bit identical replays in every browser.
- Company names are drawn from a per segment pool in `messages/company_names.yaml` (15 to 20 each for now, about 27 each in Phase 5) so a coworking name never shows up as a small office. Names are unique per run; if a pool runs out a number is appended.
- Runway is unknown until 4 weeks are played. Before that the window has no month end, and "cash is not shrinking" was misleading.
- The UI keeps `GameState` in the store closure only. `useGame` hands screens `UiState`, which holds `PlayerView`, the draft plan, and the last `WeekReport`. `checkPlan` gives the UI planned hours and issues without the state.
- The web app imports `@founder-mode/content` only in `store.ts` (to load the scenario) and hands it to the engine. Screens never see it. The scenario still ships in the browser bundle, so its hidden ranges are readable there; hiding them is a Phase 8 topic at most.
- Phase 2 styling is plain: scrappy colour tokens (subset) in `theme/scrappy.css`, system font, white cards on dark green. Fonts, the scene, and the corkboard arrive in Phase 6.
- Phase 2 tabs are Plan, Market (interview notes), Pipeline, and Money. Inbox and Team arrive with their systems. The pipeline tab is named "Who pays" at the scrappy stage.
- The informed test script (`informedPlan` in the engine tests) knows the hidden truth and wins about 35 of 40 runs. It only proves the loop can be won; balancing happens in Phase 3 with honest bots.
- The fit formula constants (0.5 and 0.5) live in `scenario.yaml` under `product` (`fitBase`, `fitPerQuality`), so no scenario number is in engine code. UI step sizes (build 5 h, money 100 and 1,000 EUR) stay in the UI.

## Phase 2b

- Intro cards and founder's note texts live in `messages/intro.yaml` (`intro`, `founderNotes`), validated by zod, including a `goal` card and the allowed placeholders. They reach the UI through `PlayerView.guidance`. Money in them is `{name:eur}`, filled by the UI so the engine never formats.
- The note rules are an engine function over observable state (`systems/guidance.ts`), first match wins, weeks 1 to 4 only. Dismissal is UI state per run and is not saved; a reload brings a dismissed note back. The engine version stays 0.2.0, since replays are unaffected.
- The intro shows for every new run and never for Continue. Help reopens the goal card and a five step "how a week works" list from the label table.
- Explanations for Runway, Cash, Energy and hours are label table text, opened by tapping the term (the runway and cash in the top band, `?` buttons at hours and energy). The band is now 44 px high so those are real tap targets.
- Plan action lines say cost, product and timing, in one or two sentences. Numbers that come from the scenario (interview hours, bug fix hours, demo hours, trial weeks) are passed in, not written into labels.
- The Market tab gains a per segment tally of features people asked for ("asked for by 2 of 5"), an observable fact with its sample size.

## Playtest fixes (before Phase 3)

- Engine version 0.3.0: `WeekPlan` gained `priceCentsPerMonth`, and name and quote draws changed, so 0.2.0 saves cannot be replayed.
- Runway covers company cash plus personal savings, at the net change of the last 4 weeks (revenue minus fixed and living costs). Before 4 weeks it uses known costs. The playtest showed 218 weeks while savings drained, because living costs were left out.
- The week report splits the numbers into company money and the founder's: living costs paid from savings and savings left are now shown.
- Price is a week plan field (null keeps it), applied at the start of the week, with a stepper on the Money tab (10 to 5,000 EUR, UI limits). Customers keep the price they signed at, so raising the price cannot squeeze existing customers without any churn effect.
- The outreach channel is remembered per segment as `SegmentView.lastChannel`, read from the action log, so it also survives a reload.
- Company names are built from two word lists per segment (`first` x `second`, 720 to 750 combinations each), drawn from the unused ones. A numbered name remains only as a fallback once every combination is used.
- 10 interview quotes per segment and bucket. A quote not yet heard in that segment and bucket is picked first, so nothing repeats within a week and a run hears every quote before any repeat.

## Phase 3

- Bots see only `PlayerView` before a week and `WeekReport` after it, like a human. The runner reads the hidden truth for the report only (which market was viable). Bots may read observable scenario facts such as the bucket order.
- Bots run under `vite-node` (content loads YAML through `?raw`). `pnpm bots` writes `docs/balancing.md` and keeps its hand written "Tuning notes" section. `--out -` prints instead, `--only a,b` runs some strategies.
- Strategies: the five from the plan plus `playtest`, which replays the hand playtest (always coworking) on every seed. Pre-sales and landing pages do not exist until Phase 4, so `validate_then_build` validates with interviews: score = mean bucket + share of interviews that asked for a feature. It builds every feature its market asked for and moves to the next market after 12 weeks of selling without a customer there.
- Target 4 counts every losing run of every strategy, still searching runs included (length 78). Target 5 is judged on the slowest strategy per 1000 runs.
- Burnout and the low energy penalty were planned for Phase 4; tuning 6 below brought them forward.
- Tuning 1, interview signals: trap and mediocre politeness up, viable down, noise 0.30, skill gain 0.01, Urgent from 0.90, mention chance 0.3 + 0.3 x pain. The viable market sounded Urgent 5 of 5 in the playtest; now all three average Painful to an untrained interviewer and the viable one leads after 6 interviews in about 60% of runs.
- Tuning 2, lead volume: all channel responses halved, so the best channel finds about 0.07 leads per hour at the start (one per 15 h, scenario section 10). The playtest found 7 to 8 leads from 45 h a week.
- Tuning 3, starting cash 10,000 EUR (was 15,000): about 42 weeks of runway with savings. Losing runs lasted a median of 55 weeks, now 44 (target 4).
- Tuning 4, willingness to pay: small offices 200 to 450 EUR, medical 180 to 320 EUR. At the default price a viable medical market was almost unwinnable (11% against 75% for coworking). Coworking stays high (600 to 1,500); a player who raises the price there gains, and the bots never change the price.
- Tuning 5, funnel: lead to demo base 0.18, demo to trial 0.05 + 0.40 x fit, selling skill +0.005 per demo, viable pain 0.60 to 0.85, churn 0.03 + 0.20 x misfit. Winners overshot (19 customers for a 7 customer target). Higher churn was rejected: it met the targets but gave 20 to 30% monthly churn for good products.
- Tuning 6 (formula), energy: the low energy penalty (x0.85 on sales chances below 30) and burnout (3 weeks at 0) from scenario section 7 were pulled forward from Phase 4. Without them 65 h weeks were free and the overworker was the best strategy. Engine 0.4.0. Energy rules reach the UI only as the scenario thresholds, in the explanation and a Plan tab warning.

## After the Phase 3 review

- Saves carry `scenarioHash`, a fingerprint of the whole scenario (numbers and texts). A save made under other scenario values is refused with its own notice ("the game has been retuned since"), instead of replaying into a different game. Texts are included because quote and name counts change random draws. The engine version stays 0.4.0: the replay itself did not change.
- Report additions: ending week histogram, earnings of losing runs, first paying customer week, win rate spread per market. `price_aware` bot: validate_then_build plus a price search (+100 EUR after every 4 trial results with at least 40% won, one step back and stop below that). Bot parameters are not scenario values and live in the bot code.
- Targets 6 (win rate spread across viable markets within 15 points) and 7 (median first paying customer in winning validate_then_build runs in week 8 to 14) are in plan section 7 and the report, marked "not tuned yet".

## Phase 4

- Engine 0.5.0. `WeekPlan` gained landing, presales, bookkeepingHours, chase, searchRole, hire, letGo, teamBuild, teamOutreach. Saves also log `respond` and `shutDown` actions.
- Invoices replace instant revenue. Due after 14 days; paid late by a uniform 0 to 2x segment mean days, or never (segment share). The pay week is hidden. Unpaid 12 weeks after due: written off. Chasing costs 1 h and pays next week with chance 0.3, never for a never payer.
- Bookkeeping: 2 h a week piles up; above 12 h a 150 EUR fine and 4 h lost next week, books cleared. It is an extra weekly cost that the plan did not list.
- Landing test: 8 h, 200 or 500 EUR ads, 150 cents per visitor, result after 2 weeks. Pre-sale: 6 h per batch of 5, needs 5 open leads per batch, result after 1 week, odds fixed at the price when started.
- One hire: candidates have hidden skill and a noisy label; salary is a fixed cost from the start week; letting go costs 4 weeks of salary; a developer needs a chosen feature, a salesperson holds demos first, then does outreach.
- Inbox: answering counts hours at once, effects land when the week ends, unanswered messages take their free default choice after 2 weeks. Events are 25 YAML entries; conditions are parsed by zod into data (no eval).
- Left out on purpose: the coworking desk office stage (needs persistent modifiers) and the `organised` UI switch (Phase 7).
- Shut down: `shutDown` ends the run with `shut_down`. The Money tab asks first; the store ignores a shut down that was not asked for.

## After Phase 4 (engine 0.6.0)

- Follow up: `WeekPlan.followUps`, 1 h per open lead (stage lead or demo). It clears the silence timer, protects the lead from ghosting that week, and adds 0.05 to the weekly chance of asking for a demo (before the energy factor). Scenario: `sales.followUpHours`, `sales.followUpDemoBoost`.
- Pre-sale: a batch needs 3 open leads (`presale.minLeads`, was 5). Prospects per pre-sale are `min(batches x 5, open leads)`, and the result records that count, so it scales with the batch.
- Inbox choices carry `costCents` (cash that certainly goes out) and `monthlyCostCents` (fixed costs added); the UI shows them next to the hours. Gains and chances stay hidden.
- Counts of weeks in label text use a plural-aware `unit.weeks`; "1 open lead" instead of "1 leads".

## Careful bot (after the Phase 4 review)

- `validate_then_build` now plays the Phase 4 systems like a careful human, from `PlayerView` only: 8 interviews per market in week 1; in week 2 one landing test on the market the interviews favour; drops a market whose landing test has under 7% sign ups; books and chases (3 a week) every week.
- Inbox policy (`answerInbox`): per open message take the choice that asks the most effort, if it has no monthly cost, takes at most 6 h (8 h a week in all), and costs money only when that is at most a tenth of the cash and leaves 3,000 EUR. If the best choice is free, leave the message so its free default happens. It reads hours and money, never text, so it cannot know whether effort pays.
- `validate_then_build_hire` also makes the one hire once monthly revenue covers the salary (developer while wanted features are unbuilt, else salesperson), picks the best impression, and sends the developer to unbuilt wanted features and the salesperson to the chosen market.
- The report runs both variants through the seven targets and switches each of inbox, chase, landing, books off in turn (same seeds), plus all four off. The random bot is also run without answering the inbox. None of these extra runs enter the targets.
- The bots do not use follow ups yet.

## Follow ups and the early hire (bots only)

- `validate_then_build` follows up with up to 6 open leads in its chosen market a week, silent ones first, after demos. Follow ups join the switchable behaviours of the ablation table.
- `validate_then_build_early_hire` (hire rule `payback`): searches when observed leads per hour x share of closed leads won x price, over the weeks left after search, start, and 8 weeks to payment, exceeds the salary to week 78, with no churn assumed, and while cash plus savings hold 2 months of salary. Picks the role that pays back more; hires the best impression if it still pays back at that impression's skill band middle. Role output hours (`team.roles.*.weeklyHours`) are read from the scenario as the job description.
- Report: a third target column, a hire table compared on the same seeds with plain play, and pacing in weeks 1 to 20 (noteworthy weeks, and a stricter count of weeks with decision news).

## Design fixes and tuning (engine 0.7.0)

- Books: the weekly 2 h chore paid the player to skip it (14 h saved per 7 weeks against a 150 EUR fine and 4 h). It is now the recurring message `receipts_pile` (from week 4, its own cooldown of 5 weeks): sort them (3 h), pay the accountant (150 EUR), or later (half the time a 400 EUR fine, half the time 4 h lost).
- Chasing only moved a payment that was coming anyway. Now a quarter of invoices (`waitsForChaseShare` 0.25 per segment) are paid only after a chase works (0.3 per chase, as before), and unpaid invoices are written off 8 weeks after due (was 12). Never payers stay unreachable. The Money tab hint says so, without numbers.
- Landing tests arrived in week 4, after the build was chosen, and their sign ups were worth nothing. Now the result comes after 1 week, every 5 sign ups become an open lead in that market, and the sign up chance carries the price factor at the price shown, so a test also tells a careful player when the price is too high for a market.
- Every lead records how it was found (`Lead.source`), so the report can show which action brings the customers.
- Hire: at 3,800 to 4,200 EUR a month a hire needed about 13 extra customers at 300 EUR, and with about 11% monthly churn even a salesperson's steady state barely covered the salary, so every hire lost (98.5% of the covered rule's seeds were won without it). The hire is now junior and part time: salesperson 2,200 EUR for 20 h with a selling skill of 0.3, developer 2,600 EUR for 25 h, starting 2 weeks after the offer. Salary stays inside the win condition.
- Energy only mattered below 30, which a 50 h player never reaches, so every energy choice in the inbox was worthless. The sales factor now falls gradually from 1 at energy 70 to 0.85 at 30 (formula change, `founder.energy.fullAt`).
- Inbox outcomes, so that reading pays and effort is not always right. Cheap or free choice best: survey (now once), friend of a friend (the call teaches nothing), meetup (lead chance 0.3), discount demand (holding costs churn 0.05, as the call does), slow lead (calling reaches them 20% of the time), food fair, sales coach (+0.01 selling), competitor (studying teaches nothing), restaurant portal (hearing him out teaches nothing), hosting (accept at 20 EUR a month), laptop, bank fee (10 EUR a month), raise. Effort best: referral, integration question (honesty touches the lead and +0.01 selling; promising adds 2 bugs), crash report, security notice, late payer (a reminder at 0.5 is nearly as good as a call at 0.55), filing (late costs 300 EUR), grant (chance 0.5), old boss, team plan, receipts.
- Later: event outcomes should depend on the situation (cash, energy, stage of the run), not be fixed per choice. Today the best answer to a message is the same in every run, so a player could learn a lookup table. (Done in Phase 5 with effect conditions.)
- Pacing: trials last 1 week (was 2); a week without a new message draws one anyway while fewer than 2 are open; most events can arrive from week 1 to 4 instead of 2 to 10.
- Pre-sales (as decided in review): a batch of 6 h pitches 5 cold prospects, no leads needed, at most 3 batches per market. A commit is a deposit of one month (counted as money received), not a customer. It becomes a paying customer only once the market's must haves have shipped, its first month already paid; after 8 weeks without them it is refunded and the prospect is lost. Commit rate 0.25 x pain x price factor (was 0.5). Reason: as first proposed, a 6 h batch gave about one customer against roughly 150 h through the funnel, which made pre-selling dominant and let customers pay for a product that does not exist.
- Run length (as decided): company cash 6,000 and savings 9,500 EUR, about 30 weeks at 2,070 EUR a month, and a limit of 60 weeks (win: profitable in weeks 53 to 60). Every bankruptcy fell after week 30 because the money lasted about 42 weeks.
- Markets: willingness to pay medical 260 to 420 EUR (was 180 to 320), small offices 250 to 480 (was 200 to 450). At the default price of 300 the medical market sat below it in 86% of runs, which alone made it the hardest market (diagnostic: with willingness to pay of at least 300 everywhere the spread fell from 32 to 10 points). Coworking keeps its long build as its hard part.
- Bots for engine 0.7.0: `validate_then_build` reads the inbox (`readInbox`, a fixed answer per event, energy dependent for the energy events); blind effort (`answerInbox`) and no answers are comparison variants. In week 2 it pitches one pre-sale batch in its leading market and runs landing tests in the top two. `presale_max` pitches every allowed batch everywhere. Bots expose `focus()` so the report can tell whether a run left a market that is not viable by week 10.
- Outreach saturation (formula, for target 15): with linear returns the bot's best channel found 54% of customers. Now a channel in a market works fully up to 36 h over 3 weeks and at 0.3 beyond, so a careful player rotates channels. The plan keeps one channel per market per week, so the window spans weeks instead of a weekly cap.
- Hire (after review): no salary tried pays back inside 60 weeks with about 15,500 EUR of runway. A free salesperson adds about 10 points, while every 100 EUR a month of salary costs about 3, so even a 550 EUR mini-job loses 8 to 10 points. Target 12 (payback hires win as often as plain play) is dropped; the hire stays a choice that rarely pays. `hireEconomics(state)` gives the post-mortem the hire's cost per customer it found against what a customer was worth over the run. Later candidate: a freelancer paid by the hour and cancellable any week.
- Targets loosened after review: first paying customer in weeks 4 to 10 (was 6 to 10), blind effort at most 4 points over no answers (was 2), no action above 40% of customers (was a third). The weekly report says when outreach on a channel is wearing out, so the saturation rule is visible.
- Tuning rounds 1 to 3 (engine 0.7.0): medical channels raised and coworking in person lowered (spread 27 to 1 point); wasteful effortful answers cost extra hours or energy; crash report defaults milder; a referral brings 1 lead; promising an integration also loses 3 h. Blind effort fell from +6.6 to +3.7 points over no answers, reading stays at +13.3.
- Money scaled by 1.5 (after review): starting money 9,000 + 14,250, living costs 675 a week, company costs 180 + 225 a month, price 450, willingness to pay ranges, salaries 3,300 and 3,900, ad budgets 300 and 750 at 2.25 per visitor, every amount in events and their texts, event cash conditions, the bots' cash floor (4,500) and price step (150), and the report's revenue bins (3,105 covers company and living costs). Ratios are unchanged and every target came out identical.
- Wording after review: the hire is labelled part time, 20 h a week (the developer now also works 20 h, was 25), the Money tab shows living costs per week and per month and calls fixed costs company costs, and intro card 1 says the savings last about seven months (cash plus savings over company and living costs: about 7.5 months).

## Phase 5: content (engine 0.8.0)

- Events: 108 (was 26), at least 11 per area, one YAML file per area. A 60 week run draws up to about 86 messages, so the plan's 60 was too few. Every event is `once`; only `receipts_pile` recurs, and the schema rejects a repeatable event without its own `cooldownWeeks`. In 1000 runs of every strategy no event arrives twice, and the pool runs dry (a week owed a message gets none) in 0.1% of `validate_then_build` runs, after week 55.
- Effects may carry `when` conditions, checked when the message resolves and before any roll. Events where effort pays now depend on the situation the text hints at: networking and flyers bring leads only with 8 or fewer open leads and cost hours on follow ups otherwise; answers to a prospect only matter if that lead has gone silent; reminders only if that customer is overdue; rest only when tired. Reading pays because the right answer changes, not because the cheap one always wins.
- `receipts_pile` weight 3 to 40: among 108 events it arrived 2 times a run instead of 7.4, and switching off the books stopped costing anything. At 40 it arrives about 7 times.
- The reader migrates the hosting and switches the bank (was: accept both): every monthly cost costs several points of win rate, which the old event table hid. It skips the uptime monitor for the same reason.
- Report: a third inbox policy, always cheapest (fewest hours, then least money). Target 11 now asks both blind policies to stay within 4 points of no answers and reading to beat all three by 4. Target 16: no event repeats. New section on the inbox pool; the event table shows the reader's win rate per event.
- Lead names: two open leads of one market never share the distinctive word (the first word; for medical practices the surname, `distinct: second`). Small offices and coworking gained 15 first words each, since a market can have 36 leads open at once. Birkenau, an unintended reference to the camp, is now Birkenweg.

## Phase 6: scrappy UI and desktop layout

- Layouts: `DeskLayout` from 900 px (inbox left; scene, My week or Market, corkboard centre; money right), `PhoneLayout` below. Results and help take the centre alone at the desk. The layout follows `matchMedia`; tests force one with `App layout`.
- Phone has five tabs: Inbox, Plan, Who pays, Market, Money. Team is gone; hiring is the Plan section "Hiring". The mockup's Team tab lost to the current game's Market tab.
- Plan tab: a "My week" header (hours bar by activity with each part also named in text, energy, booked hours, "Same as last week") and seven sections that start closed each week, show a one line summary and their hours, and open several at a time. Fix bugs merged into Build; demos book inside "Demos and follow ups", which only appears once someone can be demoed, followed up or chased.
- "Same as last week" copies regular work only (interviews, tests, building, fixing, outreach, rest, the hire's task) and cuts it to what is still possible. One-off decisions are never repeated.
- Results: one screen grouped under money, sales, product, learning and founder, groups and lines ordered by a fixed importance (a won customer 10, churn 9, an auto top up 8, down to ad spend 2). Full screen steps only for the first paying customer, a hire starting and the ending; milestones join in Phase 7.
- Headline numbers: cash, runway, monthly revenue, customers, each with its change over 4 resolved weeks (arrow and words, colour only as an extra). Hidden until 4 weeks exist to compare.
- Energy stays on its 0 to 100 scale everywhere (plan header, help, results, scene); there is no 10 point display.
- Message looks come from content (`look: letter | note | official`), not from sender names in code. Paper tilts only once a message has no buttons left.
- Office stage: the engine has none yet, so the kitchen table always shows; the coworking desk scene is drawn and tested and waits for its event.
- Fonts are bundled with `@fontsource` (Plex Sans, Plex Mono, Caveat), so the static build makes no outside requests.
- `uiStage` sets `data-stage` on the layout; `theme/organised.css` restyles only the pipeline board tokens. The switch itself is Phase 7.

- Deployment: GitHub Pages via Actions, Vite `base` is `/founder-mode/` for builds only. Results screen shows one interview summary line per market, quotes behind a tap. Empty hours bar is a thin dashed strip with no text.
- UI review pass: sticky notes and calendar notes always tilt, letters only once answered. Planner sections live inside the notebook. Market shows answer counts first, quotes behind a tap, newest first. Help names tabs from `labels.ts`. Money steppers use short step labels and stay on one row in the desk right column.
- Second UI pass: desk layout starts at 1200 px (below that the centre column was too narrow), phone layout carries on up to there. Corkboard columns are all side by side or all stacked. Steppers never wrap and keep 44 px buttons. Choice costs split into sure (`costCents`) and possible (`possibleCostCents`, shown as "risk of losing"); the old code showed chancy costs as certain.
- Planner notebook rebuilt to the approved mockups (`docs/design/planner-*.html`): 44 px lines, light rules only, no "?" buttons (each open section ends with a hint line and a "more" link that opens its explanation off the paper, the hours and energy rules live in Help). Steppers are 30 px circles and pills 30 px tall with a light border, inside 44 px tap targets, on the Money tab too. The +5 steps were dropped from outreach and rest hours to match the mockups (one hour per tap). Desk market rows share one line only when the notebook is 700 px wide or more, otherwise the choices take the next line. `apps/web/test/notebook.browser.test.ts` measures grid, baselines, alignment, tap targets, no "?" and the 390 x 844 fit in real Chrome (skipped without Chrome, `CHROME_PATH`).
- Blind effort inbox policy (`answerInbox`) counts sure and possible cash (`costCents + possibleCostCents`). Since the cost split it treated risky paid choices as free and drifted to +4.1 over no answers, failing target 11; counting the risk restores +3.9.

## Phase 7: post-mortem, milestones, organised stage, best runs

- Post-mortem order: what happened, next time, the three markets, misread signals, hours, money, luck, milestones. The lesson comes second. On the phone, hours, money and luck are one tappable line each; the desk shows them in full in two columns.
- The ending moment leads straight to the post-mortem; the final week's results screen is skipped, so every step of the final week goes into the chain (customers won or lost, declined demos and trials, features, write offs).
- Sales rolls are logged as `odds` events (kind, market, tries, expected, observed) so luck can be shown against expected values. Logging never draws, so outcomes and the bot report are unchanged and the engine stays 0.8.0.
- Bankrupt causes, first match: nobody paid; the hire's salary (revenue covered costs without it); more than half the customers left; revenue peaked below costs. "Below costs" comes last because nearly every bankruptcy has it.
- Interview misreads compare the average bucket the player saw with the bucket of the true pain. Politeness when the expected answer (pain plus politeness) is in a higher bucket, else chance; chance names the interviews in all that would have done (noise and bucket width give 9).
- "Evidence you went against": the strongest evidence tested in two or more markets (pre-sale, then landing, then interviews) ranked the good market strictly first, and most work went elsewhere.
- Suggestion "compare markets" counts markets with a pre-sale, not a landing test: the lesson is deposits against compliments. Of the matching suggestions the first not shown after the previous run is used, remembered per scenario.
- Runs started with "Same market again" are recorded as replays, apart from ordinary runs.
- For the Phase 8 balance pass: in the winning example (`validate_then_build`, seed `test-5`) the price was 450 EUR where coworking would pay about 1,730, about a quarter. Pricing is still barely a decision.
- Build and fix on the phone: each feature takes two lines, the full name in handwriting (wrapping onto more ruled lines if needed), then, indented by 12 px, a thin progress bar (84 px, 90 on the desk), the hours built so far in mono, and the stepper. The desk keeps one line. Steppers there show hours planned this week as "+5 h" and nothing at zero, so planned hours never read as progress. The shipped list wraps instead of truncating.
- Milestones live in the scenario. Revenue milestones name the costs they cover instead of an amount, so the threshold follows the run's own costs (a coworking desk or a salary raises it). The hire milestone is kept off the progress bar, since many good runs never hire. Weeks survived count once the week is over without ending the run.
- Only the first paying customer keeps its full screen moment; a hire starting is a results line now. Reached milestones are a sticky note at the top of the results.
- Milestones are checked after the ending in `endWeek`, so a final week can still reach one (its weeks milestone only if the run did not fail).
- Coworking desk: a triggered event (`trigger`, any condition) arrives for sure, once, in week 8 or the week after the first customer. Its messages sit outside the random draw, so a guaranteed letter never displaces a drawn one; without that the blind effort policy drifted to +4.7 and failed target 11.
- Desk tuning (scenario values only): the spec desk (375 EUR a month, in person x 1.2, +1 energy) cost `validate_then_build` 9 points when taken (17.1% against 26.3% staying), because winning runs clear "revenue covers all costs" by a thin margin and the energy bonus does nothing for a bot that is never tired. Now 225 EUR, in person x 1.3, phone and cold email x 1.15, +1 energy: 26.4%, about neutral for a careful founder. A larger in person factor alone would push in person outreach past target 15.
- The reading bot takes the desk once it has a paying customer and cash is not tight.
- Organised stage: at the first of `organisedAt` (first hire, revenue covers company costs). Only the pipeline changes: "Sales pipeline" title, flat cards, and demos held against trials started, counted from what happened. The results announce it once, in the week it happens.
