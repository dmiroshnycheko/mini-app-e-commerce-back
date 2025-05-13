import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { prisma } from '../prisma.js';

const router = Router();

// Получить список покупок текущего пользователя
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const purchases = await prisma.purchase.findMany({
      where: { userId },
      include: {
        product: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// Совершить покупку продукта
router.post('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const { productId } = req.body;

  if (!productId || isNaN(parseInt(productId, 10))) {
    return res.status(400).json({ error: 'Invalid productId' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId, 10) },
    });

    if (!product || product.quantity <= 0) {
      return res.status(400).json({ error: 'Product not available' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { referrer: true }, // Получаем реферера
    });

    if (!user || user.balance < product.price) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const [updatedUser, updatedProduct, purchase, updatedReferrer] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: product.price },
        },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: {
          quantity: { decrement: 1 },
        },
      }),
      prisma.purchase.create({
        data: {
          userId,
          productId: product.id,
          price: product.price,
          fileContent: product.fileContent,
        },
      }),
      prisma.payment.create({
        data: {
          userId,
          type: 'purchase',
          amount: product.price,
        },
      }),
      // Начисляем бонус рефереру, если он есть
      ...(user.referrer
        ? [
            prisma.user.update({
              where: { id: user.referrer.id },
              data: {
                bonusBalance: {
                  increment: product.price * (user.referrer.bonusPercent / 100), // Начисляем процент
                },
              },
            }),
          ]
        : []),
    ]);

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: 'Failed to process purchase', details: error.message });
  }
});

// Получить конкретную покупку по ID
router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        product: true,
      },
    });

    if (!purchase || purchase.userId !== userId) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    res.json(purchase);
  } catch (error) {
    console.error('Error fetching purchase:', error);
    res.status(500).json({ error: 'Failed to fetch purchase', details: error.message });
  }
});

export default router;
