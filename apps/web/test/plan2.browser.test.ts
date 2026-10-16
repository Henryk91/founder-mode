import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { TOURISM_STRATEGIES } from '@founder-mode/bots/src/strategies/tourism'
import { loadScenario, type ScenarioId } from '@founder-mode/content'
import {
  createGame,
  emptyPlan,
  endWeek,
  getView,
  respond,
  toSave,
  validatePlan,
  type BookingsPlan,
  type GameState,
  type PlayerView,
  type SaveFile,
  type WeekPlan,
} from '@founder-mode/engine'
import { CHROMIUM, WEBKIT, type Engine } from './browsers'
import { axe, cut } from './screen'

/**
 * Plan 2 step 1 on screen: trials and vouchers, contracts (one in notice), food prepared, kitchen
 * and floor, rooms under works and the minimum stay. Each tourism scenario is played by the
 * careful bot into its season, with a contract, vouchers and room works added on the way; the
 * save is opened with every tab and notebook section at 375, 390, 430 and 1440 px in Chrome and
 * WebKit. Nothing may be cut short, and axe finds nothing on the plan.
 */

const RUNS: { id: ScenarioId; seed: string; week: number; loanForm?: boolean }[] = [
  { id: 'gratwanderung', seed: 'shot-1', week: 20 },
  { id: 'hinterhof', seed: 'shot-5', week: 24 },
  { id: 'seeblick', seed: 'shot-1', week: 30 },
  // Plan 2 step 2: the business plan written, the bank's plan form open.
  { id: 'seeblick', seed: 'shot-1', week: 2, loanForm: true },
  // Plan 4: the forecast strip, product labels and the trip policy.
  { id: 'rueckenwind', seed: 'shot-1', week: 24 },
  // Plan 4: the boat card on Finance.
  { id: 'tiefgang', seed: 'shot-1', week: 24 },
  // Plan 4: the season and the minimum to sail.
  { id: 'leinenlos', seed: 'shot-1', week: 26 },
]

/** One week of writing the business plan, then the form to list items is on the page. */
function loanFormSave(id: ScenarioId, seed: string): SaveFile {
  const scenario = loadScenario(id, 'long')
  const s = createGame(scenario, seed)
  const p = {
    ...emptyPlan(),
    loan: {
      planHours: scenario.loan!.planHours,
      apply: null,
      accept: false,
      decline: false,
      repay: null,
    },
  }
  return toSave(endWeek(s, p).state)
}
const WIDTHS = [375, 390, 430, 1440]

/** Adds to the bot's plan what it may not do on its own, where the plan stays valid. */
function extra(state: GameState, view: PlayerView, plan: WeekPlan): WeekPlan {
  const b = view.bookings!
  const add = (over: Partial<BookingsPlan>): WeekPlan => {
    const next = { ...plan, bookings: { ...plan.bookings!, ...over } }
    return validatePlan(state, next).length === 0 ? next : plan
  }
  if (state.week === 3 && b.vouchers) {
    const seg = b.vouchers.segments[0]!.id
    plan = add({ vouchers: { ...plan.bookings!.vouchers, [seg]: 1 } })
  }
  const role = b.roles.find((r) => r.contracts.some((c) => c.kind === 'permanent'))
  if (state.week === 5 && role) plan = add({ hire: [{ roleId: role.id, kind: 'permanent' }] })
  const own = b.contracts.find((c) => c.canEnd)
  if (state.week === 12 && own) plan = add({ endContracts: [own.id] })
  if (b.renovation && b.renovation.canStart === 0 && b.renovation.renovated === 0) {
    const f = view.product.features.find((x) => x.id === 'renovated_rooms' && !x.shipped)
    if (f && state.week >= 4) plan = { ...plan, build: { ...plan.build, [f.id]: f.remainingHours } }
    if (validatePlan(state, plan).length > 0)
      plan = { ...plan, build: { ...plan.build, [f!.id]: 0 } }
  }
  const works = b.renovation
  if (works && works.canStart > 0 && works.renovated + works.inProgress.length === 0) {
    plan = add({ renovate: 1 })
  }
  return plan
}

