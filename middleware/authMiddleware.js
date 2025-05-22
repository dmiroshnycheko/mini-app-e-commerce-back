import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const prisma = new PrismaClient();
export const authMiddleware = async (req, res, next) => {
  try {
    console.log('AuthMiddleware: Checking authorization header');
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.error('AuthMiddleware: No token provided');
      return res.status(401).json({ error: 'No token provided' });
    }

    console.log('AuthMiddleware: Verifying token');
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('AuthMiddleware: Token verified, decoded payload:', decoded);

    console.log('AuthMiddleware: Fetching user from database');
    const user = await prisma.user.findUnique({
      where: { tgId: decoded.tgId },
      select: {
        id: true,
        tgId: true,
        username: true,
        firstName: true,
        lastName: true,
        role: true,
        tokenVersion: true 
      }
    });

    if (!user) {
      console.error('AuthMiddleware: Invalid token, user not found');
      return res.status(401).json({ error: 'Invalid token' });
    }

    if (user.tokenVersion !== decoded.tokenVersion) {
      return res.status(401).json({ error: 'Token no longer valid' }); // ✅ тут
    }

    console.log('AuthMiddleware: User found:', user);
    req.user = user;
    next();
  } catch (error) {
    console.error('AuthMiddleware: Error occurred:', error.message);
    return res.status(401).json({ error: 'Unauthorized' });
  }
};

// Middleware to check admin role
export const adminMiddleware = (req, res, next) => {
  console.log('AdminMiddleware: Checking user role');
  if (req.user.role !== 'admin') {
    console.error('AdminMiddleware: Access denied, admin role required');
    return res.status(403).json({ error: 'Admin access required' });
  }
  console.log('AdminMiddleware: Admin access granted');
  next();
};