// src/components/frontend-pages/shared/pricing/PricingCard.tsx

import { Box, Grid, Typography, Button, Paper } from '@mui/material'
import { styled } from '@mui/material/styles'

interface PricingCardProps {
  // دالة تعيد اسم الخطة المختارة
  onPlanChosen: (planType: string) => void
}

const plans = [
  {
    title: 'Basic',
    price: '700£/month\n7700£/year',
    features: ['Menu Bot', 'Automation'],
    planType: 'Basic'
  },
  {
    title: 'Standered',
    price: '1000£/month\n11000£/year',
    features: ['Menu Bot', 'Automation', 'Orders Api Integration'],
    planType: 'Standered'
  },
  {
    title: 'Otp Plan',
    price: '500£/month\n5000£/year',
    features: ['Otp Api'],
    planType: 'Otp Plan'
  },
  {
    title: 'Golden',
    price: '1500£/month\n15000£/year',
    features: ['Menu Bot', 'Automation', 'Orders Api Integration', 'Otp Api'],
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
  // عند الضغط على الخطة:
  const handleGetStarted = (planType: string) => {
    onPlanChosen(planType) // نعيد اسم الخطة فقط
  }

  return (
    <Grid container spacing={3} justifyContent='center'>
      {plans.map((plan, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card>
            <Typography variant='h5' fontWeight={700} gutterBottom>
              {plan.title}
            </Typography>
            <Typography variant='h4' color='primary' gutterBottom>
              {plan.price}
            </Typography>
            <Box mb={2}>
              {plan.features.map((feature, i) => (
                <Typography key={i} variant='body1'>
                  • {feature}
                </Typography>
              ))}
            </Box>
            <Button
              variant='contained'
              color='primary'
              onClick={() => handleGetStarted(plan.planType)}
            >
              Get Started
            </Button>
          </Card>
        </Grid>
      ))}
    </Grid>
  )
}

export default PricingCard
