const express = require('express');
const router = express.Router();
const Cart = require('../models/Cart');
const auth = require('../middleware/auth');

// ✅ GET USER CART
router.get('/', auth, async (req, res) => {
  try {
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = { items: [], total: 0 };
    }
    res.json(cart);
  } catch (err) {
    console.error('Get cart error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ ADD TO CART
router.post('/add', auth, async (req, res) => {
  try {
    const { productId, name, price, quantity = 1, image } = req.body;
    
    let cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      cart = new Cart({ userId: req.user._id, items: [] });
    }

    const existingItem = cart.items.find(item => item.productId == productId);
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({ productId, name, price, quantity, image });
    }

    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ msg: 'Item added to cart', cart });
  } catch (err) {
    console.error('Add to cart error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ REMOVE FROM CART
router.delete('/remove/:productId', auth, async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ msg: 'Cart not found' });
    }

    cart.items = cart.items.filter(item => item.productId != req.params.productId);
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ msg: 'Item removed from cart', cart });
  } catch (err) {
    console.error('Remove from cart error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ UPDATE CART QUANTITY
router.put('/update/:productId', auth, async (req, res) => {
  try {
    const { quantity } = req.body;
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({ msg: 'Cart not found' });
    }

    const item = cart.items.find(item => item.productId == req.params.productId);
    if (!item) {
      return res.status(404).json({ msg: 'Item not in cart' });
    }

    item.quantity = Math.max(1, quantity);
    cart.total = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cart.updatedAt = new Date();
    await cart.save();

    res.json({ msg: 'Cart updated', cart });
  } catch (err) {
    console.error('Update cart error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ CLEAR CART
router.delete('/clear', auth, async (req, res) => {
  try {
    await Cart.deleteOne({ userId: req.user._id });
    res.json({ msg: 'Cart cleared' });
  } catch (err) {
    console.error('Clear cart error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
