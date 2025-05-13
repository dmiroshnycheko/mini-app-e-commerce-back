import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { prisma } from '../prisma.js';

const router = Router();

router.get('/me', authMiddleware, async (req, res) => {
  console.log('GET /me endpoint called');
  try {
    console.log('Fetching user with tgId:', req.user.tgId);
    const user = await prisma.user.findUnique({
      where: { tgId: req.user.tgId },
      select: {
        id: true,
        tgId: true,
        username: true,
        firstName: true,
        lastName: true,
        balance: true,
        bonusBalance: true,
        role: true,
        referralCode: true,
        invitedCount: true,
        bonusPercent: true
      }
    });

    if (!user) {
      console.log('User not found for tgId:', req.user.tgId);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('User found:', user);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        tgId: true,
        username: true,
        firstName: true,
        lastName: true,
        balance: true,
        bonusBalance: true,
        role: true,
        referralCode: true,
        invitedCount: true,
        bonusPercent: true,
        createdAt: true
      }
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { balance, bonusBalance, role } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: {
        balance,
        bonusBalance,
        role,
        updatedAt: new Date()
      },
      select: {
        id: true,
        tgId: true,
        username: true,
        balance: true,
        bonusBalance: true,
        role: true
      }
    });

    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;