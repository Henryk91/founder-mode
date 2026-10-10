import type { Scenario } from '@founder-mode/content'
import { median } from './report'
import { runGame, type RunResult } from './simulate'
import { forcedAnswer } from './strategies/validateThenBuild'

/** The inbox event and choice that move to an office with walk-in leads, and their market. */
export function officeMove(
  scenario: Scenario,
): { eventId: string; move: string; stay: string; segmentId: string } | null {
  for (const e of scenario.events) {
    for (const c of e.choices) {
      for (const fx of c.effects) {
        if (fx.type !== 'moveOffice') continue
        const walkIns = scenario.officeStages.find((o) => o.id === fx.stage)?.walkIns
        if (walkIns) {
          return { eventId: e.id, move: c.id, stay: e.defaultChoice, segmentId: walkIns.segment }
        }
      }
    }
  }
  return null
}

const won = (r: RunResult) => r.ending === 'sustainable'

/**
 * Taking the office against declining it on the same seeds (`validate_then_build`, everything
 * else equal), split by the real role of the walk-in market. z is the sign test on seeds won by
 * only one of the two choices; within about 2 is chance.
 */
export function deskComparison(scenario: Scenario, runs: number, seedPrefix: string): string {
  const office = officeMove(scenario)
  if (!office) return `${scenario.name} has no office with walk-in leads.`
  const play = (choice: string) =>
    Array.from({ length: runs }, (_, i) =>
      runGame(scenario, forcedAnswer(office.eventId, choice), `${seedPrefix}-${i}`),
    )
  const take = play(office.move)
  const stay = play(office.stay)
  const roles = [...new Set(take.map((r) => r.roles[office.segmentId] ?? ''))].sort()
  const row = (name: string, keep: (r: RunResult) => boolean) => {
    const idx = take.map((r, i) => (keep(r) ? i : -1)).filter((i) => i >= 0)
    const t = idx.map((i) => take[i]!)
    const d = idx.map((i) => stay[i]!)
    const onlyTake = idx.filter((i) => won(take[i]!) && !won(stay[i]!)).length
    const onlyStay = idx.filter((i) => !won(take[i]!) && won(stay[i]!)).length
    const flips = onlyTake + onlyStay
    const z = flips === 0 ? 0 : (onlyTake - onlyStay) / Math.sqrt(flips)
    const rate = (rs: RunResult[]) => (rs.length ? (100 * rs.filter(won).length) / rs.length : 0)
    const weeks = median(idx.map((i) => take[i]!.weeks - stay[i]!.weeks))
    return `| ${name} | ${idx.length} | ${rate(t).toFixed(1)}% | ${rate(d).toFixed(1)}% | ${(rate(t) - rate(d) >= 0 ? '+' : '') + (rate(t) - rate(d)).toFixed(1)} | ${z.toFixed(1)} | ${onlyTake}/${onlyStay} | ${(weeks ?? 0).toFixed(1)} |`
  }
  return [
    `## ${scenario.name}: office with walk-ins, taken against declined`,
    '',
    `\`validate_then_build\` forced to answer \`${office.eventId}\` with \`${office.move}\` or \`${office.stay}\`, ${runs} seeds \`${seedPrefix}\`, split by the real role of ${office.segmentId}.`,
    '',
    '| Role of the walk-in market | Runs | Win: take | Win: decline | Points | z | Seeds won only by take/decline | Median weeks, take minus decline |',
    '|---|---|---|---|---|---|---|---|',
    row('all', () => true),
    ...roles.map((role) => row(role, (r) => r.roles[office.segmentId] === role)),
  ].join('\n')
}
