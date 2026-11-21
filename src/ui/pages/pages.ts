import { ArrowLeftRight, LayoutDashboard, Target, Wallet } from 'lucide-react'

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
  { path: 'goals', title: 'Savings goals', nav: 'Savings goals', icon: Target },
] as const
