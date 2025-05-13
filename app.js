import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import productRoutes from './routes/productsRoutes.js';
import purchaseRoutes from './routes/purchaseRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import bonusRoutes from './routes/bonusRoutes.js';


dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/referrals', referralRoutes); 
app.use('/api/bonus', bonusRoutes); 
// app.use('/api/deposits', depositRoutes);

export default app;