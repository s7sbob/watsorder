// src/components/frontend-pages/shared/pricing/PricingCard.tsx
import { Box, Grid, Typography, Button, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';
import axiosServices from 'src/utils/axios';

interface PricingCardProps {
  sessionId: number;
  onPlanChosen: (sessionId: number) => void;
}

const plans = [
  {
    title: 'Basic',
    price: '700£/month\n7700£/year',
    features: ['', 'Menu Bot', 'Automation', ''],
    planType: 'Basic'
  },
  {
    title: 'Standered',
    price: '1000£/month\n11000£/year',
    features: ['Menu Bot', 'Automation', 'Orders Api Integration', ''],
    planType: 'Standered'
  },
  {
    title: 'Otp Plan',
    price: '500£/month\n5000£/year',
    features: ['', 'Otp Api', '', ''],
    planType: 'Otp Plan'
  },
  {
    title: 'Golden',
    price: '1500£/month\n15000£/year',
    features: ['Menu Bot', 'Automation', 'Orders Api Integration', 'Otp Api'],
    planType: 'Golden'
  },
];

const Card = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  textAlign: 'center',
  boxShadow: theme.shadows[3],
}));

const PricingCard: React.FC<PricingCardProps> = ({ sessionId, onPlanChosen }) => {

  // دالة لاستدعاء API اختيار الخطة باستخدام sessionId الممرر
  const handleGetStarted = async (planType: string) => {
    try {
      // افترض أن مدة الاشتراك سنوية؛ قم بتعديل التاريخ كما تريد
      await axiosServices.post(`/api/sessions/${sessionId}/choose-plan`, {
        planType,
      });
      // بعد اختيار الخطة، يتم استدعاء onPlanChosen لتحديث الحالة في الصفحة الأم
      onPlanChosen(sessionId);
      // يمكنك التوجيه أيضًا لصفحة تعليمات الدفع إذا رغبت:
      // navigate('/payment-instructions');
    } catch (error) {
      console.error('Error choosing plan:', error);
      alert('Error choosing plan.');
    }
  };

  return (
    <Grid container spacing={3} justifyContent="center">
      {plans.map((plan, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card>
            <Typography variant="h5" fontWeight={700} gutterBottom>
              {plan.title}
            </Typography>
            <Typography variant="h4" color="primary" gutterBottom>
              {plan.price}
            </Typography>
            <Box mb={2}>
              {plan.features.map((feature, i) => (
                <Typography key={i} variant="body1">
                  <span style={{ color: 'white' }}>*</span> {feature}
                </Typography>
              ))}
            </Box>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleGetStarted(plan.planType)}
            >
              Get Started
            </Button>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default PricingCard;
