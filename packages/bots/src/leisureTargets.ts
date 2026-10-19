import { fmtMargin } from './margin'
import { pairedOn, type StrategyRuns, type Target } from './report'

const signed = (x: number) => `${x >= 0 ? '+' : ''}${x.toFixed(1)}`

/** Each variant changes one policy on the same seeds as the careful player. */
export function escapeTargets(
  careful: StrategyRuns,
  s: (id: string) => StrategyRuns | undefined,
  all: number[],
): Target[] {
  if (!s('leisure_one_room')) return []
  const pair = (id: string) => {
    const other = s(id)
    return other ? pairedOn(careful, other, all) : null
  }
  const single = pair('leisure_one_room')
  const quarterly = pair('leisure_quarterly_rooms')
  const themes = pair('leisure_theme_blind')
  const daytime = pair('leisure_no_daytime')
  const vr = pair('leisure_vr_first_year')
  const value = (p: { change: number } | null) => (p ? signed(p.change) : '-')
  const margin = (p: { margin: number } | null) => (p ? fmtMargin(p.margin) : '')
  const loses = (p: { change: number; margin: number } | null, n: number) =>
    p !== null && p.change - p.margin <= -n
  return [
    {
      id: 'X1',
      text: 'Products have a life: never building a second room loses at least 5 points, and building a new room every three months loses at least 3',
      value: `one room ${value(single)}; quarterly ${value(quarterly)}`,
      margin: `${margin(single)}; ${margin(quarterly)}`,
      pass: loses(single, 5) && loses(quarterly, 3),
    },
    {
      id: 'X2',
      text: 'Theme is a market choice: random themes lose at least 2 points to the careful bot',
      value: value(themes),
      margin: margin(themes),
      pass: loses(themes, 2),
    },
    {
      id: 'X3',
      text: 'Selling dead slots pays: never selling weekday daytime to companies or at a lower price loses at least 2 points',
      value: value(daytime),
      margin: margin(daytime),
      pass: loses(daytime, 2),
    },
    {
      id: 'X4',
      text: 'The VR room is a trap: building it in the first year loses at least 3 points',
      value: value(vr),
      margin: margin(vr),
      pass: loses(vr, 3),
    },
  ]
}
