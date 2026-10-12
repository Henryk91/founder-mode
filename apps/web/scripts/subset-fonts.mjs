// Cuts the bundled fonts down to the characters the game uses: Latin-1, the euro sign and the
// minus sign. Writes src/theme/fonts/*.woff2, which src/theme/fonts.css loads. Run it again after
// updating a @fontsource package, or when the game needs characters outside the set:
//   pnpm --filter @founder-mode/web fonts
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import subsetFont from 'subset-font'

const require = createRequire(import.meta.url)
const OUT = fileURLToPath(new URL('../src/theme/fonts/', import.meta.url))

/** Latin-1 (printable), euro and minus. Keep in step with UNICODE_RANGE in fonts.css. */
const ranges = [
  [0x20, 0x7e],
  [0xa0, 0xff],
  [0x20ac, 0x20ac],
  [0x2212, 0x2212],
]
const text = ranges
  .flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => String.fromCodePoint(a + i)))
  .join('')

const FONTS = [
  ['caveat', [500, 700]],
  ['ibm-plex-sans', [400, 600, 700]],
  ['ibm-plex-mono', [400, 600]],
]

mkdirSync(OUT, { recursive: true })
for (const [family, weights] of FONTS) {
  for (const weight of weights) {
    const source = require.resolve(
      `@fontsource/${family}/files/${family}-latin-${weight}-normal.woff2`,
    )
    const input = readFileSync(source)
    // Every layout feature stays: Caveat's alternates are what make it look handwritten.
    const output = await subsetFont(input, text, {
      targetFormat: 'woff2',
      preserveNameIds: [0, 1, 2, 3, 4, 5, 6],
    })
    const name = `${family}-${weight}.woff2`
    writeFileSync(OUT + name, output)
    console.log(
      `${name}: ${(input.length / 1024).toFixed(1)} kB -> ${(output.length / 1024).toFixed(1)} kB`,
    )
  }
}
