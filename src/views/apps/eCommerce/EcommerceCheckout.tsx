// src/views/apps/eCommerce/EcommerceCheckout.tsx
import React from 'react';
import { Box } from '@mui/material';
import PageContainer from 'src/components/container/PageContainer';
import ProductCheckout from 'src/components/apps/ecommerce/productCheckout/ProductCheckout';
import ChildCard from 'src/components/shared/ChildCard';
import { useTranslation } from 'react-i18next';

const EcommerceCheckout: React.FC = () => {
  const { t } = useTranslation();
  return (
    <PageContainer title={t('Ecommerce.checkout') as string} description="This is the Checkout page">
      <ChildCard>
        <Box p={3} flexGrow={1}>
          <ProductCheckout />
        </Box>
      </ChildCard>
    </PageContainer>
  );
};

export default EcommerceCheckout;
