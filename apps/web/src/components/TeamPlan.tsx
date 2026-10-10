import type { ChannelId, PlayerView, TeamRoleId } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { label, type UiStage } from '../labels'
import { useGame } from '../useGame'
import { Choices, HintLine, Market, SubHeading, Writing } from './Ruled'
import styles from './ui.module.css'

const roleName = (role: TeamRoleId, stage: UiStage) => label(`team.role.${role}`, stage)

/**
 * The hiring section of the Plan tab. One hire at most: search, meet candidates, make an offer,
 * point them at work, or let go.
 */
export function TeamPlan() {
  const view = useGame((s) => s.view)
  const plan = useGame((s) => s.plan)
  const actions = {
    setSearchRole: useGame((s) => s.setSearchRole),
    setHire: useGame((s) => s.setHire),
    setLetGo: useGame((s) => s.setLetGo),
    setTeamBuild: useGame((s) => s.setTeamBuild),
    setTeamOutreach: useGame((s) => s.setTeamOutreach),
  }
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
              choices={
                <button
                  type="button"
                  aria-pressed={booked}
                  className={`${styles.chip} ${booked ? styles.chipOn : ''}`}
                  onClick={() => actions.setSearchRole(booked ? null : r.id)}
                >
                  {booked
                    ? label('team.searchBooked', stage, { hours: hours(costs.searchHours) })
                    : label('team.search', stage, { role: roleName(r.id, stage) })}
                </button>
              }
            />
          )
        })}
      {team.candidates.length > 0 && (
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
                  choices={
                    <button
                      type="button"
                      aria-pressed={booked}
                      className={`${styles.chip} ${booked ? styles.chipOn : ''}`}
                      onClick={() => actions.setHire(booked ? null : c.id)}
                    >
                      {booked ? label('team.offerBooked', stage) : label('team.offer', stage)}
                    </button>
                  }
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
      {team.member && (
        <MemberCard
          view={view}
          stage={stage}
          buildTarget={plan.teamBuild}
          outreach={plan.teamOutreach}
          letGo={plan.letGo}
          actions={actions}
        />
      )}
      <HintLine term="hiring" hint={label('plan.hint.hiring', stage)} />
    </>
  )
}

function MemberCard(props: {
  view: PlayerView
  stage: UiStage
  buildTarget: string | null
  outreach: { segmentId: string; channel: ChannelId } | null
  letGo: boolean
  actions: {
    setLetGo: (v: boolean) => void
    setTeamBuild: (id: string | null) => void
    setTeamOutreach: (t: { segmentId: string; channel: ChannelId } | null) => void
  }
}) {
  const { view, stage, actions } = props
  const member = view.team.member
  if (!member) return null
  const chip = (on: boolean, text: string, onClick: () => void) => (
    <button
      key={text}
      type="button"
      aria-pressed={on}
      className={`${styles.chip} ${on ? styles.chipOn : ''}`}
      onClick={onClick}
    >
      {text}
    </button>
  )
  return (
    <>
      <SubHeading>{label('team.member', stage, { role: roleName(member.role, stage) })}</SubHeading>
      <Market
        label={member.name}
        note={label('team.perMonth', stage, { amount: formatEuro(member.monthlyCents) })}
      />
      {member.working && member.role === 'developer' && (
        <>
          <Writing>{label('team.devWork', stage)}</Writing>
          <Choices>
            {chip(props.buildTarget === null, label('team.devNone', stage), () =>
              actions.setTeamBuild(null),
            )}
            {view.product.features
              .filter((f) => !f.shipped)
              .map((f) =>
                chip(props.buildTarget === f.id, f.name, () => actions.setTeamBuild(f.id)),
              )}
          </Choices>
        </>
      )}
      {member.working && member.role === 'salesperson' && (
        <>
          <Writing>{label('team.salesWork', stage)}</Writing>
          <Choices>
            {chip(props.outreach === null, label('team.salesNone', stage), () =>
              actions.setTeamOutreach(null),
            )}
            {view.segments.map((seg) =>
              chip(props.outreach?.segmentId === seg.id, seg.name, () =>
                actions.setTeamOutreach({
                  segmentId: seg.id,
                  channel: seg.lastChannel ?? view.channels[0] ?? 'phone',
                }),
              ),
            )}
          </Choices>
          {props.outreach && (
            <Choices>
              {view.channels.map((c) =>
                chip(props.outreach?.channel === c, label(`channel.${c}`, stage), () =>
                  actions.setTeamOutreach({
                    segmentId: props.outreach?.segmentId ?? '',
                    channel: c,
                  }),
                ),
              )}
            </Choices>
          )}
        </>
      )}
      <Choices>
        <button
          type="button"
          aria-pressed={props.letGo}
          className={`${styles.chip} ${props.letGo ? styles.chipOn : ''}`}
          onClick={() => actions.setLetGo(!props.letGo)}
        >
          {props.letGo
            ? label('team.letGoBooked', stage)
            : label('team.letGo', stage, { cost: formatEuro(member.letGoCostCents) })}
        </button>
      </Choices>
    </>
  )
}
