# Frontend-Backend Integration Guide

## Overview

Your `App.jsx` currently uses local state with hardcoded PRODUCTS array.
To make it fully functional, replace local state with API calls.

---

## 🔄 Integration Steps

### 1. Import API Functions

Add this at the top of `App.jsx`:

```javascript
import { 
  getProducts, 
  getProductById,
  login, 
  register,
  addToCart, 
  removeFromCart,
  getCart,
  updateCartQuantity,
  clearCart,
  createOrder,
  getUserOrders
} from './utils/api';
```

### 2. Load Products on Mount

**Current (Local):**
```javascript
const [products, setProducts] = useState(PRODUCTS);
```

**Updated (API):**
```javascript
const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadProducts();
}, []);

const loadProducts = async () => {
  try {
    setLoading(true);
    const data = await getProducts();
    setProducts(data);
  } catch (error) {
    console.error('Failed to load products:', error);
    setProducts([]); // Show empty if error
  } finally {
    setLoading(false);
  }
};
```

### 3. Handle Filtering & Sorting

**Current (Local):**
```javascript
const filteredProducts = products.filter(p => {
  if (selectedCategory !== 'All' && p.category !== selectedCategory) return false;
  if (p.price > priceRange) return false;
  if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
  return true;
}).sort(...);
```

**Updated (API):**
```javascript
const loadFilteredProducts = async () => {
  try {
    setLoading(true);
    const data = await getProducts({
      category: selectedCategory === 'All' ? null : selectedCategory,
      priceMax: priceRange,
      search: searchQuery,
      sort: sortBy
    });
    setProducts(data);
  } catch (error) {
    console.error('Filter failed:', error);
  } finally {
    setLoading(false);
  }
};

// Call when filters change
useEffect(() => {
  loadFilteredProducts();
}, [selectedCategory, priceRange, searchQuery, sortBy]);
```

### 4. Update Login Handler

**Current (Local):**
```javascript
if (email === 'admin@test.com' && password === 'admin') {
  setCurrentUser({ name: 'Admin', email: 'admin@test.com', isAdmin: true });
  setCurrentPage('admin');
}
```

**Updated (API):**
```javascript
const handleLogin = async (email, password) => {
  try {
    const response = await login(email, password);
    localStorage.setItem('authToken', response.token);
    setCurrentUser(response.user);
    if (response.user.isAdmin) {
      setCurrentPage('admin');
    } else {
      setCurrentPage('home');
    }
  } catch (error) {
    alert('Login failed: ' + error.message);
  }
};
```

### 5. Update Cart Operations

**Add to Cart:**
```javascript
const addToCartAPI = async (productId, quantity = 1) => {
  try {
    const response = await addToCart(productId, quantity);
    setCart(response.items || [...cart, { productId, quantity }]);
  } catch (error) {
    alert('Failed to add to cart: ' + error.message);
  }
};
```

**Remove from Cart:**
```javascript
const removeFromCartAPI = async (productId) => {
  try {
    const response = await removeFromCart(productId);
    setCart(response.items || cart.filter(item => item.productId !== productId));
  } catch (error) {
    alert('Failed to remove item: ' + error.message);
  }
};
```

**Update Quantity:**
```javascript
const updateQtyAPI = async (productId, quantity) => {
  try {
    const response = await updateCartQuantity(productId, quantity);
    setCart(response.items || 
      cart.map(item => item.productId === productId ? { ...item, quantity } : item)
    );
  } catch (error) {
    alert('Failed to update quantity: ' + error.message);
  }
};
```

### 6. Update Checkout/Order

**Current (Local):**
```javascript
alert('Order placed! Total: ₹' + total);
setCart([]);
```

