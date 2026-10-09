# Decisions

Short log of design and tuning decisions. One or two lines each, newest last.

## Phase 0

- Workspace packages export TypeScript source directly (`exports: ./src/index.ts`), with no build step. Vite and tsx compile on the fly.
- `pnpm lint` runs ESLint, a Prettier check, and `tsc` typecheck in every package.
- The engine tsconfig has no DOM or Node types, and ESLint also blocks `Math.random`, `Date`, `Intl`, and locale methods there.
- React 19 (the plan says 18 or later).
