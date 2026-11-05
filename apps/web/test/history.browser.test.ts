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
 * Plan 7 step 2b: Help's Past weeks in the browser. A Kantino run the careful bot played for 15
 * weeks is continued; the list shows every week, and an earlier week's report opens and closes.
 * All three UI stages, 375, 390, 430 and 1440 px, Chrome and WebKit: nothing cut short, axe clean,
 * the week buttons at least 44 px high.
 */
const STAGES = ['scrappy', 'organised', 'established'] as const
const WIDTHS = [375, 390, 430, 1440]

function save(): SaveFile {
  const scenario = loadScenario('kantino')
  const player = validateThenBuild.create(scenario, 'history')
  let state = createGame(scenario, 'history')
  while (state.status === 'running' && state.week <= 15) {
    for (const a of player.respond?.(getView(state)) ?? []) {
      state = respond(state, a.messageId, a.choiceId)
    }
    const r = endWeek(state, player.plan(getView(state)))
    player.observe?.(r.report, getView(r.state))
    state = r.state
  }
  return toSave(state)
}

describe.skipIf(!CHROMIUM && !WEBKIT)('plan 7: Past weeks in the browser', () => {
  let server: ViteDevServer
  let url = ''
  let file: SaveFile

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5187 },
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
          it(`lists and reopens past weeks in the ${stage} stage at ${width} px`, async () => {
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
            await page.getByRole('button', { name: 'Help' }).click()
            const weeks = page.locator('[data-past-weeks] button')
            expect(await weeks.count()).toBe(15)
            const found = [...(await cut(page, 'past weeks')), ...(await small(page))]
            const violations = [...(await axe(page))]
            await page.getByRole('button', { name: /^Week 7/ }).click()
            await page
              .getByRole('heading', { name: /Week 7/ })
              .first()
              .waitFor()
            found.push(...(await cut(page, 'week 7')))
            violations.push(...(await axe(page)))
            await page.getByRole('button', { name: 'Back to help' }).click()
            expect(await weeks.count()).toBe(15)
            expect({ found, violations }).toEqual({ found: [], violations: [] })
            await page.close()
          }, 120_000)
        }
    })
  }
})

/** Week buttons under 44 px. */
function small(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>('[data-past-weeks] button')]
      .map((b) => b.getBoundingClientRect().height)
      .filter((h) => h > 0 && h < 43.5)
      .map((h) => `a past week button ${h} px`),
  )
}
