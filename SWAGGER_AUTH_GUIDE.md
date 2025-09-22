# Swagger Authentication Demo Guide 🔐

## 🎯 **How to Demonstrate Authentication in Swagger**

### **Method 1: Using Swagger UI Authentication (Recommended)**

#### **Step 1: Open Swagger UI**
```
http://localhost:8080/api-docs/
```

#### **Step 2: Get Authentication Token**
1. **Click the "Authorize" button** (🔒 lock icon) at the top right
2. **You'll see a popup with authentication options**
3. **Use the `/auth/login` endpoint** to get a token:

**Login Request:**
```json
{
  "email": "demo@taskflowpro.com",
  "password": "demo123456"
}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": { ... },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### **Step 3: Authorize in Swagger**
1. **Copy the `accessToken`** from the login response
2. **Paste it into the "Value" field** in the authorization popup
3. **Click "Authorize"**
4. **Click "Close"**

#### **Step 4: Test Protected Endpoints**
Now you can test any protected endpoint:
- ✅ `/api/v1/tasks` - Get all tasks
- ✅ `/api/v1/tasks/{id}` - Get specific task
- ✅ `/api/v1/projects` - Get all projects
- ✅ Any other protected endpoint

---

### **Method 2: Using curl to Get Token (Backup)**

#### **Get Token via curl:**
```bash
# Login and get token
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@taskflowpro.com",
    "password": "demo123456"
  }'
```

#### **Copy the token and use in Swagger:**
1. Copy the `accessToken` from the response
2. Go to Swagger UI
3. Click "Authorize" button
4. Paste the token
5. Click "Authorize"

---

### **Method 3: Pre-configured Demo Token (Quick Start)**

#### **Use the token from demo setup:**
```bash
# Run demo setup to get a fresh token
./demo-setup.sh

# The script will output a curl command with the token
# Copy the token from the output and use it in Swagger
```

---

## 🎬 **Interview Demo Script for Swagger**

### **"Let me show you how authentication works in our API..."**

#### **1. Show Swagger UI (30 seconds)**
```
"Here's our interactive API documentation. Notice the lock icon - 
this indicates that authentication is required for most endpoints."
```

#### **2. Demonstrate Login (1 minute)**
```
"Let me show you how to authenticate. I'll use the login endpoint 
to get a JWT token. I'll use the demo credentials we set up earlier."
```

**In Swagger:**
1. Find `/auth/login` endpoint
2. Click "Try it out"
3. Enter demo credentials:
   ```json
   {
     "email": "demo@taskflowpro.com",
     "password": "demo123456"
   }
   ```
4. Click "Execute"
5. Show the response with `accessToken`

#### **3. Authorize in Swagger (30 seconds)**
```
"Now I'll copy this access token and use it to authorize 
all subsequent requests in Swagger."
```

1. Click "Authorize" button
2. Paste the `accessToken`
3. Click "Authorize"
4. Show that the lock icons are now green

#### **4. Test Protected Endpoints (2 minutes)**
```
"Now I can test any protected endpoint. Let me show you 
the task management features."
```

**Demonstrate:**
- **Get all tasks**: Show pagination and filtering
- **Create a new task**: Show validation and response
- **Update a task**: Show PATCH vs PUT
- **Delete a task**: Show proper HTTP methods

#### **5. Show Advanced Features (2 minutes)**
```
"Let me demonstrate some advanced features like filtering 
and searching."
```

**Test these query parameters:**
- `?priority=high` - Filter by priority
- `?search=authentication` - Search in title/description
- `?page=1&limit=5` - Pagination
- `?sortBy=createdAt&sortOrder=DESC` - Sorting

---

## 🚨 **Troubleshooting Common Issues**

### **Issue 1: "Unauthorized" Error**
**Solution:**
- Make sure you're using the correct token
- Check if the token has expired
- Re-login to get a fresh token

### **Issue 2: Token Not Working**
**Solution:**
- Copy the token exactly (no extra spaces)
- Make sure you're using `accessToken`, not `refreshToken`
- Check the token format: should start with `eyJ`

### **Issue 3: Swagger UI Not Loading**
**Solution:**
- Check if the application is running: `curl http://localhost:8080/health`
- Restart Docker: `docker-compose restart`
- Check logs: `docker-compose logs app`

### **Issue 4: Login Fails**
**Solution:**
- Make sure demo user exists: run `./demo-setup.sh`
- Check if services are healthy
- Verify database connection

---

## 🎯 **Pro Tips for Interview**

### **1. Prepare Backup Plans**
- Have a pre-generated token ready
- Know the demo credentials by heart
- Have curl commands ready as backup

### **2. Explain What You're Doing**
- "I'm now authenticating to get a JWT token..."
- "This token will be used for all subsequent requests..."
- "Notice how the lock icons turn green after authorization..."

### **3. Highlight Security Features**
- "JWT tokens are stateless and secure..."
- "Tokens have expiration times for security..."
- "We use Bearer token authentication..."

### **4. Show Error Handling**
- Try an invalid token to show error handling
- Show what happens with expired tokens
- Demonstrate validation errors

---

## 📋 **Quick Reference Commands**

### **Get Fresh Token:**
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "demo@taskflowpro.com", "password": "demo123456"}'
```

### **Test with Token:**
```bash
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:8080/api/v1/tasks
```

### **Check Health:**
```bash
curl http://localhost:8080/health
```

---

## 🎉 **Demo Checklist**

- [ ] Swagger UI loads at http://localhost:8080/api-docs/
- [ ] Can see all endpoints and their documentation
- [ ] Can login and get JWT token
- [ ] Can authorize in Swagger UI
- [ ] Can test protected endpoints
- [ ] Can demonstrate filtering and pagination
- [ ] Can show error handling
- [ ] Can explain security features

**You're now ready to demonstrate authentication in Swagger like a pro!** 🚀
