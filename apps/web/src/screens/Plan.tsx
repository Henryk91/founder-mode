import type { ChannelId, PlanIssue, PlayerView } from '@founder-mode/engine'
import { ExplainButton } from '../components/Explain'
import { FounderNote } from '../components/FounderNote'
import { Stepper } from '../components/Stepper'
import { formatEnergy, formatEuro } from '../format'
import { count, label, type UiStage } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

/** Largest value a stepper may take: the current value plus whatever hours are still free. */
function capFor(current: number, freeHours: number, hoursPerUnit: number, hardMax: number): number {
  return Math.min(hardMax, current + Math.floor(freeHours / hoursPerUnit))
}

export function Plan() {
  const view = useGame((s) => s.view)
  const plan = useGame((s) => s.plan)
  const planned = useGame((s) => s.plannedHours)
  const issues = useGame((s) => s.issues)
  const actions = {
    setInterviews: useGame((s) => s.setInterviews),
    setBuild: useGame((s) => s.setBuild),
    setBugFixHours: useGame((s) => s.setBugFixHours),
    setOutreach: useGame((s) => s.setOutreach),
    setRestHours: useGame((s) => s.setRestHours),
    setLanding: useGame((s) => s.setLanding),
    setPresales: useGame((s) => s.setPresales),
    setTab: useGame((s) => s.setTab),
  }
  if (!view) return null
  const stage = view.company.uiStage
  const { founder, costs, product } = view
  const free = Math.max(0, founder.maxHoursPerWeek - planned)
  const fillPercent = Math.min(100, (planned / founder.baseHoursPerWeek) * 100)
  const over = planned > founder.baseHoursPerWeek

  return (
    <>
      <FounderNote />
      <section className={styles.card} aria-label={label('plan.title', stage)}>
        <h2 className={styles.title}>{label('plan.title', stage)}</h2>
        <div className={styles.rowHead}>
          <span className={styles.mono}>
            {label(over ? 'plan.hoursOver' : 'plan.hours', stage, {
              planned,
              base: founder.baseHoursPerWeek,
            })}
          </span>
          <ExplainButton term="hours" />
        </div>
        <div className={styles.meter} aria-hidden="true">
          <div
            className={`${styles.meterFill} ${over ? styles.meterOver : ''}`}
            style={{ width: `${fillPercent}%` }}
          />
        </div>
        <p className={styles.hint}>
          {label('plan.hoursFree', stage, {
            n: free,
            base: founder.baseHoursPerWeek,
            max: founder.maxHoursPerWeek,
          })}
        </p>
        <div className={styles.rowHead}>
          <span>
            {label('plan.energy', stage, {
              energy: formatEnergy(founder.energy),
              max: founder.maxEnergy,
            })}
          </span>
          <ExplainButton term="energy" />
        </div>
        {founder.energy === 0 ? (
          <p className={styles.warn}>
            {count('plan.energyZero', stage, founder.burnoutWeeks - founder.weeksAtZeroEnergy)}
          </p>
        ) : (
          founder.energy < founder.lowEnergyBelow && (
            <p className={styles.warn}>
              {label('plan.energyLow', stage, { low: founder.lowEnergyBelow })}
            </p>
          )
        )}
        {view.forcedHours > 0 && (
          <p className={styles.warn}>
            {label('plan.forced', stage, {
              hours: label('unit.hours', stage, { n: view.forcedHours }),
            })}
          </p>
        )}
        {view.committedHours > 0 && (
          <p className={styles.hint}>
            {label('plan.committed', stage, {
              hours: label('unit.hours', stage, { n: view.committedHours }),
            })}
          </p>
        )}
        {issues.map((issue) => (
          <p key={issue.code + JSON.stringify(issue)} className={styles.warn} role="alert">
            {issueText(issue.code, stage, founder.maxHoursPerWeek)}
          </p>
        ))}
      </section>

      <section className={styles.card}>
        <h2 className={styles.title}>{label('plan.section.talk', stage)}</h2>
        <p className={styles.hint}>
          {label('plan.section.talkHint', stage, {
            hours: label('unit.hours', stage, { n: costs.interviewHours }),
          })}
        </p>
        {view.segments.map((seg) => {
          const value = plan.interviews[seg.id] ?? 0
          return (
            <div key={seg.id} className={styles.row}>
              <div className={styles.rowHead}>
                <span>{label('plan.interviews', stage, { segment: seg.name })}</span>
              </div>
              <Stepper
                stage={stage}
                value={value}
                max={capFor(value, free, costs.interviewHours, 20)}
                onChange={(n) => actions.setInterviews(seg.id, n)}
              />
            </div>
          )
        })}
      </section>

      <section className={styles.card}>
        <h2 className={styles.title}>{label('plan.section.test', stage)}</h2>
        <p className={styles.hint}>
          {label('plan.section.testHint', stage, {
            hours: label('unit.hours', stage, { n: costs.landingHours }),
            weeks: count('unit.weeks', stage, costs.landingWeeks),
            presaleWeeks: count('unit.weeks', stage, costs.presaleWeeks),
            presale: label('unit.hours', stage, { n: costs.presaleHoursPerBatch }),
            size: costs.presaleBatchSize,
          })}
        </p>
        {view.segments.map((seg) => {
          const budget = plan.landing[seg.id] ?? 0
          const batches = plan.presales[seg.id] ?? 0
          const options = costs.landingBudgetsCents
          return (
            <div key={seg.id} className={styles.row}>
              <div className={styles.rowHead}>
                <span>{label('plan.landing', stage, { segment: seg.name })}</span>
              </div>
              <div className={styles.chips}>
                <button
                  type="button"
                  aria-pressed={budget === 0}
                  className={`${styles.chip} ${budget === 0 ? styles.chipOn : ''}`}
                  onClick={() => actions.setLanding(seg.id, 0)}
                >
                  {label('plan.landing.none', stage)}
                </button>
                {options.map((cents) => {
                  const on = budget === cents
                  return (
                    <button
                      key={cents}
                      type="button"
                      aria-pressed={on}
                      disabled={!on && budget === 0 && free < costs.landingHours}
                      className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                      onClick={() => actions.setLanding(seg.id, cents)}
                    >
                      {formatEuro(cents)}
                    </button>
                  )
                })}
              </div>
              {budget > 0 && (
                <span className={styles.hint}>
                  {label('plan.landing.budget', stage, {
                    budget: formatEuro(budget),
                    visitors: Math.floor(budget / costs.landingVisitorCents),
                  })}
                </span>
              )}
              <div className={styles.rowHead}>
                <span>{label('plan.presale', stage, { segment: seg.name })}</span>
              </div>
              <span className={styles.hint}>
                {count('plan.presale.leads', stage, seg.openLeads, {
                  min: costs.presaleMinLeads,
                })}
              </span>
              <Stepper
                stage={stage}
                value={batches}
                max={Math.min(
                  Math.floor(seg.openLeads / costs.presaleMinLeads),
                  capFor(batches, free, costs.presaleHoursPerBatch, 10),
                )}
                display={
                  batches === 0
                    ? label('plan.presale.none', stage)
                    : count('plan.presale.batches', stage, batches)
                }
                onChange={(n) => actions.setPresales(seg.id, n)}
              />
            </div>
          )
        })}
      </section>
      <section className={styles.card}>
        <h2 className={styles.title}>{label('plan.section.build', stage)}</h2>
        <p className={styles.hint}>{label('plan.section.buildHint', stage)}</p>
        <p className={styles.hint}>
          {product.bugs > 0
            ? count('plan.bugs', stage, product.bugs)
            : label('plan.bugs.none', stage)}
          {' · '}
          {label('market.quality', stage, { quality: product.quality })}
        </p>
        {product.features.map((f) => {
          const value = plan.build[f.id] ?? 0
          return (
            <div key={f.id} className={styles.row}>
              <div className={styles.rowHead}>
                <span>{f.name}</span>
                <span className={styles.mono}>
                  {label('unit.hours', stage, { n: f.buildHours })}
                </span>
              </div>
              {f.shipped ? (
                <span className={styles.good}>{label('plan.featureShipped', stage)}</span>
              ) : (
                <>
                  <span className={styles.hint}>
                    {label('plan.featureProgress', stage, {
                      done: f.progressHours + value,
                      total: f.buildHours,
                    })}
                  </span>
                  <Stepper
                    stage={stage}
                    value={value}
                    step={5}
                    max={Math.min(f.remainingHours, value + free)}
                    onChange={(n) => actions.setBuild(f.id, n)}
                  />
                </>
              )}
            </div>
          )
        })}
      </section>

      {product.bugs > 0 && (
        <section className={styles.card}>
          <h2 className={styles.title}>{label('plan.section.fix', stage)}</h2>
          <p className={styles.hint}>
            {label('plan.section.fixHint', stage, {
              hours: label('unit.hours', stage, { n: costs.fixHoursPerBug }),
            })}
          </p>
          <Stepper
            stage={stage}
            value={plan.bugFixHours}
            max={Math.min(product.fixableHours, plan.bugFixHours + free)}
            onChange={actions.setBugFixHours}
          />
        </section>
      )}

      <section className={styles.card}>
        <h2 className={styles.title}>{label('plan.section.sell', stage)}</h2>
        <p className={styles.hint}>{label('plan.section.sellHint', stage)}</p>
        {view.segments.map((seg) => {
          const out = plan.outreach[seg.id]
          const channel: ChannelId = out?.channel ?? seg.lastChannel ?? view.channels[0] ?? 'phone'
          const hours = out?.hours ?? 0
          return (
            <div key={seg.id} className={styles.row}>
              <div className={styles.rowHead}>
                <span>{seg.name}</span>
              </div>
              <ChannelChips
                stage={stage}
                channels={view.channels}
                value={channel}
                onChange={(c) => actions.setOutreach(seg.id, c, hours)}
              />
              <span className={styles.hint}>
                {label('plan.outreachHours', stage, { segment: seg.name })}
              </span>
              <Stepper
                stage={stage}
                value={hours}
                step={1}
                bigStep={5}
                max={hours + free}
                onChange={(n) => actions.setOutreach(seg.id, channel, n)}
              />
            </div>
          )
        })}
      </section>

      <DemoSummary
        view={view}
        stage={stage}
        booked={plan.demos.length}
        onOpen={() => actions.setTab('pipeline')}
      />

      {(plan.chase.length > 0 || plan.searchRole !== null || plan.followUps.length > 0) && (
        <section className={styles.card}>
          <h2 className={styles.title}>{label('plan.team', stage)}</h2>
          {plan.searchRole !== null && (
            <p>
              {label('plan.teamSummary', stage, {
                role: label(`team.role.${plan.searchRole}`, stage),
                hours: label('unit.hours', stage, { n: costs.searchHours }),
              })}
            </p>
          )}
          {plan.followUps.length > 0 && (
            <p>
              {count('plan.followUps.booked', stage, plan.followUps.length, {
                hours: label('unit.hours', stage, {
                  n: plan.followUps.length * costs.followUpHours,
                }),
              })}
            </p>
          )}
          {plan.chase.length > 0 && (
            <p>
              {count('plan.chase.booked', stage, plan.chase.length, {
                hours: label('unit.hours', stage, { n: plan.chase.length * costs.chaseHours }),
              })}
            </p>
          )}
        </section>
      )}
      <section className={styles.card}>
        <h2 className={styles.title}>{label('plan.section.rest', stage)}</h2>
        <p className={styles.hint}>{label('plan.section.restHint', stage)}</p>
        <Stepper
          stage={stage}
          value={plan.restHours}
          bigStep={5}
          max={plan.restHours + free}
          onChange={actions.setRestHours}
        />
      </section>
    </>
  )
}

