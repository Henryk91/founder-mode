import type { InterviewView } from '@founder-mode/engine'
import { count, label } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

/** How often each feature was asked for, most often first. Observable facts only. */
function tally(interviews: InterviewView[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const iv of interviews) {
    if (iv.mentionedFeature) {
      counts.set(iv.mentionedFeature.name, (counts.get(iv.mentionedFeature.name) ?? 0) + 1)
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
}

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
          {tally(seg.interviews).length > 0 && (
            <div className={styles.row}>
              <div className={styles.rowHead}>
                <span>{label('market.tallyTitle', stage)}</span>
              </div>
              <ul className={styles.list}>
                {tally(seg.interviews).map(([name, k]) => (
                  <li key={name}>
                    {label('market.tally', stage, { feature: name, k, n: seg.interviews.length })}
                  </li>
                ))}
              </ul>
            </div>
          )}
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
