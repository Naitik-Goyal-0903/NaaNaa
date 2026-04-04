# 🧪 API Testing Guide

## Backend URLs

**Base URL:** `http://localhost:5000`

---

## Signup Endpoint

### Request
```
POST /api/auth/signup
Content-Type: application/json

{
  "username": "John Doe",
  "mobile": "9876543210",
  "email": "john@example.com",
  "password": "Test@1234"
}
```

### Success Response (201)
```json
{
  "message": "Signup successful",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "John Doe",
    "mobile": "9876543210",
    "email": "john@example.com",
    "createdAt": "2025-03-27T10:30:00.000Z"
  }
}
```

### Error Responses

#### Missing Fields (400)
```json
{
  "message": "All fields are required"
}
```

#### Invalid Email (400)
```json
{
  "message": "Invalid email format"
}
```

#### Invalid Phone (400)
```json
{
  "message": "Mobile must be 10 digits"
}
```

#### Weak Password (400)
```json
{
  "message": "Password must have uppercase, lowercase, number & @ symbol (min 8 chars)"
}
```

#### User Exists (400)
```json
{
  "message": "Email or mobile already registered"
}
```

---

## Login Endpoint

### Request
```
POST /api/auth/login
Content-Type: application/json

{
  "identifier": "john@example.com",
  "password": "Test@1234"
}
```

Or with mobile:
```json
{
  "identifier": "9876543210",
  "password": "Test@1234"
}
```

### Success Response (200)
```json
{
  "message": "Login successful",
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "John Doe",
    "mobile": "9876543210",
    "email": "john@example.com",
    "createdAt": "2025-03-27T10:30:00.000Z"
  }
}
```

### Error Responses

#### Missing Fields (400)
```json
{
  "message": "Email/mobile and password required"
}
```

#### User Not Found (401)
```json
{
  "message": "Invalid credentials"
}
```

#### Wrong Password (401)
```json
{
  "message": "Invalid credentials"
}
```

---

## Test Data

### Valid Test Cases

#### Test Case 1
```json
{
  "username": "Alice Smith",
  "mobile": "9123456789",
  "email": "alice@email.com",
  "password": "Alice@12345"
}
```

#### Test Case 2
```json
{
  "username": "Bob Johnson",
  "mobile": "9987654321",
  "email": "bob@example.com",
  "password": "Bobby@2025"
}
```

### Invalid Test Cases

#### Weak Password (missing number)
```json
{
  "username": "Test User",
  "mobile": "9999999999",
  "email": "test@test.com",
  "password": "Test@abcd"  // ✗ No number
}
// Error: "Password must have uppercase, lowercase, number & @ symbol"
```

#### Invalid Email
```json
{
  "username": "Test User",
  "mobile": "9999999999",
  "email": "testemailcom",  // ✗ No @ symbol
  "password": "Test@1234"
}
// Error: "Invalid email format"
```

#### Invalid Mobile (too long)
```json
{
  "username": "Test User",
  "mobile": "99999999999",  // ✗ 11 digits
  "email": "test@test.com",
  "password": "Test@1234"
}
// Error: "Mobile must be 10 digits"
```

---

## Using Postman or cURL

### cURL Signup Example
```bash
curl -X POST http://localhost:5000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "username": "John Doe",
    "mobile": "9876543210",
    "email": "john@example.com",
    "password": "Test@1234"
  }'
```

### cURL Login Example
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "identifier": "john@example.com",
    "password": "Test@1234"
  }'
```

---

## Postman Configuration

### Step 1: Create Signup Request
- **Method:** POST
- **URL:** http://localhost:5000/api/auth/signup
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body (Raw - JSON):**
  ```json
  {
    "username": "John Doe",
    "mobile": "9876543210",
    "email": "john@example.com",
    "password": "Test@1234"
  }
  ```

### Step 2: Create Login Request
- **Method:** POST
- **URL:** http://localhost:5000/api/auth/login
- **Headers:**
  ```
  Content-Type: application/json
  ```
- **Body (Raw - JSON):**
  ```json
  {
    "identifier": "john@example.com",
    "password": "Test@1234"
  }
  ```

---

## Database Validation

After successful signup, check MongoDB:

```javascript
// Connect to MongoDB
use naananaa

// View users
db.users.find().pretty()

