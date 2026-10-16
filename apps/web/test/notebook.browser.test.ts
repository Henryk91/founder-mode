import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser, Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { loadScenario } from '@founder-mode/content'
import { CHROMIUM, WEBKIT, type Engine } from './browsers'

/**
 * The ruled notebook of the Plan tab, measured in a real browser: layout cannot be checked in the
 * string renderer the other tests use. Runs in Chrome and in WebKit (the engine of every iPhone
 * browser), each skipped where it is not installed.
 */
const LINE = 44

/** Which widths each engine is measured at. WebKit takes the common iPhone widths. */
type Widths = { grid: number[]; features: number[] }

describe.skipIf(!CHROMIUM && !WEBKIT)('the planner notebook', () => {
  let server: ViteDevServer
  let url = ''

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5199 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
  }, 60_000)

  afterAll(async () => {
    await server?.close()
  })

  suite(CHROMIUM, { grid: [390, 1280, 1440], features: [375, 1440] })
  suite(WEBKIT, { grid: [390, 430], features: [390, 430] })

  function suite(engine: Engine | null, widths: Widths) {
    describe.skipIf(!engine)(`in ${engine?.name ?? 'a browser that is not installed'}`, () => {
      let browser: Browser

      beforeAll(async () => {
        browser = await engine!.type.launch(engine!.options)
      }, 60_000)

      afterAll(async () => {
        await browser?.close()
      })

      tests(
        () => browser,
        () => url,
        widths,
      )
    })
  }
})

