import type { FundingPlan, FundingView, InvestorView, PlayerView } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { count, label, type UiStage } from '../labels'
import { noFunding } from '../store'
import { useGame } from '../useGame'
import { Choices, HintLine, Market, SubHeading, Writing } from './Ruled'
import { Stepper } from './Stepper'
import styles from './ui.module.css'

/** Hours the raising part of a plan takes, as the engine counts them. */
export function raiseHours(view: PlayerView, p: FundingPlan | undefined): number {
  const f = view.funding
  if (!f || !p) return 0
  const round = f.rounds.find((r) => r.id === (p.start ?? f.round?.id))
  const second = (id: string) => {
    const inv = f.investors.find((i) => i.id === id)
    return f.rounds.find((r) => r.id === inv?.round)?.secondLookHours ?? 0
  }
  return (
    (p.start ? (round?.prepHours ?? 0) : 0) +
    p.pitchHours +
    p.secondLooks.reduce((t, id) => t + second(id), 0) +
    (p.update === 'proper' ? f.updateHours.proper : p.update === 'short' ? f.updateHours.short : 0)
  )
}

/** One line for the closed Raise section. */
export function raiseSummary(view: PlayerView, p: FundingPlan | undefined, stage: UiStage) {
  const f = view.funding
  if (!f) return ''
  const parts: string[] = []
  if (p?.start) parts.push(label('raise.sum.start', stage, { round: roundName(f, p.start) }))
  if (p?.accept) parts.push(label('raise.sum.accept', stage))
  if ((p?.pitchHours ?? 0) > 0) parts.push(label('raise.sum.pitch', stage))
  if ((p?.secondLooks.length ?? 0) > 0) {
    parts.push(count('raise.sum.secondLooks', stage, p!.secondLooks.length))
  }
  if (p?.update) parts.push(label('raise.sum.update', stage))
  if (parts.length > 0) return parts.join(', ')
  const closing = f.investors.find((i) => i.stage === 'accepted')
  if (closing) return label('raise.sum.closing', stage, { week: closing.closeWeek ?? 0 })
  if (f.round) return label('raise.sum.open', stage, { round: roundName(f, f.round.id) })
  if (f.raisedCents > 0) {
    return label('raise.sum.owned', stage, { share: pctOf(f.founderShareBp) })
  }
  return label('plan.sum.none', stage)
}

const roundName = (f: FundingView, id: string) =>
  (f.rounds.find((r) => r.id === id)?.name ?? id).toLowerCase()
const pctOf = (bp: number) => (bp / 100).toFixed(1)

/**
 * The Raise section of the Plan tab (long mode): start a round, pitch, book second looks, take or
 * turn down a term sheet, and answer the investors at a month end. Investors judge only what is on
 * screen; the bar each round states is all the player needs.
 */
