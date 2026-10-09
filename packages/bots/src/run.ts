import { ENGINE_VERSION } from '@founder-mode/engine'
import { parseArgs } from './args'

const args = parseArgs(process.argv.slice(2))

console.log(
  `founder-mode bots (engine ${ENGINE_VERSION}): ${args.runs} runs, seed prefix "${args.seedPrefix}".`,
)
console.log('No strategies yet. They arrive in Phase 3.')
