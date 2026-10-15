# Plan 3, step 0: set up and baseline

## Set up

- `docs/autonomous3/STATUS.md` exists (created by the previous agent, kept current since).
- The plan 3 documents (`AUTONOMOUS_PLAN_3.md`, `office-stages.md`, `design/established.md`, the three mockups, `AGENTS.md`) were committed in `a54d88b`.
- Plan 2 was audited and finished first (`reports/audit.md`, tag `plan2-audited`).

## The gate (plan 3 section 1.6)

The baseline is the state tagged `plan2-audited`. Its numbers come from two full runs on the same game:

- **Kantino and Zollstock, 60 weeks, and Kantino long:** the audit's full gate on `a54d88b` (`pnpm bots --runs 1000 --wide-runs 10000 --seed-prefix test --events`, and Kantino long with `--parts main,paired,inbox,team,funding,events`). The audit fixes changed no rule of these games: the content fingerprints are unchanged (locked by `long.test.ts`), the engine change was a new condition path that no event of theirs uses, and every seed of `docs/seeds.md` still replays. Their sections of `docs/balancing.md` match plan 1's final report apart from timings.
- **Gratwanderung, Hinterhof, Seeblick:** the full gate after the audit fixes (`--scenario <id> --mode long --runs 1000 --wide-runs 10000 --seed-prefix test --events`), committed in `42eb1f6`.

## Baseline targets

| Scenario | Fail or open |
|---|---|
| Kantino, 60 weeks | none |
| Zollstock, 60 weeks | none |
| Kantino, long | 20, 27 (at the limit), 32, 33 |
| Gratwanderung | T14 (T6, T7, T13 at the limit) |
| Hinterhof | T2 (16.6%), T7 (within noise), T14 |
| Seeblick | T6, T7 and T11 (within noise), T14 |

Every other target passes; details in `docs/autonomous2/reports/final.md` and `docs/balancing.md`.

Tag: `plan3-baseline`.
