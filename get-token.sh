#!/bin/bash

# Quick script to get a JWT token for Swagger demo

echo "🔐 Getting JWT Token for Swagger Demo"
echo "====================================="

# Demo credentials
EMAIL="demo@taskflowpro.com"
PASSWORD="demo123456"

echo "Logging in with demo credentials..."
echo "Email: $EMAIL"
echo "Password: $PASSWORD"
echo ""

# Login and get token
RESPONSE=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$PASSWORD\"
  }")

# Check if login was successful
if echo "$RESPONSE" | grep -q "success.*true"; then
    echo "✅ Login successful!"
    echo ""
    
    # Extract token
    TOKEN=$(echo "$RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    
    if [ -n "$TOKEN" ]; then
        echo "🎯 Your JWT Token:"
        echo "=================="
        echo "$TOKEN"
        echo ""
        echo "📋 How to use in Swagger:"
        echo "1. Go to http://localhost:8080/api-docs/"
        echo "2. Click the 'Authorize' button (🔒 lock icon)"
        echo "3. Paste the token above into the 'Value' field"
        echo "4. Click 'Authorize'"
        echo "5. Click 'Close'"
        echo ""
        echo "🧪 Test with curl:"
        echo "curl -H \"Authorization: Bearer $TOKEN\" http://localhost:8080/api/v1/tasks"
        echo ""
        echo "⏰ Token expires in 7 days"
    else
        echo "❌ Failed to extract token from response"
        echo "Response: $RESPONSE"
    fi
else
    echo "❌ Login failed!"
    echo "Response: $RESPONSE"
    echo ""
    echo "💡 Try running: ./demo-setup.sh"
fi
