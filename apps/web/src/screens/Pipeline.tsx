import type { LeadStage, LeadView, PlayerView } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { count, label, type LabelKey } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'
import board from './Pipeline.module.css'

const GROUPS = [
  ['lead', 'pipeline.group.lead'],
  ['demo', 'pipeline.group.demo'],
  ['trial', 'pipeline.group.trial'],
  ['committed', 'pipeline.group.committed'],
] as const satisfies readonly (readonly [LeadStage, LabelKey])[]

/** Fixed tilts for pinned cards without buttons; the organised stage sets them to zero. */
const TILTS = [-1, 1, -1.2, 0.8, 1.5, -0.8]

/** The corkboard: columns by stage, a pinned card per lead. Demos and follow ups book here. */
export function Pipeline() {
  const view = useGame((s) => s.view)
  const demos = useGame((s) => s.plan.demos)
  const toggleDemo = useGame((s) => s.toggleDemo)
  const followUps = useGame((s) => s.plan.followUps)
  const toggleFollowUp = useGame((s) => s.toggleFollowUp)
  const planned = useGame((s) => s.plannedHours)
  if (!view) return null
  const stage = view.company.uiStage
  const segmentName = (id: string) => view.segments.find((s) => s.id === id)?.name ?? id
  const open = view.leads.filter((l) => l.stage !== 'paying' && l.stage !== 'lost')
  const lost = view.leads.filter((l) => l.stage === 'lost')
  const free = view.founder.maxHoursPerWeek - planned
  const hours = (n: number) => label('unit.hours', stage, { n })

  const card = (l: LeadView, i: number) => {
    const booked = demos.includes(l.id)
    const following = followUps.includes(l.id)
    const hasButtons = l.canFollowUp || l.canBookDemo
    return (
      <li
        key={l.id}
        className={`${board.card} ${board[l.stage]}`}
        style={hasButtons ? undefined : tilt(i)}
      >
        <span className={board.name}>{l.name}</span>
        <span className={board.note}>
          {segmentName(l.segmentId)} ·{' '}
          {label('pipeline.lastContact', stage, { week: l.lastContactWeek })}
          {l.stage === 'trial' && ` · ${count('pipeline.trialWeeks', stage, l.weeksInStage)}`}
          {l.stage === 'committed' && ` · ${count('pipeline.depositWeeks', stage, l.weeksInStage)}`}
        </span>
        {l.silent && <span className={styles.badge}>{label('pipeline.silent', stage)}</span>}
        {l.canFollowUp && (
          <button
            type="button"
            aria-pressed={following}
            disabled={!following && free < view.costs.followUpHours}
            className={`${styles.button} ${board.button} ${following ? styles.primary : ''}`}
            onClick={() => toggleFollowUp(l.id)}
          >
            {following
              ? label('pipeline.followUpBooked', stage)
              : label('pipeline.followUp', stage, { hours: hours(view.costs.followUpHours) })}
          </button>
        )}
        {l.canBookDemo && (
          <button
            type="button"
            aria-pressed={booked}
            disabled={!booked && free < view.costs.demoHours}
            className={`${styles.button} ${board.button} ${booked ? styles.primary : ''}`}
            onClick={() => toggleDemo(l.id)}
          >
            {booked
              ? label('pipeline.unbookDemo', stage)
              : label('pipeline.bookDemo', stage, { hours: hours(view.costs.demoHours) })}
          </button>
        )}
      </li>
    )
  }

  const columns = GROUPS.filter(
    ([group]) => group !== 'committed' || open.some((l) => l.stage === group),
  )

  return (
    <>
      <section className={board.board} aria-label={label('pipeline.title', stage)}>
        <h2 className={board.title}>{label('pipeline.title', stage)}</h2>
        {stage === 'organised' && <DemoToTrial view={view} />}
        {open.length === 0 && view.customers.length === 0 ? (
          <p className={board.empty}>{label('pipeline.empty', stage)}</p>
        ) : (
          <div
            className={`${board.columns} ${columns.length + 1 >= 5 ? board.cols5 : board.cols4}`}
          >
            {columns.map(([group, key]) => {
              const items = open.filter((l) => l.stage === group)
              return (
                <div
                  key={group}
                  className={`${board.column} ${items.length === 0 ? board.emptyColumn : ''}`}
                >
                  <h3 className={board.columnTitle}>
                    {label(key, stage)} · {items.length}
                  </h3>
                  <ul className={board.cards}>{items.map(card)}</ul>
                </div>
              )
            })}
            <div className={board.column}>
              <h3 className={board.columnTitle}>
                {label('pipeline.group.paying', stage)} · {view.customers.length}
              </h3>
              {view.customers.length === 0 && (
                <p className={board.empty}>{label('pipeline.noCustomers', stage)}</p>
              )}
              <ul className={board.cards}>
                {view.customers.map((c, i) => (
                  <li key={c.id} className={`${board.card} ${board.paying}`} style={tilt(i + 3)}>
                    <span className={board.name}>{c.name}</span>
                    <span className={board.note}>
                      {label('pipeline.perMonth', stage, {
                        amount: formatEuro(c.priceCentsPerMonth),
                      })}
                      {' · '}
                      {label('pipeline.customerSince', stage, { week: c.sinceWeek })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </section>
      {lost.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.subtitle}>
            {label('pipeline.group.lost', stage)} ({lost.length})
          </h3>
          <ul className={styles.list}>
            {lost
              .slice(-8)
              .reverse()
              .map((l) => (
                <li key={l.id} className={styles.rowHead}>
                  <span>{l.name}</span>
                  <span className={styles.hint}>
                    {l.lostReason === 'silent'
                      ? label('pipeline.lostSilent', stage)
                      : l.lostReason === 'refunded'
                        ? label('pipeline.lostRefunded', stage)
                        : label('pipeline.lostDeclined', stage)}
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </>
  )
}

function tilt(i: number): React.CSSProperties {
  return { transform: `rotate(calc(var(--board-card-tilt) * ${TILTS[i % TILTS.length]}deg))` }
}

/** The organised stage's one new number: how many demos turned into trials. Observed, not odds. */
function DemoToTrial({ view }: { view: PlayerView }) {
  const stage = view.company.uiStage
  const { demosHeld, trialsFromDemos } = view.funnel
  return (
    <p className={board.rate}>
      {demosHeld === 0
        ? label('pipeline.demoToTrialNone', stage)
        : label('pipeline.demoToTrial', stage, {
            percent: Math.round((100 * trialsFromDemos) / demosHeld),
            trials: trialsFromDemos,
            demos: demosHeld,
          })}
    </p>
  )
}
