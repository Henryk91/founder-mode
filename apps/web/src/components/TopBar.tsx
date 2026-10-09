import { count, label } from '../labels'
import { formatEuro } from '../format'
import { useGame } from '../useGame'
import styles from './TopBar.module.css'
import ui from './ui.module.css'

export function TopBar() {
  const view = useGame((s) => s.view)
  const issues = useGame((s) => s.issues.length)
  const showingReport = useGame((s) => s.report !== null)
  const endWeek = useGame((s) => s.endWeek)
  if (!view) return null
  const stage = view.company.uiStage
  const runway =
    view.company.runwayWeeks !== null
      ? count('bar.runway.weeks', stage, view.company.runwayWeeks)
      : !view.company.runwayKnown
        ? label('bar.runway.none', stage)
        : label('bar.runway.safe', stage)

  return (
    <header className={styles.header}>
      <div className={styles.top}>
        <div>
          <div className={styles.name}>{view.scenarioName}</div>
          <div className={styles.week}>
            {label('bar.week', stage, { week: view.week, max: view.maxWeeks })}
          </div>
        </div>
        {view.status === 'running' && !showingReport && (
          <button
            type="button"
            className={`${ui.button} ${ui.primary}`}
            disabled={issues > 0}
            onClick={endWeek}
          >
            {label('bar.endWeek', stage)}
          </button>
        )}
      </div>
      <div className={styles.band}>
        <span>{runway}</span>
        <span className={ui.mono}>
          {label('bar.cash', stage)} {formatEuro(view.company.cashCents)}
        </span>
      </div>
    </header>
  )
}
