# Plan 7: final report

Tags `plan7-baseline`, `plan7-channels`, `plan7-reasons`, `plan7-history`, `plan7-complete`. Reasons in `docs/decisions.md`, "Plan 7". Engine 0.15.0.

## What changed

- **Channels:** tiredness counts effective hours, so more hours never find fewer leads (tests over random histories). The plan holds hours per market and channel; each shows fresh, tiring or worn out. Old saves convert on load.
- **Reasons for losses:** every loss has a hidden cause. About a fifth say why unprompted; Ask why (1 h, within 4 weeks) is answered by about two thirds, with honesty set by how polite the market is. The Pipeline's lost list, the results, the inbox and the post-mortem show it.
- **Past weeks:** earlier weekly reports reopen from Help in every scenario. UI only.
- **Browser tests fixed on the Mac:** channel rows stacked in a market card at 1440 px (they sat side by side and pushed steppers off the card), and the Ask why test held a query whose name changes when pressed.

## Run

Full report once, one process per game, at the commit tagged `plan7-history` plus the browser fixes: Kantino and Zollstock (60 weeks) with standard parts, 1,000 seeds, 10,000 wide seeds and events; Kantino long with main, paired, inbox, price, freelance, team and funding. `docs/balancing.md` holds the results.

## Tuned targets

| Target | Result |
|---|---|
| Playability, careful bot | Kantino 37.5%, Zollstock 37.3%, Kantino long 45.4% (all inside the 15 to 55% hard-stop range; no strategy over 70%) |
| M1 (tiredness never punishes work) | Holds, tested |
| M2 (spreading pays, Kantino) | +5.5 points, met |
| R1 (asking pays, Kantino) | +1.2 points: **not met** (target 2) after two bot rounds and one formula round |
| R2, H1 | Tests pass |
| Zollstock price search (target 17) | 47.1% (cap 45%) and -1.1 in its worst market (limit -1): **not met**, on 10,000 wide seeds |

## Other targets that moved beyond their margin

- Kantino long 22 (careful 25 to 45%): 45.4% (±3.1), at the limit after two rounds.
- Kantino long 30 and 37 (timing): 184.4 s and 177.7 s per 1000 runs, timed with nine bot processes running; not comparable with earlier timings.
- Kantino long 20 and 32 were already unmet at `plan6-complete`; unchanged in kind.
- Zollstock has no M2/R1 target; spreading gives +0.2 and asking -0.2 there.

## Bookings proof

Main part, 1,000 seeds, both modes, all ten bookings scenarios (Gratwanderung, Hinterhof, Seeblick, Rückenwind, Tiefgang, Leinen los, Ausgesperrt, Fabriketage, Schweißperle, Griffig): Endings and Wins-by-viable-market tables are byte-identical to `plan6-complete`. `pnpm seeds` left `docs/seeds.md` unchanged.

## For Henry to review

1. R1 is at +1.2 (±1.6), under the +2 target. Options: raise the cost of not knowing (stronger rewards for a named missing feature), let more losses be asked, or restate R1 as "no worse than never asking".
2. Kantino long careful 45.4%, at the top of its band. One more market-floor round would put it inside.
3. Zollstock price search 47.1% is above the 45% cap in target 17 (it was 45.1% in the quick check). Another referral step or restating the cap.
4. Timing targets 30 and 37 should be rechecked on an idle machine.
5. The tree holds untracked QA files and a staged `docs/AUTONOMOUS_PLAN_8.md` that are not part of this commit.
