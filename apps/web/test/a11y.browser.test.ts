import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'

/**
 * Accessibility in a real browser: axe on the main screens at phone and desk width, keyboard
 * focus, and the focus ring. Skipped where no Chrome is installed (set CHROME_PATH).
 */
const chromePath = [
  process.env['CHROME_PATH'],
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p): p is string => !!p && existsSync(p))

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

describe.skipIf(!chromePath)('accessibility in the browser', () => {
  let server: ViteDevServer
  let browser: Browser
  let url = ''

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5198 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
    browser = await chromium.launch({ executablePath: chromePath! })
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
    await server?.close()
  })

  async function open(width: number): Promise<Page> {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.goto(url)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    return page
  }

  for (const width of [375, 1440]) {
    it(`finds nothing to fix with axe on the main screens at ${width} px`, async () => {
      const page = await open(width)
      const found: Record<string, Violation[]> = {}
      const check = async (name: string) => {
        const v = await axe(page)
        if (v.length > 0) found[name] = v
      }
      await check('start')
      await page.getByRole('button', { name: 'New run' }).click()
      await check('intro')
      for (let i = 0; i < 6; i++) {
        const next = page.getByRole('button', { name: /^(Next|Start week 1)/ })
        if (await next.count()) await next.first().click()
      }
      const tabs = width < 1200 ? ['Inbox', 'Plan', 'Who pays', 'Market', 'Money'] : ['Market']
      for (const tab of tabs) {
        await page.locator('nav button').filter({ hasText: tab }).first().click()
        await check(tab)
      }
      await page.getByRole('button', { name: 'Help' }).click()
      await check('help')
      await page.getByRole('button', { name: 'Back to the game' }).click()
      await page.getByRole('button', { name: 'End week' }).click()
      await check('results')
      expect(found).toEqual({})
      await page.close()
    }, 90_000)
  }

  it('moves focus to the new screen and shows a ring on every surface', async () => {
    const page = await open(1440)
    // Keyboard only: Tab to New run and press Enter.
    for (let i = 0; i < 20; i++) {
      await page.keyboard.press('Tab')
      const name = await page.evaluate(() => document.activeElement?.textContent ?? '')
      if (name === 'New run') break
    }
    await page.keyboard.press('Enter')
    const focused = () =>
      page.evaluate(() => {
        const el = document.activeElement as HTMLElement
        return { tag: el.tagName, text: el.textContent ?? '' }
      })
    // The intro card's heading takes focus, so the new screen is read out.
    expect((await focused()).tag).toBe('H1')
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
  }, 90_000)

  it('closes an explanation with Escape and gives focus back to what opened it', async () => {
    const page = await open(1440)
    await page.getByRole('button', { name: 'New run' }).click()
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
  }, 60_000)
})
