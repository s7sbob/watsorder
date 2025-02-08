// src/components/frontend-pages/homepage/PricingCard.tsx
import React from 'react';
import { Box, Grid, Typography, Button, Paper } from '@mui/material';
import { styled } from '@mui/material/styles';

const plans = [
  {
    title: 'Regular',
    price: '$29/month',
    features: ['Basic Order Management', 'Email Support', 'Limited Customization'],
  },
  {
    title: 'Premium',
    price: '$59/month',
    features: ['Advanced Order Management', 'Priority Support', 'More Customization Options'],
  },
  {
    title: 'Ultimate',
    price: '$99/month',
    features: ['Full Order Automation', '24/7 Premium Support', 'Complete Customization', 'Analytics Dashboard'],
  },
];

const Card = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  borderRadius: theme.spacing(2),
  textAlign: 'center',
  boxShadow: theme.shadows[3],
}));

const PricingCard = () => {
  return (
    <Grid container spacing={3} justifyContent="center">
      {plans.map((plan, index) => (
        <Grid item xs={12} sm={6} md={4} key={index}>
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
                  • {feature}
                </Typography>
              ))}
            </Box>
            <Button variant="contained" color="primary">
              Get Started
            </Button>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

export default PricingCard;
