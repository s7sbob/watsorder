// src/routes/paymobRoutes.ts
import express, { Request, Response } from 'express';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

// PayMob API Key (ضيفه في ملف .env أو هنا مباشرة لو مش فيه .env)
const PAYMOB_API_KEY = process.env.PAYMOB_API_KEY || 'YOUR_API_KEY_HERE_FROM_PAYMOB_DASHBOARD';
// PayMob Integration ID (استبدل بالـ ID الصحيح لو مختلف)
const PAYMOB_INTEGRATION_ID = process.env.PAYMOB_INTEGRATION_ID || 351308;
// PayMob Base URL (استخدام الـ URL الأساسي لأن الـ Sandbox مش متاح)
const PAYMOB_BASE_URL = 'https://accept.paymob.com';

// API لإنشاء طلب دفع
router.post('/create-payment', async (req: Request, res: Response) => {
  try {
    console.log('Creating payment request with total:', req.body.total);
    console.log('Using PayMob Base URL:', PAYMOB_BASE_URL);
    // خطوة 1: الحصول على Authentication Token من PayMob
    const authResponse = await axios.post(`${PAYMOB_BASE_URL}/api/auth/tokens`, {
      api_key: PAYMOB_API_KEY,
    });
    const token = authResponse.data.token;
    console.log('Authentication Token obtained:', token);

    // خطوة 2: إنشاء Order
    const orderResponse = await axios.post(`${PAYMOB_BASE_URL}/api/ecommerce/orders`, {
      auth_token: token,
      delivery_needed: false,
      amount_cents: Math.round(req.body.total * 100), // المبلغ بالقرش (مثال: 100 جنيه = 10000 قرش)
      items: req.body.items.map((item: any) => ({
        name: item.title || 'Product',
        amount_cents: Math.round(item.price * 100),
        description: item.description || 'No description',
        quantity: item.qty || 1,
      })),
    });
    const orderId = orderResponse.data.id;
    console.log('Order created with ID:', orderId);

    // خطوة 3: الحصول على Payment Key
    const paymentKeyResponse = await axios.post(`${PAYMOB_BASE_URL}/api/acceptance/payment_keys`, {
      auth_token: token,
      amount_cents: Math.round(req.body.total * 100),
      expiration: 3600, // انتهاء الصلاحية بعد ساعة
      order_id: orderId,
      billing_data: {
        apartment: req.body.apartment || 'NA',
        email: req.body.email || 'user@example.com',
        floor: req.body.floor || 'NA',
        first_name: req.body.firstName || 'User',
        street: req.body.street || 'NA',
        building: req.body.building || 'NA',
        phone_number: req.body.phone || 'NA',
        shipping_method: 'NA',
        postal_code: req.body.postalCode || 'NA',
        city: req.body.city || 'NA',
        country: req.body.country || 'NA',
        last_name: req.body.lastName || 'Name',
        state: req.body.state || 'NA',
      },
      currency: 'EGP',
      integration_id: PAYMOB_INTEGRATION_ID, // رقم الـ integration ID
    });
    const paymentKey = paymentKeyResponse.data.token;
    console.log('Payment Key obtained:', paymentKey);

    res.json({ paymentKey });
  } catch (error: any) {
    console.error('Error creating payment:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to create payment request',
      details: error.response?.data?.message || error.message,
    });
  }
});

export default router;
