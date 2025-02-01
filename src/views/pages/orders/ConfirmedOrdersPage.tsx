import React, { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { fetchConfirmedOrders, confirmOrderByRestaurant } from 'src/store/apps/orders/OrderSlice'
import { AppState, AppDispatch } from 'src/store/Store'
import { io, Socket } from 'socket.io-client'
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Tooltip,
  TextField,
  Typography,
  InputAdornment,
  Stack,
  Grid,
  Paper
} from '@mui/material'
import { IconEye, IconCheck, IconSearch, IconReceipt } from '@tabler/icons-react'
import axiosServices from 'src/utils/axios'
import { OrderType, OrderItemType } from 'src/types/apps/order'

function OrdersPage() {
  const dispatch = useDispatch<AppDispatch>()
  const { orders, loading, error } = useSelector((state: AppState) => state.order)

  const [searchTerm, setSearchTerm] = useState('')
  const [prepTime, setPrepTime] = useState<number>(30)
  const [deliveryFee, setDeliveryFee] = useState<number>(0)
  const [serviceFee, setServiceFee] = useState<number>(0)
  const [taxValue, setTaxValue] = useState<number>(0)
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null)

  const [orderDetails, setOrderDetails] = useState<OrderType | null>(null)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false)
  const [invoiceDetails, setInvoiceDetails] = useState<OrderType | null>(null)

  // socket state
  const [socket, setSocket] = useState<Socket | null>(null)

  // ====== [Setup Socket.io] ======
  useEffect(() => {
    const newSocket = io('http://localhost:5000')
    setSocket(newSocket)

    // عند وصول حدث newOrder من السيرفر
    newSocket.on('newOrder', data => {
      console.log('New order event received:', data)
      // أعد جلب الطلبات
      dispatch(fetchConfirmedOrders())
    })

    // إذا أردت تحديث Column Accepted عند التأكيد أو غيره:
    newSocket.on('orderConfirmed', (data: { orderId: number }) => {
      console.log('Order Confirmed event received:', data)
      dispatch(fetchConfirmedOrders())
    })

    return () => {
      newSocket.disconnect()
    }
  }, [dispatch])

  useEffect(() => {
    // جلب الطلبات لأول مرة عند تحميل الصفحة
    dispatch(fetchConfirmedOrders())
  }, [dispatch])

  // ====== [Filtering logic] ======
  const filteredOrders = orders.filter((order: OrderType) => {
    const phoneMatch = order.customerPhone.toLowerCase().includes(searchTerm.toLowerCase())
    const addressMatch =
      order.deliveryAddress &&
      order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase())
    return phoneMatch || addressMatch
  })

  // نقسم الطلبات لعمودين:
  const newOrders = filteredOrders.filter(o => !o.finalConfirmed)
  const acceptedOrders = filteredOrders.filter(o => o.finalConfirmed)

  // ====== [Handlers] ======
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
      alert('Failed to fetch invoice details. Please check console for more info.')
    }
  }

  const handleConfirmClick = (orderId: number) => {
    setSelectedOrderId(orderId)
  }

  const handleConfirmSubmit = async () => {
    if (!selectedOrderId) return
    await dispatch(
      confirmOrderByRestaurant({
        orderId: selectedOrderId,
        prepTime,
        deliveryFee,
        serviceFee,
        taxValue
      })
    )
    setSelectedOrderId(null)
  }

  // ====== [Render] ======
  if (loading) return <div>Loading orders...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <Box p={3}>
      <Typography variant='h4' gutterBottom>
        Confirmed Orders
      </Typography>

      {/* Search bar */}
      <Box mb={3}>
        <TextField
          placeholder='Search by phone or address'
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
        {/* ---------- Accepted Column ---------- */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>
              Accepted <span style={{ color: '#f90' }}>({acceptedOrders.length})</span>
            </Typography>

            {acceptedOrders.length === 0 ? (
              <Typography>No accepted orders</Typography>
            ) : (
              acceptedOrders.map(order => (
                <Box
                  key={order.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: '#fff'
                  }}
                >
                  <Typography variant='subtitle1'>Order #{order.id}</Typography>
                  <Typography variant='body2'>Phone: {order.customerPhone}</Typography>
                  <Typography variant='body2'>Address: {order.deliveryAddress}</Typography>
                  <Typography variant='body2'>Total: {order.totalPrice}</Typography>
                  <Typography variant='body2'>
                    Status: {order.finalConfirmed ? 'Confirmed' : 'Pending'}
                  </Typography>
                  <Typography variant='body2'>Created At: {order.createdAt}</Typography>

                  <Box sx={{ mt: 1 }}>
                    <Tooltip title='View Details'>
                      <IconButton color='primary' onClick={() => handleViewDetails(order.id)}>
                        <IconEye size={22} />
                      </IconButton>
                    </Tooltip>

                    {order.finalConfirmed && (
                      <Tooltip title='View Invoice'>
                        <IconButton color='secondary' onClick={() => handleViewInvoice(order.id)}>
                          <IconReceipt size={22} />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip title='Restaurant Confirm'>
                      <IconButton color='success' onClick={() => handleConfirmClick(order.id)}>
                        <IconCheck size={22} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </Grid>

        {/* ---------- New Column ---------- */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant='h6' sx={{ mb: 2 }}>
              New <span style={{ color: '#f90' }}>({newOrders.length})</span>
            </Typography>

            {newOrders.length === 0 ? (
              <Typography>No new orders</Typography>
            ) : (
              newOrders.map(order => (
                <Box
                  key={order.id}
                  sx={{
                    mb: 2,
                    p: 2,
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    backgroundColor: '#fff'
                  }}
                >
                  <Typography variant='subtitle1'>Order #{order.id}</Typography>
                  <Typography variant='body2'>Phone: {order.customerPhone}</Typography>
                  <Typography variant='body2'>Address: {order.deliveryAddress}</Typography>
                  <Typography variant='body2'>Total: {order.totalPrice}</Typography>
                  <Typography variant='body2'>
                    Status: {order.finalConfirmed ? 'Confirmed' : 'Pending'}
                  </Typography>
                  <Typography variant='body2'>Created At: {order.createdAt}</Typography>

                  <Box sx={{ mt: 1 }}>
                    <Tooltip title='View Details'>
                      <IconButton color='primary' onClick={() => handleViewDetails(order.id)}>
                        <IconEye size={22} />
                      </IconButton>
                    </Tooltip>

                    {order.finalConfirmed && (
                      <Tooltip title='View Invoice'>
                        <IconButton color='secondary' onClick={() => handleViewInvoice(order.id)}>
                          <IconReceipt size={22} />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip title='Restaurant Confirm'>
                      <IconButton color='success' onClick={() => handleConfirmClick(order.id)}>
                        <IconCheck size={22} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              ))
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* ====== Order Details Dialog ====== */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>Order Details #{orderDetails?.id}</DialogTitle>
        <DialogContent>
          {orderDetails && (
            <Box>
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
                <strong>Status:</strong>{' '}
                {orderDetails.finalConfirmed ? 'Confirmed' : 'Pending'}
              </Typography>
              <Typography>
                <strong>Created At:</strong> {orderDetails.createdAt}
              </Typography>

              {/* Optional fields */}
              {orderDetails.deliveryFee !== null && (
                <Typography>
                  <strong>Delivery Fee:</strong> {orderDetails.deliveryFee}
                </Typography>
              )}
              {orderDetails.serviceFee !== null && (
                <Typography>
                  <strong>Service Fee:</strong> {orderDetails.serviceFee}
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
              <Typography variant='h6' mt={2}>
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
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ====== Invoice Dialog ====== */}
      <Dialog
        open={invoiceDialogOpen}
        onClose={() => setInvoiceDialogOpen(false)}
        fullWidth
        maxWidth='sm'
      >
        <DialogTitle>Invoice # {invoiceDetails?.id}</DialogTitle>
        <DialogContent>
          {invoiceDetails && (
            <Box>
              <Typography>
                <strong>Customer Phone:</strong> {invoiceDetails.customerPhoneNumber}
              </Typography>
              <Typography>
                <strong>Delivery Address:</strong> {invoiceDetails.deliveryAddress}
              </Typography>
              <Typography>
                <strong>Total Price:</strong> {invoiceDetails.totalPrice}
              </Typography>
              <Typography>
                <strong>Status:</strong>{' '}
                {invoiceDetails.finalConfirmed ? 'Confirmed' : 'Pending'}
              </Typography>
              <Typography>
                <strong>Created At:</strong> {invoiceDetails.createdAt}
              </Typography>

              {invoiceDetails.deliveryFee !== null && (
                <Typography>
                  <strong>Delivery Fee:</strong> {invoiceDetails.deliveryFee}
                </Typography>
              )}
              {invoiceDetails.serviceFee !== null && (
                <Typography>
                  <strong>Service Fee:</strong> {invoiceDetails.serviceFee}
                </Typography>
              )}
              {invoiceDetails.taxValue !== null && (
                <Typography>
                  <strong>Tax Value:</strong> {invoiceDetails.taxValue}
                </Typography>
              )}
              {invoiceDetails.prepTime !== null && (
                <Typography>
                  <strong>Preparation Time:</strong> {invoiceDetails.prepTime} minutes
                </Typography>
              )}
              <Typography variant='h6' mt={2}>
                Items:
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
          <Button onClick={() => setInvoiceDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* ====== Confirm Order Dialog ====== */}
      {selectedOrderId && (
        <Dialog open={selectedOrderId !== null} onClose={() => setSelectedOrderId(null)}>
          <DialogTitle>Confirm Order #{selectedOrderId}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label='Expected Preparation Time (minutes)'
              type='number'
              value={prepTime}
              onChange={e => setPrepTime(Number(e.target.value))}
              margin='normal'
            />
            <TextField
              fullWidth
              label='Delivery Fee'
              type='number'
              value={deliveryFee}
              onChange={e => setDeliveryFee(Number(e.target.value))}
              margin='normal'
            />
            <TextField
              fullWidth
              label='Service Fee'
              type='number'
              value={serviceFee}
              onChange={e => setServiceFee(Number(e.target.value))}
              margin='normal'
            />
            <TextField
              fullWidth
              label='Tax Value'
              type='number'
              value={taxValue}
              onChange={e => setTaxValue(Number(e.target.value))}
              margin='normal'
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedOrderId(null)}>Cancel</Button>
            <Button onClick={handleConfirmSubmit} variant='contained' color='primary'>
              Confirm & Send Message
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  )
}

export default OrdersPage
