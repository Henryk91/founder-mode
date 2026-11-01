# Plan 6, step 2: shared engine for second sites, second boats and the fleet

Tag `plan6-engine`. Built as `docs/plan6-features.md` sections 3 to 5. Everything is off unless a scenario's content uses it; no scenario does until step 3.

## What was built

- **Second location.** `OfficeStage.secondSite` names a site with its own capacity, reach (by segment) and cannibalisation (both drawn per run from `seed|second-site`). The site is open while the stage's role (the manager) has a working contract, or while the founder works there. `WeekPlan.office.founderAt` chooses the founder's site each week. Reviews suffer at the site without the founder. Giving notice closes it. The view shows each site's capacity, share and money; the post-mortem shows the record, extra rent and the drawn values.
- **Second units of an asset.** `AssetConfig.secondOf` makes an asset the second unit of another, with its own option (buy, lease, share), costs and breakdowns. Capacity is the sum of both units' shares, and the first unit fills before the second. Each unit's revenue is tracked once an asset has a second unit.
- **Rückenwind's fleet.** `BookingProduct.replaces` (buying the rescue boat ends the hired one's monthly cost) and `wear` (gear sets with a lifetime: worn gear loses capacity and reviews until replaced; effect `replaceWorn`, conditions `worn.<product>`). Report entries `gear_worn` and `gear_replaced`, and gear lines in the post-mortem.
- **Optional stage effects** for step 3: `ancillaryCentsPerUnit`, `dayTripCostFactor`, `wtpFactors`, `seasonFlatten`, `assetCrewFactor`, `churnFactors`, `extraShares`.
- **UI:** the second site on the Office card (the founder's site, facts), second units on asset cards once taken, the post-mortem and results lines.
- **Bots:** office rules `never_second` and `always_second`, with strategies `tourism_never_second` and `tourism_always_second`, which play only where a second site or unit exists. The careful bot takes a second unit when it turns guests away at peak, buys a `replaces` product when cash allows, and replaces worn gear.
- **Tests:** `packages/engine/test/secondSites.test.ts` (10). The bots test now allows for strategies that need a second site. `docs/schema.md` has the step 2 section.

## Protected proof

Main part, 1,000 test seeds per policy, at 340bf1a. Every result hash is identical:

| Game | Compared with | Identical |
|---|---|---|
| Kantino, 60 weeks | tuning2 final | 11/11 |
| Zollstock, 60 weeks | tuning2 final | 11/11 |
| Kantino long | tuning2 final | 24/24 |
| Gratwanderung | step1-v2 | 19/19 |
| Hinterhof | step1-full | 22/22 |
| Seeblick | step1-full | 22/22 |
| Rückenwind | step1-v1 | 30/30 |
| Tiefgang | step1-full | 27/27 |
| Leinen los | step1-v2 | 29/29 |
| Fabriketage | step1-full | 29/29 |
| Ausgesperrt | step1-full | 28/28 |
| Schweißperle | step1-full | 30/30 |
| Griffig | step1-lv1 | 32/32 |

`pnpm test` and `pnpm lint` pass. No targets were tuned in this step.
