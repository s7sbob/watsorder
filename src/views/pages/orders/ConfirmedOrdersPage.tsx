// src/pages/OrdersPage.tsx
import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, InputAdornment, Grid } from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchConfirmedOrders, confirmOrderByRestaurant } from 'src/store/apps/orders/OrderSlice';
import { AppState, AppDispatch } from 'src/store/Store';
import axiosServices from 'src/utils/axios';
import socket from 'src/socket';
import OrdersColumn from './OrdersColumn';
import OrderDetailsDialog from './OrderDetailsDialog';
import InvoiceDialog from './InvoiceDialog';
import ConfirmOrderDialog from './ConfirmOrderDialog';
import { OrderType } from 'src/types/apps/order';

const OrdersPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { orders, loading, error } = useSelector((state: AppState) => state.order);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderType | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState<OrderType | null>(null);

  // ====== [Socket.io setup using imported socket] ======
  useEffect(() => {
    const handleNewOrder = (data: any) => {
      console.log('New order event received:', data);
      dispatch(fetchConfirmedOrders());
      triggerAlarm(); // تشغيل التنبيه عند وصول طلب جديد
    };

    const handleOrderConfirmed = (data: { orderId: number }) => {
      console.log('Order Confirmed event received:', data);
      dispatch(fetchConfirmedOrders());
    };

    socket.on('newOrder', handleNewOrder);
    socket.on('orderConfirmed', handleOrderConfirmed);

    return () => {
      socket.off('newOrder', handleNewOrder);
      socket.off('orderConfirmed', handleOrderConfirmed);
    };
  }, [dispatch]);

  // ====== [Alarm repeating effect] ======
  // إذا كان هناك طلب جديد (غير مؤكد) نعيد تشغيل التنبيه بشكل دوري
  const filteredNewOrders = orders.filter((order: OrderType) => !order.finalConfirmed);
  useEffect(() => {
    if (filteredNewOrders.length > 0) {
      const intervalId = setInterval(() => {
        triggerAlarm();
      }, 5000); // كل 5 ثوانٍ (يمكنك تعديل الوقت)
      return () => clearInterval(intervalId);
    }
  }, [filteredNewOrders]);

  // دالة التنبيه: تستخدم الاهتزاز وتشغيل الصوت
  const triggerAlarm = () => {
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    const audio = new Audio('/notification.mp3'); // تأكد من وجود الملف في مجلد public
    audio.play().catch(err => console.error('Error playing sound:', err));
  };

  useEffect(() => {
    dispatch(fetchConfirmedOrders());
  }, [dispatch]);

  // تصفية الطلبات حسب البحث
  const filteredOrders = orders.filter((order: OrderType) => {
    const phoneMatch = order.customerPhone.toLowerCase().includes(searchTerm.toLowerCase());
    const addressMatch =
      order.deliveryAddress &&
      order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase());
    return phoneMatch || addressMatch;
  });

  const acceptedOrders = filteredOrders.filter((o: OrderType) => o.finalConfirmed);
  const newOrders = filteredOrders.filter((o: OrderType) => !o.finalConfirmed);

  // ====== [Handlers] ======
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
      setInvoiceDialogOpen(true);
    } catch (error) {
      console.error('Error fetching invoice details:', error);
      alert('Failed to fetch invoice details. Please check console for more info.');
    }
  };

  const handleConfirmClick = (orderId: number) => {
    setSelectedOrderId(orderId);
  };

  const handleConfirmSubmit = async (prepTime: number, deliveryFee: number, taxValue: number) => {
    if (!selectedOrderId) return;
    await dispatch(
      confirmOrderByRestaurant({
        orderId: selectedOrderId,
        prepTime,
        deliveryFee,
        taxValue
      })
    );
    setSelectedOrderId(null);
  };

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Confirmed Orders
      </Typography>

      {/* Search bar */}
      <Box mb={3}>
        <TextField
          placeholder="Search by phone or address"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
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

      <Grid container spacing={3}>
        {/* Accepted Orders Column */}
        <Grid item xs={12} md={6}>
          <OrdersColumn
            title="Accepted"
            orders={acceptedOrders}
            onViewDetails={handleViewDetails}
            onViewInvoice={handleViewInvoice}
            onConfirmClick={handleConfirmClick}
          />
        </Grid>
        {/* New Orders Column */}
        <Grid item xs={12} md={6}>
          <OrdersColumn
            title="New"
            orders={newOrders}
            onViewDetails={handleViewDetails}
            onViewInvoice={handleViewInvoice}
            onConfirmClick={handleConfirmClick}
          />
        </Grid>
      </Grid>

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

      <ConfirmOrderDialog
        open={selectedOrderId !== null}
        orderId={selectedOrderId}
        onClose={() => setSelectedOrderId(null)}
        onSubmit={handleConfirmSubmit}
      />
    </Box>
  );
};

export default OrdersPage;
