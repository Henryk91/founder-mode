/**
 * Margins of error for the targets: half the width of a 95% interval, in the unit of the value
 * (percentage points for rates and shares, weeks for medians of weeks). Normal approximations,
 * good enough at the report's run counts.
 */

const Z = 1.96

/** A share of `k` in `n`, in percentage points. */
export function rateMargin(k: number, n: number): number {
  if (n === 0) return 0
  const p = k / n
  return 100 * Z * Math.sqrt((p * (1 - p)) / n)
}

/**
 * The difference of two win rates measured on the same seeds, in percentage points. Each seed adds
 * -1, 0 or +1, so only seeds that flip count, and the spread of those per seed differences gives
 * the margin.
 */
export function pairedMargin(a: readonly boolean[], b: readonly boolean[]): number {
  const n = Math.min(a.length, b.length)
  if (n === 0) return 0
  let sum = 0
  let sumSq = 0
  for (let i = 0; i < n; i++) {
    const d = Number(b[i]) - Number(a[i])
    sum += d
    sumSq += d * d
  }
  const mean = sum / n
  const variance = Math.max(0, sumSq / n - mean * mean)
  return 100 * Z * Math.sqrt(variance / n)
}

/** The median of `values`, from the order statistics around the middle. */
export function medianMargin(values: readonly number[]): number {
  const n = values.length
  if (n < 2) return 0
  const s = [...values].sort((x, y) => x - y)
  const half = (Z * Math.sqrt(n)) / 2
  const lo = s[Math.max(0, Math.floor(n / 2 - half))] as number
  const hi = s[Math.min(n - 1, Math.ceil(n / 2 + half))] as number
  return (hi - lo) / 2
}

/**
 * A share summed over runs (`parts` of `wholes`, per run), in percentage points. Runs are the
 * independent unit, so customers or weeks of one run do not count as separate samples.
 */
export function ratioMargin(parts: readonly number[], wholes: readonly number[]): number {
  const total = wholes.reduce((a, b) => a + b, 0)
  if (total === 0) return 0
  const ratio = parts.reduce((a, b) => a + b, 0) / total
  let sq = 0
  parts.forEach((x, i) => {
    const r = x - ratio * (wholes[i] ?? 0)
    sq += r * r
  })
  return (100 * Z * Math.sqrt(sq)) / total
}

/** The margin of a difference of two independent estimates. */
export const combined = (...margins: number[]) => Math.sqrt(margins.reduce((t, m) => t + m * m, 0))

export const fmtMargin = (m: number, digits = 1) => `±${m.toFixed(digits)}`
