import { spawn, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'
import { loadScenario, type GameMode, type Scenario, type ScenarioId } from '@founder-mode/content'
import { runGame, type RunResult } from './simulate'
import { strategyOf, type StrategySpec } from './specs'

/** One strategy on some seeds, by number (`<seedPrefix>-<n>`). */
export type Job = {
  id: number
  scenarioId: ScenarioId
  mode: GameMode
  spec: StrategySpec
  seedPrefix: string
  seeds: number[]
}
export type JobDone = { id: number; results: RunResult[]; seconds: number }

/**
 * One strategy on seeds 0 to runs - 1, or only on `seeds` when given (the results then follow
 * that list).
 */
export type Task = {
  scenarioId: ScenarioId
  mode: GameMode
  spec: StrategySpec
  seedPrefix: string
  runs: number
  seeds?: number[]
}

/** The seed numbers a task plays, in order. */
export const taskSeeds = (t: Task): number[] =>
  t.seeds ?? Array.from({ length: t.runs }, (_, i) => i)
/** `seconds` adds up the time of every chunk, so it reads as if one process played every seed. */
export type TaskDone = { results: RunResult[]; seconds: number }

/** Seeds per job: small enough to share the work out evenly. */
const CHUNK = 250

/**
 * Optional checkpoints (`BOT_CHECKPOINT_DIR`): every finished chunk is written there, keyed by
 * the source of the engine, content and bots and by the chunk itself, and a later run with the
 * same source reads it back instead of playing it again. For machines that stop long runs part
 * way (plan 7's VM). Timings of reused chunks are those of the run that played them.
 */
const CHECKPOINTS = process.env['BOT_CHECKPOINT_DIR'] || null

let sourceHashCache: string | null = null
/** A hash of every source file of the engine, content and bots packages. */
function sourceHash(): string {
  if (sourceHashCache) return sourceHashCache
  const hash = createHash('sha1')
  const root = resolve(import.meta.dirname, '../..')
  const walk = (dir: string) => {
    for (const name of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    )) {
      const path = join(dir, name.name)
      if (name.isDirectory()) walk(path)
      else {
        hash.update(path.slice(root.length))
        hash.update(readFileSync(path))
      }
    }
  }
  for (const pkg of ['engine', 'content', 'bots']) walk(join(root, pkg, 'src'))
  sourceHashCache = hash.digest('hex')
  return sourceHashCache
}

function checkpointPath(job: Job): string | null {
  if (!CHECKPOINTS) return null
  const key = createHash('sha1')
    .update(
      JSON.stringify([sourceHash(), job.scenarioId, job.mode, job.spec, job.seedPrefix, job.seeds]),
    )
    .digest('hex')
  return join(CHECKPOINTS, `${key}.json`)
}

function readCheckpoint(job: Job): JobDone | null {
  const path = checkpointPath(job)
  if (!path || !existsSync(path)) return null
  try {
    return { ...(JSON.parse(readFileSync(path, 'utf8')) as JobDone), id: job.id }
  } catch {
    return null
  }
}

function writeCheckpoint(job: Job, done: JobDone): void {
  const path = checkpointPath(job)
  if (!path) return
  mkdirSync(CHECKPOINTS!, { recursive: true })
  writeFileSync(`${path}.part`, JSON.stringify(done))
  renameSync(`${path}.part`, path)
}

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
  const settleLater: [Job & { task: number; at: number }, JobDone][] = []
  const chunks = (t: Task) => Math.ceil(taskSeeds(t).length / CHUNK)
  const jobs: (Job & { task: number; at: number })[] = tasks.flatMap((t, task) =>
    Array.from({ length: chunks(t) }, (_, c) => ({
      id: 0,
      task,
      at: c,
      scenarioId: t.scenarioId,
      mode: t.mode,
      spec: t.spec,
      seedPrefix: t.seedPrefix,
      seeds: taskSeeds(t).slice(c * CHUNK, (c + 1) * CHUNK),
    })),
  )
  jobs.forEach((j, i) => (j.id = i))
  // Chunks played before (checkpoints) settle first; only the others are played.
  const toPlay = jobs.filter((job) => {
    const saved = readCheckpoint(job)
    if (saved) settleLater.push([job, saved])
    return !saved
  })

  // Chunks of one task may finish in any order; keep them sorted by seed.
  const byTask = tasks.map(() => new Map<number, JobDone>())
  const settle = (job: Job & { task: number; at: number }, result: JobDone) => {
    const done_ = byTask[job.task]!
    done_.set(job.at, result)
    if (done_.size < chunks(tasks[job.task]!)) return
    for (const [, r] of [...done_.entries()].sort((a, b) => a[0] - b[0])) {
      done[job.task]!.results.push(...r.results)
      done[job.task]!.seconds += r.seconds
    }
    onTaskDone?.(tasks[job.task]!, done[job.task]!)
  }
  for (const [job, saved] of settleLater) settle(job, saved)
  const played = (job: Job & { task: number; at: number }, result: JobDone) => {
    writeCheckpoint(job, result)
    settle(job, result)
  }

  if (processes <= 1) {
    const scenarios = new Map<string, Scenario>()
    for (const job of toPlay) {
      const key = `${job.scenarioId}/${job.mode}`
      const scenario = scenarios.get(key) ?? loadScenario(job.scenarioId, job.mode)
      scenarios.set(key, scenario)
      const strategy = strategyOf(job.spec)
      const start = performance.now()
      const results = []
      for (const i of job.seeds) results.push(runGame(scenario, strategy, `${job.seedPrefix}-${i}`))
      played(job, { id: job.id, results, seconds: (performance.now() - start) / 1000 })
    }
    return done
  }

  const viteNode = resolve(import.meta.dirname, '../node_modules/vite-node/vite-node.mjs')
  const worker = resolve(import.meta.dirname, 'worker.ts')
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(processes, toPlay.length) }, () => {
      return new Promise<void>((resolveChild, reject) => {
        const child: ChildProcess = spawn(process.execPath, [viteNode, worker], {
          cwd: resolve(import.meta.dirname, '..'),
          stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
        })
        let current: (Job & { task: number; at: number }) | null = null
        const send = () => {
          current = toPlay[next++] ?? null
          if (current) {
            child.send({ ...current, task: undefined, at: undefined })
          } else child.kill()
        }
        child.on('message', (m: JobDone | { ready: true }) => {
          if ('ready' in m) return send()
          if (current) played(current, m)
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
