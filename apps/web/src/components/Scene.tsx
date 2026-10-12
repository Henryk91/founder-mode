import type { PlayerView } from '@founder-mode/engine'
import { label, type UiStage } from '../labels'
import { useGame } from '../useGame'
import s from './Scene.module.css'

/**
 * The scene drawings. Office stages are scenario content; a stage is drawn by the drawing of the
 * same id, and a stage without one shows the kitchen table. The chip names the stage as the
 * scenario does.
 */
export type OfficeStage = 'kitchen_table' | 'coworking_desk' | 'trades_yard'

const DRAWINGS: readonly OfficeStage[] = ['kitchen_table', 'coworking_desk', 'trades_yard']

/** The drawing for where the company works, from the engine. */
export function officeStage(view: PlayerView): OfficeStage {
  const id = view.company.officeStage.id
  return DRAWINGS.find((d) => d === id) ?? 'kitchen_table'
}

type Figure = { name: string; status: string }

type SceneData = {
  you: Figure
  /** The founder slumps once energy is low. */
  slumped: boolean
  hire: Figure | null
  customers: string[]
}

function sceneData(view: PlayerView, plannedHours: number): SceneData {
  const stage = view.company.uiStage
  const { founder } = view
  const mood =
    founder.energy <= 0
      ? 'scene.you.empty'
      : founder.energy < founder.lowEnergyBelow
        ? 'scene.you.low'
        : founder.energy < founder.tiredBelow
          ? 'scene.you.tired'
          : 'scene.you.rested'
  const member = view.team.member
  return {
    slumped: founder.energy < founder.lowEnergyBelow,
    you: {
      name: label('scene.you', stage),
      status: label('scene.you.status', stage, {
        mood: label(mood, stage),
        hours: label('unit.hours', stage, { n: plannedHours }),
      }),
    },
    hire: member
      ? {
          name: member.name.split(' ')[0] ?? member.name,
          status: member.working
            ? label(`team.role.${member.role}`, stage)
            : label('scene.hire.starting', stage, { week: member.startWeek }),
        }
      : null,
    customers: view.customers.slice(0, 3).map((c) => c.name),
  }
}

/** The scene picture: one static image per office stage, with a stage chip. */
export function Scene(props: { stage?: OfficeStage }) {
  const view = useGame((st) => st.view)
  const planned = useGame((st) => st.plannedHours)
  if (!view) return null
  const ui = view.company.uiStage
  const office = props.stage ?? officeStage(view)
  const data = sceneData(view, planned)
  return (
    <div
      className={s.scene}
      role="img"
      aria-label={sceneLabel(view.company.officeStage.name, data, ui)}
    >
      {office === 'kitchen_table' ? (
        <KitchenTable data={data} ui={ui} />
      ) : office === 'coworking_desk' ? (
        <CoworkingDesk data={data} ui={ui} />
      ) : (
        <TradesYard data={data} ui={ui} />
      )}
      <div className={s.chip}>{view.company.officeStage.name}</div>
    </div>
  )
}

/** Phone: a 72 px strip naming the place, on the Inbox tab only. */
export function SceneStrip() {
  const view = useGame((st) => st.view)
  if (!view) return null
  const ui = view.company.uiStage
  const office = officeStage(view)
  return (
    <section className={s.strip} aria-label={label('scene.where', ui)}>
      <svg
        className={s.stripSvg}
        aria-hidden="true"
        viewBox="0 0 390 72"
        preserveAspectRatio="xMidYMid slice"
      >
        <rect className={s.floor} x="0" y="60" width="390" height="12" />
        <rect className={s.sky} x="200" y="8" width="76" height="34" />
        <rect className={s.sky} x="292" y="8" width="76" height="34" />
        <rect className={s.desk} x="190" y="48" width="190" height="5" />
        <rect className={s.wood} x="196" y="53" width="4" height="12" />
        <rect className={s.wood} x="370" y="53" width="4" height="12" />
        <rect className={s.screen} x="272" y="35" width="24" height="13" rx="1" />
        {office === 'kitchen_table' && (
          <rect className={s.mug} x="250" y="40" width="8" height="8" />
        )}
      </svg>
      <div className={s.stripText}>
        <div className={s.where}>{label('scene.where', ui)}</div>
        <div className={s.place}>{view.company.officeStage.name}</div>
      </div>
    </section>
  )
}

