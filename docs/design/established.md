# Established UI stage: design spec

As built (plan 3 step 3): the bookings model counts weeks, not days, so Occupancy is a heat grid by week and product. The phone keeps Help in its top bar. Card titles are small caps labels, as in the mockups.

The third and last look of the game screen. It replaces the paper desk when the company has grown up. Read `docs/design/design.md` first: everything there still applies unless this file says otherwise.

Mockups (static pictures, not code; ignore the inline styles' exact structure, copy sizes and spacing):

| File | Shows |
|---|---|
| `docs/design/established-desk-v2.html` | Desktop, 1440 x 1010, Kantino long, week 78, office floor |
| `docs/design/established-phone.html` | Phone, 390 x 844: Inbox, Plan, Finance (Kantino) and Occupancy (Seeblick) |
| `docs/design/desk-established.html` | The older direction drawing. **Superseded** by `established-desk-v2.html`. Its cofounder, board meeting and summarised support reports are out of scope |

## 1. When it applies

| UI stage | Trigger | Already built |
|---|---|---|
| `scrappy` | Start | yes |
| `organised` | Revenue covers all costs, or the first hire | yes (pipeline panel and a few labels only) |
| `established` | The company moves into **office stage 4** (see `docs/office-stages.md`) | **new** |

- Office stage 4 exists only in long mode, so the 60 week game never reaches `established`. Kantino and Zollstock 60 week screens stay exactly as they are.
- The stage never goes back down within a run, even if the company later moves out.
- The switch happens on the results screen of the week the move completes, with one line in the scenario's dry tone (examples: Kantino "You moved onto the office floor. The kitchen table is now somebody else's problem."; Seeblick "The pavilion is up and the reception desk has a bell. Guests have started ringing it.").
- A dev-only way to preview the stage (for example a URL parameter) is allowed, never in the production build.

## 2. Tokens

Define in `apps/web/src/theme/established.css`, applied when `uiStage` is `established`.

| Token | Value | Use |
|---|---|---|
| `--bg` | `#EEF0F3` | Page background |
| `--surface` | `#FFFFFF` | Cards, top bar, tab bar |
| `--line` | `#D9DEE4` | Borders, row separators |
| `--ink` | `#14181F` | Text |
| `--muted` | `#55606E` | Labels, secondary text |
| `--soft` | `#F5F6F8` | Stepper fill, empty bars |
| `--good` | `#16663F` | Positive values |
| `--warn` | `#A0440A` | Warnings |
| `--accent` | per scenario, below | Logo square, End week, active tab, milestone bar, own share in cap table |
| Activity colours | unchanged from scrappy | Hours bar segments |
| Sticky note | `#FFE27A` | Personal notes from people only |

Accent per scenario (white text on each must reach 4.5:1; check and adjust the shade if not):

| Scenario | Accent |
|---|---|
| Kantino | `#C8371F` |
| Zollstock | `#9A5B13` (only if it ever gets a long mode) |
| Gratwanderung | `#2E6B4F` |
| Hinterhof | `#8C3B2E` |
| Seeblick | `#2B5F8A` |

### Type

| Role | Font | Size |
|---|---|---|
| Company name, panel and section titles | Bricolage Grotesque 700 / 800 (bundle via @fontsource, Latin-1 subset like the others) | 17 to 20 px |
| Body, labels, buttons | IBM Plex Sans 400 / 600 / 700 | 14 px, 12 px minimum |
| Numbers, hours, money | IBM Plex Mono 600 | 13 to 18 px, 26 to 28 px for the cash total |
| Small caps labels | Plex Sans 600, 11 px, letter spacing 0.04 em, upper case | |
| Handwriting (Caveat) | **Only** on sticky notes written by people in the game | 22 px |

### Shape

| Property | Value |
|---|---|
| Cards | White, 1 px `--line` border, 12 px radius, no shadow, no rotation |
| Buttons | 44 px tall, 8 px radius for choices, pill for End week and secondary actions |
| Rows | 44 px minimum, 1 px `--line` separator, no ruled paper |
| Stepper | 30 px square buttons with 8 px radius in a 44 px tap area (same sizes as the notebook) |
| Channel choice | Segmented control, 32 px tall inside a 44 px row, selected segment ink with white text |

## 3. Component mapping

| Scrappy | Established | Notes |
|---|---|---|
| Dark headline bar | White top bar with a logo square (first letter, accent) and the company's full name ("Kantino GmbH") | Metrics: Cash, Runway, Monthly revenue (tourism: the guests or occupancy measure, plus average price), Customers, Team |
| "On your desk" letters and notes | "Inbox": message cards, accent stripe on the left for messages that need an answer | Choices full width, hours and cost in muted text after a dot |
| Sticky notes | Unchanged sticky notes, slight rotation, only for personal notes | The one bit of paper left, on purpose |
| Scene | Same scene drawing in a white card, a dark chip "Office floor · stage 4 of 5" | Drawings from `docs/design/office-stages.html` |
| Milestone bar | Card with an accent progress bar | |
| "My week" notebook | "This week" form in a card | Same sections, rows, steppers and behaviour, see section 4 |
| Corkboard / organised pipeline | "Pipeline" table | Already clean at `organised`; restyle with the new tokens |
| Bank statement | "Cash flow": total, 12 weeks of in and out bars (in: good, out: grey), received and paid this week | |
| Coming up notes | "Calendar": week number in mono, one row per item | |
| Who owns what | "Cap table": one stacked bar plus rows | |
| Money tab | "Finance" tab: Cash flow, Office, Cap table, Invoices, Loan cards | |
| Bookings calendar (tourism) | "Occupancy": a heat grid by week and day, three shades of the accent, numbers in each cell | Seeblick uses rooms, Hinterhof covers, Gratwanderung places |

Phone keeps the current structure: top bar 60 px, band 56 px (the money band, and the hours band on the Plan tab when the hours bar has scrolled away), scrolling content, tab bar 64 px.

## 4. Labels

Add `established` to the labels table for every scenario. Starting wording (keep it short; match each scenario's voice):

| Key idea | Scrappy | Established (Kantino) | Established (tourism) |
|---|---|---|---|
| Plan title | My week | This week | This week |
| Interviews | Talk to people | Customer research | Guest research |
| Building | Build and fix | Product | Products and upkeep |
| Outreach | Find customers | Outreach | Distribution |
| Demos | Demos and follow ups | Sales meetings | (none) |
| Staff | Hiring / Who works | Team | Rota |
| Funding | Raise | Investors | Investors |
| Loan | Bank loan | Financing | Financing |
| Rest | Rest | Time off | Time off |
| Office | (new) | Office | Premises |
| Money tab | Money | Finance | Finance |
| Bookings tab | Bookings | (none) | Occupancy |
| Desk column | On your desk | Inbox | Inbox |

Game text in messages keeps the same dry humour. Only interface labels become more businesslike.

## 5. Rules that do not change

- Tap only, no hover dependence, 44 px tap areas, phone first, no text cut off with an ellipsis (except a section summary next to its title on a phone).
- No hidden values or probabilities on screen.
- Every screen passes axe and has no sideways scrolling at 375, 390, 430 and 1440 px in Chromium and WebKit.
- The tourism word check must pass in the established stage too.
