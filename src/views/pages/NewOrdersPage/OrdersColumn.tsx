import React from 'react'
import { Typography, Paper } from '@mui/material'
import OrderCard from './OrderCard'
import { OrderType } from 'src/types/apps/order'

// الترجمة
import { useTranslation } from 'react-i18next'

interface OrdersColumnProps {
  title: string
  orders: OrderType[]
  onViewDetails: (orderId: number) => void
  onViewInvoice: (orderId: number) => void
  onConfirmClick: (orderId: number) => void
}

const OrdersColumn: React.FC<OrdersColumnProps> = ({
  title,
  orders,
  onViewDetails,
  onViewInvoice,
  onConfirmClick
}) => {
  const { t } = useTranslation()

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant='h6' sx={{ mb: 2 }}>
        {title} <span style={{ color: '#f90' }}>({orders.length})</span>
      </Typography>
      {orders.length === 0 ? (
        <Typography>{t('Orders.OrdersColumn.noOrders')}</Typography>
      ) : (
        orders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onViewDetails={onViewDetails}
            onViewInvoice={onViewInvoice}
            onConfirmClick={onConfirmClick}
          />
        ))
      )}
    </Paper>
  )
}

export default OrdersColumn
