import type { ExplainKey } from '../store'
import { useGame } from '../useGame'
import { label as text, voiceOf } from '../labels'
import plan from '../screens/Plan.module.css'

/**
 * Building blocks of the ruled notebook on the Plan tab. Every one is a whole number of 44 px
 * lines tall (see Plan.module.css), so writing always sits on a rule and controls on their line.
 */

/**
 * A label with its controls beside it (to the right edge on a phone). A long label, such as two
 * leads called "Frauenarztpraxis Dr. ...", wraps onto further whole lines instead of being cut,
 * and the controls stay on its first line.
 */
export function Row(props: {
  label: string
  note?: string | undefined
  /** Label and controls share a line only when both fit whole; else the controls take the next. */
  stack?: boolean | undefined
  children?: React.ReactNode
}) {
  return (
    <div
      className={`${plan.row} ${props.children ? '' : plan.rowAlone} ${props.stack ? plan.rowStack : ''}`}
    >
      <Wrapped>
        {props.label}
        {/* The note may take the next line whole, rather than the label's last word with it. */}
        {props.note && (
          <>
            <wbr />
            <span className={plan.note}>{props.note}</span>
          </>
        )}
      </Wrapped>
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
  stack?: boolean
}) {
  return (
    <div className={plan.market}>
      <Row label={props.label} note={props.note} stack={props.stack}>
        {props.control}
      </Row>
      {props.choices && <Choices>{props.choices}</Choices>}
    </div>
  )
}

/**
 * A line of writing with nothing beside it. Text too long for the line runs onto further whole
 * lines; nothing in the notebook is cut short (only a section summary on a phone may be).
 */
export function Writing(props: { children: React.ReactNode; warn?: boolean }) {
  return (
    <div className={plan.line}>
      <Wrapped warn={props.warn}>{props.children}</Wrapped>
    </div>
  )
}

/**
 * Handwriting that wraps instead of being cut off. Every line of it is one ruled line, and the
 * inner span sets each baseline on its rule.
 */
function Wrapped(props: { children: React.ReactNode; warn?: boolean | undefined }) {
  return (
    <div className={`${plan.wrapped} ${props.warn ? plan.warnText : ''}`}>
      <span className={plan.onRule}>{props.children}</span>
    </div>
  )
}

/**
 * A feature to build. On a phone it takes two lines: the full name (wrapping onto more lines if
 * it must), then, indented, a thin progress bar, the hours built so far, and the stepper. On the
 * desk all of it shares one line.
 */
export function FeatureRow(props: {
  name: string
  progressHours: number
  buildHours: number
  progressText: string
  /** The same in words, for screen readers. */
  progressSpoken: string
  children: React.ReactNode
}) {
  const share = props.buildHours > 0 ? props.progressHours / props.buildHours : 0
  return (
    <div className={plan.feature}>
      <Wrapped>{props.name}</Wrapped>
      <div className={plan.featureLine}>
        <span className={plan.progress} aria-hidden="true">
          <span
            className={plan.progressFill}
            style={{ transform: `scaleX(${share.toFixed(3)})` }}
          />
        </span>
        <span className={`${plan.mono} ${plan.progressText}`}>
          <span aria-hidden="true">{props.progressText}</span>
          <span className="visually-hidden">{props.progressSpoken}</span>
        </span>
        <div className={`${plan.controls} ${plan.right}`}>{props.children}</div>
      </div>
    </div>
  )
}

/** A heading over a few rows. */
export function SubHeading(props: { children: React.ReactNode }) {
  return (
    <div className={plan.line}>
      <div className={`${plan.wrapped} ${plan.subWrapped}`}>
        <span className={plan.onRule}>{props.children}</span>
      </div>
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

/**
 * The end of an open section: one hint line and a "more" link that opens the full explanation.
 * Hints are written to fit one line on a phone; one that does not wraps onto the next ruled line,
 * and is never cut off.
 */
export function HintLine(props: { hint: string; term: ExplainKey }) {
  const open = useGame((s) => s.openExplain)
  const stage = useGame((s) => (s.view ? voiceOf(s.view) : 'scrappy'))
  return (
    <div className={plan.hintLine}>
      <div className={`${plan.wrapped} ${plan.hintText}`}>
        <span className={plan.onRule}>{props.hint}</span>
      </div>
      <button type="button" className={plan.more} onClick={() => open(props.term)}>
        <span className={plan.moreText}>{text('plan.more', stage)}</span>
      </button>
    </div>
  )
}