/** The first seed from `seed` on (shot-1, shot-2, ...) whose run is still going at `week`. */
function save(id: ScenarioId, seed: string, week: number): SaveFile {
  const n = Number(seed.split('-')[1])
  for (let i = n; i < n + 300; i++) {
    const file = play(id, `shot-${i}`, week)
    if (file) return file
  }
  throw new Error(`${id}: no seed lasts to week ${week}`)
}

function play(id: ScenarioId, seed: string, week: number): SaveFile | null {
  const careful = TOURISM_STRATEGIES.find((s) => s.id === 'tourism_careful')!
  const scenario = loadScenario(id, 'long')
  let state = createGame(scenario, seed)
  const player = careful.create(scenario, seed)
  while (state.status === 'running' && state.week < week) {
    for (const a of player.respond?.(getView(state)) ?? []) {
      state = respond(state, a.messageId, a.choiceId)
    }
    const view = getView(state)
    const r = endWeek(state, extra(state, view, player.plan(view)))
    state = r.state
    player.observe?.(r.report, getView(state))
  }
  return state.status === 'running' ? toSave(state) : null
}

describe.skipIf(!CHROMIUM && !WEBKIT)('plan 2 step 1 screens', () => {
  let server: ViteDevServer
  let url = ''
  const files = new Map<ScenarioId, SaveFile>()

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5194 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
    for (const run of RUNS)
      files.set(
        `${run.id}${run.loanForm ? '-loan' : ''}` as ScenarioId,
        run.loanForm ? loanFormSave(run.id, run.seed) : save(run.id, run.seed, run.week),
      )
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

      for (const run of RUNS)
        for (const width of WIDTHS) {
          it(`shows ${run.id}${run.loanForm ? ', the loan plan,' : ''} at ${width} px`, async () => {
            const page = await browser.newPage({ viewport: { width, height: 900 } })
            await page.goto(url)
            await page.evaluate(
              ([id, file]) => {
                localStorage.clear()
                localStorage.setItem(`founder-mode.save.v1.${id}.long`, JSON.stringify(file))
                localStorage.setItem('founder-mode.scenario.v1', id as string)
                localStorage.setItem('founder-mode.mode.v1', 'long')
              },
              [
                run.id,
                files.get(`${run.id}${run.loanForm ? '-loan' : ''}` as ScenarioId)!,
              ] as const,
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
                const closed = page.locator(
                  'section[aria-label="My week"] button[aria-expanded="false"]',
                )
                if (!(await closed.count())) break
                await closed.first().click()
              }
              found.push(...(await cut(page, tab)))
              text += await page.evaluate(() => document.body.innerText)
              if (tab === 'Plan' || tab === 'the desk') {
                for (const v of await axe(page)) found.push(`axe ${tab}: ${v.id} ${v.nodes[0]}`)
              }
            }
            // The new parts are on the page.
            if (run.loanForm) {
              expect(text).toMatch(/It does not lend a cushion on top/)
              expect(text).toMatch(/Working capital/)
              expect(found).toEqual([])
              await page.close()
              return
            }
            // Plan 4: a gulet's crew comes with the boat; no staff contracts there.
            if (run.id !== 'leinenlos') expect(text).toMatch(/Staff on contracts/)
            if (run.id === 'hinterhof') expect(text).toMatch(/Food prepared/)
            if (run.id === 'rueckenwind') expect(text).toMatch(/Wind and sea, as forecast/)
            if (run.id === 'rueckenwind') expect(text).toMatch(/ runs on \d+ of \d+ /)
            if (run.id === 'tiefgang') expect(text).toMatch(/How you have it/)
            if (run.id === 'tiefgang') expect(text).toMatch(/The options/)
            if (run.id === 'leinenlos') expect(text).toMatch(/The season, week by week/)
            if (run.id === 'leinenlos') expect(text).toMatch(/Minimum to sail/)
            if (run.id === 'seeblick') expect(text).toMatch(/Minimum stay/)
            if (run.id === 'seeblick') expect(text).toMatch(/Rooms, one at a time/)
            expect(found).toEqual([])
            await page.close()
          }, 120_000)
        }
    })
  }
})
