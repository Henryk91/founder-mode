import { leftForCents, type PlayerView, type WeekPlan } from '@founder-mode/engine'
import { formatEuro } from './format'
import { label, type Voice } from './labels'

/** Plan 8, P-01: money left for one expense after the others in the draft plan. */
export const leftFor = (view: PlayerView, plan: WeekPlan, key: string): number =>
  leftForCents(view.spend, plan, key)

/** "Needs 200,000; you have 48,000": why an expense cannot be added. */
export const needsText = (stage: Voice, needsCents: number, haveCents: number): string =>
  label('afford.needs', stage, { needs: formatEuro(needsCents), have: formatEuro(haveCents) })
