import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { TOURISM_STRATEGIES } from '@founder-mode/bots/src/strategies/tourism'
import { teamVariant } from '@founder-mode/bots/src/strategies/validateThenBuild'
import { loadScenario, type ScenarioId } from '@founder-mode/content'
import {
  createGame,
  endWeek,
  getView,
  respond,
  toSave,
  type GameState,
  type SaveFile,
} from '@founder-mode/engine'
import { CHROMIUM, WEBKIT, type Engine } from './browsers'
import { axe, cut } from './screen'

/**
 * Plan 3 step 1 on screen: the Office section of the Plan and the Office card on the money tab,
 * and an offer of a bigger place. Kantino long is played by its always-moving bot, each tourism
 * scenario by its careful bot, until an offer is on the desk or a move is under way, then opened with every tab and notebook section at
 * 375, 390, 430 and 1440 px in Chrome and WebKit: nothing cut short, axe clean.
 */
const SCENARIOS: ScenarioId[] = ['kantino', 'gratwanderung', 'hinterhof', 'seeblick']
const WIDTHS = [375, 390, 430, 1440]

/**
 * The first seed whose careful run has an office offer on the desk, or a move under way or done,
 * and is still going.
 */
function save(id: ScenarioId): SaveFile {
  const scenario = loadScenario(id, 'long')
  const strategy = scenario.bookings
    ? TOURISM_STRATEGIES.find((s) => s.id === 'tourism_careful')!
    : teamVariant('validate_then_build_always_move')
  const offer = (state: GameState) =>
    state.inbox.some((m) => m.status === 'open' && m.eventId.startsWith('office_'))
  for (let i = 1; i < 200; i++) {
    const seed = `office-${i}`
    let state = createGame(scenario, seed)
    const player = strategy.create(scenario, seed)
    const moved = () => getView(state).office.stage >= 3 || getView(state).office.move !== null
    while (state.status === 'running' && !moved() && !offer(state)) {
      for (const a of player.respond?.(getView(state)) ?? []) {
        state = respond(state, a.messageId, a.choiceId)
      }
      const r = endWeek(state, player.plan(getView(state)))
      player.observe?.(r.report, getView(r.state))
      state = r.state
    }
    if (state.status === 'running') return toSave(state)
  }
  throw new Error(`${id}: no seed gets an office offer`)
}

describe.skipIf(!CHROMIUM && !WEBKIT)('plan 3 office screens', () => {
  let server: ViteDevServer
  let url = ''
  const files = new Map<ScenarioId, SaveFile>()

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5193 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
    for (const id of SCENARIOS) files.set(id, save(id))
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

      for (const id of SCENARIOS)
        for (const width of WIDTHS) {
          it(`shows ${id}'s office at ${width} px`, async () => {
            const page = await browser.newPage({ viewport: { width, height: 900 } })
            await page.goto(url)
            await page.evaluate(
              ([id, file]) => {
                localStorage.clear()
                localStorage.setItem(`founder-mode.save.v1.${id}.long`, JSON.stringify(file))
                localStorage.setItem('founder-mode.scenario.v1', id as string)
                localStorage.setItem('founder-mode.mode.v1', 'long')
              },
              [id, files.get(id)!] as const,
            )
            await page.reload()
            await page.getByRole('button', { name: 'Continue' }).click()
            const dismiss = page.getByRole('button', { name: 'Dismiss' })
            if (await dismiss.count()) await dismiss.first().click()
            const found: string[] = []
            let text = ''
            const tabs =
              width < 1200 ? await page.locator('nav button').allTextContents() : ['the desk']
            for (const tab of tabs) {
              if (width < 1200) {
                await page.locator('nav button').filter({ hasText: tab }).first().click()
              }
              for (let i = 0; i < 30; i++) {
                const closed = page.locator('section button[aria-expanded="false"]')
                if (!(await closed.count())) break
                await closed.first().click()
              }
              found.push(...(await cut(page, tab)))
              text += await page.evaluate(() => document.body.innerText)
              for (const v of await axe(page)) found.push(`axe ${tab}: ${v.id} ${v.nodes[0]}`)
            }
            expect(text).toMatch(/stage [1-5] of 5/)
            expect(text).toMatch(/Rent/)
            expect(found).toEqual([])
            await page.close()
          }, 180_000)
        }
    })
  }
})
