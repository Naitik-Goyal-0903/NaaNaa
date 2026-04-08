import axios from 'axios';

// Vite environment variable (set in .env as VITE_API_URL) or fallback
const normalizeApiBaseUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return 'http://localhost:5000/api';
  const withoutTrailingSlash = raw.replace(/\/+$/, '');
  return /\/api$/i.test(withoutTrailingSlash)
    ? withoutTrailingSlash
    : `${withoutTrailingSlash}/api`;
};

const API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_API_URL);

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

// Handle responses
api.interceptors.response.use(
  response => response.data,
  error => {
    const status = error.response?.status;
    if (status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      // Avoid forced full page reload. Let consuming components handle redirect.
    }
    return Promise.reject({ status, ...(error.response?.data || {}), message: error.response?.data?.message || error.response?.data?.msg || error.message });
  }
);

// ========== PRODUCTS ==========
export const getProducts = (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.category) params.append('category', filters.category);
  if (filters.priceMax) params.append('priceMax', filters.priceMax);
  if (filters.search) params.append('search', filters.search);
  if (filters.sort) params.append('sort', filters.sort);
  
  return api.get(`/products?${params}`);
};

export const getProductById = (id) => api.get(`/products/${id}`);

export const createProduct = (data) => api.post('/products', data);

export const updateProduct = (id, data) => api.put(`/products/${id}`, data);

export const deleteProduct = (id) => api.delete(`/products/${id}`);

export const getProductReviews = (id) => api.get(`/products/${id}/reviews`);

export const addProductReview = (id, data) => api.post(`/products/${id}/reviews`, data);

export const deleteProductReview = (id, reviewId) => api.delete(`/products/${id}/reviews/${reviewId}`);

// ========== AUTH ==========
export const register = (data) => api.post('/auth/register', data);

export const login = (identifier, password) => 
  api.post('/auth/login', { identifier, password });
export const getMe = () => api.get('/auth/me');

// ========== USERS ==========
export const getUserProfile = () => api.get('/users/profile');

export const updateUserProfile = (data) => api.put('/users/profile', data);

// ========== CART ==========
export const getCart = () => api.get('/cart');

export const addToCart = (productId, quantity = 1) => 
  api.post('/cart/add', { productId, quantity });

export const removeFromCart = (productId) => 
  api.delete(`/cart/remove/${productId}`);

export const updateCartQuantity = (productId, quantity) => 
  api.put(`/cart/update/${productId}`, { quantity });

export const clearCart = () => api.delete('/cart/clear');

// ========== WISHLIST ==========
export const getWishlist = () => api.get('/wishlist');

export const addToWishlist = (productId) => 
  api.post(`/wishlist/add/${productId}`);

export const removeFromWishlist = (productId) => 
  api.delete(`/wishlist/remove/${productId}`);

export const toggleWishlistItem = (productId) => 
  api.post(`/wishlist/toggle/${productId}`);

// ========== ORDERS ==========
export const createOrder = (data) => api.post('/orders', data);

export const getUserOrders = () => api.get('/orders/my-orders');

export const getOrderById = (id) => api.get(`/orders/${id}`);

export const updateOrderStatus = (id, status) => 
  api.put(`/orders/${id}/status`, { orderStatus: status });

// ========== HEALTH CHECK ==========
export const healthCheck = () => api.get('/health');

export default api;
