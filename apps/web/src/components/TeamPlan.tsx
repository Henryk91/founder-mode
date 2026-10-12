import type {
  ChannelId,
  FreelancePlan,
  MemberView,
  PlayerView,
  TeamRoleId,
  TeamTask,
} from '@founder-mode/engine'
import { formatEuro } from '../format'
import { count, label, type UiStage } from '../labels'
import { useGame } from '../useGame'
import { Choices, HintLine, Market, SubHeading, Writing } from './Ruled'
import styles from './ui.module.css'

const roleName = (role: TeamRoleId, stage: UiStage) => label(`team.role.${role}`, stage)

/**
 * The hiring section of the Plan tab: search, meet candidates, make an offer, point each hire at
 * work, or let one go. One hire in the 60 week game, a small team in long mode. Below it the
 * freelancer: booked by the week, never a hire.
 */
export function TeamPlan() {
  const view = useGame((s) => s.view)
  const plan = useGame((s) => s.plan)
  const actions = {
    setSearchRole: useGame((s) => s.setSearchRole),
    setHire: useGame((s) => s.setHire),
    setLetGo: useGame((s) => s.setLetGo),
    setTeamTask: useGame((s) => s.setTeamTask),
  }
  const setFreelance = useGame((s) => s.setFreelance)
  if (!view) return null
  const stage = view.company.uiStage
  const { team, costs } = view
  const hours = (n: number) => label('unit.hours', stage, { n })
  return (
    <>
      {team.canSearch &&
        team.roles.map((r) => {
          const booked = plan.searchRole === r.id
          return (
            <Market
              key={r.id}
              label={roleName(r.id, stage)}
              note={label('team.perMonth', stage, { amount: formatEuro(r.monthlyCents) })}
              choices={chip(
                booked,
                booked
                  ? label('team.searchBooked', stage, { hours: hours(costs.searchHours) })
                  : label('team.search', stage, { role: roleName(r.id, stage) }),
                () => actions.setSearchRole(booked ? null : r.id),
              )}
            />
          )
        })}
      {team.candidates.length > 0 && team.canHire && (
        <>
          <SubHeading>{label('team.candidates', stage)}</SubHeading>
          {team.candidates.map((c) => {
            const booked = plan.hire === c.id
            const monthly = team.roles.find((r) => r.id === c.role)?.monthlyCents ?? 0
            return (
              <div key={c.id}>
                <Market
                  label={c.name}
                  note={label('team.perMonth', stage, { amount: formatEuro(monthly) })}
                  choices={chip(
                    booked,
                    booked ? label('team.offerBooked', stage) : label('team.offer', stage),
                    () => actions.setHire(booked ? null : c.id),
                  )}
                />
                <Writing>
                  {roleName(c.role, stage)} ·{' '}
                  {label('team.impression', stage, { impression: c.impression })}
                </Writing>
              </div>
            )
          })}
        </>
      )}
      {team.members.map((m) => (
        <MemberCard
          key={m.id}
          view={view}
          stage={stage}
          member={m}
          task={plan.teamTasks[m.id] ?? null}
          letGo={plan.letGo === m.id}
          actions={actions}
        />
      ))}
      <FreelancePlanRows view={view} stage={stage} draft={plan.freelance} set={setFreelance} />
      <HintLine
        term="hiring"
        hint={label(team.maxMembers > 1 ? 'plan.hint.hiringTeam' : 'plan.hint.hiring', stage)}
      />
    </>
  )
}

function MemberCard(props: {
  view: PlayerView
  stage: UiStage
  member: MemberView
  task: TeamTask | null
  letGo: boolean
  actions: {
    setLetGo: (memberId: string | null) => void
    setTeamTask: (memberId: string, task: TeamTask | null) => void
  }
}) {
  const { view, stage, member, task, actions } = props
  const setTask = (t: TeamTask | null) => actions.setTeamTask(member.id, t)
  const outreach = task?.kind === 'outreach' ? task : null
  return (
    <>
      <SubHeading>{label('team.member', stage, { role: roleName(member.role, stage) })}</SubHeading>
      <Market
        label={member.name}
        note={label('team.perMonth', stage, { amount: formatEuro(member.monthlyCents) })}
      />
      {member.managementHours > 0 && (
        <Writing>
          {label('team.manage', stage, {
            hours: label('unit.hours', stage, { n: member.managementHours }),
          })}
        </Writing>
      )}
      {member.working && member.role === 'developer' && (
        <>
          <Writing>{label('team.devWork', stage)}</Writing>
          <Choices>
            {chip(task === null, label('team.devNone', stage), () => setTask(null))}
            {view.product.features
              .filter((f) => !f.shipped)
              .map((f) =>
                chip(task?.kind === 'build' && task.featureId === f.id, f.name, () =>
                  setTask({ kind: 'build', featureId: f.id }),
                ),
              )}
          </Choices>
        </>
      )}
      {member.working && member.role === 'salesperson' && (
        <>
          <Writing>{label('team.salesWork', stage)}</Writing>
          <Choices>
            {chip(outreach === null, label('team.salesNone', stage), () => setTask(null))}
            {view.segments.map((seg) =>
              chip(outreach?.segmentId === seg.id, seg.name, () =>
                setTask({
                  kind: 'outreach',
                  segmentId: seg.id,
                  channel: seg.lastChannel ?? view.channels[0] ?? 'phone',
                }),
              ),
            )}
          </Choices>
          {outreach && (
            <Choices>
              {view.channels.map((c: ChannelId) =>
                chip(outreach.channel === c, label(`channel.${c}`, stage), () =>
                  setTask({ kind: 'outreach', segmentId: outreach.segmentId, channel: c }),
                ),
              )}
            </Choices>
          )}
        </>
      )}
      <Choices>
        {chip(
          props.letGo,
          props.letGo
            ? label('team.letGoBooked', stage)
            : label('team.letGo', stage, { cost: formatEuro(member.letGoCostCents) }),
          () => actions.setLetGo(props.letGo ? null : member.id),
        )}
      </Choices>
    </>
  )
}

