import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productsRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import bonusRoutes from './routes/bonusRoutes.js';
import depositRoutes from './routes/depositRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import { checkPause } from './routes/pauseRoutes.js';
import pauseRoutes from './routes/pauseRoutes.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ type: 'application/json', charset: 'utf-8' }))
;app.use(checkPause);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/bonus', bonusRoutes);
app.use('/api/deposits', depositRoutes); // Подключаем маршрут
app.use('/api/notification', notificationRoutes); // Подключаем маршрут
app.use('/api/pause', pauseRoutes);

export default app;