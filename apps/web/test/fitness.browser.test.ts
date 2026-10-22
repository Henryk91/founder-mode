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

// These authored studio offers and quotes refer to trial classes, not software trials.
const FITNESS_ALLOWED = [
  ...ALLOWED,
  /^Quiet-slot listing trial$/,
  /^Trial-class week$/,
  /^Check usable times and invite a trial \(\d+ h\)$/,
  /^I am ready to pay for a trial if the room really is separate from spin\.$/,
  /^The team chose your trial\. I need a quotation with actual places attached\.$/,
]
const SHOTS = join(tmpdir(), 'founder-mode-fitness')
const scenario = loadScenario('schweissperle', 'long')
const careful = TOURISM_STRATEGIES.find((s) => s.id === 'tourism_careful')!

function midSave(): SaveFile {
  for (let i = 1; i <= 20; i++) {
    const seed = `fitness-shot-${i}`
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
  throw Error('No living Schweißperle screenshot run at week 24')
}

describe.skipIf(!CHROMIUM && !WEBKIT)('fitness screens', () => {
  let server: ViteDevServer
  let url = ''
  let middle: SaveFile
  const initial = toSave(createGame(scenario, 'fitness-opening-shot'))
  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5204 },
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
          it(`${stage} at ${width}px has readable, accessible memberships and classes`, async () => {
            const page = await browser.newPage({ viewport: { width, height: 900 } })
            const file = stage === 'scrappy' ? initial : middle
            const query = stage === 'scrappy' ? '' : `?stage=${stage}`
            await page.goto(url + query)
            await page.evaluate((file) => {
              localStorage.clear()
              localStorage.setItem('founder-mode.save.v1.schweissperle.long', JSON.stringify(file))
              localStorage.setItem('founder-mode.scenario.v1', 'schweissperle')
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
              for (const detail of await page
                .locator('section[aria-label="Class timetable"] details')
                .all())
                await detail.evaluate((el) => {
                  ;(el as HTMLDetailsElement).open = true
                })
              const where = `${stage}/${width}/${tabs[tab]}`
              found.push(...(await cut(page, where)))
              expect(await axe(page), where).toEqual([])
              const text = await page.locator('body').innerText()
              found.push(
                ...text
                  .split('\n')
                  .map((s) => s.trim())
                  .filter(
                    (line) =>
                      WORDS.some((w) => w.test(line)) && !FITNESS_ALLOWED.some((a) => a.test(line)),
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
                  path: join(SHOTS, `schweissperle-${stage}-${width}-${tab}.png`),
                })
              }
            }
            expect(found).toEqual([])
            await page.close()
          }, 180000)
    })
})
