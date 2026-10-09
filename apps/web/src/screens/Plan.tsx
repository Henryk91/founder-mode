import type { ChannelId, PlanIssue, PlayerView, WeekPlan } from '@founder-mode/engine'
import { ExplainButton } from '../components/Explain'
import { FounderNote } from '../components/FounderNote'
import { Stepper } from '../components/Stepper'
import { TeamPlan } from '../components/TeamPlan'
import { formatEnergy, formatEuro } from '../format'
import { count, label, type LabelKey, type UiStage } from '../labels'
import type { PlanSection as SectionId } from '../store'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'
import plan from './Plan.module.css'

/** Largest value a stepper may take: the current value plus whatever hours are still free. */
function capFor(current: number, freeHours: number, hoursPerUnit: number, hardMax: number): number {
  return Math.min(hardMax, current + Math.floor(freeHours / hoursPerUnit))
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

type Activity = 'sales' | 'build' | 'learn' | 'admin' | 'rest'

/** Planned hours by activity, for the hours bar. Admin is everything else already booked. */
export function hoursByActivity(
  view: PlayerView,
  p: WeekPlan,
  planned: number,
): Record<Activity, number> {
  const { costs } = view
  const sales =
    sum(Object.values(p.outreach).map((o) => o.hours)) +
    p.demos.length * costs.demoHours +
    p.followUps.length * costs.followUpHours
  const build = sum(Object.values(p.build)) + p.bugFixHours
  const learn =
    sum(Object.values(p.interviews)) * costs.interviewHours +
    Object.values(p.landing).filter((b) => b > 0).length * costs.landingHours +
    sum(Object.values(p.presales)) * costs.presaleHoursPerBatch
  const rest = p.restHours
  return { sales, build, learn, rest, admin: Math.max(0, planned - sales - build - learn - rest) }
}

/** Hours each Plan section adds to the week. */
function sectionHours(view: PlayerView, p: WeekPlan): Record<SectionId, number> {
  const { costs } = view
  return {
    talk: sum(Object.values(p.interviews)) * costs.interviewHours,
    test:
      Object.values(p.landing).filter((b) => b > 0).length * costs.landingHours +
      sum(Object.values(p.presales)) * costs.presaleHoursPerBatch,
    build: sum(Object.values(p.build)) + p.bugFixHours,
    sell: sum(Object.values(p.outreach).map((o) => o.hours)),
    demos:
      p.demos.length * costs.demoHours +
      p.followUps.length * costs.followUpHours +
      p.chase.length * costs.chaseHours,
    team: p.searchRole === null ? 0 : costs.searchHours,
    rest: p.restHours,
  }
}

/** One line per section saying what is planned, so a closed section still tells the week. */
function summaries(view: PlayerView, p: WeekPlan, stage: UiStage): Record<SectionId, string> {
  const none = label('plan.sum.none', stage)
  const segment = (id: string) => view.segments.find((s) => s.id === id)?.name ?? id
  const list = (parts: string[]) => (parts.length > 0 ? parts.join(', ') : none)

  const interviews = sum(Object.values(p.interviews))
  const landing = Object.values(p.landing).filter((b) => b > 0).length
  const batches = sum(Object.values(p.presales))
  const features = view.product.features.filter((f) => (p.build[f.id] ?? 0) > 0).map((f) => f.name)
  const outreach = Object.entries(p.outreach)
    .filter(([, o]) => o.hours > 0)
    .map(([id, o]) =>
      label('plan.sum.outreach', stage, {
        channel: label(`channel.${o.channel}`, stage),
        segment: segment(id),
      }),
    )
  const member = view.team.member
  const team = view.team.search
    ? label('plan.sum.searching', stage, { week: view.team.search.readyWeek })
    : p.searchRole !== null
      ? label('plan.sum.search', stage, { role: label(`team.role.${p.searchRole}`, stage) })
      : view.team.candidates.length > 0
        ? count('plan.sum.candidates', stage, view.team.candidates.length)
        : member
          ? label('plan.sum.member', stage, { name: member.name })
          : view.team.hadHire
            ? none
            : label('plan.sum.noHire', stage)

  return {
    talk: interviews > 0 ? count('plan.sum.interviews', stage, interviews) : none,
    test: list([
      ...(landing > 0 ? [count('plan.sum.landing', stage, landing)] : []),
      ...(batches > 0 ? [count('plan.presale.batches', stage, batches)] : []),
    ]),
    build: list([...features, ...(p.bugFixHours > 0 ? [label('plan.sum.fixing', stage)] : [])]),
    sell: list(outreach),
    demos: list([
      ...(p.demos.length > 0 ? [count('plan.sum.demos', stage, p.demos.length)] : []),
      ...(p.followUps.length > 0 ? [count('plan.sum.followUps', stage, p.followUps.length)] : []),
      ...(p.chase.length > 0 ? [count('plan.sum.chase', stage, p.chase.length)] : []),
    ]),
    team,
    rest: p.restHours > 0 ? label('unit.hours', stage, { n: p.restHours }) : none,
  }
}

const SECTIONS: { id: SectionId; title: LabelKey }[] = [
  { id: 'talk', title: 'plan.section.talk' },
  { id: 'test', title: 'plan.section.test' },
  { id: 'build', title: 'plan.section.build' },
  { id: 'sell', title: 'plan.section.sell' },
  { id: 'demos', title: 'plan.section.demos' },
  { id: 'team', title: 'plan.section.team' },
  { id: 'rest', title: 'plan.section.rest' },
]

/**
 * The week planner: hours and energy on top, then one closed section per kind of work with a one
 * line summary. Sections open on tap, several at a time, and all start closed each week.
 */
export function Plan() {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan)
  const planned = useGame((s) => s.plannedHours)
  const open = useGame((s) => s.openSections)
  const toggle = useGame((s) => s.toggleSection)
  if (!view) return null
  const stage = view.company.uiStage
  const free = Math.max(0, view.founder.maxHoursPerWeek - planned)
  const hours = sectionHours(view, draft)
  const lines = summaries(view, draft, stage)
  const bodies: Record<SectionId, () => React.JSX.Element> = {
    talk: () => <TalkBody free={free} />,
    test: () => <TestBody free={free} />,
    build: () => <BuildBody free={free} />,
    sell: () => <SellBody free={free} />,
    demos: () => <DemosBody free={free} />,
    team: () => <TeamPlan />,
    rest: () => <RestBody free={free} />,
  }

  return (
    <>
      <FounderNote />
      <PlanHeader>
        <div className={plan.sections}>
          {SECTIONS.map(({ id, title }) => {
            const isOpen = open.includes(id)
            if (id === 'demos' && !hasDemosSection(view, draft)) return null
            const Body = bodies[id]
            return (
              <section key={id} className={plan.section} aria-label={label(title, stage)}>
                <button
                  type="button"
                  className={plan.sectionHead}
                  aria-expanded={isOpen}
                  aria-controls={`plan-${id}`}
                  onClick={() => toggle(id)}
                >
                  <span className={plan.chevron} aria-hidden="true">
                    {isOpen ? '▾' : '▸'}
                  </span>
                  <span className={plan.headText}>
                    <span className={plan.sectionTitle}>{label(title, stage)}</span>
                    <span className={plan.summary}>{lines[id]}</span>
                  </span>
                  <span className={plan.sectionHours}>
                    {hours[id] > 0 ? label('unit.hours', stage, { n: hours[id] }) : ''}
                  </span>
                </button>
                {isOpen && (
                  <div id={`plan-${id}`} className={plan.body}>
                    <Body />
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </PlanHeader>
    </>
  )
}

/** Demos, follow ups and chasing only matter once there is someone to demo, follow or chase. */
function hasDemosSection(view: PlayerView, p: WeekPlan): boolean {
  return (
    view.leads.some((l) => l.canBookDemo || l.canFollowUp) ||
    view.invoices.some((i) => i.canChase) ||
    p.demos.length + p.followUps.length + p.chase.length > 0
  )
}

const ACTIVITIES: { id: Activity; key: LabelKey }[] = [
  { id: 'sales', key: 'plan.act.sales' },
  { id: 'build', key: 'plan.act.build' },
  { id: 'learn', key: 'plan.act.learn' },
  { id: 'admin', key: 'plan.act.admin' },
  { id: 'rest', key: 'plan.act.rest' },
]

/** "My week": hours used and free, the hours bar by activity, energy, and what is already booked. */
function PlanHeader({ children }: { children?: React.ReactNode }) {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan)
  const planned = useGame((s) => s.plannedHours)
  const issues = useGame((s) => s.issues)
  const canRepeat = useGame((s) => s.canRepeat)
  const repeat = useGame((s) => s.repeatLastWeek)
  if (!view) return null
  const stage = view.company.uiStage
  const { founder } = view
  const base = founder.baseHoursPerWeek
  const over = planned > base
  const byActivity = hoursByActivity(view, draft, planned)
  const scale = Math.max(base, planned)
  const unplanned = Math.max(0, base - planned)

  return (
    <section className={plan.notebook} aria-label={label('plan.title', stage)}>
      <div className={plan.notebookHead}>
        <h2 className={plan.notebookTitle}>{label('plan.title', stage)}</h2>
        <span className={plan.notebookHours}>
          {label(over ? 'plan.hoursOver' : 'plan.hours', stage, { planned, base })}
          <ExplainButton term="hours" />
        </span>
      </div>
      <div
        className={`${plan.bar} ${over ? plan.barOver : ''} ${planned === 0 ? plan.barEmpty : ''}`}
        aria-hidden="true"
      >
        {ACTIVITIES.map(({ id, key }) =>
          byActivity[id] > 0 ? (
            <div
              key={id}
              className={`${plan.segment} ${plan[id]}`}
              style={{ width: `${(byActivity[id] / scale) * 100}%` }}
            >
              <span className={plan.segmentText}>
                {label(key, stage)} {label('unit.hours', stage, { n: byActivity[id] })}
              </span>
            </div>
          ) : null,
        )}
        {unplanned > 0 && (
          <div
            className={`${plan.segment} ${plan.free}`}
            style={{ width: `${(unplanned / scale) * 100}%` }}
          >
            {planned > 0 && (
              <span className={plan.segmentText}>{label('plan.act.free', stage)}</span>
            )}
          </div>
        )}
      </div>
      <p className={plan.legend}>
        {ACTIVITIES.filter(({ id }) => byActivity[id] > 0)
          .map(
            ({ id, key }) =>
              `${label(key, stage)} ${label('unit.hours', stage, { n: byActivity[id] })}`,
          )
          .join(' · ') || label('plan.sum.nothing', stage)}
        {' · '}
        {label('plan.hoursFree', stage, {
          n: Math.max(0, founder.maxHoursPerWeek - planned),
          base,
          max: founder.maxHoursPerWeek,
        })}
      </p>
      <div className={plan.energyRow}>
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
      {canRepeat && (
        <button type="button" className={styles.button} onClick={repeat}>
          {label('plan.repeat', stage)}
        </button>
      )}
      {children}
    </section>
  )
}

/** A label on the left and its control on the right, wrapping below on a narrow screen. */
function Line(props: { name: string; note?: string; children: React.ReactNode }) {
  return (
    <div className={plan.line}>
      <span className={plan.lineName}>
        {props.name}
        {props.note && <span className={styles.hint}> {props.note}</span>}
      </span>
      {props.children}
    </div>
  )
}

function TalkBody({ free }: { free: number }) {
  const view = useGame((s) => s.view)!
  const interviews = useGame((s) => s.plan.interviews)
  const setInterviews = useGame((s) => s.setInterviews)
  const stage = view.company.uiStage
  const { costs } = view
  return (
    <>
      <p className={styles.hint}>
        {label('plan.section.talkHint', stage, {
          hours: label('unit.hours', stage, { n: costs.interviewHours }),
        })}
      </p>
      {view.segments.map((seg) => {
        const value = interviews[seg.id] ?? 0
        return (
          <Line key={seg.id} name={seg.name}>
            <Stepper
              stage={stage}
              value={value}
              max={capFor(value, free, costs.interviewHours, 20)}
              onChange={(n) => setInterviews(seg.id, n)}
            />
          </Line>
        )
      })}
    </>
  )
}

function TestBody({ free }: { free: number }) {
  const view = useGame((s) => s.view)!
  const landing = useGame((s) => s.plan.landing)
  const presales = useGame((s) => s.plan.presales)
  const setLanding = useGame((s) => s.setLanding)
  const setPresales = useGame((s) => s.setPresales)
  const stage = view.company.uiStage
  const { costs } = view
  return (
    <>
      <p className={styles.hint}>
        {label('plan.section.testHint', stage, {
          hours: label('unit.hours', stage, { n: costs.landingHours }),
          weeks: count('unit.weeks', stage, costs.landingWeeks),
          presaleWeeks: count('unit.weeks', stage, costs.presaleWeeks),
          presale: label('unit.hours', stage, { n: costs.presaleHoursPerBatch }),
          size: costs.presaleBatchSize,
          refund: count('unit.weeks', stage, costs.presaleRefundWeeks),
          max: costs.presaleMaxBatches,
        })}
      </p>
      {view.segments.map((seg) => {
        const budget = landing[seg.id] ?? 0
        const batches = presales[seg.id] ?? 0
        return (
          <div key={seg.id} className={styles.row}>
            <span className={plan.lineName}>
              {label('plan.landing', stage, { segment: seg.name })}
            </span>
            <div className={styles.chips}>
              {[0, ...costs.landingBudgetsCents].map((cents) => {
                const on = budget === cents
                return (
                  <button
                    key={cents}
                    type="button"
                    aria-pressed={on}
                    disabled={!on && cents > 0 && budget === 0 && free < costs.landingHours}
                    className={`${styles.chip} ${on ? styles.chipOn : ''}`}
                    onClick={() => setLanding(seg.id, cents)}
                  >
                    {cents === 0 ? label('plan.landing.none', stage) : formatEuro(cents)}
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
            <Line
              name={label('plan.presale', stage, { segment: seg.name })}
              note={count('plan.presale.left', stage, seg.presaleBatchesLeft)}
            >
              <Stepper
                stage={stage}
                value={batches}
                max={Math.min(
                  seg.presaleBatchesLeft,
                  capFor(batches, free, costs.presaleHoursPerBatch, 10),
                )}
                display={
                  batches === 0
                    ? label('plan.presale.none', stage)
                    : count('plan.presale.batches', stage, batches)
                }
                onChange={(n) => setPresales(seg.id, n)}
              />
            </Line>
          </div>
        )
      })}
    </>
  )
}

function BuildBody({ free }: { free: number }) {
  const view = useGame((s) => s.view)!
  const build = useGame((s) => s.plan.build)
  const bugFixHours = useGame((s) => s.plan.bugFixHours)
  const setBuild = useGame((s) => s.setBuild)
  const setBugFixHours = useGame((s) => s.setBugFixHours)
  const stage = view.company.uiStage
  const { product, costs } = view
  const shipped = product.features.filter((f) => f.shipped)
  return (
    <>
      <p className={styles.hint}>{label('plan.section.buildHint', stage)}</p>
      <p className={styles.hint}>
        {product.bugs > 0
          ? count('plan.bugs', stage, product.bugs)
          : label('plan.bugs.none', stage)}
        {' · '}
        {label('market.quality', stage, { quality: product.quality })}
      </p>
      {product.features
        .filter((f) => !f.shipped)
        .map((f) => {
          const value = build[f.id] ?? 0
          return (
            <Line
              key={f.id}
              name={f.name}
              note={label('plan.featureProgress', stage, {
                done: f.progressHours + value,
                total: f.buildHours,
              })}
            >
              <Stepper
                stage={stage}
                value={value}
                step={5}
                max={Math.min(f.remainingHours, value + free)}
                onChange={(n) => setBuild(f.id, n)}
              />
            </Line>
          )
        })}
      {shipped.length > 0 && (
        <p className={styles.good}>
          {label('plan.shippedList', stage, { names: shipped.map((f) => f.name).join(', ') })}
        </p>
      )}
      {product.bugs > 0 && (
        <div className={styles.row}>
          <span className={plan.lineName}>{label('plan.section.fix', stage)}</span>
          <p className={styles.hint}>
            {label('plan.section.fixHint', stage, {
              hours: label('unit.hours', stage, { n: costs.fixHoursPerBug }),
            })}
          </p>
          <Stepper
            stage={stage}
            value={bugFixHours}
            max={Math.min(product.fixableHours, bugFixHours + free)}
            onChange={setBugFixHours}
          />
        </div>
      )}
    </>
  )
}

function SellBody({ free }: { free: number }) {
  const view = useGame((s) => s.view)!
  const outreach = useGame((s) => s.plan.outreach)
  const setOutreach = useGame((s) => s.setOutreach)
  const stage = view.company.uiStage
  const { costs } = view
  return (
    <>
      <p className={styles.hint}>
        {label('plan.section.sellHint', stage, {
          hours: label('unit.hours', stage, { n: costs.saturationHours }),
          weeks: count('unit.weeks', stage, costs.saturationWeeks),
        })}
      </p>
      {view.segments.map((seg) => {
        const out = outreach[seg.id]
        const channel: ChannelId = out?.channel ?? seg.lastChannel ?? view.channels[0] ?? 'phone'
        const hours = out?.hours ?? 0
        return (
          <div key={seg.id} className={styles.row}>
            <span className={plan.lineName}>{seg.name}</span>
            <div className={styles.chips}>
              {view.channels.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-pressed={c === channel}
                  className={`${styles.chip} ${c === channel ? styles.chipOn : ''}`}
                  onClick={() => setOutreach(seg.id, c, hours)}
                >
                  {label(`channel.${c}`, stage)}
                </button>
              ))}
            </div>
            <Stepper
              stage={stage}
              value={hours}
              bigStep={5}
              max={hours + free}
              display={label('unit.hours', stage, { n: hours })}
              onChange={(n) => setOutreach(seg.id, channel, n)}
            />
          </div>
        )
      })}
    </>
  )
}

/** Demos can be booked right here; follow ups and chasing live on their own tabs. */
function DemosBody({ free }: { free: number }) {
  const view = useGame((s) => s.view)!
  const p = useGame((s) => s.plan)
  const toggleDemo = useGame((s) => s.toggleDemo)
  const setTab = useGame((s) => s.setTab)
  const stage = view.company.uiStage
  const { costs } = view
  const hours = (n: number) => label('unit.hours', stage, { n })
  const wanting = view.leads.filter((l) => l.canBookDemo)
  return (
    <>
      <p className={styles.hint}>
        {label('plan.section.demosHint', stage, {
          hours: hours(costs.demoHours),
          weeks: count('unit.weeks', stage, costs.trialWeeks),
        })}
      </p>
      {wanting.length === 0 && <p>{label('plan.demos.noneWanted', stage)}</p>}
      {wanting.map((l) => {
        const booked = p.demos.includes(l.id)
        return (
          <Line key={l.id} name={l.name}>
            <button
              type="button"
              aria-pressed={booked}
              disabled={!booked && free < costs.demoHours}
              className={`${styles.button} ${booked ? styles.primary : ''}`}
              onClick={() => toggleDemo(l.id)}
            >
              {booked
                ? label('pipeline.unbookDemo', stage)
                : label('pipeline.bookDemo', stage, { hours: hours(costs.demoHours) })}
            </button>
          </Line>
        )
      })}
      {p.followUps.length > 0 && (
        <p>
          {count('plan.followUps.booked', stage, p.followUps.length, {
            hours: hours(p.followUps.length * costs.followUpHours),
          })}
        </p>
      )}
      {p.chase.length > 0 && (
        <p>
          {count('plan.chase.booked', stage, p.chase.length, {
            hours: hours(p.chase.length * costs.chaseHours),
          })}
        </p>
      )}
      <div className={styles.chips}>
        <button type="button" className={styles.button} onClick={() => setTab('pipeline')}>
          {label('plan.demos.toPipeline', stage, { tab: label('tab.pipeline', stage) })}
        </button>
        {view.invoices.some((i) => i.canChase) && (
          <button type="button" className={styles.button} onClick={() => setTab('money')}>
            {label('plan.demos.toMoney', stage, { tab: label('tab.money', stage) })}
          </button>
        )}
      </div>
    </>
  )
}

function RestBody({ free }: { free: number }) {
  const view = useGame((s) => s.view)!
  const restHours = useGame((s) => s.plan.restHours)
  const setRestHours = useGame((s) => s.setRestHours)
  const stage = view.company.uiStage
  return (
    <>
      <p className={styles.hint}>{label('plan.section.restHint', stage)}</p>
      <Stepper
        stage={stage}
        value={restHours}
        bigStep={5}
        max={restHours + free}
        display={label('unit.hours', stage, { n: restHours })}
        onChange={setRestHours}
      />
    </>
  )
}

function issueText(code: PlanIssue['code'], stage: UiStage, max: number): string {
  switch (code) {
    case 'too_many_hours':
    case 'transfer_exceeds_savings':
      return label(`plan.issue.${code}`, stage, { max })
    case 'presale_cap':
      return label(`plan.issue.${code}`, stage)
    default:
      return label('plan.issue.other', stage)
  }
}
