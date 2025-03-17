// src/components/frontend-pages/shared/pricing/PricingCard.tsx

import { Box, Grid, Typography, Button, Paper } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

interface PricingCardProps {
  // دالة تُستدعى عند اختيار الخطة
  onPlanChosen: (planType: string) => void
}

// حددنا خطتين فقط
const plans = [
  {
    i18nKey: 'pricingCard.otpPlan',
    planType: 'OTP Plan',
    price: 500,            // السعر 500
    features: [
      'All OTP features', 
      'Up to X messages', 
      '3 days free trial'
    ]
  },
  {
    i18nKey: 'pricingCard.allFeatures',
    planType: 'All Features',
    price: 700,           // السعر 700
    features: [
      'All advanced features', 
      'Unlimited messages', 
      '3 days free trial'
    ]
  }
]

const Card = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(4),
  borderRadius: theme.spacing(2),
  textAlign: 'center',
  boxShadow: theme.shadows[3],
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'space-between',
  height: '100%'
}))

const PricingCard: React.FC<PricingCardProps> = ({ onPlanChosen }) => {
  const { t } = useTranslation()

  const handleGetStarted = (planType: string) => {
    onPlanChosen(planType)
  }

  return (
    <Grid container spacing={4} justifyContent='center'>
      {plans.map((plan, index) => {
        return (
          <Grid item xs={12} sm={6} md={5} key={index}>
            <Card>
              {/* اسم الخطة */}
              <Typography variant='h5' fontWeight={700} gutterBottom>
                {plan.planType}
              </Typography>

              {/* السعر */}
              <Box mb={2}>
                <Typography variant='h4' color='primary' fontWeight='bold'>
                  {plan.price} EGP
                </Typography>

              </Box>

              {/* الميزات */}
              <Box mb={3}>
                {plan.features.map((feature, i) => (
                  <Typography
                    key={i}
                    variant='body1'
                    sx={{ mb: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    • {feature}
                  </Typography>
                ))}
              </Box>

              {/* زر الاختيار */}
              <Button variant='contained' color='primary' onClick={() => handleGetStarted(plan.planType)}>
                {t('pricingCard.getStarted')}
              </Button>
            </Card>
          </Grid>
        )
      })}
    </Grid>
  )
}

export default PricingCard
