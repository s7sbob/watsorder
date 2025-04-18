import { Box, Container, Typography, Grid, Card, CardContent, Avatar, Stack } from '@mui/material'
import { useTranslation } from 'react-i18next'

const Reviews = () => {
  const { t } = useTranslation()
  const testimonials = t('About.Reviews.testimonials', { returnObjects: true }) as Array<{
    name: string
    text: string
    img: string
  }>

  return (
    <Box py={{ xs: 5, lg: 10 }}>
      <Container maxWidth='lg'>
        <Typography
          variant='h4'
          mb={3}
          fontWeight={700}
          textAlign='center'
          sx={{ fontSize: { lg: '40px', xs: '35px' } }}
        >
          {t('About.Reviews.title')}
        </Typography>
        <Grid container spacing={4}>
          {testimonials.map((r, idx) => (
            <Grid item xs={12} md={6} key={idx}>
              <Card elevation={3}>
                <CardContent>
                  <Stack direction='row' alignItems='center' spacing={2} mb={2}>
                    <Avatar src={r.img} alt={r.name} />
                    <Typography variant='subtitle1' fontWeight={600}>
                      {r.name}
                    </Typography>
                  </Stack>
                  <Typography variant='body2'>{r.text}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}

export default Reviews
