import { describe } from 'vitest'
import { ledgerTests } from './ledgerInvariant.shared'

// Plan 8, step 1: the week ledger adds up (see ledgerInvariant.shared.ts).
describe('the week ledger adds up', () => ledgerTests('leinenlos'))
