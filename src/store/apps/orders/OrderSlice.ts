// src/store/apps/orders/OrderSlice.ts

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'src/utils/axios'
import { OrderType } from 'src/types/apps/order'

interface OrderState {
  // سنعتمد فقط على هذه القائمة لعرض كل الطلبات (سواء finalConfirmed = false أو true)
  confirmedOrders: OrderType[]

  loading: boolean
  error: string | null
}

const initialState: OrderState = {
  confirmedOrders: [],
  loading: false,
  error: null
}

// نجلب كل الطلبات الخاصة بالمستخدم من /api/orders/confirmed
// (رغم الاسم "confirmed" إلا أنها تعيد الطلبات بقيمة finalConfirmed = false أو true)
export const fetchConfirmedOrders = createAsyncThunk(
  'orders/fetchConfirmedOrders',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get<OrderType[]>('/api/orders/confirmed')
      return response.data
    } catch (error: any) {
      return rejectWithValue(error.response?.data || 'Error fetching confirmed orders')
    }
  }
)

// تأكيد الطلب
export const confirmOrderByRestaurant = createAsyncThunk(
  'orders/confirmOrderByRestaurant',
  async (
    {
      orderId,
      prepTime,
      deliveryFee,
      serviceFee,
      taxValue
    }: {
      orderId: number
      prepTime: number
      deliveryFee?: number
      serviceFee?: number
      taxValue?: number
    },
    { rejectWithValue }
  ) => {
    try {
      await axios.post(`/api/orders/${orderId}/restaurant-confirm`, {
        prepTime,
        deliveryFee,
        serviceFee,
        taxValue
      })
      return { orderId, prepTime, deliveryFee, serviceFee, taxValue }
    } catch (err: any) {
      return rejectWithValue(err.response?.data || 'Error confirming order')
    }
  }
)

const orderSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      // fetchConfirmedOrders
      .addCase(fetchConfirmedOrders.pending, state => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchConfirmedOrders.fulfilled, (state, action) => {
        state.loading = false
        state.confirmedOrders = action.payload
      })
      .addCase(fetchConfirmedOrders.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload as string
      })

      // confirmOrderByRestaurant
      .addCase(confirmOrderByRestaurant.fulfilled, (state, action) => {
        // بعد التأكيد، عدّل قيمة الـ finalConfirmed في نفس القائمة
        const { orderId } = action.payload
        const index = state.confirmedOrders.findIndex(o => o.id === orderId)
        if (index !== -1) {
          state.confirmedOrders[index].finalConfirmed = true
          // لو تحب تغير أي حقول أخرى (prepTime/deliveryFee/...) عشان تبقى محدثة في الواجهة
          state.confirmedOrders[index].prepTime = action.payload.prepTime
          state.confirmedOrders[index].deliveryFee = action.payload.deliveryFee
          state.confirmedOrders[index].taxValue = action.payload.taxValue
        }
      })
      .addCase(confirmOrderByRestaurant.rejected, (state, action) => {
        state.error = action.payload as string
      })
  }
})

export default orderSlice.reducer
