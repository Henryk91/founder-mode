import { useState } from 'react'
import type {
  LoanPlan as LoanPlanDraft,
  LoanTerms,
  LoanView,
  PlayerView,
} from '@founder-mode/engine'
import { formatEuro } from '../format'
import { label, type UiStage } from '../labels'
import { noLoan } from '../store'
import { useGame } from '../useGame'
import { Choices, HintLine, Market, SubHeading, Writing } from './Ruled'
import { Stepper } from './Stepper'
import styles from './ui.module.css'

/** Hours the loan part of a plan takes, as the engine counts them. */
export function loanHours(view: PlayerView, p: LoanPlanDraft | undefined): number {
  if (!view.loan || !p) return 0
  return p.planHours + (p.apply ? view.loan.meetingHours : 0)
}

const pct = (bp: number) => (bp / 100).toFixed(2)
const running = (l: LoanView) => l.loans.filter((x) => x.status === 'running')

/** One line for the closed loan section. */
export function loanSummary(view: PlayerView, p: LoanPlanDraft | undefined, stage: UiStage) {
  const l = view.loan
  if (!l) return ''
  if (p?.apply) return label('loan.sum.apply', stage, { amount: formatEuro(p.apply.amountCents) })
  if (p?.accept) return label('loan.sum.accept', stage)
  if (p?.repay) return label('loan.sum.repay', stage)
  if ((p?.planHours ?? 0) > 0) return label('loan.sum.plan', stage)
  if (l.offer) return label('loan.sum.offer', stage)
  if (l.application) return label('loan.sum.waiting', stage, { week: l.application.decideWeek })
  const owed = running(l).reduce((t, x) => t + x.balanceCents, 0)
  if (owed > 0) return label('loan.sum.owed', stage, { amount: formatEuro(owed) })
  return label('plan.sum.none', stage)
}

/**
 * The bank loan section of the Plan tab (step 6): the loans you have, an offer to take or turn
 * down, the application waiting for an answer, or the business plan and a new application. The
 * bank judges only what is on screen, and says its own-money rule out loud.
 */
