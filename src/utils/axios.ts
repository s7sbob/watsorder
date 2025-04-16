// src/utils/axiosServices.ts
import axios from 'axios'
import { getCookie, deleteCookie } from './cookieHelpers'

const axiosServices = axios.create({
  baseURL: 'https://api.watsorder.com', // أو أي مسار للـ backend
  // baseURL: 'http://localhost:5000', // أو أي مسار للـ backend
  // baseURL: 'http://147.189.175.71:5000/', // أو أي مسار للـ backend
  headers: {
    'Content-Type': 'application/json'
  }
})
axiosServices.interceptors.request.use(
  (config) => {
    const token = getCookie('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

axiosServices.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.message === 'Invalid token.') {
      deleteCookie('token'); // احذف التوكن القديمة لأنها أصبحت expired
      window.location.href = '/auth/login'; // توجيه المستخدم لصفحة تسجيل الدخول
    }
    return Promise.reject((error.response && error.response.data) || 'خطأ في الخدمة');
  }
);

export default axiosServices;