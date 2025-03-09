import { useLocation } from 'react-router'
import { Box, List, useMediaQuery } from '@mui/material'
import { useSelector, useDispatch } from 'src/store/Store'
import { toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice'
import Menuitems from './MenuItems'
import NavItem from './NavItem'
import NavCollapse from './NavCollapse'
import NavGroup from './NavGroup/NavGroup'
import { AppState } from 'src/store/Store'

// استيراد الترجمة
import { useTranslation } from 'react-i18next'

const SidebarItems = () => {
  const { pathname } = useLocation()
  const pathDirect = pathname
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'))
  const customizer = useSelector((state: AppState) => state.customizer)
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'))
  const hideMenu: any = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : ''
  const dispatch = useDispatch()

  // استخدام الترجمة
  const { t } = useTranslation()

  // نجلب subscriptionType من Redux
  const subscriptionType = useSelector((state: AppState) => state.auth.subscriptionType)

  // نعمل نسخة من Menuitems
  let finalMenu = [...Menuitems]

  // إخفاء قسم "Admin Only" إن لم يكن المشترك admin
  if (subscriptionType !== 'admin') {
    const adminIndex = finalMenu.findIndex((item) => item.subheaderKey === 'Sidebar.adminOnly')
    if (adminIndex !== -1) {
      finalMenu = finalMenu.slice(0, adminIndex)
    }
  }

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className='sidebarNav'>
        {finalMenu.map((item) => {
          // تحضير النصوص المترجمة
          const subheader = item.subheaderKey ? t(item.subheaderKey) : undefined
          const title = item.titleKey ? t(item.titleKey) : undefined
          const chip = item.chipKey ? t(item.chipKey) : undefined

          if (item.navlabel) {
            // في الأصل NavGroup يستخدم item.subheader
            return (
              <NavGroup
                item={{ ...item, subheader }}
                hideMenu={hideMenu}
                key={item.subheaderKey}
              />
            )
          } else if (item.children) {
            // لو لدى العنصر children ، نترجم title بدلاً من item.title
            return (
              <NavCollapse
                menu={{ ...item, title, chip }}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id}
                onClick={() => dispatch(toggleMobileSidebar())}
              />
            )
          } else {
            // عنصر عادي
            return (
              <NavItem
                item={{ ...item, title, chip }}
                key={item.id}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                onClick={() => dispatch(toggleMobileSidebar())}
              />
            )
          }
        })}
      </List>
    </Box>
  )
}

export default SidebarItems
