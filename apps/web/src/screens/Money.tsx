import { Stepper } from '../components/Stepper'
import { formatEuro } from '../format'
import { count, label } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

const SMALL_STEP_CENTS = 10_000
const BIG_STEP_CENTS = 100_000
const PRICE_STEP_CENTS = 1_000
const PRICE_BIG_STEP_CENTS = 10_000
const PRICE_MIN_CENTS = 1_000
const PRICE_MAX_CENTS = 500_000

export function Money() {
  const view = useGame((s) => s.view)
  const transfer = useGame((s) => s.plan.transferToCompanyCents)
  const setTransfer = useGame((s) => s.setTransferCents)
  const draftPrice = useGame((s) => s.plan.priceCentsPerMonth)
  const setPrice = useGame((s) => s.setPriceCents)
  const chase = useGame((s) => s.plan.chase)
  const toggleChase = useGame((s) => s.toggleChase)
  const planned = useGame((s) => s.plannedHours)
  const shutDown = useGame((s) => s.shutDown)
  const asked = useGame((s) => s.shutDownAsked)
  const askShutDown = useGame((s) => s.askShutDown)
  const cancelShutDown = useGame((s) => s.cancelShutDown)
  if (!view) return null
  const stage = view.company.uiStage
  const { company, founder } = view
  const price = draftPrice ?? company.priceCentsPerMonth
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
        <h2 className={styles.title}>{label('money.price', stage)}</h2>
        <p className={styles.hint}>{label('money.priceHint', stage)}</p>
        <span>
          {label(
            price === company.priceCentsPerMonth ? 'money.priceNow' : 'money.priceNew',
            stage,
            {
              price: formatEuro(price),
            },
          )}
        </span>
        <Stepper
          stage={stage}
          value={price}
          step={PRICE_STEP_CENTS}
          bigStep={PRICE_BIG_STEP_CENTS}
          min={PRICE_MIN_CENTS}
          max={PRICE_MAX_CENTS}
          display={formatEuro(price)}
          formatStep={formatEuro}
          onChange={(cents) => setPrice(cents === company.priceCentsPerMonth ? null : cents)}
        />
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
        <h2 className={styles.title}>{label('money.invoices', stage)}</h2>
        <p className={styles.hint}>
          {label('money.invoicesHint', stage, {
            hours: label('unit.hours', stage, { n: view.costs.chaseHours }),
          })}
        </p>
        {stat('money.receivables', view.receivablesCents)}
        {view.invoices.length === 0 ? (
          <p className={styles.hint}>{label('money.invoicesNone', stage)}</p>
        ) : (
          <ul className={styles.list}>
            {[...view.invoices]
              .reverse()
              .slice(0, 12)
              .map((inv) => {
                const booked = chase.includes(inv.id)
                const canBook =
                  booked || planned + view.costs.chaseHours <= view.founder.maxHoursPerWeek
                return (
                  <li key={inv.id} className={styles.row}>
                    <div className={styles.rowHead}>
                      <span>{inv.customerName}</span>
                      <span className={styles.mono}>{formatEuro(inv.amountCents)}</span>
                    </div>
                    <span className={inv.status === 'overdue' ? styles.warn : styles.hint}>
                      {inv.status === 'paid' &&
                        label('money.invoice.paid', stage, { week: inv.paidWeek ?? 0 })}
                      {inv.status === 'written_off' && label('money.invoice.written_off', stage)}
                      {inv.status === 'open' &&
                        label('money.invoice.open', stage, { week: inv.dueWeek })}
                      {inv.status === 'overdue' &&
                        count('money.invoice.overdue', stage, inv.overdueWeeks)}
                    </span>
                    {inv.canChase && (
                      <button
                        type="button"
                        aria-pressed={booked}
                        disabled={!canBook}
                        className={`${styles.button} ${booked ? styles.primary : ''}`}
                        onClick={() => toggleChase(inv.id)}
                      >
                        {booked
                          ? label('money.chaseBooked', stage)
                          : label('money.chase', stage, {
                              hours: label('unit.hours', stage, { n: view.costs.chaseHours }),
                            })}
                      </button>
                    )}
                  </li>
                )
              })}
          </ul>
        )}
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
      <section className={styles.card}>
        <h2 className={styles.title}>{label('money.shutDown', stage)}</h2>
        {asked ? (
          <div
            role="alertdialog"
            aria-label={label('money.shutDownAsk', stage)}
            className={styles.row}
          >
            <p className={styles.warn}>{label('money.shutDownAsk', stage)}</p>
            <p className={styles.hint}>{label('money.shutDownWarn', stage)}</p>
            <button type="button" className={styles.button} onClick={shutDown}>
              {label('money.shutDownYes', stage)}
            </button>
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={cancelShutDown}
            >
              {label('money.shutDownNo', stage)}
            </button>
          </div>
        ) : (
          <>
            <p className={styles.hint}>{label('money.shutDownHint', stage)}</p>
            <button type="button" className={styles.button} onClick={askShutDown}>
              {label('money.shutDown', stage)}
            </button>
          </>
        )}
      </section>
    </>
  )
}
