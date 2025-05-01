// src/components/apps/ecommerce/productCheckout/FinalStep.tsx
import React from 'react';
import { Box, Typography } from '@mui/material';
import payment from 'src/assets/images/products/payment-complete.gif';
import { useTranslation } from 'react-i18next';

const FinalStep: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Box my={3}>
      <Box textAlign="center" p={3}>
        <Typography variant="h5">{t('Ecommerce.thankYou')}</Typography>
        <Typography variant="h6" mt={1} mb={4} color="primary">
          {t('Ecommerce.orderId')}: 3fa7-69e1-79b4-dbe0d35f5f5d
        </Typography>
        <img src={payment} alt="payment" width="300" />
        <br />
        <br />
        <Typography variant="body2">
          {t('Ecommerce.notification')}
        </Typography>
      </Box>
    </Box>
  );
};

export default FinalStep;
