import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
}

const initialState: AuthState = {
  token: sessionStorage.getItem('token') || null, // استخدام sessionStorage
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload;
      sessionStorage.setItem('token', action.payload); // حفظ التوكن في sessionStorage
    },
    clearToken(state) {
      state.token = null;
      sessionStorage.removeItem('token'); // إزالة التوكن من sessionStorage
    },
  },
});

export const { setToken, clearToken } = authSlice.actions;
export default authSlice.reducer;
export type { AuthState };
