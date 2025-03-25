// src/components/orders/OrderCard.tsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { IconEye, IconReceipt, IconCheck } from '@tabler/icons-react';
import { OrderType } from 'src/types/apps/order';
import { formatPhoneNumber } from 'src/utils/formatPhone';

interface OrderCardProps {
  order: OrderType;
  onViewDetails: (orderId: number) => void;
  onViewInvoice: (orderId: number) => void;
  onConfirmClick: (orderId: number) => void;
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onViewDetails, onViewInvoice, onConfirmClick }) => {
  const [blink, setBlink] = useState(false);

  // If order is not confirmed, toggle background color every second.
  useEffect(() => {
    if (!order.finalConfirmed) {
      const intervalId = setInterval(() => {
        setBlink(prev => !prev);
      }, 1000);
      return () => clearInterval(intervalId);
    }
  }, [order.finalConfirmed]);

  return (
    <Box
      sx={{
        mb: 2,
        p: 2,
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: order.finalConfirmed ? '#fff' : (blink ? '#ffcccc' : '#fff')
      }}
    >
      <Typography variant="subtitle1">Order #{order.id}</Typography>
      {order.customerName && (
        <Typography variant="body2">
          <strong>Customer Name:</strong> {order.customerName}
        </Typography>
      )}
      <Typography variant="body2">
        <strong>Customer Phone:</strong> {formatPhoneNumber(order.customerPhone)}
      </Typography>
      {order.deliveryAddress && (
        <Typography variant="body2">Address: {order.deliveryAddress}</Typography>
      )}
      <Typography variant="body2">Total: {order.totalPrice}</Typography>
      <Typography variant="body2">
        Status: {order.finalConfirmed ? 'Confirmed' : 'Pending'}
      </Typography>
      <Typography variant="body2">Created At: {order.createdAt}</Typography>

      <Box sx={{ mt: 1 }}>
        <Tooltip title="View Details">
          <IconButton color="primary" onClick={() => onViewDetails(order.id)}>
            <IconEye size={22} />
          </IconButton>
        </Tooltip>

        {order.finalConfirmed && (
          <Tooltip title="View Invoice">
            <IconButton color="secondary" onClick={() => onViewInvoice(order.id)}>
              <IconReceipt size={22} />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title="Restaurant Confirm">
          <IconButton color="success" onClick={() => onConfirmClick(order.id)}>
            <IconCheck size={22} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};

export default OrderCard;
