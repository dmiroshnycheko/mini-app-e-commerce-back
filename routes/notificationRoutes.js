import { Router } from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import bot from '../bot.js';

const router = Router();

router.post('/', authMiddleware, async (req, res) => {
  const { notificationTitle } = req.body;

  // Проверка наличия notificationTitle
  if (!notificationTitle) {
    return res.status(400).json({ message: 'Заголовок уведомления обязателен' });
  }

  try {
    // Получение всех пользователей
    const users = await prisma.user.findMany({
      select: {
        tgId: true,
      },
    });

    console.log(`Найдено ${users.length} пользователей для рассылки:`, users);

    // Отправка уведомления всем пользователям
    let successCount = 0;
    for (const user of users) {
      try {
        await bot.telegram.sendMessage(user.tgId, notificationTitle, {
          parse_mode: 'HTML',
        });
        successCount++;
      } catch (error) {
        console.error(`Не удалось отправить уведомление на tgId ${user.tgId}:`, error);
      }
    }

    console.log(`Успешно отправлено ${successCount} из ${users.length} уведомлений`);

    // Ответ об успешной отправке
    res.status(200).json({ message: 'Рассылка успешно отправлена' });
  } catch (error) {
    console.error('Ошибка при рассылке:', error);
    res.status(500).json({ message: 'Не удалось отправить рассылку', error: error.message });
  }
});

export default router;