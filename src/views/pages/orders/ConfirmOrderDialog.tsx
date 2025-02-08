// src/components/orders/ConfirmOrderDialog.tsx
import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, IconButton } from '@mui/material';
import { IconPlus, IconMinus } from '@tabler/icons-react';

interface ConfirmOrderDialogProps {
  open: boolean;
  orderId: number | null;
  onClose: () => void;
  onSubmit: (prepTime: number, deliveryFee: number, taxValue: number) => void;
}

const ConfirmOrderDialog: React.FC<ConfirmOrderDialogProps> = ({ open, orderId, onClose, onSubmit }) => {
  const [prepTime, setPrepTime] = useState<number>(30);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [taxValue, setTaxValue] = useState<number>(0);

  const handleConfirm = () => {
    onSubmit(prepTime, deliveryFee, taxValue);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Confirm Order #{orderId}</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          label="Expected Preparation Time (minutes)"
          type="number"
          value={prepTime}
          onChange={e => setPrepTime(Number(e.target.value))}
          margin="normal"
        />
        <Box display="flex" alignItems="center" marginY={2}>
          <TextField
            label="Delivery Fee"
            type="number"
            value={deliveryFee}
            onChange={e => setDeliveryFee(Number(e.target.value))}
            sx={{ flex: 1 }}
          />
          <IconButton color="primary" onClick={() => setDeliveryFee(prev => prev + 5)}>
            <IconPlus size={22} />
          </IconButton>
          <IconButton color="secondary" onClick={() => setDeliveryFee(prev => (prev >= 5 ? prev - 5 : 0))}>
            <IconMinus size={22} />
          </IconButton>
        </Box>
        <TextField
          fullWidth
          label="Tax Value"
          type="number"
          value={taxValue}
          onChange={e => setTaxValue(Number(e.target.value))}
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Confirm & Send Message
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmOrderDialog;
