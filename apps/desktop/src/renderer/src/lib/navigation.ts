import {
  BotIcon,
  ChartNoAxesColumnIcon,
  DraftingCompassIcon,
  NotebookPenIcon,
  RulerIcon,
  ScanEyeIcon,
  SirenIcon,
  WalletIcon
} from 'lucide-react'

export type NavItem = {
  title: string
  to: string
  icon: typeof BotIcon
}

export const navigation: Array<{ label: string; items: Array<NavItem> }> = [
  {
    label: 'Notebook',
    items: [
      { title: 'Desk', to: '/', icon: BotIcon },
      { title: 'Journal', to: '/journal', icon: NotebookPenIcon },
      { title: 'Expenses', to: '/expenses', icon: WalletIcon },
      { title: 'Stats', to: '/stats', icon: ChartNoAxesColumnIcon }
    ]
  },
  {
    label: 'Developer Kit',
    items: [
      { title: 'Blueprints', to: '/blueprints', icon: DraftingCompassIcon },
      { title: 'UI Review', to: '/ui-review', icon: ScanEyeIcon },
      { title: 'Incidents', to: '/incidents', icon: SirenIcon },
      { title: 'Measure', to: '/measure', icon: RulerIcon }
    ]
  }
]
