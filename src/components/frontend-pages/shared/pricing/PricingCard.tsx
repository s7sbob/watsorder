import { Box, Grid, Typography, Button, Paper } from '@mui/material'
import { styled } from '@mui/material/styles'
import { useTranslation } from 'react-i18next'

interface PricingCardProps {
  // دالة تعيد اسم الخطة المختارة
  onPlanChosen: (planType: string) => void
}

// يمكنك تعديل هذه البيانات مباشرة أو إحضارها من الترجمة أيضاً
// في حال أردت النصوص بالكامل من i18n يمكنك تعريفها في en/ar.json
// وتعيين السعر من نفس المكان.
const plans = [
  {
    i18nKey: 'pricingCard.basic', // سنستخدمه للوصول للكلمات
    planType: 'Basic'
  },
  {
    i18nKey: 'pricingCard.standered',
    planType: 'Standered'
  },
  {
    i18nKey: 'pricingCard.otpPlan',
    planType: 'Otp Plan'
  },
  {
    i18nKey: 'pricingCard.golden',
    planType: 'Golden'
  }
]

const Card = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  textAlign: 'center',
  boxShadow: theme.shadows[3]
}))

const PricingCard: React.FC<PricingCardProps> = ({ onPlanChosen }) => {
  const { t } = useTranslation()

  // عند الضغط على الخطة:
  const handleGetStarted = (planType: string) => {
    onPlanChosen(planType) // نعيد اسم الخطة فقط
  }

  return (
    <Grid container spacing={3} justifyContent='center'>
      {plans.map((plan, index) => {
        // جلب البيانات من ملفات الترجمة
        const title = t(`${plan.i18nKey}.title`)
        const price = t(`${plan.i18nKey}.price`)
        const features: string[] = t(`${plan.i18nKey}.features`, { returnObjects: true })

        return (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <Typography variant='h5' fontWeight={700} gutterBottom>
                {title}
              </Typography>
              <Typography variant='h4' color='primary' gutterBottom>
                {price}
              </Typography>
              <Box mb={2}>
                {features.map((feature, i) => (
                  <Typography key={i} variant='body1'>
                    • {feature}
                  </Typography>
                ))}
              </Box>
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