export function RaisePlan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan.funding) ?? noFunding()
  const planned = useGame((s) => s.plannedHours)
  const set = useGame((s) => s.setFunding)
  if (!view?.funding) return null
  const f = view.funding
  const stage = view.company.uiStage
  const hours = (n: number) => label('unit.hours', stage, { n })
  const free = Math.max(0, view.founder.maxHoursPerWeek - planned)
  const closing = f.investors.find((i) => i.stage === 'accepted')
  const offered = f.investors.filter((i) => i.stage === 'offered')
  const interested = f.investors.filter((i) => i.stage === 'interested')
  const round = f.round ? f.rounds.find((r) => r.id === f.round!.id) : null
  const per = round?.pitchHoursPerMeeting ?? 1

  return (
    <>
      {f.raisedCents > 0 && (
        <Market
          label={label('raise.owned', stage)}
          note={label('raise.ownedNote', stage, {
            share: pctOf(f.founderShareBp),
            raised: formatEuro(f.raisedCents),
          })}
        />
      )}
      {f.mood && <Writing>{label(`raise.mood.${f.mood}`, stage)}</Writing>}
      {f.milestone && (
        <Writing>
          {label(`raise.milestone.${f.milestone.status}`, stage, {
            amount: formatEuro(f.milestone.monthlyCents),
            week: f.milestone.byWeek,
          })}
        </Writing>
      )}
      {f.updateDue && (
        <>
          <Writing>{label('raise.updateDue', stage)}</Writing>
          <Choices>
            {chip(
              draft.update === 'proper',
              label('raise.updateProper', stage, { hours: hours(f.updateHours.proper) }),
              () => set({ update: draft.update === 'proper' ? null : 'proper' }),
            )}
            {chip(
              draft.update === 'short',
              label('raise.updateShort', stage, { hours: hours(f.updateHours.short) }),
              () => set({ update: draft.update === 'short' ? null : 'short' }),
            )}
          </Choices>
        </>
      )}
      {closing && (
        <Writing>
          {label('raise.closing', stage, { name: closing.name, week: closing.closeWeek ?? 0 })}
        </Writing>
      )}
      {offered.map((inv) => (
        <TermSheetRows
          key={inv.id}
          inv={inv}
          stage={stage}
          draft={draft}
          set={set}
          closing={!!closing}
        />
      ))}
      {f.round && round && (
        <>
          <SubHeading>{label('raise.open', stage, { round: round.name })}</SubHeading>
          <Writing>{round.barText}</Writing>
          {f.round.investorsLeft > 0 && (
            <Market
              label={label('raise.pitch', stage)}
              note={count('raise.left', stage, f.round.investorsLeft)}
              control={
                <Stepper
                  stage={stage}
                  value={draft.pitchHours}
                  onChange={(v) => set({ pitchHours: v })}
                  what={label('raise.pitchWhat', stage)}
                  step={per}
                  display={hours(draft.pitchHours)}
                  hoursValue
                  max={Math.min(
                    per * f.round.investorsLeft,
                    draft.pitchHours + Math.floor(free / per) * per,
                  )}
                />
              }
            />
          )}
          {f.round.investorsLeft > 0 && (
            <Writing>{label('raise.pitchRule', stage, { hours: hours(per) })}</Writing>
          )}
          {interested.map((inv) => {
            const on = draft.secondLooks.includes(inv.id)
            const look = f.rounds.find((r) => r.id === inv.round)?.secondLookHours ?? 0
            return (
              <Market
                key={inv.id}
                label={inv.name}
                note={label('raise.interested', stage)}
                choices={chip(
                  on,
                  on
                    ? label('raise.secondLookBooked', stage)
                    : label('raise.secondLook', stage, { hours: hours(look) }),
                  () =>
                    set({
                      secondLooks: on
                        ? draft.secondLooks.filter((x) => x !== inv.id)
                        : [...draft.secondLooks, inv.id],
                      stop: false,
                    }),
                )}
              />
            )
          })}
          <Choices>
            {chip(
              draft.stop,
              draft.stop ? label('raise.stopBooked', stage) : label('raise.stop', stage),
              () => set({ stop: !draft.stop, secondLooks: [], pitchHours: 0 }),
            )}
          </Choices>
        </>
      )}
      {f.canStart &&
        f.rounds
          .filter((r) => r.investorsLeft > 0)
          .map((r) => {
            const on = draft.start === r.id
            return (
              <div key={r.id}>
                <Market
                  label={r.name}
                  note={label('raise.amount', stage, {
                    min: formatEuro(r.amountCents.min),
                    max: formatEuro(r.amountCents.max),
                  })}
                  choices={chip(
                    on,
                    on
                      ? label('raise.startBooked', stage)
                      : label('raise.start', stage, { hours: hours(r.prepHours) }),
                    () =>
                      set({
                        start: on ? null : r.id,
                        pitchHours: on ? 0 : r.pitchHoursPerMeeting * 2,
                      }),
                  )}
                />
                <Writing>{r.barText}</Writing>
                <Writing>
                  {label('raise.rule', stage, {
                    meeting: hours(r.pitchHoursPerMeeting),
                    look: hours(r.secondLookHours),
                    weeks: count('unit.weeks', stage, r.closingWeeks),
                    left: r.investorsLeft,
                  })}
                </Writing>
              </div>
            )
          })}
      {f.investors.some((i) => i.stage === 'passed' || i.stage === 'withdrawn') && (
        <>
          <SubHeading>{label('raise.passed', stage)}</SubHeading>
          {f.investors
            .filter((i) => i.stage === 'passed' || i.stage === 'withdrawn')
            .slice(-4)
            .map((i) => (
              <Writing key={i.id}>
                {label('raise.passedLine', stage, {
                  name: i.name,
                  reason: label(`funding.reason.${i.reason ?? 'more_revenue'}`, stage),
                })}
              </Writing>
            ))}
        </>
      )}
      <HintLine term="raise" hint={label('plan.hint.raise', stage)} />
    </>
  )
}

function TermSheetRows(props: {
  inv: InvestorView
  stage: UiStage
  draft: FundingPlan
  set: (change: Partial<FundingPlan>) => void
  closing: boolean
}) {
  const { inv, stage, draft, set } = props
  const t = inv.terms
  if (!t) return null
  const accepted = draft.accept === inv.id
  const declined = draft.decline.includes(inv.id)
  return (
    <>
      <SubHeading>{label('raise.terms', stage, { name: inv.name })}</SubHeading>
      <Writing>
        {label('raise.termsLine', stage, {
          amount: formatEuro(t.amountCents),
          share: pctOf(t.shareBp),
          pre: formatEuro(t.preMoneyCents),
          week: t.expiresWeek,
        })}
      </Writing>
      {t.milestone && (
        <Writing>
          {label('raise.termsMilestone', stage, {
            amount: formatEuro(t.milestone.monthlyCents),
            week: t.milestone.byWeek,
          })}
        </Writing>
      )}
      {!props.closing && (
        <Choices>
          {chip(
            accepted,
            accepted ? label('raise.acceptBooked', stage) : label('raise.accept', stage),
            () =>
              set({
                accept: accepted ? null : inv.id,
                decline: draft.decline.filter((x) => x !== inv.id),
              }),
          )}
          {chip(
            declined,
            declined ? label('raise.declineBooked', stage) : label('raise.decline', stage),
            () =>
              set({
                decline: declined
                  ? draft.decline.filter((x) => x !== inv.id)
                  : [...draft.decline, inv.id],
                accept: draft.accept === inv.id ? null : draft.accept,
              }),
          )}
        </Choices>
      )}
    </>
  )
}

/** A chip: a toggle as wide as its text, inside a 44 px tap target. */
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