**Updated (API):**
```javascript
const handleCheckout = async (formData) => {
  try {
    const order = await createOrder({
      shippingAddress: {
        street: formData.address,
        city: formData.city,
        state: formData.state,
        pincode: formData.zip
      },
      paymentMethod: formData.paymentMethod
    });
    
    alert('Order placed successfully! Order ID: ' + order._id);
    await clearCart();
    setCart([]);
    setCurrentPage('home');
  } catch (error) {
    alert('Checkout failed: ' + error.message);
  }
};
```

### 7. Registration

**Current (Local):**
```javascript
alert('Account created!');
```

**Updated (API):**
```javascript
const handleRegister = async (name, email, password) => {
  try {
    const response = await register({ name, email, password });
    localStorage.setItem('authToken', response.token);
    setCurrentUser(response.user);
    setCurrentPage('home');
  } catch (error) {
    alert('Registration failed: ' + error.message);
  }
};
```

---

## 📊 State Management Changes

### Keep Local State For:
- `currentPage` - What page user is on
- `selectedCategory` - Selected filter
- `searchQuery` - Search input
- `priceRange` - Price slider
- `sortBy` - Sort selection

### Move to API:
- `products` - Load from `/api/products`
- `cart` - Load from `/api/cart`
- `currentUser` - Load from localStorage after login
- `orders` - Load from `/api/orders/my-orders`

---

## 🔐 Persist User Session

Add to App.jsx `useEffect`:

```javascript
useEffect(() => {
  // Check if user is logged in
  const token = localStorage.getItem('authToken');
  if (token) {
    try {
      // Decode token to get user info (optional)
      // Or fetch from /api/users/profile
      setCurrentUser({ authenticated: true });
    } catch (error) {
      localStorage.removeItem('authToken');
    }
  }
}, []);
```

---

## 🔄 Error Handling Pattern

Use this pattern for API calls:

```javascript
const [error, setError] = useState(null);
const [loading, setLoading] = useState(false);

const fetchData = async () => {
  try {
    setError(null);
    setLoading(true);
    const data = await apiFunction();
    // Use data
  } catch (err) {
    setError(err.message || 'Something went wrong');
    console.error('Error:', err);
  } finally {
    setLoading(false);
  }
};

// In JSX:
{loading && <p>Loading...</p>}
{error && <p style={{color: 'red'}}>{error}</p>}
```

---

## 🧪 Testing Integration

1. **Start MongoDB**
2. **Start Backend** (`npm run dev` in backend folder)
3. **Seed Database** (`node seed.js`)
4. **Start Frontend** (`npm run dev` in UI folder)
5. **Test in Order:**
   - ✓ Products load from API
   - ✓ Can register user
   - ✓ Can login
   - ✓ Can add to cart
   - ✓ Can checkout

---

## ✅ Migration Checklist

- [ ] Import API functions
- [ ] Load products on mount
- [ ] Update filters to use API
- [ ] Update login/register
- [ ] Update cart operations
- [ ] Update checkout
- [ ] Test all flows
- [ ] Remove hardcoded PRODUCTS array
- [ ] Remove hardcoded test data

---

## 📝 Quick Reference

| Action | Function | Returns |
|--------|----------|---------|
| Get products | `getProducts(filters)` | `[{...}, {...}]` |
| Get single | `getProductById(id)` | `{...}` |
| Login | `login(email, pass)` | `{ user, token }` |
| Register | `register(data)` | `{ user, token }` |
| Add cart | `addToCart(id, qty)` | `{ items: [...] }` |
| Get cart | `getCart()` | `{ items: [...] }` |
| Checkout | `createOrder(data)` | `{ orderId }` |
| My orders | `getUserOrders()` | `[{...}, {...}]` |

---

## 🚀 After Integration

Once frontend is connected:

1. **Frontend on:** http://localhost:5173
2. **Backend on:** http://localhost:5000
3. **Database:** MongoDB with 10 seeded products
4. **Users:** Can register, login, shop, checkout
5. **Orders:** Tracked in database
6. **Cart:** Persisted per user

**All ready for production deployment!**
