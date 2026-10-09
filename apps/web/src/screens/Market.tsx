import { useState } from 'react'
import type { InterviewView } from '@founder-mode/engine'
import { formatEuro } from '../format'
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

/** How many answers fell into each type, most common first. */
function answerCounts(interviews: InterviewView[]): [string, number][] {
  const counts = new Map<string, number>()
  for (const iv of interviews) counts.set(iv.bucketName, (counts.get(iv.bucketName) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
}

/** The individual interview quotes of one market, newest first, behind a tap. */
function Quotes({ interviews }: { interviews: InterviewView[] }) {
  const [open, setOpen] = useState(false)
  const view = useGame((s) => s.view)
  if (!view || interviews.length === 0) return null
  const stage = view.company.uiStage
  const newestFirst = interviews
    .map((iv, i) => ({ iv, i }))
    .sort((a, b) => b.iv.week - a.iv.week || b.i - a.i)
  return (
    <>
      <button
        type="button"
        className={styles.reveal}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <span className={styles.revealArrow} aria-hidden="true">
          {open ? '▾' : '▸'}
        </span>
        <span>{label(open ? 'market.quotes.hide' : 'market.quotes.show', stage)}</span>
      </button>
      {open && (
        <ul className={styles.list}>
          {newestFirst.map(({ iv, i }) => (
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
      )}
    </>
  )
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
          {seg.interviews.length > 0 && (
            <div className={styles.row}>
              <div className={styles.rowHead}>
                <span>{label('market.answersTitle', stage)}</span>
              </div>
              <p>
                {answerCounts(seg.interviews)
                  .map(([bucket, n]) => label('market.answer', stage, { bucket, n }))
                  .join(', ')}
              </p>
            </div>
          )}
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
          {(seg.landingTests.length > 0 ||
            seg.presales.length > 0 ||
            view.pendingExperiments.some((e) => e.segmentId === seg.id)) && (
            <div className={styles.row}>
              <div className={styles.rowHead}>
                <span>{label('market.landing.title', stage)}</span>
              </div>
              <ul className={styles.list}>
                {seg.landingTests.map((t, i) => (
                  <li key={`l${i}`}>
                    {label('market.landing.result', stage, {
                      week: t.week,
                      signups: t.signups,
                      visitors: t.visitors,
                      budget: formatEuro(t.budgetCents),
                    })}
                  </li>
                ))}
                {view.pendingExperiments
                  .filter((e) => e.segmentId === seg.id && e.kind === 'landing')
                  .map((e, i) => (
                    <li key={`lp${i}`} className={styles.hint}>
                      {label('market.landing.pending', stage, { week: e.resolveWeek })}
                    </li>
                  ))}
              </ul>
              <div className={styles.rowHead}>
                <span>{label('market.presale.title', stage)}</span>
              </div>
              <ul className={styles.list}>
                {seg.presales.map((t, i) => (
                  <li key={`s${i}`}>
                    {label('market.presale.result', stage, {
                      week: t.week,
                      commits: t.commits,
                      prospects: t.prospects,
                      price: formatEuro(t.priceCents),
                    })}
                  </li>
                ))}
                {view.pendingExperiments
                  .filter((e) => e.segmentId === seg.id && e.kind === 'presale')
                  .map((e, i) => (
                    <li key={`sp${i}`} className={styles.hint}>
                      {label('market.presale.pending', stage, { week: e.resolveWeek })}
                    </li>
                  ))}
              </ul>
            </div>
          )}
          <Quotes interviews={seg.interviews} />
        </section>
      ))}
    </>
  )
}
