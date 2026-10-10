import type { ExplainKey } from '../store'
import plan from '../screens/Plan.module.css'
import styles from './ui.module.css'
import { ExplainButton } from './Explain'

/**
 * Building blocks of the ruled notebook on the Plan tab. Every block is a whole number of lines
 * tall (see Plan.module.css), so text always sits on a rule.
 */

/** Up to two lines of explanation; the rest of it waits behind the "?". */
export function HintRow(props: { children: React.ReactNode; term?: ExplainKey }) {
  return (
    <div className={plan.hintRow}>
      <p>{props.children}</p>
      {props.term && <ExplainButton term={props.term} />}
    </div>
  )
}

/** A row: a name (and a note) with controls beside it when they fit, below when they do not. */
export function Item(props: { children: React.ReactNode }) {
  return <div className={plan.item}>{props.children}</div>
}

export function Name(props: { name: string; note?: string | undefined }) {
  return (
    <div className={plan.name}>
      <span>{props.name}</span>
      {props.note && <span className={styles.hint}>{props.note}</span>}
    </div>
  )
}

/** A name with a figure on the right of the same line, and a note below. */
export function NameWithFigure(props: { name: string; figure: string; note?: string }) {
  return (
    <div className={plan.name}>
      <span className={plan.nameRow}>
        <span>{props.name}</span>
        <span className={styles.mono}>{props.figure}</span>
      </span>
      {props.note && <span className={styles.hint}>{props.note}</span>}
    </div>
  )
}

/** A stepper or a button, centred in a two line unit. */
export function Controls(props: { children: React.ReactNode }) {
  return <div className={plan.controls}>{props.children}</div>
}

/** A full width unit of buttons: one wide button, or a grid of choices of any number of rows. */
export function Choices(props: { children: React.ReactNode; columns?: number | 'one' }) {
  const { columns } = props
  const style =
    typeof columns === 'number'
      ? { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }
      : undefined
  return (
    <div className={`${plan.full} ${columns === 'one' ? plan.wide : ''}`} style={style}>
      {props.children}
    </div>
  )
}

/** A name with controls that fit beside it or wrap below it. */
export function Line(props: {
  name: string
  note?: string | undefined
  children: React.ReactNode
}) {
  return (
    <Item>
      <Name name={props.name} note={props.note} />
      <Controls>{props.children}</Controls>
    </Item>
  )
}
