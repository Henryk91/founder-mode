import type { MessageChoice, MessageView, PlayerView } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { label, type UiStage } from '../labels'
import styles from './Letters.module.css'

type Props = {
  message: MessageView
  view: PlayerView
  freeHours: number
  onAnswer: (choiceId: string) => void
  /** A fixed tilt in degrees, used only once the message has no buttons left. */
  tilt?: number | undefined
}

/**
 * One inbox message in its look: a letter with a portrait (MessageCard), a sticky note in
 * handwriting (StickyNote), or a grey official letter with a mono header (OfficialLetter).
 */
export function Letter(props: Props) {
  switch (props.message.look) {
    case 'note':
      return <StickyNote {...props} />
    case 'official':
      return <OfficialLetter {...props} />
    default:
      return <MessageCard {...props} />
  }
}

export function MessageCard(props: Props) {
  const { message: m, view } = props
  const stage = view.company.uiStage
  const named = m.fromName !== m.fromRole
  return (
    <article className={styles.letter} style={tiltStyle(props)}>
      <header className={styles.from}>
        <span className={styles.portrait} aria-hidden="true">
          {initials(m.fromName)}
        </span>
        <span className={styles.who}>
          <span className={styles.name}>{m.fromName}</span>
          {named && <span className={styles.role}>{m.fromRole}</span>}
        </span>
        <span className={styles.week}>{label('market.week', stage, { week: m.week })}</span>
      </header>
      <p className={styles.body}>{m.text}</p>
      <Answer {...props} />
    </article>
  )
}

export function StickyNote(props: Props) {
  const { message: m } = props
  const named = m.fromName !== m.fromRole
  return (
    <article className={styles.sticky} style={stickyTilt(props)}>
      <p className={styles.hand}>{m.text}</p>
      <p className={styles.signature}>
        {named
          ? label('inbox.fromRole', props.view.company.uiStage, {
              name: m.fromName,
              role: m.fromRole,
            })
          : m.fromName}
      </p>
      <Answer {...props} />
    </article>
  )
}

export function OfficialLetter(props: Props) {
  const { message: m, view } = props
  const stage = view.company.uiStage
  return (
    <article className={styles.official} style={tiltStyle(props)}>
      <header className={styles.officialHead}>
        <span>{m.fromName}</span>
        <span>{label('market.week', stage, { week: m.week })}</span>
      </header>
      <p className={styles.body}>{m.text}</p>
      <Answer {...props} />
    </article>
  )
}

/** The choices with their costs, or the answer already given. Hours are shown, never odds. */
function Answer({ message: m, view, freeHours, onAnswer }: Props) {
  const stage = view.company.uiStage
  const chosen = m.choices.find((c) => c.id === m.answeredChoiceId)
  if (chosen) {
    return (
      <p className={styles.answered}>
        <span className={styles.stampGood}>{label('inbox.stamp.answered', stage)}</span>{' '}
        {label('inbox.answered', stage, { choice: chosen.label })}
      </p>
    )
  }
  const last = m.expiresWeek <= view.week
  return (
    <>
      {last ? (
        <span className={styles.stamp}>{label('inbox.stamp.last', stage)}</span>
      ) : (
        <p className={styles.expires}>{label('inbox.expires', stage, { week: m.expiresWeek })}</p>
      )}
      <div className={styles.choices}>
        {m.choices.map((c) => (
          <button
            key={c.id}
            type="button"
            className={styles.choice}
            disabled={c.hours > freeHours}
            onClick={() => onAnswer(c.id)}
          >
            {c.label} <span className={styles.cost}>({costParts(c, stage).join(', ')})</span>
          </button>
        ))}
      </div>
      {m.choices.some((c) => c.hours > freeHours) && (
        <p className={styles.expires}>{label('inbox.noRoom', stage)}</p>
      )}
    </>
  )
}

function tiltStyle(props: Props): React.CSSProperties | undefined {
  // Paper only tilts once it has no buttons left (docs/design/design.md, shape and effects).
  if (!props.tilt || props.message.answeredChoiceId === null) return undefined
  return { transform: `rotate(${props.tilt}deg)` }
}

/** Sticky notes always sit at their fixed small angle, as on the desk mockup. */
function stickyTilt(props: Props): React.CSSProperties | undefined {
  return props.tilt ? { transform: `rotate(${props.tilt}deg)` } : undefined
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter((w) => /^\p{L}/u.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

/** What a choice costs: hours, money now, and money every month. Free when it costs nothing. */
export function costParts(c: MessageChoice, stage: UiStage): string[] {
  const parts: string[] = []
  if (c.hours > 0) parts.push(label('unit.hours', stage, { n: c.hours }))
  if (c.costCents > 0) {
    parts.push(label('inbox.cost.money', stage, { amount: formatEuro(c.costCents) }))
  }
  if (c.possibleCostCents > 0) {
    parts.push(label('inbox.cost.possible', stage, { amount: formatEuro(c.possibleCostCents) }))
  }
  if (c.monthlyCostCents > 0) {
    parts.push(label('inbox.cost.monthly', stage, { amount: formatEuro(c.monthlyCostCents) }))
  }
  return parts.length > 0 ? parts : [label('inbox.free', stage)]
}
