// src/components/apps/ecommerce/productCheckout/FirstStep.tsx
import { Box, Typography, Stack } from '@mui/material';
import React from 'react';
import ChildCard from '../../../shared/ChildCard';
import { useTranslation } from 'react-i18next';

interface Props {
  total: number;
  Discount: number;
}

const FirstStep: React.FC<Props> = ({ total, Discount }) => {
  const { t } = useTranslation();
  return (
    <Box my={3}>
      <ChildCard>
        <Box p={2}>
          <Typography variant="h5" fontWeight={600} mb={3}>
            {t('Ecommerce.orderSummary')}
          </Typography>
          {/* Sub Total */}
          <Stack direction="row" justifyContent="space-between" mb={3}>
            <Typography variant="h6" fontWeight={400}>
              {t('Ecommerce.subTotal')}
            </Typography>
            <Typography variant="h6">
              {total} {t('Ecommerce.currency')}
            </Typography>
          </Stack>
          {/* Discount */}
          <Stack direction="row" justifyContent="space-between" mb={3}>
            <Typography variant="h6" fontWeight={400}>
              {t('Ecommerce.discount')} 5%
            </Typography>
            <Typography variant="h6" color="error">
              -{Discount} {t('Ecommerce.currency')}
            </Typography>
          </Stack>
          {/* Shipping */}
          <Stack direction="row" justifyContent="space-between" mb={3}>
            <Typography variant="h6" fontWeight={400}>
              {t('Ecommerce.shipping')}
            </Typography>
            <Typography variant="h6">{t('Ecommerce.free')}</Typography>
          </Stack>
          {/* Total */}
          <Stack direction="row" justifyContent="space-between" mb={1}>
            <Typography variant="h6">{t('Ecommerce.total')}</Typography>
            <Typography variant="h5" color="success">
              {total - Discount} {t('Ecommerce.currency')}
            </Typography>
          </Stack>
        </Box>
      </ChildCard>
    </Box>
  );
};

export default FirstStep;
