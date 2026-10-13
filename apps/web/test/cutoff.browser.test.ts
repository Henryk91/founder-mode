import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser, Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { CHROMIUM, WEBKIT, type Engine } from './browsers'

/**
 * Nothing cut short: text wraps onto whole ruled lines and never ends in an ellipsis or a clip.
 * The one exception is a section summary next to its title on a phone (docs/design/design.md).
 * Every scenario and mode, every tab, every section of the notebook opened, before and after
 * the first week, at the widths the plan names, in Chrome and WebKit.
 */
const RUNS = [
  { scenario: 'Kantino', mode: null },
  { scenario: 'Zollstock', mode: null },
  { scenario: 'Kantino', mode: '104 weeks' },
  { scenario: 'Gratwanderung', mode: null },
  { scenario: 'Hinterhof', mode: null },
  { scenario: 'Seeblick', mode: null },
] as const

const WIDTHS = [375, 390, 430, 1440]

describe.skipIf(!CHROMIUM && !WEBKIT)('nothing cut short', () => {
  let server: ViteDevServer
  let url = ''

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5196 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
  }, 60_000)

  afterAll(async () => {
    await server?.close()
  })

  for (const engine of [CHROMIUM, WEBKIT]) suite(engine)

  function suite(engine: Engine | null) {
    describe.skipIf(!engine)(`in ${engine?.name ?? 'a browser that is not installed'}`, () => {
      let browser: Browser

      beforeAll(async () => {
        browser = await engine!.type.launch(engine!.options)
      }, 60_000)

      afterAll(async () => {
        await browser?.close()
      })

      for (const run of RUNS)
        for (const width of WIDTHS) {
          const name = `${run.scenario}${run.mode ? `, ${run.mode}` : ''}`
          it(`cuts no text short in ${name} at ${width} px`, async () => {
            const page = await browser.newPage({ viewport: { width, height: 900 } })
            await page.goto(url)
            await page.evaluate(() => localStorage.clear())
            await page.reload()
            await page.getByRole('button', { name: new RegExp(`^${run.scenario}`) }).click()
            if (run.mode)
              await page.getByRole('button', { name: new RegExp(`^${run.mode}`) }).click()
            await page.getByRole('button', { name: 'New run' }).click()
            for (let i = 0; i < 6; i++) {
              const next = page.getByRole('button', { name: /^(Next|Start week 1)/ })
              if (await next.count()) await next.first().click()
            }
            const found: string[] = []
            await everyTab(page, width, 'week 1', found)
            await page.getByRole('button', { name: 'End week' }).click()
            found.push(...(await cut(page, 'results')))
            await page
              .getByRole('button', { name: /^(Next week|See how it ended)/ })
              .first()
              .click()
            await everyTab(page, width, 'week 2', found)
            expect(found).toEqual([])
            await page.close()
          }, 120_000)
        }
    })
  }
})

/** Every tab on a phone, the desk as a whole, with every notebook section open. */
async function everyTab(page: Page, width: number, when: string, found: string[]) {
  const dismiss = page.getByRole('button', { name: 'Dismiss' })
  if (await dismiss.count()) await dismiss.first().click()
  const tabs = width < 1200 ? await page.locator('nav button').allTextContents() : ['the desk']
  for (const tab of tabs) {
    if (width < 1200) {
      await page.locator('nav button').filter({ hasText: tab }).first().click()
    }
    await openSections(page)
    found.push(...(await cut(page, `${when}, ${tab}`)))
  }
}

async function openSections(page: Page) {
  for (let i = 0; i < 30; i++) {
    const closed = page.locator('section[aria-label="My week"] button[aria-expanded="false"]')
    if (!(await closed.count())) return
    await closed.first().click()
  }
}

/** Elements whose own text is cut: an ellipsis, or a clip, that hides part of it. */
function cut(page: Page, where: string): Promise<string[]> {
  return page.evaluate((where) => {
    const phone = !document.querySelector('[data-layout="desk"]')
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (!el.textContent?.trim() || el.closest('.visually-hidden')) continue
      const css = getComputedStyle(el)
      const clips = css.textOverflow === 'ellipsis' || css.overflowX === 'hidden'
      if (!clips || el.scrollWidth <= el.clientWidth + 1) continue
      // A bar segment too narrow for its label shows none: the label wraps away, it is not cut.
      if (/_segment_/.test(el.className)) continue
      // The approved exception: a section summary beside its title, on a phone.
      if (phone && /_summary_/.test(el.className) && el.closest('[class*="_sectionLine_"]')) {
        continue
      }
      out.push(`${where}: ${el.tagName}.${el.className} "${el.textContent.trim().slice(0, 60)}"`)
    }
    return out
  }, where)
}
