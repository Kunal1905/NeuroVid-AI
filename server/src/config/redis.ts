import { Redis } from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
  throw new Error('REDIS_URL environment variable is not set');
}

export const redisConnection = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,      // BullMQ requires this to be null
  enableReadyCheck: false,        // Skip ready check for serverless
  enableOfflineQueue: false,      // Disable offline queue to prevent memory buildup
  connectTimeout: 10000,          // 10 second connection timeout
  lazyConnect: false,              // Don't connect immediately
  showFriendlyErrorStack: true,
  enableAutoPipelining: true,
});

// BullMQ requires maxRetriesPerRequest === null
export const redisForBull = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  lazyConnect: false,
  showFriendlyErrorStack: true,
  enableAutoPipelining: true,
});

// Add connection event handlers for debugging
redisConnection.on('connect', () => {
  console.log('✅ Redis connected successfully');
});

redisConnection.on('ready', () => {
  console.log('✅ Redis ready for operations');
});

redisConnection.on('error', (err) => {
  console.error('❌ Redis connection error:', err);
});

redisConnection.on('close', () => {
  console.log('⚠️ Redis connection closed');
});

redisConnection.on('reconnecting', () => {
  console.log('🔄 Redis reconnecting...');
});

redisConnection.on('end', () => {
  console.log('🛑 Redis connection ended');
});

// Graceful handling of reconnection
redisConnection.on('reconnect', () => {
  console.log('✅ Redis reconnected successfully');
});
