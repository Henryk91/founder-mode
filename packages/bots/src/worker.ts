import { loadScenario, type Scenario } from '@founder-mode/content'
import type { Job, JobDone } from './pool'
import { runGame } from './simulate'
import { strategyOf } from './specs'

// A child of the pool: plays the seeds of each job it is sent and sends the results back.
const scenarios = new Map<string, Scenario>()

process.on('message', (job: Job) => {
  const key = `${job.scenarioId}/${job.mode}`
  let scenario = scenarios.get(key)
  if (!scenario) {
    scenario = loadScenario(job.scenarioId, job.mode)
    scenarios.set(key, scenario)
  }
  const strategy = strategyOf(job.spec)
  const start = performance.now()
  const results = []
  for (const i of job.seeds) results.push(runGame(scenario, strategy, `${job.seedPrefix}-${i}`))
  const done: JobDone = { id: job.id, results, seconds: (performance.now() - start) / 1000 }
  process.send!(done)
})

process.send!({ ready: true })
