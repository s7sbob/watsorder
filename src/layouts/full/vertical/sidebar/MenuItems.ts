import { uniqueId } from 'lodash'
import {
  IconNotebook,
  IconFileDescription,
  IconFileCheck,
  IconUserCircle,
  IconChartDonut3
} from '@tabler/icons-react'

interface MenuitemsType {
  id?: string
  navlabel?: boolean
  // بدلاً من subheader
  subheaderKey?: string
  // بدلاً من title
  titleKey?: string
  icon?: any
  href?: string
  children?: MenuitemsType[]
  // بدلاً من chip
  chipKey?: string
  chipColor?: string
  variant?: string
  external?: boolean
}

const Menuitems: MenuitemsType[] = [
  {
    navlabel: true,
    subheaderKey: 'Sidebar.home' // مفتاح ترجمة "Home"
  },
  {
    id: uniqueId(),
    titleKey: 'Sidebar.sessions', // مفتاح ترجمة "Sessions"
    icon: IconNotebook,
    href: '/apps/sessions',
    chipKey: 'Sidebar.new', // مفتاح ترجمة "New"
    chipColor: 'secondary'
  },
  {
    id: uniqueId(),
    titleKey: 'Sidebar.apiDocumentation', // "API Documentation"
    icon: IconFileDescription,
    href: '/api-docs'
  },
  {
    id: uniqueId(),
    titleKey: 'Sidebar.newOrders', // "New Orders"
    icon: IconFileCheck,
    href: '/apps/NewOrdersPage'
  },
  {
    id: uniqueId(),
    titleKey: 'Sidebar.ordersHistory', // "Orders History"
    icon: IconFileCheck,
    href: '/apps/OrdersHistoryPage'
  },
  {
    id: uniqueId(),
    titleKey: 'Sidebar.subUsers', // "Sub-Users"
    icon: IconUserCircle,
    href: '#',
    chipKey: 'Sidebar.soon', // "Soon"
    chipColor: 'green'
  },
  {
    navlabel: true,
    subheaderKey: 'Sidebar.adminOnly' // "Admin Only"
  },
  {
    id: uniqueId(),
    titleKey: 'Sidebar.adminUserList', // "Admin UserList"
    icon: IconUserCircle,
    chipColor: 'secondary',
    href: '/AdminUsersPage'
  },
  {
    id: uniqueId(),
    titleKey: 'Sidebar.sessionsDashboard', // "Sessions Dashboard"
    icon: IconChartDonut3,
    href: '/sessions/manage'
  }
]

export default Menuitems
