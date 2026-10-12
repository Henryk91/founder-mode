import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { loadScenario } from '@founder-mode/content'

/**
 * The ruled notebook of the Plan tab, measured in a real browser: layout cannot be checked in the
 * string renderer the other tests use. Skipped where no Chrome is installed (set CHROME_PATH to
 * point at one).
 */
const LINE = 44

const chromePath = [
  process.env['CHROME_PATH'],
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p): p is string => !!p && existsSync(p))

describe.skipIf(!chromePath)('the planner notebook', () => {
  let server: ViteDevServer
  let browser: Browser
  let url = ''

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5199 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
    browser = await chromium.launch({ executablePath: chromePath! })
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
    await server?.close()
  })

  /** A new run on the Plan tab, week 1 note dismissed, every section closed. */
  async function planTab(width: number, height: number): Promise<Page> {
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(url)
    await page.getByRole('button', { name: 'New run' }).click()
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
    await page.close()
  }, 60_000)

  for (const width of [390, 1280, 1440]) {
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
      const result = await page.evaluate((line) => {
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
              el.scrollWidth > el.clientWidth + 1 ||
              getComputedStyle(el).textOverflow === 'ellipsis',
          )
          .map((el) => el.textContent)

        // Open sections let the rules run through.
        const bodies = [...notebook.querySelectorAll('[id^="plan-"]')]
        const opaque = bodies.filter(
          (b) => getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)',
        )
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
      }, LINE)

      expect(result.bodies).toBeGreaterThanOrEqual(6)
      expect(result.blocks).toBeGreaterThan(20)
      expect(result.off).toEqual([])
      expect(result.opaque).toBe(0)
      expect(result.rows).toBeGreaterThanOrEqual(10)
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

  for (const [width, desk] of [
    [375, false],
    [1440, true],
  ] as const) {
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
})
