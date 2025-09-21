const Queue = require('bull');
const redisClient = require('../config/redis');

// Queue configurations
const queueOptions = {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || undefined
  },
  defaultJobOptions: {
    removeOnComplete: 10, // Keep last 10 completed jobs
    removeOnFail: 5, // Keep last 5 failed jobs
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  }
};

// Create queues
const emailQueue = new Queue('email processing', queueOptions);
const notificationQueue = new Queue('notifications', queueOptions);
const fileProcessingQueue = new Queue('file processing', queueOptions);
const analyticsQueue = new Queue('analytics', queueOptions);
const cleanupQueue = new Queue('cleanup', queueOptions);

// Queue event handlers
const setupQueueHandlers = (queue, queueName) => {
  queue.on('completed', (job) => {
    console.log(`✅ ${queueName} job ${job.id} completed`);
  });

  queue.on('failed', (job, err) => {
    console.error(`❌ ${queueName} job ${job.id} failed:`, err.message);
  });

  queue.on('stalled', (job) => {
    console.warn(`⚠️ ${queueName} job ${job.id} stalled`);
  });

  queue.on('progress', (job, progress) => {
    console.log(`📊 ${queueName} job ${job.id} progress: ${progress}%`);
  });
};

// Setup handlers for all queues
setupQueueHandlers(emailQueue, 'Email');
setupQueueHandlers(notificationQueue, 'Notification');
setupQueueHandlers(fileProcessingQueue, 'File Processing');
setupQueueHandlers(analyticsQueue, 'Analytics');
setupQueueHandlers(cleanupQueue, 'Cleanup');

// Email queue processors
emailQueue.process('send-welcome-email', 5, async (job) => {
  const { userEmail, userName } = job.data;
  
  // Simulate email sending
  console.log(`📧 Sending welcome email to ${userEmail} for ${userName}`);
  
  // In real implementation, you would use nodemailer or AWS SES
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { success: true, emailSent: true };
});

emailQueue.process('send-notification-email', 3, async (job) => {
  const { userEmail, subject, content, type } = job.data;
  
  console.log(`📧 Sending ${type} email to ${userEmail}: ${subject}`);
  
  // Simulate email sending
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { success: true, emailSent: true };
});

// Notification queue processors
notificationQueue.process('send-push-notification', 10, async (job) => {
  const { userId, title, body, data } = job.data;
  
  console.log(`🔔 Sending push notification to user ${userId}: ${title}`);
  
  // Simulate push notification
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return { success: true, notificationSent: true };
});

notificationQueue.process('send-in-app-notification', 15, async (job) => {
  const { userId, type, message, metadata } = job.data;
  
  console.log(`📱 Sending in-app notification to user ${userId}: ${message}`);
  
  // Store notification in database
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return { success: true, notificationStored: true };
});

// File processing queue processors
fileProcessingQueue.process('process-uploaded-file', 2, async (job) => {
  const { fileId, filePath, fileType } = job.data;
  
  console.log(`📁 Processing file ${fileId}: ${filePath}`);
  
  // Simulate file processing (resize images, generate thumbnails, etc.)
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  return { 
    success: true, 
    processed: true,
    thumbnails: ['thumb1.jpg', 'thumb2.jpg'],
    metadata: { size: '1024x768', format: 'jpeg' }
  };
});

fileProcessingQueue.process('cleanup-temp-files', 1, async (job) => {
  const { filePaths } = job.data;
  
  console.log(`🧹 Cleaning up ${filePaths.length} temporary files`);
  
  // Simulate file cleanup
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { success: true, filesRemoved: filePaths.length };
});

// Analytics queue processors
analyticsQueue.process('generate-project-stats', 1, async (job) => {
  const { projectId, dateRange } = job.data;
  
  console.log(`📊 Generating analytics for project ${projectId}`);
  
  // Simulate analytics generation
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  return { 
    success: true, 
    stats: {
      totalTasks: 150,
      completedTasks: 120,
      completionRate: 80,
      averageTime: '2.5 days'
    }
  };
});

analyticsQueue.process('updateTaskStats', 1, async (job) => {
  const { projectId, userId } = job.data;
  
  console.log(`📊 Updating task statistics for project ${projectId || 'all'} by user ${userId}`);
  
  // Simulate task stats update
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { 
    success: true, 
    updated: true,
    timestamp: new Date().toISOString()
  };
});

analyticsQueue.process('updateProjectStats', 1, async (job) => {
  const { projectId } = job.data;
  
  console.log(`📊 Updating project statistics for project ${projectId}`);
  
  // Simulate project stats update
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return { 
    success: true, 
    updated: true,
    timestamp: new Date().toISOString()
  };
});

analyticsQueue.process('trackTaskView', 1, async (job) => {
  const { taskId, userId } = job.data;
  
  console.log(`👁️ Tracking task view: task ${taskId} by user ${userId}`);
  
  // Simulate tracking task view
  await new Promise(resolve => setTimeout(resolve, 200));
  
  return { 
    success: true, 
    tracked: true,
    timestamp: new Date().toISOString()
  };
});

// Cleanup queue processors
cleanupQueue.process('cleanup-expired-sessions', 1, async (job) => {
  console.log('🧹 Cleaning up expired sessions');
  
  // Simulate session cleanup
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return { success: true, sessionsCleaned: 25 };
});

