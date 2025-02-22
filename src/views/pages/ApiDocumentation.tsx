import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Card,
  CardContent,
  Chip,
  TextField,
  Button,
  IconButton,
  Collapse,
  ListItemButton,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import PageContainer from '../../components/container/PageContainer';

// Icons
import {
  VpnKey,
  Api,
  Message,
  ShoppingCart,
  Search,
  ExpandMore,
  ExpandLess,
  PlayArrow,
  Person,
  VerifiedUser,
  AdminPanelSettings,
  BugReport,
} from '@mui/icons-material';

/* 
  1) عرف واجهات تشرح شكل البيانات بالتفصيل
*/

// واجهة لهيكل response. (المفاتيح هي أكواد الحالة مثلاً 200, 201, 400,...)
// يمكن أن تكون أي نوع (any) لو أردت
interface EndpointResponse {
  [statusCode: string]: any;
}

interface EndpointExample {
  body: any;
  response?: EndpointResponse; 
}

interface EndpointDoc {
  id: string;
  title: string;
  method: string;
  url: string;
  description: string;
  example: EndpointExample;
}

interface SectionDoc {
  id: string;
  title: string;
  icon: React.ReactNode;
  endpoints: EndpointDoc[];
}

/*
  2) عرف أي مكونات styled() أو متغيرات
*/
const SidebarWrapper = styled(Paper)(({ theme }) => ({
  height: '100%',
  padding: theme.spacing(2),
  position: 'sticky',
  top: theme.spacing(2),
}));

const ApiSection = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(3),
  '& pre': {
    background: theme.palette.grey[100],
    padding: theme.spacing(2),
    borderRadius: theme.spacing(1),
    overflow: 'auto',
  },
}));

const EndpointChip = styled(Chip)<{ methodtype: string }>(({ theme, methodtype }) => {
  let bgColor = theme.palette.grey[500];
  if (methodtype === 'GET') bgColor = theme.palette.success.main;
  if (methodtype === 'POST') bgColor = theme.palette.primary.main;
  if (methodtype === 'PUT') bgColor = theme.palette.warning.main;
  if (methodtype === 'DELETE') bgColor = theme.palette.error.main;

  return {
    marginBottom: theme.spacing(2),
    background: bgColor,
    color: '#fff',
  };
});

const SearchBox = styled(TextField)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  width: '100%',
}));

// ================================
// 2) تعريف أقسام الـ API (apiSections)
//    مع وضع الـ request/response الفعلية المنطقية بناءً على أكوادك
// ================================

