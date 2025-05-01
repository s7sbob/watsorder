// src/components/apps/ecommerce/productGrid/ProductPopup.tsx
import React, { useState } from 'react';
import {
  Dialog, DialogContent, Box, Typography,
  IconButton, Button, Stack, TextField, Grow
} from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';

const Transition = React.forwardRef((props, ref) => {
  return (
    <Grow ref={ref} {...props}>
      {(props as { children: React.ReactElement }).children}
    </Grow>
  );
});

type Props = {
  open: boolean;
  onClose: () => void;
  product: any;
  onAddToCart: (product: any, qty: number, notes: string) => void;
};

const ProductPopup: React.FC<Props> = ({ open, onClose, product, onAddToCart }) => {
  const { t } = useTranslation();
  const [qty, setQty] = useState<number>(1);
  const [notes, setNotes] = useState<string>("");

  // Reset qty/notes on open/close
  React.useEffect(() => {
    if (open) {
      setQty(1);
      setNotes("");
    }
  }, [open, product]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Transition as React.ComponentType<any>}
      transitionDuration={{ enter: 300, exit: 200 }}
    >
      <DialogContent sx={{ p: { xs: 1, sm: 4 } }}>
        <Box display="flex" flexDirection="column" alignItems="center" position="relative">
          {/* زر إغلاق */}
          <IconButton aria-label={t('Ecommerce.close') as string} onClick={onClose}
            sx={{ position: 'absolute', top: 5, right: 5 }}>
            <IconX color="#e74c3c" />
          </IconButton>
          {/* صورة واسم المنتج */}
          <Box mb={2} mt={2}>
            <img src={product.photo} alt={product.title} width={80} style={{ borderRadius: '50%' }} />
          </Box>
          <Typography variant="h6" fontWeight={700} align="center">{product.title}</Typography>
          {product.description ? (
            <Typography variant="subtitle2" color="text.secondary" align="center" mb={1}>
              {product.description}
            </Typography>
          ) : (
            <Typography variant="subtitle2" color="text.secondary" align="center" mb={1}>
              {t('Ecommerce.noDescription')}
            </Typography>
          )}
          <Typography align="center" fontWeight={600} color="primary.main" mb={2}>
            {product.price} {t('Ecommerce.currency')}
          </Typography>
          {/* ملاحظات */}
          <TextField
            label={t('Ecommerce.notes')}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={3}
            sx={{ my: 2, fontSize: 18, borderRadius: 2 }}
          />
          {/* اختيار الكمية */}
          <Stack direction="row" alignItems="center" justifyContent="center" sx={{ width: '100%', mb: 2 }}>
            <Button variant="outlined" size="large"
              disabled={qty <= 1}
              onClick={() => setQty(qty - 1)}
              sx={{ minWidth: 48, fontWeight: 700, fontSize: 22, borderRadius: 2 }}
            >-</Button>
            <Box px={3} fontSize={22}>{qty}</Box>
            <Button variant="outlined" size="large"
              onClick={() => setQty(qty + 1)}
              sx={{ minWidth: 48, fontWeight: 700, fontSize: 22, borderRadius: 2 }}
            >+</Button>
          </Stack>

          {/* زر الإضافة للسلة */}
          <Button
            variant="contained"
            fullWidth
            size="large"
            color="warning"
            sx={{ fontWeight: 700, fontSize: 20, borderRadius: 2, mb: 1, bgcolor: '#5d87ff' }}
            onClick={() => onAddToCart(product, qty, notes)}
          >
            {t('Ecommerce.addToCart')}
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default ProductPopup;