function sceneLabel(place: string, data: SceneData, ui: UiStage): string {
  const people = [data.you, data.hire].filter((f): f is Figure => f !== null)
  return [
    place,
    ...people.map((f) => label('scene.figure', ui, { name: f.name, status: f.status })),
  ].join('. ')
}

/** A seated figure: faceless, natural proportions, muted clothes. */
function Person(props: { x: number; who: 'you' | 'hire'; slump?: boolean }) {
  const { x } = props
  const coat = props.who === 'you' ? s.coatYou : s.coatHire
  const skin = props.who === 'you' ? s.skinYou : s.skinHire
  const hair = props.who === 'you' ? s.hairYou : s.hairHire
  return (
    <g transform={props.slump ? `rotate(6 ${x} 222)` : undefined}>
      <path className={coat} d={`M${x - 26} 226v-28c0-12 8-18 18-20h16c10 2 18 8 18 20v28z`} />
      <rect className={skin} x={x - 4} y="166" width="8" height="13" />
      <ellipse className={skin} cx={x} cy="156" rx="11" ry="13" />
      <path
        className={hair}
        d={`M${x - 11} 154c0-12 5-16 11-16s11 4 11 16c-3-6-6-8-11-8s-8 2-11 8z`}
      />
    </g>
  )
}

function Labels(props: { x: number; figure: Figure }) {
  return (
    <>
      <text className={s.label} x={props.x} y="292">
        {props.figure.name}
      </text>
      <text className={s.sublabel} x={props.x} y="308">
        {props.figure.status}
      </text>
    </>
  )
}

/** Customer names on small cards, with an empty one waiting for the next. */
function CustomerCards(props: { x: number; y: number; names: string[]; ui: UiStage }) {
  const slots = [...props.names, null].slice(0, 3)
  return (
    <>
      <text className={s.heading} x={props.x + 36} y={props.y - 10}>
        {label('scene.customers', props.ui)}
      </text>
      {slots.map((name, i) => {
        const y = props.y + i * 44
        if (name === null) {
          return (
            <g key="next">
              <rect className={s.dashed} x={props.x} y={y} width="72" height="36" rx="4" />
              <text className={s.small} x={props.x + 36} y={y + 22}>
                {label('scene.nextCustomer', props.ui)}
              </text>
            </g>
          )
        }
        const [first, ...rest] = name.split(' ')
        return (
          <g key={name}>
            <rect className={s.customer} x={props.x} y={y} width="72" height="36" rx="4" />
            <text className={s.cardText} x={props.x + 36} y={y + 15}>
              {(first ?? '').slice(0, 12)}
            </text>
            <text className={s.cardText} x={props.x + 36} y={y + 28}>
              {rest.join(' ').slice(0, 12)}
            </text>
          </g>
        )
      })}
    </>
  )
}

