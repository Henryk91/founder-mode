# Step 2: Part E, Phase 9 UI, docs and report

## What changed

- Plan tab: a "Money from investors" section (organised stage: "Raise") with the rounds, their public bars and costs, pitching, second looks, term sheets (accept or decline), closing, the monthly investor update, the investors' mood and the growth milestone; a short explanation behind "more". Every working team member and the freelancer get an "Also chases late invoices" chip. Landing tests left per market in long mode.
- Money tab: "Who owns what" (organised: "Cap table"), the company's value by the visible rule and the founder's part; weeks when investors paid in are marked on the statement.
- Results: lines for every funding step. End screen and post-mortem: the Growing ending, the causes "bankrupt while raising" and "after raising", the money raised, ownership and value, and investors who passed as too early.
- Best runs count Growing as a win and show the founder's share. "Same as last week" keeps pitching and chasing, drops one-off raising steps, and drops a landing test once a market has none left.
- Mode choice, a team of several hires and the rent rise notice existed from part C and were checked again.
- Docs: README, implementation plan (endings, Phase 9 status), `docs/schema.md`, Kantino's long mode table, `docs/seeds.md` with long mode rows (Growing included) and its replay test.

## Screen review

Browser tests, all passing: axe finds nothing in long mode (Start, Plan with hiring and raising open, the week's results, an open round, Money) at 375, 390, 430 and 1440 px in both Chromium and WebKit, alongside the existing 60 week axe checks. The notebook rules (44 px lines, rows aligned, controls at least 44 px, nothing cut short) hold for the hiring and raising sections at 390, 430, 1280 and 1440 px; one real fault was found and fixed (the pitch row's note cut short at 390 px). A screenshot check at 390 and 1440 px showed every control on its paper.

## Reports

`docs/balancing.md`: the 60 week report for both scenarios (main 1000, wide 10,000, the event table) with every target passing, and the long mode report from step 1. The request-only energy-check and energy-curve tables are no longer in the file; their results are in `docs/decisions.md` (part B and C2a) and `docs/phase9-proposal.md` 10.6.

## Targets and open issues

No target changed in this step. Open issues as in STATUS.md (20, 27 at the limit, 31, 32, 33, 36).

## Protected games

No engine rule changed apart from a new view field (`history.investmentCents`); the 60 week report regenerated here matches the gate numbers, and `docs/seeds.md`'s 60 week rows are unchanged.
