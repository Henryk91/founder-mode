// Throwaway: what a salesperson hired at week X is worth. Deleted before commit.
import { loadScenario, type Scenario } from '@founder-mode/content'
import { runGame } from './simulate'
import { validatingPlayer, ALL_BEHAVIOURS } from './strategies/validateThenBuild'
import type { Strategy } from './strategy'

const base = loadScenario('kantino')
const N = Number(process.argv[2] ?? 400)
const clone = (s: Scenario): Scenario => JSON.parse(JSON.stringify(s))

function forcedHire(week: number, role: 'salesperson' | 'developer'): Strategy {
  return {
    id: `hire${week}`,
    description: '',
    create: (sc) => {
      const inner = validatingPlayer(sc, 50, null, ALL_BEHAVIOURS)
      return {
        ...inner,
        plan(view) {
          const p = inner.plan(view)
          if (view.week === week && view.team.canSearch) p.searchRole = role
          const best = view.team.candidates[0]
          if (best && !view.team.member) p.hire = best.id
          const target = inner.focus?.() ?? view.segments[0]!.id
          if (view.team.member?.working && role === 'salesperson')
            p.teamOutreach = { segmentId: target, channel: 'in_person' }
          if (view.team.member?.working && role === 'developer')
            p.teamBuild = view.product.features.find((f) => !f.shipped)?.id ?? null
          return p
        },
      }
    },
  }
}
const plain: Strategy = { id: 'p', description: '', create: (sc) => validatingPlayer(sc, 50) }
const rate = (sc: Scenario, s: Strategy) => {
  let w = 0
  for (let i = 0; i < N; i++) if (runGame(sc, s, `test-${i}`).ending === 'sustainable') w++
  return ((100 * w) / N).toFixed(1)
}
const variants: [string, Scenario][] = []
for (const [pay, hours, selling] of [
  [55000, 12, 0.5],
  [80000, 16, 0.5],
  [60000, 20, 0.3],
] as const) {
  const v = clone(base)
  v.team.roles.salesperson.monthlyCents = pay
  v.team.roles.salesperson.weeklyHours = hours
  v.team.roles.salesperson.selling = selling
  variants.push([`${pay / 100}/${hours}h/${selling}`, v])
}
for (const [name, sc] of variants) {
  console.log(
    name,
    'plain',
    rate(sc, plain),
    ...[6, 10, 16, 24].map((w) => `sp@${w} ${rate(sc, forcedHire(w, 'salesperson'))}`),
  )
}
