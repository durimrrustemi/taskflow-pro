const Redis = require('ioredis');
require('dotenv').config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  lazyConnect: true,
  keepAlive: 30000,
  connectTimeout: 10000,
  commandTimeout: 5000
};

// Create Redis client
const redisClient = new Redis(redisConfig);

// Handle Redis connection events
redisClient.on('connect', () => {
  console.log('✅ Connected to Redis successfully');
});

redisClient.on('error', (error) => {
  console.error('❌ Redis connection error:', error);
});

redisClient.on('close', () => {
  console.log('🔌 Redis connection closed');
});

redisClient.on('reconnecting', () => {
  console.log('🔄 Reconnecting to Redis...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  redisClient.disconnect();
  console.log('👋 Redis client disconnected');
});

module.exports = redisClient;