cleanupQueue.process('cleanup-task-data', 1, async (job) => {
  const { taskId, deletedBy } = job.data;
  
  console.log(`🧹 Cleaning up data for deleted task ${taskId} by user ${deletedBy}`);
  
  // Simulate task data cleanup (remove comments, attachments, etc.)
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  return { 
    success: true, 
    cleaned: true,
    taskId,
    timestamp: new Date().toISOString()
  };
});

// Additional notification processors
notificationQueue.process('send-task-notification', 5, async (job) => {
  const { taskId, type, assignedTo, createdBy, updatedBy, assignedBy, newStatus } = job.data;
  
  console.log(`🔔 Sending task notification: ${type} for task ${taskId}`);
  
  // Simulate sending task notification
  await new Promise(resolve => setTimeout(resolve, 300));
  
  return { 
    success: true, 
    notificationSent: true,
    type,
    taskId,
    timestamp: new Date().toISOString()
  };
});

// Queue management functions
class QueueManager {
  // Email queue methods
  static async addWelcomeEmailJob(userEmail, userName, delay = 0) {
    return await emailQueue.add('send-welcome-email', {
      userEmail,
      userName
    }, { delay });
  }

  static async addNotificationEmailJob(userEmail, subject, content, type = 'notification', delay = 0) {
    return await emailQueue.add('send-notification-email', {
      userEmail,
      subject,
      content,
      type
    }, { delay });
  }

  // Notification queue methods
  static async addPushNotificationJob(userId, title, body, data = {}, delay = 0) {
    return await notificationQueue.add('send-push-notification', {
      userId,
      title,
      body,
      data
    }, { delay });
  }

  static async addInAppNotificationJob(userId, type, message, metadata = {}, delay = 0) {
    return await notificationQueue.add('send-in-app-notification', {
      userId,
      type,
      message,
      metadata
    }, { delay });
  }

  // File processing queue methods
  static async addFileProcessingJob(fileId, filePath, fileType, delay = 0) {
    return await fileProcessingQueue.add('process-uploaded-file', {
      fileId,
      filePath,
      fileType
    }, { delay });
  }

  static async addFileCleanupJob(filePaths, delay = 0) {
    return await fileProcessingQueue.add('cleanup-temp-files', {
      filePaths
    }, { delay });
  }

  // Analytics queue methods
  static async addAnalyticsJob(projectId, dateRange = '30d', delay = 0) {
    return await analyticsQueue.add('generate-project-stats', {
      projectId,
      dateRange
    }, { delay });
  }

  static async addJob(jobType, data, delay = 0) {
    switch (jobType) {
      case 'updateTaskStats':
        return await analyticsQueue.add('updateTaskStats', data, { delay });
      case 'updateProjectStats':
        return await analyticsQueue.add('updateProjectStats', data, { delay });
      case 'trackTaskView':
        return await analyticsQueue.add('trackTaskView', data, { delay });
      case 'sendTaskNotification':
        return await notificationQueue.add('send-task-notification', data, { delay });
      case 'cleanupTaskData':
        return await cleanupQueue.add('cleanup-task-data', data, { delay });
      default:
        throw new Error(`Unknown job type: ${jobType}`);
    }
  }

  // Cleanup queue methods
  static async addSessionCleanupJob(delay = 0) {
    return await cleanupQueue.add('cleanup-expired-sessions', {}, { delay });
  }

  // Queue monitoring methods
  static async getQueueStats() {
    const queues = [
      { name: 'email', queue: emailQueue },
      { name: 'notifications', queue: notificationQueue },
      { name: 'fileProcessing', queue: fileProcessingQueue },
      { name: 'analytics', queue: analyticsQueue },
      { name: 'cleanup', queue: cleanupQueue }
    ];

    const stats = {};

    for (const { name, queue } of queues) {
      const [waiting, active, completed, failed] = await Promise.all([
        queue.getWaiting(),
        queue.getActive(),
        queue.getCompleted(),
        queue.getFailed()
      ]);

      stats[name] = {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      };
    }

    return stats;
  }

  // Cleanup all queues
  static async cleanupAllQueues() {
    await Promise.all([
      emailQueue.clean(0, 'completed'),
      emailQueue.clean(0, 'failed'),
      notificationQueue.clean(0, 'completed'),
      notificationQueue.clean(0, 'failed'),
      fileProcessingQueue.clean(0, 'completed'),
      fileProcessingQueue.clean(0, 'failed'),
      analyticsQueue.clean(0, 'completed'),
      analyticsQueue.clean(0, 'failed'),
      cleanupQueue.clean(0, 'completed'),
      cleanupQueue.clean(0, 'failed')
    ]);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down queues...');
  
  await Promise.all([
    emailQueue.close(),
    notificationQueue.close(),
    fileProcessingQueue.close(),
    analyticsQueue.close(),
    cleanupQueue.close()
  ]);
  
  console.log('✅ All queues closed');
  process.exit(0);
});

module.exports = {
  QueueManager,
  emailQueue,
  notificationQueue,
  fileProcessingQueue,
  analyticsQueue,
  cleanupQueue
};
