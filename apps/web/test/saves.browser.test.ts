import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser, type Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'

/** Crashes and storage trouble in a real browser. Skipped where no Chrome is installed. */
const chromePath = [
  process.env['CHROME_PATH'],
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p): p is string => !!p && existsSync(p))

const SAVE = 'founder-mode.save.v1.kantino'

describe.skipIf(!chromePath)('saves in the browser', () => {
  let server: ViteDevServer
  let browser: Browser
  let url = ''

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5197 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
    browser = await chromium.launch({ executablePath: chromePath! })
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
    await server?.close()
  })

  async function inGame(page: Page) {
    await page.getByRole('button', { name: 'New run' }).click()
    for (let i = 0; i < 6; i++) {
      const next = page.getByRole('button', { name: /^(Next|Start week 1)/ })
      if (await next.count()) await next.first().click()
    }
  }

  it('shows a way back when the UI breaks, and leaves the save as it was', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
    page.on('console', () => {})
    await page.goto(url)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await inGame(page)
    await page.getByRole('button', { name: 'End week' }).click()
    await page.getByRole('button', { name: 'Next week' }).click()
    const before = await page.evaluate((k) => localStorage.getItem(k), SAVE)
    expect(before).toContain('"week":1')

    // Every euro amount now throws while the screen draws.
    await page.evaluate(() => {
      const w = window as unknown as { __format: unknown }
      w.__format = Object.getOwnPropertyDescriptor(Intl.NumberFormat.prototype, 'format')
      Object.defineProperty(Intl.NumberFormat.prototype, 'format', {
        configurable: true,
        get: () => () => {
          throw new Error('boom')
        },
      })
    })
    await page.locator('nav button').filter({ hasText: 'Money' }).click()
    await expect.poll(() => page.getByRole('heading', { name: 'Something broke' }).count()).toBe(1)
    expect(await page.evaluate((k) => localStorage.getItem(k), SAVE)).toBe(before)

    // Mended, Try again carries on where the player was.
    await page.evaluate(() => {
      const w = window as unknown as { __format: unknown }
      Object.defineProperty(Intl.NumberFormat.prototype, 'format', w.__format as PropertyDescriptor)
    })
    await page.getByRole('button', { name: 'Try again' }).click()
    expect(await page.getByRole('heading', { name: 'Kantino' }).count()).toBe(1)

    // Back to the start keeps the save to continue.
    await page.getByRole('button', { name: 'Help' }).click()
    await page.evaluate(() => {
      Object.defineProperty(Intl.NumberFormat.prototype, 'format', {
        configurable: true,
        get: () => () => {
          throw new Error('boom')
        },
      })
    })
    await page.getByRole('button', { name: 'Back to the game' }).click()
    await page.getByRole('button', { name: 'Back to the start' }).click()
    expect(await page.evaluate((k) => localStorage.getItem(k), SAVE)).toBe(before)
    expect(await page.getByRole('button', { name: 'Continue' }).count()).toBe(1)
    await page.close()
  }, 60_000)

  it('plays on, and says so, where the browser keeps nothing', async () => {
    const page = await browser.newPage({ viewport: { width: 375, height: 812 } })
    await page.addInitScript(() => {
      const blocked = () => {
        throw new DOMException('blocked', 'SecurityError')
      }
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get: () => ({ getItem: blocked, setItem: blocked, removeItem: blocked }),
      })
    })
    await page.goto(url)
    expect(await page.getByText('not keeping anything for us').count()).toBe(1)
    await inGame(page)
    await page.getByRole('button', { name: 'End week' }).click()
    expect(await page.getByRole('heading', { name: 'Week 1' }).count()).toBe(1)
    await page.close()
  }, 60_000)
})
