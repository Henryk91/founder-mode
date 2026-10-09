import { Stepper } from '../components/Stepper'
import { formatEuro } from '../format'
import { label } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

const SMALL_STEP_CENTS = 10_000
const BIG_STEP_CENTS = 100_000

export function Money() {
  const view = useGame((s) => s.view)
  const transfer = useGame((s) => s.plan.transferToCompanyCents)
  const setTransfer = useGame((s) => s.setTransferCents)
  if (!view) return null
  const stage = view.company.uiStage
  const { company, founder } = view
  const stat = (key: Parameters<typeof label>[0], cents: number) => (
    <div className={styles.rowHead}>
      <span>{label(key, stage)}</span>
      <span className={styles.mono}>{formatEuro(cents)}</span>
    </div>
  )

  return (
    <>
      <section className={styles.card}>
        <h2 className={styles.title}>{label('money.title', stage)}</h2>
        {stat('money.cash', company.cashCents)}
        {stat('money.savings', founder.savingsCents)}
        {stat('money.monthlyRevenue', view.monthlyRevenueCents)}
        {stat('money.fixedCosts', company.monthlyFixedCostsCents)}
        {stat('money.living', founder.livingCostCentsPerWeek)}
      </section>

      <section className={styles.card}>
        <h2 className={styles.title}>{label('money.transfer', stage)}</h2>
        <p className={styles.hint}>{label('money.transferHint', stage)}</p>
        <span>{label('money.transferAmount', stage)}</span>
        <Stepper
          stage={stage}
          value={transfer}
          step={SMALL_STEP_CENTS}
          bigStep={BIG_STEP_CENTS}
          max={Math.max(0, founder.savingsCents)}
          display={formatEuro(transfer)}
          formatStep={formatEuro}
          onChange={setTransfer}
        />
      </section>

      <section className={styles.card}>
        <h2 className={styles.title}>{label('money.history', stage)}</h2>
        {view.history.length === 0 ? (
          <p className={styles.hint}>{label('money.historyNone', stage)}</p>
        ) : (
          <ul className={styles.list}>
            {view.history
              .slice(-6)
              .reverse()
              .map((h) => (
                <li key={h.week} className={styles.rowHead}>
                  <span>{label('money.historyRow', stage, { week: h.week })}</span>
                  <span className={styles.mono}>{formatEuro(h.cashCents)}</span>
                </li>
              ))}
          </ul>
        )}
      </section>
    </>
  )
}
