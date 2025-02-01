import React, { useState, useEffect } from 'react'
import {
  Box,
  Typography,
  Grid,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Tooltip,
  IconButton,
  Chip,
  TextField,
  Stack,
  InputAdornment
} from '@mui/material'
import { IconEye, IconCheck, IconSearch, IconEdit, IconTrash } from '@tabler/icons-react'
import axiosServices from 'src/utils/axios'
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider'
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns'

interface OrderType {
  id: number
  customerPhone: string
  deliveryAddress: string
  totalPrice: number
  status: string
  createdAt?: string
  items?: any[]
}

function OrdersList() {
  // =========== [ States ] ===========
  const [orders, setOrders] = useState<OrderType[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [orderDetails, setOrderDetails] = useState<OrderType | null>(null)

  // Delete
  const [selectedOrders, setSelectedOrders] = useState<number[]>([])
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)

  // Edit
  const [currentOrder, setCurrentOrder] = useState<OrderType | null>(null)
  const [openEditDialog, setOpenEditDialog] = useState(false)

  // Add
  const [openAddDialog, setOpenAddDialog] = useState(false)

  // =========== [ useEffect - Fetch Orders ] ===========
  useEffect(() => {
    fetchOrders()
  }, [])

  const fetchOrders = async () => {
    try {
      // مثلاً endpoint يعيد جميع الطلبات أو الطلبات المؤكدة
      const response = await axiosServices.get<OrderType[]>('/api/orders/confirmed')
      setOrders(response.data)
    } catch (error) {
      console.error('Error fetching orders', error)
    }
  }

  // =========== [ Filtering by search term ] ===========
  const filteredOrders = orders.filter(order =>
    order.customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (order.deliveryAddress &&
      order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // =========== [ Split Orders into (New, Accepted) ] ===========
  // يمكنك تغيير القيم حسب منطق مشروعك
  const newOrders = filteredOrders.filter(order => order.status === 'IN_CART')
  const acceptedOrders = filteredOrders.filter(order => order.status === 'CONFIRMED')

  // =========== [ Delete Logic ] ===========
  const handleDelete = (orderId?: number) => {
    // إما حددت Order مفرد أو منطق متعدد
    if (orderId) {
      setSelectedOrders([orderId])
    }
    setOpenDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    for (const orderId of selectedOrders) {
      await axiosServices.delete(`/api/orders/${orderId}`)
    }
    setSelectedOrders([])
    setOpenDeleteDialog(false)
    fetchOrders()
  }

  // =========== [ Edit Logic ] ===========
  const handleEdit = (order: OrderType) => {
    setCurrentOrder(order)
    setOpenEditDialog(true)
  }

  const handleEditSave = async () => {
    if (currentOrder) {
      await axiosServices.put(`/api/orders/${currentOrder.id}`, currentOrder)
      fetchOrders()
    }
    setOpenEditDialog(false)
  }

  // =========== [ Add Logic ] ===========
  const handleAddOrder = () => {
    setCurrentOrder({
      id: 0,
      customerPhone: '',
      deliveryAddress: '',
      totalPrice: 0,
      status: 'IN_CART',
      items: []
    })
    setOpenAddDialog(true)
  }

  const handleAddSave = async () => {
    if (currentOrder) {
      await axiosServices.post('/api/orders', currentOrder)
      fetchOrders()
    }
    setOpenAddDialog(false)
  }

  // =========== [ View Details Logic ] ===========
  const handleViewDetails = async (orderId: number) => {
    try {
      const res = await axiosServices.get(`/api/orders/${orderId}`)
      setOrderDetails(res.data)
      setDetailsDialogOpen(true)
    } catch (error) {
      console.error('Error fetching order details', error)
    }
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ mt: 2 }}>
        {/* ========== [Search & Add] ========== */}
        <Stack direction='row' spacing={2} mb={3}>
          <TextField
            placeholder='Search by phone or address'
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            InputProps={{
              endAdornment: (
                <InputAdornment position='end'>
                  <IconSearch size={16} />
                </InputAdornment>
              )
            }}
          />
          <Button variant='contained' color='primary' onClick={handleAddOrder}>
            Add New Order
          </Button>
        </Stack>

        {/* ========== [Grid of columns for New & Accepted] ========== */}
        <Grid container spacing={3}>
          {/* ------- Accepted Column ------- */}
          <Grid item xs={12} md={6}>
            <Box sx={{ backgroundColor: '#fafafa', p: 2 }}>
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
                    <Typography variant='body2'>
                      Phone: {order.customerPhone}
                    </Typography>
                    <Typography variant='body2'>
                      Address: {order.deliveryAddress}
                    </Typography>
                    <Typography variant='body2'>
                      Total: {order.totalPrice}
                    </Typography>
                    <Typography variant='body2'>
                      Status: {order.status}
                    </Typography>
                    <Typography variant='body2'>
                      Created At: {order.createdAt}
                    </Typography>

                    <Box sx={{ mt: 1 }}>
                      <Tooltip title='View Details'>
                        <IconButton color='primary' onClick={() => handleViewDetails(order.id)}>
                          <IconEye size={22} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Edit Order'>
                        <IconButton color='success' onClick={() => handleEdit(order)}>
                          <IconEdit width={22} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Delete Order'>
                        <IconButton color='error' onClick={() => handleDelete(order.id)}>
                          <IconTrash width={22} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Grid>

          {/* ------- New Column ------- */}
          <Grid item xs={12} md={6}>
            <Box sx={{ backgroundColor: '#fafafa', p: 2 }}>
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
                    <Typography variant='body2'>
                      Phone: {order.customerPhone}
                    </Typography>
                    <Typography variant='body2'>
                      Address: {order.deliveryAddress}
                    </Typography>
                    <Typography variant='body2'>
                      Total: {order.totalPrice}
                    </Typography>
                    <Typography variant='body2'>
                      Status: {order.status}
                    </Typography>
                    <Typography variant='body2'>
                      Created At: {order.createdAt}
                    </Typography>

                    <Box sx={{ mt: 1 }}>
                      <Tooltip title='View Details'>
                        <IconButton color='primary' onClick={() => handleViewDetails(order.id)}>
                          <IconEye size={22} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Edit Order'>
                        <IconButton color='success' onClick={() => handleEdit(order)}>
                          <IconEdit width={22} />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title='Delete Order'>
                        <IconButton color='error' onClick={() => handleDelete(order.id)}>
                          <IconTrash width={22} />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          </Grid>
        </Grid>

        {/* ========== [Delete Confirmation Dialog] ========== */}
        <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
          <DialogTitle>Delete Orders</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete the selected order(s)?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmDelete} variant='contained' color='error'>
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        {/* ========== [Edit Order Dialog] ========== */}
        <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)}>
          <DialogTitle>Edit Order</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label='Customer Phone'
              value={currentOrder?.customerPhone || ''}
              onChange={e =>
                setCurrentOrder(prev => (prev ? { ...prev, customerPhone: e.target.value } : prev))
              }
              margin='normal'
            />
            <TextField
              fullWidth
              label='Delivery Address'
              value={currentOrder?.deliveryAddress || ''}
              onChange={e =>
                setCurrentOrder(prev => (prev ? { ...prev, deliveryAddress: e.target.value } : prev))
              }
              margin='normal'
            />
            <TextField
              fullWidth
              label='Total Price'
              type='number'
              value={currentOrder?.totalPrice || 0}
              onChange={e =>
                setCurrentOrder(prev =>
                  prev ? { ...prev, totalPrice: +e.target.value } : prev
                )
              }
              margin='normal'
            />
            <TextField
              fullWidth
              label='Status'
              select
              value={currentOrder?.status || ''}
              onChange={e =>
                setCurrentOrder(prev =>
                  prev ? { ...prev, status: e.target.value } : prev
                )
              }
              margin='normal'
            >
              <option value='IN_CART'>In Cart</option>
              <option value='CONFIRMED'>Confirmed</option>
              <option value='DELIVERED'>Delivered</option>
              <option value='CANCELLED'>Cancelled</option>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button onClick={handleEditSave} variant='contained' color='primary'>
              Save
            </Button>
          </DialogActions>
        </Dialog>

        {/* ========== [Add Order Dialog] ========== */}
        <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
          <DialogTitle>Add New Order</DialogTitle>
          <DialogContent>
            {/* حقول لإدخال بيانات الطلب الجديد */}
            <TextField
              fullWidth
              label='Customer Phone'
              value={currentOrder?.customerPhone || ''}
              onChange={e =>
                setCurrentOrder(prev => (prev ? { ...prev, customerPhone: e.target.value } : prev))
              }
              margin='normal'
            />
            <TextField
              fullWidth
              label='Delivery Address'
              value={currentOrder?.deliveryAddress || ''}
              onChange={e =>
                setCurrentOrder(prev => (prev ? { ...prev, deliveryAddress: e.target.value } : prev))
              }
              margin='normal'
            />
            <TextField
              fullWidth
              label='Total Price'
              type='number'
              value={currentOrder?.totalPrice || 0}
              onChange={e =>
                setCurrentOrder(prev =>
                  prev ? { ...prev, totalPrice: +e.target.value } : prev
                )
              }
              margin='normal'
            />
            <TextField
              fullWidth
              label='Status'
              select
              value={currentOrder?.status || 'IN_CART'}
              onChange={e =>
                setCurrentOrder(prev =>
                  prev ? { ...prev, status: e.target.value } : prev
                )
              }
              margin='normal'
            >
              <option value='IN_CART'>In Cart</option>
              <option value='CONFIRMED'>Confirmed</option>
              <option value='DELIVERED'>Delivered</option>
              <option value='CANCELLED'>Cancelled</option>
            </TextField>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddSave} variant='contained' color='primary'>
              Add
            </Button>
          </DialogActions>
        </Dialog>

        {/* ========== [Details Dialog] ========== */}
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
                  <strong>Customer Phone:</strong> {orderDetails.customerPhone}
                </Typography>
                <Typography>
                  <strong>Delivery Address:</strong> {orderDetails.deliveryAddress}
                </Typography>
                <Typography>
                  <strong>Total Price:</strong> {orderDetails.totalPrice}
                </Typography>
                <Typography>
                  <strong>Status:</strong> {orderDetails.status}
                </Typography>
                <Typography>
                  <strong>Created At:</strong> {orderDetails.createdAt}
                </Typography>
                <Typography variant='h6' mt={2}>
                  Items:
                </Typography>
                {orderDetails.items?.map((item, idx) => (
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
      </Box>
    </LocalizationProvider>
  )
}

export default OrdersList
