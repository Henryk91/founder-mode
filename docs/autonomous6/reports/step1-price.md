# Plan 6, step 1: price realism

Tag `plan6-price`. Built as `docs/plan6-features.md` section 1.

## What was built

- **Engine.** Each segment draws one elasticity per run from its content range (its own seed stream, `seed|elasticity`, so no other draw moves). Requests scale by `(price / wtp)^-e`, clamped per scenario. New `lnPos` and `powPos` in `math.ts` (no `Math.pow`). Optional shoulder price and shoulder months. A request log per week feeds the post-mortem's price line per season, which compares each run of one season with the same season a year before. Everything is off unless a scenario's YAML sets `elasticity`.
- **Content.** Elasticity ranges for every segment of the ten bookings scenarios. Shoulder months and prices for Rückenwind (4, 5, 10), Tiefgang (4, 5, 10, 11) and Leinen los (5, 6, 9, 10), each halfway between peak and off.
- **UI.** A shoulder price stepper on the tourism plan, and the season lines in the post-mortem.
- **Bots.** The careful bot prices from what it can see: a share of the hinted willingness to pay per season (peak 0.9, shoulder 0.85, off 0.8), raised to 1, 0.95 and 0.9 while a segment turned guests away in the last four weeks. Price-blind is unchanged.
- **Tests.** `packages/engine/test/priceRealism.test.ts`: the volume factor and clamp, determinism, the shoulder price, replay of a saved game, the post-mortem lines. The three tourism fingerprints in `long.test.ts` were recomputed. `pnpm test` (599 web, 1,402 other) and `pnpm lint` pass; `docs/seeds.md` rewritten.

## Protected games

Kantino, Zollstock and Kantino long: main part, 1,000 seeds, 11/11, 11/11 and 24/24 result hashes identical (at 86cddc7). Since then only `packages/bots/src/strategies/tourism.ts` and the content of bookings scenarios changed. Tourism strategies do not play the protected games, and the engine, shared content and protected scenarios are byte-identical, so the proof still holds.

## Measurements

All strategies, 1,000 test seeds per strategy, main part, long mode. Margin about ±3 points. Baseline is `tuning2-complete`.

| Scenario | Careful (base) | Price-blind | T7 | Top strategy | Clamp top | In band |
|---|---|---|---|---|---|---|
| Gratwanderung | 42.8 (44.8) | 42.0 | +0.8 | contracts_none 49.4 | 1.0 | yes |
| Hinterhof | 36.4 (23.0) | 38.0 | −1.6 | always_strict 39.3 | 1.6 | yes |
| Seeblick | 36.2 (33.1) | 37.5 | −1.3 | naive_careful 38.4 | 1.6 | yes |
| Rückenwind | 44.8 (44.5) | 47.5 | −2.7 | price_blind 47.5 | 1.1 | yes |
| Tiefgang | 36.0 (27.7) | 35.9 | +0.1 | naive_careful 38.4 | 1.6 | yes |
| Leinen los | 48.9 (45.0) | 51.5 | −2.6 | price_blind 51.5 | 1.0 | no, careful over 45 |
| Fabriketage | 39.5 (36.0) | 38.3 | +1.2 | permanent 40.7 | 1.6 | yes |
| Ausgesperrt | 43.4 (46.3) | 50.7 | −7.3 | part_time 53.7 | 1.6 | yes |
| Schweißperle | 55.1 (55.7) | 59.0 | −3.9 | naive_careful 60.9 | 1.6 | no, as at baseline |
| Griffig | 45.4 (46.3) | 45.0 | +0.4 | boulder_first 69.5 | 1.0 | yes (careful 45.4 is inside the margin) |

Runs: step1-full (all ten at f4d3b3b), step1-v1 (clamp 1.1, three tourism scenarios), step1-v2 (clamp 1.0, Gratwanderung and Leinen los), step1-lv1 (clamp 1.0, Griffig and Schweißperle).

## Tuning

- **Bot round 1** (calendar-load pricing) cost up to 14 points of careful wins and was replaced.
- **Bot round 2** (seasonal shares, held up when full) is what is built.
- **Value round 1:** clamp top 1.1 in Gratwanderung, Rückenwind and Leinen los, and 1.0 in Griffig and Schweißperle.
- **Value round 2:** clamp top 1.0 in Gratwanderung and Leinen los.
- **Schweißperle** returned to 1.6, because its result was identical to the decimal with 1.0: it wins through memberships, which elasticity does not touch.

## Targets

- **P1 (price is a lever):** partly met. On 200 paired seeds per scenario, careful against price-blind: where careful is cheaper off season, the median request ratio is 1.00 to 1.17. Discounting pays in some runs and loses in others everywhere: wins only careful had, against wins only price-blind had, run from 3 to 12 and 3 to 19. The effect is real but small, and the 1.0 clamps (needed for playability) cap it. In Leinen los the careful bot never prices off season below price-blind, so P1 is not shown there.
- **P2 (T7, seasonal pricing pays 2 to 10 points):** not met in any scenario (−7.3 to +1.2). The diagnostics show why. Price-blind keeps the designers' starting prices, which are already seasonal and sit at 86 to 99% of what guests pay. With a constant elasticity, the best price does not depend on season unless capacity binds. T7 now compares interview hints with good starting prices; it needs restating, which is Henry's call.
- **Playability:** eight of ten inside the band.

## For Henry to review

- T7 as defined cannot pay 2 to 10 points while starting prices are already near the best price. Options: lower or flatten the starting prices, or restate T7 against flat prices.
- Leinen los careful 48.9% (baseline 45.0%), over the band after both rounds.
- Schweißperle careful 55.1% and naive_careful 60.9%: over the band and the 60% strategy limit, and just over the 55% hard stop. Both predate plan 6 (55.7% at baseline) and elasticity does not reach them, so the run did not stop.
- Ausgesperrt: price-blind beats careful by 7.3 points; the careful bot's interview-hint prices are worse than the starting prices there.
- Hinterhof (+13.4) and Tiefgang (+8.3) careful rose clearly with elasticity, both still inside the band.
