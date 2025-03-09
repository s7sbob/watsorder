import { Box, Typography, Container, Grid } from '@mui/material'
import { useTranslation } from 'react-i18next'

const Pricing = () => {
  const { t } = useTranslation()

  return (
    <Box sx={{ py: { xs: 5, lg: 11 } }}>
      <Container maxWidth='lg'>
        <Grid container spacing={3} alignItems='center' justifyContent='center'>
          <Grid item xs={12} lg={7}>
            <Typography
              textAlign='center'
              variant='h4'
              lineHeight={1.4}
              mb={6}
              fontWeight={700}
              sx={{ fontSize: { lg: '40px', xs: '35px' } }}
            >
              {t('HomePage.Pricing.title')}
            </Typography>
          </Grid>
        </Grid>

        {/* يمكنك إضافة PricingCard هنا أو أي مكوّن تسعير آخر */}
      </Container>
    </Box>
  )
}

export default Pricing
