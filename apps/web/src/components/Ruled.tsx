import type { ExplainKey } from '../store'
import { useGame } from '../useGame'
import { label as text } from '../labels'
import plan from '../screens/Plan.module.css'

/**
 * Building blocks of the ruled notebook on the Plan tab. Every one is a whole number of 44 px
 * lines tall (see Plan.module.css), so writing always sits on a rule and controls on their line.
 */

/** A label with its controls beside it (to the right edge on a phone). */
export function Row(props: {
  label: string
  note?: string | undefined
  children?: React.ReactNode
}) {
  return (
    <div className={plan.row}>
      <span className={plan.label}>
        {props.label}
        {props.note && <span className={plan.note}>{props.note}</span>}
      </span>
      {props.children && <div className={plan.controls}>{props.children}</div>}
    </div>
  )
}

/**
 * A market (or anything with a choice): label and stepper, then its choices. The choices take the
 * next line on a phone and share the line with the label on the desk.
 */
export function Market(props: {
  label: string
  note?: string | undefined
  control?: React.ReactNode
  choices?: React.ReactNode
}) {
  return (
    <div className={plan.market}>
      <Row label={props.label} note={props.note}>
        {props.control}
      </Row>
      {props.choices && <Choices>{props.choices}</Choices>}
    </div>
  )
}

/** A line of writing with nothing beside it. */
export function Writing(props: { children: React.ReactNode; warn?: boolean }) {
  return (
    <div className={plan.line}>
      <span className={`${plan.label} ${props.warn ? plan.warnText : ''}`}>{props.children}</span>
    </div>
  )
}

/** A heading over a few rows. */
export function SubHeading(props: { children: React.ReactNode }) {
  return (
    <div className={plan.line}>
      <span className={plan.sub}>{props.children}</span>
    </div>
  )
}

/** Options on one line, as wide as their text. More than fit wrap onto further whole lines. */
export function Choices(props: { children: React.ReactNode }) {
  return (
    <div className={plan.choicesRow}>
      <div className={plan.choices}>{props.children}</div>
    </div>
  )
}

/** The end of an open section: one hint line and a "more" link that opens the full explanation. */
export function HintLine(props: { hint: string; term: ExplainKey }) {
  const open = useGame((s) => s.openExplain)
  const stage = useGame((s) => s.view?.company.uiStage ?? 'scrappy')
  return (
    <div className={plan.hintLine}>
      <span className={plan.hint}>{props.hint}</span>
      <button type="button" className={plan.more} onClick={() => open(props.term)}>
        <span className={plan.moreText}>{text('plan.more', stage)}</span>
      </button>
    </div>
  )
}
