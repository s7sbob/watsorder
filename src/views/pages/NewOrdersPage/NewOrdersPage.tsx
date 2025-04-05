// src/pages/NewOrdersPage.tsx

import React, { useEffect, useState, useRef } from 'react'
import { Box, Typography, TextField, InputAdornment, Grid } from '@mui/material'
import { IconSearch } from '@tabler/icons-react'
import { useSelector, useDispatch } from 'react-redux'
import { AppState, AppDispatch } from 'src/store/Store'
import socket from 'src/socket'
import axiosServices from 'src/utils/axios'
import OrdersColumn from './OrdersColumn'
import OrderDetailsDialog from './OrderDetailsDialog'
import InvoiceDialog from './InvoiceDialog'
import ConfirmOrderDialog from './ConfirmOrderDialog'
import { OrderType } from 'src/types/apps/order'
import { fetchConfirmedOrders, confirmOrderByRestaurant } from 'src/store/apps/orders/OrderSlice'

// الترجمة
import { useTranslation } from 'react-i18next'

const NewOrdersPage: React.FC = () => {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()

  // نأخذ الطلبات كلّها من confirmedOrders (والتي قد تكون finalConfirmed=false أو true)
  const { confirmedOrders, loading, error } = useSelector((state: AppState) => state.order)

  // بحث
  const [searchTerm, setSearchTerm] = useState('')

  // حوارات
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [orderDetails, setOrderDetails] = useState<OrderType | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [invoiceDetails, setInvoiceDetails] = useState<OrderType | null>(null)

  // للصوت عند ورود طلب جديد
  const audioRef = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
  }, [])

  // Socket
  useEffect(() => {
    const handleNewOrder = (data: OrderType) => {
      console.log('New order event received:', data)
      dispatch(fetchConfirmedOrders())
      triggerAlarm() // يتم تشغيل الصوت في البداية عند ورود طلب جديد
    }

    const handleOrderConfirmed = (data: { orderId: number }) => {
      console.log('Order Confirmed event received:', data)
      dispatch(fetchConfirmedOrders())
    }

    socket.on('newOrder', handleNewOrder)
    socket.on('orderConfirmed', handleOrderConfirmed)

    console.log('Socket listeners added.')
    return () => {
      socket.off('newOrder', handleNewOrder)
      socket.off('orderConfirmed', handleOrderConfirmed)
    }
  }, [dispatch])

  const triggerAlarm = () => {
    if (navigator.vibrate) {
      navigator.vibrate(200)
    }
    if (audioRef.current) {
      audioRef.current.loop = true
      audioRef.current.play().catch(err => console.error('Error playing sound:', err))
    }
  }

  // جلب الطلبات عند دخول الصفحة
  useEffect(() => {
    dispatch(fetchConfirmedOrders())
  }, [dispatch])

  // دالة للتحقق إذا كان التاريخ هو تاريخ اليوم
  function isToday(dateString: string | undefined): boolean {
    if (!dateString) return false
    const dateObj = new Date(dateString)
    const now = new Date()
    return dateObj.toLocaleDateString() === now.toLocaleDateString()
  }

  // فلترة الطلبات:
  // - Accepted (Today): finalConfirmed = true + تاريخ اليوم
  // - New (Today): finalConfirmed = false + تاريخ اليوم
  const todaysAccepted = confirmedOrders.filter(
    o => o.finalConfirmed === true && isToday(o.createdAt)
  )
  const todaysNew = confirmedOrders.filter(
    o => o.finalConfirmed === false && isToday(o.createdAt)
  )

  // فلترة البحث
  const searchFilter = (order: OrderType) => {
    const phoneMatch = order.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase())
    const addressMatch =
      order.deliveryAddress &&
      order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase())
    return phoneMatch || addressMatch
  }

  const filteredAccepted = todaysAccepted.filter(searchFilter)
  const filteredNew = todaysNew.filter(searchFilter)

  // التحكم في الصوت: الصوت يبقى شغال طالما يوجد طلب غير مؤكد (في العمود "New")
  useEffect(() => {
    const unconfirmedCount = confirmedOrders.filter((o: OrderType) => o.finalConfirmed === false).length;
    if (unconfirmedCount > 0) {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.loop = true;
        audioRef.current.play().catch(err => console.error('Error playing sound:', err));
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    }
  }, [confirmedOrders]);

  // Handlers
  const handleViewDetails = async (orderId: number) => {
    try {
      const res = await axiosServices.get<OrderType>(`/api/orders/${orderId}`)
      setOrderDetails(res.data)
      setDetailsDialogOpen(true)
    } catch (error) {
      console.error('Error fetching order details', error)
    }
  }

  const handleViewInvoice = async (orderId: number) => {
    try {
      const res = await axiosServices.get<OrderType>(`/api/orders/${orderId}`)
      setInvoiceDetails(res.data)
      setInvoiceDialogOpen(true)
    } catch (error) {
      console.error('Error fetching invoice details:', error)
    }
  }

  const handleConfirmClick = (orderId: number) => {
    setSelectedOrderId(orderId)
  }

  const handleConfirmSubmit = async (prepTime: number, deliveryFee: number, taxValue: number) => {
    if (!selectedOrderId) return
    await dispatch(
      confirmOrderByRestaurant({
        orderId: selectedOrderId,
        prepTime,
        deliveryFee,
        taxValue
      })
    )
    setSelectedOrderId(null)
  }

  if (loading) return <div>{t('Orders.NewOrdersPage.loading')}</div>
  if (error) return <div>{t('Orders.NewOrdersPage.error', { error })}</div>

  return (
    <Box p={3}>
      <Typography variant='h4' gutterBottom>
        {t('Orders.NewOrdersPage.title')}
      </Typography>

      {/* شريط البحث */}
      <Box mb={3}>
        <TextField
          placeholder={t('Orders.NewOrdersPage.searchPlaceholder') ?? ''}
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position='end'>
                <IconSearch size={16} />
              </InputAdornment>
            )
          }}
        />
      </Box>

      <Grid container spacing={3}>
        {/* العمود الأيسر: Accepted (Today) */}
        <Grid item xs={12} md={6}>
          <OrdersColumn
            title='Accepted (Today)'
            orders={filteredAccepted}
            onViewDetails={handleViewDetails}
            onViewInvoice={handleViewInvoice}
            onConfirmClick={handleConfirmClick}
          />
        </Grid>

        {/* العمود الأيمن: New (Today) */}
        <Grid item xs={12} md={6}>
          <OrdersColumn
            title='New (Today)'
            orders={filteredNew}
            onViewDetails={handleViewDetails}
            onViewInvoice={handleViewInvoice}
            onConfirmClick={handleConfirmClick}
          />
        </Grid>
      </Grid>

      {/* حوار التفاصيل */}
      <OrderDetailsDialog
        open={detailsDialogOpen}
        orderDetails={orderDetails}
        onClose={() => setDetailsDialogOpen(false)}
      />

      {/* حوار الفاتورة */}
      <InvoiceDialog
        open={invoiceDialogOpen}
        invoiceDetails={invoiceDetails}
        onClose={() => setInvoiceDialogOpen(false)}
      />

      {/* حوار التأكيد */}
      <ConfirmOrderDialog
        open={selectedOrderId !== null}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onSubmit={handleConfirmSubmit}
      />
    </Box>
  )
}

export default NewOrdersPage
