import React from 'react'
import { styled } from '@mui/material/styles'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import { NavLink, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

interface NavLinkItem {
  key: string      // i18n key for the link title
  to: string
  isNew?: boolean
}

const NAV_LINKS: NavLinkItem[] = [
  { key: 'Header.Nav.aboutUs', to: '/about' },
  { key: 'Header.Nav.blog',    to: '/#' },
  { key: 'Header.Nav.portfolio',to: '/#', isNew: true },
  { key: 'Header.Nav.dashboard',to: '/apps/sessions' },
  { key: 'Header.Nav.pricing',  to: '/frontend-pages/pricing' },
  { key: 'Header.Nav.contact',  to: '/#' }
]

const Navigations: React.FC = () => {
  const { t } = useTranslation()
  const { pathname } = useLocation()

  const StyledButton = styled(Button)(({ theme }) => ({
    fontSize: '15px',
    fontWeight: 500,
    a: {
      color: theme.palette.text.secondary,
      textDecoration: 'none'
    },
    '&.active': {
      backgroundColor: 'rgba(93, 135, 255, 0.15)',
      a: {
        color: theme.palette.primary.main
      }
    }
  }))

  return (
    <>
      {NAV_LINKS.map((link) => (
        <StyledButton
          key={link.to}
          color="inherit"
          variant="text"
          className={pathname === link.to ? 'active' : ''}
        >
          <NavLink to={link.to}>
            {t(link.key)}
            {link.isNew && (
              <Chip
                label={t('Header.Nav.newLabel')}
                size="small"
                sx={{
                  ml: 1,
                  borderRadius: '8px',
                  color: 'primary.main',
                  backgroundColor: 'rgba(93, 135, 255, 0.15)'
                }}
              />
            )}
          </NavLink>
        </StyledButton>
      ))}
    </>
  )
}

export default Navigations
