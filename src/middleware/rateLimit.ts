import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis.ts';

const isProduction = !!process.env.REDIS_URL;

const createRateLimiter = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    store: isProduction ? new RedisStore({
      // @ts-expect-error - rate-limit-redis types are slightly mismatched with ioredis-mock, but it works at runtime
      sendCommand: (...args: string[]) => {
        if (typeof redis.call === 'function') {
          return redis.call(...args);
        }
        // Fallback for ioredis-mock
        const cmd = args[0].toLowerCase();
        return (redis as any)[cmd](...args.slice(1));
      },
    }) : undefined,
  });
};

export const apiLimiter = createRateLimiter(15 * 60 * 1000, 100, 'Too many requests from this IP, please try again after 15 minutes');
export const createUrlLimiter = createRateLimiter(60 * 1000, 10, 'Too many URLs created. Please slow down.');
export const authLimiter = createRateLimiter(60 * 60 * 1000, 30, 'Too many auth requests');
export const redirectLimiter = createRateLimiter(60 * 1000, 100, 'Too many redirect requests');
