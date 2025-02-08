// src/components/orders/OrderDetailsDialog.tsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography } from '@mui/material';
import { OrderType, OrderItemType } from 'src/types/apps/order';

interface OrderDetailsDialogProps {
  open: boolean;
  orderDetails: OrderType | null;
  onClose: () => void;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ open, orderDetails, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Order Details #{orderDetails?.id}</DialogTitle>
      <DialogContent>
        {orderDetails && (
          <Box>
            <Typography>
              <strong>Customer Name:</strong> {orderDetails.customerName}
            </Typography>
            <Typography>
              <strong>Customer Phone:</strong> {orderDetails.customerPhoneNumber}
            </Typography>
            <Typography>
              <strong>Delivery Address:</strong> {orderDetails.deliveryAddress}
            </Typography>
            <Typography>
              <strong>Total Price:</strong> {orderDetails.totalPrice}
            </Typography>
            <Typography>
              <strong>Status:</strong> {orderDetails.finalConfirmed ? 'Confirmed' : 'Pending'}
            </Typography>
            <Typography>
              <strong>Created At:</strong> {orderDetails.createdAt}
            </Typography>
            {orderDetails.deliveryFee !== null && (
              <Typography>
                <strong>Delivery Fee:</strong> {orderDetails.deliveryFee}
              </Typography>
            )}
            {orderDetails.taxValue !== null && (
              <Typography>
                <strong>Tax Value:</strong> {orderDetails.taxValue}
              </Typography>
            )}
            {orderDetails.prepTime !== null && (
              <Typography>
                <strong>Preparation Time:</strong> {orderDetails.prepTime} minutes
              </Typography>
            )}
            <Typography variant="h6" mt={2}>
              Items:
            </Typography>
            {orderDetails.items.map((item: OrderItemType, idx: number) => (
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

export default OrderDetailsDialog;
