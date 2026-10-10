import { spawn, type ChildProcess } from 'node:child_process'
import { resolve } from 'node:path'
import { loadScenario, type Scenario, type ScenarioId } from '@founder-mode/content'
import { runGame, type RunResult } from './simulate'
import { strategyOf, type StrategySpec } from './specs'

/** One strategy on a range of seeds, `from` included, `to` not. */
export type Job = {
  id: number
  scenarioId: ScenarioId
  spec: StrategySpec
  seedPrefix: string
  from: number
  to: number
}
export type JobDone = { id: number; results: RunResult[]; seconds: number }

/** One strategy on seeds 0 to runs - 1. */
export type Task = { scenarioId: ScenarioId; spec: StrategySpec; seedPrefix: string; runs: number }
/** `seconds` adds up the time of every chunk, so it reads as if one process played every seed. */
export type TaskDone = { results: RunResult[]; seconds: number }

/** Seeds per job: small enough to share the work out evenly. */
const CHUNK = 250

/**
 * Plays every task, split into chunks of seeds over `processes` child processes. Each run depends
 * only on its scenario, strategy and seed, so the results are the same as playing in one process.
 * With one process everything runs here, without children.
 */
export async function runTasks(
  tasks: readonly Task[],
  processes: number,
  onTaskDone?: (task: Task, done: TaskDone) => void,
): Promise<TaskDone[]> {
  const done: TaskDone[] = tasks.map(() => ({ results: [], seconds: 0 }))
  const jobs: (Job & { task: number })[] = tasks.flatMap((t, task) =>
    Array.from({ length: Math.ceil(t.runs / CHUNK) }, (_, c) => ({
      id: 0,
      task,
      scenarioId: t.scenarioId,
      spec: t.spec,
      seedPrefix: t.seedPrefix,
      from: c * CHUNK,
      to: Math.min(t.runs, (c + 1) * CHUNK),
    })),
  )
  jobs.forEach((j, i) => (j.id = i))

  // Chunks of one task may finish in any order; keep them sorted by seed.
  const byTask = tasks.map(() => new Map<number, JobDone>())
  const settle = (job: Job & { task: number }, result: JobDone) => {
    const chunks = byTask[job.task]!
    chunks.set(job.from, result)
    if (chunks.size < Math.ceil(tasks[job.task]!.runs / CHUNK)) return
    for (const [, r] of [...chunks.entries()].sort((a, b) => a[0] - b[0])) {
      done[job.task]!.results.push(...r.results)
      done[job.task]!.seconds += r.seconds
    }
    onTaskDone?.(tasks[job.task]!, done[job.task]!)
  }

  if (processes <= 1) {
    const scenarios = new Map<string, Scenario>()
    for (const job of jobs) {
      const scenario = scenarios.get(job.scenarioId) ?? loadScenario(job.scenarioId)
      scenarios.set(job.scenarioId, scenario)
      const strategy = strategyOf(job.spec)
      const start = performance.now()
      const results = []
      for (let i = job.from; i < job.to; i++)
        results.push(runGame(scenario, strategy, `${job.seedPrefix}-${i}`))
      settle(job, { id: job.id, results, seconds: (performance.now() - start) / 1000 })
    }
    return done
  }

  const viteNode = resolve(import.meta.dirname, '../node_modules/vite-node/vite-node.mjs')
  const worker = resolve(import.meta.dirname, 'worker.ts')
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(processes, jobs.length) }, () => {
      return new Promise<void>((resolveChild, reject) => {
        const child: ChildProcess = spawn(process.execPath, [viteNode, worker], {
          cwd: resolve(import.meta.dirname, '..'),
          stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
        })
        let current: (Job & { task: number }) | null = null
        const send = () => {
          current = jobs[next++] ?? null
          if (current) {
            child.send({ ...current, task: undefined })
          } else child.kill()
        }
        child.on('message', (m: JobDone | { ready: true }) => {
          if ('ready' in m) return send()
          if (current) settle(current, m)
          send()
        })
        child.on('exit', (code) =>
          current === null ? resolveChild() : reject(new Error(`Bot worker exited with ${code}`)),
        )
        child.on('error', reject)
      })
    }),
  )
  return done
}
