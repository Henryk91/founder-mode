import type { Strategy } from '../strategy'
import { buildOnly } from './buildOnly'
import { playtest } from './playtest'
import { random } from './random'
import { sellFirst } from './sellFirst'
import {
  overworker,
  priceAware,
  validateThenBuild,
  validateThenBuildHire,
} from './validateThenBuild'

export const STRATEGIES: Strategy[] = [
  random,
  buildOnly,
  sellFirst,
  validateThenBuild,
  validateThenBuildHire,
  priceAware,
  overworker,
  playtest,
]
