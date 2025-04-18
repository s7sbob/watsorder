import { Box, Container, Grid, Typography, Card, CardContent, Button, List, ListItem } from '@mui/material'
import { useTranslation } from 'react-i18next'

const Pricing = () => {
  const { t } = useTranslation()
  const plans = t('About.Pricing.plans', { returnObjects: true }) as Array<{
    name: string
    price: string
    features: string[]
  }>

  return (
    <Box py={{ xs: 5, lg: 11 }} bgcolor='background.paper'>
      <Container maxWidth='lg'>
        <Typography
          variant='h4'
          textAlign='center'
          mb={6}
          fontWeight={700}
          sx={{ fontSize: { lg: '40px', xs: '35px' } }}
        >
          {t('About.Pricing.title')}
        </Typography>
        <Grid container spacing={4} justifyContent='center'>
          {plans.map((p, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Card>
                <CardContent>
                  <Typography variant='h6' gutterBottom>
                    {p.name}
                  </Typography>
                  <Typography variant='h4' mb={2}>
                    {p.price}
                  </Typography>
                  <List dense>
                    {p.features.map((f, i) => (
                      <ListItem key={i}>
                        <Typography variant='body2'>{f}</Typography>
                      </ListItem>
                    ))}
                  </List>
                  <Button variant='contained' fullWidth>
                    {t('About.C2a.buttons.register')}
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  )
}

export default Pricing
