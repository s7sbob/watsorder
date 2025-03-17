import React, { useEffect, useState } from 'react';
import { Box, Typography, TextField, InputAdornment, Grid } from '@mui/material';
import { IconSearch } from '@tabler/icons-react';
import { useSelector, useDispatch } from 'react-redux';
import { AppState, AppDispatch } from 'src/store/Store';
import socket from 'src/socket';
import axiosServices from 'src/utils/axios';
import OrdersColumn from './OrdersColumn';
import OrderDetailsDialog from './OrderDetailsDialog';
import InvoiceDialog from './InvoiceDialog';
import ConfirmOrderDialog from './ConfirmOrderDialog';
import { OrderType } from 'src/types/apps/order';
import { fetchConfirmedOrders, confirmOrderByRestaurant } from 'src/store/apps/orders/OrderSlice';
import { useTranslation } from 'react-i18next';

const NewOrdersPage: React.FC = () => {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const { orders, loading, error } = useSelector((state: AppState) => state.order);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [orderDetails, setOrderDetails] = useState<OrderType | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [invoiceDetails, setInvoiceDetails] = useState<OrderType | null>(null);

  // Socket events لتحديث الطلبات في الوقت الحقيقي
  useEffect(() => {
    const handleNewOrder = (data: OrderType) => {
      console.log('New order event received:', data);
      // عند وصول طلب جديد نقوم بجلب الطلبات من السيرفر
      dispatch(fetchConfirmedOrders());
      triggerAlarm();
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

  // دالة التنبيه بالصوت والاهتزاز
  const triggerAlarm = () => {
    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
    const audio = new Audio('/notification.mp3');
    audio.play().catch(err => console.error('Error playing sound:', err));
  };

  // جلب الطلبات عند تحميل الصفحة
  useEffect(() => {
    dispatch(fetchConfirmedOrders());
  }, [dispatch]);

  // دالة للتحقق مما إذا كان تاريخ الطلب هو اليوم الحالي (باستخدام toLocaleDateString لمقارنة التوقيت المحلي)
  function isToday(dateString: string | undefined): boolean {
    if (!dateString) return false;
    const dateObj = new Date(dateString);
    const now = new Date();
    return dateObj.toLocaleDateString() === now.toLocaleDateString();
  }
  const todaysOrders = orders.filter(o => isToday(o.createdAt));

  // فلترة الطلبات بناءً على البحث
  const filteredSearchOrders = todaysOrders.filter((order: OrderType) => {
    const phoneMatch = order.customerPhone?.toLowerCase().includes(searchTerm.toLowerCase());
    const addressMatch =
      order.deliveryAddress &&
      order.deliveryAddress.toLowerCase().includes(searchTerm.toLowerCase());
    return phoneMatch || addressMatch;
  });

  // تقسيم الطلبات إلى جديدة ومقبولة
  const newOrders = filteredSearchOrders.filter(o => !o.finalConfirmed);
  const acceptedOrders = filteredSearchOrders.filter(o => o.finalConfirmed);

  // Handlers لعرض التفاصيل والفاتورة وتأكيد الطلب
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
      alert(t('Orders.NewOrdersPage.alerts.invoiceError'));
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

  if (loading) return <div>{t('Orders.NewOrdersPage.loading')}</div>;
  if (error) return <div>{t('Orders.NewOrdersPage.error', { error })}</div>;

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
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
              <InputAdornment position="end">
                <IconSearch size={16} />
              </InputAdornment>
            )
          }}
        />
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <OrdersColumn
            title={t('Orders.NewOrdersPage.acceptedToday', { count: acceptedOrders.length })}
            orders={acceptedOrders}
            onViewDetails={handleViewDetails}
            onViewInvoice={handleViewInvoice}
            onConfirmClick={handleConfirmClick}
          />
        </Grid>

        <Grid item xs={12} md={6}>
          <OrdersColumn
            title={t('Orders.NewOrdersPage.newToday', { count: newOrders.length })}
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

export default NewOrdersPage;
