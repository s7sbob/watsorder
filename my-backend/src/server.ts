// server.ts أو app.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import bodyParser from 'body-parser';
import './cron/expireSessions';
import fs from 'fs';
import yaml from 'js-yaml';
import swaggerUi from 'swagger-ui-express';

import { initializeExistingSessions } from './controllers/session';

// استيراد المسارات
import orderRoutes from './routes/orderRoutes';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import sessionRoutes from './routes/sessionRoutes';
import otpRoutes from './routes/otpRoutes';
import bulkImportRoutes from './routes/bulkImportRoutes';
import orderListingRoutes from './routes/orderListingRoutes';
import featureRoutes from './routes/featureRoutes';
import featureAdminRoutes from './routes/featureAdminRoutes';
import registrationNotificationRoutes from './routes/registrationNotification.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// إعداد CORS للسيرفر ليقبل من أي نطاق (بما في ذلك Postman والأدوات الأخرى)
const corsOptions = {
  origin: true, // يقبل أي مصدر
  methods: ['GET', 'POST'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// تكوين الحد الأقصى لحجم الطلبات
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

// تسجيل الطلبات الواردة لأغراض التصحيح
app.use((req, _res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// تعيين المسارات
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/otp', otpRoutes);
app.use('/api/bulk-import', bulkImportRoutes);
app.use('/api/orders', orderListingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/features', featureRoutes);
app.use('/api/admin/features', featureAdminRoutes);
app.use('/api', registrationNotificationRoutes);

// خدمة الملفات الثابتة
app.use('/keywords-images', express.static('keywords-images'));

// إعداد Swagger UI لعرض توثيق API
try {
  const swaggerDocument = yaml.load(fs.readFileSync('./swagger.yaml', 'utf8')) as Record<string, any>;
  console.log('Swagger document loaded successfully.');
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, { explorer: true }));
} catch (error) {
  console.error('Error loading swagger.yaml:', error);
}


// نقطة فحص الصحة
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'OK' });
});

// إنشاء HTTP server
const httpServer = createServer(app);

// إعداد Socket.io مع السماح لجميع المصادر
export const io = new Server(httpServer, {
  cors: {
    origin: true, // يقبل أي مصدر
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// معالجة اتصالات السوكيت
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// تهيئة الجلسات الحالية
initializeExistingSessions()
  .then(() => console.log('Session initialization completed'))
  .catch((err) => console.error('Session initialization failed:', err));

// بدء التشغيل
httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

// معالجة الأخطاء غير الملتقطة
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
