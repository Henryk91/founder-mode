import { existsSync } from 'node:fs'
import { chromium, webkit, type BrowserType, type LaunchOptions } from 'playwright-core'

/**
 * The browsers the browser tests run in: Chrome where one is installed (set CHROME_PATH to point
 * at one), and Playwright's WebKit, the engine of every browser on an iPhone, where it is
 * installed (`pnpm --filter @founder-mode/web exec playwright-core install webkit`).
 */
export const chromePath = [
  process.env['CHROME_PATH'],
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].find((p): p is string => !!p && existsSync(p))

function webkitInstalled(): boolean {
  try {
    return existsSync(webkit.executablePath())
  } catch {
    return false
  }
}

export type Engine = {
  name: 'chromium' | 'webkit'
  type: BrowserType
  options: LaunchOptions
}

export const CHROMIUM: Engine | null = chromePath
  ? { name: 'chromium', type: chromium, options: { executablePath: chromePath } }
  : null

export const WEBKIT: Engine | null = webkitInstalled()
  ? { name: 'webkit', type: webkit, options: {} }
  : null
