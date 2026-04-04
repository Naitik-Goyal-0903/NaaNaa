const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth');

// GET USER WISHLIST
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('wishlist');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user.wishlist || []);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD TO WISHLIST
router.post('/add/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if product already in wishlist
    if (user.wishlist && user.wishlist.some(id => String(id) === String(productId))) {
      return res.status(400).json({ message: 'Product already in wishlist' });
    }

    // Add to wishlist
    if (!user.wishlist) {
      user.wishlist = [];
    }
    user.wishlist.push(productId);
    user.updatedAt = Date.now();

    await user.save();
    res.json({ message: 'Added to wishlist', wishlist: user.wishlist });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// REMOVE FROM WISHLIST
router.delete('/remove/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove from wishlist
    if (user.wishlist) {
      user.wishlist = user.wishlist.filter(id => String(id) !== String(productId));
      user.updatedAt = Date.now();
      await user.save();
    }

    res.json({ message: 'Removed from wishlist', wishlist: user.wishlist });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// TOGGLE WISHLIST (Add if not exists, remove if exists)
router.post('/toggle/:productId', auth, async (req, res) => {
  try {
    const { productId } = req.params;
    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.wishlist) {
      user.wishlist = [];
    }

    const index = user.wishlist.findIndex(id => String(id) === String(productId));
    let action = '';

    if (index > -1) {
      // Remove from wishlist
      user.wishlist.splice(index, 1);
      action = 'removed';
    } else {
      // Add to wishlist
      user.wishlist.push(productId);
      action = 'added';
    }

    user.updatedAt = Date.now();
    await user.save();

    res.json({
      message: `Product ${action} from wishlist`,
      action: action,
      wishlist: user.wishlist
    });
  } catch (error) {
    console.error('Toggle wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;