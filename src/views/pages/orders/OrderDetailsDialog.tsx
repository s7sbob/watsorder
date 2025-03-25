// src/components/orders/OrderDetailsDialog.tsx
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography } from '@mui/material';
import { OrderType, OrderItemType } from 'src/types/apps/order';
import { formatPhoneNumber } from 'src/utils/formatPhone';

interface OrderDetailsDialogProps {
  orderDetails: OrderType | null;
  open: boolean;
  onClose: () => void;
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({ orderDetails, open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Order Details #{orderDetails?.id || 'N/A'}</DialogTitle>
      <DialogContent>
        {orderDetails ? (
          <Box>
            <Typography>
              <strong>Customer Name:</strong> {orderDetails.customerName || 'N/A'}
            </Typography>
            <Typography>
              <strong>Customer Phone:</strong> {formatPhoneNumber(orderDetails.customerPhone)}
            </Typography>
            <Typography>
              <strong>Delivery Address:</strong> {orderDetails.deliveryAddress || 'N/A'}
            </Typography>
            <Typography>
              <strong>Total Price:</strong> {orderDetails.totalPrice !== null ? orderDetails.totalPrice : 'N/A'}
            </Typography>
            <Typography>
              <strong>Status:</strong> {orderDetails.finalConfirmed ? 'Confirmed' : 'Pending'}
            </Typography>
            <Typography>
              <strong>Created At:</strong> {orderDetails.createdAt || 'N/A'}
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
            {/* Debug: Show complete order object */}
            <Box mt={2} sx={{ backgroundColor: '#f7f7f7', p: 1, borderRadius: '4px' }}>
              <Typography variant="caption">Debug: Order Object</Typography>
              <pre style={{ fontSize: '0.75rem' }}>
                {JSON.stringify(orderDetails, null, 2)}
              </pre>
            </Box>
          </Box>
        ) : (
          <Typography>No order details available.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default OrderDetailsDialog;
