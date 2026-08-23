import Redis from 'ioredis';
import RedisMock from 'ioredis-mock';

const redisUrl = process.env.REDIS_URL;

// If REDIS_URL is provided, connect to it. Otherwise, use an in-memory mock for dev/preview.
export const redis = redisUrl 
  ? new Redis(redisUrl, {
      maxRetriesPerRequest: null,
    }) 
  : new RedisMock();

redis.on('error', (err) => {
  console.error('Redis error:', err);
});
