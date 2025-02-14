// src/store/apps/orders/OrderSlice.ts

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'src/utils/axios';
import { OrderType } from 'src/types/apps/order';

interface OrderState {
  orders: OrderType[];
  loading: boolean;
  error: string | null;
}

const initialState: OrderState = {
  orders: [],
  loading: false,
  error: null,
};

export const fetchConfirmedOrders = createAsyncThunk(
  'orders/fetchConfirmed',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get<OrderType[]>('/api/orders/confirmed');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Error fetching confirmed orders');
    }
  }
);

export const confirmOrderByRestaurant = createAsyncThunk(
  'orders/confirmOrderByRestaurant',
  async (
    { orderId, prepTime, deliveryFee, serviceFee, taxValue }:
      { orderId: number; prepTime: number; deliveryFee?: number; serviceFee?: number; taxValue?: number },
    { rejectWithValue }
  ) => {
    try {
      await axios.post(`/api/orders/${orderId}/restaurant-confirm`, {
        prepTime,
        deliveryFee,
        serviceFee,
        taxValue,
      });
      return { orderId, prepTime, deliveryFee, serviceFee, taxValue };
    } catch (err: any) {
      return rejectWithValue(err.response?.data || 'Error confirming order');
    }
  }
);

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // معالجة حالة جلب الطلبات المؤكدة
      .addCase(fetchConfirmedOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchConfirmedOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload;
      })
      .addCase(fetchConfirmedOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // معالجة تأكيد الطلب من المطعم
      .addCase(confirmOrderByRestaurant.fulfilled, (state, action) => {
        const { orderId } = action.payload as any;
        const index = state.orders.findIndex((o) => o.id === orderId);
        if (index !== -1) {
          state.orders[index].finalConfirmed = true;
        }
      })
      .addCase(confirmOrderByRestaurant.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export default orderSlice.reducer;
