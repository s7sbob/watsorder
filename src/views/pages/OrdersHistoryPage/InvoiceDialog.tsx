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

interface InvoiceDialogProps {
  open: boolean
  invoiceDetails: OrderType | null
  onClose: () => void
}

const InvoiceDialog: React.FC<InvoiceDialogProps> = ({ open, invoiceDetails, onClose }) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth='sm'>
      <DialogTitle>
        {t('Orders.InvoiceDialog.title', { orderId: invoiceDetails?.id ?? '' })}
      </DialogTitle>
      <DialogContent>
        {invoiceDetails && (
          <Box>
            <Typography>
              <strong>{t('Orders.InvoiceDialog.customerPhone')}:</strong>{' '}
              {invoiceDetails.customerPhone}
            </Typography>
            <Typography>
              <strong>{t('Orders.InvoiceDialog.deliveryAddress')}:</strong>{' '}
              {invoiceDetails.deliveryAddress}
            </Typography>
            <Typography>
              <strong>{t('Orders.InvoiceDialog.totalPrice')}:</strong>{' '}
              {invoiceDetails.totalPrice}
            </Typography>
            <Typography>
              <strong>{t('Orders.InvoiceDialog.status')}:</strong>{' '}
              {invoiceDetails.finalConfirmed
                ? t('Orders.InvoiceDialog.confirmed')
                : t('Orders.InvoiceDialog.pending')}
            </Typography>
            <Typography>
              <strong>{t('Orders.InvoiceDialog.createdAt')}:</strong> {invoiceDetails.createdAt}
            </Typography>
            {invoiceDetails.deliveryFee !== null && (
              <Typography>
                <strong>{t('Orders.InvoiceDialog.deliveryFee')}:</strong>{' '}
                {invoiceDetails.deliveryFee}
              </Typography>
            )}
            {invoiceDetails.taxValue !== null && (
              <Typography>
                <strong>{t('Orders.InvoiceDialog.taxValue')}:</strong>{' '}
                {invoiceDetails.taxValue}
              </Typography>
            )}
            {invoiceDetails.prepTime !== null && (
              <Typography>
                <strong>{t('Orders.InvoiceDialog.prepTime')}:</strong>{' '}
                {invoiceDetails.prepTime} {t('Orders.InvoiceDialog.minutes')}
              </Typography>
            )}

            <Typography variant='h6' mt={2}>
              {t('Orders.InvoiceDialog.itemsTitle')}
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
        <Button onClick={onClose}>
          {t('Orders.InvoiceDialog.buttons.close')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default InvoiceDialog
