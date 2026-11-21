import {
  ArrowLeftRight,
  LayoutDashboard,
  Target,
  Landmark,
  TrendingUp,
  Wallet,
  Settings,
} from 'lucide-react'

export const pages = [
  {
    path: 'overview',
    title: 'Monthly overview',
    nav: 'Overview',
    icon: LayoutDashboard,
  },
  { path: 'budget', title: 'Budget', nav: 'Budget', icon: Wallet },
  {
    path: 'transactions',
    title: 'Transactions',
    nav: 'Transactions',
    icon: ArrowLeftRight,
  },
  { path: 'trends', title: 'Trends', nav: 'Trends', icon: TrendingUp },
  { path: 'accounts', title: 'Accounts', nav: 'Accounts', icon: Landmark },
  { path: 'goals', title: 'Savings goals', nav: 'Savings goals', icon: Target },
  { path: 'settings', title: 'Settings', nav: 'Settings', icon: Settings },
] as const
