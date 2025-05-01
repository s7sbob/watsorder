// src/layouts/full/shared/breadcrumb/Breadcrumb.tsx
import React from 'react'
import { Link as RouterLink } from 'react-router-dom'
import {
  Box,
  Avatar,
  Typography,
  Divider,
  Stack,
  useTheme
} from '@mui/material'

interface Crumb { to?: string; title: string }
interface Props {
  items: Crumb[]
  title: string
  logo?: string
  subtitle?: string
}

const Breadcrumb: React.FC<Props> = ({ items, title, logo, subtitle }) => {
  const theme = useTheme()

  return (
    <Box mb={4} textAlign="center">
      {/* Row: logo | title | "About" | subtitle */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="center"
        spacing={1}
        flexWrap="wrap"
        sx={{ mb: 2 }}
      >
        {logo && (
          <>
            <Avatar
              src={`/${logo}`}
              alt={title}
              sx={{ width: 56, height: 56 }}
            />
            <Divider orientation="vertical" flexItem />
          </>
        )}

        <Typography variant="h4" component="h1">
          {title}
        </Typography>

        {subtitle && (
          <>
            <Divider orientation="vertical" flexItem />
            <Typography variant="subtitle2" color="textSecondary" sx={{ fontWeight: 600 }}>
              About
            </Typography>
            <Divider orientation="vertical" flexItem />
            <Typography variant="subtitle2" color="textSecondary">
              {subtitle}
            </Typography>
          </>
        )}
      </Stack>

      {/* standard breadcrumb links below */}
      <Stack
        component="nav"
        direction="row"
        spacing={1}
        justifyContent="center"
        alignItems="center"
        flexWrap="wrap"
      >
        {items.map((crumb, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && (
              <Typography color="textSecondary" variant="body2">
                /
              </Typography>
            )}
            {crumb.to ? (
              <Typography
                component={RouterLink}
                to={crumb.to}
                variant="body2"
                sx={{
                  color: theme.palette.text.secondary,
                  textDecoration: 'none',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                {crumb.title}
              </Typography>
            ) : (
              <Typography variant="body2" color="textPrimary">
                {crumb.title}
              </Typography>
            )}
          </React.Fragment>
        ))}
      </Stack>
    </Box>
  )
}

export default Breadcrumb
