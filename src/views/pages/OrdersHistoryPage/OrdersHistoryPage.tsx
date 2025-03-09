// src/pages/OrdersHistoryPage.tsx

import React, { useEffect, useState } from 'react'
import { Box, Typography, TextField, InputAdornment, Paper, Button } from '@mui/material'
import { IconSearch } from '@tabler/icons-react'
import { DesktopDatePicker } from '@mui/x-date-pickers/DesktopDatePicker'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import dayjs, { Dayjs } from 'dayjs'
import { useSelector, useDispatch } from 'react-redux'
import { AppState, AppDispatch } from 'src/store/Store'
import socket from 'src/socket'
import axiosServices from 'src/utils/axios'
import OrdersColumn from './OrdersColumn'
import OrderDetailsDialog from './OrderDetailsDialog'
import InvoiceDialog from './InvoiceDialog'
import { OrderType } from 'src/types/apps/order'
import { fetchConfirmedOrders } from 'src/store/apps/orders/OrderSlice'

// i18n
import { useTranslation } from 'react-i18next'

const OrdersHistoryPage: React.FC = () => {
  const { t } = useTranslation()
  const dispatch = useDispatch<AppDispatch>()
  const { orders, loading, error } = useSelector((state: AppState) => state.order)

  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState<Dayjs | null>(null)
  const [endDate, setEndDate] = useState<Dayjs | null>(null)
  const [page, setPage] = useState(1)
  const rowsPerPage = 25

  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [orderDetails, setOrderDetails] = useState<OrderType | null>(null)
  const [invoiceDetails, setInvoiceDetails] = useState<OrderType | null>(null)

  // Socket
  useEffect(() => {
    const handleOrderConfirmed = (data: { orderId: number }) => {
      console.log('Order Confirmed in history page:', data)
      dispatch(fetchConfirmedOrders())
    }
    socket.on('orderConfirmed', handleOrderConfirmed)
    return () => {
      socket.off('orderConfirmed', handleOrderConfirmed)
    }
  }, [dispatch])

  // جلب كل الطلبات
  useEffect(() => {
    dispatch(fetchConfirmedOrders())
  }, [dispatch])

  // 1) فلترة الطلبات المقبولة فقط
  const acceptedOrders = orders.filter(o => o.finalConfirmed)

  // 2) فلترة بالبحث
  const filteredBySearch = acceptedOrders.filter(order => {
    const phoneMatch = order.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase())
    const addressMatch =
      order.deliveryAddress &&
      order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase())
    return phoneMatch || addressMatch
  })

  // 3) فلترة بالتواريخ
  const filteredByDate = filteredBySearch.filter(order => {
    const createdAt = dayjs(order.createdAt)
    if (startDate && createdAt.isBefore(startDate, 'day')) {
      return false
    }
    if (endDate && createdAt.isAfter(endDate, 'day')) {
      return false
    }
    return true
  })

  // 4) التجزئة (Pagination)
  const totalRows = filteredByDate.length
  const totalPages = Math.ceil(totalRows / rowsPerPage)
  const currentPage = page > totalPages && totalPages !== 0 ? totalPages : page
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedOrders = filteredByDate.slice(startIndex, endIndex)

  useEffect(() => {
    setPage(1)
  }, [searchTerm, startDate, endDate])

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

  const handlePageChange = (direction: 'next' | 'prev') => {
    if (direction === 'next' && currentPage < totalPages) {
      setPage(prev => prev + 1)
    } else if (direction === 'prev' && currentPage > 1) {
      setPage(prev => prev - 1)
    }
  }

  if (loading) return <div>{t('Orders.HistoryPage.loading')}</div>
  if (error) return <div>{t('Orders.HistoryPage.error', { error })}</div>

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box p={3}>
        <Typography variant='h4' gutterBottom>
          {t('Orders.HistoryPage.title')}
        </Typography>

        {/* فلاتر (بحث + تاريخ) */}
        <Paper sx={{ p: 2, mb: 3 }}>
          <Box display='flex' flexDirection={{ xs: 'column', md: 'row' }} gap={2}>
            <TextField
              placeholder={t('Orders.HistoryPage.searchPlaceholder') ?? ''}
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
            <DesktopDatePicker
              label={t('Orders.HistoryPage.startDate') ?? ''}
              value={startDate}
              onChange={val => setStartDate(val)}
              renderInput={params => <TextField {...params} />}
            />
            <DesktopDatePicker
              label={t('Orders.HistoryPage.endDate') ?? ''}
              value={endDate}
              onChange={val => setEndDate(val)}
              renderInput={params => <TextField {...params} />}
            />
          </Box>
        </Paper>

        <OrdersColumn
          title={t('Orders.HistoryPage.acceptedOrdersTitle') as string}
          orders={paginatedOrders}
          onViewDetails={handleViewDetails}
          onViewInvoice={handleViewInvoice}
          onConfirmClick={() => {
            // عادةً لا نعطي زر confirm مرة أخرى في الهيستوري
          }}
        />

        {/* أزرار التصفح */}
        <Box mt={2} display='flex' justifyContent='space-between' alignItems='center'>
          <Button
            variant='outlined'
            disabled={currentPage <= 1}
            onClick={() => handlePageChange('prev')}
          >
            {t('Orders.HistoryPage.buttons.prev')}
          </Button>
          <Typography>
            {t('Orders.HistoryPage.pageIndicator', {
              current: currentPage,
              total: totalPages === 0 ? 1 : totalPages
            })}
          </Typography>
          <Button
            variant='outlined'
            disabled={currentPage >= totalPages || totalPages === 0}
            onClick={() => handlePageChange('next')}
          >
            {t('Orders.HistoryPage.buttons.next')}
          </Button>
        </Box>

        {/* حوارات التفاصيل والفاتورة */}
        <OrderDetailsDialog
          open={detailsDialogOpen}
          orderDetails={orderDetails}
          onClose={() => setDetailsDialogOpen(false)}
        />
        <InvoiceDialog
          open={invoiceDialogOpen}
          invoiceDetails={invoiceDetails}
          onClose={() => setInvoiceDialogOpen(false)}
        />
      </Box>
    </LocalizationProvider>
  )
}

export default OrdersHistoryPage
