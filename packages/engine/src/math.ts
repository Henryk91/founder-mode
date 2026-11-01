// Pure arithmetic only (+, -, *, /), which IEEE 754 defines exactly. Math.exp is not
// specified to the last bit, so it could differ between browsers and break replays.

/** exp(-x) for x >= 0: Taylor series on x / 256, then squared 8 times. */
export function expNeg(x: number): number {
  if (!(x > 0)) return 1
  if (x > 60) return 0
  const z = x / 256
  let term = 1
  let sum = 1
  for (let n = 1; n <= 10; n++) {
    term = (term * -z) / n
    sum += term
  }
  for (let i = 0; i < 8; i++) sum *= sum
  return sum
}

const LN2 = 0.6931471805599453

/** ln(x) for x > 0: halve or double into [0.75, 1.5), then the atanh series. */
export function lnPos(x: number): number {
  if (!(x > 0)) return -Infinity
  let k = 0
  while (x >= 1.5) {
    x /= 2
    k++
  }
  while (x < 0.75) {
    x *= 2
    k--
  }
  const y = (x - 1) / (x + 1)
  const y2 = y * y
  let term = y
  let sum = 0
  for (let n = 1; n <= 39; n += 2) {
    sum += term / n
    term *= y2
  }
  return 2 * sum + k * LN2
}

/** base ^ power for base > 0, from expNeg and lnPos only. */
export function powPos(base: number, power: number): number {
  const x = power * lnPos(base)
  if (x <= 0) return expNeg(-x)
  const shrink = expNeg(x)
  return shrink === 0 ? Infinity : 1 / shrink
}
