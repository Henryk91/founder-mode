import type { ScenarioAbout, ScenarioCategory } from '@founder-mode/content'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { bestRuns, type Bests } from '../bestRuns'
import { formatEuro } from '../format'
import { useWide } from '../layout/useWide'
import { count, label, type Voice } from '../labels'
import {
  FILTER_ABOVE,
  categoryLayout,
  companiesIn,
  lengthTag,
  tagsIn,
  tagsOf,
  type CategoryLayout,
} from '../startList'
import type { RunRecord } from '../storage'
import type { SavedGame } from '../store'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'
import startStyles from './Start.module.css'

const stage: Voice = 'scrappy'

/**
 * Where focus goes after a tap swaps the category grid for a list or back: the control tapped is
 * gone, so the new view's first stop takes it. Set by the tap, used once by the view it opens.
 */
let focusAfterSwap = false

/**
 * The Start screen (docs/design/start-screen.html): a saved game on top, the categories as tabs,
 * chips or a grid by how many there are, one short row per company, and a sheet per company with
 * its description, run length, best runs, seed and the way in. On a phone the sheet comes up from
 * the bottom over the list; at desk width it is a panel beside the list.
 */
export function Start() {
  const notice = useGame((s) => s.saveNotice)
  const storageNotice = useGame((s) => s.storageNotice)
  const runsNotice = useGame((s) => s.runsNotice)
  const categories = useGame((s) => s.categories)
  const category = useGame((s) => s.category)
  const sheetOpen = useGame((s) => s.sheetOpen)
  const wide = useWide()
  const layout = categoryLayout(categories.length)
  // On a phone the sheet is modal: the page behind it cannot be reached until it closes.
  const behind = sheetOpen && !wide

  return (
    <main className={`${startStyles.start} ${wide ? startStyles.wide : ''}`}>
      <div className={startStyles.page} inert={behind}>
        <h1 className={startStyles.title} tabIndex={-1} data-autofocus>
          {label('app.title', stage)}
        </h1>
        <p className={startStyles.sub}>{label('start.sub', stage)}</p>

        {(notice || storageNotice || runsNotice) && (
          <div className={`${styles.card} ${styles.sticky} ${styles.notice}`} role="status">
            {notice && <p>{label(`start.notice.${notice}`, stage)}</p>}
            {storageNotice && <p>{label(`storage.notice.${storageNotice}`, stage)}</p>}
            {runsNotice && <p>{label(`runs.notice.${runsNotice}`, stage)}</p>}
          </div>
        )}

        <ContinueCard />

        <h2 className="visually-hidden">{label('start.pick', stage)}</h2>
        {layout === 'grid' && category === null ? (
          <CategoryGrid categories={categories} />
        ) : (
          <Companies layout={layout} />
        )}
        <p className={startStyles.bestInside}>{label('start.bestInside', stage)}</p>
      </div>
      {sheetOpen ? (
        <Sheet modal={!wide} />
      ) : (
        wide && (
          <p className={`${styles.card} ${styles.sticky} ${startStyles.note}`}>
            {label('start.pickHint', stage)}
          </p>
        )
      )}
    </main>
  )
}

/** "Week 34 of 104 · €11,200 in the bank", as far as the save's note tells. */
function saveLine(save: SavedGame): string {
  if (save.week === null) return ''
  const week =
    save.maxWeeks === null
      ? label('start.continueWeekOnly', stage, { week: save.week })
      : label('start.continueWeek', stage, { week: save.week, weeks: save.maxWeeks })
  if (save.cashCents === null) return week
  // The Start screen is the way back after the UI broke; an amount that will not format must not
  // take Continue down with it, so the line keeps the week alone.
  try {
    return `${week} · ${label('start.continueCash', stage, { amount: formatEuro(save.cashCents) })}`
  } catch {
    return week
  }
}

