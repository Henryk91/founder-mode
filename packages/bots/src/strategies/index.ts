import type { Strategy } from '../strategy'
import { buildOnly } from './buildOnly'
import { playtest } from './playtest'
import { random } from './random'
import { sellFirst } from './sellFirst'
import {
  overworker,
  presaleMax,
  priceAware,
  validateThenBuild,
  validateThenBuildEarlyHire,
  validateThenBuildHire,
  TEAM_VARIANTS,
  teamVariant,
} from './validateThenBuild'

export const STRATEGIES: Strategy[] = [
  random,
  buildOnly,
  sellFirst,
  validateThenBuild,
  validateThenBuildHire,
  validateThenBuildEarlyHire,
  presaleMax,
  priceAware,
  overworker,
  playtest,
  // Long mode only.
  ...TEAM_VARIANTS.map((v) => teamVariant(v.id)),
]
