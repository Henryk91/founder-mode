import { Inbox } from '../screens/Inbox'
import { Market } from '../screens/Market'
import { Money } from '../screens/Money'
import { Pipeline } from '../screens/Pipeline'
import { Plan } from '../screens/Plan'
import type { Tab } from '../store'

/** Phone tabs in order. Hiring lives in the Plan tab. */
export const TABS: Tab[] = ['inbox', 'plan', 'pipeline', 'market', 'money']

export const SCREENS: Record<Tab, () => React.JSX.Element | null> = {
  plan: Plan,
  inbox: () => <Inbox />,
  market: Market,
  pipeline: Pipeline,
  money: Money,
}
