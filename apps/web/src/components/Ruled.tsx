import plan from '../screens/Plan.module.css'

/**
 * Building blocks of the ruled notebook on the Plan tab. Every one is a whole number of 44 px
 * lines tall (see Plan.module.css), so writing always sits on a rule and controls on their line.
 */

/** A label with its controls directly beside it (to the right edge on a phone). */
export function Row(props: {
  label: string
  note?: string | undefined
  children: React.ReactNode
}) {
  return (
    <div className={plan.row}>
      <span className={plan.label}>
        {props.label}
        {props.note && <span className={plan.note}>{props.note}</span>}
      </span>
      <div className={plan.controls}>{props.children}</div>
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
export function Choices(props: { children: React.ReactNode; label?: string }) {
  return (
    <div className={plan.row}>
      <span className={plan.spacer} aria-hidden="true" />
      <div className={plan.choices}>{props.children}</div>
    </div>
  )
}
