import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser, Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { validateThenBuild } from '@founder-mode/bots/src/strategies/validateThenBuild'
import { loadScenario } from '@founder-mode/content'
import { createGame, endWeek, getView, respond, toSave, type SaveFile } from '@founder-mode/engine'
import { CHROMIUM, WEBKIT, type Engine } from './browsers'
import { axe, cut } from './screen'

/**
 * Plan 7 step 2: reasons for losses on screen, in a Kantino run the careful bot played until a
 * loss can be asked about and a customer has left. In all three UI stages (`?stage=`), at 375,
 * 390, 430 and 1440 px, in Chrome and WebKit: the Pipeline's lost list with every loss shown, the
 * weekly results with Ask why booked, and the answer in the inbox. Nothing cut short, axe clean,
 * buttons at least 44 px high.
 */
const STAGES = ['scrappy', 'organised', 'established'] as const
const WIDTHS = [375, 390, 430, 1440]

function save(): SaveFile {
  const scenario = loadScenario('kantino')
  for (let i = 0; i < 100; i++) {
    const seed = `losses-${i}`
    const player = validateThenBuild.create(scenario, seed)
    let state = createGame(scenario, seed)
    while (state.status === 'running') {
      for (const a of player.respond?.(getView(state)) ?? []) {
        state = respond(state, a.messageId, a.choiceId)
      }
      const r = endWeek(state, player.plan(getView(state)))
      player.observe?.(r.report, getView(r.state))
      state = r.state
      const view = getView(state)
      if (
        state.status === 'running' &&
        view.losses.length > 8 &&
        view.losses.some((l) => l.canAsk) &&
        view.losses.some((l) => l.kind === 'customer')
      ) {
        return toSave(state)
      }
    }
  }
  throw new Error('No seed with an askable loss and a customer who left')
}

describe.skipIf(!CHROMIUM && !WEBKIT)('plan 7: reasons for losses in the browser', () => {
  let server: ViteDevServer
  let url = ''
  let file: SaveFile

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5188 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
    file = save()
  }, 120_000)

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
          it(`shows losses, Ask why and the answer in the ${stage} stage at ${width} px`, async () => {
            const page = await browser.newPage({ viewport: { width, height: 900 } })
            await page.goto(`${url}?stage=${stage}`)
            await page.evaluate((f) => {
              localStorage.clear()
              localStorage.setItem('founder-mode.save.v1.kantino', JSON.stringify(f))
              localStorage.setItem('founder-mode.scenario.v1', 'kantino')
            }, file)
            await page.reload()
            await page.getByRole('button', { name: 'Continue' }).first().click()
            const dismiss = page.getByRole('button', { name: 'Dismiss' })
            if (await dismiss.count()) await dismiss.first().click()
            const found: string[] = []
            const violations: unknown[] = []
            const check = async (where: string) => {
              found.push(...(await cut(page, where)), ...(await small(page, where)))
              violations.push(...(await axe(page)))
            }
            const tab = async (name: RegExp) => {
              if (width < 1200) await page.locator('nav button').filter({ hasText: name }).click()
            }
            // The Pipeline's lost list, every loss shown.
            await tab(/Who pays|Pipeline|Customers/)
            await page.getByRole('button', { name: /^Show all \d+/ }).click()
            expect(await page.locator('[data-loss]').count()).toBeGreaterThan(8)
            await check('lost list')
            // Ask why on the newest loss that can be asked, then the week.
            // Its name changes once pressed, so hold the element, not the query.
            const ask = (await page
              .getByRole('button', { name: /^Ask why \(1 h\): / })
              .first()
              .elementHandle())!
            await ask.click()
            await expect.poll(() => ask.getAttribute('aria-pressed')).toBe('true')
            await check('lost list, asking')
            await page.getByRole('button', { name: 'End week' }).click()
            await check('results')
            await page
              .getByRole('button', { name: /^(Next week|See how it ended)/ })
              .first()
              .click()
            await tab(/Inbox|Post/)
            expect(await page.locator('[data-answer]').count()).toBeGreaterThan(0)
            await check('inbox')
            expect({ found, violations }).toEqual({ found: [], violations: [] })
            await page.close()
          }, 120_000)
        }
    })
  }
})

/** Ask why buttons and lost list rows lower than 44 px. */
function small(page: Page, where: string): Promise<string[]> {
  return page.evaluate((where) => {
    const out: string[] = []
    for (const b of document.querySelectorAll<HTMLElement>('[data-loss] button, [data-answer]')) {
      const h = b.getBoundingClientRect().height
      if (h > 0 && h < 43.5) out.push(`${where}: "${b.textContent?.trim().slice(0, 30)}" ${h} px`)
    }
    return out
  }, where)
}
