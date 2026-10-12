import type { ChannelId, PlanIssue, PlayerView, WeekPlan } from '@founder-mode/engine'
import { useContext, useEffect, useRef } from 'react'
import { FounderNote } from '../components/FounderNote'
import {
  Choices,
  FeatureRow,
  HintLine,
  Market,
  Row,
  SubHeading,
  Writing,
} from '../components/Ruled'
import { Stepper } from '../components/Stepper'
import { TeamPlan } from '../components/TeamPlan'
import { formatEnergy, formatEuro } from '../format'
import { count, label, type LabelKey, type UiStage } from '../labels'
import type { PlanSection as SectionId } from '../store'
import { HoursBarOutOfView } from '../layout/hoursBar'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'
import plan from './Plan.module.css'

/** Largest value a stepper may take: the current value plus whatever hours are still free. */
function capFor(current: number, freeHours: number, hoursPerUnit: number, hardMax: number): number {
  return Math.min(hardMax, current + Math.floor(freeHours / hoursPerUnit))
}

const sum = (values: number[]) => values.reduce((a, b) => a + b, 0)

export type Activity = 'sales' | 'build' | 'learn' | 'admin' | 'rest'

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
  const members = view.team.members
  // Nothing under way in hiring: the line then names the freelancer alone, if there is one.
  const idle =
    !view.team.search &&
    p.searchRole === null &&
    view.team.candidates.length === 0 &&
    members.length === 0
  const team = view.team.search
    ? label('plan.sum.searching', stage, { week: view.team.search.readyWeek })
    : p.searchRole !== null
      ? label('plan.sum.search', stage, { role: label(`team.role.${p.searchRole}`, stage) })
      : view.team.candidates.length > 0
        ? count('plan.sum.candidates', stage, view.team.candidates.length)
        : members.length > 0
          ? label('plan.sum.member', stage, { name: members.map((m) => m.name).join(', ') })
          : view.team.hiresLeft === 0
            ? none
            : view.team.maxMembers > 1
              ? label('plan.sum.noHireTeam', stage, { n: view.team.maxMembers })
              : label('plan.sum.noHire', stage)
  const freelancer = view.team.freelance.current
  const freelanceLine = p.freelance.book
    ? label('plan.sum.freelanceBook', stage)
    : freelancer
      ? label('plan.sum.freelancer', stage, { name: freelancer.name })
      : null

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
    team: freelanceLine ? (idle ? freelanceLine : `${team}, ${freelanceLine}`) : team,
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
  // Elements, not components made here: a component defined during render is a new type each
  // time, so React would rebuild the open section on every tap and the browser lose its place.
  const bodies: Record<SectionId, React.JSX.Element> = {
    talk: <TalkBody free={free} />,
    test: <TestBody free={free} />,
    build: <BuildBody free={free} />,
    sell: <SellBody free={free} />,
    demos: <DemosBody free={free} />,
    team: <TeamPlan />,
    rest: <RestBody free={free} />,
  }

  return (
    <>
      <FounderNote />
      <PlanNotes />
      <PlanHeader>
        <div className={plan.sections}>
          {SECTIONS.map(({ id, title }) => {
            const isOpen = open.includes(id)
            if (id === 'demos' && !hasDemosSection(view, draft)) return null
            return (
              <section key={id} aria-label={label(title, stage)}>
                <button
                  type="button"
                  className={plan.sectionLine}
                  aria-expanded={isOpen}
                  aria-controls={`plan-${id}`}
                  onClick={() => toggle(id)}
                >
                  <span className={plan.arrow} aria-hidden="true">
                    <svg viewBox="0 0 14 14" className={isOpen ? plan.arrowOpen : undefined}>
                      <path d="M3.5 1.5 12 7l-8.5 5.5z" />
                    </svg>
                  </span>
                  <span className={plan.sectionTitle}>{label(title, stage)}</span>
                  <span className={plan.summary}>{lines[id]}</span>
                  {hours[id] > 0 && (
                    <span className={`${plan.mono} ${plan.sectionHours}`}>
                      {label('unit.hours', stage, { n: hours[id] })}
                    </span>
                  )}
                </button>
                {isOpen && (
                  <div id={`plan-${id}`} className={plan.body}>
                    {bodies[id]}
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

export const ACTIVITIES: { id: Activity; key: LabelKey }[] = [
  { id: 'sales', key: 'plan.act.sales' },
  { id: 'build', key: 'plan.act.build' },
  { id: 'learn', key: 'plan.act.learn' },
  { id: 'admin', key: 'plan.act.admin' },
  { id: 'rest', key: 'plan.act.rest' },
]

/** Warnings, problems and what is already booked: sentences belong off the ruled paper. */
function PlanNotes() {
  const view = useGame((s) => s.view)
  const issues = useGame((s) => s.issues)
  if (!view) return null
  const stage = view.company.uiStage
  const { founder } = view
  const notes: { key: string; text: string; alert?: boolean; warn?: boolean }[] = []
  if (founder.energy === 0) {
    notes.push({
      key: 'zero',
      warn: true,
      text: count('plan.energyZero', stage, founder.burnoutWeeks - founder.weeksAtZeroEnergy),
    })
  } else if (founder.energy < founder.lowEnergyBelow) {
    notes.push({
      key: 'low',
      warn: true,
      text: label('plan.energyLow', stage, { low: founder.lowEnergyBelow }),
    })
  }
  if (view.forcedHours > 0) {
    notes.push({
      key: 'forced',
      warn: true,
      text: label('plan.forced', stage, {
        hours: label('unit.hours', stage, { n: view.forcedHours }),
      }),
    })
  }
  if (view.committedHours > 0) {
    notes.push({
      key: 'committed',
      text: label('plan.committed', stage, {
        hours: label('unit.hours', stage, { n: view.committedHours }),
      }),
    })
  }
  for (const issue of issues) {
    notes.push({
      key: issue.code + JSON.stringify(issue),
      warn: true,
      alert: true,
      text: issueText(issue.code, stage, founder.maxHoursPerWeek),
    })
  }
  if (notes.length === 0) return null
  return (
    <section className={styles.card}>
      {notes.map((n) => (
        <p
          key={n.key}
          className={n.warn ? styles.warn : styles.hint}
          {...(n.alert ? { role: 'alert' } : {})}
        >
          {n.text}
        </p>
      ))}
    </section>
  )
}

/** "My week": title, hours, the hours bar, energy, and the sections inside the notebook. */
function PlanHeader({ children }: { children?: React.ReactNode }) {
  const view = useGame((s) => s.view)
  const draft = useGame((s) => s.plan)
  const planned = useGame((s) => s.plannedHours)
  const canRepeat = useGame((s) => s.canRepeat)
  const repeat = useGame((s) => s.repeatLastWeek)
  const barRow = useRef<HTMLDivElement>(null)
  useHoursBarWatch(barRow)
  if (!view) return null
  const stage = view.company.uiStage
  const { founder } = view
  const base = founder.baseHoursPerWeek
  const over = planned > base
  const byActivity = hoursByActivity(view, draft, planned)
  const scale = Math.max(base, planned)
  const unplanned = Math.max(0, base - planned)
  const lowEnergy = founder.energy < founder.lowEnergyBelow
  // The hours bar has no text of its own, so it says in words what it shows.
  const barText = [
    ...ACTIVITIES.filter(({ id }) => byActivity[id] > 0).map(
      ({ id, key }) => `${label(key, stage)} ${label('unit.hours', stage, { n: byActivity[id] })}`,
    ),
    `${label('plan.act.free', stage)} ${label('unit.hours', stage, { n: Math.max(0, founder.maxHoursPerWeek - planned) })}`,
  ].join(', ')

  return (
    <section className={plan.notebook} aria-label={label('plan.title', stage)}>
      <div className={plan.line}>
        <h2 className={plan.title}>{label('plan.title', stage)}</h2>
        <span className={`${plan.mono} ${plan.right} ${over ? plan.warnText : ''}`}>
          {label('plan.hours', stage, { planned, base })}
          <span className={plan.suffix}>{label('plan.hours.planned', stage)}</span>
        </span>
      </div>
      <div className={plan.barRow} ref={barRow}>
        <div
          className={`${plan.bar} ${over ? plan.barOver : ''} ${planned === 0 ? plan.barEmpty : ''}`}
          role="img"
          aria-label={barText}
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
      </div>
      <div className={plan.line}>
        <span className={`${plan.label} ${lowEnergy ? plan.warnText : ''}`}>
          {label('plan.energy', stage, {
            energy: formatEnergy(founder.energy),
            max: founder.maxEnergy,
          })}
        </span>
        {canRepeat && (
          <button type="button" className={`${styles.chip} ${plan.right}`} onClick={repeat}>
            {label('plan.repeat', stage)}
          </button>
        )}
      </div>
      {children}
    </section>
  )
}

/**
 * On the phone, tells the layout whether the hours bar has scrolled up out of view, so the band
 * under the top bar can show the hours instead. A bar still below the screen has not been passed.
 */
function useHoursBarWatch(target: React.RefObject<HTMLElement | null>) {
  const report = useContext(HoursBarOutOfView)
  useEffect(() => {
    const el = target.current
    if (!report || !el || typeof IntersectionObserver === 'undefined') return
    const watch = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return
        const top = entry.rootBounds?.top ?? 0
        report(!entry.isIntersecting && entry.boundingClientRect.bottom <= top)
      },
      { root: el.closest('main') },
    )
    watch.observe(el)
    return () => {
      watch.disconnect()
      report(false)
    }
  }, [report, target])
}

function TalkBody({ free }: { free: number }) {
  const view = useGame((s) => s.view)!
  const interviews = useGame((s) => s.plan.interviews)
  const setInterviews = useGame((s) => s.setInterviews)
  const stage = view.company.uiStage
  const { costs } = view
  return (
    <>
      {view.segments.map((seg) => {
        const value = interviews[seg.id] ?? 0
        return (
          <Row key={seg.id} label={seg.name}>
            <Stepper
              stage={stage}
              value={value}
              what={label('stepper.what.interviews', stage, { segment: seg.name })}
              max={capFor(value, free, costs.interviewHours, 20)}
              onChange={(n) => setInterviews(seg.id, n)}
            />
          </Row>
        )
      })}
      <HintLine
        term="talk"
        hint={label('plan.hint.talk', stage, {
          hours: label('unit.hours', stage, { n: costs.interviewHours }),
        })}
      />
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
  const choices = [0, ...costs.landingBudgetsCents]
  return (
    <>
      <SubHeading>{label('plan.test.landing', stage)}</SubHeading>
      {free < costs.landingHours && view.segments.some((seg) => (landing[seg.id] ?? 0) === 0) && (
        <Writing>{label('noHours', stage)}</Writing>
      )}
      {view.segments.map((seg) => {
        const budget = landing[seg.id] ?? 0
        return (
          <Market
            key={seg.id}
            label={seg.name}
            choices={choices.map((cents) => {
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
          />
        )
      })}
      <SubHeading>{label('plan.test.presale', stage)}</SubHeading>
      {view.segments.map((seg) => {
        const batches = presales[seg.id] ?? 0
        return (
          <Row key={seg.id} label={seg.name}>
            <Stepper
              stage={stage}
              value={batches}
              what={label('stepper.what.presales', stage, { segment: seg.name })}
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
          </Row>
        )
      })}
      <HintLine term="test" hint={label('plan.hint.test', stage)} />
    </>
  )
}

/** Hours planned this week on a stepper: "+5 h", or nothing at zero, so it never reads as progress. */
function plannedText(hours: number, stage: UiStage): string {
  return hours > 0 ? label('plan.plannedHours', stage, { n: hours }) : ''
}

function BuildBody({ free }: { free: number }) {
  const view = useGame((s) => s.view)!
  const build = useGame((s) => s.plan.build)
  const bugFixHours = useGame((s) => s.plan.bugFixHours)
  const setBuild = useGame((s) => s.setBuild)
  const setBugFixHours = useGame((s) => s.setBugFixHours)
  const stage = view.company.uiStage
  const { product } = view
  const shipped = product.features.filter((f) => f.shipped)
  return (
    <>
      <Writing wrap>
        {product.bugs > 0
          ? count('plan.bugs', stage, product.bugs)
          : label('plan.bugs.none', stage)}
        {' · '}
        {label('market.quality', stage, { quality: product.quality })}
      </Writing>
      {product.features
        .filter((f) => !f.shipped)
        .map((f) => {
          const value = build[f.id] ?? 0
          return (
            <FeatureRow
              key={f.id}
              name={f.name}
              progressHours={f.progressHours}
              buildHours={f.buildHours}
              progressText={label('plan.progress', stage, {
                done: f.progressHours,
                total: f.buildHours,
              })}
              progressSpoken={label('plan.progressSpoken', stage, {
                done: f.progressHours,
                total: f.buildHours,
              })}
            >
              <Stepper
                stage={stage}
                value={value}
                what={label('stepper.what.build', stage, { feature: f.name })}
                display={plannedText(value, stage)}
                hoursValue
                step={5}
                max={Math.min(f.remainingHours, value + free)}
                onChange={(n) => setBuild(f.id, n)}
              />
            </FeatureRow>
          )
        })}
      {shipped.length > 0 && (
        <Writing wrap>
          {label('plan.shippedList', stage, {
            n: shipped.length,
            names: shipped.map((f) => f.name).join(', '),
          })}
        </Writing>
      )}
      {product.bugs > 0 && (
        <Row label={label('plan.section.fix', stage)}>
          <Stepper
            stage={stage}
            value={bugFixHours}
            what={label('stepper.what.fix', stage)}
            display={plannedText(bugFixHours, stage)}
            hoursValue
            max={Math.min(product.fixableHours, bugFixHours + free)}
            onChange={setBugFixHours}
          />
        </Row>
      )}
      <HintLine term="build" hint={label('plan.hint.build', stage)} />
    </>
  )
}

function SellBody({ free }: { free: number }) {
  const view = useGame((s) => s.view)!
  const outreach = useGame((s) => s.plan.outreach)
  const setOutreach = useGame((s) => s.setOutreach)
  const stage = view.company.uiStage
  return (
    <>
      {view.segments.map((seg) => {
        const out = outreach[seg.id]
        const channel: ChannelId = out?.channel ?? seg.lastChannel ?? view.channels[0] ?? 'phone'
        const hours = out?.hours ?? 0
        return (
          <Market
            key={seg.id}
            label={seg.name}
            control={
              <Stepper
                stage={stage}
                value={hours}
                what={label('stepper.what.outreach', stage, { segment: seg.name })}
                max={hours + free}
                display={label('unit.hours', stage, { n: hours })}
                onChange={(n) => setOutreach(seg.id, channel, n)}
              />
            }
            choices={view.channels.map((c) => (
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
          />
        )
      })}
      <HintLine term="sell" hint={label('plan.hint.sell', stage)} />
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
      {wanting.length === 0 && <Writing>{label('plan.demos.noneWanted', stage)}</Writing>}
      {wanting.some((l) => !p.demos.includes(l.id)) && free < costs.demoHours && (
        <Writing>{label('noHours', stage)}</Writing>
      )}
      {wanting.map((l) => {
        const booked = p.demos.includes(l.id)
        const text = booked
          ? label('pipeline.unbookDemo', stage)
          : label('pipeline.bookDemo', stage, { hours: hours(costs.demoHours) })
        return (
          <Row key={l.id} label={l.name}>
            <button
              type="button"
              aria-pressed={booked}
              disabled={!booked && free < costs.demoHours}
              className={`${styles.chip} ${booked ? styles.chipOn : ''}`}
              aria-label={label('aria.forName', stage, { action: text, name: l.name })}
              onClick={() => toggleDemo(l.id)}
            >
              {text}
            </button>
          </Row>
        )
      })}
      {p.followUps.length > 0 && (
        <Writing>
          {count('plan.followUps.booked', stage, p.followUps.length, {
            hours: hours(p.followUps.length * costs.followUpHours),
          })}
        </Writing>
      )}
      {p.chase.length > 0 && (
        <Writing>
          {count('plan.chase.booked', stage, p.chase.length, {
            hours: hours(p.chase.length * costs.chaseHours),
          })}
        </Writing>
      )}
      <Choices>
        <button type="button" className={styles.chip} onClick={() => setTab('pipeline')}>
          {label('plan.demos.toPipeline', stage, { tab: label('tab.pipeline', stage) })}
        </button>
      </Choices>
      {view.invoices.some((i) => i.canChase) && (
        <Choices>
          <button type="button" className={styles.chip} onClick={() => setTab('money')}>
            {label('plan.demos.toMoney', stage, { tab: label('tab.money', stage) })}
          </button>
        </Choices>
      )}
      <HintLine term="demos" hint={label('plan.hint.demos', stage)} />
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
      <Row label={label('plan.rest', stage)}>
        <Stepper
          stage={stage}
          value={restHours}
          what={label('stepper.what.rest', stage)}
          max={restHours + free}
          display={label('unit.hours', stage, { n: restHours })}
          onChange={setRestHours}
        />
      </Row>
      <HintLine term="rest" hint={label('plan.hint.rest', stage)} />
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
