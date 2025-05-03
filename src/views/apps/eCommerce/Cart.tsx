// src/components/apps/ecommerce/Cart.tsx
import React from 'react';
import { sum } from 'lodash';
import { IconX } from '@tabler/icons-react';
import { Box, Typography, Drawer, IconButton, Button, Stack } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import CartItems from './CartItems'; // مكون لعرض عناصر السلة

type Props = {
  open: boolean;
  onClose: () => void;
};

const Cart: React.FC<Props> = ({ open, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const cart = useSelector((state) => state.ecommerceReducer.cart);
  const { storeName } = useParams<{ storeName: string }>(); // جلب storeName من الـ URL

  const total = sum(cart.map((product: any) => product.price * product.qty));

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{ sx: { maxWidth: '500px', width: '100%' } }}
    >
      <Box display="flex" alignItems="center" p={3} pb={0} justifyContent="space-between">
        <Typography variant="h5" fontWeight={600}>
          {t('Ecommerce.cartItems')}
        </Typography>
        <Box>
          <IconButton
            color="inherit"
            sx={{
              color: (theme) => theme.palette.grey.A200,
            }}
            onClick={onClose}
          >
            <IconX size="1rem" />
          </IconButton>
        </Box>
      </Box>

      {/* محتوى السلة */}
      <Box sx={{ p: 3 }}>
        <CartItems />
      </Box>

      {/* الإجمالي وزر الـ Checkout */}
      <Box px={3} mt={2}>
        {cart.length > 0 ? (
          <>
            <Stack direction="row" justifyContent="space-between" mb={3}>
              <Typography variant="subtitle2" fontWeight={400}>
                {t('Ecommerce.total')}
              </Typography>
              <Typography variant="subtitle2" fontWeight={600}>
                {total} {t('Ecommerce.currency')}
              </Typography>
            </Stack>
            <Button
              fullWidth
              variant="contained"
              color="primary"
              onClick={() => {
                onClose(); // إغلاق الـ Drawer
                navigate(`/store/${storeName}/checkout`); // التوجيه لصفحة الـ Checkout
              }}
            >
              {t('Ecommerce.checkout')}
            </Button>
          </>
        ) : (
          ''
        )}
      </Box>
    </Drawer>
  );
};

export default Cart;
