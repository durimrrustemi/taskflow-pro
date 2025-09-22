#!/bin/bash

# TaskFlow Pro - Interview Demo Setup Script
# This script sets up demo data for interview presentation

echo "🚀 Setting up TaskFlow Pro Demo Data..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if services are running
echo -e "${BLUE}Checking if services are running...${NC}"
if ! curl -s http://localhost:8080/health > /dev/null; then
    echo -e "${RED}❌ Services are not running. Please start with: docker-compose up -d${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Services are running${NC}"

# Wait for services to be fully ready
echo -e "${BLUE}Waiting for services to be ready...${NC}"
sleep 10

# Register demo user
echo -e "${BLUE}Creating demo user...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@taskflowpro.com",
    "password": "demo123456",
    "firstName": "Demo",
    "lastName": "User"
  }')

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ Demo user created successfully${NC}"
else
    echo -e "${YELLOW}⚠️  User might already exist, continuing...${NC}"
fi

# Login and get JWT token
echo -e "${BLUE}Logging in demo user...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@taskflowpro.com",
    "password": "demo123456"
  }')

# Extract JWT token
JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -z "$JWT_TOKEN" ]; then
    echo -e "${RED}❌ Failed to get JWT token. Response: $LOGIN_RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ JWT token obtained${NC}"

# Create demo project
echo -e "${BLUE}Creating demo project...${NC}"
PROJECT_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/projects \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Interview Demo Project",
    "description": "A comprehensive project showcasing TaskFlow Pro capabilities",
    "color": "#3B82F6"
  }')

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Failed to create project. Response: $PROJECT_RESPONSE${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Demo project created with ID: $PROJECT_ID${NC}"

# Create demo tasks
echo -e "${BLUE}Creating demo tasks...${NC}"

# Task 1: High Priority
curl -s -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Implement JWT Authentication\",
    \"description\": \"Add secure JWT-based authentication system with refresh tokens\",
    \"projectId\": \"$PROJECT_ID\",
    \"priority\": \"urgent\",
    \"status\": \"in_progress\",
    \"tags\": [\"backend\", \"security\", \"authentication\"]
  }" > /dev/null

# Task 2: Medium Priority
curl -s -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Design Database Schema\",
    \"description\": \"Create normalized database schema with proper relationships and indexes\",
    \"projectId\": \"$PROJECT_ID\",
    \"priority\": \"high\",
    \"status\": \"done\",
    \"tags\": [\"database\", \"design\", \"architecture\"]
  }" > /dev/null

# Task 3: Low Priority
curl -s -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Add Swagger Documentation\",
    \"description\": \"Implement comprehensive API documentation with interactive Swagger UI\",
    \"projectId\": \"$PROJECT_ID\",
    \"priority\": \"medium\",
    \"status\": \"todo\",
    \"tags\": [\"documentation\", \"api\", \"swagger\"]
  }" > /dev/null

# Task 4: High Priority
curl -s -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Implement Redis Caching\",
    \"description\": \"Add Redis caching layer for improved performance and scalability\",
    \"projectId\": \"$PROJECT_ID\",
    \"priority\": \"high\",
    \"status\": \"review\",
    \"tags\": [\"caching\", \"performance\", \"redis\"]
  }" > /dev/null

# Task 5: Medium Priority
curl -s -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Set up Bull Queues\",
    \"description\": \"Implement background job processing with Bull queues for async operations\",
    \"projectId\": \"$PROJECT_ID\",
    \"priority\": \"medium\",
    \"status\": \"in_progress\",
    \"tags\": [\"queues\", \"background-jobs\", \"bull\"]
  }" > /dev/null

# Task 6: Low Priority
curl -s -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Add Docker Containerization\",
    \"description\": \"Containerize the application with Docker for easy deployment and scaling\",
    \"projectId\": \"$PROJECT_ID\",
    \"priority\": \"low\",
    \"status\": \"done\",
    \"tags\": [\"docker\", \"containerization\", \"deployment\"]
  }" > /dev/null

echo -e "${GREEN}✅ Demo tasks created successfully${NC}"

# Show demo data summary
echo -e "\n${YELLOW}📊 Demo Data Summary:${NC}"
echo -e "${BLUE}Project:${NC} Interview Demo Project ($PROJECT_ID)"
echo -e "${BLUE}Tasks Created:${NC} 6 tasks with different priorities and statuses"
echo -e "${BLUE}User:${NC} demo@taskflowpro.com"
echo -e "${BLUE}Password:${NC} demo123456"

echo -e "\n${YELLOW}🔗 Demo URLs:${NC}"
echo -e "${BLUE}API Documentation:${NC} http://localhost:8080/api-docs/"
echo -e "${BLUE}Bull Board:${NC} http://localhost:3001"
echo -e "${BLUE}Health Check:${NC} http://localhost:8080/health"

echo -e "\n${YELLOW}🧪 Test Commands:${NC}"
echo -e "${BLUE}Get all tasks:${NC}"
echo "curl -H \"Authorization: Bearer $JWT_TOKEN\" http://localhost:8080/api/v1/tasks"

echo -e "\n${BLUE}Filter by priority:${NC}"
echo "curl -H \"Authorization: Bearer $JWT_TOKEN\" \"http://localhost:8080/api/v1/tasks?priority=high\""

echo -e "\n${BLUE}Search tasks:${NC}"
echo "curl -H \"Authorization: Bearer $JWT_TOKEN\" \"http://localhost:8080/api/v1/tasks?search=authentication\""

echo -e "\n${GREEN}🎉 Demo setup complete! Ready for interview presentation.${NC}"
