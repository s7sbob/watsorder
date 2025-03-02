// src/layouts/sidebar/SidebarItems.tsx
import { useLocation } from 'react-router'
import { Box, List, useMediaQuery } from '@mui/material'
import { useSelector, useDispatch } from 'src/store/Store'
import { toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice'
import Menuitems from './MenuItems'
import NavItem from './NavItem'
import NavCollapse from './NavCollapse'
import NavGroup from './NavGroup/NavGroup'
import { AppState } from 'src/store/Store'

const SidebarItems = () => {
  const { pathname } = useLocation()
  const pathDirect = pathname
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'))
  const customizer = useSelector((state: AppState) => state.customizer)
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'))
  const hideMenu: any = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : ''
  const dispatch = useDispatch()

  // نجلب subscriptionType من Redux
  const subscriptionType = useSelector((state: AppState) => state.auth.subscriptionType)

  // نعمل نسخة من Menuitems
  let finalMenu = [...Menuitems]

  // إخفاء قسم "Admin Only" إن لم يكن المشترك admin
  if (subscriptionType !== 'admin') {
    const adminIndex = finalMenu.findIndex((item) => item.subheader === 'Admin Only')
    if (adminIndex !== -1) {
      finalMenu = finalMenu.slice(0, adminIndex)
    }
  }

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className='sidebarNav'>
        {finalMenu.map((item) => {
          if (item.subheader) {
            return <NavGroup item={item} hideMenu={hideMenu} key={item.subheader} />
          } else if (item.children) {
            return (
              <NavCollapse
                menu={item}
                pathDirect={pathDirect}
                hideMenu={hideMenu}
                pathWithoutLastPart={pathWithoutLastPart}
                level={1}
                key={item.id}
                onClick={() => dispatch(toggleMobileSidebar())}
              />
            )
          } else {
            return (
              <NavItem
                item={item}
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
