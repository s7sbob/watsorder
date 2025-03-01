// src/layouts/sidebar/MenuItems.ts
import { uniqueId } from 'lodash'
import {
  IconNotebook,
  IconFileDescription,
  IconShoppingCart,
  IconFileCheck,
  IconUserCircle,
  IconChartDonut3
} from '@tabler/icons-react'

interface MenuitemsType {
  [x: string]: any
  id?: string
  navlabel?: boolean
  subheader?: string
  title?: string
  icon?: any
  href?: string
  children?: MenuitemsType[]
  chip?: string
  chipColor?: string
  variant?: string
  external?: boolean
}

const Menuitems: MenuitemsType[] = [
  {
    navlabel: true,
    subheader: 'Home'
  },
  {
    id: uniqueId(),
    title: 'Sessions',
    icon: IconNotebook,
    href: '/apps/sessions',
    chip: 'New',
    chipColor: 'secondary'
  },
  {
    id: uniqueId(),
    title: 'API Documentation',
    icon: IconFileDescription,
    href: '/api-docs'
  },
  {
    id: uniqueId(),
    title: 'Orders Dashboard',
    icon: IconShoppingCart,
    href: '/apps/ConfirmedOrdersPage',
    children: [
      {
        id: uniqueId(),
        title: 'Confirmed Orders',
        icon: IconFileCheck,
        href: '/apps/ConfirmedOrdersPage'
      }
    ]
  },
  {
    id: uniqueId(),
    title: 'Sub-Users',
    icon: IconUserCircle,
    href: '#',
    chip: 'Soon',
    chipColor: 'green'
  },

  {
    navlabel: true,
    subheader: 'Admin Only'
  },
  {
    id: uniqueId(),
    title: 'Admin UserList',
    icon: IconUserCircle,
    chipColor: 'secondary',
    href: '/UserList'
  },
  {
    id: uniqueId(),
    title: 'Sessions Dashboard',
    icon: IconChartDonut3,
    href: '/sessions/manage'
  }
]

export default Menuitems
