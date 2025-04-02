// src/utils/axiosServices.ts
import axios from 'axios'
import { getCookie } from './cookieHelpers'

const axiosServices = axios.create({
  // baseURL: 'https://api.watsorder.com', // أو أي مسار للـ backend
  baseURL: 'http://localhost:5000', // أو أي مسار للـ backend
  // baseURL: 'http://147.189.175.71:5000/', // أو أي مسار للـ backend
  headers: {
    'Content-Type': 'application/json'
  }
})

axiosServices.interceptors.request.use(
  config => {
    // اقرأ التوكن من الكوكي بدلًا من localStorage
    const token = getCookie('token')
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

axiosServices.interceptors.response.use(
  response => response, // النجاح
  error => {
    // عرض رسالة خطأ واضحة
    return Promise.reject((error.response && error.response.data) || 'Wrong Services')
  }
)

export default axiosServices
