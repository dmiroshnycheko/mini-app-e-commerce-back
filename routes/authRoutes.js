import { Router } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authMiddleware } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';
import { prisma } from '../prisma.js';

dotenv.config();

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your_jwt_refresh_secret';

// Генерация токенов
const generateTokens = (user) => {
  const payload = {
    tgId: user.tgId,
    role: user.role,
    tokenVersion: user.tokenVersion, // ✅ добавлено
  };

  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '15m' });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: '7d' });

  return { accessToken, refreshToken };
};

router.post('/login', async (req, res) => {
  try {
    console.log('Login endpoint hit');
    const { tgId, username, firstName, referralCode } = req.body;
    console.log('Request body:', req.body);

    if (!tgId) {
      console.error('Telegram ID is missing');
      return res.status(400).json({ error: 'Telegram ID is required' });
    }

    let dbUser = await prisma.user.findUnique({
      where: { tgId: tgId.toString() },
    });
    console.log('User fetched from database:', dbUser);

    if (!dbUser) {
      console.log('User not found, creating a new user');
      const newReferralCode = crypto.randomBytes(8).toString('hex');
      const newUser = {
        tgId: tgId.toString(),
        role: 'user', // По умолчанию user, админ устанавливается вручную
      };
      const { accessToken, refreshToken } = generateTokens(newUser);

      dbUser = await prisma.user.create({
        data: {
          tgId: tgId.toString(),
          username: username || null, // Сохраняем username, если передан, иначе null          firstName,
          referralCode: newReferralCode,
          firstName: firstName || null, // Явно обрабатываем firstName
          accessToken,
          refreshToken,
          balance: 0,
          bonusBalance: 0,
          invitedCount: 0,
          bonusPercent: 0,
          role: 'user',
        },
      });
      console.log('New user created:', dbUser);
    } else {
      console.log('User found, updating tokens');
      const { accessToken, refreshToken } = generateTokens(dbUser);

      dbUser = await prisma.user.update({
        where: { tgId: dbUser.tgId },
        data: { accessToken, refreshToken, username, firstName },
      });
      console.log('User tokens updated:', dbUser);
    }

    res.json({
      id: dbUser.id,
      tgId: dbUser.tgId,
      username: dbUser.username,
      firstName: dbUser.firstName,
      balance: dbUser.balance,
      bonusBalance: dbUser.bonusBalance,
      invitedCount: dbUser.invitedCount,
      bonusPercent: dbUser.bonusPercent,
      role: dbUser.role,
      referralCode: dbUser.referralCode,
      accessToken: dbUser.accessToken,
      refreshToken: dbUser.refreshToken,
    });
    console.log('Response sent successfully');
  } catch (error) {
    console.error('Error occurred in login endpoint:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.post('/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    const user = await prisma.user.findFirst({
      where: { refreshToken },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Проверяем валидность refresh token
    try {
      jwt.verify(refreshToken, JWT_REFRESH_SECRET);
    } catch (error) {
      return res.status(401).json({ error: 'Expired or invalid refresh token' });
    }

    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

    await prisma.user.update({
      where: { tgId: user.tgId },
      data: {
        accessToken,
        refreshToken: newRefreshToken,
      },
    });

    res.json({
      accessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    console.error('Error refreshing token:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

router.post('/register-referral', authMiddleware, async (req, res) => {
  try {
    const { referralCode } = req.body;
    const tgId = req.user.tgId;

    const dbUser = await prisma.user.findUnique({
      where: { tgId },
    });

    if (!dbUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (dbUser.referrerId) {
      return res.status(400).json({ error: 'User already has a referrer' });
    }

    const referrer = await prisma.user.findFirst({
      where: { referralCode: referralCode.replace(/^(ref_|anon_)/, '') },
    });

    if (!referrer) {
      return res.status(404).json({ error: 'Invalid referral code' });
    }

    if (referrer.tgId === tgId) {
      return res.status(400).json({ error: 'Cannot refer yourself' });
    }

    await prisma.user.update({
      where: { tgId },
      data: {
        referrerId: referrer.id,
      },
    });

    await prisma.user.update({
      where: { id: referrer.id },
      data: {
        invitedCount: { increment: 1 },
      },
    });

    res.json({ message: 'Referral registered successfully' });
  } catch (error) {
    console.error('Error registering referral:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export default router;