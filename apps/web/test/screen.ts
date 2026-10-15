import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import type { Page } from 'playwright-core'

// Checks shared by the screen tests of plan 2 and plan 3: axe, and nothing cut short.
const AXE = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8')

type Violation = { id: string; nodes: string[] }

export async function axe(page: Page): Promise<Violation[]> {
  await page.evaluate(AXE)
  return page.evaluate(async () => {
    const w = window as unknown as {
      axe: {
        run(
          ctx: Document,
          opts: object,
        ): Promise<{ violations: { id: string; nodes: { target: string[] }[] }[] }>
      }
    }
    const r = await w.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
      },
      resultTypes: ['violations'],
    })
    return r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target.join(' ')) }))
  })
}

/** Elements whose own text is cut (as in cutoff.browser.test.ts). */
export function cut(page: Page, where: string): Promise<string[]> {
  return page.evaluate((where) => {
    const phone = !document.querySelector('[data-layout="desk"]')
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('body *')) {
      if (!el.textContent?.trim() || el.closest('.visually-hidden')) continue
      const css = getComputedStyle(el)
      const clips = css.textOverflow === 'ellipsis' || css.overflowX === 'hidden'
      if (!clips || el.scrollWidth <= el.clientWidth + 1) continue
      if (/_segment_/.test(el.className)) continue
      if (phone && /_summary_/.test(el.className) && el.closest('[class*="_sectionLine_"]')) {
        continue
      }
      out.push(`${where}: ${el.tagName}.${el.className} "${el.textContent.trim().slice(0, 60)}"`)
    }
    for (const label of phone
      ? document.querySelectorAll<HTMLElement>('[class*="_rowStack_"] > [class*="_wrapped_"]')
      : []) {
      const row = label.parentElement!.getBoundingClientRect()
      const box = label.getBoundingClientRect()
      if (box.height > 45 && box.width < row.width - 1) {
        out.push(`${where}: "${label.textContent?.trim()}" wraps beside its controls`)
      }
    }
    if (document.documentElement.scrollWidth > window.innerWidth + 1) {
      out.push(`${where}: the page scrolls sideways`)
    }
    return out
  }, where)
}
