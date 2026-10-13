import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser, Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { TOURISM_STRATEGIES } from '@founder-mode/bots/src/strategies/tourism'
import { loadScenario, type ScenarioId } from '@founder-mode/content'
import { createGame, endWeek, getView, respond, toSave, type SaveFile } from '@founder-mode/engine'
import { CHROMIUM, WEBKIT } from './browsers'

/**
 * Tourism screens speak tourism (tourism fixes, item 12): no bugs, customers, landing pages,
 * pre-sales, demos or monthly prices where a guest, a pilot or a price per person belongs. The
 * careful tourism bot plays each scenario into its summer and to its end; the plan with every
 * section open, the week's results, Money, Help and the post-mortem are read at 390 and 1440 px.
 */
const WORDS = [
  /\bbugs?\b/i,
  /\bcustomers?\b/i,
  /landing page/i,
  /\bpre-?sales?\b/i,
  /\bdemos?\b/i,
  /per month/i,
  /\bshipped\b/i,
  /\bleads?\b/i,
  /\btrials?\b/i,
]

/** Where a listed word is right: fixed costs do run per month. */
const ALLOWED = [/^Company costs per month \(/]

/** A seed and a week in season where the careful bot is still in business. */
const RUNS: { id: ScenarioId; seed: string; week: number }[] = [
  { id: 'gratwanderung', seed: 'shot-1', week: 20 },
  { id: 'hinterhof', seed: 'shot-5', week: 24 },
  { id: 'seeblick', seed: 'shot-1', week: 36 },
]

/** The careful bot's game: a save at the given week and one of the finished run. */
function saves(id: ScenarioId, seed: string, week: number): { mid: SaveFile; end: SaveFile } {
  const careful = TOURISM_STRATEGIES.find((s) => s.id === 'tourism_careful')!
  const scenario = loadScenario(id, 'long')
  let state = createGame(scenario, seed)
  const player = careful.create(scenario, seed)
  let mid: SaveFile | null = null
  while (state.status === 'running') {
    for (const a of player.respond?.(getView(state)) ?? []) {
      state = respond(state, a.messageId, a.choiceId)
    }
    if (state.week === week) mid = toSave(state)
    const r = endWeek(state, player.plan(getView(state)))
    state = r.state
    player.observe?.(r.report, getView(state))
  }
  if (!mid) throw new Error(`${id} ${seed} ended before week ${week}`)
  return { mid, end: toSave(state) }
}

const engine = CHROMIUM ?? WEBKIT

describe.skipIf(!engine)('tourism words', () => {
  let server: ViteDevServer
  let browser: Browser
  let url = ''

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5195 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
    browser = await engine!.type.launch(engine!.options)
  }, 60_000)

  afterAll(async () => {
    await browser?.close()
    await server?.close()
  })

  async function open(width: number, id: ScenarioId, save: SaveFile): Promise<Page> {
    const page = await browser.newPage({ viewport: { width, height: 900 } })
    await page.goto(url)
    await page.evaluate(
      ([id, save]) => {
        localStorage.clear()
        localStorage.setItem(`founder-mode.save.v1.${id}.long`, JSON.stringify(save))
        localStorage.setItem('founder-mode.scenario.v1', id as string)
        localStorage.setItem('founder-mode.mode.v1', 'long')
      },
      [id, save] as const,
    )
    await page.reload()
    await page.getByRole('button', { name: 'Continue' }).click()
    return page
  }

  /** Lines of the page's text with a listed word in them, outside the allow-list. */
  async function wrong(page: Page, where: string): Promise<string[]> {
    const text = await page.evaluate(() => document.body.innerText)
    return text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => WORDS.some((w) => w.test(l)) && !ALLOWED.some((a) => a.test(l)))
      .map((l) => `${where}: ${l}`)
  }

  for (const run of RUNS)
    for (const width of [390, 1440]) {
      it(`speaks tourism in ${run.id} at ${width} px`, async () => {
        const { mid, end } = saves(run.id, run.seed, run.week)
        const found: string[] = []
        const page = await open(width, run.id, mid)
        const dismiss = page.getByRole('button', { name: 'Dismiss' })
        if (await dismiss.count()) await dismiss.first().click()
        const tabs = width < 1200 ? ['Plan', 'Money'] : [null]
        for (const tab of tabs) {
          if (tab) await page.locator('nav button').filter({ hasText: tab }).first().click()
          for (let i = 0; i < 30; i++) {
            const closed = page.locator(
              'section[aria-label="My week"] button[aria-expanded="false"]',
            )
            if (!(await closed.count())) break
            await closed.first().click()
          }
          found.push(...(await wrong(page, tab ?? 'desk')))
        }
        await page.getByRole('button', { name: 'Help', exact: true }).click()
        found.push(...(await wrong(page, 'Help')))
        await page.getByRole('button', { name: 'Back to the game' }).click()
        await page.getByRole('button', { name: 'End week' }).click()
        found.push(...(await wrong(page, 'results')))
        await page.close()

        const after = await open(width, run.id, end)
        for (let i = 0; i < 10; i++) {
          const fold = after.locator('button[aria-expanded="false"]')
          if (!(await fold.count())) break
          await fold.first().click()
        }
        found.push(...(await wrong(after, 'post-mortem')))
        await after.close()
        expect(found).toEqual([])
      }, 120_000)
    }
})
