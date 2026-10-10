import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { chromium, type Browser } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'

/**
 * The ruled notebook of the Plan tab, measured in a real browser: layout cannot be checked in the
 * string renderer the other tests use. Skipped where no Chrome is installed (set CHROME_PATH to
 * point at one).
 */
const LINE = 28

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

  for (const width of [390, 1280, 1440]) {
    it(`keeps every block on the rules at ${width} px`, async () => {
      const page = await browser.newPage({ viewport: { width, height: 1000 } })
      await page.goto(url)
      await page.getByRole('button', { name: 'New run' }).click()
      for (let i = 0; i < 6; i++) {
        const next = page.getByRole('button', { name: /^(Next|Start week 1)/ }).first()
        if (await next.count()) await next.click()
      }
      if (width < 1200) await page.getByRole('button', { name: /^Plan/ }).click()
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
        const off: string[] = []
        const controls = 'button, [class*=stepper], [class*=bar], [class*=segment], svg'
        let blocks = 0
        for (const el of notebook.querySelectorAll('*')) {
          if (el.closest(controls)) continue
          const display = getComputedStyle(el).display
          if (display === 'inline' || display === 'contents') continue
          const r = el.getBoundingClientRect()
          if (r.height === 0) continue
          blocks++
          const whole = (n: number) => Math.abs(n / line - Math.round(n / line)) < 0.02
          if (!whole(r.height) || !whole(r.top - top0)) {
            off.push(`${el.tagName}.${el.className} top ${r.top - top0} height ${r.height}`)
          }
        }
        // Text sits on the rules: the baseline is at about the same height in every line.
        const baselines: number[] = []
        for (const el of notebook.querySelectorAll('h2, p, span, div')) {
          if (el.closest(controls) && !el.closest('[class*=sectionHead]')) continue
          const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim())
          if (!own) continue
          const probe = document.createElement('span')
          probe.style.cssText = 'display:inline-block;width:0;height:0;vertical-align:baseline'
          el.insertBefore(probe, el.firstChild)
          const base = probe.getBoundingClientRect().bottom - top0
          probe.remove()
          const first = el.getBoundingClientRect().top - top0
          baselines.push(base - Math.floor(first / line) * line)
        }
        // Open sections let the rules run through, and clamp nothing.
        const bodies = [...notebook.querySelectorAll('[id^="plan-"]')]
        const opaque = bodies.filter(
          (b) => getComputedStyle(b).backgroundColor !== 'rgba(0, 0, 0, 0)',
        )
        const clamped = [...notebook.querySelectorAll('p')].filter(
          (p) => p.scrollHeight > p.clientHeight + 1,
        )
        return {
          off,
          blocks,
          baselines,
          bodies: bodies.length,
          opaque: opaque.length,
          clamped: clamped.length,
        }
      }, LINE)

      expect(result.bodies).toBeGreaterThanOrEqual(6)
      expect(result.blocks).toBeGreaterThan(30)
      expect(result.off).toEqual([])
      expect(result.opaque).toBe(0)
      expect(result.clamped).toBe(0)
      for (const b of result.baselines) {
        expect(b).toBeGreaterThanOrEqual(17.5)
        expect(b).toBeLessThanOrEqual(19.5)
      }
      await page.close()
    }, 60_000)
  }
})
