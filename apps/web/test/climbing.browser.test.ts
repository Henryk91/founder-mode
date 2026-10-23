import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { CHROMIUM, WEBKIT } from './browsers'
import { ALLOWED, WORDS, axe, cut } from './screen'
// These refer to the climbing discipline,not sales leads.
const CLIMBING_ALLOWED = [
  ...ALLOWED,
  /^Lead climbing(?: course|:)/,
  /^Lead coach, six-hour course/,
  /^You, as Lead coach, six-hour course/,
]
const SHOTS = join(tmpdir(), 'founder-mode-climbing')
const html =
  '<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Griffig browser fixture</title></head><body><div id="root"></div><script type="module" src="/test/climbing-preview.tsx"></script></body></html>'
describe.skipIf(!CHROMIUM && !WEBKIT)('unregistered climbing screens', () => {
  let server: ViteDevServer,
    url = ''
  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5205 },
      plugins: [
        {
          name: 'climbing-browser-entry',
          configureServer(vite) {
            vite.middlewares.use('/climbing-preview.html', async (req, res, next) => {
              try {
                res.setHeader('Content-Type', 'text/html')
                res.end(await vite.transformIndexHtml(req.url ?? '/climbing-preview.html', html))
              } catch (e) {
                next(e)
              }
            })
          },
        },
      ],
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
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
      for (const stage of ['scrappy', 'organised', 'established'])
        for (const width of [375, 390, 430, 1440])
          it(`${stage} at ${width}px supports safe hall access`, async () => {
            const page = await browser.newPage({ viewport: { width, height: 900 } })
            await page.goto(url + `climbing-preview.html?stage=${stage}`)
            await expect
              .poll(async () => await page.getByRole('button', { name: /end week/i }).count(), {
                // A cold preview loads the full scenario and screens under concurrent bot load.
                timeout: 15_000,
              })
              .toBeGreaterThan(0)
            const tabs =
              width < 1200 ? await page.locator('nav button').allTextContents() : ['desk']
            const found: string[] = []
            for (let tab = 0; tab < tabs.length; tab++) {
              if (width < 1200) await page.locator('nav button').nth(tab).click()
              for (let n = 0; n < 20; n++) {
                const closed = page.locator('section button[aria-expanded="false"]')
                if (!(await closed.count())) break
                await closed.first().click()
              }
              if (stage === 'established' && width === 390 && tabs[tab] === 'Hall access') {
                const before = await page
                  .getByRole('region', { name: 'Hall opening and setting' })
                  .innerText()
                const more = page.getByRole('button', {
                  name: 'More opening hours for Early mornings',
                  exact: true,
                })
                const fewer = page.getByRole('button', {
                  name: 'Fewer opening hours for Early mornings',
                  exact: true,
                })
                await ((await more.isEnabled()) ? more : fewer).click()
                expect(
                  await page.getByRole('region', { name: 'Hall opening and setting' }).innerText(),
                ).not.toBe(before)
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
                    (line) =>
                      WORDS.some((w) => w.test(line)) &&
                      !CLIMBING_ALLOWED.some((a) => a.test(line)),
                  )
                  .map((line) => `${where}: ${line}`),
              )
              expect(text).not.toMatch(/qualificationRates|comfortByStage|\{(?:name|slot|week|n)\}/)
              if (engine!.name === 'chromium' && (width === 390 || width === 1440)) {
                await page.evaluate(() => {
                  for (const e of document.querySelectorAll<HTMLElement>('body *'))
                    if (e.scrollTop > 0) e.scrollTop = 0
                  window.scrollTo(0, 0)
                })
                await page.screenshot({ path: join(SHOTS, `griffig-${stage}-${width}-${tab}.png`) })
              }
            }
            expect(found).toEqual([])
            await page.close()
          }, 180000)
    })
})
