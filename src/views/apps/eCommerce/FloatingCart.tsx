// src/components/apps/ecommerce/FloatingCart.tsx
import React from 'react';
import { Box, Typography, Button, Slide, IconButton } from '@mui/material';
import { useSelector } from 'src/store/Store';
import { useTranslation } from 'react-i18next';
import { IconX } from '@tabler/icons-react';

type Props = {
  visible: boolean;
  onClose: () => void;
  onViewCart: () => void; // إضافة prop لفتح الـ Side Drawer
};

const FloatingCart: React.FC<Props> = ({ visible, onClose, onViewCart }) => {
  const { t } = useTranslation();
  const { cart } = useSelector((state) => state.ecommerceReducer);

  // حساب الإجمالي
  const totalItems = cart.length;
  const totalPrice = cart.reduce((sum, item: any) => sum + (item.price * item.qty), 0);

  return (
    <Slide direction="up" in={visible} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#fff',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.1)',
          padding: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 1000,
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {t('Ecommerce.cartItems')}: {totalItems}
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            {t('Ecommerce.total')}: {totalPrice} {t('Ecommerce.currency')}
          </Typography>
        </Box>
        <Box>
          <Button
            variant="contained"
            sx={{ backgroundColor: '#5d87ff', color: '#fff', mr: 1, borderRadius: 2 }}
            onClick={onViewCart} // فتح الـ Side Drawer
          >
            {t('Ecommerce.viewCart')}
          </Button>
          <IconButton onClick={onClose} size="small" sx={{ ml: 1 }}>
            <IconX size={18} />
          </IconButton>
        </Box>
      </Box>
    </Slide>
  );
};

export default FloatingCart;
