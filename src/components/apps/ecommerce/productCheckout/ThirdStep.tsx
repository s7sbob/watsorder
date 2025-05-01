// src/components/apps/ecommerce/productCheckout/ThirdStep.tsx
import React, { useState, useEffect } from 'react';
import { Box, Grid, Paper, Radio, Stack, Typography, Button, CircularProgress, RadioGroup, FormControlLabel } from '@mui/material';
import Paypal from 'src/assets/images/svgs/paypal.svg';
import payment from 'src/assets/images/products/payment.svg';
import mastercard from 'src/assets/images/svgs/mastercard.svg';
import { useTranslation } from 'react-i18next';
import axios from '../../../../utils/axios';
import { useSelector } from 'src/store/Store';

interface deliveryType {
  id: number;
  titleKey: string;
  descriptionKey: string;
}

interface paymentType {
  value: string;
  titleKey: string;
  descriptionKey: string;
  icons: string;
}

const Delivery: deliveryType[] = [
  {
    id: 1,
    titleKey: 'Ecommerce.freeDelivery',
    descriptionKey: 'Ecommerce.deliveredFriday',
  },
  {
    id: 2,
    titleKey: 'Ecommerce.fastDelivery',
    descriptionKey: 'Ecommerce.deliveredWednesday',
  },
];

const Payment: paymentType[] = [
  {
    value: 'paypal',
    titleKey: 'Ecommerce.payPal',
    descriptionKey: 'Ecommerce.redirectPayPal',
    icons: Paypal,
  },
  {
    value: 'credit_card',
    titleKey: 'Ecommerce.creditDebitCard',
    descriptionKey: 'Ecommerce.supportCards',
    icons: mastercard,
  },
  {
    value: 'cash',
    titleKey: 'Ecommerce.cashOnDelivery',
    descriptionKey: 'Ecommerce.payCash',
    icons: '',
  },
  {
    value: 'paymob',
    titleKey: 'Ecommerce.payMob',
    descriptionKey: 'Ecommerce.redirectPayMob',
    icons: '',
  },
];

// خيارات الدفع داخل PayMob
const PayMobOptions = [
  {
    value: 'card',
    integration_id: '1822501', // Online Card
    iframe_id: '351308', // IFrame للبطاقات البنكية
    labelKey: 'Ecommerce.onlineCard',
  },
  {
    value: 'wallet',
    integration_id: '5076515', // Mobile Wallet
    iframe_id: '351309', // IFrame للمحافظ الإلكترونية
    labelKey: 'Ecommerce.mobileWallet',
  },
];

