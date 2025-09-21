# TaskFlow Pro 🚀

A comprehensive task management and collaboration platform built with modern technologies. This project showcases advanced Node.js development practices, microservices architecture, and cloud integration.

## 🌟 Features

### Core Functionality
- **User Management**: Registration, authentication, JWT tokens, role-based access
- **Project Management**: Create, update, delete projects with team collaboration
- **Task Management**: Full CRUD operations with real-time updates
- **Real-time Collaboration**: Socket.io integration for live updates
- **File Management**: AWS S3 integration for file uploads and storage
- **Email Notifications**: AWS SES integration for automated emails
- **Background Processing**: Bull queues for async job processing
- **Caching**: Redis integration for performance optimization
- **API Documentation**: Swagger/OpenAPI documentation

### Technical Features
- **Authentication**: JWT with refresh tokens and blacklisting
- **Rate Limiting**: Express rate limiting for API protection
- **Security**: Helmet.js for security headers, input validation
- **Logging**: Winston with daily rotation and multiple transports
- **Database**: PostgreSQL with Sequelize ORM and migrations
- **Caching**: Redis for sessions, API responses, and user data
- **Queue Management**: Bull for background jobs with monitoring
- **Real-time**: Socket.io for live updates and notifications
- **Cloud Integration**: AWS S3, SES, and CloudWatch
- **Containerization**: Docker and Docker Compose setup
- **Monitoring**: Health checks, metrics, and queue monitoring

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Server    │    │   Background    │
│   (React/Vue)   │◄──►│   (Express.js)  │◄──►│   Workers       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   PostgreSQL    │
                    │   + Redis       │
                    └─────────────────┘
```

## 🛠️ Tech Stack

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **PostgreSQL** - Primary database
- **Sequelize** - ORM
- **Redis** - Caching and sessions
- **Bull** - Queue management
- **Socket.io** - Real-time communication
- **JWT** - Authentication
- **Winston** - Logging
- **Swagger** - API documentation

### Infrastructure
- **Docker** - Containerization
- **AWS S3** - File storage
- **AWS SES** - Email service
- **AWS CloudWatch** - Monitoring
- **Nginx** - Reverse proxy (optional)

### Development Tools
- **ESLint** - Code linting
- **Jest** - Testing framework
- **Nodemon** - Development server
- **Sequelize CLI** - Database migrations

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ 
- Docker and Docker Compose
- PostgreSQL 14+
- Redis 6+

### Using Docker (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd taskflow-pro
   ```

2. **Set up environment variables**
   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

3. **Start the application**
   ```bash
   docker-compose up -d
   ```

4. **Access the application**
   - API: http://localhost:3000
   - API Docs: http://localhost:3000/api-docs
   - Bull Board: http://localhost:3001/admin/queues (admin/admin123)

### Manual Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up database**
   ```bash
   # Start PostgreSQL and Redis
   # Update .env with your database credentials
   ```

3. **Run migrations**
   ```bash
   npm run migrate
   ```

4. **Start the application**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   
   # Worker
   npm run worker
   ```

## 📚 API Documentation

### Authentication Endpoints
- `POST /api/v1/auth/register` - Register new user
- `POST /api/v1/auth/login` - Login user
- `POST /api/v1/auth/refresh-token` - Refresh access token
- `POST /api/v1/auth/logout` - Logout user
- `GET /api/v1/auth/profile` - Get user profile
- `PUT /api/v1/auth/profile` - Update user profile

### Project Endpoints
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects` - Get user projects
- `GET /api/v1/projects/:id` - Get project details
- `PUT /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project
- `POST /api/v1/projects/:id/members` - Add member
- `DELETE /api/v1/projects/:id/members/:userId` - Remove member

### Monitoring Endpoints
- `GET /health` - Health check
- `GET /api/v1/admin/queues/stats` - Queue statistics

## 🔧 Configuration

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskflow_pro
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret

# AWS
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key
AWS_SECRET_ACCESS_KEY=your-secret
AWS_S3_BUCKET=your-bucket

# Email
EMAIL_FROM=noreply@yourdomain.com

# Server
PORT=3000
NODE_ENV=development
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

## 📊 Monitoring

### Health Checks
- Application: `GET /health`
- Database: Automatic connection checks
- Redis: Automatic connection checks
- Queues: Bull Board dashboard

### Logging
- Application logs: `logs/app.log`
- Error logs: `logs/error.log`
- Daily rotation with compression
- Multiple log levels (error, warn, info, debug)

### Queue Monitoring
- Bull Board: http://localhost:3001/admin/queues
- Queue statistics via API
- Job retry and failure handling
- Performance metrics

## 🚀 Deployment

### Production Deployment

1. **Environment Setup**
   ```bash
   # Set production environment variables
   export NODE_ENV=production
   export DB_HOST=your-production-db
   export REDIS_HOST=your-production-redis
   ```

2. **Docker Deployment**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Health Checks**
   ```bash
   curl http://your-domain/health
   ```

### AWS Deployment

1. **EC2 Setup**
   - Launch EC2 instance
   - Install Docker and Docker Compose
   - Configure security groups

2. **RDS Setup**
   - Create PostgreSQL RDS instance
   - Configure security groups
   - Update connection strings

3. **ElastiCache Setup**
   - Create Redis ElastiCache cluster
   - Configure security groups
   - Update Redis connection

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🎯 Portfolio Highlights

This project demonstrates:

- **Advanced Node.js Development**: Modern ES6+, async/await, error handling
- **Microservices Architecture**: Separation of concerns, service-oriented design
- **Database Design**: Complex relationships, migrations, optimization
- **Authentication & Security**: JWT, rate limiting, input validation
- **Real-time Features**: WebSocket implementation, live updates
- **Cloud Integration**: AWS services, file storage, email delivery
- **Background Processing**: Queue management, job scheduling
- **Caching Strategy**: Redis implementation, performance optimization
- **API Design**: RESTful endpoints, comprehensive documentation
- **DevOps**: Docker containerization, CI/CD ready
- **Monitoring**: Logging, health checks, metrics collection
- **Testing**: Unit and integration test structure

Perfect for showcasing full-stack development skills and modern backend architecture knowledge!
