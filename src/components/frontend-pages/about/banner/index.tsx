import { Box, Container, Grid, Typography, Button } from '@mui/material'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const Banner = () => {
  const { t } = useTranslation()
  return (
    <Box
      bgcolor='primary.light'
      sx={{
        pt: { xs: '40px', lg: '100px' },
        pb: { xs: '40px', lg: '100px' }
      }}
    >
      <Container maxWidth='lg'>
        <Grid container spacing={3} justifyContent='space-between' alignItems='center'>
          <Grid item xs={12} lg={6}>
            <Typography
              variant='h1'
              mb={3}
              lineHeight={1.4}
              fontWeight={700}
              sx={{ fontSize: { xs: '34px', sm: '48px' } }}
            >
              {t('About.Banner.title')}
            </Typography>
            <Typography variant='body1' mb={3}>
              {t('About.Banner.subtitle')}
            </Typography>
            <Button
              variant='contained'
              size='large'
              component={Link}
              to='/auth/register'
            >
              {t('About.C2a.buttons.register')}
            </Button>
          </Grid>
        </Grid>
      </Container>
    </Box>
  )
}

export default Banner