// Should return something like:
{
  "_id": ObjectId("..."),
  "username": "John Doe",
  "mobile": "9876543210",
  "email": "john@example.com",
  "password": "$2a$10$...", // bcrypt hashed
  "role": "user",
  "createdAt": ISODate("2025-03-27T10:30:00.000Z"),
  "updatedAt": ISODate("2025-03-27T10:30:00.000Z")
}
```

---

## Status Codes Reference

| Code | Meaning | Examples |
|------|---------|----------|
| 201 | Created | Successful signup |
| 200 | OK | Successful login |
| 400 | Bad Request | Invalid data, missing fields |
| 401 | Unauthorized | Wrong credentials |
| 500 | Server Error | Database connection failed |

---

## Common Issues & Solutions

### Issue: "EADDRINUSE: address already in use :::5000"
**Solution:** Port 5000 is taken. Kill the process or use different port.
```bash
# Windows: Find and kill process on port 5000
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

### Issue: MongoDB connection refused
**Solution:** Check .env file has correct MONGODB_URI
```
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/naananaa
```

### Issue: Password validation keeps failing
**Solution:** Ensure password has ALL of:
- ✅ Minimum 8 characters
- ✅ At least 1 uppercase letter (A-Z)
- ✅ At least 1 lowercase letter (a-z)
- ✅ At least 1 digit (0-9)
- ✅ At least 1 @ symbol

**Valid examples:** `Test@1234`, `MyPass@word1`, `Hello@123`
**Invalid examples:** `Test1234` (no @), `Test@abc` (no number)

---

Done! Your API is ready to test! 🚀

### 1. Health Check (No Login Needed)
```bash
curl http://localhost:5000/api/health
```
**Expected Response:**
```json
{ "status": "OK", "message": "Backend is running" }
```

### 2. Get All Products (No Login)
```bash
curl http://localhost:5000/api/products
```

### 3. Get Products with Filters
```bash
# By category
curl "http://localhost:5000/api/products?category=Mens"

# By price
curl "http://localhost:5000/api/products?priceMax=1000"

# By search
curl "http://localhost:5000/api/products?search=shirt"

# With sorting
curl "http://localhost:5000/api/products?sort=price-asc"
```

### 4. Register User
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'
```
**Expected Response:**
```json
{
  "message": "User registered successfully",
  "token": "eyJhbGciOiJIUzI1..."
}
```

### 5. Login User
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```
**Save the token from response:**
```bash
TOKEN="your_token_here"
```

### 6. Get User Profile (Protected)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/users/profile
```

### 7. Add to Cart (Protected)
```bash
# First, get a product ID from /api/products
PRODUCT_ID="64abc123def456"

curl -X POST http://localhost:5000/api/cart/add \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productId": "'"$PRODUCT_ID"'",
    "quantity": 2
  }'
```

### 8. Get Cart (Protected)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/cart
```

### 9. Create Order (Protected)
```bash
curl -X POST http://localhost:5000/api/orders/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "street": "123 Main St",
      "city": "Mumbai",
      "state": "MH",
      "pincode": "400001"
    },
    "paymentMethod": "Credit Card"
  }'
```

### 10. Get My Orders (Protected)
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:5000/api/orders/my-orders
```

---

## 🛠️ Using Postman

1. **Import Collection:**
   - Create new collection "NaaNaa API"
   - Add requests for each endpoint

2. **Setup Authorization:**
   - Login to get token
   - Go to "Auth" tab → Select "Bearer Token"
   - Paste token in "Token" field
   - All requests will now include header: `Authorization: Bearer token`

3. **Test Requests:**
   - Use POST/GET/PUT/DELETE buttons
   - Pass JSON in Body → raw → JSON
   - Check responses

---

## 📱 Using Frontend API Client

```javascript
import { getProducts, login, addToCart, createOrder } from './utils/api';

// Get products
const products = await getProducts({ category: 'Womens' });
console.log(products);

// Login
const response = await login('test@example.com', 'password123');
localStorage.setItem('authToken', response.token);

// Add to cart (now automatically includes token)
await addToCart('product_id', 2);

// Create order
await createOrder({
  shippingAddress: { 
    street: '123 Main St',
    city: 'Mumbai',
    state: 'MH',
    pincode: '400001'
  },
  paymentMethod: 'Credit Card'
});
```

---

## ⚡ Quick Debug Checklist

- [ ] Backend running? Check terminal: `Server running on http://localhost:5000`
- [ ] MongoDB running? Try: `curl http://localhost:5000/api/health`
- [ ] Products seeded? Should have 10 items
- [ ] Token working? Copy from login response
- [ ] Authorization header? Format: `Bearer token_value`
- [ ] CORS enabled? Frontend should connect from localhost:5173

---

## 🔧 Common Errors

| Error | Fix |
|-------|-----|
| Cannot connect | Check MongoDB running, restart server |
| 401 Unauthorized | Check token, re-login for new token |
| 404 Not Found | Check endpoint URL spelling |
| CORS error | Check server.js CORS config |
| Request timeout | Increase timeout, check MongoDB |

---

**Run tests in order! Register → Login → Add Cart → Create Order**
