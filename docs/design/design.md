# Design reference

Three HTML mockups sit next to this file. They are static pictures of one moment in a run, not working code. Use them for layout, visual style, tone of text, and component ideas.

| File | Shows | Status |
|---|---|---|
| `desk-scrappy.html` | Desktop desk layout, scrappy stage, week 14 | **Target look for the early MVP** (Phase 6) |
| `phone-inbox.html` | Phone layout, Inbox tab, week 14 | **Target layout for phone** (Phases 2 and 6). See note on styling below |
| `desk-established.html` | Desktop, month 18, professional stage | **Out of scope.** Direction only, do not build |

## How to read the files

- They were exported from a design tool. Ignore `<x-dc>`, `<helmet>`, `support.js`, and the `<script type="text/x-dc">` block. Everything useful is in the markup and its inline styles.
- Sizes are fixed (1440 x 1010 and 390 x 844). The real app must be responsive.
- The scene illustrations are placeholder shapes in inline SVG. Simple placeholders of similar quality are fine for the MVP.
- Some effects must be dropped or adapted: nothing may depend on hover or drag (see CLAUDE.md).

## Content in the mockups that is NOT in the early MVP

Do not implement these even though they appear in the pictures:

- Jonas the cofounder (the sticky note, the figure in the scene, the Team entry with equity)
- Markus Vogt the angel investor
- The tax office VAT message as a real tax rule (a simple fixed cost event is fine)
- "Stage 2 of 5" office stages: the MVP has two (kitchen table, coworking desk)
- Everything in `desk-established.html`

Aylin (the hired developer) and the open "Sales hire" seat do match the MVP's single hire system, with the limit of one hire in total.

## Phone styling note

`phone-inbox.html` was drawn before the scrappy style existed, so it uses a plain light theme. Keep its **layout** (pinned top bar, runway band, scene header, "3 things need you" card, chat style message, bottom tab bar) but apply the **scrappy tokens** below, so phone and desktop look like the same game.

## Layout

### Desktop (900 px and wider), from `desk-scrappy.html`

| Region | Width | Content, top to bottom |
|---|---|---|
| Headline bar | full, 68 px high | Company name and week, cash, runway, monthly revenue, customers, team, End week button |
| Left column | about 350 px | "On your desk": open letter with choices, then other messages as notes and cards |
| Centre column | flexible | Scene image (about 330 px high), milestone progress bar, "My week" notebook planner, corkboard pipeline |
| Right column | about 290 px | Bank statement with balance trend, "Coming up" calendar notes, a worry note, best runs |

### Phone (below 900 px), from `phone-inbox.html`

1. Top bar, 60 px: company and week on the left, End week button on the right
2. Runway band, 32 px: runway text and cash, visible on every tab
3. Scene header, about 72 px, on the Inbox tab only
4. Scrolling content for the active tab
5. Bottom tab bar, 64 px: Inbox, Plan, Pipeline, Market, Money (hiring is a Plan section, see `docs/decisions.md`, Phase 6)

## Tokens: scrappy stage

Define these as CSS custom properties in `apps/web/src/theme/scrappy.css`.

### Colour

| Token | Value | Use |
|---|---|---|
| `--ground` | `#1D3836` | Page background (the desk) |
| `--bar` | `#122624` | Headline bar, milestone bar, dark chips |
| `--on-dark` | `#EAF2F0` | Text on ground and bar |
| `--on-dark-muted` | `#A8C2BE` | Labels on dark |
| `--paper` | `#FBFCFD` | Letters, cards, notebook, statement |
| `--paper-grey` | `#E8ECEF` | Official letters |
| `--ink` | `#17212B` | Text on paper |
| `--ink-muted` | `#4B5A68` | Secondary text on paper |
| `--rule` | `#D9E3EA` | Notebook lines, dividers |
| `--sticky` | `#FFE27A` | Sticky notes |
| `--on-sticky` | `#2A2200` | Text on sticky notes |
| `--cork` | `#C9A473` | Corkboard surface |
| `--cork-frame` | `#7A5630` | Corkboard border |
| `--on-cork` | `#2B1C08` | Text on cork |
| `--primary` | `#FFD34D` | End week button |
| `--on-primary` | `#1B1500` | Text on primary |
| `--good` | `#16663F` | Positive values on paper |
| `--good-on-dark` | `#7FE0A8` | Positive values on dark |
| `--warn` | `#A0440A` | Warnings on paper |
| `--warn-on-dark` | `#FFB37A` | Warnings on dark |
| `--danger` | `#B3261E` | Stamps, pins, overdue marks |
| `--shadow` | `#0E1F1E` | Hard shadow under paper |

