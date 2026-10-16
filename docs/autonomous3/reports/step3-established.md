# Plan 3, step 3: the established UI stage

## What was built

Built on branch `plan3-wip` and merged into main.

- **Stage:** `uiStage` reaches `established` the week a move into office stage 4 completes (step 1) and never goes back; a results line marks the switch, in each scenario's own voice (`ui_established` lines).
- **Theme:** `apps/web/src/theme/established.css` holds the stage's tokens and the accent per scenario (set on `<html>` with `data-stage` and `data-scenario`; white text on every accent at least 4.5:1). Bricolage Grotesque 700 and 800 come from @fontsource 5.3.0, subset to Latin-1 plus the euro and minus signs like the other fonts. The CSS and font load only when a run first reaches the stage (0.68 kB gzipped CSS in its own chunk).
- **Screens:** the established style on phone and desktop following the spec's component mapping: the top bar with the logo square and the company's name, the metrics band, Inbox cards with the accent stripe, This week as a form, Pipeline, Market, Finance (Cash flow card with money in and out for the last 12 weeks, Office, Cap table bar, Invoices, Loan), Occupancy for tourism (a week by product heat grid, as the model is weekly), the milestone track, results, post-mortem and Help.
- **Labels:** an `established` set for every long mode scenario from the spec's table, and the market trials title per tourism scenario.
- **Engine (view only):** `PlayerView.history` gains `inCents` and `outCents` per week for the Cash flow card (schema updated). No game logic changed.
- **Preview:** `?stage=established` in a dev build only (`import.meta.env.DEV`); the production bundle does not read the parameter.
- **Docs:** `docs/design/design.md` has a section pointing to `established.md`; `desk-established.html` is marked superseded; `established.md` has an "as built" note.

## Checks

- `established.browser.test.ts`: all four long mode scenarios in the established stage at 375, 390, 430 and 1440 px in Chromium and WebKit: axe clean, no sideways scrolling, no cut-off text, the tourism word check, form rows at least 44 px and controls on their card. It found a pre-existing overflow: the contract "Hire" chip in the Market row spilled out of its card in WebKit (fixed in `Plan.module.css`).
- Screenshots of each scenario in the established stage at 390 px (five screens) and 1440 px: kept outside the repo in `$TMPDIR/founder-mode-established/` (on this machine `/var/folders/6x/8dfrb28n3gbbgqdj7r47jrgw0000gn/T/founder-mode-established/`), rewritten by every run of the test.
- **First load:** production build, 375 x 812, 4x CPU, slow 4G (562.5 ms RTT, 1.47 Mbps), cold cache, median of 5 in Chrome. The step 3 merge itself added 0.01 s (2.54 s before, 2.55 s after), but plan 3 step 1's office screens had already pushed the Start screen over 2.5 s. Every screen after the Start screen now loads as one chunk after the Start screen has painted: main bundle 184 kB gzipped (was 228), **Start screen 2.28 s** (runs 2.27 to 2.29). Decision recorded in `docs/decisions.md`, plan 3 step 3.
- Tests: 1,065 passed; lint clean. Two notebook browser tests clicked through the intro without waiting for it; they now wait for its first button.

## Protected games

Step 3 changes no game logic or values. The full gate (section 1.6) after the merge and the first-load change is identical to the step 2 report for every scenario and mode, Kantino and Zollstock 60 weeks and all four long modes, number for number apart from timings. Fingerprints unchanged (`long.test.ts` green); `docs/seeds.md` unchanged.

Tag: `plan3-established`.
