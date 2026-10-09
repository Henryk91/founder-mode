import type { LeadStage, LeadView } from '@founder-mode/engine'
import { count, label, type LabelKey } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

const GROUPS = [
  ['demo', 'pipeline.group.demo'],
  ['trial', 'pipeline.group.trial'],
  ['lead', 'pipeline.group.lead'],
] as const satisfies readonly (readonly [LeadStage, LabelKey])[]

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

  const lead = (l: LeadView) => {
    const booked = demos.includes(l.id)
    return (
      <li key={l.id} className={styles.row}>
        <div className={styles.rowHead}>
          <span>{l.name}</span>
          {l.silent && <span className={styles.badge}>{label('pipeline.silent', stage)}</span>}
        </div>
        <span className={styles.hint}>
          {segmentName(l.segmentId)} ·{' '}
          {label('pipeline.lastContact', stage, { week: l.lastContactWeek })}
          {l.stage === 'trial' && ` · ${count('pipeline.trialWeeks', stage, l.weeksInStage)}`}
        </span>
        {l.canFollowUp && (
          <button
            type="button"
            aria-pressed={followUps.includes(l.id)}
            disabled={
              !followUps.includes(l.id) &&
              planned + view.costs.followUpHours > view.founder.maxHoursPerWeek
            }
            className={`${styles.button} ${followUps.includes(l.id) ? styles.primary : ''}`}
            onClick={() => toggleFollowUp(l.id)}
          >
            {followUps.includes(l.id)
              ? label('pipeline.followUpBooked', stage)
              : label('pipeline.followUp', stage, {
                  hours: label('unit.hours', stage, { n: view.costs.followUpHours }),
                })}
          </button>
        )}
        {l.canBookDemo && (
          <button
            type="button"
            aria-pressed={booked}
            className={`${styles.button} ${booked ? styles.primary : ''}`}
            onClick={() => toggleDemo(l.id)}
          >
            {booked
              ? label('pipeline.unbookDemo', stage)
              : label('pipeline.bookDemo', stage, {
                  hours: label('unit.hours', stage, { n: view.costs.demoHours }),
                })}
          </button>
        )}
      </li>
    )
  }

  return (
    <>
      <h2 className={styles.title} style={{ color: 'var(--on-dark)' }}>
        {label('pipeline.title', stage)}
      </h2>
      {open.length === 0 && view.customers.length === 0 && (
        <section className={`${styles.card} ${styles.sticky}`}>
          <p>{label('pipeline.empty', stage)}</p>
        </section>
      )}
      {GROUPS.map(([group, key]) => {
        const items = open.filter((l) => l.stage === group)
        if (items.length === 0) return null
        return (
          <section key={group} className={styles.card}>
            <h3 className={styles.title}>
              {label(key, stage)} ({items.length})
            </h3>
            <ul className={styles.list}>{items.map(lead)}</ul>
          </section>
        )
      })}
      {view.customers.length === 0 && open.length > 0 && (
        <section className={`${styles.card} ${styles.sticky}`}>
          <p>{label('pipeline.noCustomers', stage)}</p>
        </section>
      )}
      {view.customers.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.title}>
            {label('pipeline.group.paying', stage)} ({view.customers.length})
          </h3>
          <ul className={styles.list}>
            {view.customers.map((c) => (
              <li key={c.id} className={styles.row}>
                <div className={styles.rowHead}>
                  <span>{c.name}</span>
                </div>
                <span className={styles.hint}>
                  {segmentName(c.segmentId)} ·{' '}
                  {label('pipeline.customerSince', stage, { week: c.sinceWeek })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {lost.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.title}>
            {label('pipeline.group.lost', stage)} ({lost.length})
          </h3>
          <ul className={styles.list}>
            {lost
              .slice(-8)
              .reverse()
              .map((l) => (
                <li key={l.id} className={styles.row}>
                  <div className={styles.rowHead}>
                    <span>{l.name}</span>
                  </div>
                  <span className={styles.hint}>
                    {l.lostReason === 'silent'
                      ? label('pipeline.lostSilent', stage)
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
