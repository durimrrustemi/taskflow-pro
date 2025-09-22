#!/bin/bash

# TaskFlow Pro - Live Demo Script for Interviews
# This script demonstrates key features in real-time

echo "🎯 TaskFlow Pro - Live Demo"
echo "=========================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Demo user credentials
DEMO_EMAIL="demo@taskflowpro.com"
DEMO_PASSWORD="demo123456"

echo -e "\n${BLUE}1. Authentication Demo${NC}"
echo "========================"

# Register user
echo "Registering demo user..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DEMO_EMAIL\",
    \"password\": \"$DEMO_PASSWORD\",
    \"firstName\": \"Demo\",
    \"lastName\": \"User\"
  }")

if echo "$REGISTER_RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✅ User registered successfully${NC}"
else
    echo -e "${YELLOW}⚠️  User might already exist${NC}"
fi

# Login
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$DEMO_EMAIL\",
    \"password\": \"$DEMO_PASSWORD\"
  }")

echo "Login response: $LOGIN_RESPONSE"

JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)

if [ -n "$JWT_TOKEN" ]; then
    echo -e "${GREEN}✅ JWT token obtained${NC}"
    echo "Token: ${JWT_TOKEN:0:20}..."
else
    echo -e "${RED}❌ Failed to get JWT token${NC}"
    echo "Trying to get token from data field..."
    JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$JWT_TOKEN" ]; then
        echo -e "${GREEN}✅ JWT token obtained from data field${NC}"
        echo "Token: ${JWT_TOKEN:0:20}..."
    else
        echo -e "${RED}❌ Still failed to get JWT token${NC}"
        exit 1
    fi
fi

echo -e "\n${BLUE}2. CRUD Operations Demo${NC}"
echo "========================="

# Create project
echo "Creating demo project..."
PROJECT_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/projects \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Live Demo Project",
    "description": "Project created during live demo",
    "color": "#10B981"
  }')

PROJECT_ID=$(echo "$PROJECT_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✅ Project created: $PROJECT_ID${NC}"

# Create task
echo "Creating demo task..."
TASK_RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/tasks \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"Live Demo Task\",
    \"description\": \"Task created during live interview demo\",
    \"projectId\": \"$PROJECT_ID\",
    \"priority\": \"high\",
    \"tags\": [\"demo\", \"interview\", \"live-coding\"]
  }")

TASK_ID=$(echo "$TASK_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo -e "${GREEN}✅ Task created: $TASK_ID${NC}"

# Read task
echo "Reading task details..."
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:8080/api/v1/tasks/$TASK_ID" | jq '.data.title, .data.status, .data.priority'

# Update task
echo "Updating task status..."
curl -s -X PATCH "http://localhost:8080/api/v1/tasks/$TASK_ID/status" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "in_progress"}' | jq '.message'

echo -e "\n${BLUE}3. Advanced Filtering Demo${NC}"
echo "============================="

echo "Filtering by priority (high):"
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:8080/api/v1/tasks?priority=high" | jq '.data.tasks | length'

echo "Searching for 'demo' tasks:"
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:8080/api/v1/tasks?search=demo" | jq '.data.tasks[].title'

echo "Pagination (page 1, limit 3):"
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:8080/api/v1/tasks?page=1&limit=3" | jq '.data.pagination'

echo -e "\n${BLUE}4. Redis Caching Demo${NC}"
echo "========================"

echo "Checking Redis cache..."
docker-compose exec redis redis-cli KEYS "*" | head -5

echo -e "\n${BLUE}5. Bull Queue Demo${NC}"
echo "===================="

echo "Queue statistics:"
curl -s -H "Authorization: Bearer $JWT_TOKEN" \
  "http://localhost:8080/api/v1/admin/queues/stats" | jq '.data'

echo -e "\n${BLUE}6. Health Check Demo${NC}"
echo "======================="

echo "Application health:"
curl -s "http://localhost:8080/health" | jq '.'

echo -e "\n${GREEN}🎉 Live Demo Complete!${NC}"
echo "=========================="
echo "Key features demonstrated:"
echo "✅ JWT Authentication"
echo "✅ CRUD Operations"
echo "✅ Advanced Filtering & Pagination"
echo "✅ Redis Caching"
echo "✅ Bull Queue Processing"
echo "✅ Health Monitoring"
echo ""
echo "Next: Show Swagger UI at http://localhost:8080/api-docs/"
