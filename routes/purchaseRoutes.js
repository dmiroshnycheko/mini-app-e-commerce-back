import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { prisma } from '../prisma.js';
import bot from '../bot.js';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user.id;

  try {
    const isAdmin = req.user.role === 'admin';
    const purchases = await prisma.purchase.findMany({
      where: isAdmin ? {} : { userId },
      include: {
        product: true, // Продукт может быть null
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json(purchases);
  } catch (error) {
    console.error('Error fetching purchases:', error);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

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

    const orderId = uuidv4();

    // Выбираем случайные строки из textContent
    const availableTextContent = [...product.textContent];
    if (availableTextContent.length < quantity) {
      return res.status(400).json({ error: 'Not enough text content available' });
    }
    const selectedTexts = [];
    for (let i = 0; i < quantity; i++) {
      const randomIndex = Math.floor(Math.random() * availableTextContent.length);
      selectedTexts.push(availableTextContent[randomIndex]);
      availableTextContent.splice(randomIndex, 1);
    }
    const formattedText = selectedTexts.join('\n--------------\n');

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
          textContent: availableTextContent,
        },
      }),
      prisma.purchase.create({
        data: {
          orderId,
          userId,
          productId: product.id,
          productName: product.name, // Сохраняем имя продукта
          price: totalPrice,
          quantity: parseInt(quantity),
          fileContent: formattedText,
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

    const tgId = user.tgId;
    const productName = product.name;
    const message = `Order ID: ${orderId}
  Product ID: ${product.id}
  📎 ${productName}
  [${quantity} x ${totalPrice.toFixed(2)} USD]`;

    try {
      await bot.telegram.sendMessage(tgId, message, {
        parse_mode: 'HTML',
      });
      console.log(`Telegram notification sent to ${tgId}`);

      const fileContent = selectedTexts.join('\n--------------\n');
      await bot.telegram.sendDocument(tgId, {
        source: Buffer.from(fileContent, 'utf-8'),
        filename: `Order_${orderId}_Content.txt`,
      });
      console.log(`Telegram file sent to ${tgId}`);
    } catch (telegramError) {
      console.error('Failed to send Telegram notification or file:', telegramError);
    }

    res.status(201).json(purchase);
  } catch (error) {
    console.error('Error creating purchase:', error);
    res.status(500).json({ error: 'Failed to process purchase', details: error.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const userId = req.user.id;

  try {
    const purchase = await prisma.purchase.findUnique({
      where: { id: parseInt(id, 10) },
      include: {
        product: true, // Продукт может быть null
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