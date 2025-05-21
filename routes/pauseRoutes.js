import express from 'express';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Глобальное состояние паузы
let isPaused = false;

// Middleware для проверки роли администратора
const restrictToAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({
      status: 'error',
      message: 'No token provided',
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Decoded token in restrictToAdmin:', decoded);

    if (decoded.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Admin access required',
      });
    }
    req.user = decoded; // Сохраняем декодированные данные пользователя
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid token',
    });
  }
};

// Middleware для проверки статуса паузы
export const checkPause = (req, res, next) => {
  // Пропускаем маршруты /api/pause, /api/pause/status и /api/auth/login
  if (req.path === '/api/pause' || req.path === '/api/pause/status' || req.path === '/api/auth/login') {
    console.log(`checkPause: Allowing ${req.path}`);
    return next();
  }

  // Если приложение не на паузе, пропускаем все запросы
  if (!isPaused) {
    console.log('checkPause: App not paused, allowing request');
    return next();
  }

  // Проверяем, является ли пользователь администратором
  const token = req.headers.authorization?.split(' ')[1];
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('checkPause: Decoded token:', decoded);
      if (decoded.role === 'admin') {
        console.log(`checkPause: Admin ${decoded.tgId} allowed`);
        req.user = decoded;
        return next();
      }
      console.log(`checkPause: User ${decoded.tgId} blocked, role: ${decoded.role}`);
      return res.status(503).json({
        status: 'error',
        message: 'Application is currently paused. Please try again later.',
      });
    } catch (error) {
      console.log('checkPause: Invalid token', error.message);
      return res.status(503).json({
        status: 'error',
        message: 'Application is currently paused. Please try again later.',
      });
    }
  }

  console.log('checkPause: No token provided, blocking request');
  return res.status(503).json({
    status: 'error',
    message: 'Application is currently paused. Please try again later.',
  });
};

// GET /api/pause/status - Проверка статуса паузы
router.get('/status', (req, res) => {
  console.log('GET /api/pause/status: Returning pause status');
  res.status(200).json({
    status: 'success',
    data: {
      isPaused,
    },
  });
});

// POST /api/pause - Включение/выключение паузы (только для админов)
router.post('/', restrictToAdmin, (req, res) => {
  const { pause } = req.body;
  console.log(`POST /api/pause: Setting pause to ${pause}`);

  if (typeof pause !== 'boolean') {
    return res.status(400).json({
      status: 'error',
      message: 'Request body must contain a boolean "pause" field',
    });
  }

  isPaused = pause;

  res.status(200).json({
    status: 'success',
    message: isPaused ? 'Application paused' : 'Application resumed',
    data: {
      isPaused,
    },
  });
});

export default router;