function tests(getBrowser: () => Browser, getUrl: () => string, widths: Widths) {
  /** A new run on the Plan tab, week 1 note dismissed, every section closed. */
  async function planTab(width: number, height: number, touch = false): Promise<Page> {
    const page = await getBrowser().newPage({ viewport: { width, height }, hasTouch: touch })
    await page.goto(getUrl())
    await page.getByRole('button', { name: 'New run' }).click()
    // The intro's screens load after the Start screen; wait for them before counting buttons.
    await page.getByRole('button', { name: /^(Next|Start week 1)/ }).first().waitFor()
    for (let i = 0; i < 6; i++) {
      const next = page.getByRole('button', { name: /^(Next|Start week 1)/ }).first()
      if (await next.count()) await next.click()
    }
    if (width < 1200) await page.getByRole('button', { name: /^Plan/ }).click()
    await page.getByRole('button', { name: 'Dismiss' }).click()
    return page
  }

  it('fits the whole planner on one 390 x 844 screen with every section closed', async () => {
    const page = await planTab(390, 844)
    const fit = await page.evaluate(() => {
      const notebook = document
        .querySelector('section[aria-label="My week"]')!
        .getBoundingClientRect()
      const tabs = document.querySelector('nav')!.getBoundingClientRect()
      const bar = document.querySelector('header, [class*="_bar_"]')
      return { bottom: notebook.bottom, tabsTop: tabs.top, top: notebook.top, bar: !!bar }
    })
    expect(fit.bottom).toBeLessThanOrEqual(fit.tabsTop)

    // Section arrows are big enough to see, inside the section's 44 px line.
    const arrows = await page.evaluate(() =>
      [...document.querySelectorAll('button[aria-expanded] svg')].map((svg) => {
        const a = svg.getBoundingClientRect()
        const line = svg.closest('button')!.getBoundingClientRect()
        return {
          w: a.width,
          h: a.height,
          line: line.height,
          inside: a.top >= line.top && a.bottom <= line.bottom,
        }
      }),
    )
    expect(arrows.length).toBeGreaterThanOrEqual(6)
    for (const a of arrows) expect(a).toEqual({ w: 14, h: 14, line: 44, inside: true })
    await page.close()
  }, 60_000)

  for (const width of widths.grid) {
    it(`keeps every line on the grid, aligned and together at ${width} px`, async () => {
      const page = await planTab(width, 1000)
      for (const title of [
        'Talk to people',
        'Test the demand',
        'Build and fix',
        'Find customers',
      ]) {
        await page
          .getByRole('button', { name: new RegExp(title) })
          .first()
          .click()
      }
      await page
        .getByRole('button', { name: /Hiring/ })
        .first()
        .click()
      await page.getByRole('button', { name: /^Rest/ }).first().click()

      // The longest kind of name a row gets, as two medical practices of one market can.
      await page.evaluate(() => {
        const first = document.querySelector('[class*="_row_"] > :first-child')!
        first.firstChild!.textContent = 'Frauenarztpraxis Dr. Bauer-Lechner und Partner'
      })
      const result = await page.evaluate(measureGrid, LINE)

      checkGrid(result, 6)
      await page.close()
    }, 60_000)
  }

  for (const width of widths.grid) {
    it(`keeps the long mode sections on the grid at ${width} px: hiring and raising`, async () => {
      const page = await getBrowser().newPage({ viewport: { width, height: 1000 } })
      await page.goto(getUrl())
      await page.evaluate(() => localStorage.clear())
      await page.reload()
      await page.getByRole('button', { name: /^104 weeks/ }).click()
      await page.getByRole('button', { name: 'New run' }).click()
      await page.getByRole('button', { name: /^(Next|Start week 1)/ }).first().waitFor()
      for (let i = 0; i < 6; i++) {
        const next = page.getByRole('button', { name: /^(Next|Start week 1)/ }).first()
        if (await next.count()) await next.click()
      }
      const plan = async () => {
        if (width < 1200) await page.getByRole('button', { name: /^Plan/ }).click()
        const dismiss = page.getByRole('button', { name: 'Dismiss' })
        if (await dismiss.count()) await dismiss.click()
        for (const title of [/^Hiring/, /^Money from investors/]) {
          await page.getByRole('button', { name: title }).first().click()
        }
      }
      await plan()
      // A freelancer booked and a round about to start: the busiest the two sections get here.
      await page
        .getByRole('button', { name: /^10 h:/ })
        .first()
        .click()
      await page
        .getByRole('button', { name: /^Start \(8 h of deck\)/ })
        .first()
        .click()
      checkGrid(await page.evaluate(measureGrid, LINE), 2, 0)
      await page.getByRole('button', { name: 'End week' }).click()
      await page.getByRole('button', { name: 'Next week' }).first().click()
      await plan()
      // An open round: pitching, and the investors who said no.
      checkGrid(await page.evaluate(measureGrid, LINE), 2, 0)
      await page.close()
    }, 60_000)
  }

  it('fits every hint on one line at 375 px, and shows a disabled control without fading it', async () => {
    const page = await planTab(375, 812)
    for (const title of ['Talk to people', 'Test the demand', 'Build and fix', 'Find customers']) {
      await page
        .getByRole('button', { name: new RegExp(title) })
        .first()
        .click()
    }
    await page
      .getByRole('button', { name: /Hiring/ })
      .first()
      .click()
    await page.getByRole('button', { name: /^Rest/ }).first().click()
    // Every free hour into rest: the + buttons are now disabled.
    for (let i = 0; i < 120; i++) {
      const more = page.getByRole('button', { name: 'More rest hours' })
      if (await more.isDisabled()) break
      await more.click()
    }
    const r = await page.evaluate(() => {
      const hints = [...document.querySelectorAll('[class*="_hintText_"]')].map((h) => ({
        text: h.textContent,
        height: h.getBoundingClientRect().height,
      }))
      const off = document.querySelector<HTMLButtonElement>('button[aria-label="More rest hours"]')!
      const face = off.querySelector('span')!
      return {
        hints,
        disabled: off.disabled,
        opacity: getComputedStyle(off).opacity,
        color: getComputedStyle(off).color,
        border: getComputedStyle(face).borderStyle,
      }
    })
    expect(r.hints.length).toBeGreaterThanOrEqual(6)
    for (const h of r.hints) expect(h, h.text ?? '').toMatchObject({ height: 44 })
    expect(r.disabled).toBe(true)
    expect(r.opacity).toBe('1')
    expect(r.color).toBe('rgb(75, 90, 104)')
    expect(r.border).toBe('dashed')
    await page.close()
  }, 60_000)

  for (const width of widths.features) {
    const desk = width >= 1200
    it(`shows every unshipped feature's full name and progress at ${width} px, nothing clipped`, async () => {
      const page = await planTab(width, 1000)
      await page
        .getByRole('button', { name: /Build and fix/ })
        .first()
        .click()
      const rows = await page.evaluate(() =>
        [...document.querySelectorAll('[class*="_feature_"]')].map((row) => {
          const name = row.querySelector('[class*="_wrapped_"]')!
          const text = row.querySelector('[class*="_progressText_"]')!
          const stepper = row.querySelector('[class*="_controls_"]')!
          const notebook = document.querySelector('section[aria-label="My week"]')!
          const clipped = (el: Element) => {
            const r = el.getBoundingClientRect()
            const n = notebook.getBoundingClientRect()
            return (
              el.scrollWidth > el.clientWidth + 1 ||
              r.right > n.right + 1 ||
              getComputedStyle(el).textOverflow === 'ellipsis'
            )
          }
          const n = name.getBoundingClientRect()
          const t = text.getBoundingClientRect()
          return {
            name: name.textContent,
            progress: text.querySelector('[aria-hidden]')?.textContent ?? text.textContent,
            nameClipped: clipped(name),
            progressClipped: clipped(text),
            progressBelowName: t.top >= n.bottom - 1,
            sameLine: Math.abs(t.top - n.top) < 1,
            stepperValue: stepper.querySelector('[class*="stepValue"]')?.textContent ?? null,
          }
        }),
      )
      const names = loadScenario('kantino').features.map((f) => f.name)
      expect(rows.map((r) => r.name)).toEqual(names)
      for (const r of rows) {
        expect(r.nameClipped).toBe(false)
        expect(r.progressClipped).toBe(false)
        expect(r.progress).toMatch(/^0\/\d+ h$/)
        expect(r.stepperValue).toBe('')
        if (desk) expect(r.sameLine).toBe(true)
        else expect(r.progressBelowName).toBe(true)
      }
      // Planned hours show on the stepper as "+5 h", never in the progress text.
      await page
        .locator('[class*="_feature_"]')
        .first()
        .getByRole('button', { name: /^5 more hours on / })
        .click()
      await page
        .locator('[class*="_feature_"]')
        .first()
        .getByRole('button', { name: /^5 more hours on / })
        .click()
      const first = await page.evaluate(() => {
        const row = document.querySelector('[class*="_feature_"]')!
        const notebook = document.querySelector('section[aria-label="My week"]')!
        const buttons = [...row.querySelectorAll('button')].map((b) => b.getBoundingClientRect())
        return {
          value: row.querySelector('[class*="stepValue"]')?.textContent,
          progress: row.querySelector('[class*="_progressText_"] [aria-hidden]')?.textContent,
          inside: buttons.every((b) => b.right <= notebook.getBoundingClientRect().right + 0.5),
          tappable: buttons.every((b) => b.width >= 43.5 && b.height >= 43.5),
        }
      })
      expect(first.value).toBe('+10 h')
      expect(first.inside).toBe(true)
      expect(first.tappable).toBe(true)
      expect(first.progress).toMatch(/^0\//)
      await page.close()
    }, 60_000)
  }

  it('keeps the scroll position and focus when a stepper far down is tapped', async () => {
    const page = await planTab(390, 844, true)
    for (const title of ['Talk to people', 'Test the demand', 'Build and fix']) {
      await page
        .getByRole('button', { name: new RegExp(title) })
        .first()
        .click()
    }
    const plus = page.getByRole('button', { name: /^5 more hours on / }).last()
    await plus.scrollIntoViewIfNeeded()
    // Mark the button: a rebuilt section would replace it with a new, unmarked one.
    await plus.evaluate((b) => b.setAttribute('data-tapped', ''))
    const where = () =>
      page.evaluate(() => {
        const main = document.querySelector('main')!
        const active = document.activeElement
        return {
          top: main.scrollTop,
          left: main.scrollLeft,
          page: window.scrollY,
          focus:
            active === document.body
              ? 'body'
              : active === main
                ? 'the scroll area'
                : active?.hasAttribute('data-tapped')
                  ? 'the tapped button'
                  : `${active?.tagName} ${active?.textContent?.slice(0, 30)}`,
        }
      })
    const before = await where()
    expect(before.top).toBeGreaterThan(400)
    for (let i = 0; i < 3; i++) await plus.tap()
    const after = await where()
    expect(await page.locator('[data-tapped]').count()).toBe(1)
    expect(await plus.evaluate((b) => b.previousElementSibling?.textContent)).toBe('+15 h')
    expect(after.top).toBe(before.top)
    expect(after.left).toBe(before.left)
    expect(after.page).toBe(before.page)
    // Chrome focuses a tapped button; WebKit does not, and leaves focus on the scroll area that
    // holds it (focusable for keyboard scrolling). Either way focus never jumps elsewhere.
    expect(['body', 'the scroll area', 'the tapped button']).toContain(after.focus)
    await page.close()
  }, 60_000)

  it('keeps every control on the paper, centred, from 320 to 720 px', async () => {
    const page = await planTab(390, 844)
    // Week 2, so the energy line has "Same as last week", with hours planned on a feature.
    await page.getByRole('button', { name: /^Build and fix/ }).click()
    const plus = page.getByRole('button', { name: /^5 more hours on / }).first()
    for (let i = 0; i < 2; i++) await plus.click()
    await page.getByRole('button', { name: 'End week' }).click()
    for (let i = 0; i < 6; i++) {
      const on = page.getByRole('button', { name: /^(Back to|Continue|Next|On to|Start week)/ })
      if (!(await on.count())) break
      await on.first().click()
    }
    await page.getByRole('button', { name: /^Plan/ }).click()
    expect(await page.getByRole('button', { name: 'Same as last week' }).count()).toBe(1)
    for (const title of ['Talk', 'Test', 'Build', 'Find', 'Hiring', 'Rest']) {
      await page
        .getByRole('button', { name: new RegExp(`^${title}`) })
        .first()
        .click()
    }
    await plus.click()

    const widths = [375, 390, 393, 430]
    for (let w = 320; w <= 720; w += 10) widths.push(w)
    const wrong: string[] = []
    for (const width of widths) {
      await page.setViewportSize({ width, height: 844 })
      wrong.push(
        ...(await page.evaluate((width) => {
          const notebook = document.querySelector('section[aria-label="My week"]')!
          const paper = notebook.getBoundingClientRect()
          const main = document.querySelector('main')!
          const box = main.getBoundingClientRect()
          const out: string[] = []
          for (const el of notebook.querySelectorAll('*')) {
            const r = el.getBoundingClientRect()
            if (r.width === 0 || el.closest('.visually-hidden')) continue
            if (r.left < paper.left - 0.5 || r.right > paper.right + 0.5) {
              const name = el.getAttribute('aria-label') ?? el.textContent?.slice(0, 30)
              out.push(`${width} px: ${el.tagName} ${name} ${r.left}-${r.right}`)
            }
          }
          // Nothing pushes the screen sideways, and the paper has as much ground left as right.
          if (main.scrollWidth > main.clientWidth) out.push(`${width} px: scrolls sideways`)
          const left = paper.left - box.left
          const right = box.left + main.clientWidth - paper.right
          if (Math.abs(left - right) > 1) out.push(`${width} px: ${left} px left, ${right} right`)
          return out
        }, width)),
      )
    }
    expect(wrong).toEqual([])
    await page.close()
  }, 90_000)

  it('swaps the numbers band for the hours once the hours bar scrolls away, on the phone Plan tab', async () => {
    const page = await planTab(390, 844)
    for (const title of ['Talk', 'Test', 'Build']) {
      await page
        .getByRole('button', { name: new RegExp(`^${title}`) })
        .first()
        .click()
    }
    await page
      .getByRole('button', { name: /^5 more hours on / })
      .first()
      .click()
    const band = () =>
      page.evaluate(() => {
        const swap = document.querySelector('[data-show]')!
        const [numbers, hours] = [...swap.children] as HTMLElement[]
        return {
          show: swap.getAttribute('data-show'),
          height: swap.getBoundingClientRect().height,
          mainTop: document.querySelector('main')!.getBoundingClientRect().top,
          numbers: getComputedStyle(numbers!).opacity,
          hours: getComputedStyle(hours!).opacity,
          hoursText: hours!.textContent,
          hidden: hours!.querySelector('[aria-hidden="true"]') !== null,
          fade: getComputedStyle(hours!).transitionDuration,
        }
      })
    const scrollTo = (top: number) =>
      page.evaluate((top) => document.querySelector('main')!.scrollTo(0, top), top)
    const showing = (what: string) =>
      page.waitForFunction(
        (what) => document.querySelector('[data-show]')?.getAttribute('data-show') === what,
        what,
      )

    // Planning scrolled the notebook down to the stepper; start from the top.
    await scrollTo(0)
    await showing('numbers')
    await page.waitForTimeout(250)
    const top = await band()
    expect(top.numbers).toBe('1')
    expect(top.hours).toBe('0')
    // Scrolled a little, the notebook's own bar still shows: no swap yet.
    await scrollTo(60)
    await page.waitForTimeout(100)
    expect((await band()).show).toBe('numbers')

    await scrollTo(800)
    await showing('hours')
    await page.waitForTimeout(250)
    const down = await band()
    expect(down.hoursText).toBe('5 of 50 h · 45 h free')
    expect(down.hidden).toBe(true)
    expect(down.hours).toBe('1')
    expect(down.numbers).toBe('0')
    // Same height in the same place: nothing below moves.
    expect(down.height).toBe(top.height)
    expect(down.mainTop).toBe(top.mainTop)
    expect(parseFloat(down.fade)).toBeLessThanOrEqual(0.2)

    // A number taking keyboard focus brings the numbers back while it has it.
    await page.getByRole('button', { name: /^Cash/ }).focus()
    await page.waitForTimeout(250)
    expect((await band()).numbers).toBe('1')
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())

    await scrollTo(0)
    await showing('numbers')

    // No fade for anyone who asked for less motion.
    await page.emulateMedia({ reducedMotion: 'reduce' })
    expect(parseFloat((await band()).fade)).toBeLessThan(0.001)

    // Other tabs keep the numbers band as it was.
    await page.getByRole('button', { name: /^Inbox/ }).click()
    expect(await page.locator('[data-show]').count()).toBe(0)
    await page.close()
  }, 60_000)

  it('keeps the numbers in the desk bar while the planner scrolls', async () => {
    const page = await planTab(1280, 700)
    for (const title of ['Talk', 'Test', 'Build']) {
      await page
        .getByRole('button', { name: new RegExp(`^${title}`) })
        .first()
        .click()
    }
    await page.evaluate(() => {
      const notebook = document.querySelector('section[aria-label="My week"]')!
      notebook
        .closest('[class*="_centre_"], [class*="_left_"], [class*="_right_"]')!
        .scrollTo(0, 800)
    })
    await page.waitForTimeout(100)
    expect(await page.locator('[data-show]').count()).toBe(0)
    await page.close()
  }, 60_000)
}

