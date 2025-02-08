// src/components/frontend-pages/homepage/Pricing.tsx
import React from 'react';
import { Box, Typography, Container, Grid } from '@mui/material';
import PricingCard from './PricingCard'; // تأكد من إنشاء PricingCard مُعدل للخطط الثلاثة
import PaymentMethods from './PaymentMethods';

const Pricing = () => {
  return (
    <Box sx={{ py: { xs: 5, lg: 11 } }}>
      <Container maxWidth="lg">
        <Grid container spacing={3} alignItems="center" justifyContent="center">
          <Grid item xs={12} lg={7}>
            <Typography
              textAlign="center"
              variant="h4"
              lineHeight={1.4}
              mb={6}
              fontWeight={700}
              sx={{ fontSize: { lg: '40px', xs: '35px' } }}
            >
              Choose the Plan that Fits Your Restaurant Needs
            </Typography>
          </Grid>
        </Grid>

        <PricingCard /> {/* يُعرض هنا PricingCard مع ثلاث خطط أسعار: Regular، Premium، Ultimate */}

        <PaymentMethods /> {/* يمكنك عرض طرق الدفع المتاحة */}
      </Container>
    </Box>
  );
};

export default Pricing;
