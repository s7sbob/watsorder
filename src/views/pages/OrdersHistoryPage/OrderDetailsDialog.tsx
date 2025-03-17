import React from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography
} from '@mui/material'
import { OrderType, OrderItemType } from 'src/types/apps/order'

// i18n
import { useTranslation } from 'react-i18next'

interface OrderDetailsDialogProps {
  open: boolean
  orderDetails: OrderType | null
  onClose: () => void
}

const OrderDetailsDialog: React.FC<OrderDetailsDialogProps> = ({
  open,
  orderDetails,
  onClose
}) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>
        {t('Orders.OrderDetailsDialog.title', { orderId: orderDetails?.id ?? '' })}
      </DialogTitle>
      <DialogContent>
        {orderDetails && (
          <Box>
            <Typography>
              <strong>{t('Orders.OrderDetailsDialog.customerName')}:</strong>{' '}
              {orderDetails.customerName}
            </Typography>
            <Typography>
              <strong>{t('Orders.OrderDetailsDialog.customerPhone')}:</strong>{' '}
              {orderDetails.customerPhone}
            </Typography>
            <Typography>
              <strong>{t('Orders.OrderDetailsDialog.deliveryAddress')}:</strong>{' '}
              {orderDetails.deliveryAddress}
            </Typography>
            <Typography>
              <strong>{t('Orders.OrderDetailsDialog.totalPrice')}:</strong>{' '}
              {orderDetails.totalPrice}
            </Typography>
            <Typography>
              <strong>{t('Orders.OrderDetailsDialog.status')}:</strong>{' '}
              {orderDetails.finalConfirmed
                ? t('Orders.OrderDetailsDialog.confirmed')
                : t('Orders.OrderDetailsDialog.pending')}
            </Typography>
            <Typography>
              <strong>{t('Orders.OrderDetailsDialog.createdAt')}:</strong>{' '}
              {orderDetails.createdAt}
            </Typography>
            {orderDetails.deliveryFee !== null && (
              <Typography>
                <strong>{t('Orders.OrderDetailsDialog.deliveryFee')}:</strong>{' '}
                {orderDetails.deliveryFee}
              </Typography>
            )}
            {orderDetails.taxValue !== null && (
              <Typography>
                <strong>{t('Orders.OrderDetailsDialog.taxValue')}:</strong>{' '}
                {orderDetails.taxValue}
              </Typography>
            )}
            {orderDetails.prepTime !== null && (
              <Typography>
                <strong>{t('Orders.OrderDetailsDialog.prepTime')}:</strong>{' '}
                {orderDetails.prepTime} {t('Orders.OrderDetailsDialog.minutes')}
              </Typography>
            )}

            <Typography variant='h6' mt={2}>
              {t('Orders.OrderDetailsDialog.itemsTitle')}
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
        <Button onClick={onClose}>
          {t('Orders.OrderDetailsDialog.buttons.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default OrderDetailsDialog
