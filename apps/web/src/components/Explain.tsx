import { label } from '../labels'
import { useGame } from '../useGame'
import styles from './ui.module.css'

/** A two sentence explanation of Runway, Cash, Energy or hours, opened by tapping the term. */
export function Explain() {
  const key = useGame((s) => s.explain)
  const stage = useGame((s) => s.view?.company.uiStage ?? 'scrappy')
  const close = useGame((s) => s.closeExplain)
  const founder = useGame((s) => s.view?.founder)
  if (!key) return null
  const vars = { low: founder?.lowEnergyBelow ?? 0, weeks: founder?.burnoutWeeks ?? 0 }
  return (
    <section className={`${styles.card} ${styles.sticky}`} role="note">
      <h2 className={styles.title}>{label(`explain.${key}.title`, stage)}</h2>
      <p>{label(`explain.${key}.text`, stage, vars)}</p>
      <button type="button" className={styles.button} onClick={close}>
        {label('explain.close', stage)}
      </button>
    </section>
  )
}

/** A small tap target that opens an explanation. */
export function ExplainButton(props: { term: 'runway' | 'cash' | 'energy' | 'hours' }) {
  const open = useGame((s) => s.openExplain)
  const stage = useGame((s) => s.view?.company.uiStage ?? 'scrappy')
  return (
    <button
      type="button"
      className={styles.infoButton}
      aria-label={`${label(`explain.${props.term}.title`, stage)}: ${label('explain.button', stage)}`}
      onClick={() => open(props.term)}
    >
      ?
    </button>
  )
}
