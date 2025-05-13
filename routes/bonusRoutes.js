import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { prisma } from '../prisma.js';

const router = Router();

// Запрос на вывод бонусов
router.post('/withdraw', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.bonusBalance <= 0) {
      return res.status(400).json({ error: 'No bonus balance available' });
    }

    // Создаём запись о выводе (например, в таблице Payment или новой таблице)
    const withdrawal = await prisma.payment.create({
      data: {
        userId,
        type: 'withdrawal',
        amount: user.bonusBalance,
      },
    });

    // Сбрасываем bonusBalance
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        bonusBalance: 0,
      },
    });

    res.status(201).json({
      withdrawal,
      newBonusBalance: updatedUser.bonusBalance,
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    res.status(500).json({ error: 'Failed to process withdrawal', details: error.message });
  }
});

export default router;