import { Box, Container, Grid, Typography, Avatar } from '@mui/material'
import { useTranslation } from 'react-i18next'

const Leadership = () => {
  const { t } = useTranslation()
  const members = t('About.Leadership.members', { returnObjects: true }) as Array<{
    name: string
    role: string
    img: string
  }>

  return (
    <Box py={{ xs: 5, lg: 10 }} bgcolor='background.paper'>
      <Container maxWidth='lg'>
        <Typography
          variant='h4'
          mb={3}
          fontWeight={700}
          sx={{ fontSize: { lg: '40px', xs: '35px' }, textAlign: 'center' }}
        >
          {t('About.Leadership.title')}
        </Typography>
        <Typography variant='body1' mb={6} textAlign='center'>
          {t('About.Leadership.subtitle')}
        </Typography>
        <Grid container spacing={4} justifyContent='center'>
          {members.map((m, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx} textAlign='center'>
              <Avatar
                src={m.img}
                alt={m.name}
                sx={{ width: 120, height: 120, mx: 'auto', mb: 2 }}
              />
              <Typography variant='h6'>{m.name}</Typography>
              <Typography variant='body2'>{m.role}</Typography>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}

export default Leadership
