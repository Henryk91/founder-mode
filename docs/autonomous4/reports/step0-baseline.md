# Plan 4, step 0: set up and baseline

## Set up

- `plan3-complete` exists; plan 4 starts from it plus the Start screen commits after it (HEAD `1653bc1`).
- The working tree held only the plan 4 documents. They were committed in `7be6b01` with `docs/autonomous4/STATUS.md`.
- `pnpm lint` passes. `pnpm test` passed every test (1,100, 9 skipped) but failed the run with vitest worker timeouts ("Timeout calling onTaskUpdate") when every core was busy. `vitest.config.ts` now uses half the cores: clean, and faster (1:53 against 2:20).

## Baseline (plan section 1.6, first row)

The main part of every protected game on 1,000 seeds, prefix `test`, engine 0.14.0:

| Run | Games | Time | Report |
|---|---|---|---|
| `pnpm bots --runs 1000 --seed-prefix test --parts main` | Kantino and Zollstock, 60 weeks | 37 s | `docs/autonomous4/baseline/standard.md` |
| `pnpm bots --runs 1000 --seed-prefix test --parts main --mode long` | Kantino long, Gratwanderung, Hinterhof, Seeblick | 7 min 12 s | `docs/autonomous4/baseline/long.md` |

Later steps prove a protected game unchanged by running the same command and comparing with `docs/autonomous4/compare.sh <baseline> <new>`, which leaves out timings and the engine version. Once new scenarios exist, the protected games run with `--scenario <id>` (see the later reports).

Tag: `plan4-baseline`.
