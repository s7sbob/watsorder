// src/store/auth/AuthSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  subscriptionType: string | null;
}

const initialState: AuthState = {
  token: sessionStorage.getItem('token') || null,
  subscriptionType: sessionStorage.getItem('subscriptionType') || null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    // هنا نستقبل معاً التوكن والـ subscriptionType من عملية تسجيل الدخول
    setToken(state, action: PayloadAction<{ token: string; subscriptionType: string }>) {
      state.token = action.payload.token;
      state.subscriptionType = action.payload.subscriptionType;
      sessionStorage.setItem('token', action.payload.token);
      sessionStorage.setItem('subscriptionType', action.payload.subscriptionType);
    },
    clearToken(state) {
      state.token = null;
      state.subscriptionType = null;
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('subscriptionType');
    },
  },
});

export const { setToken, clearToken } = authSlice.actions;
export default authSlice.reducer;
export type { AuthState };
