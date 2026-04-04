# NaaNaa Ecommerce - Full Stack Setup Guide

**Status:** ✅ Backend Ready | ✅ Frontend Ready | ⏳ MongoDB Required

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Start MongoDB (REQUIRED)
Choose one option:

**Option A: Local MongoDB** (Recommended for development)
```bash
# Install MongoDB Community Edition
# https://www.mongodb.com/try/download/community

# Windows: Run MongoDB Service
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

**Option B: MongoDB Atlas** (Cloud - No installation needed)
```bash
1. Go to https://www.mongodb.com/cloud/atlas
2. Create free account
3. Create a cluster (Free tier available)
4. Get connection string
5. Update c:\Users\Naitik Goyal\ecommerce-backend\.env
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/naanaa
```

### Step 2: Setup Backend

```bash
# Open Terminal 1
cd c:\Users\Naitik Goyal\ecommerce-backend

# Install dependencies
npm install

# Seed database with 10 products (after MongoDB is running)
node seed.js

# Start server (already running in background at http://localhost:5000)
npm run dev
```

### Step 3: Setup Frontend

```bash
# Open Terminal 2
cd c:\Users\Naitik Goyal\ecommerce-ui

# Already running with Vite at http://localhost:5173
# If not, run:
npm run dev
```

### Step 4: Test Connection

Visit: `http://localhost:5173`
- If you see products loading, **backend is connected!** ✅
- If you see an error, check MongoDB is running

---

## 📦 What Was Created

### Frontend (`c:\Users\Naitik Goyal\ecommerce-ui\`)

**New File:**
- `src/utils/api.js` - API client with axios

**Updated:**
- `package.json` - Added axios dependency

### Backend (`c:\Users\Naitik Goyal\ecommerce-backend\`)

**Directory Structure:**
```
ecommerce-backend/
├── models/
│   ├── Product.js      # Product schema
│   ├── User.js         # User with password hashing
│   ├── Order.js        # Order tracking
│   └── Cart.js         # Shopping cart
├── routes/
│   ├── products.js     # Product CRUD + filtering
│   ├── auth.js         # Login/Register
│   ├── users.js        # User profile
│   ├── cart.js         # Cart operations
│   └── orders.js       # Order management
├── middleware/
│   └── auth.js         # JWT protection
├── server.js           # Express app setup
├── seed.js             # Database initialization (10 products)
├── .env                # Environment config
├── package.json        # Dependencies
└── README.md           # Backend guide
```

---

## 🔌 API Endpoints (Ready to Use)

### Products
```bash
GET    /api/products              # List all (with filters)
GET    /api/products/:id          # Get single product
POST   /api/products              # Create (admin)
PUT    /api/products/:id          # Update (admin)
DELETE /api/products/:id          # Delete (admin)
```

### Authentication
```bash
POST   /api/auth/register         # Create account
POST   /api/auth/login            # Get JWT token
```

### Users
```bash
GET    /api/users/profile         # Get profile (protected)
PUT    /api/users/profile         # Update profile (protected)
```

### Cart
```bash
GET    /api/cart                  # Get cart items (protected)
POST   /api/cart/add              # Add product (protected)
DELETE /api/cart/remove/:id       # Remove product (protected)
PUT    /api/cart/update/:id       # Change quantity (protected)
DELETE /api/cart/clear            # Empty cart (protected)
```

### Orders
```bash
POST   /api/orders/create         # Place order (protected)
GET    /api/orders/my-orders      # My orders (protected)
GET    /api/orders/:id            # Order details (protected)
PUT    /api/orders/:id/status     # Update status (admin)
```

### Health
```bash
GET    /api/health                # Backend status
```

---

## 💻 Frontend Integration (Next Steps)

The API client (`src/utils/api.js`) is ready to use:

```javascript
import { getProducts, addToCart, login } from './utils/api';

// Get all products with filters
const products = await getProducts({ 
  category: 'Mens',
  sort: 'price-asc'
});

// Add to cart
await addToCart(productId, 2);

// Login user
const { user, token } = await login('user@example.com', 'password');
localStorage.setItem('authToken', token);
```

**To connect the App:**
1. Import API functions in `App.jsx`
2. Replace local state calls with API calls
3. Store `authToken` in localStorage after login
4. Use protected endpoints for authenticated users

Example Migration:
```javascript
// Before (local state)
const [products, setProducts] = useState(PRODUCTS);

// After (backend API)
const [products, setProducts] = useState([]);
useEffect(() => {
  getProducts().then(setProducts);
}, []);
```

---

## 🧪 Test API Endpoints

### Using cURL

```bash
# Health check
curl http://localhost:5000/api/health

# Get all products
curl http://localhost:5000/api/products

# Register user
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"John","email":"john@test.com","password":"pass123"}'

# Login
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"john@test.com","password":"pass123"}'
```

### Using Postman
1. Import endpoints from `ecommerce-backend/README.md`
2. Set Authorization header: `Bearer YOUR_TOKEN`
3. Test each endpoint

---

## 📊 Database Schema

### Products (10 items seeded)
- Name, Brand, Category (Mens/Womens)
- Price (₹), Original Price
- Rating, Reviews, Image emoji
- Tags, Description, Specs, Colors
- Stock level, Created timestamp

### Users
- Name, Email, Password (hashed)
- Phone, Address, City, State, Pincode
- isAdmin flag for admin panel
- Created timestamp

### Orders
- User ID, Items array
- Total price, Shipping address
- Payment/Order status, Created timestamp

### Cart
- User ID, Items array
- Product ID, Quantity, Price

---

## 🐛 Troubleshooting

### "Cannot connect to MongoDB"
```
✓ Check MongoDB is running
✓ Verify MONGODB_URI in .env
✓ Test with MongoDB Compass
```

### "CORS error"
```
✓ Backend should be on http://localhost:5000
✓ Frontend should be on http://localhost:5173
✓ .env FRONTEND_URL should match
```

### "401 Unauthorized"
```
✓ Check authToken in localStorage
✓ Token might have expired (7 day expiry)
✓ Re-login to get new token
```

### "Products not loading"
```
✓ Check backend terminal for errors
✓ Run: node seed.js (to populate database)
✓ Verify MongoDB has data
```

---

## 🚀 Next: Frontend Integration

To make the full app functional:

1. **HomePage** - Fetch featured products from `/api/products`
2. **CatalogPage** - Filter/sort via API params
3. **LoginPage** - Use `/api/auth/login`
4. **CheckoutPage** - Create order via `/api/orders/create`
5. **Cart** - Use `/api/cart` endpoints
6. **AdminPage** - Fetch/manage orders via API

---

## 📝 Environment Files

### Backend (.env)
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/naanaa
JWT_SECRET=naanaa_secret_key_2025_fashion_store
FRONTEND_URL=http://localhost:5173
```

### Frontend (Optional .env.local)
```
REACT_APP_API_URL=http://localhost:5000/api
```

---

## ✅ Verification Checklist

- [ ] MongoDB running (local or Atlas)
- [ ] Backend `npm install` completed
- [ ] Backend `node seed.js` completed (10 products seeded)
- [ ] Backend running on http://localhost:5000
- [ ] Frontend running on http://localhost:5173
- [ ] Can see products on homepage
- [ ] API health check working
- [ ] Can register & login

---

**🎉 Backend is ready! Next: Connect frontend to API endpoints.**

