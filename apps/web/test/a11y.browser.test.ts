import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser, Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { CHROMIUM, WEBKIT, type Engine } from './browsers'
import { newRun, openCompany } from './screen'

/**
 * Accessibility in a real browser: axe on the main screens at phone and desk width, keyboard
 * focus, and the focus ring. Runs in Chrome, and axe also in WebKit at iPhone widths; each is
 * skipped where that browser is not installed.
 */
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

type Violation = { id: string; nodes: string[] }

async function axe(page: Page): Promise<Violation[]> {
  await page.evaluate(AXE)
  return page.evaluate(async () => {
    const w = window as unknown as {
      axe: {
        run(
          ctx: Document,
          opts: object,
        ): Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }>
      }
    }
    const r = await w.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      },
      resultTypes: ['violations'],
    })
    return r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }))
  })
}

describe.skipIf(!CHROMIUM && !WEBKIT)('accessibility in the browser', () => {
  let server: ViteDevServer
  let browser: Browser
  let webkit: Browser | null = null
  let url = ''

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5198 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
    const launch = (e: Engine | null) => e && e.type.launch(e.options)
    browser = (await launch(CHROMIUM))!
    webkit = await launch(WEBKIT)
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
    await webkit?.close()
    await server?.close()
  })

  async function open(width: number, using: Browser = browser): Promise<Page> {
    const page = await using.newPage({ viewport: { width, height: 900 } })
    await page.goto(url)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    return page
  }

  // Step 8: both 60 week scenarios at every width the plan names, in both engines.
  for (const scenario of ['Kantino', 'Zollstock'] as const)
    for (const [engine, width] of [
      [CHROMIUM, 375],
      [CHROMIUM, 390],
      [CHROMIUM, 430],
      [CHROMIUM, 1440],
      [WEBKIT, 375],
      [WEBKIT, 390],
      [WEBKIT, 430],
      [WEBKIT, 1440],
    ] as const) {
      it.skipIf(!engine)(
        `finds nothing to fix with axe on the main screens of ${scenario} at ${width} px in ${engine?.name}`,
        async () => {
          const page = await open(width, engine === WEBKIT ? webkit! : browser)
          await openCompany(page, scenario)
          const found: Record<string, Violation[]> = {}
          const check = async (name: string) => {
            const v = await axe(page)
            if (v.length > 0) found[name] = v
          }
          await check('start')
          await page.getByRole('button', { name: 'Start a new run' }).click()
          await check('intro')
          for (let i = 0; i < 6; i++) {
            const next = page.getByRole('button', { name: /^(Next|Start week 1)/ })
            if (await next.count()) await next.first().click()
          }
          const tabs = width < 1200 ? ['Inbox', 'Plan', 'Who pays', 'Market', 'Money'] : ['Market']
          for (const tab of tabs) {
            await page.locator('nav button').filter({ hasText: tab }).first().click()
            await check(tab)
            if (tab === 'Plan') {
              // Scrolled down, the band under the top bar shows the hours instead of the numbers.
              for (const title of ['Talk', 'Test', 'Build']) {
                await page
                  .getByRole('button', { name: new RegExp(`^${title}`) })
                  .first()
                  .click()
              }
              await page.evaluate(() => document.querySelector('main')!.scrollTo(0, 10_000))
              await page.waitForSelector('[data-show="hours"]')
              await page.waitForTimeout(250)
              await check('Plan, scrolled')
              await page.evaluate(() => document.querySelector('main')!.scrollTo(0, 0))
            }
          }
          await page.getByRole('button', { name: 'Help' }).click()
          await check('help')
          await page.getByRole('button', { name: 'Back to the game' }).click()
          await page.getByRole('button', { name: 'End week' }).click()
          await check('results')
          expect(found).toEqual({})
          await page.close()
        },
        90_000,
      )
    }

  // Long mode (Phase 9): the team, the freelancer, raising money, and the cap table, at every
  // width the plan names, in both engines.
  for (const [engine, width] of [
    [CHROMIUM, 375],
    [CHROMIUM, 390],
    [CHROMIUM, 430],
    [CHROMIUM, 1440],
    [WEBKIT, 375],
    [WEBKIT, 390],
    [WEBKIT, 430],
    [WEBKIT, 1440],
  ] as const) {
    it.skipIf(!engine)(
      `finds nothing to fix with axe in long mode at ${width} px in ${engine?.name}`,
      async () => {
        const page = await open(width, engine === WEBKIT ? webkit! : browser)
        const found: Record<string, Violation[]> = {}
        const check = async (name: string) => {
          const v = await axe(page)
          if (v.length > 0) found[name] = v
        }
        await openCompany(page, 'Kantino')
        await page.getByRole('button', { name: /^104 weeks/ }).click()
        await check('start, long')
        await page.getByRole('button', { name: 'Start a new run' }).click()
        for (let i = 0; i < 6; i++) {
          const next = page.getByRole('button', { name: /^(Next|Start week 1)/ })
          if (await next.count()) await next.first().click()
        }
        if (width < 1200)
          await page.locator('nav button').filter({ hasText: 'Plan' }).first().click()
        for (const title of [/^Hiring/, /^Money from investors/]) {
          await page.getByRole('button', { name: title }).first().click()
        }
        await page
          .getByRole('button', { name: /^10 h:/ })
          .first()
          .click()
        await page
          .getByRole('button', { name: /^Start \(8 h of deck\)/ })
          .first()
          .click()
        await check('Plan, hiring and raising')
        await page.getByRole('button', { name: 'End week' }).click()
        await check('results, long')
        await page.getByRole('button', { name: 'Next week' }).first().click()
        if (width < 1200) {
          await page.locator('nav button').filter({ hasText: 'Plan' }).first().click()
        }
        await page
          .getByRole('button', { name: /^Money from investors/ })
          .first()
          .click()
        await check('Plan, open round')
        if (width < 1200) {
          await page.locator('nav button').filter({ hasText: 'Money' }).first().click()
          await check('Money, long')
        }
        expect(found).toEqual({})
        await page.close()
      },
      90_000,
    )
  }

  // The outdoor scenario (step 5): the roster, guests and prices sections, the calendar and the
  // scene, at every width the plan names, in both engines, with no sideways scrolling.
  for (const [engine, width] of [
    [CHROMIUM, 375],
    [CHROMIUM, 390],
    [CHROMIUM, 430],
    [CHROMIUM, 1440],
    [WEBKIT, 375],
    [WEBKIT, 390],
    [WEBKIT, 430],
    [WEBKIT, 1440],
  ] as const) {
    it.skipIf(!engine)(
      `finds nothing to fix with axe in Gratwanderung at ${width} px in ${engine?.name}`,
      async () => {
        const page = await open(width, engine === WEBKIT ? webkit! : browser)
        const found: Record<string, Violation[]> = {}
        const wide: string[] = []
        const check = async (name: string) => {
          const v = await axe(page)
          if (v.length > 0) found[name] = v
          const over = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1,
          )
          if (over) wide.push(name)
        }
        await openCompany(page, 'Gratwanderung')
        await check('start, outdoor')
        await page.getByRole('button', { name: 'Start a new run' }).click()
        for (let i = 0; i < 6; i++) {
          const next = page.getByRole('button', { name: /^(Next|Start week 1)/ })
          if (await next.count()) await next.first().click()
        }
        if (width < 1200) {
          await page.locator('nav button').filter({ hasText: 'Inbox' }).first().click()
          await check('Inbox, outdoor')
          await page.locator('nav button').filter({ hasText: 'Plan' }).first().click()
        }
        for (const title of [/^Who works/, /^Getting guests/, /^Prices and rules/]) {
          await page.getByRole('button', { name: title }).first().click()
        }
        // Opening the sections scrolls the band under the top bar; let its fade finish.
        await page.waitForTimeout(300)
        await check('Plan, outdoor sections')
        if (width < 1200) {
          await page.locator('nav button').filter({ hasText: 'Bookings' }).first().click()
          await check('calendar')
        }
        await page.getByRole('button', { name: 'End week' }).click()
        await check('results, outdoor')
        expect(found).toEqual({})
        expect(wide).toEqual([])
        await page.close()
      },
      90_000,
    )
  }

  // The restaurant (step 6): the bank loan section beside the roster, guests and prices, the
  // calendar and the dining room, at every width the plan names, in both engines.
  for (const [engine, width] of [
    [CHROMIUM, 375],
    [CHROMIUM, 390],
    [CHROMIUM, 430],
    [CHROMIUM, 1440],
    [WEBKIT, 375],
    [WEBKIT, 390],
    [WEBKIT, 430],
    [WEBKIT, 1440],
  ] as const) {
    it.skipIf(!engine)(
      `finds nothing to fix with axe in Hinterhof at ${width} px in ${engine?.name}`,
      async () => {
        const page = await open(width, engine === WEBKIT ? webkit! : browser)
        const found: Record<string, Violation[]> = {}
        const wide: string[] = []
        const check = async (name: string) => {
          const v = await axe(page)
          if (v.length > 0) found[name] = v
          const over = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1,
          )
          if (over) wide.push(name)
        }
        await openCompany(page, 'Hinterhof')
        await check('start, restaurant')
        await page.getByRole('button', { name: 'Start a new run' }).click()
        for (let i = 0; i < 6; i++) {
          const next = page.getByRole('button', { name: /^(Next|Start week 1)/ })
          if (await next.count()) await next.first().click()
        }
        if (width < 1200) {
          await page.locator('nav button').filter({ hasText: 'Inbox' }).first().click()
          await check('Inbox, restaurant')
          await page.locator('nav button').filter({ hasText: 'Plan' }).first().click()
        }
        for (const title of [/^Who works/, /^Getting guests/, /^Prices and rules/, /^Bank loan/]) {
          await page.getByRole('button', { name: title }).first().click()
        }
        await page.waitForTimeout(300)
        await check('Plan, restaurant sections')
        if (width < 1200) {
          await page.locator('nav button').filter({ hasText: 'Bookings' }).first().click()
          await check('calendar, restaurant')
        }
        await page.getByRole('button', { name: 'End week' }).click()
        await check('results, restaurant')
        expect(found).toEqual({})
        expect(wide).toEqual([])
        await page.close()
      },
      90_000,
    )
  }

  // The guesthouse (step 7), as the guesthouse above.
  for (const [engine, width] of [
    [CHROMIUM, 375],
    [CHROMIUM, 390],
    [CHROMIUM, 430],
    [CHROMIUM, 1440],
    [WEBKIT, 375],
    [WEBKIT, 390],
    [WEBKIT, 430],
    [WEBKIT, 1440],
  ] as const) {
    it.skipIf(!engine)(
      `finds nothing to fix with axe in Seeblick at ${width} px in ${engine?.name}`,
      async () => {
        const page = await open(width, engine === WEBKIT ? webkit! : browser)
        const found: Record<string, Violation[]> = {}
        const wide: string[] = []
        const check = async (name: string) => {
          const v = await axe(page)
          if (v.length > 0) found[name] = v
          const over = await page.evaluate(
            () => document.documentElement.scrollWidth > window.innerWidth + 1,
          )
          if (over) wide.push(name)
        }
        await openCompany(page, 'Seeblick')
        await check('start, guesthouse')
        await page.getByRole('button', { name: 'Start a new run' }).click()
        for (let i = 0; i < 6; i++) {
          const next = page.getByRole('button', { name: /^(Next|Start week 1)/ })
          if (await next.count()) await next.first().click()
        }
        if (width < 1200) {
          await page.locator('nav button').filter({ hasText: 'Inbox' }).first().click()
          await check('Inbox, guesthouse')
          await page.locator('nav button').filter({ hasText: 'Plan' }).first().click()
        }
        for (const title of [/^Who works/, /^Getting guests/, /^Prices and rules/, /^Bank loan/]) {
          await page.getByRole('button', { name: title }).first().click()
        }
        await page.waitForTimeout(300)
        await check('Plan, guesthouse sections')
        if (width < 1200) {
          await page.locator('nav button').filter({ hasText: 'Bookings' }).first().click()
          await check('calendar, guesthouse')
        }
        await page.getByRole('button', { name: 'End week' }).click()
        await check('results, guesthouse')
        expect(found).toEqual({})
        expect(wide).toEqual([])
        await page.close()
      },
      90_000,
    )
  }

  it.skipIf(!CHROMIUM)(
    'moves focus to the new screen and shows a ring on every surface',
    async () => {
      const page = await open(1440)
      // Keyboard only: Tab to Kantino, open its sheet, Tab to Start a new run and press Enter.
      const tabTo = async (start: string) => {
        for (let i = 0; i < 30; i++) {
          await page.keyboard.press('Tab')
          const name = await page.evaluate(() => document.activeElement?.textContent ?? '')
          if (name.startsWith(start)) return
        }
        throw new Error(`no ${start} by keyboard`)
      }
      await tabTo('Kantino')
      await page.keyboard.press('Enter')
      // The Start screen offers a run once the scenarios have loaded (step 8).
      await page.waitForSelector('button:has-text("Start a new run"):not([disabled])')
      await tabTo('Start a new run')
      await page.keyboard.press('Enter')
      const focused = () =>
        page.evaluate(() => {
          const el = document.activeElement as HTMLElement
          return { tag: el.tagName, text: el.textContent ?? '' }
        })
      // The intro card's heading takes focus, so the new screen is read out. Focus moves in an
      // effect after the new screen renders, so give it a moment.
      await expect.poll(async () => (await focused()).tag).toBe('H1')
      for (let i = 0; i < 6; i++) {
        const next = page.getByRole('button', { name: /^(Next|Start week 1)/ })
        if (await next.count()) await next.first().focus()
        if (await next.count()) await page.keyboard.press('Enter')
      }
      expect(await focused()).toEqual({ tag: 'H1', text: 'Kantino' })

      // Every control the keyboard reaches shows a ring that stands out from what is behind it.
      const rings: string[] = []
      for (let i = 0; i < 40; i++) {
        await page.keyboard.press('Tab')
        const ring = await page.evaluate(() => {
          const el = document.activeElement as HTMLElement
          // Past the last control, Tab leaves the page for the browser's own controls.
          if (el === document.body) return ''
          const cs = getComputedStyle(el)
          return cs.outlineStyle !== 'none' && cs.boxShadow.includes('255, 211, 77')
            ? ''
            : `${el.tagName} ${el.textContent?.slice(0, 30)}`
        })
        if (ring) rings.push(ring)
      }
      expect(rings).toEqual([])

      // End week by keyboard: focus lands on the week's results.
      await page.getByRole('button', { name: 'End week' }).focus()
      await page.keyboard.press('Enter')
      expect((await focused()).text).toMatch(/^Week 1$/)
      await page.close()
    },
    90_000,
  )

  it.skipIf(!CHROMIUM)(
    'closes an explanation with Escape and gives focus back to what opened it',
    async () => {
      const page = await open(1440)
      await newRun(page)
      for (let i = 0; i < 6; i++) {
        const next = page.getByRole('button', { name: /^(Next|Start week 1)/ })
        if (await next.count()) await next.first().click()
      }
      const cash = page.getByRole('button', { name: /^Cash/ })
      await cash.focus()
      await page.keyboard.press('Enter')
      expect(await page.evaluate(() => document.activeElement?.getAttribute('role'))).toBe('note')
      await page.keyboard.press('Escape')
      expect(await page.getByRole('note').count()).toBe(0)
      expect(await page.evaluate(() => document.activeElement?.textContent ?? '')).toMatch(/^Cash/)
      await page.close()
    },
    60_000,
  )
})
