const { QueueManager } = require('./src/services/queueManager');
const logger = require('./src/utils/logger');
require('dotenv').config();

console.log('🔄 TaskFlow Pro Worker starting...');

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down worker gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down worker gracefully...');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.logError(error, { context: 'worker_uncaught_exception' });
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.logError(new Error(reason), { 
    context: 'worker_unhandled_rejection',
    promise: promise.toString()
  });
  process.exit(1);
});

console.log('✅ TaskFlow Pro Worker started successfully');
console.log('📊 Processing background jobs...');
