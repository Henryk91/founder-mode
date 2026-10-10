import type { NextMilestoneView } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { label } from '../labels'
import { useGame } from '../useGame'
import styles from './MilestoneBar.module.css'

/** The next milestone, how far along the run is, and the target. A dark strip on the desk. */
export function MilestoneBar() {
  const view = useGame((s) => s.view)
  if (!view) return null
  const stage = view.company.uiStage
  const next = view.milestones.next
  if (!next) {
    return (
      <section className={styles.bar} aria-label={label('milestone.allDone', stage)}>
        <span className={styles.name}>{label('milestone.allDone', stage)}</span>
      </section>
    )
  }
  const share = next.target > 0 ? Math.min(1, next.current / next.target) : 0
  const title = label('milestone.next', stage, { name: next.name })
  return (
    <section className={styles.bar} aria-label={title}>
      <span className={styles.name}>{title}</span>
      <span
        className={styles.track}
        role="progressbar"
        aria-label={title}
        aria-valuemin={0}
        aria-valuemax={next.target}
        aria-valuenow={next.current}
        aria-valuetext={figures(next, stage)}
      >
        <span className={styles.fill} style={{ transform: `scaleX(${share.toFixed(3)})` }} />
      </span>
      <span className={styles.figures}>{figures(next, stage)}</span>
    </section>
  )
}

function figures(next: NextMilestoneView, stage: 'scrappy' | 'organised'): string {
  if (next.unit === 'cents') {
    return label('milestone.cents', stage, {
      current: formatEuro(next.current),
      target: formatEuro(next.target),
    })
  }
  return label(next.unit === 'weeks' ? 'milestone.weeks' : 'milestone.count', stage, {
    current: next.current,
    target: next.target,
  })
}