const ThirdStep: React.FC = () => {
  const { t } = useTranslation();
  const [selectedValue, setSelectedValue] = useState('Ecommerce.freeDelivery');
  const [selectedPayment, setSelectedPayment] = useState('paypal');
  const [selectedPayMobMethod, setSelectedPayMobMethod] = useState('card'); // طريقة الدفع داخل PayMob
  const [paymentKey, setPaymentKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cart = useSelector((state) => state.ecommerceReducer.cart);
  const total = cart.reduce((sum, item: { price: number; qty: number }) => sum + (item.price * item.qty), 0);

  const handleDChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedValue(event.target.value);
  };

  const handlePChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPayment(event.target.value);
    setPaymentKey(null); // Reset payment key when changing payment method
    setError(null); // Reset error
  };

  const handlePayMobMethodChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedPayMobMethod(event.target.value);
    setPaymentKey(null); // Reset payment key when changing PayMob method
    setError(null); // Reset error
  };

  // طلب Payment Key من Backend عند اختيار PayMob
  useEffect(() => {
    if (selectedPayment === 'paymob') {
      setLoading(true);
      setError(null);
      const selectedMethod = PayMobOptions.find(option => option.value === selectedPayMobMethod);
      if (selectedMethod) {
        axios
          .post('/api/paymob/create-payment', {
            total,
            items: cart,
            integration_id: selectedMethod.integration_id, // إرسال integration_id المناسب
            email: 'user@example.com', // يمكنك جلب بيانات المستخدم من الـ Store أو Form
            firstName: 'User',
            lastName: 'Name',
            phone: 'NA',
            apartment: 'NA',
            floor: 'NA',
            street: 'NA',
            building: 'NA',
            postalCode: 'NA',
            city: 'NA',
            country: 'NA',
            state: 'NA',
          })
          .then((response) => {
            setPaymentKey(response.data.paymentKey);
            setLoading(false);
          })
          .catch((error) => {
            console.error('Error fetching payment key:', error);
            setError(error.response?.data?.details || error.message || t('Ecommerce.paymentGatewayError'));
            setLoading(false);
          });
      }
    }
  }, [selectedPayment, selectedPayMobMethod, cart, total, t]);

  return (
    <>
      {/* ------------------------------------------- */}
      {/* Delivery Option */}
      {/* ------------------------------------------- */}
      <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6">{t('Ecommerce.deliveryOption')}</Typography>
        <Grid container spacing={3} mt={1}>
          {Delivery.map((option) => (
            <Grid item lg={6} xs={12} key={option.id}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderColor: selectedValue === option.titleKey ? 'primary.main' : '',
                  backgroundColor: selectedValue === option.titleKey ? 'primary.light' : '',
                }}
              >
                <Stack direction={'row'} alignItems="center" gap={1}>
                  <Radio
                    checked={selectedValue === option.titleKey}
                    onChange={handleDChange}
                    value={option.titleKey}
                    name="radio-buttons"
                    inputProps={{ 'aria-label': t(option.titleKey) as string }}
                  />
                  <Box>
                    <Typography variant="h6">{t(option.titleKey)}</Typography>
                    <Typography variant="subtitle2">{t(option.descriptionKey)}</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Paper>
      {/* ------------------------------------------- */}
      {/* Payment Option */}
      {/* ------------------------------------------- */}
      <Paper variant="outlined" sx={{ p: 3, mt: 4 }}>
        <Typography variant="h6">{t('Ecommerce.paymentOption')}</Typography>
        <Grid container spacing={3} alignItems="center">
          <Grid lg={8} xs={12} item>
            <Grid container spacing={3} mt={2}>
              {Payment.map((option) => (
                <Grid item lg={12} xs={12} key={option.value}>
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      borderColor: selectedPayment === option.value ? 'primary.main' : '',
                      backgroundColor: selectedPayment === option.value ? 'primary.light' : '',
                    }}
                  >
                    <Stack direction={'row'} alignItems="center" gap={1}>
                      <Radio
                        checked={selectedPayment === option.value}
                        onChange={handlePChange}
                        value={option.value}
                        name="radio-buttons"
                        inputProps={{ 'aria-label': t(option.titleKey) as string }}
                      />
                      <Box>
                        <Typography variant="h6">{t(option.titleKey)}</Typography>
                        <Typography variant="subtitle2">{t(option.descriptionKey)}</Typography>
                      </Box>
                      <Box ml="auto">
                        {option.icons ? <img src={option.icons} alt="payment" /> : ''}
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              ))}
            </Grid>
            {/* خيارات دفع PayMob إذا تم اختيار PayMob */}
            {selectedPayment === 'paymob' && (
              <Box mt={3}>
                <Typography variant="subtitle1" fontWeight={600} mb={1}>
                  {t('Ecommerce.selectPayMobMethod')}
                </Typography>
                <RadioGroup
                  row
                  value={selectedPayMobMethod}
                  onChange={handlePayMobMethodChange}
                >
                  {PayMobOptions.map((option) => (
                    <FormControlLabel
                      key={option.value}
                      value={option.value}
                      control={<Radio />}
                      label={t(option.labelKey)}
                    />
                  ))}
                </RadioGroup>
              </Box>
            )}
          </Grid>
          <Grid lg={4} xs={12} item>
            <img src={payment} alt="payment" width={'100%'} />
          </Grid>
        </Grid>
        {/* عرض الـ iframe لـ PayMob إذا تم اختياره وحصلنا على paymentKey */}
        {selectedPayment === 'paymob' && paymentKey && (
          <Box mt={3}>
            <Typography variant="h6" mb={2}>{t('Ecommerce.payMobIframe')}</Typography>
            <Box sx={{ border: '1px solid #ddd', height: '400px', borderRadius: 2, overflow: 'hidden' }}>
              <iframe
                src={`https://accept.paymob.com/api/acceptance/iframes/${
                  PayMobOptions.find(opt => opt.value === selectedPayMobMethod)?.iframe_id
                }?payment_token=${paymentKey}`}
                title="PayMob Payment Gateway"
                width="100%"
                height="100%"
                style={{ border: 'none' }}
              />
            </Box>
          </Box>
        )}
        {selectedPayment === 'paymob' && loading && (
          <Box mt={2} display="flex" alignItems="center" gap={1}>
            <CircularProgress size={20} />
            <Typography>{t('Ecommerce.loadingPaymentGateway')}</Typography>
          </Box>
        )}
        {selectedPayment === 'paymob' && error && !loading && (
          <Typography mt={2} color="error">{error}</Typography>
        )}
      </Paper>
    </>
  );
};

export default ThirdStep;
