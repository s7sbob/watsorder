// server.ts أو app.ts
import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeExistingSessions } from './controllers/sessionController' // أو أي ملف فيه الدالة
import orderRoutes from './routes/orderRoutes';

import authRoutes from './routes/auth';
import userRoutes from './routes/user'; // استيراد مسارات المستخدمين
import sessionRoutes from './routes/sessionRoutes';
import otpRoutes from './routes/otpRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ limit: '50mb', extended: true }))
app.use(cors());
app.use(bodyParser.json());

// ربط مسارات المصادقة
app.use('/api/auth', authRoutes);
// ربط مسارات المستخدمين
app.use('/api/users', userRoutes);

app.use('/api/sessions', sessionRoutes);
app.use('/api/otp', otpRoutes)

app.get('/', (req, res) => {
  res.send('Server is running');
});
app.use('/api/orders', orderRoutes);

// إنشاء خادم HTTP وSocket.IO
const httpServer = createServer(app);
export const io = new Server(httpServer, {
  cors: {
    origin: '*', // تأكد من ضبط المنشأ المناسب
  }
});

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

initializeExistingSessions().catch(console.error)

// بدء الخادم باستخدام httpServer
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
