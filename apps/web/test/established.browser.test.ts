import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser, Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { TOURISM_STRATEGIES } from '@founder-mode/bots/src/strategies/tourism'
import { teamVariant } from '@founder-mode/bots/src/strategies/validateThenBuild'
import { loadScenario, type ScenarioId } from '@founder-mode/content'
import { createGame, endWeek, getView, respond, toSave, type SaveFile } from '@founder-mode/engine'
import { CHROMIUM, WEBKIT, type Engine } from './browsers'
import { ALLOWED, axe, cut, WORDS } from './screen'

/**
 * Plan 3 step 3: the established stage on screen. Each long mode scenario is played by a bot to
 * the middle of its run and opened with the dev-only stage preview (`?stage=established`), every
 * tab and form section open, at 375, 390, 430 and 1440 px in Chrome and WebKit: nothing cut short
 * or scrolling sideways, axe clean, tourism words only in tourism, the form's rows at least 44 px
 * with every control on its card. Screenshots at 390 and 1440 px go outside the repository.
 */
const RUNS: { id: ScenarioId; week: number }[] = [
  { id: 'kantino', week: 40 },
  { id: 'gratwanderung', week: 20 },
  { id: 'hinterhof', week: 24 },
  { id: 'seeblick', week: 36 },
]
const WIDTHS = [375, 390, 430, 1440]
/** Where the screenshots go: a folder in the system's temporary directory. */
export const SHOTS = join(tmpdir(), 'founder-mode-established')

function save(id: ScenarioId, week: number): SaveFile {
  const scenario = loadScenario(id, 'long')
  const strategy = scenario.bookings
    ? TOURISM_STRATEGIES.find((s) => s.id === 'tourism_careful')!
    : teamVariant('validate_then_build_always_move')
  for (let i = 1; i < 200; i++) {
    const seed = `shot-${i}`
    let state = createGame(scenario, seed)
    const player = strategy.create(scenario, seed)
    while (state.status === 'running' && state.week < week) {
      for (const a of player.respond?.(getView(state)) ?? []) {
        state = respond(state, a.messageId, a.choiceId)
      }
      const r = endWeek(state, player.plan(getView(state)))
      player.observe?.(r.report, getView(r.state))
      state = r.state
    }
    if (state.status === 'running') return toSave(state)
  }
  throw new Error(`${id}: no seed lasts to week ${week}`)
}

/** Rows of the form under 44 px, and controls that stick out of the form's card. */
function formProblems(page: Page, where: string): Promise<string[]> {
  return page.evaluate((where) => {
    const out: string[] = []
    const form = document.querySelector<HTMLElement>('[class*="_notebook_"]')
    if (!form) return out
    const card = form.getBoundingClientRect()
    for (const row of form.querySelectorAll<HTMLElement>(
      '[class*="_row_"], [class*="_sectionLine_"]',
    )) {
      const h = row.getBoundingClientRect().height
      if (h > 0 && h < 43.5) out.push(`${where}: a form row ${h.toFixed(0)} px high`)
    }
    for (const b of form.querySelectorAll<HTMLElement>('button')) {
      const r = b.getBoundingClientRect()
      if (r.width === 0) continue
      if (r.left < card.left - 1 || r.right > card.right + 1) {
        out.push(`${where}: "${b.textContent?.trim().slice(0, 30)}" leaves the form`)
      }
    }
    return out
  }, where)
}

describe.skipIf(!CHROMIUM && !WEBKIT)('plan 3 established screens', () => {
  let server: ViteDevServer
  let url = ''
  const files = new Map<ScenarioId, SaveFile>()

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5192 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
    for (const run of RUNS) files.set(run.id, save(run.id, run.week))
    mkdirSync(SHOTS, { recursive: true })
  }, 300_000)

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
          it(`shows ${run.id} established at ${width} px`, async () => {
            const page = await browser.newPage({ viewport: { width, height: 900 } })
            await page.goto(`${url}?stage=established`)
            await page.evaluate(
              ([id, file]) => {
                localStorage.clear()
                localStorage.setItem(`founder-mode.save.v1.${id}.long`, JSON.stringify(file))
                localStorage.setItem('founder-mode.scenario.v1', id as string)
                localStorage.setItem('founder-mode.mode.v1', 'long')
              },
              [run.id, files.get(run.id)!] as const,
            )
            await page.reload()
            await page.getByRole('button', { name: 'Continue' }).click()
            const dismiss = page.getByRole('button', { name: 'Dismiss' })
            if (await dismiss.count()) await dismiss.first().click()
            expect(await page.evaluate(() => document.documentElement.dataset['stage'])).toBe(
              'established',
            )
            const tourism = run.id !== 'kantino'
            const found: string[] = []
            let text = ''
            const tabs =
              width < 1200 ? await page.locator('nav button').allTextContents() : ['the desk']
            for (const [i, tab] of tabs.entries()) {
              if (width < 1200) await page.locator('nav button').nth(i).click()
              if (engine?.name === 'chromium' && (width === 390 || width === 1440)) {
                await page.screenshot({
                  path: join(SHOTS, `${run.id}-${width}-${i}.png`),
                })
              }
              for (let k = 0; k < 30; k++) {
                const closed = page.locator('section button[aria-expanded="false"]')
                if (!(await closed.count())) break
                await closed.first().click()
              }
              found.push(...(await cut(page, tab)))
              found.push(...(await formProblems(page, tab)))
              for (const v of await axe(page)) found.push(`axe ${tab}: ${v.id} ${v.nodes[0]}`)
              text += `${await page.evaluate(() => document.body.innerText)}\n`
            }
            if (tourism) {
              for (const line of text.split('\n').map((l) => l.trim())) {
                if (WORDS.some((w) => w.test(line)) && !ALLOWED.some((a) => a.test(line))) {
                  found.push(`tourism word: ${line}`)
                }
              }
            }
            expect(text).toMatch(/This week/)
            expect(found).toEqual([])
            await page.close()
          }, 180_000)
        }
    })
  }
})
