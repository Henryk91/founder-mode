import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Browser, Page } from 'playwright-core'
import { createServer, type ViteDevServer } from 'vite'
import { CHROMIUM, WEBKIT, type Engine } from './browsers'
import { axe, cut, openCompany } from './screen'

/**
 * The Start screen in a real browser (docs/design/start-screen.html): axe, nothing cut short, no
 * sideways scrolling and 44 px targets at 375, 390, 430 and 1440 px in Chrome and WebKit; the
 * sheet's focus and Escape, the save warning, the tabs by keyboard and the remembered category.
 */
describe.skipIf(!CHROMIUM && !WEBKIT)('the Start screen in the browser', () => {
  let server: ViteDevServer
  const browsers = new Map<string, Browser>()
  let url = ''

  beforeAll(async () => {
    server = await createServer({
      root: fileURLToPath(new URL('..', import.meta.url)),
      logLevel: 'silent',
      server: { port: 5201 },
    })
    await server.listen()
    url = server.resolvedUrls?.local[0] ?? ''
    for (const e of [CHROMIUM, WEBKIT] as (Engine | null)[]) {
      if (e) browsers.set(e.name, await e.type.launch(e.options))
    }
  }, 60_000)

  afterAll(async () => {
    for (const b of browsers.values()) await b.close()
    await server?.close()
  })

  async function open(engine: Engine, width: number): Promise<Page> {
    const page = await browsers.get(engine.name)!.newPage({ viewport: { width, height: 844 } })
    await page.goto(url)
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    return page
  }

  /** The text of the focused element and whether it sits in the sheet. */
  const focus = (page: Page) =>
    page.evaluate(() => {
      const el = document.activeElement as HTMLElement
      return { text: el.textContent?.trim() ?? '', inSheet: !!el.closest('[role="dialog"]') }
    })

  /** Controls under 44 px either way. */
  const small = (page: Page) =>
    page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>('main button, main summary, main input')]
        .filter((el) => {
          const r = el.getBoundingClientRect()
          return r.width > 0 && (r.height < 44 || r.width < 44)
        })
        .map((el) => el.textContent?.trim().slice(0, 30) ?? el.tagName),
    )

  /** Starts a run of the company with its sheet open and comes back to the Start screen. */
  async function saveOne(page: Page, company: string) {
    await openCompany(page, company)
    await page.waitForSelector('button:has-text("Start a new run"):not([disabled])')
    const go = page.getByRole('button', { name: /^(Start a new run|Replace it and start)$/ })
    await go.click()
    if (await page.getByRole('alert').count()) await go.click()
    await page.waitForSelector('[data-autofocus]:not(:has-text("Founder Mode"))')
    await page.reload()
  }

  for (const engine of [CHROMIUM, WEBKIT])
    for (const width of [375, 390, 430, 1440])
      it.skipIf(!engine)(
        `works at ${width} px in ${engine?.name}`,
        async () => {
          const page = await open(engine!, width)
          const found: Record<string, unknown> = {}
          const check = async (where: string) => {
            const v = await axe(page)
            if (v.length) found[`${where}: axe`] = v
            const c = await cut(page, where)
            if (c.length) found[`${where}: cut`] = c
            const s = await small(page)
            if (s.length) found[`${where}: small`] = s
          }
          await check('startups')

          // The tabs by keyboard: arrows move along them and pick the one they land on.
          await page.getByRole('tab', { name: 'Startups' }).focus()
          await page.keyboard.press('ArrowRight')
          expect(await focus(page)).toEqual({ text: 'Tourism', inSheet: false })
          expect(await page.getByRole('tab', { selected: true }).textContent()).toBe('Tourism')
          await check('tourism')
          await page.keyboard.press('Home')
          expect(await page.getByRole('tab', { selected: true }).textContent()).toBe('Startups')

          // The sheet: focus moves into it, Escape closes it and focus goes back to the row.
          await page.getByRole('button', { name: /^Kantino/ }).click()
          expect(await focus(page)).toEqual({ text: 'Kantino', inSheet: true })
          expect(await page.getByRole('button', { name: /^104 weeks/ }).count()).toBe(1)
          await check('sheet')
          await page.getByText('More options: start from a seed').click()
          await check('sheet, more options')
          await page.keyboard.press('Escape')
          expect(await page.getByRole('dialog').count()).toBe(0)
          expect((await focus(page)).text).toMatch(/^Kantino/)
          // And the close button does the same. Zollstock has one length, so no choice.
          await page.getByRole('button', { name: /^Zollstock/ }).click()
          expect(await page.getByRole('button', { name: /^104 weeks/ }).count()).toBe(0)
          await page.getByRole('button', { name: 'Close' }).click()
          expect(await page.getByRole('dialog').count()).toBe(0)
          expect((await focus(page)).text).toMatch(/^Zollstock/)

          // One save: the Continue card. Starting again over it warns first.
          await saveOne(page, 'Kantino')
          expect(await page.getByRole('heading', { name: 'Continue: Kantino' }).count()).toBe(1)
          expect(await page.getByRole('button', { name: 'Other saved games' }).count()).toBe(0)
          await check('one save')
          await openCompany(page, 'Kantino')
          await page.waitForSelector('button:has-text("Start a new run"):not([disabled])')
          await page.getByRole('button', { name: 'Start a new run' }).click()
          expect(await page.getByRole('alert').textContent()).toContain('A new run replaces it')
          await check('replace warning')
          await page.getByRole('button', { name: 'Keep the saved run' }).click()
          expect(await page.getByRole('alert').count()).toBe(0)
          await page.keyboard.press('Escape')

          // Several saves: the last one played on the card, the others behind the link. The
          // category played last is the one shown after a reload.
          await saveOne(page, 'Seeblick')
          expect(await page.getByRole('heading', { name: 'Continue: Seeblick' }).count()).toBe(1)
          expect(await page.getByRole('tab', { selected: true }).textContent()).toBe('Tourism')
          await page.getByRole('button', { name: 'Other saved games' }).click()
          expect(await page.getByRole('button', { name: /^Kantino Week 1 of 60/ }).count()).toBe(1)
          await check('several saves')
          await page.getByRole('button', { name: 'Continue', exact: true }).click()
          await page.waitForSelector('h1:has-text("Seeblick")')

          expect(found).toEqual({})
          await page.close()
        },
        120_000,
      )
})
