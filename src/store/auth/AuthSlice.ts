// src/store/auth/AuthSlice.ts

import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import { jwtDecode } from "jwt-decode";
import { getCookie, setCookie, deleteCookie } from 'src/utils/cookieHelpers'

interface DecodedToken {
  id: number
  username: string
  subscriptionType: string
  // أي حقول أخرى موجودة في الـ token مثل exp, iat...
  exp?: number
  iat?: number
}

interface AuthState {
  token: string | null
  subscriptionType: string | null
}

// أولًا نجلب التوكن من الكوكي:
const savedToken = getCookie('token') || null

const initialState: AuthState = {
  token: savedToken,
  subscriptionType: null
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setToken(state, action: PayloadAction<string>) {
      state.token = action.payload
      // نضعه في الكوكي
      setCookie('token', action.payload, 1) // 1 يوم مثلًا

      // فكّ التوكن لاستخراج subscriptionType:
      try {
        const decoded = jwtDecode<DecodedToken>(action.payload)
        state.subscriptionType = decoded.subscriptionType || null
      } catch (error) {
        console.error('Error decoding token:', error)
        state.subscriptionType = null
      }
    },
    clearToken(state) {
      state.token = null
      state.subscriptionType = null
      // نحذف الكوكي
      deleteCookie('token')
    },
    // في حال أردت "إعادة فك" التوكن إذا تغيرت الكوكي خارجيًا:
    recheckCookie(state) {
      const cookieToken = getCookie('token')
      if (!cookieToken) {
        state.token = null
        state.subscriptionType = null
        return
      }
      state.token = cookieToken
      // فك التوكن واستخراج subscriptionType
      try {
        const decoded = jwtDecode<DecodedToken>(cookieToken)
        state.subscriptionType = decoded.subscriptionType || null
      } catch (error) {
        console.error('Error decoding token from cookie:', error)
        state.subscriptionType = null
      }
    }
  }
})

export const { setToken, clearToken, recheckCookie } = authSlice.actions
export default authSlice.reducer
export type { AuthState }

export const isTokenValid = (token: string | null): boolean => {
  if (!token) return false;
  try {
    const decoded = jwtDecode(token);
    if (!decoded.exp) return false;

    const currentTime = Date.now() / 1000;
    return decoded.exp > currentTime;
  } catch (error) {
    return false;
  }
};
