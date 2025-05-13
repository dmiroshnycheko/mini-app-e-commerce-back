import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import dotenv from 'dotenv';
import { prisma } from '../prisma.js';

dotenv.config();

const router = Router();

// Получить статистику рефералов текущего пользователя
router.get('/stats', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        invitedCount: true,
        bonusPercent: true,
        bonusBalance: true,
        referralCode: true,
        referrals: {
          select: {
            id: true,
            tgId: true,
            username: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      invitedCount: user.invitedCount,
      bonusPercent: user.bonusPercent,
      bonusBalance: user.bonusBalance,
      referralCode: user.referralCode,
      referrals: user.referrals,
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral stats', details: error.message });
  }
});

export default router;