const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Product = require('../models/Product');
const auth = require('../middleware/auth');
const { sendWhatsAppMessage } = require('../utils/whatsapp');

const normalizeItemImage = (item = {}, imageMap = new Map()) => {
  const current = String(item.image || '').trim();
  if (current) return current;

  const productId = String(item.productId || '').trim();
  if (!productId) return '';

  return imageMap.get(productId) || '';
};

const buildProductImageMap = async (items = []) => {
  const productIds = [...new Set(
    items
      .map((item) => String(item.productId || '').trim())
      .filter((id) => /^[a-f\d]{24}$/i.test(id))
  )];

  if (!productIds.length) return new Map();

  const products = await Product.find({ _id: { $in: productIds } }).select('_id image images');
  const map = new Map();

  products.forEach((product) => {
    const images = Array.isArray(product.images) ? product.images : [];
    const primary = String(product.image || '').trim() || String(images[0] || '').trim();
    if (primary) {
      map.set(String(product._id), primary);
    }
  });

  return map;
};

// ✅ GET ALL ORDERS (ADMIN ONLY)
router.get('/', auth, async (req, res) => {
  try {
    // Check if admin
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin only' });
    }

    const orders = await Order.find().sort({ createdAt: -1 });
    const allItems = orders.flatMap((order) => order.items || []);
    const imageMap = await buildProductImageMap(allItems);

    const enrichedOrders = orders.map((order) => {
      const plain = order.toObject();
      plain.items = (plain.items || []).map((item) => ({
        ...item,
        image: normalizeItemImage(item, imageMap)
      }));
      return plain;
    });

    res.json(enrichedOrders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ GET USER ORDERS (LOGGED IN USER'S ORDERS)
router.get('/my-orders', auth, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id.toString() }).sort({ createdAt: -1 });
    const allItems = orders.flatMap((order) => order.items || []);
    const imageMap = await buildProductImageMap(allItems);

    const enrichedOrders = orders.map((order) => {
      const plain = order.toObject();
      plain.items = (plain.items || []).map((item) => ({
        ...item,
        image: normalizeItemImage(item, imageMap)
      }));
      return plain;
    });

    res.json(enrichedOrders);
  } catch (err) {
    console.error('Get user orders error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ GET USER ORDERS BY ID (ADMIN ONLY - for viewing specific user's orders)
router.get('/user/:userId', auth, async (req, res) => {
  try {
    // Check if admin or the user themselves
    const User = require('../models/User');
    const currentUser = await User.findById(req.user._id);
    if (!currentUser || (currentUser.role !== 'admin' && req.params.userId !== req.user._id.toString())) {
      return res.status(403).json({ msg: 'Access denied' });
    }

    const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    const allItems = orders.flatMap((order) => order.items || []);
    const imageMap = await buildProductImageMap(allItems);

    const enrichedOrders = orders.map((order) => {
      const plain = order.toObject();
      plain.items = (plain.items || []).map((item) => ({
        ...item,
        image: normalizeItemImage(item, imageMap)
      }));
      return plain;
    });

    res.json(enrichedOrders);
  } catch (err) {
    console.error('Get user orders error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ CREATE ORDER (WITH WHATSAPP)
router.post('/', async (req, res) => {
  try {
    const { name, mobile, address, items, total, userId } = req.body;

    if (!name || !mobile || !address) {
      return res.status(400).json({ msg: 'All fields required' });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ msg: 'No items' });
    }

    const imageMap = await buildProductImageMap(items);
    const normalizedItems = items.map((item) => ({
      ...item,
      qty: Number(item.qty || item.quantity || 1),
      quantity: Number(item.quantity || item.qty || 1),
      image: normalizeItemImage(item, imageMap)
    }));

    const order = new Order({
      name,
      mobile,
      address,
      items: normalizedItems,
      total,
      userId: userId || null,
      status: 'pending'
    });

    await order.save();

    // Send WhatsApp message
    const itemsList = normalizedItems
      .map(item => `• ${item.name} x${item.qty || 1} - ₹${item.price}`)
      .join('\n');
    const whatsappMessage = `✨ *Order Confirmed Successfully*\n\nOrder ID: #${order._id.toString().slice(-6).toUpperCase()}\nCustomer: ${name}\nMobile: ${mobile}\nAddress: ${address}\n\nItems:\n${itemsList}\n\nTotal Paid: ₹${total}\nPayment Mode: Prepaid (Online)\n\nThank you for shopping with us. Your order is now being processed.`;
    
    // Send WhatsApp (non-blocking)
    sendWhatsAppMessage(mobile, whatsappMessage).catch(err => {
      console.error('WhatsApp send failed:', err);
    });

    res.json({ msg: 'Order placed successfully', order });

  } catch (err) {
    console.error('Order creation error:', err);
    res.status(500).json({ msg: 'Server error', error: err.message });
  }
});

// ✅ UPDATE ORDER STATUS (ADMIN ONLY)
router.put('/:orderId/status', auth, async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin only' });
    }

    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.orderId,
      { status, updatedAt: new Date() },
      { new: true }
    );

    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    // Send status update via WhatsApp
    const statusMessage = `📦 *Order Status Update*\n\nOrder #${order._id.toString().slice(-6).toUpperCase()}\nStatus: ${status.toUpperCase()}\n\nThank you for your patience! 🙏`;
    sendWhatsAppMessage(order.mobile, statusMessage).catch(err => {
      console.error('WhatsApp status update failed:', err);
    });

    res.json({ msg: 'Order status updated', order });
  } catch (err) {
    console.error('Update status error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ CANCEL ORDER (USER OR ADMIN)
router.put('/:orderId/cancel', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId);
    if (!order) {
      return res.status(404).json({ msg: 'Order not found' });
    }

    // Check if user owns this order or is admin
    const User = require('../models/User');
    const user = await User.findById(req.user._id);
    const isAdmin = user && user.role === 'admin';
    const isOwner = order.userId && order.userId.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ msg: 'Not authorized to cancel this order' });
    }

    // Can only cancel pending or processing orders
    if (order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({ msg: `Cannot cancel ${order.status} order` });
    }

    order.status = 'cancelled';
    order.updatedAt = new Date();
    await order.save();

    // Send cancellation WhatsApp
    const cancelMessage = `❌ *Order Cancelled*\n\nOrder #${order._id.toString().slice(-6).toUpperCase()}\nAmount: ₹${order.total}\n\nYour order has been cancelled. Contact us for refund details.\n\n📞 We're here to help! 💬`;
    sendWhatsAppMessage(order.mobile, cancelMessage).catch(err => {
      console.error('WhatsApp cancel notification failed:', err);
    });

    res.json({ msg: 'Order cancelled successfully', order });
  } catch (err) {
    console.error('Cancel order error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;