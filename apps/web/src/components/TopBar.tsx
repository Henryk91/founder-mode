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
  const openHelp = useGame((s) => s.openHelp)
  const openExplain = useGame((s) => s.openExplain)
  if (!view) return null
  const stage = view.company.uiStage
  const runway =
    view.company.runwayWeeks !== null
      ? count('bar.runway.weeks', stage, view.company.runwayWeeks)
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
        <div className={styles.actions}>
          <button type="button" className={ui.button} onClick={openHelp}>
            {label('bar.help', stage)}
          </button>
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
      </div>
      <div className={styles.band}>
        <button type="button" className={styles.bandButton} onClick={() => openExplain('runway')}>
          {runway}
        </button>
        <button
          type="button"
          className={`${styles.bandButton} ${ui.mono}`}
          onClick={() => openExplain('cash')}
        >
          {label('bar.cash', stage)} {formatEuro(view.company.cashCents)}
        </button>
      </div>
    </header>
  )
}
