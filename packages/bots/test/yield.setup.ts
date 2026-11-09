import { afterEach } from 'vitest'

// Bot tests are long runs of synchronous code. Vitest only awaits microtasks between tests, so a
// file of them never lets the worker's timers and messages run; past 60 s vitest's RPC timer
// fires ("Timeout calling onTaskUpdate") although every test passed. Yield one macrotask after
// each test so the worker can answer.
afterEach(() => new Promise<void>((resolve) => setTimeout(resolve, 0)))