function KitchenTable({ data, ui }: { data: SceneData; ui: UiStage }) {
  return (
    <svg className={s.svg} viewBox="0 0 732 330" preserveAspectRatio="xMinYMid slice">
      <rect className={s.wall} x="0" y="0" width="732" height="250" />
      <rect className={s.floor} x="0" y="250" width="732" height="80" />
      <rect className={s.skirting} x="0" y="246" width="732" height="6" />
      {/* window over the sink */}
      <rect className={s.sky} x="300" y="40" width="150" height="100" />
      <rect className={s.skyline} x="300" y="100" width="34" height="40" />
      <rect className={s.skyline} x="334" y="84" width="26" height="56" />
      <rect className={s.skyline} x="360" y="108" width="40" height="32" />
      <rect className={s.skyline} x="400" y="92" width="50" height="48" />
      <rect className={s.frame} x="300" y="40" width="150" height="100" />
      <line className={s.frame} x1="375" y1="40" x2="375" y2="140" />
      {/* counter and cupboards */}
      <rect className={s.counter} x="250" y="170" width="260" height="76" />
      <rect className={s.desk} x="246" y="164" width="268" height="8" />
      <line className={s.line} x1="336" y1="178" x2="336" y2="240" />
      <line className={s.line} x1="424" y1="178" x2="424" y2="240" />
      {/* fridge with customer cards stuck on it */}
      <rect className={s.fridge} x="560" y="30" width="130" height="216" rx="6" />
      <line className={s.line} x1="560" y1="112" x2="690" y2="112" />
      <CustomerCards x={589} y={130} names={data.customers} ui={ui} />
      <rect className={s.sticky} x="578" y="48" width="34" height="34" />
      <rect className={s.sticky} x="622" y="54" width="34" height="34" />
      {/* the kitchen table */}
      <rect className={s.desk} x="40" y="220" width="250" height="12" rx="2" />
      <rect className={s.wood} x="56" y="232" width="8" height="40" />
      <rect className={s.wood} x="266" y="232" width="8" height="40" />
      <Person x={150} who="you" slump={data.slumped} />
      <rect className={s.screen} x="130" y="198" width="40" height="22" rx="2" />
      <rect className={s.mug} x="200" y="204" width="14" height="16" rx="2" />
      <rect className={s.paper} x="74" y="210" width="34" height="10" />
      {data.hire && <Person x={240} who="hire" />}
      <Labels x={150} figure={data.you} />
      {data.hire && <Labels x={240} figure={data.hire} />}
      {/* plant */}
      <rect className={s.pot} x="700" y="268" width="22" height="28" />
      <circle className={s.plant} cx="711" cy="252" r="14" />
    </svg>
  )
}

function CoworkingDesk({ data, ui }: { data: SceneData; ui: UiStage }) {
  return (
    <svg className={s.svg} viewBox="0 0 732 330" preserveAspectRatio="xMinYMid slice">
      <rect className={s.wall} x="0" y="0" width="732" height="250" />
      <rect className={s.floor} x="0" y="250" width="732" height="80" />
      <rect className={s.skirting} x="0" y="246" width="732" height="6" />
      {/* two big windows */}
      {[262, 398].map((x) => (
        <g key={x}>
          <rect className={s.sky} x={x} y="36" width="120" height="110" />
          <rect className={s.skyline} x={x} y="104" width="30" height="42" />
          <rect className={s.skyline} x={x + 30} y="84" width="22" height="62" />
          <rect className={s.skyline} x={x + 52} y="112" width="34" height="34" />
          <rect className={s.skyline} x={x + 86} y="96" width="34" height="50" />
          <rect className={s.dot} x={x + 34} y="90" width="3" height="5" />
          <rect className={s.dot} x={x + 42} y="102" width="3" height="5" />
          <rect className={s.frame} x={x} y="36" width="120" height="110" />
          <line className={s.frame} x1={x + 60} y1="36" x2={x + 60} y2="146" />
        </g>
      ))}
      {/* shared whiteboard */}
      <rect className={s.paper} x="24" y="40" width="156" height="96" rx="3" />
      <rect className={s.line} x="24" y="40" width="156" height="96" rx="3" />
      <rect className={s.ink} x="36" y="70" width="94" height="3" />
      <rect className={s.ink} x="36" y="86" width="74" height="3" />
      <rect className={s.ink} x="36" y="102" width="114" height="3" />
      <CustomerCards x={590} y={52} names={data.customers} ui={ui} />
      {/* long shared desk */}
      <rect className={s.desk} x="60" y="220" width="612" height="12" rx="2" />
      <rect className={s.wood} x="74" y="232" width="8" height="40" />
      <rect className={s.wood} x="362" y="232" width="8" height="40" />
      <rect className={s.wood} x="650" y="232" width="8" height="40" />
      <Person x={150} who="you" slump={data.slumped} />
      <rect className={s.screen} x="130" y="198" width="40" height="22" rx="2" />
      <rect className={s.mug} x="84" y="196" width="18" height="24" rx="2" />
      {data.hire ? (
        <>
          <Person x={450} who="hire" />
          <rect className={s.screen} x="430" y="198" width="40" height="22" rx="2" />
          <Labels x={450} figure={data.hire} />
        </>
      ) : (
        <rect className={s.chair} x="428" y="166" width="44" height="58" rx="8" />
      )}
      <Labels x={150} figure={data.you} />
      <rect className={s.pot} x="690" y="268" width="26" height="30" />
      <circle className={s.plant} cx="703" cy="250" r="16" />
    </svg>
  )
}

