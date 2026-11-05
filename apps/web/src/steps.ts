export const NICE_STEPS = [100, 200, 500, 1000, 2500, 5000, 10_000, 25_000, 50_000, 100_000]
const nice = (target: number) => NICE_STEPS.filter((s) => s <= target).at(-1) ?? NICE_STEPS[0]!

/**
 * A small and a large step scaled to a price: about 3% and 15% of it, as round euro amounts, the
 * large one at least five small ones. A 2,800 EUR team day moves by 50 or 250, an 85 EUR hike
 * by 2 or 10.
 */
export function priceSteps(cents: number): { step: number; big: number } {
  const step = nice(cents * 0.03)
  const big = Math.max(
    nice(cents * 0.15),
    NICE_STEPS.find((s) => s >= step * 5)!,
  )
  return { step, big }
}
