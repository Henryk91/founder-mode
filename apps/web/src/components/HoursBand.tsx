import { label } from '../labels'
import { ACTIVITIES, hoursByActivity } from '../screens/Plan'
import { useGame } from '../useGame'
import styles from './HoursBand.module.css'

/**
 * The week's hours in the band under the phone's top bar, while the notebook's own hours bar is
 * scrolled away: the activity segments and "41 of 50 h · 9 h free". Hidden from screen readers,
 * who have the notebook's bar and its "41 of 50 h" as the one source; the swap is only a view.
 */
export function HoursBand() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan)
  const planned = useGame((s) => s.plannedHours)
  if (!view) return null
  const stage = view.company.uiStage
  const base = view.founder.baseHoursPerWeek
  const over = planned > base
  const byActivity = hoursByActivity(view, draft, planned)
  const scale = Math.max(base, planned)
  return (
    <div className={styles.band} aria-hidden="true">
      <div
        className={`${styles.bar} ${over ? styles.over : ''} ${planned === 0 ? styles.empty : ''}`}
      >
        {ACTIVITIES.map(({ id }) =>
          byActivity[id] > 0 ? (
            <div
              key={id}
              className={`${styles.segment} ${styles[id]}`}
              style={{ width: `${(byActivity[id] / scale) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <span className={`${styles.text} ${over ? styles.warn : ''}`}>
        {label('plan.band', stage, {
          hours: label('plan.hours', stage, { planned, base }),
          free: label('unit.hours', stage, { n: Math.max(0, base - planned) }),
        })}
      </span>
    </div>
  )
}
