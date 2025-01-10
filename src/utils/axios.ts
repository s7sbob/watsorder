import axios from 'axios';

// إنشاء instance من Axios
const axiosServices = axios.create({
  baseURL: 'http://localhost:5000', // تحديد الـ baseURL بحيث يشير إلى خادم الـ backend
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor لإضافة التوكين في كل طلب
axiosServices.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token'); // جلب التوكين من localStorage
    if (token) {
      config.headers.Authorization = `Bearer ${token}`; // إضافة التوكين في الهيدر
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor لمعالجة الردود
axiosServices.interceptors.response.use(
  (response) => response, // تمرير الرد كما هو إذا كان ناجحًا
  (error) => {
    // معالجة الأخطاء وإرجاع رسالة خطأ واضحة
    return Promise.reject((error.response && error.response.data) || 'Wrong Services');
  }
);

export default axiosServices;
