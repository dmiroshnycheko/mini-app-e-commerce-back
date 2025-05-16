import { Router } from 'express';
import { prisma } from '../prisma.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Получение всех депозитов (для админ-панели)
router.get('/', authMiddleware, async (req, res) => {
  try {
    // Проверяем, что пользователь — админ
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const deposits = await prisma.deposit.findMany({
      select: {
        id: true,
        userId: true,
        amount: true,
        status: true,
        createdAt: true,
      },
    });

    res.json(deposits);
  } catch (error) {
    console.error('Error fetching deposits:', error);
    res.status(500).json({ error: 'Server error', details: error.message });
  }
});

export default router;