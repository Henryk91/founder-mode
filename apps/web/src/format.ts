// Number formatting for display. Locale handling belongs here, never in the engine.

const euro = new Intl.NumberFormat('en-IE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** Whole euros from integer cents. */
export function formatEuro(cents: number): string {
  return euro.format(Math.round(cents / 100))
}

/** Energy can be fractional (x.5). */
export function formatEnergy(energy: number): string {
  return String(Math.round(energy * 10) / 10)
}
