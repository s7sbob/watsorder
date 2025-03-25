// src/components/orders/InvoiceDialog.tsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography } from '@mui/material';
import { OrderType, OrderItemType } from 'src/types/apps/order';

interface InvoiceDialogProps {
  open: boolean;
  invoiceDetails: OrderType | null;
  onClose: () => void;
}

const InvoiceDialog: React.FC<InvoiceDialogProps> = ({ open, invoiceDetails, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Invoice #{invoiceDetails?.id}</DialogTitle>
      <DialogContent>
        {invoiceDetails && (
          <Box>
            <Typography>
              <strong>Customer Phone:</strong> {invoiceDetails.customerPhone}
            </Typography>
            <Typography>
              <strong>Delivery Address:</strong> {invoiceDetails.deliveryAddress}
            </Typography>
            <Typography>
              <strong>Total Price:</strong> {invoiceDetails.totalPrice}
            </Typography>
            <Typography>
              <strong>Status:</strong> {invoiceDetails.finalConfirmed ? 'Confirmed' : 'Pending'}
            </Typography>
            <Typography>
              <strong>Created At:</strong> {invoiceDetails.createdAt}
            </Typography>
            {invoiceDetails.deliveryFee !== null && (
              <Typography>
                <strong>Delivery Fee:</strong> {invoiceDetails.deliveryFee}
              </Typography>
            )}
            {invoiceDetails.taxValue !== null && (
              <Typography>
                <strong>Tax Value:</strong> {invoiceDetails.taxValue}
              </Typography>
            )}
            {invoiceDetails.prepTime !== null && (
              <Typography>
                <strong>Preparation Time:</strong> {invoiceDetails.prepTime} minutes
              </Typography>
            )}
            <Typography variant="h6" mt={2}>
              Items:
            </Typography>
            {invoiceDetails.items.map((item: OrderItemType, idx: number) => (
              <Typography key={idx}>
                {item.quantity} x {item.productName} = {item.price}
              </Typography>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default InvoiceDialog;