/** A chip: a toggle as wide as its text, inside a 44 px tap target. */
function chip(on: boolean, text: string, onClick: () => void, aria?: string) {
  return (
    <button
      key={text}
      type="button"
      aria-pressed={on}
      aria-label={aria}
      className={`${styles.chip} ${on ? styles.chipOn : ''}`}
      onClick={onClick}
    >
      {text}
    </button>
  )
}

/**
 * The freelancer in the Hiring section: book a role and hours a week, or, once booked, give
 * them work, change their hours from next week, or give notice. Costs are shown per week, the
 * rules (output, the slow first week, extra bugs, no demos) as plain lines.
 */
function FreelancePlanRows(props: {
  view: PlayerView
  stage: UiStage
  draft: FreelancePlan
  set: (change: Partial<FreelancePlan>) => void
}) {
  const { view, stage, draft, set } = props
  const fl = view.team.freelance
  const current = fl.current
  const hours = (n: number) => label('unit.hours', stage, { n })
  const most = Math.max(...fl.hoursOptions)
  const working = current?.working ? current : null
  return (
    <>
      <SubHeading>
        {current
          ? label('freelance.yours', stage, {
              role: label(`freelance.role.${current.role}`, stage).toLowerCase(),
            })
          : label('freelance.title', stage)}
      </SubHeading>
      {current && (
        <>
          <Market
            label={current.name}
            note={label('freelance.current', stage, {
              hours: hours(current.hoursPerWeek),
              cost: formatEuro(current.centsPerWeek),
            })}
          />
          {working && (
            <Writing wrap>
              {working.startWeek === view.week
                ? label('freelance.firstWeek', stage, { hours: hours(working.workHoursThisWeek) })
                : label('freelance.thisWeek', stage, { hours: hours(working.workHoursThisWeek) })}
            </Writing>
          )}
          {current.endWeek !== null && (
            <Writing wrap>{label('freelance.lastWeek', stage, { week: current.endWeek })}</Writing>
          )}
          {working?.role === 'developer' && (
            <>
              <Writing>{label('freelance.devWork', stage)}</Writing>
              <Choices>
                {chip(draft.build === null, label('team.devNone', stage), () =>
                  set({ build: null }),
                )}
                {view.product.features
                  .filter((f) => !f.shipped)
                  .map((f) => chip(draft.build === f.id, f.name, () => set({ build: f.id })))}
              </Choices>
            </>
          )}
          {working?.role === 'salesperson' && (
            <>
              <Writing>{label('freelance.salesWork', stage)}</Writing>
              <Choices>
                {chip(draft.outreach === null, label('team.salesNone', stage), () =>
                  set({ outreach: null }),
                )}
                {view.segments.map((seg) =>
                  chip(draft.outreach?.segmentId === seg.id, seg.name, () =>
                    set({
                      outreach: {
                        segmentId: seg.id,
                        channel: seg.lastChannel ?? view.channels[0] ?? 'phone',
                      },
                    }),
                  ),
                )}
              </Choices>
              {draft.outreach && (
                <Choices>
                  {view.channels.map((c: ChannelId) =>
                    chip(draft.outreach?.channel === c, label(`channel.${c}`, stage), () =>
                      set({
                        outreach: { segmentId: draft.outreach?.segmentId ?? '', channel: c },
                      }),
                    ),
                  )}
                </Choices>
              )}
            </>
          )}
          {current.endWeek === null && (
            <>
              <Writing>{label('freelance.hours', stage)}</Writing>
              <Choices>
                {fl.hoursOptions.map((h) =>
                  chip((draft.hoursPerWeek ?? current.hoursPerWeek) === h, hours(h), () =>
                    set({ hoursPerWeek: h === current.hoursPerWeek ? null : h }),
                  ),
                )}
                {chip(
                  draft.end,
                  draft.end
                    ? label('freelance.endBooked', stage)
                    : label('freelance.end', stage, {
                        weeks: count('unit.weeks', stage, fl.noticeWeeks),
                      }),
                  () => set({ end: !draft.end }),
                )}
              </Choices>
            </>
          )}
        </>
      )}
      {fl.canBook &&
        fl.roles.map((r) => (
          <div key={r.id}>
            <Market
              label={label(`freelance.role.${r.id}`, stage)}
              note={label('freelance.rate', stage, { rate: formatEuro(r.centsPerHour) })}
              choices={fl.hoursOptions.map((h) => {
                const on = draft.book?.role === r.id && draft.book.hoursPerWeek === h
                return chip(
                  on,
                  on
                    ? label('freelance.bookedNote', stage, {
                        role: label(`freelance.role.${r.id}`, stage).toLowerCase(),
                        hours: hours(h),
                      })
                    : label('freelance.optionCost', stage, {
                        hours: hours(h),
                        cost: formatEuro(h * r.centsPerHour),
                      }),
                  () => set({ book: on ? null : { role: r.id, hoursPerWeek: h } }),
                )
              })}
            />
            <Writing wrap>
              {label(
                r.id === 'developer' ? 'freelance.ruleDeveloper' : 'freelance.ruleSalesperson',
                stage,
              )}
            </Writing>
          </div>
        ))}
      {fl.canBook && (
        <>
          <Writing wrap>
            {label('freelance.output', stage, {
              work: hours(Math.floor(most * fl.outputShare)),
              booked: hours(most),
            })}
          </Writing>
          <Writing wrap>{label('freelance.slowStart', stage)}</Writing>
        </>
      )}
    </>
  )
}
