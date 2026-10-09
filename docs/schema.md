# Schemas

Source of truth for the shapes shared between engine, content, bots, and UI. Update this file in the same change as any type change.

Status: skeleton (Phase 0). Sections are filled in as the types land in code.

## Conventions

- Money is integer cents (`...Cents`). Time is integer or half hours (`...Hours`).
- Probabilities and hidden values live only under `GameState.hidden` and never reach `PlayerView`.
- Ids are lowercase snake case strings, for example `small_offices`.

## GameState

Defined in `packages/engine/src/types.ts`. Arrives in Phase 1. See plan section 4.2 for the outline.

## PlayerView

Produced by `packages/engine/src/view.ts`. The only thing the UI receives. Arrives in Phase 1.

## WeekPlan and WeekReport

Arrives in Phase 1.

## SaveFile

Arrives in Phase 1. See plan section 4.14.

```ts
type SaveFile = {
  engineVersion: string
  scenarioId: string
  seed: string
  actions: LoggedAction[]
}
```

## Content: Scenario

zod schema in `packages/content/src/schema.ts`. Arrives in Phase 1, values from `docs/scenario-kantino.md`.

## Content: Feature

Arrives in Phase 2.

## Content: Event

Arrives in Phase 4. See plan section 4.10.
