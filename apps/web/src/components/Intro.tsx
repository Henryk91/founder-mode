import { label, voiceOf } from '../labels'
import { fillText } from '../texts'
import { useGame } from '../useGame'
import styles from './ui.module.css'
import introStyles from './Intro.module.css'

/** Four short cards before week 1. The text comes from the scenario content. */
export function Intro() {
  const view = useGame((s) => s.view)
  const step = useGame((s) => s.introStep)
  const next = useGame((s) => s.nextIntro)
  const prev = useGame((s) => s.prevIntro)
  if (!view || step === null) return null
  const stage = voiceOf(view)
  const cards = view.guidance.intro
  const card = cards[step]
  if (!card) return null
  const values = {
    cash: view.company.cashCents,
    savings: view.founder.savingsCents,
    living: view.founder.livingCostCentsPerWeek,
    livingMonth: view.founder.livingCostCentsPerMonth,
    maxWeeks: view.maxWeeks,
  }
  const last = step === cards.length - 1

  return (
    <main className={introStyles.intro}>
      <p className={introStyles.step}>
        {label('intro.step', stage, { n: step + 1, total: cards.length })}
      </p>
      <section className={`${styles.card} ${introStyles.card}`} aria-label={card.title}>
        <h1 className={styles.title} tabIndex={-1} data-autofocus>
          {card.title}
        </h1>
        <p className={introStyles.body}>{fillText(card.body, values)}</p>
      </section>
      <div className={introStyles.buttons}>
        {step > 0 && (
          <button type="button" className={styles.button} onClick={prev}>
            {label('intro.back', stage)}
          </button>
        )}
        <button type="button" className={`${styles.button} ${styles.primary}`} onClick={next}>
          {label(last ? 'intro.start' : 'intro.next', stage)}
        </button>
      </div>
    </main>
  )
}