/** A desk in a trades yard (Zollstock): a workbench, a pegboard of tools, a van outside. */
function TradesYard({ data, ui }: { data: SceneData; ui: UiStage }) {
  return (
    <svg className={s.svg} viewBox="0 0 732 330" preserveAspectRatio="xMinYMid slice">
      <rect className={s.wall} x="0" y="0" width="732" height="250" />
      <rect className={s.floor} x="0" y="250" width="732" height="80" />
      <rect className={s.skirting} x="0" y="246" width="732" height="6" />
      {/* window onto the yard, with a van parked outside */}
      <rect className={s.sky} x="250" y="36" width="250" height="120" />
      <rect className={s.skyline} x="250" y="128" width="250" height="28" />
      <rect className={s.counter} x="300" y="96" width="120" height="44" rx="6" />
      <rect className={s.counter} x="420" y="110" width="40" height="30" rx="4" />
      <rect className={s.screen} x="428" y="114" width="24" height="12" rx="2" />
      <rect className={s.paper} x="318" y="108" width="70" height="10" />
      <circle className={s.wood} cx="330" cy="142" r="9" />
      <circle className={s.wood} cx="438" cy="142" r="9" />
      <rect className={s.frame} x="250" y="36" width="250" height="120" />
      <line className={s.frame} x1="375" y1="36" x2="375" y2="156" />
      {/* pegboard with tools */}
      <rect className={s.paper} x="24" y="40" width="190" height="110" rx="3" />
      <rect className={s.line} x="24" y="40" width="190" height="110" rx="3" />
      <rect className={s.ink} x="44" y="58" width="6" height="56" />
      <rect className={s.ink} x="38" y="58" width="18" height="10" />
      <rect className={s.ink} x="78" y="62" width="40" height="5" />
      <rect className={s.ink} x="78" y="80" width="56" height="5" />
      <rect className={s.wood} x="150" y="56" width="12" height="70" />
      <rect className={s.sticky} x="176" y="58" width="28" height="28" />
      <CustomerCards x={600} y={52} names={data.customers} ui={ui} />
      {/* the workbench */}
      <rect className={s.desk} x="40" y="214" width="320" height="18" rx="2" />
      <rect className={s.wood} x="54" y="232" width="12" height="40" />
      <rect className={s.wood} x="334" y="232" width="12" height="40" />
      <rect className={s.wood} x="60" y="252" width="280" height="6" />
      <Person x={150} who="you" slump={data.slumped} />
      <rect className={s.screen} x="130" y="192" width="40" height="22" rx="2" />
      <rect className={s.mug} x="204" y="198" width="14" height="16" rx="2" />
      <rect className={s.paper} x="250" y="206" width="60" height="8" />
      {data.hire && <Person x={270} who="hire" />}
      <Labels x={150} figure={data.you} />
      {data.hire && <Labels x={270} figure={data.hire} />}
      <rect className={s.pot} x="690" y="268" width="26" height="30" />
      <circle className={s.plant} cx="703" cy="250" r="16" />
    </svg>
  )
}
