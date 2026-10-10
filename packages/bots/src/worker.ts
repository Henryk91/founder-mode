import { loadScenario, type Scenario } from '@founder-mode/content'
import type { Job, JobDone } from './pool'
import { runGame } from './simulate'
import { strategyOf } from './specs'

// A child of the pool: plays the seeds of each job it is sent and sends the results back.
const scenarios = new Map<string, Scenario>()

process.on('message', (job: Job) => {
  let scenario = scenarios.get(job.scenarioId)
  if (!scenario) {
    scenario = loadScenario(job.scenarioId)
    scenarios.set(job.scenarioId, scenario)
  }
  const strategy = strategyOf(job.spec)
  const start = performance.now()
  const results = []
  for (let i = job.from; i < job.to; i++) {
    results.push(runGame(scenario, strategy, `${job.seedPrefix}-${i}`))
  }
  const done: JobDone = { id: job.id, results, seconds: (performance.now() - start) / 1000 }
  process.send!(done)
})

process.send!({ ready: true })
