import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import axios from 'src/utils/axios'
import { OrderType } from 'src/types/apps/order'

interface OrderState {
  confirmedOrders: OrderType[]
  loading: boolean
  error: string | null
}

const initialState: OrderState = {
  confirmedOrders: [],
  loading: false,
  error: null
}

// Fetch all (confirmed + pending) orders
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

// Confirm
export const confirmOrderByRestaurant = createAsyncThunk(
  'orders/confirmOrderByRestaurant',
  async (
    {
      orderId,
      prepTime,
      deliveryFee,
      taxValue
    }: { orderId: number; prepTime: number; deliveryFee?: number; taxValue?: number },
    { rejectWithValue }
  ) => {
    try {
      await axios.post(`/api/orders/${orderId}/restaurant-confirm`, {
        prepTime,
        deliveryFee,
        taxValue
      })
      return { orderId, prepTime, deliveryFee, taxValue }
    } catch (err: any) {
      return rejectWithValue(err.response?.data || 'Error confirming order')
    }
  }
)

// ** Reject **
export const rejectOrderByRestaurant = createAsyncThunk(
  'orders/rejectOrderByRestaurant',
  async (
    { orderId, reason }: { orderId: number; reason: string },
    { rejectWithValue }
  ) => {
    try {
      await axios.post(`/api/orders/${orderId}/restaurant-reject`, { reason })
      return { orderId }
    } catch (err: any) {
      return rejectWithValue(err.response?.data || 'Error rejecting order')
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
        const { orderId, prepTime, deliveryFee, taxValue } = action.payload
        const idx = state.confirmedOrders.findIndex(o => o.id === orderId)
        if (idx !== -1) {
          state.confirmedOrders[idx].finalConfirmed = true
          state.confirmedOrders[idx].prepTime = prepTime
          state.confirmedOrders[idx].deliveryFee = deliveryFee
          state.confirmedOrders[idx].taxValue = taxValue
        }
      })
      .addCase(confirmOrderByRestaurant.rejected, (state, action) => {
        state.error = action.payload as string
      })

      // ** rejectOrderByRestaurant **
      .addCase(rejectOrderByRestaurant.fulfilled, (state, action) => {
        const { orderId } = action.payload
        // Remove rejected order from list
        state.confirmedOrders = state.confirmedOrders.filter(o => o.id !== orderId)
      })
      .addCase(rejectOrderByRestaurant.rejected, (state, action) => {
        state.error = action.payload as string
      })
  }
})

export default orderSlice.reducer
