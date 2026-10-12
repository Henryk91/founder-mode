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
  fundingVariant,
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
  // Long mode with funding: the four raising bots (the update policies run in the funding part).
  ...['raise_on_traction', 'raise_early', 'raise_always', 'raise_late'].map(fundingVariant),
]
