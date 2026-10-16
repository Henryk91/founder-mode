import { BankStatement, ComingUp, WorryNote } from '../components/Statement'
import { Stepper } from '../components/Stepper'
import { OfficeCard } from '../components/OfficePlan'
import { AssetCard } from '../components/AssetCard'
import { formatEuro } from '../format'
import { count, label, stageOf, voiceOf } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

const SMALL_STEP_CENTS = 10_000
const BIG_STEP_CENTS = 100_000
const PRICE_STEP_CENTS = 1_000
const PRICE_BIG_STEP_CENTS = 10_000
const PRICE_MIN_CENTS = 1_000
const PRICE_MAX_CENTS = 500_000

/** Short step labels such as "10", "100" or "1k" next to the euro sign, so buttons stay narrow. */
function formatStepCents(cents: number): string {
  const euros = Math.round(cents / 100)
  return euros >= 1000 && euros % 1000 === 0 ? `€${euros / 1000}k` : `€${euros}`
}

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
  const stage = voiceOf(view)
  const invoicing = !view.bookings || view.bookings.segments.some((x) => x.invoiced)
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
      <BankStatement view={view} />
      <WorryNote view={view} />
      <ComingUp view={view} />
      <OfficeCard />
      <AssetCard />
      <section className={styles.card}>
        <h2 className={styles.title}>{label('money.title', stage)}</h2>
        {stat('money.savings', founder.savingsCents)}
        {stat('money.monthlyRevenue', view.monthlyRevenueCents)}
        {stat('money.fixedCosts', company.monthlyFixedCostsCents)}
        {company.freelanceCentsPerWeek > 0 &&
          stat('money.freelance', company.freelanceCentsPerWeek)}
        <div className={styles.rowHead}>
          <span>{label('money.living', stage)}</span>
          <span className={styles.mono}>
            {label('money.livingValue', stage, {
              week: formatEuro(founder.livingCostCentsPerWeek),
              month: formatEuro(founder.livingCostCentsPerMonth),
            })}
          </span>
        </div>
      </section>

      {view.funding && view.funding.raisedCents > 0 && (
        <section className={styles.card}>
          <h2 className={styles.title}>{label('money.owners', stage)}</h2>
          {stageOf(stage) === 'established' && (
            // Plan 3: one stacked bar, the founder's share in the accent; the rows say the same.
            <div className={styles.capBar} aria-hidden="true">
              {view.funding.capTable.map((row) => (
                <span
                  key={row.name}
                  className={row.round ? styles.capOther : styles.capYou}
                  style={{ flexGrow: row.shareBp }}
                />
              ))}
            </div>
          )}
          {view.funding.capTable.map((row) => (
            <div key={row.name} className={styles.rowHead}>
              <span>
                {row.round
                  ? label('money.ownerInvestor', stage, {
                      name: row.name,
                      amount: formatEuro(row.amountCents),
                      week: row.week ?? 0,
                    })
                  : label('money.ownerYou', stage)}
              </span>
              <span className={styles.mono}>{(row.shareBp / 100).toFixed(1)}%</span>
            </div>
          ))}
          <p className={styles.hint}>
            {label('money.ownersValue', stage, {
              value: formatEuro(view.funding.valueCents),
              multiple: view.funding.valueRevenueMultiple,
              yours: formatEuro(
                Math.round((view.funding.valueCents * view.funding.founderShareBp) / 10_000),
              ),
            })}
          </p>
        </section>
      )}

      {/* Tourism prices are set per group and season on the Plan tab; no monthly price here. */}
      {!view.bookings && (
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
            what={label('money.price', stage)}
            names={{ minus: 'stepper.price.minus', plus: 'stepper.price.plus' }}
            step={PRICE_STEP_CENTS}
            bigStep={PRICE_BIG_STEP_CENTS}
            min={PRICE_MIN_CENTS}
            max={PRICE_MAX_CENTS}
            display={formatEuro(price)}
            formatStep={formatStepCents}
            onChange={(cents) => setPrice(cents === company.priceCentsPerMonth ? null : cents)}
          />
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.title}>{label('money.transfer', stage)}</h2>
        <p className={styles.hint}>{label('money.transferHint', stage)}</p>
        <span>{label('money.transferAmount', stage)}</span>
        <Stepper
          stage={stage}
          value={transfer}
          what={label('money.transfer', stage)}
          names={{ minus: 'stepper.transfer.minus', plus: 'stepper.transfer.plus' }}
          step={SMALL_STEP_CENTS}
          bigStep={BIG_STEP_CENTS}
          max={Math.max(0, founder.savingsCents)}
          display={formatEuro(transfer)}
          formatStep={formatStepCents}
          onChange={setTransfer}
        />
      </section>

      {/* Vouchers sold and not yet redeemed: cash in the bank, guests still owed (plan 2). */}
      {view.bookings?.vouchers && view.bookings.vouchers.sold > 0 && (
        <section className={styles.card}>
          <h2 className={styles.title}>{label('money.vouchers', stage)}</h2>
          <p>
            {count('money.vouchers.open', stage, view.bookings.vouchers.openCount, {
              amount: formatEuro(view.bookings.vouchers.openValueCents),
              units: view.bookings.vouchers.openUnits,
            })}
          </p>
          <p className={styles.hint}>
            {label('money.vouchers.hint', stage, {
              sold: view.bookings.vouchers.sold,
              redeemed: view.bookings.vouchers.redeemed,
            })}
          </p>
        </section>
      )}

      {/* A tourism business where every guest pays on the day sends no invoices at all. */}
      {invoicing && (
        <section className={styles.card}>
          <h2 className={styles.title}>{label('money.invoices', stage)}</h2>
          <p className={styles.hint}>
            {label('money.invoicesHint', stage, {
              hours: label('unit.hours', stage, { n: view.costs.chaseHours }),
            })}
          </p>
          {stat('money.receivables', view.receivablesCents)}
          {view.invoices.some(
            (i) =>
              i.canChase &&
              !chase.includes(i.id) &&
              planned + view.costs.chaseHours > view.founder.maxHoursPerWeek,
          ) && <p className={styles.warn}>{label('noHours', stage)}</p>}
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
                  const chaseText = booked
                    ? label('money.chaseBooked', stage)
                    : label('money.chase', stage, {
                        hours: label('unit.hours', stage, { n: view.costs.chaseHours }),
                      })
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
                          aria-label={label('aria.forName', stage, {
                            action: chaseText,
                            name: inv.customerName,
                          })}
                          onClick={() => toggleChase(inv.id)}
                        >
                          {chaseText}
                        </button>
                      )}
                    </li>
                  )
                })}
            </ul>
          )}
        </section>
      )}
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
            {/* The question takes focus; the safe answer is the one under it. */}
            <button
              type="button"
              className={`${styles.button} ${styles.primary}`}
              onClick={cancelShutDown}
              autoFocus
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
