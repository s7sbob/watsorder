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
import { useTranslation } from 'react-i18next'

const NewOrdersPage: React.FC = () => {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()
  const { confirmedOrders, loading, error } = useSelector((state: AppState) => state.order)
  
  const [searchTerm, setSearchTerm] = useState('')

  // Dialogs and details state
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)
  const [orderDetails, setOrderDetails] = useState<OrderType | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [invoiceDetails, setInvoiceDetails] = useState<OrderType | null>(null)

  // Initialize audio for notification
  const audioRef = useRef<HTMLAudioElement | null>(null)
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
  }, [])

  // Socket events
  useEffect(() => {
    const handleNewOrder = (data: OrderType) => {
      console.log('New order event received:', data)
      dispatch(fetchConfirmedOrders())
      triggerAlarm()
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

  // Fetch orders when page loads
  useEffect(() => {
    dispatch(fetchConfirmedOrders())
  }, [dispatch])

  // Helper: Check if date is today
  function isToday(dateString: string | undefined): boolean {
    if (!dateString) return false
    const dateObj = new Date(dateString)
    const now = new Date()
    return dateObj.toLocaleDateString() === now.toLocaleDateString()
  }

  // Filtering orders:
  // - Accepted (Today): finalConfirmed = true + today's date
  // - New: finalConfirmed = false (all new orders regardless of date)
  const todaysAccepted = confirmedOrders.filter(
    o => o.finalConfirmed === true && isToday(o.createdAt)
  )
  const newOrders = confirmedOrders.filter(o => o.finalConfirmed === false)

  // Apply search filter to both lists
  const searchFilter = (order: OrderType) => {
    const phoneMatch = order.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase())
    const addressMatch =
      order.deliveryAddress &&
      order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase())
    return phoneMatch || addressMatch
  }
  const filteredAccepted = todaysAccepted.filter(searchFilter)
  const filteredNew = newOrders.filter(searchFilter)

  // Control alarm sound based on new orders count
  useEffect(() => {
    const unconfirmedCount = confirmedOrders.filter((o: OrderType) => o.finalConfirmed === false).length
    if (unconfirmedCount > 0) {
      if (audioRef.current && audioRef.current.paused) {
        audioRef.current.loop = true
        audioRef.current.play().catch(err => console.error('Error playing sound:', err))
      }
    } else {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current.currentTime = 0
      }
    }
  }, [confirmedOrders])

  // Handlers for order actions
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

      {/* Search bar */}
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
        {/* Left column: Accepted (Today) */}
        <Grid item xs={12} md={6}>
          <OrdersColumn
            title='Accepted (Today)'
            orders={filteredAccepted}
            onViewDetails={handleViewDetails}
            onViewInvoice={handleViewInvoice}
            onConfirmClick={handleConfirmClick}
          />
        </Grid>

        {/* Right column: New (all new orders) */}
        <Grid item xs={12} md={6}>
          <OrdersColumn
            title='New'
            orders={filteredNew}
            onViewDetails={handleViewDetails}
            onViewInvoice={handleViewInvoice}
            onConfirmClick={handleConfirmClick}
          />
        </Grid>
      </Grid>

      {/* Order Details Dialog */}
      <OrderDetailsDialog
        open={detailsDialogOpen}
        orderDetails={orderDetails}
        onClose={() => setDetailsDialogOpen(false)}
      />

      {/* Invoice Dialog */}
      <InvoiceDialog
        open={invoiceDialogOpen}
        invoiceDetails={invoiceDetails}
        onClose={() => setInvoiceDialogOpen(false)}
      />

      {/* Confirm Order Dialog */}
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
