import { uniqueId } from 'lodash';

interface MenuitemsType {
  [x: string]: any;
  id?: string;
  navlabel?: boolean;
  subheader?: string;
  title?: string;
  icon?: any;
  href?: string;
  children?: MenuitemsType[];
  chip?: string;
  chipColor?: string;
  variant?: string;
  external?: boolean;
}
import {
  IconNotebook,       // بدل IconAperture لسessions
  IconFileDescription, // بدل IconShoppingCart لـ API Documentation
  IconShoppingCart,    // لOrders Dashboard
  IconFileCheck,       // لـ Confirmed Orders
  IconUserCircle,      // لـ Subuser Management
  IconUserPlus,        // لـ Add Sub-User
  IconChartDonut3,     // لـ Sessions Dashboard
} from '@tabler/icons-react';

const Menuitems: MenuitemsType[] = [
  {
    navlabel: true,
    subheader: 'Home',
  },

  // 1) Sessions
  {
    id: uniqueId(),
    title: 'Sessions',
    icon: IconNotebook, // يناسب فكرة الجلسات (بدل IconAperture)
    href: '/apps/sessions',
    chip: 'New',
    chipColor: 'secondary',
  },

  // 2) API Documentation
  {
    id: uniqueId(),
    title: 'API Documentation',
    icon: IconFileDescription, // يناسب فكرة توثيق الـ APIs
    href: '/api-docs',
  },

  // 3) Orders Dashboard
  {
    id: uniqueId(),
    title: 'Orders Dashboard',
    icon: IconShoppingCart, // يناسب فكرة الطلبات
    href: '/apps/ConfirmedOrdersPage',
    children: [
      {
        id: uniqueId(),
        title: 'Confirmed Orders',
        icon: IconFileCheck, // يناسب فكرة التأكيد
        href: '/apps/ConfirmedOrdersPage',
      },
    ],
  },

  // 4) Subuser Management
  {
    id: uniqueId(),
    title: 'Sub-Users',
    icon: IconUserCircle, // يناسب فكرة إدارة المستخدمين
    href: '#',
    chip: 'Soon',
    chipColor: 'green',
    // children: [
    //   {
    //     id: uniqueId(),
    //     title: 'Add Sub-User',
    //     icon: IconUserPlus, // يناسب إضافة مستخدم
    //     href: '/apps/ConfirmedOrdersPage',
    //   },
    // ],
  },

  {
    navlabel: true,
    subheader: 'Admin Only',
  },

  // 5) Admin UserList
  {
    id: uniqueId(),
    title: 'Admin UserList',
    icon: IconUserCircle, // يناسب قائمة المستخدمين
    chipColor: 'secondary',
    href: '/UserList',
  },

  // 6) Sessions Dashboard
  {
    id: uniqueId(),
    title: 'Sessions Dashboard',
    icon: IconChartDonut3, // يناسب فكرة الداشبورد/التحليلات
    href: '/sessions/manage',
  },
];

export default Menuitems;
