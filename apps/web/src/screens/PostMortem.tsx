import { useState } from 'react'
import type {
  HireEconomicsView,
  Activity,
  ChainItem,
  ChannelId,
  LuckItem,
  MarketTruth,
  Misread,
  PlayerView,
  PostMortem as PostMortemData,
  UiStage,
} from '@founder-mode/engine'
import { StorageNote } from '../components/StorageNote'
import { formatEuro } from '../format'
import { count, label } from '../labels'
import { useGame } from '../useGame'
import styles from './PostMortem.module.css'
import ui from '../components/ui.module.css'

const ACTIVITIES: Activity[] = ['learning', 'building', 'selling', 'admin', 'rest']

/**
 * The end of a run: what ended it, one lesson, the truth about the markets next to the
 * evidence, misread signals, then hours, money and luck. Built from the post-mortem only, which
 * exists once the run has ended. On the phone, hours, money and luck open on tap.
 */
export function PostMortem({ desk }: { desk: boolean }) {
  const pm = useGame((s) => s.postMortem)
  const suggestion = useGame((s) => s.suggestion)
  const view = useGame((s) => s.view)
  const newRun = useGame((s) => s.newRun)
  const sameMarket = useGame((s) => s.sameMarketAgain)
  if (!pm || !view) return null
  const stage = view.company.uiStage
  const t = new Text(pm, stage, view)

  const happened = (
    <section className={`${ui.card} ${styles.paper}`} aria-labelledby="pm-happened">
      <h2 id="pm-happened" className={styles.head}>
        {label('pm.title', stage)}
      </h2>
      <p className={styles.cause}>{t.cause()}</p>
      <h3 className={styles.subhead}>{label('pm.heading.chain', stage)}</h3>
      <ol className={styles.chain}>
        {pm.chain.map((c, i) => (
          <li
            key={i}
            className={
              c.kind !== 'ending'
                ? undefined
                : c.ending === 'sustainable'
                  ? styles.chainWin
                  : styles.chainEnd
            }
          >
            <span className={`${ui.mono} ${styles.week}`}>
              {label('pm.chain.week', stage, { week: c.week })}
            </span>
            <span>{t.chain(c)}</span>
          </li>
        ))}
      </ol>
    </section>
  )

  const next = suggestion && (
    <section className={`${ui.card} ${ui.sticky} ${styles.note}`} aria-labelledby="pm-next">
      <h2 id="pm-next" className={styles.head}>
        {label('pm.heading.next', stage)}
      </h2>
      <p className={ui.handText}>{label(`pm.next.${suggestion}`, stage)}</p>
    </section>
  )

  const markets = (
    <section className={`${ui.card} ${styles.paper}`} aria-labelledby="pm-markets">
      <h2 id="pm-markets" className={styles.head}>
        {label('pm.heading.markets', stage)}
      </h2>
      {pm.markets.map((m) => (
        <MarketCard
          key={m.segmentId}
          m={m}
          t={t}
          stage={stage}
          walkIns={pm.walkIns.filter((w) => w.segmentId === m.segmentId)}
          weakLanding={pm.notes.weakLanding}
        />
      ))}
    </section>
  )

  const misreads = (
    <section className={`${ui.card} ${styles.paper}`} aria-labelledby="pm-misreads">
      <h2 id="pm-misreads" className={styles.head}>
        {label('pm.heading.misreads', stage)}
      </h2>
      {pm.misreads.length === 0 ? (
        <p>{label('pm.misread.none', stage)}</p>
      ) : (
        <ul className={styles.lines}>
          {pm.misreads.map((m, i) => (
            <li key={i}>{t.misread(m)}</li>
          ))}
        </ul>
      )}
    </section>
  )

  const total = pm.hours.total
  const share = (a: Activity) =>
    total > 0 ? Math.round((100 * pm.hours.byActivity[a]) / total) : 0
  const topActivity = [...ACTIVITIES].sort(
    (a, b) => pm.hours.byActivity[b] - pm.hours.byActivity[a],
  )[0]!
  const hours = (
    <Fold
      id="pm-hours"
      desk={desk}
      stage={stage}
      title={label('pm.heading.hours', stage)}
      summary={label('pm.hours.summary', stage, {
        total,
        activity: label(`pm.activity.${topActivity}`, stage).toLowerCase(),
      })}
    >
      <div className={styles.hoursBar} aria-hidden="true">
        {ACTIVITIES.map((a) =>
          share(a) > 0 ? (
            <span key={a} className={styles[`act_${a}`]} style={{ flexGrow: share(a) }} />
          ) : null,
        )}
      </div>
      <ul className={styles.shares}>
        {ACTIVITIES.map((a) => (
          <li key={a}>
            <span className={`${styles.swatch} ${styles[`act_${a}`]}`} aria-hidden="true" />
            {label('pm.hours.share', stage, {
              activity: label(`pm.activity.${a}`, stage),
              percent: share(a),
            })}
          </li>
        ))}
      </ul>
      <p>
        {pm.hours.weeksOverBase > 0
          ? count('pm.hours.over', stage, pm.hours.weeksOverBase, {
              base: pm.hours.baseHoursPerWeek,
            })
          : label('pm.hours.overNone', stage, { base: pm.hours.baseHoursPerWeek })}
      </p>
      {pm.hours.focusSegmentId && pm.hours.focusSellingHours > 0 && (
        <p>
          {label('pm.hours.focus', stage, {
            hours: pm.hours.focusSellingHours,
            segment: t.segment(pm.hours.focusSegmentId),
          })}
        </p>
      )}
      <p>{label('pm.sources.title', stage)}</p>
      {pm.sources.some((x) => x.customers > 0) ? (
        <ul className={styles.lines}>
          {pm.sources.map((x) => (
            <li key={x.key}>
              {label('pm.sources.item', stage, {
                source: sourceName(x.key, stage),
                customers: x.customers,
                leads: x.leads,
              })}
            </li>
          ))}
        </ul>
      ) : (
        <p>{label('pm.sources.none', stage)}</p>
      )}
    </Fold>
  )

  const money = pm.money
  const moved = money.movedByYouCents + money.movedAutomaticallyCents
  const moneyFold = (
    <Fold
      id="pm-money"
      desk={desk}
      stage={stage}
      title={label('pm.heading.money', stage)}
      summary={
        money.savingsEmptyWeek !== null
          ? label('pm.money.summaryEmpty', stage, {
              week: money.savingsEmptyWeek,
              paid: formatEuro(money.customersPaidCents),
            })
          : label('pm.money.summaryLeft', stage, {
              left: formatEuro(view.founder.savingsCents),
              paid: formatEuro(money.customersPaidCents),
            })
      }
    >
      <p>
        {label('pm.money.savings', stage, { start: formatEuro(money.savingsStartCents) })}{' '}
        {money.savingsEmptyWeek !== null
          ? label('pm.money.savingsEmpty', stage, {
              week: money.savingsEmptyWeek,
              living: formatEuro(money.livingFromSavingsCents),
            })
          : label('pm.money.savingsLeft', stage, {
              living: formatEuro(money.livingFromSavingsCents),
            })}
      </p>
      <p>
        {moved > 0
          ? label('pm.money.moved', stage, {
              total: formatEuro(moved),
              you: formatEuro(money.movedByYouCents),
              auto: formatEuro(money.movedAutomaticallyCents),
            })
          : label('pm.money.movedNone', stage)}
      </p>
      {money.companyPaidYouCents > 0 && (
        <p>{label('pm.money.draw', stage, { amount: formatEuro(money.companyPaidYouCents) })}</p>
      )}
      <p>
        {label('pm.money.paid', stage, {
          amount: formatEuro(money.customersPaidCents),
          peak: formatEuro(money.peakRevenueCents),
        })}
      </p>
      {money.hires.map((h, i) => (
        <p key={i}>{t.hire(h)}</p>
      ))}
      {money.freelance && <p>{t.freelance()}</p>}
    </Fold>
  )

  const luck = (
    <Fold
      id="pm-luck"
      desk={desk}
      stage={stage}
      title={label('pm.heading.luck', stage)}
      summary={t.luckVerdict()}
    >
      {pm.luck.items.length === 0 ? (
        <p>{label('pm.luck.nothing', stage)}</p>
      ) : (
        <ul className={styles.lines}>
          {pm.luck.items.map((l, i) => (
            <li key={i}>
              {t.luck(l)}{' '}
              {l.changedChoice && <strong>{label('pm.luck.changedChoice', stage)} </strong>}
              {Math.abs(l.customers) >= 0.5 && (
                <em>{label(l.customers > 0 ? 'pm.luck.helped' : 'pm.luck.hurt', stage)}</em>
              )}
            </li>
          ))}
        </ul>
      )}
      {desk && <p className={styles.verdict}>{t.luckVerdict()}</p>}
      {pm.luck.averageWouldChange !== null && <p>{t.luckCounterfactual()}</p>}
    </Fold>
  )

  const milestones = (
    <section className={`${ui.card} ${styles.paper}`} aria-labelledby="pm-milestones">
      <h2 id="pm-milestones" className={styles.head}>
        {label('pm.heading.milestones', stage)}
      </h2>
      {pm.milestones.length === 0 ? (
        <p>{label('pm.milestones.none', stage)}</p>
      ) : (
        <ul className={styles.milestones}>
          {pm.milestones.map((m) => (
            <li key={m.id}>{label('pm.milestones.item', stage, { week: m.week, name: m.name })}</li>
          ))}
        </ul>
      )}
    </section>
  )

  const actions = (
    <div className={styles.actions}>
      <StorageNote finished />
      <button type="button" className={`${ui.button} ${ui.primary}`} onClick={newRun}>
        {label('pm.newRun', stage)}
      </button>
      <button type="button" className={ui.button} onClick={sameMarket}>
        {label('pm.sameMarket', stage)}
      </button>
      <p className={styles.hint}>{label('pm.sameMarketHint', stage)}</p>
    </div>
  )

  return (
    <div className={styles.page} data-layout={desk ? 'desk' : 'phone'} data-stage={stage}>
      <header className={styles.bar}>
        <h1 className={styles.heading} tabIndex={-1} data-autofocus>
          <span className={styles.company}>{view.scenarioName}</span>
          <span className={styles.ending}>
            {label('pm.header', stage, {
              week: pm.week,
              ending: label(`pm.ending.${pm.ending}`, stage),
            })}
          </span>
        </h1>
      </header>
      <main className={desk ? styles.columns : styles.column}>
        {desk ? (
          <>
            <div className={styles.col}>
              {happened}
              {next}
              {markets}
            </div>
            <div className={styles.col}>
              {misreads}
              {hours}
              {moneyFold}
              {luck}
              {milestones}
              {actions}
            </div>
          </>
        ) : (
          <>
            {happened}
            {next}
            {markets}
            {misreads}
            {hours}
            {moneyFold}
            {luck}
            {milestones}
            {actions}
          </>
        )}
      </main>
    </div>
  )
}

