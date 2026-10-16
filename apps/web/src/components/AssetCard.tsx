import type { AssetView, PlayerView } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { label, type Voice, voiceOf } from '../labels'
import { useGame } from '../useGame'
import { ASSET_DRAWINGS } from './sceneStages'
import styles from './ui.module.css'

// Plan 4 (docs/abroad-mechanics.md section 4): the asset card on the money tab. How the company
// has its boat, what it costs, what it can carry, its condition, the next haul-out, and the terms
// of the other options. Changes come through the inbox (the winter offer) or the purchase product.

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Apr to Nov", or a list where the months are not in one run. */
function monthSpan(months: number[]): string {
  const sorted = [...months].sort((a, b) => a - b)
  const run = sorted.every((m, i) => i === 0 || m === sorted[i - 1]! + 1)
  return run && sorted.length > 1
    ? `${MONTHS[sorted[0]! - 1]} to ${MONTHS[sorted.at(-1)! - 1]}`
    : sorted.map((m) => MONTHS[m - 1]).join(', ')
}

function Stat(props: { name: string; value: string }) {
  return (
    <div className={styles.rowHead}>
      <span>{props.name}</span>
      <span className={styles.mono}>{props.value}</span>
    </div>
  )
}

/** One line per option the scenario offers, in the scenario's terms. */
function terms(a: AssetView, stage: Voice): { option: string; text: string }[] {
  const out: { option: string; text: string }[] = []
  const t = a.terms
  if (t.share) {
    out.push({
      option: 'share',
      text: label(t.share.revenueShare > 0 ? 'asset.terms.manage' : 'asset.terms.share', stage, {
        pct: Math.round(t.share.capacity * 100),
        unit: formatEuro(t.share.unitCents),
        share: Math.round(t.share.revenueShare * 100),
      }),
    })
  }
  if (t.lease) {
    out.push({
      option: 'lease',
      text: label('asset.terms.lease', stage, {
        season: formatEuro(t.lease.seasonCents),
        months: monthSpan(t.lease.months),
        min: t.lease.minMonths,
        crew: formatEuro(t.lease.crewWeekCents),
      }),
    })
  }
  if (t.buy) {
    out.push({
      option: 'buy',
      text: label('asset.terms.buy', stage, {
        price: formatEuro(t.buy.priceCents),
        upkeep: formatEuro(t.buy.upkeepMonthlyCents),
        crew: formatEuro(t.buy.crewWeekCents),
      }),
    })
  }
  return out
}

/** The asset card, or nothing in a scenario without assets. */
export function AssetCard() {
  const view = useGame((s) => s.view)
  const assets = view?.bookings?.assets ?? []
  if (!view || assets.length === 0) return null
  return (
    <>
      {assets.map((a) => (
        <AssetSection key={a.id} view={view} asset={a} />
      ))}
    </>
  )
}

function AssetSection({ view, asset: a }: { view: PlayerView; asset: AssetView }) {
  const stage = voiceOf(view)
  const drawing = ASSET_DRAWINGS[a.id]
  const products = a.products
    .map((id) => view.bookings!.products.find((p) => p.id === id)?.name ?? id)
    .join(', ')
  const t = a.terms
  return (
    <section className={styles.card} aria-label={a.name}>
      <h2 className={styles.title}>{a.name}</h2>
      {drawing && (
        <svg
          viewBox="0 0 360 120"
          role="img"
          aria-label={label('asset.drawing', stage, { name: a.name })}
          style={{ width: '100%', height: 'auto', display: 'block' }}
          dangerouslySetInnerHTML={{ __html: drawing }}
        />
      )}
      <Stat name={label('asset.option', stage)} value={label(`asset.option.${a.option}`, stage)} />
      <p className={styles.hint}>{label('asset.products', stage, { products })}</p>
      {a.option === 'share' && t.share && (
        <Stat
          name={label('asset.capacity', stage)}
          value={label('asset.capacityShare', stage, { pct: Math.round(t.share.capacity * 100) })}
        />
      )}
      {a.option === 'share' && a.peakReleased !== null && (
        <Stat
          name={label('asset.peak', stage)}
          value={label(a.peakReleased ? 'asset.peak.yours' : 'asset.peak.owners', stage)}
        />
      )}
      {a.option === 'lease' && a.leaseMinUntil !== null && (
        <Stat
          name={label('asset.leaseMin', stage)}
          value={label('asset.week', stage, { week: a.leaseMinUntil })}
        />
      )}
      {a.option === 'buy' && (
        <>
          <Stat
            name={label('asset.condition', stage)}
            value={
              a.broken
                ? label('asset.broken', stage, { week: a.brokenUntil ?? view.week })
                : label('asset.working', stage)
            }
          />
          {a.nextHaulOut !== null && (
            <Stat
              name={label('asset.haulOut', stage)}
              value={label('asset.week', stage, { week: a.nextHaulOut })}
            />
          )}
          {a.valueCents !== null && (
            <Stat name={label('asset.value', stage)} value={formatEuro(a.valueCents)} />
          )}
          <Stat name={label('asset.breakdowns', stage)} value={String(a.breakdowns)} />
        </>
      )}
      {a.option !== 'none' && (
        <Stat name={label('asset.spent', stage)} value={formatEuro(a.costCents)} />
      )}
      <h3 className={styles.title}>{label('asset.options', stage)}</h3>
      <ul className={styles.list}>
        {terms(a, stage).map((x) => (
          <li key={x.option}>
            {x.option === a.option ? label('asset.current', stage, { text: x.text }) : x.text}
          </li>
        ))}
      </ul>
      <p className={styles.hint}>
        {label(t.buy ? 'asset.switch.buy' : 'asset.switch', stage, {
          product: view.bookings!.products.find((p) => p.id === a.buyProduct)?.name ?? '',
        })}
      </p>
    </section>
  )
}
