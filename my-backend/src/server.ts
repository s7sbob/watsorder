import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth';
import userRoutes from './routes/user'; // استيراد مسارات المستخدمين
import sessionRoutes from './routes/sessionRoutes';



dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.json());

// ربط مسارات المصادقة
app.use('/api/auth', authRoutes);
// ربط مسارات المستخدمين
app.use('/api/users', userRoutes);


app.use('/api/sessions', sessionRoutes);


app.get('/', (req, res) => {
  res.send('Server is running');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
