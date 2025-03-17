import React, { useEffect, useState } from 'react'
import { Box, Typography, IconButton, Tooltip } from '@mui/material'
import { IconEye, IconReceipt, IconCheck } from '@tabler/icons-react'
import { OrderType } from 'src/types/apps/order'

// i18n
import { useTranslation } from 'react-i18next'

interface OrderCardProps {
  order: OrderType
  onViewDetails: (orderId: number) => void
  onViewInvoice: (orderId: number) => void
  onConfirmClick: (orderId: number) => void
}

const OrderCard: React.FC<OrderCardProps> = ({
  order,
  onViewDetails,
  onViewInvoice,
  onConfirmClick
}) => {
  const { t } = useTranslation()
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    if (!order.finalConfirmed) {
      const intervalId = setInterval(() => {
        setBlink(prev => !prev)
      }, 1000)
      return () => clearInterval(intervalId)
    }
  }, [order.finalConfirmed])

  return (
    <Box
      sx={{
        mb: 2,
        p: 2,
        border: '1px solid #ddd',
        borderRadius: '8px',
        backgroundColor: order.finalConfirmed ? '#fff' : blink ? '#ffcccc' : '#fff'
      }}
    >
      <Typography variant='subtitle1'>
        {t('Orders.OrderCard.orderId', { id: order.id })}
      </Typography>
      {order.customerName && (
        <Typography variant='body2'>
          <strong>{t('Orders.OrderCard.customerName')}:</strong> {order.customerName}
        </Typography>
      )}
      <Typography variant='body2'>
        {t('Orders.OrderCard.phone')}: {order.customerPhone}
      </Typography>
      {order.deliveryAddress && (
        <Typography variant='body2'>
          {t('Orders.OrderCard.address')}: {order.deliveryAddress}
        </Typography>
      )}
      <Typography variant='body2'>
        {t('Orders.OrderCard.total')}: {order.totalPrice}
      </Typography>
      <Typography variant='body2'>
        {t('Orders.OrderCard.status')}:{' '}
        {order.finalConfirmed
          ? t('Orders.OrderCard.statusConfirmed')
          : t('Orders.OrderCard.statusPending')}
      </Typography>
      <Typography variant='body2'>
        {t('Orders.OrderCard.createdAt')}: {order.createdAt}
      </Typography>

      <Box sx={{ mt: 1 }}>
        <Tooltip title={t('Orders.OrderCard.tooltips.viewDetails') as string}>
          <IconButton color='primary' onClick={() => onViewDetails(order.id)}>
            <IconEye size={22} />
          </IconButton>
        </Tooltip>

        {order.finalConfirmed && (
          <Tooltip title={t('Orders.OrderCard.tooltips.viewInvoice') as string}>
            <IconButton color='secondary' onClick={() => onViewInvoice(order.id)}>
              <IconReceipt size={22} />
            </IconButton>
          </Tooltip>
        )}

        <Tooltip title={t('Orders.OrderCard.tooltips.restaurantConfirm') as string}>
          <IconButton color='success' onClick={() => onConfirmClick(order.id)}>
            <IconCheck size={22} />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  )
}

export default OrderCard
