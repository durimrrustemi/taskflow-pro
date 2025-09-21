const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bodyParser = require('body-parser');
const { createServer } = require('http');
const { Server } = require('socket.io');

// Import configurations
require('dotenv').config();
const { sequelize } = require('./src/config/database');
const redisClient = require('./src/config/redis');
const logger = require('./src/utils/logger');

// Import middleware
const { authenticate, optionalAuth } = require('./src/middleware/auth');

// Import controllers
const AuthController = require('./src/controllers/authController');
const ProjectController = require('./src/controllers/projectController');
const TaskController = require('./src/controllers/taskController');

// Import services
const { QueueManager } = require('./src/services/queueManager');

// Import Swagger setup
const swaggerSetup = require('./src/config/swagger');

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// Body parsing middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.logRequest(req, res, duration);
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'TaskFlow Pro API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
const apiRouter = express.Router();

// Authentication routes
apiRouter.post('/auth/register', AuthController.register);
apiRouter.post('/auth/login', AuthController.login);
apiRouter.post('/auth/refresh-token', AuthController.refreshToken);
apiRouter.post('/auth/logout', authenticate, AuthController.logout);
apiRouter.get('/auth/profile', authenticate, AuthController.getProfile);
apiRouter.put('/auth/profile', authenticate, AuthController.updateProfile);
apiRouter.put('/auth/change-password', authenticate, AuthController.changePassword);

// Project routes
apiRouter.post('/projects', authenticate, ProjectController.createProject);
apiRouter.get('/projects', authenticate, ProjectController.getProjects);
apiRouter.get('/projects/:projectId', authenticate, ProjectController.getProject);
apiRouter.put('/projects/:projectId', authenticate, ProjectController.updateProject);
apiRouter.delete('/projects/:projectId', authenticate, ProjectController.deleteProject);
apiRouter.post('/projects/:projectId/members', authenticate, ProjectController.addMember);
apiRouter.delete('/projects/:projectId/members/:userId', authenticate, ProjectController.removeMember);
apiRouter.get('/projects/:projectId/stats', authenticate, ProjectController.getProjectStats);

// Task routes
const taskRoutes = require('./src/routes/taskRoutes');
apiRouter.use('/tasks', taskRoutes);

// Queue monitoring endpoint
apiRouter.get('/admin/queues/stats', authenticate, async (req, res) => {
  try {
    const stats = await QueueManager.getQueueStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get queue statistics'
    });
  }
});

// Mount API routes
app.use('/api/v1', apiRouter);

// Swagger documentation
swaggerSetup(app);

// Socket.IO connection handling
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    const JWTUtils = require('./src/utils/jwt');
    const { User } = require('./src/models');
    
    const decoded = JWTUtils.verifyAccessToken(token);
    const user = await User.findByPk(decoded.id);
    
    if (!user || !user.isActive) {
      return next(new Error('User not found or inactive'));
    }

    socket.userId = user.id;
    socket.user = user.toJSON();
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  console.log(`👤 User ${socket.user.firstName} connected`);
  
  // Join user to their personal room
  socket.join(`user:${socket.userId}`);
  
  // Join project rooms
  socket.on('join-project', (projectId) => {
    socket.join(`project:${projectId}`);
    console.log(`📁 User ${socket.user.firstName} joined project ${projectId}`);
  });
  
  // Leave project rooms
  socket.on('leave-project', (projectId) => {
    socket.leave(`project:${projectId}`);
    console.log(`📁 User ${socket.user.firstName} left project ${projectId}`);
  });
  
  // Handle task updates
  socket.on('task-update', async (data) => {
    const { projectId, taskId, updates } = data;
    
    // Broadcast to all users in the project
    socket.to(`project:${projectId}`).emit('task-updated', {
      taskId,
      updates,
      updatedBy: socket.user.toJSON(),
      timestamp: new Date()
    });
  });
  
  // Handle project updates
  socket.on('project-update', async (data) => {
    const { projectId, updates } = data;
    
    socket.to(`project:${projectId}`).emit('project-updated', {
      projectId,
      updates,
      updatedBy: socket.user.toJSON(),
      timestamp: new Date()
    });
  });
  
  socket.on('disconnect', () => {
    console.log(`👋 User ${socket.user.firstName} disconnected`);
  });
});

// Global error handler
app.use((error, req, res, next) => {
  logger.logError(error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Database connection and server startup
async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Test Redis connection
    await redisClient.ping();
    console.log('✅ Redis connection established successfully');
    
    // Sync database models
    if (process.env.NODE_ENV !== 'production') {
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synchronized');
    }
    
    // Start server
    server.listen(PORT, () => {
      console.log(`🚀 TaskFlow Pro API server running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`🔍 Health Check: http://localhost:${PORT}/health`);
      console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  await sequelize.close();
  console.log('✅ Database connection closed');
  
  redisClient.disconnect();
  console.log('✅ Redis connection closed');
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  
  server.close(() => {
    console.log('✅ HTTP server closed');
  });
  
  await sequelize.close();
  console.log('✅ Database connection closed');
  
  redisClient.disconnect();
  console.log('✅ Redis connection closed');
  
  process.exit(0);
});

// Start the server
startServer();

module.exports = { app, server, io };
