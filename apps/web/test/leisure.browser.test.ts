import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { loadScenario } from '@founder-mode/content'
import { createGame, endWeek, getView, respond, toSave, type SaveFile } from '@founder-mode/engine'
import { TOURISM_STRATEGIES } from '@founder-mode/bots/src/strategies/tourism'
import { CHROMIUM, WEBKIT } from './browsers'
import { ALLOWED, WORDS, axe, cut } from './screen'

const SHOTS = join(tmpdir(), 'founder-mode-leisure')
const scenario = loadScenario('ausgesperrt', 'long')
const careful = TOURISM_STRATEGIES.find((s) => s.id === 'tourism_careful')!

function midSave(): SaveFile {
  for (let i = 1; i <= 20; i++) {
    const seed = `leisure-shot-${i}`
    const player = careful.create(scenario, seed)
    let state = createGame(scenario, seed)
    while (state.status === 'running' && state.week < 24) {
      for (const a of player.respond?.(getView(state)) ?? [])
        state = respond(state, a.messageId, a.choiceId)
      const r = endWeek(state, player.plan(getView(state)))
      state = r.state
      player.observe?.(r.report, getView(state))
    }
    if (state.status === 'running') return toSave(state)
  }
  throw Error('No living Ausgesperrt screenshot run at week 24')
}

describe.skipIf(!CHROMIUM && !WEBKIT)('leisure screens', () => {
  let server: ViteDevServer
  let url = ''
  let middle: SaveFile
  const initial = toSave(createGame(scenario, 'leisure-opening-shot'))
  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5202 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
    middle = midSave()
    mkdirSync(SHOTS, { recursive: true })
  }, 60000)
  afterAll(async () => {
    await server?.close()
  })
  for (const engine of [CHROMIUM, WEBKIT])
    describe.skipIf(!engine)(`in ${engine?.name}`, () => {
      let browser: Browser
      beforeAll(async () => {
        browser = await engine!.type.launch(engine!.options)
      }, 60000)
      afterAll(async () => {
        await browser?.close()
      })
      for (const stage of ['scrappy', 'organised', 'established'] as const)
        for (const width of [375, 390, 430, 1440])
          it(`${stage} at ${width}px has readable, accessible rooms and controls`, async () => {
            const page = await browser.newPage({ viewport: { width, height: 900 } })
            const file = stage === 'scrappy' ? initial : middle
            const query = stage === 'scrappy' ? '' : `?stage=${stage}`
            await page.goto(url + query)
            await page.evaluate((file) => {
              localStorage.clear()
              localStorage.setItem('founder-mode.save.v1.ausgesperrt.long', JSON.stringify(file))
              localStorage.setItem('founder-mode.scenario.v1', 'ausgesperrt')
              localStorage.setItem('founder-mode.mode.v1', 'long')
            }, file)
            await page.reload()
            await page.getByRole('button', { name: 'Continue', exact: true }).click()
            const dismiss = page.getByRole('button', { name: 'Dismiss', exact: true })
            if (await dismiss.count()) await dismiss.first().click()
            const found: string[] = []
            const tabs =
              width < 1200 ? await page.locator('nav button').allTextContents() : ['desk']
            for (let tab = 0; tab < tabs.length; tab++) {
              if (width < 1200) await page.locator('nav button').nth(tab).click()
              for (let n = 0; n < 20; n++) {
                const closed = page.locator('section button[aria-expanded="false"]')
                if (!(await closed.count())) break
                await closed.first().click()
              }
              const where = `${stage}/${width}/${tabs[tab]}`
              found.push(...(await cut(page, where)))
              expect(await axe(page), where).toEqual([])
              const text = await page.locator('body').innerText()
              found.push(
                ...text
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(
                    (line) => WORDS.some((w) => w.test(line)) && !ALLOWED.some((a) => a.test(line)),
                  )
                  .map((line) => `${where}: ${line}`),
              )
              expect(text).not.toMatch(/forecast|wind decides|weather next week/i)
              expect(text).not.toMatch(/\{(?:name|segment|slot|week|n)\}/)
              if (engine!.name === 'chromium' && (width === 390 || width === 1440)) {
                await page.evaluate(() => {
                  for (const element of document.querySelectorAll<HTMLElement>('body *'))
                    if (element.scrollTop > 0) element.scrollTop = 0
                  window.scrollTo(0, 0)
                })
                await page.screenshot({
                  path: join(SHOTS, `ausgesperrt-${stage}-${width}-${tab}.png`),
                })
              }
            }
            expect(found).toEqual([])
            await page.close()
          }, 180000)
    })
})