/** The name of a post-mortem source key: `outreach:<channel>`, `team:<channel>`, or a source. */
export function sourceName(key: string, stage: UiStage): string {
  const [source, channel] = key.split(':')
  const ch = channel ? label(`channel.${channel as ChannelId}`, stage) : ''
  switch (source) {
    case 'outreach':
      return label('pm.source.outreach', stage, { channel: ch })
    case 'team':
      return label('pm.source.team', stage, { channel: ch.toLowerCase() })
    case 'freelancer':
      return label('pm.source.freelancer', stage, { channel: ch.toLowerCase() })
    case 'landing':
    case 'presale':
    case 'inbox':
    case 'walk_in':
    case 'referral':
      return label(`pm.source.${source}`, stage)
    default:
      return key
  }
}

/** A post-mortem section that is open on the desk, and a summary line that opens on tap on the phone. */
function Fold(props: {
  id: string
  desk: boolean
  stage: UiStage
  title: string
  summary: string
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const shown = props.desk || open
  return (
    <section className={`${ui.card} ${styles.paper}`} aria-labelledby={props.id}>
      <h2 id={props.id} className={styles.head}>
        {props.title}
      </h2>
      {!props.desk && (
        <button
          type="button"
          className={styles.fold}
          aria-expanded={open}
          aria-controls={`${props.id}-body`}
          onClick={() => setOpen(!open)}
        >
          <span className={styles.foldArrow} aria-hidden="true">
            {open ? '▾' : '▸'}
          </span>
          <span className={styles.foldText}>{props.summary}</span>
          <span className={styles.foldAction}>
            {label(open ? 'pm.close' : 'pm.open', props.stage)}
          </span>
        </button>
      )}
      {shown && (
        <div id={`${props.id}-body`} className={styles.body}>
          {props.children}
        </div>
      )}
    </section>
  )
}

function MarketCard({
  m,
  t,
  stage,
  walkIns,
  weakLanding,
}: {
  m: MarketTruth
  t: Text
  stage: UiStage
  walkIns: PostMortemData['walkIns']
  /** The scenario's line for a landing test whose signal is weak by design, or null. */
  weakLanding: string | null
}) {
  const rows: [string, string][] = [
    [label('pm.market.pain', stage), t.bucket(m.painBucketId)],
    [
      label('pm.market.said', stage),
      m.saidBucketId === null
        ? label('pm.market.notAsked', stage)
        : count('pm.market.saidValue', stage, m.interviews, { bucket: t.bucket(m.saidBucketId) }),
    ],
    [
      label('pm.market.landing', stage),
      m.landing
        ? label('pm.market.landingValue', stage, m.landing)
        : label('pm.market.notTried', stage),
    ],
    ...(m.landing && weakLanding
      ? [[label('pm.market.landingWeak', stage), weakLanding] as [string, string]]
      : []),
    [
      label('pm.market.presale', stage),
      m.presale
        ? label('pm.market.presaleValue', stage, {
            commits: m.presale.commits,
            prospects: m.presale.prospects,
            price: formatEuro(m.presale.priceCents),
          })
        : label('pm.market.notTried', stage),
    ],
    [
      label('pm.market.wtp', stage),
      label('pm.market.wtpValue', stage, {
        wtp: formatEuro(m.wtpCents),
        price: formatEuro(t.view.company.priceCentsPerMonth),
      }),
    ],
    ...(m.budgetHints
      ? [
          [
            label('pm.market.budgetHints', stage),
            count('pm.market.budgetHintsValue', stage, m.budgetHints.count, {
              amount: formatEuro(m.budgetHints.meanCents),
            }),
          ] as [string, string],
        ]
      : []),
    ...(m.priceNos.trials + m.priceNos.cancellations > 0
      ? [
          [
            label('pm.market.priceNos', stage),
            label('pm.market.priceNosValue', stage, {
              trials: m.priceNos.trials,
              cancellations: m.priceNos.cancellations,
            }),
          ] as [string, string],
        ]
      : []),
    [
      label('pm.market.customers', stage),
      m.customersWon > 0
        ? count('pm.market.customersValue', stage, m.customersWon, {
            prices: m.customerPricesCents.map(formatEuro).join(', '),
          })
        : label('pm.market.customersNone', stage),
    ],
  ]
  return (
    <article className={styles.market} aria-label={t.segment(m.segmentId)}>
      <h3 className={styles.marketHead}>
        <span>{t.segment(m.segmentId)}</span>
        <span className={styles[`role_${m.roleId}`] ?? styles.role}>
          {label(`pm.role.${m.roleId as 'viable' | 'mediocre' | 'trap'}`, stage)}
        </span>
      </h3>
      <dl className={styles.facts}>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
        {walkIns.map((w) => (
          <div key={w.place}>
            <dt>{label('pm.market.walkIns', stage)}</dt>
            <dd>
              {count('pm.market.walkInsValue', stage, w.leads, {
                place: w.place.toLowerCase(),
                customers: w.customers,
              })}
            </dd>
          </div>
        ))}
        <div>
          <dt>{label('pm.market.mustHave', stage)}</dt>
          <dd>
            <ul className={styles.features}>
              {m.mustHave.map((f) => (
                <li key={f.featureId}>
                  {label('pm.market.feature', stage, {
                    feature: t.feature(f.featureId),
                    mentions:
                      f.mentions === 0
                        ? label('pm.market.mentionsNone', stage)
                        : count('pm.market.mentions', stage, f.mentions),
                    shipped:
                      f.shippedWeek === null
                        ? label('pm.market.neverBuilt', stage)
                        : label('pm.market.shippedWeek', stage, { week: f.shippedWeek }),
                  })}
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </article>
  )
}

/** Turns post-mortem data into sentences from the label table. */
class Text {
  constructor(
    readonly pm: PostMortemData,
    readonly stage: UiStage,
    readonly view: PlayerView,
  ) {}

  segment = (id: string | null) => (id === null ? '' : (this.pm.names.segments[id] ?? id))
  feature = (id: string | null) => (id === null ? '' : (this.pm.names.features[id] ?? id))
  bucket = (id: string) => this.pm.names.buckets[id] ?? id

  cause(): string {
    const c = this.pm.cause
    const vars = {
      week: c.week,
      costs: formatEuro(c.monthlyCostsCents),
      without: formatEuro(c.monthlyCostsWithoutHireCents),
      peak: formatEuro(c.peakRevenueCents),
      revenue: formatEuro(c.revenueCents),
      // Every customer who left, those who stopped paying included; the cause names them apart.
      lost: c.customersLost + c.customersStoppedPaying,
      unpaid: c.customersStoppedPaying,
      won: c.customersWon,
      over: c.weeksOverBase,
      base: this.pm.hours.baseHoursPerWeek,
      percent: c.coveredPercent,
    }
    if (c.id === 'shut_down') {
      return c.runwayWeeks === null
        ? label('pm.cause.shut_down_flat', this.stage, vars)
        : label('pm.cause.shut_down', this.stage, {
            ...vars,
            runway: count('unit.weeks', this.stage, c.runwayWeeks),
          })
    }
    if (c.id === 'bankrupt_churn' && c.customersStoppedPaying > 0)
      return label('pm.cause.bankrupt_churn_unpaid', this.stage, vars)
    return label(`pm.cause.${c.id}`, this.stage, vars)
  }

  chain(c: ChainItem): string {
    const s = this.stage
    switch (c.kind) {
      case 'ending':
        return label(`pm.chain.ending.${c.ending ?? 'bankrupt'}`, s, {
          cash: formatEuro(c.cents ?? 0),
        })
      case 'feature_shipped':
        return label('pm.chain.feature_shipped', s, { feature: this.feature(c.featureId) })
      case 'energy_low':
        return label('pm.chain.energy_low', s, {
          low: this.view.founder.lowEnergyBelow,
        })
      case 'customer_lost':
      case 'lead_declined':
        if (c.overPrice)
          return label(`pm.chain.${c.kind}_price`, s, {
            name: c.name ?? '',
            customers: c.customers ?? 0,
            revenue: formatEuro(c.cents ?? 0),
          })
        return label(`pm.chain.${c.kind}`, s, {
          name: c.name ?? '',
          customers: c.customers ?? 0,
          revenue: formatEuro(c.cents ?? 0),
        })
      default:
        return label(`pm.chain.${c.kind}`, s, {
          name: c.name ?? '',
          customers: c.customers ?? 0,
          price: formatEuro(c.cents ?? 0),
          revenue: formatEuro(c.cents ?? 0),
          amount: formatEuro(c.cents ?? 0),
        })
    }
  }

  misread(m: Misread): string {
    const s = this.stage
    if (m.kind === 'went_against') {
      return label('pm.misread.went_against', s, {
        evidence: label(`pm.misread.evidence.${m.evidence}`, s),
        ranked: this.segment(m.rankedFirstSegmentId),
        hours: m.focusHours,
        focus: this.segment(m.focusSegmentId),
      })
    }
    if (m.kind === 'experiment') {
      return label(`pm.misread.experiment.${m.experiment}`, s, {
        segment: this.segment(m.segmentId),
        week: m.week,
        observed: m.observed,
        size: m.size,
        normal: m.normal,
      })
    }
    const vars = {
      segment: this.segment(m.segmentId),
      said: this.bucket(m.saidBucketId).toLowerCase(),
      pain: this.bucket(m.painBucketId).toLowerCase(),
    }
    const text =
      m.kind === 'interviews_high'
        ? label(`pm.misread.interviews_high.${m.cause}`, s, vars)
        : label('pm.misread.interviews_low.chance', s, vars)
    return m.interviewsNeeded === null
      ? text
      : `${text} ${label('pm.misread.interviewsNeeded', s, { n: m.interviewsNeeded })}`
  }

  luck(l: LuckItem): string {
    return label(`pm.luck.${l.kind}`, this.stage, {
      segment: this.segment(l.segmentId),
      observed: l.observed,
      tries: l.tries,
      expected: Math.round(l.expected),
    })
  }

  luckVerdict(): string {
    const n = Math.round(Math.abs(this.pm.luck.netCustomers))
    if (n < 1) return label('pm.luck.even', this.stage)
    return count(this.pm.luck.netCustomers < 0 ? 'pm.luck.against' : 'pm.luck.for', this.stage, n)
  }

  luckCounterfactual(): string {
    const change = this.pm.luck.averageWouldChange
    if (!change) return label('pm.luck.wouldNotChange', this.stage)
    return label(
      this.pm.ending === 'sustainable' ? 'pm.luck.wouldChange.win' : 'pm.luck.wouldChange.loss',
      this.stage,
    )
  }

  freelance(): string {
    const f = this.pm.money.freelance!
    const hours = (n: number) => label('unit.hours', this.stage, { n })
    const parts = [
      f.paid
        ? count('pm.money.freelance', this.stage, f.weeks, { cost: formatEuro(f.costCents) })
        : label('pm.money.freelanceUnpaid', this.stage, {
            cost: formatEuro(f.costCents),
            booked: hours(f.bookedHours),
            worked: hours(f.buildHours + f.outreachHours),
            own: formatEuro(f.ownHoursCents),
          }),
    ]
    if (f.roles.includes('developer')) {
      parts.push(
        label('pm.money.freelanceBuild', this.stage, {
          hours: label('unit.hours', this.stage, { n: f.buildHours }),
          bugs: f.extraBugs,
        }),
      )
    }
    if (f.roles.includes('salesperson')) {
      parts.push(
        label('pm.money.freelanceSales', this.stage, {
          leads: f.leadsFound,
          n: f.customersGained,
        }),
      )
    }
    return parts.join(' ')
  }

  hire(h: HireEconomicsView): string {
    const role = label(`team.role.${h.role}`, this.stage).toLowerCase()
    if (h.customersGained === 0 || h.costPerCustomerCents === null) {
      return label('pm.money.hireNone', this.stage, { role, cost: formatEuro(h.costCents) })
    }
    return label('pm.money.hire', this.stage, {
      role,
      cost: formatEuro(h.costCents),
      n: h.customersGained,
      per: formatEuro(h.costPerCustomerCents),
      value: formatEuro(h.lifetimeValueCents ?? 0),
    })
  }
}
