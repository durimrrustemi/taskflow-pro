const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const express = require('express');
const basicAuth = require('express-basic-auth');
const { 
  emailQueue, 
  notificationQueue, 
  fileProcessingQueue, 
  analyticsQueue, 
  cleanupQueue 
} = require('./src/services/queueManager');

require('dotenv').config();

const app = express();
const serverAdapter = new ExpressAdapter();

// Basic authentication for Bull Board
const authMiddleware = basicAuth({
  users: {
    [process.env.BULL_BOARD_USERNAME || 'admin']: process.env.BULL_BOARD_PASSWORD || 'admin123'
  },
  challenge: true,
  realm: 'Bull Board'
});

// Create Bull Board
createBullBoard({
  queues: [
    new BullAdapter(emailQueue),
    new BullAdapter(notificationQueue),
    new BullAdapter(fileProcessingQueue),
    new BullAdapter(analyticsQueue),
    new BullAdapter(cleanupQueue)
  ],
  serverAdapter: serverAdapter
});

serverAdapter.setBasePath('/admin/queues');

// Apply authentication middleware
app.use('/admin/queues', authMiddleware);

// Mount Bull Board
app.use('/admin/queues', serverAdapter.getRouter());

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Bull Board is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.BULL_BOARD_PORT || 3001;

app.listen(PORT, () => {
  console.log(`📊 Bull Board dashboard running on http://localhost:${PORT}/admin/queues`);
  console.log(`👤 Username: ${process.env.BULL_BOARD_USERNAME || 'admin'}`);
  console.log(`🔑 Password: ${process.env.BULL_BOARD_PASSWORD || 'admin123'}`);
});