/** The game played most recently, and any others behind a link. Nothing without a save. */
function ContinueCard() {
  const saves = useGame((s) => s.saves)
  const scenarios = useGame((s) => s.scenarios)
  const ready = useGame((s) => s.ready)
  const continueRun = useGame((s) => s.continueRun)
  const [showOthers, setShowOthers] = useState(false)
  const id = useId()
  const [last, ...others] = saves
  if (!last) return null
  const name = (save: SavedGame) => scenarios.find((x) => x.id === save.scenarioId)?.name ?? ''
  return (
    <section className={`${styles.sticky} ${startStyles.continue}`} aria-labelledby={`${id}-t`}>
      <div className={startStyles.continueMain}>
        <div className={startStyles.continueText}>
          <h2 id={`${id}-t`} className={startStyles.continueTitle}>
            {label('start.continueTitle', stage, { company: name(last) })}
          </h2>
          <p id={`${id}-l`} className={startStyles.continueLine}>
            {saveLine(last)}
          </p>
        </div>
        <button
          type="button"
          className={`${styles.button} ${styles.primary}`}
          aria-describedby={`${id}-t ${id}-l`}
          onClick={() => continueRun(last.scenarioId, last.mode)}
          disabled={!ready}
        >
          {label('start.continue', stage)}
        </button>
      </div>
      {others.length > 0 && (
        <>
          <button
            type="button"
            className={startStyles.link}
            aria-expanded={showOthers}
            aria-controls={`${id}-o`}
            onClick={() => setShowOthers(!showOthers)}
          >
            {label('start.otherSaves', stage)}
          </button>
          {showOthers && (
            <ul id={`${id}-o`} className={startStyles.others}>
              {others.map((save) => (
                <li key={`${save.scenarioId}.${save.mode}`}>
                  <button
                    type="button"
                    className={startStyles.other}
                    onClick={() => continueRun(save.scenarioId, save.mode)}
                    disabled={!ready}
                  >
                    <span className={startStyles.otherName}>{name(save)}</span>
                    <span className={startStyles.otherLine}>{saveLine(save)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

/** Seven or more categories: a grid to choose one from, before any list. */
function CategoryGrid({ categories }: { categories: ScenarioCategory[] }) {
  const select = useGame((s) => s.selectCategory)
  const first = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (focusAfterSwap) first.current?.focus()
    focusAfterSwap = false
  }, [])
  return (
    <ul className={startStyles.grid} aria-label={label('start.categories', stage)}>
      {categories.map((c, i) => (
        <li key={c.id}>
          <button
            ref={i === 0 ? first : undefined}
            type="button"
            className={startStyles.gridCell}
            onClick={() => {
              focusAfterSwap = true
              select(c.id)
            }}
          >
            {c.name}
          </button>
        </li>
      ))}
    </ul>
  )
}

/** The categories as a tab list (tabs or chips) or, from the grid, a way back; then the list. */
function Companies({ layout }: { layout: CategoryLayout }) {
  const categories = useGame((s) => s.categories)
  const category = useGame((s) => s.category)
  const select = useGame((s) => s.selectCategory)
  const id = useId()
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const heading = useRef<HTMLHeadingElement>(null)
  const current = categories.find((c) => c.id === category) ?? categories[0]

  // From the grid, focus moves to the chosen category's heading.
  useEffect(() => {
    if (focusAfterSwap) heading.current?.focus()
    focusAfterSwap = false
  }, [])

  if (!current) return null

  /** Arrow keys, Home and End move along the tabs and pick the one they land on. */
  const onKey = (e: KeyboardEvent, i: number) => {
    const n = categories.length
    const next =
      e.key === 'ArrowRight'
        ? (i + 1) % n
        : e.key === 'ArrowLeft'
          ? (i - 1 + n) % n
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? n - 1
              : null
    if (next === null) return
    e.preventDefault()
    select(categories[next]!.id)
    tabs.current[next]?.focus()
  }

  const list = <CompanyList category={current} />
  if (layout === 'none') return list
  if (layout === 'grid') {
    return (
      <>
        <button
          type="button"
          className={startStyles.back}
          onClick={() => {
            focusAfterSwap = true
            select(null)
          }}
        >
          {label('start.allCategories', stage)}
        </button>
        <h3 ref={heading} tabIndex={-1} className={startStyles.categoryTitle}>
          {current.name}
        </h3>
        {list}
      </>
    )
  }
  return (
    <>
      <div
        role="tablist"
        aria-label={label('start.categories', stage)}
        className={layout === 'tabs' ? startStyles.tabs : startStyles.chipRow}
        data-layout={layout}
      >
        {categories.map((c, i) => {
          const on = c.id === current.id
          return (
            <button
              key={c.id}
              ref={(el) => {
                tabs.current[i] = el
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${c.id}`}
              aria-selected={on}
              aria-controls={`${id}-panel`}
              tabIndex={on ? 0 : -1}
              className={layout === 'tabs' ? startStyles.tab : startStyles.catChip}
              onClick={() => select(c.id)}
              onKeyDown={(e) => onKey(e, i)}
            >
              {c.name}
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${current.id}`}>
        {list}
      </div>
    </>
  )
}

/** One row per company, with a tag filter above more than six of them. */
function CompanyList({ category }: { category: ScenarioCategory }) {
  const scenarios = useGame((s) => s.scenarios)
  const recent = useGame((s) => s.recent)
  const [filter, setFilter] = useState<{ category: string; tag: string } | null>(null)
  const companies = companiesIn(scenarios, category.id, recent)
  const tag = filter?.category === category.id ? filter.tag : null
  const shown = tag ? companies.filter((c) => tagsOf(c, stage).includes(tag)) : companies
  return (
    <>
      {companies.length > FILTER_ABOVE && (
        <div role="group" aria-label={label('start.filter', stage)} className={startStyles.filter}>
          {[null, ...tagsIn(companies, stage)].map((t) => (
            <button
              key={t ?? ''}
              type="button"
              className={`${styles.chip} ${t === tag ? styles.chipOn : ''}`}
              aria-pressed={t === tag}
              onClick={() => setFilter(t === null ? null : { category: category.id, tag: t })}
            >
              {t ?? label('start.filter.all', stage)}
            </button>
          ))}
        </div>
      )}
      <ul className={startStyles.list}>
        {shown.map((about) => (
          <li key={about.id}>
            <Row about={about} />
          </li>
        ))}
      </ul>
    </>
  )
}

function Row({ about }: { about: ScenarioAbout }) {
  const openSheet = useGame((s) => s.openSheet)
  const open = useGame((s) => s.sheetOpen && s.scenarioId === about.id)
  return (
    <button
      type="button"
      className={startStyles.row}
      data-company={about.id}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => openSheet(about.id)}
    >
      <span className={startStyles.rowText}>
        <span className={startStyles.rowName}>{about.name}</span>
        <span className={startStyles.rowLine}>{about.short}</span>
        <span className={startStyles.tags}>
          {tagsOf(about, stage).map((t) => (
            <span key={t} className={startStyles.tag}>
              {t}
            </span>
          ))}
        </span>
      </span>
      <span className={startStyles.chevron} aria-hidden="true">
        ›
      </span>
    </button>
  )
}

/**
 * The picked company's sheet. Focus moves into it when it opens and back to its row when it
 * closes; Escape, the close button and (on a phone) the dimmed page behind close it.
 */
function Sheet({ modal }: { modal: boolean }) {
  const scenarios = useGame((s) => s.scenarios)
  const scenarioId = useGame((s) => s.scenarioId)
  const mode = useGame((s) => s.mode)
  const selectMode = useGame((s) => s.selectMode)
  const close = useGame((s) => s.closeSheet)
  const startRun = useGame((s) => s.startRun)
  const hasSave = useGame((s) => s.hasSave)
  const ready = useGame((s) => s.ready)
  const runs = useGame((s) => s.runs)
  const [seed, setSeed] = useState('')
  const [confirm, setConfirm] = useState(false)
  const heading = useRef<HTMLHeadingElement>(null)
  const id = useId()
  const about = scenarios.find((x) => x.id === scenarioId)

  useEffect(() => {
    heading.current?.focus()
    // On closing, focus goes back to the row that opened the sheet, unless it went elsewhere.
    return () => {
      if (document.activeElement && document.activeElement !== document.body) return
      document.querySelector<HTMLElement>(`[data-company="${scenarioId}"]`)?.focus()
    }
  }, [scenarioId])

  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  // A new company or length asks again before replacing its save.
  useEffect(() => setConfirm(false), [scenarioId, mode])

  if (!about) return null
  const start = () => (hasSave && !confirm ? setConfirm(true) : startRun(seed))

  return (
    <>
      {modal && <div className={startStyles.scrim} onClick={close} aria-hidden="true" />}
      <section
        role="dialog"
        aria-modal={modal}
        aria-labelledby={`${id}-name`}
        className={modal ? startStyles.sheet : `${styles.card} ${startStyles.panel}`}
      >
        {modal && <div className={startStyles.grab} aria-hidden="true" />}
        <div className={startStyles.sheetHead}>
          <h2 id={`${id}-name`} ref={heading} tabIndex={-1} className={startStyles.sheetName}>
            {about.name}
          </h2>
          <button
            type="button"
            className={startStyles.close}
            aria-label={label('start.close', stage)}
            onClick={close}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        {about.lines.map((line) => (
          <p key={line} className={startStyles.sheetLine}>
            {line}
          </p>
        ))}

        {about.modes.length > 1 && (
          <div role="group" aria-labelledby={`${id}-mode`} className={startStyles.block}>
            <h3 id={`${id}-mode`} className={startStyles.label}>
              {label('start.mode', stage)}
            </h3>
            <div className={startStyles.pills}>
              {about.modes.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={`${styles.chip} ${m === mode ? styles.chipOn : ''}`}
                  aria-pressed={m === mode}
                  onClick={() => selectMode(m)}
                >
                  {label(`start.mode.${m}`, stage)}
                </button>
              ))}
            </div>
            {mode === 'long' && (
              <p className={styles.hint}>{label('start.mode.longLine', stage)}</p>
            )}
          </div>
        )}

        <BestRuns
          runs={runs}
          title={
            about.modes.length > 1
              ? label('start.best.titleMode', stage, { length: lengthTag([mode], stage) })
              : label('start.best.title', stage)
          }
        />

        <details className={startStyles.more}>
          <summary className={startStyles.moreSummary}>{label('start.moreOptions', stage)}</summary>
          <label className={styles.field}>
            <span>{label('start.seedLabel', stage)}</span>
            <input
              className={styles.input}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />
            <span className={styles.hint}>{label('start.seedHint', stage)}</span>
          </label>
        </details>

        {confirm && (
          <p className={`${styles.sticky} ${startStyles.warning}`} role="alert">
            {label('start.replaceWarning', stage, { company: about.name })}
          </p>
        )}
        <div className={startStyles.actions}>
          <button
            type="button"
            className={`${styles.button} ${styles.primary} ${startStyles.go}`}
            onClick={start}
            disabled={!ready}
          >
            {label(confirm ? 'start.replaceConfirm' : 'start.newRun', stage)}
          </button>
          {confirm && (
            <button
              type="button"
              className={`${styles.button} ${startStyles.go}`}
              onClick={() => setConfirm(false)}
            >
              {label('start.replaceKeep', stage)}
            </button>
          )}
        </div>
      </section>
    </>
  )
}

/** "Your best runs" of the picked company and length. Every seed can be played again. */
function BestRuns(props: { runs: RunRecord[]; title: string }) {
  const { runs } = props
  const { ordinary, replays } = bestRuns(runs)
  const id = useId()
  return (
    <section className={startStyles.block} aria-labelledby={id}>
      <h3 id={id} className={startStyles.label}>
        {props.title}
      </h3>
      {runs.length === 0 ? (
        <p className={startStyles.empty}>{label('start.best.empty', stage)}</p>
      ) : (
        <Group bests={ordinary} />
      )}
      {replays && (
        <>
          <h4 className={startStyles.label}>{label('start.best.replays', stage)}</h4>
          <Group bests={replays} />
        </>
      )}
    </section>
  )
}

function Group({ bests }: { bests: Bests }) {
  // Ownership is its own column in long mode: what the founder kept after raising.
  const perMonth = (r: RunRecord) =>
    r.founderShareBp !== undefined && r.founderShareBp < 10_000
      ? label('start.best.perMonthOwned', stage, {
          amount: formatEuro(r.peakRevenueCents),
          share: (r.founderShareBp / 100).toFixed(0),
        })
      : label('start.best.perMonth', stage, { amount: formatEuro(r.peakRevenueCents) })
  return (
    <dl className={startStyles.rows}>
      <BestRow name={label('start.best.longest', stage)} run={bests.longest}>
        {bests.longest ? count('unit.weeks', stage, bests.longest.weeks) : '-'}
      </BestRow>
      <BestRow name={label('start.best.revenue', stage)} run={bests.revenue}>
        {bests.revenue ? perMonth(bests.revenue) : '-'}
      </BestRow>
      <BestRow name={label('start.best.wins', stage)} run={null}>
        {bests.winCount}
      </BestRow>
      {bests.wins.map((r, i) => (
        <BestRow key={`${r.seed}-${i}`} name={label('start.best.winRow', stage)} run={r} indent>
          {perMonth(r)}
        </BestRow>
      ))}
    </dl>
  )
}

function BestRow(props: {
  name: string
  run: RunRecord | null
  indent?: boolean
  children: React.ReactNode
}) {
  const replay = useGame((s) => s.replaySeed)
  const ready = useGame((s) => s.ready)
  return (
    <div className={`${startStyles.bestRow} ${props.indent ? startStyles.indent : ''}`}>
      <dt>{props.name}</dt>
      <dd className={startStyles.value}>{props.children}</dd>
      {props.run && (
        <dd className={startStyles.seedCell}>
          <button
            type="button"
            className={startStyles.seed}
            aria-label={label('start.best.playAria', stage, { seed: props.run.seed })}
            onClick={() => replay(props.run!.seed)}
            disabled={!ready}
          >
            {label('start.best.play', stage, { seed: props.run.seed })}
          </button>
        </dd>
      )}
    </div>
  )
}
