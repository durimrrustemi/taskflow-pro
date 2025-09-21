# TaskFlow Pro 🚀

A comprehensive RESTful API for task management and collaboration with advanced features, built with Node.js, Express, and modern technologies.

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.18+-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-blue.svg)](https://postgresql.org/)
[![Redis](https://img.shields.io/badge/Redis-7+-red.svg)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-Enabled-blue.svg)](https://docker.com/)
[![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-green.svg)](https://swagger.io/)

## 🌟 Features

- **Complete RESTful API** with full CRUD operations
- **Advanced Pagination & Filtering** with query parameters
- **JWT Authentication** with refresh tokens
- **Comprehensive Swagger Documentation** with interactive UI
- **Background Job Processing** with Bull queues
- **Docker Containerization** with PostgreSQL and Redis
- **Input Validation** with Joi schemas
- **Error Handling** and comprehensive logging
- **Production Ready** with monitoring and health checks

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Nginx Proxy   │    │   Express API   │    │   Background    │
│   (Port 8080)   │◄──►│   (Port 3000)   │◄──►│   Workers       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   PostgreSQL    │
                       │   (Port 5433)   │
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │     Redis       │
                       │   (Port 6380)   │
                       └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- Docker & Docker Compose
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/durimrrustemi/taskflow-pro.git
cd taskflow-pro
```

### 2. Environment Setup

```bash
# Copy environment template
cp env.example .env

# Edit environment variables
nano .env
```

### 3. Start with Docker (Recommended)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f app
```

### 4. Access the Application

- **API Documentation**: http://localhost:8080/api-docs/
- **Main Application**: http://localhost:8080
- **Bull Board Dashboard**: http://localhost:3001
- **Health Check**: http://localhost:8080/health

## 📚 API Documentation

### Interactive Swagger UI

Visit **http://localhost:8080/api-docs/** for complete interactive API documentation.

![Swagger UI](https://via.placeholder.com/800x400/2c3e50/ffffff?text=Swagger+API+Documentation)

### Available Endpoints

#### Authentication
- `POST /api/v1/auth/register` - User registration
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/refresh-token` - Refresh JWT token
- `GET /api/v1/auth/profile` - Get user profile

#### Tasks
- `GET /api/v1/tasks` - Get all tasks (with pagination & filtering)
- `POST /api/v1/tasks` - Create new task
- `GET /api/v1/tasks/:id` - Get single task
- `PUT /api/v1/tasks/:id` - Update entire task
- `PATCH /api/v1/tasks/:id` - Partial update
- `DELETE /api/v1/tasks/:id` - Delete task
- `PATCH /api/v1/tasks/:id/assign` - Assign task to user
- `PATCH /api/v1/tasks/:id/status` - Update task status

#### Projects
- `GET /api/v1/projects` - Get all projects
- `POST /api/v1/projects` - Create new project
- `GET /api/v1/projects/:id` - Get single project
- `PUT /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

## 🔧 API Usage Examples

### Authentication

```bash
# Register a new user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "firstName": "John",
    "lastName": "Doe"
  }'

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

### Task Management

```bash
# Get all tasks with pagination
curl -X GET "http://localhost:8080/api/v1/tasks?page=1&limit=10&status=todo" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Create a new task
curl -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement user authentication",
    "description": "Add JWT-based authentication system",
    "projectId": "project-uuid-here",
    "priority": "high",
    "dueDate": "2024-01-15T10:00:00Z",
    "tags": ["backend", "security"]
  }'

# Update task status
curl -X PATCH http://localhost:8080/api/v1/tasks/task-uuid-here/status \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress"
  }'
```

### Advanced Filtering

```bash
# Search tasks with multiple filters
curl -X GET "http://localhost:8080/api/v1/tasks?search=authentication&status=in_progress&priority=high&sortBy=dueDate&sortOrder=ASC" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## 🐳 Docker Deployment

### Development

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Production

```bash
# Build production images
docker-compose -f docker-compose.prod.yml up -d

# Scale workers
docker-compose up -d --scale worker=3
```

## 🛠️ Development Setup

### Local Development (without Docker)

```bash
# Install dependencies
npm install

# Start PostgreSQL and Redis (using Docker)
docker-compose up -d postgres redis

# Run database migrations
npm run migrate

# Start development server
npm run dev

# Run tests
npm test
```

### Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=5433
DB_NAME=taskflow_pro
DB_USER=postgres
DB_PASSWORD=password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6380
REDIS_PASSWORD=redispassword

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key

# AWS (optional)
AWS_REGION=us-east-1
AWS_S3_BUCKET=taskflow-pro-uploads

# Email (optional)
EMAIL_FROM=noreply@taskflowpro.com
```

## 📊 Database Schema

### Core Tables

- **users** - User accounts and profiles
- **projects** - Project management
- **tasks** - Task management with status tracking
- **project_members** - Project membership and roles
- **comments** - Task comments and discussions

### Key Features

- UUID primary keys
- Soft deletes with timestamps
- JSONB for flexible data storage
- Proper foreign key relationships
- Database views for analytics

## 🔄 Background Jobs

The application uses Bull queues for background processing:

- **Task Notifications** - Email and in-app notifications
- **Analytics Updates** - Project and task statistics
- **Data Cleanup** - Automated cleanup of deleted data
- **File Processing** - Image resizing and optimization

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npm test -- test/health.test.js
```

## 📈 Monitoring

### Health Checks

- **Application Health**: `GET /health`
- **Database Health**: `GET /health/db`
- **Redis Health**: `GET /health/redis`

### Queue Monitoring

- **Bull Board**: http://localhost:3001
- **Queue Statistics**: `GET /api/v1/admin/queues/stats`

## 🚀 Deployment

### AWS ECS Deployment

1. **Build and push Docker images**:
```bash
# Build production image
docker build -t taskflow-pro:latest .

# Tag for ECR
docker tag taskflow-pro:latest 123456789012.dkr.ecr.us-east-1.amazonaws.com/taskflow-pro:latest

# Push to ECR
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/taskflow-pro:latest
```

2. **Deploy with CDK**:
```bash
cd infrastructure/cdk
npm install
npm run build
cdk deploy TaskFlowProStack
```

### Environment-Specific Configurations

- **Development**: `docker-compose.yml`
- **Production**: `docker-compose.prod.yml`
- **AWS ECS**: Task definitions in `infrastructure/`

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👨‍💻 Author

**Durim Rrustemi**
- GitHub: [@durimrrustemi](https://github.com/durimrrustemi)
- LinkedIn: [Durim Rrustemi](https://linkedin.com/in/durimrrustemi)

## 🙏 Acknowledgments

- Express.js team for the amazing framework
- Sequelize team for the ORM
- Bull team for the queue system
- Swagger team for the documentation tools

---

⭐ **Star this repository if you found it helpful!**