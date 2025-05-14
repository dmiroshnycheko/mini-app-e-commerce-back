import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { prisma } from '../prisma.js';
import bot from '../bot.js'; // Импортируем бота

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
  const { productId, quantity = 1 } = req.body;

  if (!productId || isNaN(parseInt(productId, 10))) {
    return res.status(400).json({ error: 'Invalid productId' });
  }
  if (isNaN(parseInt(quantity)) || parseInt(quantity) < 1) {
    return res.status(400).json({ error: 'Invalid quantity' });
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: parseInt(productId, 10) },
    });

    if (!product || product.quantity < parseInt(quantity)) {
      return res.status(400).json({ error: 'Product not available in requested quantity' });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { referrer: true },
    });

    const totalPrice = product.price * parseInt(quantity);
    if (!user || user.balance < totalPrice) {
      return res.status(400).json({ error: 'Insufficient balance' });
    }

    const [updatedUser, updatedProduct, purchase, payment, updatedReferrer] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: {
          balance: { decrement: totalPrice },
        },
      }),
      prisma.product.update({
        where: { id: product.id },
        data: {
          quantity: { decrement: parseInt(quantity) },
        },
      }),
      prisma.purchase.create({
        data: {
          userId,
          productId: product.id,
          price: totalPrice,
          fileContent: product.fileContent,
          quantity: parseInt(quantity),
        },
      }),
      prisma.payment.create({
        data: {
          userId,
          type: 'purchase',
          amount: totalPrice,
        },
      }),
      ...(user.referrer
        ? [
            prisma.user.update({
              where: { id: user.referrer.id },
              data: {
                bonusBalance: {
                  increment: totalPrice * (user.referrer.bonusPercent / 100),
                },
              },
            }),
          ]
        : []),
    ]);

    // Отправка уведомления в Telegram
    const tgId = user.tgId; // Предполагаем, что tgId хранится в модели User
    const productName = product.name;
    const fileContent = product.fileContent
    const message = `
📎 ${productName}
Facebook + FP PZRD (21day) [1 x ${totalPrice.toFixed(2)} USD]

1. ${fileContent}
    `;

    try {
      await bot.telegram.sendMessage(tgId, message, {
        parse_mode: 'HTML', // Для поддержки форматирования
      });
      console.log(`Telegram notification sent to ${tgId}`);
    } catch (telegramError) {
      console.error('Failed to send Telegram notification:', telegramError);
      // Продолжаем выполнение, даже если уведомление не отправлено
    }

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