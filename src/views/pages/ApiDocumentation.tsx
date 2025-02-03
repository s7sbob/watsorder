// src/pages/ApiDocumentation.tsx

import React from 'react'
import { Box, Typography, Paper } from '@mui/material'

const ApiDocumentation: React.FC = () => {
  return (
    <Box sx={{ p: 2, direction: 'rtl', textAlign: 'right' }}>
      <Typography variant='h4' gutterBottom>
        توثيق التطبيق
      </Typography>
      
      {/* ---------------- (A) شرح أزرار صفحة الجلسات ---------------- */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant='h5' gutterBottom>
          شرح أزرار صفحة الجلسات
        </Typography>

        <Typography variant='body1' paragraph>
          في صفحة <strong>Sessions</strong> (SessionListing)، ستجد مجموعة أزرار بجانب كل جلسة،
          بالإضافة لبعض الأزرار الإضافية. فيما يلي ملخص لوظيفة كل زر:
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>1) Create Session:</strong> ينشئ جلسة واتساب جديدة مرتبطة بالمستخدم الحالي؛ 
          سيتم تخزينها في قاعدة البيانات، ويمكنك تهيئتها لاحقًا بعمل تسجيل دخول (Login) ومسح كود QR.
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>2) Show QR Code:</strong> يظهر هذا الزر فقط إذا كانت حالة الجلسة 
          "Waiting for QR Code". بالضغط عليه سيفتح نافذة تعرض الـ QR Code لعمل مسح من تطبيق واتساب.
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>3) Logout:</strong> يسجّل خروج من الجلسة النشطة، ويحذف ملفات الجلسة المحلية 
          (.wwebjs_auth) ويجعل حالة الجلسة "Terminated".
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>4) Login:</strong> يعيد تهيئة الجلسة إذا كانت بحالة "Terminated"؛ سيطلب منك 
          مسح كود جديد.
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>5) Category's:</strong> يفتح قائمة صغيرة تتيح لك:
          <ul>
            <li><em>Add Category</em> لإنشاء فئة جديدة.</li>
            <li><em>Existing Category's</em> لعرض الفئات الموجودة وتعديلها.</li>
          </ul>
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>6) Products:</strong> يفتح قائمة صغيرة تتيح لك:
          <ul>
            <li><em>Add Product</em> لإضافة منتج جديد ضمن تصنيف.</li>
            <li><em>Existing Products</em> لعرض المنتجات الموجودة وتعديلها.</li>
          </ul>
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>7) Keywords:</strong> يفتح Popup لإضافة كلمات مفتاحية (Keyword) وردودها 
          (قد تشمل نصًا أو صورًا). يُستخدم في البوت العادي.
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>8) Broadcast:</strong> يفتح نافذة لإرسال رسالة جماعية إلى قائمة من أرقام 
          هواتف. يمكنك رفع ملف Excel أو إدخال أرقام يدويًا، وإضافة مرفقات (صور) وما إلى ذلك.
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>9) Greeting:</strong> يفتح نافذة لتحديث رسالة الترحيب (Greeting) وتفعيلها 
          أو إيقافها.
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>10) Bot ON/OFF:</strong> يفعّل أو يوقف البوت الذي يعمل بالكلمات المفتاحية 
          (Keywords).
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>11) Menu Bot ON/OFF:</strong> يفعّل أو يوقف البوت القائم على المنيو (Menu Bot) 
          والذي يعتمد على أوامر مثل <em>NEWORDER</em> و<em>CATEGORY_x</em> وغيرها.
        </Typography>

        <Typography variant='body2' paragraph>
          <strong>12) Delete Session:</strong> يحذف الجلسة نهائيًا من قاعدة البيانات، بما يشمل 
          إغلاق اتصالها لو كانت نشطة.
        </Typography>
      </Paper>


 {/* -------------------------------------------------------- */}
      {/* (B) توثيق الـ Authentication (Register / Login) */}
      {/* -------------------------------------------------------- */}
      <Typography variant='h5' gutterBottom sx={{ mt: 4 }}>
        توثيق واجهات المصادقة (Authentication)
      </Typography>

      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant='h6'>1) Register (إنشاء حساب جديد)</Typography>
        <Typography variant='body2'>
          <strong>Endpoint:</strong> <code>POST /api/auth/register</code><br/>
          <strong>Headers:</strong><br/>
          &nbsp;• <code>Content-Type: application/json</code><br/><br/>
          <strong>Body (مثال):</strong>
          <pre style={{ background: '#f5f5f5', padding: '8px' }}>
{`{
  "username": "someUser",
  "password": "somePass",
  "subscriptionType": "free",
  "name": "اسم المستخدم"
}`}
          </pre>
          <strong>Response (مثال):</strong>
          <pre style={{ background: '#f5f5f5', padding: '8px' }}>
{`{
  "message": "تم التسجيل بنجاح"
}`}
          </pre>
          ينشئ حساب مستخدم جديد بالبيانات المقدمة. لا يتطلب توكن مصادقة؛ 
          أي شخص يستطيع تسجيل حساب.
        </Typography>
      </Paper>

      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant='h6'>2) Login (تسجيل الدخول)</Typography>
        <Typography variant='body2'>
          <strong>Endpoint:</strong> <code>POST /api/auth/login</code><br/>
          <strong>Headers:</strong><br/>
          &nbsp;• <code>Content-Type: application/json</code><br/><br/>
          <strong>Body (مثال):</strong>
          <pre style={{ background: '#f5f5f5', padding: '8px' }}>
{`{
  "username": "someUser",
  "password": "somePass"
}`}
          </pre>
          <strong>Response (مثال):</strong>
          <pre style={{ background: '#f5f5f5', padding: '8px' }}>
{`{
  "message": "تم تسجيل الدخول بنجاح",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}`}
          </pre>
          يقوم بالتحقق من صحة بيانات المستخدم، ثم يُنشئ JSON Web Token (JWT) يحتوي معلومات المستخدم. 
          يجب الاحتفاظ بهذا التوكن وإرساله في كل الطلبات اللاحقة في الـ Headers:
          <code>Authorization: Bearer [token]</code>.
        </Typography>
      </Paper>



      {/* ---------------- (B) توثيق الـ API ---------------- */}
      <Typography variant='h5' gutterBottom>
        توثيق الـ API
      </Typography>

      {/* OTP Endpoint */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant='h6'>1) إرسال OTP عبر الواتساب</Typography>
        <Typography variant='body2'>
          <strong>Endpoint:</strong> <code>POST /api/otp/send</code><br/>
          <strong>Headers:</strong><br/>
          &nbsp;• <code>Authorization: Bearer [token]</code><br/>
          &nbsp;• <code>Content-Type: application/json</code><br/><br/>
          <strong>Body (مثال):</strong>
          <pre style={{ background: '#f5f5f5', padding: '8px' }}>
{`{
  "sessionId": 1,
  "phoneNumber": "201234567890"
}`}
          </pre>
          <strong>Response (مثال):</strong>
          <pre style={{ background: '#f5f5f5', padding: '8px' }}>
{`{
  "otpCode": "1234"
}`}
          </pre>
          يقوم هذا الـ Endpoint بإرسال كود تحقق (OTP) مكوّن من 4 أرقام إلى رقم الواتساب المحدد، 
          ويعيد نفس الكود في الاستجابة.
        </Typography>
      </Paper>

      {/* Bulk Import Endpoint */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant='h6'>2) Bulk Import (الأصناف والمنتجات)</Typography>
        <Typography variant='body2'>
          <strong>Endpoint:</strong> <code>POST /api/bulk-import/:sessionId</code><br/>
          <strong>Headers:</strong><br/>
          &nbsp;• <code>Authorization: Bearer [token]</code><br/>
          &nbsp;• <code>Content-Type: application/json</code><br/><br/>
          <strong>Body (مثال):</strong>
          <pre style={{ background: '#f5f5f5', padding: '8px' }}>
{`{
  "categories": [
    { "category_name": "Cat One", "category_internal_code": "C001" },
    { "category_name": "Cat Two", "category_internal_code": "C002" }
  ],
  "products": [
    { 
      "product_name": "Prod A",
      "price": 10.5,
      "category_id": 1,
      "product_internal_code": "P-10"
    }
  ]
}`}
          </pre>
          <strong>Response:</strong>
          <pre style={{ background: '#f5f5f5', padding: '8px' }}>
{`{
  "message": "Bulk add for categories and products successful."
}`}
          </pre>
          يقوم هذا الEndpoint بإضافة مجموعة من الأصناف والمنتجات (مرفق معها 
          الأكواد الداخلية) دفعة واحدة في الجلسة المحددة.
        </Typography>
      </Paper>

      {/* Orders (New) */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant='h6'>3) جلب الطلبات الجديدة (غير المؤكدة)</Typography>
        <Typography variant='body2'>
          <strong>Endpoint:</strong> <code>GET /api/orders/new</code><br/>
          <strong>Headers:</strong><br/>
          &nbsp;• <code>Authorization: Bearer [token]</code><br/><br/>
          <strong>Response (مثال):</strong>
          <pre style={{ background: '#f5f5f5', padding: '8px' }}>
{`[
  {
    "id": 101,
    "sessionId": 3,
    "customerPhone": "20123456789",
    "customerName": "Ali Hassan",
    "status": "IN_CART",
    "deliveryAddress": "Cairo, Maadi",
    "totalPrice": 55.50,
    "createdAt": "2023-11-15T12:00:00.000Z",
    "items": [
      {
        "productName": "Burger",
        "productInternalCode": "PRD-BUR001",
        "categoryName": "Food",
        "categoryInternalCode": "CAT-FD",
        "quantity": 2,
        "price": 15
      }
    ]
  }
]`}
          </pre>
          يعيد قائمة بالطلبات التي <strong>لم يتم تأكيدها</strong> بعد (مثلاً: 
          <em>status != 'CONFIRMED'</em>).
        </Typography>
      </Paper>

      {/* Orders (All) */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant='h6'>4) جلب جميع الطلبات (All Orders)</Typography>
        <Typography variant='body2'>
          <strong>Endpoint:</strong> <code>GET /api/orders/all</code><br/>
          <strong>Headers:</strong><br/>
          &nbsp;• <code>Authorization: Bearer [token]</code><br/><br/>
          <strong>Response (مثال):</strong>
          <pre style={{ background: '#f5f5f5', padding: '8px' }}>
{`[
  {
    "id": 102,
    "sessionId": 3,
    "customerPhone": "20123456789",
    "customerName": "Omar",
    "status": "CONFIRMED",
    "deliveryAddress": "Alexandria",
    "totalPrice": 110,
    "createdAt": "2023-11-16T10:00:00.000Z",
    "items": [
      {
        "productName": "Pepsi",
        "productInternalCode": "PRD-DRK002",
        "categoryName": "Drinks",
        "categoryInternalCode": "CAT-DRK",
        "quantity": 1,
        "price": 10.5
      }
    ]
  }
]`}
          </pre>
          يعيد قائمة <strong>بجميع الطلبات</strong> الخاصة بالمستخدم الحالي في كل الجلسات 
          (أيًا كانت حالتها).
        </Typography>
      </Paper>

      <Typography variant='body1' paragraph sx={{ mt: 2 }}>
        يمكنك إضافة المزيد من الـ Endpoints أو تخصيص النص والشرح كما تحتاج.
      </Typography>
    </Box>
  )
}

export default ApiDocumentation
