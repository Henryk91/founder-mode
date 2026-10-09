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
