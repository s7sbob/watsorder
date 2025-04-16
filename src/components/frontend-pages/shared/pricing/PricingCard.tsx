import { Box, Grid, Typography, Button, Paper } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

interface PricingCardProps {
  onPlanChosen: (selectedPlan: { planType: string; billing: 'monthly' | 'yearly'; price: number }) => void;
}


// تعريف الخطط مع استخدام مفتاح (planKey) لعنوان الخطة ومفاتيح الميزات منفصلة
const plans = [
  {
    planKey: 'pricingCard.otpPlanTitle',
    monthlyPrice: 300,
    yearlyPrice: 3000,
    features: [
      'pricingCard.otpPlan.feature1',
      'pricingCard.otpPlan.feature2',
      'pricingCard.otpPlan.feature3'
    ]
  },
  {
    planKey: 'pricingCard.allFeaturesTitle',
    monthlyPrice: 500,
    yearlyPrice: 5000,
    features: [
      'pricingCard.allFeatures.feature1',
      'pricingCard.allFeatures.feature2',
      'pricingCard.allFeatures.feature3'
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

  return (
    <Box>
      <Grid container spacing={4} justifyContent="center">
        {plans.map((plan, index) => {
          // حساب قيمة التوفير إذا اشترك العميل في الخطة السنوية بدلاً من الدفع الشهري طوال السنة
          const saving = (plan.monthlyPrice * 12) - plan.yearlyPrice
          return (
            <Grid item xs={12} sm={6} md={5} key={index}>
              <Card>
                {/* عرض عنوان الخطة */}
                <Typography variant="h5" fontWeight={700} gutterBottom>
                  {t(plan.planKey)}
                </Typography>

                {/* عرض الميزات */}
                <Box mb={3}>
                  {plan.features.map((featureKey, i) => (
                    <Typography
                      key={i}
                      variant="body1"
                      sx={{
                        mb: 0.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      • {t(featureKey)}
                    </Typography>
                  ))}
                </Box>

                {/* قسم السعر الشهري */}
                <Box mb={2}>
                  <Typography variant="subtitle1">
                    {t('pricingCard.monthly')}
                  </Typography>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {plan.monthlyPrice} EGP
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() =>
                    onPlanChosen({
                      planType: t(plan.planKey),
                      billing: 'monthly',
                      price: plan.monthlyPrice,
                    })
                  }
                  
                  sx={{ mb: 2 }}
                >
                  {t('pricingCard.getStarted')} ({t('pricingCard.monthly')})
                </Button>

                {/* قسم السعر السنوي */}
                <Box mb={1}>
                  <Typography variant="subtitle1">
                    {t('pricingCard.yearly')}
                  </Typography>
                  <Typography variant="h4" color="primary" fontWeight="bold">
                    {plan.yearlyPrice} EGP
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {t('pricingCard.save', { saving })}
                  </Typography>
                </Box>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() =>
                    onPlanChosen({
                      planType: t(plan.planKey),
                      billing: 'yearly',
                      price: plan.yearlyPrice
                    })
                  }
                >
                  {t('pricingCard.getStarted')} ({t('pricingCard.yearly')})
                </Button>
              </Card>
            </Grid>
          )
        })}
      </Grid>
    </Box>
  )
}

export default PricingCard