const apiSections = [
  // ============================ AUTH ============================
  {
    id: 'auth',
    title: 'المصادقة (Authentication)',
    icon: <VpnKey />,
    endpoints: [
      {
        id: 'register',
        title: 'تسجيل حساب جديد (Register)',
        method: 'POST',
        url: '/api/auth/register',
        description: 'إنشاء حساب مستخدم جديد',
        example: {
          body: {
            username: 'testuser',
            password: 'testpass',
            subscriptionType: 'free',
            name: 'Test User',
          },
          response: {
            400: [
              { message: 'يرجى ملء جميع الحقول' },
              { message: 'اسم المستخدم موجود بالفعل' },
            ],
            201: { message: 'تم التسجيل بنجاح' },
          },
        },
      },
      {
        id: 'login',
        title: 'تسجيل الدخول (Login)',
        method: 'POST',
        url: '/api/auth/login',
        description: 'تسجيل الدخول والحصول على توكن (JWT)',
        example: {
          body: {
            username: 'testuser',
            password: 'testpass',
          },
          response: {
            400: [
              { message: 'يرجى ملء جميع الحقول' },
              { message: 'اسم المستخدم أو كلمة المرور غير صحيحة' },
            ],
            200: {
              message: 'تم تسجيل الدخول بنجاح',
              token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
            },
          },
        },
      },
    ],
  },

  // ============================ USERS ============================
  {
    id: 'users',
    title: 'إدارة المستخدمين (Users) - Admin Only',
    icon: <Person />,
    endpoints: [
      {
        id: 'getUsers',
        title: 'جلب جميع المستخدمين (Get All Users)',
        method: 'GET',
        url: '/api/users',
        description: 'عرض قائمة بجميع المستخدمين (يتطلب صلاحية Admin)',
        example: {
          body: {},
          response: {
            403: { message: 'Forbidden: Admins only.' },
            200: [
              {
                id: 1,
                username: 'admin',
                name: 'Admin User',
                subscriptionStart: '2023-01-01',
                subscriptionEnd: '2023-12-31',
                subscriptionType: 'admin',
              },
              {
                id: 2,
                username: 'user1',
                name: 'User One',
                subscriptionStart: null,
                subscriptionEnd: null,
                subscriptionType: 'free',
              },
            ],
          },
        },
      },
      {
        id: 'createUser',
        title: 'إنشاء مستخدم جديد (Create User)',
        method: 'POST',
        url: '/api/users',
        description: 'إنشاء مستخدم جديد بواسطة Admin',
        example: {
          body: {
            username: 'newUser',
            password: 'pass123',
            name: 'Jane Smith',
            subscriptionStart: '2023-01-01',
            subscriptionEnd: '2023-12-31',
            subscriptionType: 'premium',
          },
          response: {
            403: { message: 'Forbidden: Admins only.' },
            400: [
              { message: 'اسم المستخدم موجود بالفعل' },
              { message: 'يرجى إدخال اسم المستخدم وكلمة المرور' },
            ],
            201: { message: 'تم إنشاء المستخدم بنجاح' },
          },
        },
      },
      {
        id: 'updateUser',
        title: 'تحديث بيانات مستخدم (Update User)',
        method: 'POST',
        url: '/api/users/:id/update',
        description: 'تعديل بيانات مستخدم محدد (Admin Only)',
        example: {
          body: {
            username: 'updatedName',
            password: 'newPass',
            subscriptionStart: '2023-02-01',
            subscriptionEnd: '2023-12-01',
            subscriptionType: 'free',
          },
          response: {
            403: { message: 'Forbidden: Admins only.' },
            200: { message: 'تم تحديث بيانات المستخدم بنجاح' },
          },
        },
      },
      {
        id: 'deleteUser',
        title: 'حذف مستخدم (Delete User)',
        method: 'POST',
        url: '/api/users/:id/delete',
        description: 'حذف مستخدم (Admin Only)',
        example: {
          body: {},
          response: {
            403: { message: 'Forbidden: Admins only.' },
            200: { message: 'تم حذف المستخدم بنجاح' },
          },
        },
      },
      {
        id: 'userLogs',
        title: 'جلب سجل الاشتراك (Get Subscription Logs)',
        method: 'GET',
        url: '/api/users/:userId/logs',
        description: 'جلب سجل الاشتراك لمستخدم محدد (Admin Only)',
        example: {
          body: {},
          response: {
            401: { message: 'Unauthorized' },
            403: { message: 'Forbidden: Admin only.' },
            200: [
              {
                id: 1,
                userId: 5,
                oldSubscriptionType: 'free',
                newSubscriptionType: 'premium',
                changedAt: '2023-08-10T12:00:00.000Z',
              },
            ],
          },
        },
      },
    ],
  },

  // ============================ SESSIONS ============================
  {
    id: 'sessions',
    title: 'إدارة الجلسات (Sessions)',
    icon: <Message />,
    endpoints: [
      {
        id: 'fetchSessions',
        title: 'جلب الجلسات (Fetch Sessions)',
        method: 'GET',
        url: '/api/sessions',
        description: 'عرض جميع جلسات الواتساب المملوكة للمستخدم',
        example: {
          body: {},
          response: {
            401: { message: 'User not authorized.' },
            200: [
              {
                id: 1,
                userId: 5,
                sessionIdentifier: '5.free.1681234567890',
                status: 'Connected',
                greetingMessage: null,
                greetingActive: false,
                botActive: false,
              },
            ],
          },
        },
      },
      {
        id: 'createSession',
        title: 'إنشاء جلسة (Create Session)',
        method: 'POST',
        url: '/api/sessions',
        description: 'إنشاء جلسة واتساب جديدة',
        example: {
          body: {
            status: 'Inactive',
            greetingMessage: 'Welcome to our service!',
            greetingActive: true,
          },
          response: {
            401: { message: 'User not authorized.' },
            400: { message: 'Maximum session limit reached.' },
            201: { message: 'Session created successfully.' },
          },
        },
      },
      {
        id: 'deleteSession',
        title: 'حذف جلسة (Delete Session)',
        method: 'POST',
        url: '/api/sessions/:id/delete',
        description: 'حذف جلسة نهائيًا',
        example: {
          body: {},
          response: {
            400: { message: 'Invalid session ID.' },
            404: { message: 'Session not found.' },
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'Session deleted successfully.' },
          },
        },
      },
      {
        id: 'getQr',
        title: 'عرض كود QR (Get QR Code)',
        method: 'GET',
        url: '/api/sessions/:id/qr',
        description: 'يعرض رمز الـ QR لجلسة في حالة Waiting for QR Code',
        example: {
          body: {},
          response: {
            404: { message: 'Session not found' },
            403: { message: 'Forbidden: You do not own this session.' },
            200: { qr: 'base64EncodedQRCode...' },
          },
        },
      },
      {
        id: 'updateGreeting',
        title: 'تحديث رسالة الترحيب (Update Greeting)',
        method: 'POST',
        url: '/api/sessions/:id/greeting/update',
        description: 'تحديث أو تفعيل/تعطيل رسالة الترحيب',
        example: {
          body: {
            greetingMessage: 'Hello and welcome!',
            greetingActive: true,
          },
          response: {
            404: { message: 'Session not found' },
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'Greeting updated successfully.' },
          },
        },
      },
      {
        id: 'updateBotStatus',
        title: 'تحديث حالة البوت (Bot ON/OFF)',
        method: 'POST',
        url: '/api/sessions/:id/bot/update',
        description: 'تفعيل أو إيقاف البوت المعتمد على الكلمات المفتاحية',
        example: {
          body: {
            botActive: true,
          },
          response: {
            404: { message: 'Session not found' },
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'Bot status updated successfully.' },
          },
        },
      },
      {
        id: 'logoutSession',
        title: 'تسجيل الخروج (Logout Session)',
        method: 'POST',
        url: '/api/sessions/:id/logout',
        description: 'تسجيل الخروج من الجلسة وحذف الملفات',
        example: {
          body: {},
          response: {
            400: { message: 'Invalid session ID.' },
            404: { message: 'Session not found in DB.' },
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'Session logged out successfully (files removed).' },
          },
        },
      },
      {
        id: 'loginSession',
        title: 'تسجيل الدخول مجددًا (Login Session)',
        method: 'POST',
        url: '/api/sessions/:id/login',
        description: 'إعادة تهيئة الجلسة (بمسح QR جديد)',
        example: {
          body: {},
          response: {
            400: { message: 'Invalid session ID.' },
            404: { message: 'Session not found.' },
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'Session login initiated. Please scan the QR code.' },
          },
        },
      },
      {
        id: 'menuBotStatus',
        title: 'تحديث حالة الـ Menu Bot (MenuBot ON/OFF)',
        method: 'POST',
        url: '/api/sessions/:id/menu-bot/update',
        description: 'تفعيل/إيقاف الـ Menu Bot',
        example: {
          body: {
            menuBotActive: true,
          },
          response: {
            400: { message: 'Invalid session ID.' },
            404: { message: 'Session not found.' },
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'MenuBot status updated successfully.' },
          },
        },
      },
      {
        id: 'broadcastMessage',
        title: 'إرسال رسالة جماعية (Broadcast)',
        method: 'POST',
        url: '/api/sessions/:id/broadcast',
        description: 'إرسال رسالة لمجموعة أرقام مع مرفقات',
        example: {
          body: {
            phoneNumbers: ['201234567890', '201234567891'],
            message: 'Hello Everyone!',
            randomNumbers: [3, 5, 10], // تأخيرات عشوائية بالثواني
            media: [],
          },
          response: {
            400: { message: 'Invalid input data' },
            404: { message: 'WhatsApp client not found for this session.' },
            500: { message: 'Internal server error' },
            200: { message: 'Broadcast started successfully' },
          },
        },
      },
    ],
  },

  // ============================ CATEGORIES ============================
  {
    id: 'categories',
    title: 'الأصناف (Categories)',
    icon: <Api />,
    endpoints: [
      {
        id: 'addCategory',
        title: 'إضافة صنف (Add Category)',
        method: 'POST',
        url: '/api/sessions/:sessionId/category',
        description: 'إضافة صنف جديد ضمن جلسة',
        example: {
          body: {
            category_name: 'Burgers',
          },
          response: {
            400: { message: 'category_name is required.' },
            403: { message: 'Forbidden: You do not own this session.' },
            201: { message: 'Category added successfully.' },
          },
        },
      },
      {
        id: 'getCategories',
        title: 'جلب الأصناف (Get Categories)',
        method: 'GET',
        url: '/api/sessions/:sessionId/categories',
        description: 'عرض جميع الأصناف المرتبطة بالجلسة',
        example: {
          body: {},
          response: {
            403: { message: 'Forbidden: You do not own this session.' },
            200: [
              { id: 1, category_name: 'Burgers' },
              { id: 2, category_name: 'Drinks' },
            ],
          },
        },
      },
      {
        id: 'updateCategory',
        title: 'تحديث صنف (Update Category)',
        method: 'POST',
        url: '/api/sessions/:sessionId/category/:categoryId/update',
        description: 'تحديث اسم الصنف',
        example: {
          body: {
            category_name: 'New Category Name',
          },
          response: {
            400: { message: 'category_name is required.' },
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'Category updated successfully.' },
          },
        },
      },
      {
        id: 'deleteCategory',
        title: 'حذف صنف (Delete Category)',
        method: 'POST',
        url: '/api/sessions/:sessionId/category/:categoryId/delete',
        description: 'حذف الصنف نهائيًا',
        example: {
          body: {},
          response: {
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'Category deleted successfully.' },
          },
        },
      },
    ],
  },

  // ============================ PRODUCTS ============================
  {
    id: 'products',
    title: 'المنتجات (Products)',
    icon: <Api />,
    endpoints: [
      {
        id: 'addProduct',
        title: 'إضافة منتج (Add Product)',
        method: 'POST',
        url: '/api/sessions/:sessionId/product',
        description: 'إضافة منتج جديد ضمن جلسة وفئة معينة',
        example: {
          body: {
            product_name: 'Chicken Burger',
            category_id: 1,
            price: 30.5,
          },
          response: {
            400: { message: 'product_name and category_id are required.' },
            201: { message: 'Product added successfully.' },
            403: { message: 'Forbidden: You do not own this session.' },
          },
        },
      },
      {
        id: 'getProducts',
        title: 'جلب المنتجات (Get Products)',
        method: 'GET',
        url: '/api/sessions/:sessionId/products',
        description: 'عرض جميع المنتجات المرتبطة بالجلسة',
        example: {
          body: {},
          response: {
            403: { message: 'Forbidden: You do not own this session.' },
            200: [
              { id: 10, product_name: 'Chicken Burger', category_id: 1, price: 30.5 },
              { id: 11, product_name: 'Pepsi', category_id: 2, price: 5 },
            ],
          },
        },
      },
      {
        id: 'updateProduct',
        title: 'تحديث منتج (Update Product)',
        method: 'POST',
        url: '/api/sessions/:sessionId/product/:productId/update',
        description: 'تحديث بيانات المنتج',
        example: {
          body: {
            product_name: 'Beef Burger',
            category_id: 1,
            price: 35,
          },
          response: {
            400: { message: 'product_name and category_id are required.' },
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'Product updated successfully.' },
          },
        },
      },
      {
        id: 'deleteProduct',
        title: 'حذف منتج (Delete Product)',
        method: 'POST',
        url: '/api/sessions/:sessionId/product/:productId/delete',
        description: 'حذف المنتج نهائيًا',
        example: {
          body: {},
          response: {
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'Product deleted successfully.' },
          },
        },
      },
    ],
  },

  // ============================ KEYWORDS ============================
  {
    id: 'keywords',
    title: 'الكلمات المفتاحية (Keywords)',
    icon: <Message />,
    endpoints: [
      {
        id: 'addKeyword',
        title: 'إضافة Keyword (Add Keyword)',
        method: 'POST',
        url: '/api/sessions/:sessionId/keyword',
        description: 'إضافة كلمة مفتاحية مع رد نصي وصور اختيارية (باستخدام multer)',
        example: {
          body: {
            keyword: 'hi',
            replyText: 'Hello, how can I help?',
          },
          response: {
            400: { message: 'keyword and replyText are required.' },
            201: { message: 'Keyword added successfully.' },
            403: { message: 'Forbidden: You do not own this session.' },
          },
        },
      },
      {
        id: 'getKeywords',
        title: 'جلب الكلمات المفتاحية (Get Keywords)',
        method: 'GET',
        url: '/api/sessions/:sessionId/keywords',
        description: 'عرض جميع الكلمات المفتاحية وردودها',
        example: {
          body: {},
          response: {
            403: { message: 'Forbidden: You do not own this session.' },
            200: [
              {
                keywordId: 1,
                keyword: 'hi',
                replayId: 2,
                replyText: 'Hello, how can I help?',
                mediaFiles: [
                  {
                    mediaId: 1,
                    mediaPath: 'keywords-images/...',
                    mediaName: 'someImage.jpg',
                  },
                ],
              },
            ],
          },
        },
      },
      {
        id: 'updateKeyword',
        title: 'تحديث Keyword (Update Keyword)',
        method: 'POST',
        url: '/api/sessions/:sessionId/keyword/:keywordId/update',
        description: 'تحديث الكلمة المفتاحية ونص الرد واستبدال المرفقات',
        example: {
          body: {
            newKeyword: 'updated keyword',
            newReplyText: 'new reply text',
          },
          response: {
            404: { message: 'Keyword not found.' },
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'Keyword updated successfully.' },
          },
        },
      },
      {
        id: 'deleteKeyword',
        title: 'حذف Keyword (Delete Keyword)',
        method: 'POST',
        url: '/api/sessions/:sessionId/keyword/:keywordId/delete',
        description: 'حذف الكلمة المفتاحية والميديا المرافقة لها',
        example: {
          body: {},
          response: {
            404: { message: 'Keyword not found.' },
            403: { message: 'Forbidden: You do not own this session.' },
            200: { message: 'Keyword deleted successfully.' },
          },
        },
      },
    ],
  },

  // ============================ ORDERS ============================
  {
    id: 'orders',
    title: 'الطلبات (Orders)',
    icon: <ShoppingCart />,
    endpoints: [
      {
        id: 'getNewOrders',
        title: 'جلب الطلبات الجديدة (Get New Orders)',
        method: 'GET',
        url: '/api/orders/new',
        description: 'عرض الطلبات ذات الحالة غير المؤكدة (المفترض status != CONFIRMED لكن الكود به تعديل)',
        example: {
          body: {},
          response: {
            401: { message: 'User not authorized. No token or invalid token.' },
            200: [
              // أمثلة شكل الطلب
              {
                id: 101,
                sessionId: 3,
                customerPhone: '20123456789',
                customerName: 'Ali Hassan',
                status: 'IN_CART',
                deliveryAddress: 'Cairo, Maadi',
                totalPrice: 55.5,
                createdAt: '2023-11-15T12:00:00.000Z',
                items: [
                  {
                    productName: 'Burger',
                    productInternalCode: 'PRD-BUR001',
                    categoryName: 'Food',
                    categoryInternalCode: 'CAT-FD',
                    quantity: 2,
                    price: 15,
                  },
                ],
              },
            ],
          },
        },
      },
      {
        id: 'getAllOrders',
        title: 'جلب جميع الطلبات (Get All Orders)',
        method: 'GET',
        url: '/api/orders/all',
        description: 'عرض جميع الطلبات الخاصة بالمستخدم',
        example: {
          body: {},
          response: {
            401: { message: 'User not authorized. No token or invalid token.' },
            200: [
              {
                id: 102,
                sessionId: 3,
                customerPhone: '20123456789',
                customerName: 'Omar',
                status: 'CONFIRMED',
                deliveryAddress: 'Alexandria',
                totalPrice: 110,
                createdAt: '2023-11-16T10:00:00.000Z',
                items: [
                  {
                    productName: 'Pepsi',
                    productInternalCode: 'PRD-DRK002',
                    categoryName: 'Drinks',
                    categoryInternalCode: 'CAT-DRK',
                    quantity: 1,
                    price: 10.5,
                  },
                ],
              },
            ],
          },
        },
      },
      {
        id: 'getConfirmedOrders',
        title: 'جلب الطلبات المؤكدة (Get Confirmed Orders)',
        method: 'GET',
        url: '/api/orders/confirmed',
        description: 'عرض الطلبات ذات الحالة المؤكدة (CONFIRMED)',
        example: {
          body: {},
          response: {
            401: { message: 'User not authorized.' },
            200: [
              {
                id: 110,
                sessionId: 3,
                customerPhone: '20123456789',
                customerName: 'Ali',
                totalPrice: 80.5,
                items: [],
              },
            ],
          },
        },
      },
      {
        id: 'confirmOrder',
        title: 'تأكيد الطلب (Confirm Order) - Admin Only',
        method: 'POST',
        url: '/api/orders/:orderId/restaurant-confirm',
        description: 'تحديث الطلب وتأكيده وإشعار العميل عبر واتساب',
        example: {
          body: {
            prepTime: 30,
            deliveryFee: 10.0,
            taxValue: 5.0,
          },
          response: {
            403: { message: 'Forbidden: Admin only can confirm orders.' },
            404: { message: 'Order not found.' },
            200: [
              { message: 'Order confirmed and notification sent to customer.' },
              { message: 'Order confirmed, but WhatsApp client not found to send message.' },
            ],
          },
        },
      },
      {
        id: 'getOrderDetails',
        title: 'تفاصيل الطلب (Get Order Details)',
        method: 'GET',
        url: '/api/orders/:orderId',
        description: 'جلب تفاصيل الطلب وعناصره',
        example: {
          body: {},
          response: {
            400: { message: 'Invalid order ID.' },
            404: { message: 'Order not found.' },
            403: { message: 'Forbidden: You do not own this order.' },
            200: {
              id: 105,
              sessionId: 3,
              customerPhone: '20123456789',
              customerName: 'Ali',
              items: [
                { productName: 'Burger', quantity: 2, price: 30 },
              ],
            },
          },
        },
      },
    ],
  },

  // ============================ OTP ============================
  {
    id: 'otp',
    title: 'OTP (رمز التحقق)',
    icon: <Message />,
    endpoints: [
      {
        id: 'sendOtp',
        title: 'إرسال OTP عبر الواتساب (Send OTP)',
        method: 'POST',
        url: '/api/otp/send',
        description: 'إرسال كود تحقق مكوّن من 4 أرقام إلى رقم هاتف عبر واتساب (Session must be Connected)',
        example: {
          body: {
            sessionId: 1,
            phoneNumber: '201234567890',
          },
          response: {
            401: { message: 'User not authorized.' },
            400: { message: 'sessionId and phoneNumber are required.' },
            404: [
              { message: 'Session not found or not owned by this user.' },
              { message: 'WhatsApp client not found or not initialized.' },
            ],
            200: { otpCode: '1234' },
          },
        },
      },
    ],
  },

  // ============================ BULK IMPORT ============================
  {
    id: 'bulkImport',
    title: 'Bulk Import (الأصناف والمنتجات)',
    icon: <Api />,
    endpoints: [
      {
        id: 'bulkCategoriesAndProducts',
        title: 'Bulk Import (Categories & Products)',
        method: 'POST',
        url: '/api/bulk-import/:sessionId',
        description: 'إضافة عدة أصناف ومنتجات دفعة واحدة',
        example: {
          body: {
            categories: [
              { category_name: 'Pizza', category_internal_code: 'C-PIZZA' },
              { category_name: 'Drinks', category_internal_code: 'C-DRINKS' },
            ],
            products: [
              {
                product_name: 'Margherita Pizza',
                price: 50.0,
                category_id: 1,
                product_internal_code: 'PRD-PIZZA-001',
              },
            ],
          },
          response: {
            400: { message: 'Invalid session ID.' },
            404: { message: 'Session not found' },
            403: { message: 'Forbidden: You do not own this session.' },
            201: { message: 'Bulk add for categories and products successful.' },
          },
        },
      },
    ],
  },

  // ============================ FEATURES ============================
  {
    id: 'features',
    title: 'الميزات (Features)',
    icon: <VerifiedUser />,
    endpoints: [
      {
        id: 'getAllFeatures',
        title: 'جلب كل الميزات (Get All Features)',
        method: 'GET',
        url: '/api/features',
        description: 'عرض قائمة الميزات المتوفرة',
        example: {
          body: {},
          response: {
            200: [
              { id: 1, featureKey: 'someFeature', featureName: 'Some Feature' },
            ],
          },
        },
      },
      {
        id: 'getUserFeatures',
        title: 'جلب ميزات مستخدم (Get User Features)',
        method: 'GET',
        url: '/api/features/user/:userId',
        description: 'عرض الميزات المفعلة لدى مستخدم معين',
        example: {
          body: {},
          response: {
            200: [
              {
                userId: 5,
                featureId: 1,
                startDate: '2023-01-01',
                endDate: '2023-12-31',
                isActive: true,
                featureKey: 'someFeature',
                featureName: 'Some Feature',
              },
            ],
          },
        },
      },
      {
        id: 'addFeatureToUser',
        title: 'إضافة ميزة لمستخدم (Add Feature)',
        method: 'POST',
        url: '/api/features/user/:userId',
        description: 'تعيين ميزة لمستخدم بفترة صلاحية',
        example: {
          body: {
            featureId: 1,
            startDate: '2023-01-01',
            endDate: '2023-12-31',
          },
          response: {
            201: { message: 'Feature added to user.' },
          },
        },
      },
      {
        id: 'updateUserFeature',
        title: 'تحديث ميزة مستخدم (Update User Feature)',
        method: 'POST',
        url: '/api/features/user-feature/:userFeatureId/update',
        description: 'تغيير حالة تفعيل الميزة أو تاريخ البدء/الانتهاء',
        example: {
          body: {
            isActive: true,
            startDate: '2023-02-01',
            endDate: '2023-11-30',
          },
          response: {
            200: { message: 'UserFeature updated' },
          },
        },
      },
      {
        id: 'deleteUserFeature',
        title: 'حذف ميزة من مستخدم (Delete User Feature)',
        method: 'POST',
        url: '/api/features/user-feature/:userFeatureId/delete',
        description: 'إزالة الميزة من المستخدم نهائيًا',
        example: {
          body: {},
          response: {
            200: { message: 'Feature removed from user' },
          },
        },
      },
    ],
  },

  // ============================ ADMIN FEATURES ============================
  {
    id: 'adminFeatures',
    title: 'الميزات (Admin Only)',
    icon: <AdminPanelSettings />,
    endpoints: [
      {
        id: 'getAllFeaturesAdmin',
        title: 'جلب جميع الميزات (Admin)',
        method: 'GET',
        url: '/api/admin/features',
        description: 'عرض كل الميزات في النظام (Admin Only)',
        example: {
          body: {},
          response: {
            403: { message: 'Forbidden: Admin only.' },
            200: [
              { id: 1, featureKey: 'myFeatureKey', featureName: 'My Feature' },
            ],
          },
        },
      },
      {
        id: 'createFeature',
        title: 'إنشاء ميزة جديدة (Create Feature)',
        method: 'POST',
        url: '/api/admin/features',
        description: 'إضافة ميزة جديدة للنظام (Admin Only)',
        example: {
          body: {
            featureKey: 'myFeatureKey',
            featureName: 'My Feature',
          },
          response: {
            403: { message: 'Forbidden: Admin only.' },
            201: { message: 'Feature created successfully.' },
          },
        },
      },
      {
        id: 'updateFeature',
        title: 'تحديث ميزة (Update Feature)',
        method: 'POST',
        url: '/api/admin/features/:featureId/update',
        description: 'تحديث اسم أو مفتاح الميزة (Admin Only)',
        example: {
          body: {
            featureKey: 'updatedKey',
            featureName: 'Updated Feature',
          },
          response: {
            403: { message: 'Forbidden: Admin only.' },
            200: { message: 'Feature updated successfully.' },
          },
        },
      },
      {
        id: 'deleteFeature',
        title: 'حذف ميزة (Delete Feature)',
        method: 'POST',
        url: '/api/admin/features/:featureId/delete',
        description: 'حذف ميزة من قاعدة البيانات (Admin Only)',
        example: {
          body: {},
          response: {
            403: { message: 'Forbidden: Admin only.' },
            200: { message: 'Feature deleted successfully.' },
          },
        },
      },
    ],
  },

  // ============================ HEALTH ============================
  {
    id: 'health',
    title: 'فحص الصحة (Health Check)',
    icon: <BugReport />,
    endpoints: [
      {
        id: 'healthCheck',
        title: 'Health Check',
        method: 'GET',
        url: '/health',
        description: 'تأكد من عمل السيرفر (يُرجع status=OK)',
        example: {
          body: {},
          response: {
            200: { status: 'OK' },
          },
        },
      },
    ],
  },
];

