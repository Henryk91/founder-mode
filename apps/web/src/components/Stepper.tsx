import { label, type LabelKey, type Voice } from '../labels'
import styles from './ui.module.css'

type Props = {
  stage: Voice
  value: number
  onChange: (value: number) => void
  /**
   * What the stepper changes, for the buttons' names: "hours for Small offices" names the buttons
   * "More hours for Small offices" and "Fewer hours for Small offices".
   */
  what: string
  /**
   * Button names for money, where "more" and "fewer" read oddly. They get the step as `{step}`
   * and `what` as `{what}`.
   */
  names?: { minus: LabelKey; plus: LabelKey }
  /** Text shown between the buttons. Defaults to the number. */
  display?: string
  step?: number
  /** How a step size is written on its button. Defaults to the number. */
  formatStep?: (n: number) => string
  /** Optional larger step, adds two more buttons. */
  bigStep?: number
  min?: number
  max: number
  /** Room for a short text such as "+10 h" in small figures, so the stepper keeps its width. */
  hoursValue?: boolean
}

/** Tap only number input: no typing, no dragging. Every button is at least 44 px. */
export function Stepper({
  stage,
  value,
  onChange,
  what,
  names,
  display,
  formatStep = String,
  step = 1,
  bigStep,
  min = 0,
  max,
  hoursValue = false,
}: Props) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const set = (n: number) => () => onChange(clamp(n))
  const atMin = value <= min
  const atMax = value >= max
  const name = (dir: 'minus' | 'plus', size: number) => {
    if (names) return label(names[dir], stage, { step: formatStep(size), what })
    if (size === 1) return label(`stepper.${dir}`, stage, { what })
    return label(`stepper.${dir}Step`, stage, { what, step: formatStep(size) })
  }
  const button = (dir: 'minus' | 'plus', size: number, big: boolean) => (
    <button
      type="button"
      className={styles.stepButton}
      {...(big ? { 'data-big': '' } : {})}
      disabled={dir === 'minus' ? atMin : atMax}
      aria-label={name(dir, size)}
      onClick={set(dir === 'minus' ? value - size : value + size)}
    >
      <span className={styles.stepFace} aria-hidden="true">
        {size === 1 && !big
          ? dir === 'minus'
            ? '−'
            : '+'
          : `${dir === 'minus' ? '-' : '+'}${formatStep(size)}`}
      </span>
    </button>
  )
  return (
    <div
      role="group"
      aria-label={what.charAt(0).toUpperCase() + what.slice(1)}
      className={`${styles.stepper} ${hoursValue ? styles.stepperTight : ''}`}
    >
      {bigStep !== undefined && button('minus', bigStep, true)}
      {button('minus', step, false)}
      <span
        className={`${styles.stepValue} ${hoursValue ? styles.stepHours : ''}`}
        aria-live="polite"
        aria-atomic="true"
      >
        {display ?? value}
      </span>
      {button('plus', step, false)}
      {bigStep !== undefined && button('plus', bigStep, true)}
    </div>
  )
}
