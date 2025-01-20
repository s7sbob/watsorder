import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchConfirmedOrders, confirmOrderByRestaurant } from 'src/store/apps/orders/OrderSlice';
import { AppState, AppDispatch } from 'src/store/Store';
import { io, Socket } from 'socket.io-client';
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
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  TableContainer,
  Paper,
  Stack,
  Grid,
} from '@mui/material';
import { IconEye, IconCheck, IconSearch, IconReceipt } from '@tabler/icons-react';
import axiosServices from 'src/utils/axios';
import { OrderType, OrderItemType } from 'src/types/apps/order';

function OrdersPage() {
  const dispatch = useDispatch<AppDispatch>();
  const { orders, loading, error } = useSelector((state: AppState) => state.order);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('CONFIRMED');

  const [prepTime, setPrepTime] = useState<number>(30);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [serviceFee, setServiceFee] = useState<number>(0);
  const [taxValue, setTaxValue] = useState<number>(0);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  const [orderDetails, setOrderDetails] = useState<OrderType | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState<OrderType | null>(null);

  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    const newSocket = io("http://localhost:5000");
    setSocket(newSocket);

    newSocket.on("orderConfirmed", (data: { orderId: number }) => {
      dispatch(fetchConfirmedOrders());
    });

    return () => {
      newSocket.disconnect();
    };
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchConfirmedOrders());
  }, [dispatch]);

  // تحقق من البيانات التي تأتي من الـ API
  useEffect(() => {
  }, [orders]);

  const filteredOrders = orders
    .filter((order: OrderType) => {
      // تصفية الطلبات بناءً على الحالة finalConfirmed
      const statusMatch = activeTab === 'CONFIRMED' ? order.finalConfirmed : !order.finalConfirmed;
      const searchMatch =
        order.customerPhone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (order.deliveryAddress && order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase()));
      return statusMatch && searchMatch;
    });

  const handleViewDetails = async (orderId: number) => {
    try {
      const res = await axiosServices.get<OrderType>(`/api/orders/${orderId}`);
      setOrderDetails(res.data);
      setDetailsDialogOpen(true);
    } catch (error) {
      console.error('Error fetching order details', error);
    }
  };

  const handleViewInvoice = async (orderId: number) => {
    try {
      const res = await axiosServices.get<OrderType>(`/api/orders/${orderId}`);
      setInvoiceDetails(res.data);
      setInvoiceDialogOpen(true); // افتح حوار الفاتورة
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      alert('Failed to fetch invoice details. Please check the console for more information.');
    }
  };

  const handleConfirmClick = (orderId: number) => {
    setSelectedOrderId(orderId);
  };

  const handleConfirmSubmit = async () => {
    if (!selectedOrderId) return;
    await dispatch(confirmOrderByRestaurant({ 
      orderId: selectedOrderId, 
      prepTime, 
      deliveryFee, 
      serviceFee, 
      taxValue 
    }));
    setSelectedOrderId(null);
  };

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>Confirmed Orders</Typography>
      
      {/* فلاتر الحالة */}
      <Box mb={3} display="flex" gap={2}>
        {['CONFIRMED', 'ACCEPTED'].map(tab => (
          <Button
            key={tab}
            variant={activeTab === tab ? 'contained' : 'outlined'}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </Button>
        ))}
      </Box>

      {/* شريط البحث */}
      <Box mb={3}>
        <TextField
          placeholder="Search by phone or address"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          fullWidth
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconSearch size={16} />
              </InputAdornment>
            )
          }}
        />
      </Box>

      {/* عرض الطلبات */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order ID</TableCell>
              <TableCell>Customer Phone</TableCell>
              <TableCell>Delivery Address</TableCell>
              <TableCell>Total Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created At</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredOrders.map((order: OrderType) => (
              <TableRow key={order.id}>
                <TableCell>{order.id}</TableCell>
                <TableCell>{order.customerPhone}</TableCell>
                <TableCell>{order.deliveryAddress}</TableCell>
                <TableCell>{order.totalPrice}</TableCell>
                <TableCell>
                  {order.finalConfirmed ? (
                    <Chip color="primary" label="Confirmed" size="small" />
                  ) : (
                    <Chip color="success" label="Pending" size="small" />
                  )}
                </TableCell>
                <TableCell>{order.createdAt}</TableCell>
                <TableCell align="center">
                  <Tooltip title="View Details">
                    <IconButton color="primary" onClick={() => handleViewDetails(order.id)}>
                      <IconEye size={22} />
                    </IconButton>
                  </Tooltip>
                  {/* عرض أيقونة الفاتورة فقط للطلبات المؤكدة */}
                  {order.finalConfirmed && (
                    <Tooltip title="View Invoice">
                      <IconButton color="secondary" onClick={() => handleViewInvoice(order.id)}>
                        <IconReceipt size={22} />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Restaurant Confirm">
                    <IconButton color="success" onClick={() => handleConfirmClick(order.id)}>
                      <IconCheck size={22} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* حوار تفاصيل الطلب */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Order Details #{orderDetails?.id}</DialogTitle>
        <DialogContent>
          {orderDetails && (
            <Box>
              <Typography><strong>Customer Phone:</strong> {orderDetails.customerPhoneNumber}</Typography>
              <Typography><strong>Delivery Address:</strong> {orderDetails.deliveryAddress}</Typography>
              <Typography><strong>Total Price:</strong> {orderDetails.totalPrice}</Typography>
              <Typography><strong>Status:</strong> {orderDetails.finalConfirmed ? 'Confirmed' : 'Pending'}</Typography>
              <Typography><strong>Created At:</strong> {orderDetails.createdAt}</Typography>

              {/* عرض الحقول الاختيارية */}
              {orderDetails.deliveryFee !== null && (
                <Typography><strong>Delivery Fee:</strong> {orderDetails.deliveryFee}</Typography>
              )}
              {orderDetails.serviceFee !== null && (
                <Typography><strong>Service Fee:</strong> {orderDetails.serviceFee}</Typography>
              )}
              {orderDetails.taxValue !== null && (
                <Typography><strong>Tax Value:</strong> {orderDetails.taxValue}</Typography>
              )}
              {orderDetails.prepTime !== null && (
                <Typography><strong>Preparation Time:</strong> {orderDetails.prepTime} minutes</Typography>
              )}

              {/* عرض العناصر */}
              <Typography variant="h6" mt={2}>Items:</Typography>
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

      {/* حوار الفاتورة */}
      <Dialog open={invoiceDialogOpen} onClose={() => setInvoiceDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Invoice # {invoiceDetails?.id}</DialogTitle>
        <DialogContent>
          {invoiceDetails && (
            <Box>
              <Typography><strong>Customer Phone:</strong> {invoiceDetails.customerPhoneNumber}</Typography>
              <Typography><strong>Delivery Address:</strong> {invoiceDetails.deliveryAddress}</Typography>
              <Typography><strong>Total Price:</strong> {invoiceDetails.totalPrice}</Typography>
              <Typography><strong>Status:</strong> {invoiceDetails.finalConfirmed ? 'Confirmed' : 'Pending'}</Typography>
              <Typography><strong>Created At:</strong> {invoiceDetails.createdAt}</Typography>

              {/* تفاصيل التكلفة */}
              {invoiceDetails.deliveryFee !== null && (
                <Typography><strong>Delivery Fee:</strong> {invoiceDetails.deliveryFee}</Typography>
              )}
              {invoiceDetails.serviceFee !== null && (
                <Typography><strong>Service Fee:</strong> {invoiceDetails.serviceFee}</Typography>
              )}
              {invoiceDetails.taxValue !== null && (
                <Typography><strong>Tax Value:</strong> {invoiceDetails.taxValue}</Typography>
              )}
              {invoiceDetails.prepTime !== null && (
                <Typography><strong>Preparation Time:</strong> {invoiceDetails.prepTime} minutes</Typography>
              )}

              {/* العناصر */}
              <Typography variant="h6" mt={2}>Items:</Typography>
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

      {/* حوار تأكيد المطعم */}
      {selectedOrderId && (
        <Dialog open={selectedOrderId !== null} onClose={() => setSelectedOrderId(null)}>
          <DialogTitle>Confirm Order #{selectedOrderId}</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Expected Preparation Time (minutes)"
              type="number"
              value={prepTime}
              onChange={(e) => setPrepTime(Number(e.target.value))}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Delivery Fee"
              type="number"
              value={deliveryFee}
              onChange={(e) => setDeliveryFee(Number(e.target.value))}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Service Fee"
              type="number"
              value={serviceFee}
              onChange={(e) => setServiceFee(Number(e.target.value))}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Tax Value"
              type="number"
              value={taxValue}
              onChange={(e) => setTaxValue(Number(e.target.value))}
              margin="normal"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedOrderId(null)}>Cancel</Button>
            <Button onClick={handleConfirmSubmit} variant="contained" color="primary">
              Confirm & Send Message
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}

export default OrdersPage;