/** Measures the notebook in the page: every block on the 44 px grid, rows aligned, controls big enough. */
const measureGrid = (line: number) => {
  const notebook = document.querySelector('section[aria-label="My week"]')!
  const top0 = notebook.getBoundingClientRect().top
  const desk = !!document.querySelector('[data-layout="desk"]')
  const whole = (n: number) => Math.abs(n / line - Math.round(n / line)) < 0.02
  const controls =
    'button, [class*="stepper"], [class*="_bar_"], [class*="segment"], [class*="_progress_"], svg'

  // Every block is whole lines tall and starts on a line.
  const off: string[] = []
  let blocks = 0
  for (const el of notebook.querySelectorAll('*')) {
    // Text for screen readers only takes no room on the paper.
    if (el.closest(controls) || el.closest('.visually-hidden')) continue
    const display = getComputedStyle(el).display
    if (display === 'inline' || display === 'contents') continue
    const r = el.getBoundingClientRect()
    if (r.height === 0) continue
    blocks++
    if (!whole(r.height) || !whole(r.top - top0)) {
      off.push(`${el.tagName}.${el.className} top ${r.top - top0} height ${r.height}`)
    }
  }

  // Writing rests on its line: handwriting 37 px down (6 px above the rule), numbers 31.
  // Writing that wraps (two line rows) is checked on its first line, inside its on-rule span.
  const baselines: { mono: boolean; at: number }[] = []
  for (const el of notebook.querySelectorAll(
    '[class*="_title_"], [class*="_sectionTitle_"], [class*="_label_"], [class*="_summary_"], [class*="_hint_"], [class*="_sub_"], [class*="_mono_"], [class*="_wrapped_"]',
  )) {
    if (!el.textContent?.trim()) continue
    const probe = document.createElement('span')
    probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
    const host = el.querySelector('[class*="_onRule_"]') ?? el
    host.insertBefore(probe, host.firstChild)
    baselines.push({
      mono: /_mono_/.test(el.className),
      at: probe.getBoundingClientRect().bottom - el.getBoundingClientRect().top,
    })
    probe.remove()
  }

  // Controls: no "?" buttons, and every button has a tappable area of at least 44 x 44.
  const questionMarks = [...notebook.querySelectorAll('button')].filter(
    (b) => b.textContent?.trim() === '?',
  ).length
  const small: string[] = []
  for (const b of notebook.querySelectorAll('button')) {
    const r = b.getBoundingClientRect()
    if (r.width === 0) continue
    if (r.width < 43.5 || r.height < 43.5) {
      small.push(`${b.textContent} ${r.width}x${r.height}`)
    }
  }

  // In every row the control sits centred on the label's first line, close beside it.
  const centre = (r: DOMRect) => r.top + r.height / 2
  const misaligned: string[] = []
  const gaps: number[] = []
  let rows = 0
  for (const row of notebook.querySelectorAll('[class*="_row_"]')) {
    const label = row.querySelector('[class*="_label_"], [class*="_wrapped_"]')
    const control = [...row.querySelectorAll('[class*="_controls_"] button')].find(
      (b) => b.getBoundingClientRect().height > 0,
    )
    if (!label || !control) continue
    rows++
    const l = label.getBoundingClientRect()
    const c = control.getBoundingClientRect()
    if (Math.abs(l.top + line / 2 - centre(c)) > 1) {
      misaligned.push(`${label.textContent}: line ${l.top + line / 2} control ${centre(c)}`)
    }
    const first = row.querySelector('[class*="_controls_"]')!.getBoundingClientRect()
    gaps.push(first.left - l.right)
  }

  // Names in rows are never cut short: they wrap onto further lines instead.
  const cut = [...notebook.querySelectorAll('[class*="_row_"] > :first-child')]
    .filter(
      (el) =>
        el.scrollWidth > el.clientWidth + 1 || getComputedStyle(el).textOverflow === 'ellipsis',
    )
    .map((el) => el.textContent)

  // Open sections let the rules run through.
  const bodies = [...notebook.querySelectorAll('[id^="plan-"]')]
  const opaque = bodies.filter((b) => getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)')
  const tooWide = [...notebook.querySelectorAll('*')].filter(
    (e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX === 'visible',
  )
  return {
    desk,
    off,
    blocks,
    baselines,
    questionMarks,
    small,
    misaligned,
    gaps,
    rows,
    cut,
    bodies: bodies.length,
    opaque: opaque.length,
    overflowing: tooWide.map((e) => `${e.tagName}.${e.className}`),
  }
}

type Grid = Awaited<ReturnType<typeof measureGrid>>

/** The notebook rules of docs/design/design.md, on a measurement. */
function checkGrid(result: Grid, sections: number, minRows = 10) {
  expect(result.bodies).toBeGreaterThanOrEqual(sections)
  expect(result.blocks).toBeGreaterThan(20)
  expect(result.off).toEqual([])
  expect(result.opaque).toBe(0)
  expect(result.rows).toBeGreaterThanOrEqual(minRows)
  expect(result.misaligned).toEqual([])
  expect(result.cut).toEqual([])
  for (const b of result.baselines) {
    const [lo, hi] = b.mono ? [30, 32] : [36, 38]
    expect(b.at).toBeGreaterThanOrEqual(lo)
    expect(b.at).toBeLessThanOrEqual(hi)
  }
  expect(result.questionMarks).toBe(0)
  expect(result.small).toEqual([])
  if (result.desk) {
    // Labels and controls sit together: no empty gulf between them.
    for (const gap of result.gaps) expect(gap).toBeLessThan(40)
  }
}
