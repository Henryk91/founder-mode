import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser, Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { CHROMIUM, WEBKIT, type Engine } from './browsers'
import { axe, cut, newRun } from './screen'

/**
 * Plan 7 step 1: "Find customers" with a row per market and channel, each with its stepper and
 * how tired the market is of that channel. In all three UI stages (the dev-only `?stage=`
 * preview), at 375, 390, 430 and 1440 px, in Chrome and WebKit: nothing cut short, axe clean,
 * every row at least 44 px, every market one card with its three channel rows inside.
 */
const STAGES = ['scrappy', 'organised', 'established'] as const
const WIDTHS = [375, 390, 430, 1440]
/** The section's title in each stage. */
const TITLE = { scrappy: 'Find customers', organised: 'Find customers', established: 'Outreach' }
/** The tiredness words, in either case. */
const WORD = /^(fresh|tiring|worn out)$/i

describe.skipIf(!CHROMIUM && !WEBKIT)('plan 7: channel rows', () => {
  let server: ViteDevServer
  let url = ''

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5189 },
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

      for (const stage of STAGES)
        for (const width of WIDTHS) {
          it(`shows every channel of every market in the ${stage} stage at ${width} px`, async () => {
            const page = await browser.newPage({ viewport: { width, height: 900 } })
            await page.goto(`${url}?stage=${stage}`)
            await page.evaluate(() => localStorage.clear())
            await page.reload()
            await newRun(page)
            for (let i = 0; i < 6; i++) {
              const next = page.getByRole('button', { name: /^(Next|Start week 1)/ })
              if (await next.count()) await next.first().click()
            }
            if (width < 1200) await page.locator('nav button').filter({ hasText: 'Plan' }).click()
            const dismiss = page.getByRole('button', { name: 'Dismiss' })
            if (await dismiss.count()) await dismiss.first().click()
            await openSell(page, stage)
            // A heavy week on one channel, so the next week shows a tired channel beside fresh ones.
            const more = page.getByRole('button', {
              name: 'More hours for Coworking spaces (In person)',
            })
            for (let i = 0; i < 20; i++) await more.click()
            const found: string[] = [
              ...(await cut(page, 'week 1')),
              ...(await rows(page, 'week 1')),
            ]
            const v1 = await axe(page)
            await page.getByRole('button', { name: 'End week' }).click()
            await page
              .getByRole('button', { name: /^(Next week|See how it ended)/ })
              .first()
              .click()
            if (await dismiss.count()) await dismiss.first().click()
            await openSell(page, stage)
            found.push(...(await cut(page, 'week 2')), ...(await rows(page, 'week 2')))
            const words = await page.locator('[data-market] [class*="_note_"]').allTextContents()
            const tired = words.map((w) => w.trim()).filter((w) => WORD.test(w))
            // Three markets with three channels each, and the heavy channel no longer fresh.
            expect(tired).toHaveLength(9)
            expect(tired.some((w) => /tiring|worn out/i.test(w))).toBe(true)
            expect({ found, axe: [...v1, ...(await axe(page))] }).toEqual({ found: [], axe: [] })
            await page.close()
          }, 120_000)
        }
    })
  }
})

async function openSell(page: Page, stage: (typeof STAGES)[number]) {
  const section = page.getByRole('button', { name: new RegExp(`^${TITLE[stage]}`) }).first()
  if ((await section.getAttribute('aria-expanded')) === 'false') await section.click()
  await page.locator('[data-market]').first().waitFor()
}

/** Channel rows under 44 px, markets without their three rows, controls off the card. */
function rows(page: Page, where: string): Promise<string[]> {
  return page.evaluate((where) => {
    const out: string[] = []
    const markets = document.querySelectorAll<HTMLElement>('[data-market]')
    if (markets.length !== 3) out.push(`${where}: ${markets.length} market cards`)
    for (const m of markets) {
      const card = m.getBoundingClientRect()
      const lines = m.querySelectorAll<HTMLElement>('[class*="_row_"]')
      // The market's name, then one row per channel.
      if (lines.length !== 4) out.push(`${where}: ${m.dataset['market']} has ${lines.length} rows`)
      for (const row of lines) {
        const h = row.getBoundingClientRect().height
        if (h < 43.5) out.push(`${where}: a row of ${m.dataset['market']} is ${h.toFixed(0)} px`)
      }
      for (const b of m.querySelectorAll<HTMLElement>('button')) {
        const r = b.getBoundingClientRect()
        if (r.width > 0 && (r.left < card.left - 1 || r.right > card.right + 1)) {
          out.push(`${where}: a stepper button of ${m.dataset['market']} leaves its card`)
        }
      }
    }
    return out
  }, where)
}
