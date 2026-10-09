import type { Strategy } from '../strategy'
import { buildOnly } from './buildOnly'
import { playtest } from './playtest'
import { random } from './random'
import { sellFirst } from './sellFirst'
import { overworker, priceAware, validateThenBuild } from './validateThenBuild'

export const STRATEGIES: Strategy[] = [
  random,
  buildOnly,
  sellFirst,
  validateThenBuild,
  priceAware,
  overworker,
  playtest,
]
