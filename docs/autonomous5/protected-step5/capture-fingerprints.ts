import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { loadScenario } from '../../../packages/content/src/index'
import { scenarioHash } from '../../../packages/engine/src/hash'
import { ENGINE_VERSION } from '../../../packages/engine/src/version'

// Refuse to overwrite a baseline. Later checks must write a fresh candidate file.
const output = process.argv[2]
if (!output) throw new Error('Provide a new output file path')
const games = [
  ['kantino', 'standard'],
  ['zollstock', 'standard'],
  ['kantino', 'long'],
  ['gratwanderung', 'long'],
  ['hinterhof', 'long'],
  ['seeblick', 'long'],
  ['rueckenwind', 'long'],
  ['tiefgang', 'long'],
  ['leinenlos', 'long'],
  ['ausgesperrt', 'long'],
  ['fabriketage', 'long'],
  ['schweissperle', 'long'],
] as const
const result = {
  engineVersion: ENGINE_VERSION,
  scenarios: games.map(([id, mode]) => ({ id, mode, hash: scenarioHash(loadScenario(id, mode)) })),
}
writeFileSync(resolve(output), `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
