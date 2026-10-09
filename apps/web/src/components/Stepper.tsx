import { label, type UiStage } from '../labels'
import styles from './ui.module.css'

type Props = {
  stage: UiStage
  value: number
  onChange: (value: number) => void
  /** Text shown between the buttons. Defaults to the number. */
  display?: string
  step?: number
  /** How a step size is written on its button. Defaults to the number. */
  formatStep?: (n: number) => string
  /** Optional larger step, adds two more buttons. */
  bigStep?: number
  min?: number
  max: number
}

/** Tap only number input: no typing, no dragging. Every button is at least 44 px. */
export function Stepper({
  stage,
  value,
  onChange,
  display,
  formatStep = String,
  step = 1,
  bigStep,
  min = 0,
  max,
}: Props) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n))
  const set = (n: number) => () => onChange(clamp(n))
  const atMin = value <= min
  const atMax = value >= max
  return (
    <div className={styles.stepper}>
      {bigStep !== undefined && (
        <button
          type="button"
          className={styles.stepButton}
          disabled={atMin}
          aria-label={label('stepper.minusBig', stage)}
          onClick={set(value - bigStep)}
        >
          {`-${formatStep(bigStep)}`}
        </button>
      )}
      <button
        type="button"
        className={styles.stepButton}
        disabled={atMin}
        aria-label={label('stepper.minus', stage)}
        onClick={set(value - step)}
      >
        {step === 1 ? '-' : `-${formatStep(step)}`}
      </button>
      <span className={styles.stepValue}>{display ?? value}</span>
      <button
        type="button"
        className={styles.stepButton}
        disabled={atMax}
        aria-label={label('stepper.plus', stage)}
        onClick={set(value + step)}
      >
        {step === 1 ? '+' : `+${formatStep(step)}`}
      </button>
      {bigStep !== undefined && (
        <button
          type="button"
          className={styles.stepButton}
          disabled={atMax}
          aria-label={label('stepper.plusBig', stage)}
          onClick={set(value + bigStep)}
        >
          {`+${formatStep(bigStep)}`}
        </button>
      )}
    </div>
  )
}
