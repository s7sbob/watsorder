// src/components/apps/ecommerce/productCheckout/ProductCheckout.tsx
import React from 'react';
import { sum } from 'lodash';
import { Box, Stack, Button } from '@mui/material';
import AddToCart from '../productCart/AddToCart';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'src/store/Store';
import HorizontalStepper from './HorizontalStepper';
import FirstStep from './FirstStep';
import SecondStep from './SecondStep';
import ThirdStep from './ThirdStep';
import FinalStep from './FinalStep';
import { useNavigate, useParams } from 'react-router-dom';
import { IconArrowBack } from '@tabler/icons-react';

const ProductCheckout: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { storeName } = useParams<{ storeName: string }>(); // جلب storeName من الـ URL
  const checkout = useSelector((state) => state.ecommerceReducer.cart); // جلب المنتجات من السلة
  const steps = [t('Ecommerce.cart'), t('Ecommerce.billingAddress'), t('Ecommerce.payment')];
  const [activeStep, setActiveStep] = React.useState(0);

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    navigate(`/${storeName}`); // العودة لصفحة المتجر باستخدام storeName
  };

  // حساب الإجمالي والخصم بناءً على المنتجات في السلة
  const total = sum(checkout.map((product: any) => product.price * product.qty));
  const Discount = Math.round(total * (5 / 100)); // خصم 5% كمثال

  return (
    <Box>
      <HorizontalStepper
        steps={steps}
        handleReset={handleReset}
        activeStep={activeStep}
        finalStep={<FinalStep />}
      >
        {/* ------------------------------------------- */}
        {/* Step 1 - عربة التسوق */}
        {/* ------------------------------------------- */}
        {activeStep === 0 ? (
          <>
            <Box my={3}>
              <AddToCart /> {/* عرض المنتجات الفعلية من السلة */}
            </Box>
            {checkout.length > 0 ? (
              <>
                <FirstStep total={total} Discount={Discount} />
                <Stack direction={'row'} justifyContent="space-between">
                  <Button
                    color="secondary"
                    variant="contained"
                    disabled={activeStep === 0}
                    onClick={handleBack}
                  >
                    {t('Ecommerce.back')}
                  </Button>
                  <Button variant="contained" onClick={handleNext}>
                    {t('Ecommerce.checkout')}
                  </Button>
                </Stack>
              </>
            ) : (
              <Button variant="contained" onClick={() => navigate(`/${storeName}`)}>
                {t('Ecommerce.backToShop')}
              </Button>
            )}
          </>
        ) : activeStep === 1 ? (
          <>
            {/* ------------------------------------------- */}
            {/* Step 2 - العنوان */}
            {/* ------------------------------------------- */}
            <SecondStep nexStep={handleNext} />
            <FirstStep total={total} Discount={Discount} />
            <Stack direction={'row'} justifyContent="space-between">
              <Button color="inherit" onClick={handleBack}>
                {t('Ecommerce.back')}
              </Button>
              <Button color="inherit" variant="outlined" onClick={handleNext}>
                {t('Ecommerce.selectAddress')}
              </Button>
            </Stack>
          </>
        ) : (
          <>
            {/* ------------------------------------------- */}
            {/* Step 3 - الدفع */}
            {/* ------------------------------------------- */}
            <ThirdStep />
            <FirstStep total={total} Discount={Discount} />
            <Stack direction={'row'} justifyContent="space-between">
              <Button color="inherit" onClick={handleBack}>
                <IconArrowBack /> {t('Ecommerce.back')}
              </Button>
              <Button onClick={handleNext} size="large" variant="contained">
                {t('Ecommerce.completeOrder')}
              </Button>
            </Stack>
          </>
        )}
      </HorizontalStepper>
    </Box>
  );
};

export default ProductCheckout;