Activity colours (planner bar segments, white text on each):

| Activity | Value |
|---|---|
| Sales | `#2456D6` |
| Building | `#1B7A4B` |
| Interviews and experiments | `#5B3C8C` |
| Admin | `#4B5A68` |
| Free | `#FFFFFF` with ink text |

Scene palette (muted, not cartoon): wall `#D9DDDA`, floor `#9A8266`, sky `#C3D0DA`, skyline `#A3B3C1`, desk `#E0B777`. Figures are faceless, natural proportions, muted clothing. No dot eyes or smiles.

### Typography

| Role | Font | Size |
|---|---|---|
| Body, labels, buttons | IBM Plex Sans 400, 600, 700 | 14 px body, 12 px minimum |
| Money and week numbers | IBM Plex Mono 600 | 13 px in lists, 17 px headline, 28 px balance |
| Handwriting (notes, planner, panel titles) | Caveat 500, 700 | 21 to 28 px, never below 20 px |

### Shape and effects

| Property | Value |
|---|---|
| Paper corner radius | 2 to 4 px |
| Dark panels corner radius | 8 px |
| Buttons | Pill, 2 px ink border, min height 44 px |
| Paper shadow | `0 3px 0 var(--shadow)`, no blur |
| Paper rotation | Between -1.5 and 1.5 degrees, fixed per component, never on elements containing buttons with small text |
| Stamp | 2 px danger border, bold 12 px text, rotated about 3 degrees |
| Notebook lines | Repeating gradient, 28 px line height |
| Column gap and page padding | 14 px |

## Tokens: organised stage (the one UI upgrade step in the MVP)

When `uiStage` becomes `organised`, only the pipeline panel changes:

| Property | Scrappy | Organised |
|---|---|---|
| Title | "Who might pay us" in Caveat | "Sales pipeline" in IBM Plex Sans 700 |
| Surface | Corkboard | White card, 1 px `#D9DEE4` border, 12 px radius |
| Cards | Pinned, rotated paper | Flat rows, no rotation |
| New number | none | Demo to trial conversion, shown as a percentage |

All other panels keep the scrappy look.

## Component mapping

| Mockup element | Component | Notes |
|---|---|---|
| Open letter with choices | `MessageCard` | Portrait, sender, role hint, body, optional stamp, choice buttons showing hours |
| Sticky note | `StickyNote` | Short personal messages, handwriting |
| Grey official letter | `OfficialLetter` | Mono header, stamp |
| Scene | `Scene` | One static image per office stage, with a stage chip |
| Milestone bar | `MilestoneBar` | Label, progress, target |
| Notebook | `WeekPlanner` | Segmented hours bar, rows with steppers (no dragging) |
| Corkboard | `Pipeline` | Columns by stage, lead cards |
| Bank statement | `BankStatement` | Balance, trend line of last weeks, recent lines |
| Calendar notes | `ComingUp` | Next scheduled items |
| Headline stat | `Stat` | Label, value, change with arrow and text (never colour alone) |

## Tone of text

Short and dry. Examples from the mockups:

- "Accounting says your invoice is in the next payment run. Probably."
- "Bookkeeping, ugh (6 h)"
- "Week 31: we are out of money. Unless Lindner pays. Or Nordlicht signs."
