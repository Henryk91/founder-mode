import { label } from '../labels'
import { useGame } from '../useGame'
import { Headline } from './Headline'
import styles from './TopBar.module.css'
import ui from './ui.module.css'

/**
 * Pinned on every screen: company, week, Help and End week, with the headline numbers. On the
 * phone the numbers sit in a band below, at the desk they share one 68 px bar.
 */
export function TopBar(props: { wide: boolean }) {
  const view = useGame((s) => s.view)
  const issues = useGame((s) => s.issues.length)
  const showingReport = useGame((s) => s.report !== null)
  const endWeek = useGame((s) => s.endWeek)
  const openHelp = useGame((s) => s.openHelp)
  if (!view) return null
  const stage = view.company.uiStage
  const name = (
    <div className={styles.who}>
      <h1 className={styles.name} tabIndex={-1} data-autofocus>
        {view.scenarioName}
      </h1>
      <div className={styles.week}>
        {label('bar.week', stage, { week: view.week, max: view.maxWeeks })}
      </div>
    </div>
  )
  const actions = (
    <div className={styles.actions}>
      <button type="button" className={`${ui.button} ${styles.help}`} onClick={openHelp}>
        {label('bar.help', stage)}
      </button>
      {view.status === 'running' && !showingReport && (
        <button
          type="button"
          className={`${ui.button} ${ui.primary} ${styles.endWeek}`}
          disabled={issues > 0}
          onClick={endWeek}
        >
          {label(issues > 0 ? 'bar.endWeekBlocked' : 'bar.endWeek', stage)}
        </button>
      )}
    </div>
  )

  if (props.wide) {
    return (
      <header className={`${styles.header} ${styles.wide}`}>
        {name}
        <div className={styles.grow} />
        <Headline size="bar" />
        {actions}
      </header>
    )
  }
  return (
    <header className={styles.header}>
      <div className={styles.top}>
        {name}
        {actions}
      </div>
      <Headline size="band" />
    </header>
  )
}