function ChannelChips(props: {
  stage: UiStage
  channels: ChannelId[]
  value: ChannelId
  onChange: (channel: ChannelId) => void
}) {
  return (
    <div className={styles.chips}>
      {props.channels.map((c) => (
        <button
          key={c}
          type="button"
          aria-pressed={c === props.value}
          className={`${styles.chip} ${c === props.value ? styles.chipOn : ''}`}
          onClick={() => props.onChange(c)}
        >
          {label(`channel.${c}`, props.stage)}
        </button>
      ))}
    </div>
  )
}

function DemoSummary(props: {
  view: PlayerView
  stage: UiStage
  booked: number
  onOpen: () => void
}) {
  const { view, stage, booked } = props
  return (
    <section className={styles.card}>
      <h2 className={styles.title}>{label('plan.section.demos', stage)}</h2>
      <p className={styles.hint}>
        {label('plan.section.demosHint', stage, {
          hours: label('unit.hours', stage, { n: view.costs.demoHours }),
          weeks: count('unit.weeks', stage, view.costs.trialWeeks),
        })}
      </p>
      <p>
        {booked === 0
          ? label('plan.demos.none', stage, { tab: label('tab.pipeline', stage) })
          : count('plan.demos.booked', stage, booked, {
              hours: label('unit.hours', stage, { n: booked * view.costs.demoHours }),
            })}
      </p>
      <button type="button" className={styles.button} onClick={props.onOpen}>
        {label('tab.pipeline', stage)}
      </button>
    </section>
  )
}

function issueText(code: PlanIssue['code'], stage: UiStage, max: number): string {
  switch (code) {
    case 'too_many_hours':
    case 'transfer_exceeds_savings':
      return label(`plan.issue.${code}`, stage, { max })
    case 'presale_needs_leads':
      return label(`plan.issue.${code}`, stage)
    default:
      return label('plan.issue.other', stage)
  }
}
