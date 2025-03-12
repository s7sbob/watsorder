import { useState, useEffect } from 'react'
import { useLocation } from 'react-router'
import { Box, List, useMediaQuery } from '@mui/material'
import { useDispatch, useSelector } from 'src/store/Store'
import { toggleMobileSidebar } from 'src/store/customizer/CustomizerSlice'
import Menuitems from './MenuItems'
import NavItem from './NavItem'
import NavCollapse from './NavCollapse'
import NavGroup from './NavGroup/NavGroup'
import { AppState } from 'src/store/Store'
import { useTranslation } from 'react-i18next'
import { getCookie } from 'src/utils/cookieHelpers'
import { jwtDecode } from "jwt-decode";

// تعريف للـ payload الخاص بالـ JWT
interface DecodedToken {
  id: number;
  phoneNumber: string;
  subscriptionType: string;
  name: string;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  createdAt: string;
  maxSessions: number;
  iat: number;
  exp: number;
}

const SidebarItems = () => {
  const { pathname } = useLocation()
  const pathDirect = pathname
  const pathWithoutLastPart = pathname.slice(0, pathname.lastIndexOf('/'))
  const dispatch = useDispatch()
  const { t } = useTranslation()

  const customizer = useSelector((state: AppState) => state.customizer)
  const lgUp = useMediaQuery((theme: any) => theme.breakpoints.up('lg'))
  const hideMenu: any = lgUp ? customizer.isCollapse && !customizer.isSidebarHover : ''

  // قراءة التوكن من الكوكيز
  const token = getCookie("token")
  let subscriptionType: string | null = null
  if (token) {
    try {
      const decoded = jwtDecode<DecodedToken>(token)
      subscriptionType = decoded.subscriptionType
    } catch (error) {
      console.error("Error decoding token:", error)
    }
  }

  // تخزين القائمة النهائية في حالة محلية
  const [finalMenu, setFinalMenu] = useState(Menuitems)

  // تحديث القائمة بناءً على قيمة subscriptionType من التوكن
  useEffect(() => {
    let updatedMenu = [...Menuitems]
    if (subscriptionType !== 'admin') {
      const adminIndex = updatedMenu.findIndex((item) => item.subheaderKey === 'Sidebar.adminOnly')
      if (adminIndex !== -1) {
        updatedMenu = updatedMenu.slice(0, adminIndex)
      }
    }
    setFinalMenu(updatedMenu)
  }, [subscriptionType])

  return (
    <Box sx={{ px: 3 }}>
      <List sx={{ pt: 0 }} className='sidebarNav'>
        {finalMenu.map((item) => {
          // تحضير النصوص المترجمة
          const subheader = item.subheaderKey ? t(item.subheaderKey) : undefined
          const title = item.titleKey ? t(item.titleKey) : undefined
          const chip = item.chipKey ? t(item.chipKey) : undefined

          if (item.navlabel) {
            return (
              <NavGroup
                item={{ ...item, subheader }}
                hideMenu={hideMenu}
                key={item.subheaderKey}
              />
            )
          } else if (item.children) {
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
