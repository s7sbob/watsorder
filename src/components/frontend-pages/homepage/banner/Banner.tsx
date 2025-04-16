import React from 'react'
import {
  Box,
  Container,
  Grid,
  Typography,
  Stack,
  AvatarGroup,
  Avatar,
  Button,
  Dialog,
  DialogActions,
  DialogContent
} from '@mui/material'

import iconPlay from 'src/assets/images/frontend-pages/homepage/icon-play.svg'
import user1 from 'src/assets/images/profile/user-1.jpg'
import user2 from 'src/assets/images/profile/user-2.jpg'
import user3 from 'src/assets/images/profile/user-3.jpg'

import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { AppState } from 'src/store/Store'
import { jwtDecode } from 'jwt-decode'

interface DecodedToken {
  exp: number;
  [key: string]: any;
}

const Banner = () => {
  const { t } = useTranslation()
  const [open, setOpen] = React.useState(false)
  const navigate = useNavigate()
  const token = useSelector((state: AppState) => state.auth.token)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  // دالة التحقق من التوكن والتحويل
  const handleRestaurantLoginClick = () => {
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token)
        const isExpired = decoded.exp * 1000 < Date.now()

        if (!isExpired) {
          navigate('/apps/sessions')
          return
        }
      } catch (error) {
        console.error('Invalid token:', error)
      }
    }
    navigate('/auth/login')
  }

  return (
    <Box bgcolor='primary.light' pt={7}>
      <Container sx={{ maxWidth: '1400px !important', position: 'relative' }}>
        <Grid container spacing={3} justifyContent='center' mb={4}>
          <Grid item xs={12} lg={7} textAlign='center'>
            <Typography
              variant='h1'
              fontWeight={700}
              lineHeight='1.2'
              sx={{ fontSize: { xs: '40px', sm: '56px' } }}
            >
              {t('HomePage.Banner.mainTitle')}{' '}
              <Typography
                variant='h1'
                component='span'
                color='primary.main'
                fontWeight={700}
                sx={{ fontSize: { xs: '40px', sm: '56px' } }}
              >
                {t('HomePage.Banner.mainTitleSpan')}
              </Typography>
            </Typography>

            <Stack my={3} direction={{ xs: 'column', sm: 'row' }} spacing='20px' alignItems='center' justifyContent='center'>
              <AvatarGroup>
                <Avatar alt='User 1' src={user1} sx={{ width: 40, height: 40 }} />
                <Avatar alt='User 2' src={user2} sx={{ width: 40, height: 40 }} />
                <Avatar alt='User 3' src={user3} sx={{ width: 40, height: 40 }} />
              </AvatarGroup>
              <Typography variant='h6' fontWeight={500}>
                {t('HomePage.Banner.joinMessage')}
              </Typography>
            </Stack>

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems='center'
              spacing={3}
              mb={4}
              justifyContent='center'
            >
              {/* زرار تسجيل دخول المطعم مع التحقق من التوكن */}
              <Button color='primary' size='large' variant='contained' onClick={handleRestaurantLoginClick}>
                {t('HomePage.Banner.loginButton')}
              </Button>

              <Button
                variant='text'
                color='inherit'
                onClick={handleClickOpen}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  color: 'text.primary',
                  fontWeight: 500,
                  fontSize: '15px',
                  '&:hover': { color: 'primary.main' }
                }}
              >
                <img src={iconPlay} alt='play icon' width={40} height={40} />
                {t('HomePage.Banner.seeHowItWorks')}
              </Button>

              <Dialog open={open} onClose={handleClose} fullWidth maxWidth='sm'>
                <DialogContent>
                  <iframe
                    width='800'
                    height='500'
                    src='https://www.youtube.com/embed/P94DBd1hJkw?si=WLnH9g-KAdDJkUZN'
                    title='YouTube video player'
                    allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                    allowFullScreen
                  ></iframe>
                </DialogContent>
                <DialogActions>
                  <Button onClick={handleClose} autoFocus>
                    {t('HomePage.Banner.closeButton')}
                  </Button>
                </DialogActions>
              </Dialog>
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default Banner
