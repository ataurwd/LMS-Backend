import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

let redisClient: Redis | null = null;

if (process.env.REDIS_URL) {
  try {
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 1,
    });
    redisClient.on('error', (err) => {
      console.error('Redis connection error in rate limiter:', err);
    });
  } catch (error) {
    console.error('Failed to initialize Redis client for rate limiting:', error);
  }
}

// Memory fallback store
const memoryStore = new Map<string, { count: number; resetTime: number }>();

const WINDOW_SIZE_IN_SECONDS = 60;
const MAX_REQUESTS = 20; // 20 requests per minute for auth routes

export const rateLimiter = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const key = `rate_limit:auth:${ip}`;

  if (redisClient && redisClient.status === 'ready') {
    try {
      const requests = await redisClient.incr(key);
      if (requests === 1) {
        await redisClient.expire(key, WINDOW_SIZE_IN_SECONDS);
      }

      if (requests > MAX_REQUESTS) {
        res.status(429).json({
          success: false,
          message: 'Too many requests. Please try again in a minute.',
        });
        return;
      }
      next();
      return;
    } catch (error) {
      console.warn('Redis rate limiter failed, falling back to memory store:', error);
    }
  }

  // Memory Fallback Limiter
  const now = Date.now();
  const record = memoryStore.get(key);

  if (!record || now > record.resetTime) {
    memoryStore.set(key, {
      count: 1,
      resetTime: now + WINDOW_SIZE_IN_SECONDS * 1000,
    });
    next();
    return;
  }

  record.count += 1;
  if (record.count > MAX_REQUESTS) {
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again in a minute.',
    });
    return;
  }

  next();
};