// ================================
// 3) مكوّن الصفحة الرئيسي
// ================================
const ApiDocumentation: React.FC = () => {
  const [selectedSection, setSelectedSection] = useState<string>('auth');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedEndpoint, setExpandedEndpoint] = useState<string | null>(null);
  const [testResponse, setTestResponse] = useState<any>(null);

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleEndpointExpand = (endpointId: string) => {
    setExpandedEndpoint(expandedEndpoint === endpointId ? null : endpointId);
    setTestResponse(null);
  };

  // لا نستخدم axios، بل فقط نعرض الرد الثابت
  const handleTestEndpoint = (endpoint: EndpointDoc) => {
    if (endpoint.example.response) {
      setTestResponse(endpoint.example.response);
    } else {
      setTestResponse({ message: 'No mock response provided.' });
    }
  };

  // 1) فلترة الأقسام حسب البحث
  const filteredSections = apiSections
  .map((section: SectionDoc) => ({
    ...section,
    endpoints: section.endpoints.filter((endpoint: EndpointDoc) =>
      endpoint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      endpoint.url.toLowerCase().includes(searchQuery.toLowerCase())
    ),
  }))
  .filter((section: SectionDoc) => section.endpoints.length > 0);

  // 2) دالة لعرض القسم المختار
  const renderApiContent = () => {
    const currentSection = filteredSections.find((section) => section.id === selectedSection);
    if (!currentSection) return null;

    return currentSection.endpoints.map((endpoint: EndpointDoc) => (
      <ApiSection key={endpoint.id}>
        <CardContent>
          <EndpointChip label={`${endpoint.method} ${endpoint.url}`} methodtype={endpoint.method} />
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" gutterBottom>
              {endpoint.title}
            </Typography>
            <IconButton onClick={() => handleEndpointExpand(endpoint.id)}>
              {expandedEndpoint === endpoint.id ? <ExpandLess /> : <ExpandMore />}
            </IconButton>
          </Box>

          <Collapse in={expandedEndpoint === endpoint.id}>
            <Box mt={2}>
              <Typography variant="body2" paragraph>
                {endpoint.description}
              </Typography>

              <Typography variant="subtitle2" gutterBottom>
                Example Request Body:
              </Typography>
              <pre>{JSON.stringify(endpoint.example.body, null, 2)}</pre>

              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={() => handleTestEndpoint(endpoint)}
                sx={{ mt: 2 }}
              >
                Test Endpoint
              </Button>

              {testResponse && expandedEndpoint === endpoint.id && (
                <Box mt={2}>
                  <Typography variant="subtitle2" gutterBottom>
                    Possible Responses (Mock):
                  </Typography>
                  <pre>{JSON.stringify(testResponse, null, 2)}</pre>
                </Box>
              )}
            </Box>
          </Collapse>
        </CardContent>
      </ApiSection>
    ));
  };

  return (
    <PageContainer title="توثيق واجهة البرمجة" description="API Documentation">
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <SidebarWrapper>
            <SearchBox
              placeholder="ابحث في التوثيق..."
              variant="outlined"
              size="small"
              InputProps={{ startAdornment: <Search /> }}
              onChange={handleSearch}
            />
            <List>
              {filteredSections.map((section: SectionDoc) => (
                <React.Fragment key={section.id}>
                  <ListItem disablePadding>
                    <ListItemButton
                      selected={selectedSection === section.id}
                      onClick={() => setSelectedSection(section.id)}
                    >
                      <ListItemIcon>{section.icon}</ListItemIcon>
                      <ListItemText primary={section.title} />
                    </ListItemButton>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </SidebarWrapper>
        </Grid>

        <Grid item xs={12} md={9}>
          <Box sx={{ p: 2 }}>{renderApiContent()}</Box>
        </Grid>
      </Grid>
    </PageContainer>
  );
};

export default ApiDocumentation;