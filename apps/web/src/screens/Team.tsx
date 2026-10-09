import type { ChannelId, PlayerView, TeamRoleId } from '@founder-mode/engine'
import { formatEuro } from '../format'
import { label, type UiStage } from '../labels'
import { useGame } from '../useGame'
import styles from '../components/ui.module.css'

const roleName = (role: TeamRoleId, stage: UiStage) => label(`team.role.${role}`, stage)

/** One hire at most: search, meet candidates, make an offer, point them at work, or let go. */
export function Team() {
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
      <section className={styles.card}>
        <h2 className={styles.title}>{label('team.title', stage)}</h2>
        <p className={styles.hint}>
          {label('team.hint', stage, {
            hours: hours(costs.searchHours),
            weeks: costs.searchWeeks,
            start: costs.startWeeks,
          })}
        </p>
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
              <div key={r.id} className={styles.row}>
                <div className={styles.rowHead}>
                  <span>{roleName(r.id, stage)}</span>
                  <span className={styles.mono}>
                    {label('team.perMonth', stage, { amount: formatEuro(r.monthlyCents) })}
                  </span>
                </div>
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
              </div>
            )
          })}
        {team.hadHire && <p className={styles.hint}>{label('team.hadHire', stage)}</p>}
      </section>
      {team.candidates.length > 0 && (
        <section className={styles.card}>
          <h3 className={styles.title}>{label('team.candidates', stage)}</h3>
          <p className={styles.hint}>{label('team.candidatesHint', stage)}</p>
          {team.candidates.map((c) => {
            const booked = plan.hire === c.id
            const monthly = team.roles.find((r) => r.id === c.role)?.monthlyCents ?? 0
            return (
              <div key={c.id} className={styles.row}>
                <div className={styles.rowHead}>
                  <span>{c.name}</span>
                  <span className={styles.mono}>
                    {label('team.perMonth', stage, { amount: formatEuro(monthly) })}
                  </span>
                </div>
                <span className={styles.hint}>
                  {roleName(c.role, stage)} ·{' '}
                  {label('team.impression', stage, { impression: c.impression })}
                </span>
                <button
                  type="button"
                  aria-pressed={booked}
                  className={`${styles.button} ${booked ? styles.primary : ''}`}
                  onClick={() => actions.setHire(booked ? null : c.id)}
                >
                  {booked ? label('team.offerBooked', stage) : label('team.offer', stage)}
                </button>
              </div>
            )
          })}
        </section>
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
    <section className={styles.card}>
      <h3 className={styles.title}>
        {label('team.member', stage, { role: roleName(member.role, stage) })}
      </h3>
      <div className={styles.rowHead}>
        <span>{member.name}</span>
        <span className={styles.mono}>
          {label('team.perMonth', stage, { amount: formatEuro(member.monthlyCents) })}
        </span>
      </div>
      <p className={styles.hint}>
        {label(member.working ? 'team.working' : 'team.starts', stage, { week: member.startWeek })}
      </p>
      {member.working && member.role === 'developer' && (
        <div className={styles.row}>
          <span>{label('team.devWork', stage)}</span>
          <p className={styles.hint}>{label('team.devHint', stage)}</p>
          <div className={styles.chips}>
            {chip(props.buildTarget === null, label('team.devNone', stage), () =>
              actions.setTeamBuild(null),
            )}
            {view.product.features
              .filter((f) => !f.shipped)
              .map((f) =>
                chip(props.buildTarget === f.id, f.name, () => actions.setTeamBuild(f.id)),
              )}
          </div>
        </div>
      )}
      {member.working && member.role === 'salesperson' && (
        <div className={styles.row}>
          <span>{label('team.salesWork', stage)}</span>
          <p className={styles.hint}>{label('team.salesHint', stage)}</p>
          <div className={styles.chips}>
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
          </div>
          {props.outreach && (
            <div className={styles.chips}>
              {view.channels.map((c) =>
                chip(props.outreach?.channel === c, label(`channel.${c}`, stage), () =>
                  actions.setTeamOutreach({
                    segmentId: props.outreach?.segmentId ?? '',
                    channel: c,
                  }),
                ),
              )}
            </div>
          )}
        </div>
      )}
      <div className={styles.row}>
        <p className={styles.hint}>{label('team.letGoHint', stage)}</p>
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
      </div>
    </section>
  )
}
