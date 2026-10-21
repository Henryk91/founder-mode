import { useEffect, useLayoutEffect, useRef } from 'react'
import { label, voiceOf } from '../labels'
import { useGame } from '../useGame'
import { Headline } from './Headline'
import { HoursBand } from './HoursBand'
import styles from './TopBar.module.css'
import ui from './ui.module.css'

/**
 * Pinned on every screen: company, week, Help and End week, with the headline numbers. On the
 * phone the numbers sit in a band below, at the desk they share one 68 px bar.
 *
 * On the phone's Plan tab `planHours` is set: true while the notebook's hours bar is scrolled out
 * of view, and the band then shows the week's hours instead of the numbers, at the same height.
 */
export function TopBar(props: { wide: boolean; planHours?: boolean | null }) {
  const view = useGame((s) => s.view)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const company = view ? label('bar.company', voiceOf(view), { name: view.scenarioName }) : ''
  const fits = view?.company.uiStage === 'established'
  useFitOneLine(nameRef, fits ? company : null)
  const issues = useGame((s) => s.issues.length)
  const showingReport = useGame((s) => s.report !== null)
  const endWeek = useGame((s) => s.endWeek)
  const openHelp = useGame((s) => s.openHelp)
  if (!view) return null
  const stage = voiceOf(view)
  // Plan 3: the established company has a logo square, its full name and where it works.
  const established = view.company.uiStage === 'established'
  const name = (
    <div className={styles.who}>
      {established && (
        <span className={styles.logo} aria-hidden="true">
          {view.scenarioName.slice(0, 1)}
        </span>
      )}
      <div>
        <h1 ref={nameRef} className={styles.name} tabIndex={-1} data-autofocus>
          {company}
        </h1>
        <div className={styles.week}>
          {label(established && props.wide ? 'bar.weekPlace' : 'bar.week', stage, {
            week: view.week,
            max: view.maxWeeks,
            place: view.office.name,
          })}
        </div>
      </div>
    </div>
  )
  const actions = (
    <div className={styles.actions}>
      {established && !props.wide ? (
        // Plan 3: the established phone bar keeps the company's name on one line; Help is a "?".
        <button
          type="button"
          className={`${ui.button} ${styles.help} ${styles.helpIcon}`}
          aria-label={label('bar.help', stage)}
          onClick={openHelp}
        >
          <span aria-hidden="true">?</span>
        </button>
      ) : (
        <button type="button" className={`${ui.button} ${styles.help}`} onClick={openHelp}>
          {label('bar.help', stage)}
        </button>
      )}
      {view.status === 'running' && !showingReport && (
        <button
          type="button"
          className={`${ui.button} ${ui.primary} ${styles.endWeek}`}
          disabled={issues > 0}
          onClick={endWeek}
        >
          {label(issues > 0 ? 'bar.endWeekBlocked' : 'bar.endWeek', stage)}
        </button>
      )}
    </div>
  )

  if (props.wide) {
    return (
      <header className={`${styles.header} ${styles.wide}`}>
        {name}
        <div className={styles.grow} />
        <Headline size="bar" />
        {actions}
      </header>
    )
  }
  return (
    <header className={styles.header}>
      <div className={styles.top}>
        {name}
        {actions}
      </div>
      {props.planHours == null ? (
        <Headline size="band" />
      ) : (
        <div className={styles.swap} data-show={props.planHours ? 'hours' : 'numbers'}>
          <div className={styles.numbers}>
            <Headline size="band" />
          </div>
          <div className={styles.hours}>
            <HoursBand />
          </div>
        </div>
      )}
    </header>
  )
}

/** The smallest size a long company name may shrink to before it would have to wrap. */
const MIN_NAME_PX = 12
const useIsoLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

/**
 * Plan 3, the established bar: the company's full name stays on one line. A long name steps its
 * size down (to 12 px at the least) until it fits, again when the bar resizes or the heading font
 * arrives. `text` null leaves the size alone.
 */
function useFitOneLine(ref: React.RefObject<HTMLElement | null>, text: string | null) {
  useIsoLayoutEffect(() => {
    const el = ref.current
    if (!el || text === null) return
    // The name's column; without the logo square a long name has 42 px more.
    const who = el.parentElement?.parentElement ?? null
    const shrink = (reset = true) => {
      if (reset) el.style.fontSize = ''
      let size = parseFloat(getComputedStyle(el).fontSize)
      const range = document.createRange()
      range.selectNodeContents(el)
      // Measure the glyphs themselves: WebKit can cache a block's scroll width across a
      // font-size write. Scale once from the actual text bounds, then check the final fit.
      const available = Math.max(0, el.getBoundingClientRect().width - 1)
      const width = () => range.getBoundingClientRect().width
      const measured = width()
      if (measured > available && measured > 0 && size > MIN_NAME_PX) {
        size = Math.max(MIN_NAME_PX, Math.floor(((size * available) / measured) * 2) / 2)
        el.style.fontSize = `${size}px`
      }
      while ((width() > available || el.scrollWidth > el.clientWidth) && size > MIN_NAME_PX) {
        size = Math.max(MIN_NAME_PX, size - 0.5)
        el.style.fontSize = `${size}px`
      }
      return width() <= available
    }
    let live = true
    let frame = 0
    const fit = () => {
      if (who) delete who.dataset['tight']
      el.style.fontSize = ''
      // Give a long name the logo's space before reducing its type size. This also
      // avoids sizing against a flex column that changes as the heading face arrives.
      const range = document.createRange()
      range.selectNodeContents(el)
      if (who && Math.max(range.getBoundingClientRect().width, el.scrollWidth) > el.clientWidth - 1)
        who.dataset['tight'] = 'true'
      shrink()
      // WebKit can settle flex widths after the font-size write; finish against that layout.
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (live) shrink(false)
      })
    }
    fit()
    void document.fonts?.ready.then(() => live && fit())
    // A stage can first request its heading face after the initial ready promise resolved.
    document.fonts?.addEventListener('loadingdone', fit)
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(fit)
    observer?.observe(el.parentElement ?? el)
    return () => {
      live = false
      cancelAnimationFrame(frame)
      observer?.disconnect()
      document.fonts?.removeEventListener('loadingdone', fit)
      el.style.fontSize = ''
      if (who) delete who.dataset['tight']
    }
  }, [ref, text])
}
