import { Queue, Worker } from 'bullmq';
import { redis } from './redis.ts';
import { db } from '../db/index.ts';
import { clicks } from '../db/schema.ts';

const QUEUE_NAME = 'analytics-queue';
const isProduction = !!process.env.REDIS_URL;

// Simple in-memory fallback for preview environments without Redis
const inMemoryQueue: any[] = [];

export const analyticsQueue = isProduction
  ? new Queue(QUEUE_NAME, { connection: redis })
  : {
      add: async (name: string, data: any) => {
        inMemoryQueue.push(data);
        // Process next tick to simulate async behavior
        setTimeout(processInMemoryQueue, 0);
      }
    };

async function processAnalyticsEvent(data: any) {
  try {
    await db.insert(clicks).values({
      urlId: data.urlId,
      ipHash: data.ipHash,
      country: data.country,
      region: data.region,
      city: data.city,
      deviceType: data.deviceType,
      browser: data.browser,
      os: data.os,
      referrer: data.referrer,
    });
  } catch (error) {
    console.error('Error processing analytics event:', error);
  }
}

// Worker for BullMQ
if (isProduction) {
  new Worker(QUEUE_NAME, async (job) => {
    await processAnalyticsEvent(job.data);
  }, { connection: redis });
}

// In-memory processor
async function processInMemoryQueue() {
  while (inMemoryQueue.length > 0) {
    const data = inMemoryQueue.shift();
    if (data) {
      await processAnalyticsEvent(data);
    }
  }
}
