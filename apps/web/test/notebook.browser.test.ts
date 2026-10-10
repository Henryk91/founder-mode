import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'

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
  })

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

      const result = await page.evaluate((line) => {
        const notebook = document.querySelector('section[aria-label="My week"]')!
        const top0 = notebook.getBoundingClientRect().top
        const desk = !!document.querySelector('[data-layout="desk"]')
        const whole = (n: number) => Math.abs(n / line - Math.round(n / line)) < 0.02
        const controls = 'button, [class*="stepper"], [class*="_bar_"], [class*="segment"], svg'

        // Every block is whole lines tall and starts on a line.
        const off: string[] = []
        let blocks = 0
        for (const el of notebook.querySelectorAll('*')) {
          if (el.closest(controls)) continue
          const display = getComputedStyle(el).display
          if (display === 'inline' || display === 'contents') continue
          const r = el.getBoundingClientRect()
          if (r.height === 0) continue
          blocks++
          if (!whole(r.height) || !whole(r.top - top0)) {
            off.push(`${el.tagName}.${el.className} top ${r.top - top0} height ${r.height}`)
          }
        }

        // Writing rests on its line: the baseline is the same distance from the top of every line.
        const baselines: number[] = []
        for (const el of notebook.querySelectorAll(
          '[class*="_title_"], [class*="_sectionTitle_"], [class*="_label_"], [class*="_summary_"], [class*="_sub_"], [class*="_mono_"]',
        )) {
          if (!el.textContent?.trim()) continue
          const probe = document.createElement('span')
          probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
          el.insertBefore(probe, el.firstChild)
          baselines.push(probe.getBoundingClientRect().bottom - el.getBoundingClientRect().top)
          probe.remove()
        }

        // In every row the label and its control share a vertical centre and sit together.
        const centre = (r: DOMRect) => r.top + r.height / 2
        const misaligned: string[] = []
        const gaps: number[] = []
        let rows = 0
        for (const row of notebook.querySelectorAll('[class*="_row_"]')) {
          const label = row.querySelector('[class*="_label_"]')
          const control = [...row.querySelectorAll('[class*="_controls_"] button')].find(
            (b) => b.getBoundingClientRect().height > 0,
          )
          if (!label || !control) continue
          rows++
          const l = label.getBoundingClientRect()
          const c = control.getBoundingClientRect()
          if (Math.abs(centre(l) - centre(c)) > 1) {
            misaligned.push(`${label.textContent}: label ${centre(l)} control ${centre(c)}`)
          }
          const first = row.querySelector('[class*="_controls_"]')!.getBoundingClientRect()
          gaps.push(first.left - l.right)
        }

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
          misaligned,
          gaps,
          rows,
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
      for (const b of result.baselines) {
        expect(b).toBeGreaterThanOrEqual(30)
        expect(b).toBeLessThanOrEqual(32)
      }
      if (result.desk) {
        // Labels and controls sit together: no empty gulf between them.
        for (const gap of result.gaps) expect(gap).toBeLessThan(40)
      }
      await page.close()
    }, 60_000)
  }
})
