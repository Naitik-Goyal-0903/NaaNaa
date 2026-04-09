const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Offer = require('../models/Offer');
const Product = require('../models/Product');

const isAdmin = async (userId) => {
  const user = await User.findById(userId).select('role');
  return !!user && user.role === 'admin';
};

router.get('/', async (req, res) => {
  try {
    const offers = await Offer.find({ active: true })
      .populate('buyProduct', 'name price image images category')
      .populate('getProduct', 'name price image images category')
      .sort({ createdAt: -1 })
      .lean();

    const normalized = offers.filter((offer) => offer.buyProduct && offer.getProduct);
    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.get('/admin', auth, async (req, res) => {
  try {
    if (!(await isAdmin(req.userId))) {
      return res.status(403).json({ msg: 'Admin only' });
    }

    const offers = await Offer.find()
      .populate('buyProduct', 'name price image images category')
      .populate('getProduct', 'name price image images category')
      .sort({ createdAt: -1 })
      .lean();

    const normalized = offers.filter((offer) => offer.buyProduct && offer.getProduct);
    res.json(normalized);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  try {
    if (!(await isAdmin(req.userId))) {
      return res.status(403).json({ msg: 'Admin only' });
    }

    const buyProductId = String(req.body.buyProductId || '').trim();
    const getProductId = String(req.body.getProductId || '').trim();
    const title = String(req.body.title || '').trim();
    const image = String(req.body.image || '').trim();

    if (!mongoose.Types.ObjectId.isValid(buyProductId) || !mongoose.Types.ObjectId.isValid(getProductId)) {
      return res.status(400).json({ msg: 'Invalid product selection' });
    }

    const [buyProduct, getProduct] = await Promise.all([
      Product.findById(buyProductId).select('_id'),
      Product.findById(getProductId).select('_id')
    ]);

    if (!buyProduct || !getProduct) {
      return res.status(404).json({ msg: 'Selected product not found' });
    }

    const offer = new Offer({
      title,
      type: 'BUY_X_GET_Y',
      image,
      buyProduct: buyProduct._id,
      getProduct: getProduct._id,
      active: true
    });

    await offer.save();

    const fullOffer = await Offer.findById(offer._id)
      .populate('buyProduct', 'name price image images category')
      .populate('getProduct', 'name price image images category')
      .lean();

    res.json({ msg: 'Offer created', offer: fullOffer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.put('/:id/toggle', auth, async (req, res) => {
  try {
    if (!(await isAdmin(req.userId))) {
      return res.status(403).json({ msg: 'Admin only' });
    }

    const offer = await Offer.findById(req.params.id);
    if (!offer) return res.status(404).json({ msg: 'Offer not found' });

    offer.active = !offer.active;
    await offer.save();

    res.json({ msg: 'Offer updated', active: offer.active });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    if (!(await isAdmin(req.userId))) {
      return res.status(403).json({ msg: 'Admin only' });
    }

    await Offer.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Offer deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
