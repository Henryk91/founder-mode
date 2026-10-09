import { count, label } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

export function Market() {
  const view = useGame((s) => s.view)
  if (!view) return null
  const stage = view.company.uiStage

  return (
    <>
      <h2 className={styles.title} style={{ color: 'var(--on-dark)' }}>
        {label('market.title', stage)}
      </h2>
      {view.segments.map((seg) => (
        <section key={seg.id} className={styles.card}>
          <h3 className={styles.title}>{seg.name}</h3>
          <p className={styles.hint}>{seg.description}</p>
          <p>
            {seg.interviews.length === 0
              ? label('market.based.zero', stage)
              : count('market.based', stage, seg.interviews.length)}
          </p>
          <ul className={styles.list}>
            {seg.interviews.map((iv, i) => (
              <li key={i} className={styles.row}>
                <div className={styles.rowHead}>
                  <span>{iv.bucketName}</span>
                  <span className={styles.hint}>
                    {label('market.week', stage, { week: iv.week })}
                  </span>
                </div>
                <blockquote className={styles.quote}>{iv.quote}</blockquote>
                {iv.mentionedFeature && (
                  <>
                    <span className={styles.hint}>
                      {label('market.mentioned', stage, { feature: iv.mentionedFeature.name })}
                    </span>
                    <blockquote className={styles.quote}>{iv.mentionedFeature.quote}</blockquote>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )
}
