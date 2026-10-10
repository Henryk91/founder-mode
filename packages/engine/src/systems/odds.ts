import type { OddsEvent, OddsKind, SegmentId } from '../types'

/**
 * Collects chance outcomes of one week into one `OddsEvent` per kind, market and inbox event.
 * Only records what a roll already decided; it never rolls itself.
 */
export class OddsTally {
  private readonly rows = new Map<string, OddsEvent & { unitSum: number }>()

  constructor(private readonly week: number) {}

  /** One roll with chance `p`; `ok` is what it decided. */
  roll(odds: OddsKind, segmentId: SegmentId | null, p: number, ok: boolean, unitCents = 0): void {
    this.count(odds, segmentId, p, ok ? 1 : 0, unitCents)
  }

  /** A count with its expected value, e.g. leads found against the mean the chances gave. */
  count(
    odds: OddsKind,
    segmentId: SegmentId | null,
    expected: number,
    observed: number,
    unitCents = 0,
    eventId: string | null = null,
  ): void {
    const key = `${odds}/${segmentId ?? ''}/${eventId ?? ''}`
    const row = this.rows.get(key) ?? {
      kind: 'odds' as const,
      odds,
      week: this.week,
      segmentId,
      eventId,
      tries: 0,
      expected: 0,
      observed: 0,
      unitCents: 0,
      unitSum: 0,
    }
    row.tries++
    row.expected += expected
    row.observed += observed
    row.unitSum += unitCents
    this.rows.set(key, row)
  }

  events(): OddsEvent[] {
    return [...this.rows.values()].map(({ unitSum, ...row }) => ({
      ...row,
      unitCents: row.tries > 0 ? Math.round(unitSum / row.tries) : 0,
    }))
  }
}
