# Step 1: Part D, funding (Kantino long mode)

## What changed

- Engine: angel and seed rounds as a pipeline in the plan (start, pitch, second looks, terms, closing), investors who judge only visible numbers, money at closing in its own ledger field (never revenue, runway or the win test), monthly investor updates and a mood, a growth milestone in seed terms, the "Growing" ending, post-mortem causes (bankrupt while or after raising) and funding economics, landing tests capped at 3 per market in long mode. An investor is met at most once a run. No random draws unless the player raises.
- Content: Kantino's long block gets a `funding` block (amounts realistic and cited, pre-money floors estimates); 11 investor events in `shared/events/funding.yaml`, gated on money raised.
- Bots: raise on traction, early, always, late, and update policies; funded bots hire towards 9 months of runway and keep the results let-go. Report part `funding`, targets 31 to 37, a raising table; Growing counts as a win.
- Design: `docs/phase9-proposal.md` section 11; decisions in `docs/decisions.md`, "Phase 9, part D".

## Targets (Kantino long mode, `docs/balancing.md`, main 1000 seeds, wide 10,000, prefix `test`)

| # | Result | Status |
|---|---|---|
| 20 to 30 | As step 0: 21 to 26, 28, 29, 30 pass (23 now week 33.0 with the raisers among "all strategies"; 21's top strategy raise_late 47.2%); 27 at the limit; 20 fails | unchanged |
| 31 | bootstrap 42.9%, raise_on_traction 47.0% (±1.0) | fail (open issue): raise on traction just above 45% |
| 32 | raise_on_traction +4.0 ±0.9 over bootstrap; founder value in wins 1,050,105 against 725,808 EUR (1.45x) | fail (open issue): the value half passes |
| 33 | raise_early -6.8 ±1.1 against raise on traction, -2.8 against bootstrap; round named in 100% of its losses | fail by 0.1 beyond its margin (open issue) |
| 34 | on bootstrap's winning seeds raise_always's founder value 680,215 against 725,808 EUR; wins -31.9 | pass |
| 35 | raise_late bankrupt mid-round 38.2%; raise_on_traction 0.3% | pass |
| 36 (restated) | on the 3,230 seeds where raise_on_traction raised, proper updates -1.1 ±1.4 against none (all seeds -0.4) | fail (open issue) |
| 37 | top raise_late 47.2%; 68.6 s per 1000 runs | pass |

## Decisions taken

All in `docs/decisions.md`, part D, the AUTONOMOUS ones listed in STATUS.md. The largest: an investor is met once a run (without it, a careful founder got about fifty chances and money rescued most losing runs); target 36 judged on seeds that raised.

## Plan 3.1 point 8

Funded hires do create growth: with money, hires pay (+9 points against a solo founder with the same money). Funding is viable; the open problem is the opposite of the feared one: realistic angel money is worth about 4 points of survival to a careful founder, so raising slightly dominates on both win rate and value. Options are in STATUS.md.

## Open issues

31, 32, 33, 36 (see STATUS.md); 20 and 27 carried from step 0.

## Protected games

60 week game, both scenarios, main (1000 seeds) and paired (10,000), prefix `test`: every row identical to the committed report apart from timings and the targets of parts not run. Kantino long careful strategies play exactly as in step 0 (only the random bot changed through the landing cap). `docs/seeds.md` 60 week rows unchanged.