export function LoanPlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.loan) ?? noLoan()
  const planned = useGame((s) => s.plannedHours)
  const set = useGame((s) => s.setLoan)
  // The terms on the form; they go into the plan only once Apply is pressed.
  const [form, setForm] = useState<LoanTerms | null>(null)
  if (!view?.loan) return null
  const l = view.loan
  const stage = view.company.uiStage
  const hours = (n: number) => label('unit.hours', stage, { n })
  const free = Math.max(0, view.founder.maxHoursPerWeek - planned)
  const left = Math.max(0, l.planNeeded - l.planHours)
  const ready = l.planHours + draft.planHours >= l.planNeeded
  const waiting = l.canApplyFrom !== null && view.week < l.canApplyFrom
  const apply = draft.apply ??
    form ?? {
      amountCents: l.minCents,
      termMonths: l.termMonths[0]!,
      graceMonths: l.graceMonths[0]!,
    }
  /** Changes the form, and the application too once it is booked. */
  const change = (terms: LoanTerms) => {
    setForm(terms)
    if (draft.apply) set({ apply: terms })
  }

  return (
    <>
      {running(l).map((x) => (
        <Market
          key={x.id}
          label={label('loan.owed', stage, { bank: l.bankName })}
          note={label('loan.owedNote', stage, {
            balance: formatEuro(x.balanceCents),
            payment: formatEuro(x.nextPaymentCents),
            rate: pct(x.rateBp),
            months: x.monthsLeft,
          })}
          choices={chip(
            draft.repay === x.id,
            label(draft.repay === x.id ? 'loan.repayBooked' : 'loan.repay', stage),
            () => set({ repay: draft.repay === x.id ? null : x.id }),
          )}
        />
      ))}
      {running(l).some((x) => x.missedInRow > 0) && (
        <Writing warn>{label('loan.missedWarn', stage)}</Writing>
      )}
      {l.accepted && (
        <Writing>
          {label('loan.arriving', stage, { amount: formatEuro(l.accepted.amountCents) })}
        </Writing>
      )}
      {l.offer && (
        <>
          <Writing>
            {label('loan.offer', stage, {
              bank: l.bankName,
              amount: formatEuro(l.offer.amountCents),
              rate: pct(l.offer.rateBp),
              payment: formatEuro(l.offer.paymentCents),
              years: l.offer.termMonths / 12,
              free: l.offer.graceMonths,
            })}
          </Writing>
          <Choices>
            {chip(
              draft.accept,
              label(draft.accept ? 'loan.acceptBooked' : 'loan.accept', stage),
              () => set({ accept: !draft.accept, decline: false }),
            )}
            {chip(
              draft.decline,
              label(draft.decline ? 'loan.declineBooked' : 'loan.decline', stage),
              () => set({ decline: !draft.decline, accept: false }),
            )}
          </Choices>
        </>
      )}
      {l.application && (
        <Writing>{label('loan.waiting', stage, { week: l.application.decideWeek })}</Writing>
      )}
      {l.refusal && !l.application && !l.offer && (
        <Writing warn>
          {label('loan.refused', stage, {
            reason: label(`loan.reason.${l.refusal.reason}`, stage),
          })}
        </Writing>
      )}
      {!l.application && !l.offer && !l.accepted && (
        <>
          <SubHeading>{label('loan.apply.heading', stage, { bank: l.bankName })}</SubHeading>
          {left > 0 && (
            <Market
              label={label('loan.plan', stage)}
              note={label('loan.planNote', stage, { done: l.planHours, needed: l.planNeeded })}
              control={
                <Stepper
                  stage={stage}
                  value={draft.planHours}
                  onChange={(v) => set({ planHours: v })}
                  what={label('loan.planWhat', stage)}
                  step={2}
                  display={hours(draft.planHours)}
                  hoursValue
                  max={Math.min(left, draft.planHours + Math.floor(free / 2) * 2)}
                />
              }
            />
          )}
          {ready && !waiting && (
            <>
              <Market
                label={label('loan.amount', stage)}
                control={
                  <Stepper
                    stage={stage}
                    value={apply.amountCents}
                    onChange={(v) => change({ ...apply, amountCents: v })}
                    what={label('loan.amountWhat', stage)}
                    names={{ minus: 'stepper.price.minus', plus: 'stepper.price.plus' }}
                    step={l.stepCents}
                    formatStep={(c) => formatEuro(c)}
                    display={formatEuro(apply.amountCents)}
                    min={l.minCents}
                    max={l.maxCents}
                  />
                }
              />
              <Market
                label={label('loan.term', stage)}
                choices={
                  <>
                    {l.termMonths.map((m) =>
                      chip(apply.termMonths === m, label('loan.years', stage, { n: m / 12 }), () =>
                        change({ ...apply, termMonths: m }),
                      ),
                    )}
                  </>
                }
              />
              <Market
                label={label('loan.grace', stage)}
                choices={
                  <>
                    {l.graceMonths.map((m) =>
                      chip(
                        apply.graceMonths === m,
                        m === 0
                          ? label('loan.graceNone', stage)
                          : label('loan.months', stage, { n: m }),
                        () => change({ ...apply, graceMonths: m }),
                      ),
                    )}
                  </>
                }
              />
              <Choices>
                {chip(
                  draft.apply !== null,
                  draft.apply
                    ? label('loan.applyBooked', stage)
                    : label('loan.applyChip', stage, { hours: hours(l.meetingHours) }),
                  () => set({ apply: draft.apply ? null : apply }),
                )}
              </Choices>
            </>
          )}
          {waiting && (
            <Writing>{label('loan.retry', stage, { week: l.canApplyFrom ?? view.week })}</Writing>
          )}
          <Writing>
            {label('loan.ownRule', stage, {
              share: Math.round(l.ownShare * 100),
              own: formatEuro(l.ownMoneyCents),
            })}
          </Writing>
        </>
      )}
      <HintLine term="loan" hint={label('plan.hint.loan', stage)} />
    </>
  )
}

function chip(on: boolean, text: string, onClick: () => void) {
  return (
    <button
      key={text}
      type="button"
      aria-pressed={on}
      className={`${styles.chip} ${on ? styles.chipOn : ''}`}
      onClick={onClick}
    >
      {text}
    </button>
  )
}
