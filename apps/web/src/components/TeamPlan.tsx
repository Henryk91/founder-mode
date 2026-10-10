import type { ChannelId, PlayerView, TeamRoleId } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { label, type UiStage } from '../labels'
import { useGame } from '../useGame'
import { Choices, HintRow, Item, NameWithFigure } from './Ruled'
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
      <HintRow term="hiring">
        {label('team.hint', stage, { hours: hours(costs.searchHours) })}
      </HintRow>
      {team.search && (
        <p>
          {label('team.searching', stage, {
            role: roleName(team.search.role, stage),
            week: team.search.readyWeek,
          })}
        </p>
      )}
      {team.canSearch &&
        team.roles.map((r) => {
          const booked = plan.searchRole === r.id
          return (
            <Item key={r.id}>
              <NameWithFigure
                name={roleName(r.id, stage)}
                figure={label('team.perMonth', stage, { amount: formatEuro(r.monthlyCents) })}
                note={label('team.partTime', stage, {
                  hours: label('unit.hours', stage, { n: r.weeklyHours }),
                })}
              />
              <Choices columns="one">
                <button
                  type="button"
                  aria-pressed={booked}
                  className={`${styles.button} ${booked ? styles.primary : ''}`}
                  onClick={() => actions.setSearchRole(booked ? null : r.id)}
                >
                  {booked
                    ? label('team.searchBooked', stage, { hours: hours(costs.searchHours) })
                    : label('team.search', stage, { role: roleName(r.id, stage) })}
                </button>
              </Choices>
            </Item>
          )
        })}
      {team.hadHire && <p className={styles.hint}>{label('team.hadHire', stage)}</p>}
      {team.candidates.length > 0 && (
        <>
          <p className={styles.subtitle}>{label('team.candidates', stage)}</p>
          <p className={styles.hint}>{label('team.candidatesHint', stage)}</p>
          {team.candidates.map((c) => {
            const booked = plan.hire === c.id
            const monthly = team.roles.find((r) => r.id === c.role)?.monthlyCents ?? 0
            return (
              <Item key={c.id}>
                <NameWithFigure
                  name={c.name}
                  figure={label('team.perMonth', stage, { amount: formatEuro(monthly) })}
                  note={`${roleName(c.role, stage)} · ${label('team.impression', stage, { impression: c.impression })}`}
                />
                <Choices columns="one">
                  <button
                    type="button"
                    aria-pressed={booked}
                    className={`${styles.button} ${booked ? styles.primary : ''}`}
                    onClick={() => actions.setHire(booked ? null : c.id)}
                  >
                    {booked ? label('team.offerBooked', stage) : label('team.offer', stage)}
                  </button>
                </Choices>
              </Item>
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
      <p className={styles.subtitle}>
        {label('team.member', stage, { role: roleName(member.role, stage) })}
      </p>
      <NameWithFigure
        name={member.name}
        figure={label('team.perMonth', stage, { amount: formatEuro(member.monthlyCents) })}
        note={label(member.working ? 'team.working' : 'team.starts', stage, {
          week: member.startWeek,
        })}
      />
      {member.working && member.role === 'developer' && (
        <>
          <p>{label('team.devWork', stage)}</p>
          <p className={styles.hint}>{label('team.devHint', stage)}</p>
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
          <p>{label('team.salesWork', stage)}</p>
          <p className={styles.hint}>{label('team.salesHint', stage)}</p>
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
      <p className={styles.hint}>{label('team.letGoHint', stage)}</p>
      <Choices columns="one">
        <button
          type="button"
          aria-pressed={props.letGo}
          className={`${styles.button} ${props.letGo ? styles.primary : ''}`}
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
