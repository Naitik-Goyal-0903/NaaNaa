const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const Product = require('../models/Product');
const User = require('../models/User');

const MAX_MEDIA_BYTES_PER_ITEM = 4 * 1024 * 1024; // 4MB per image/video string
const MAX_MEDIA_TOTAL_BYTES = 8 * 1024 * 1024; // 8MB total for image + images[]
const MAX_LIST_IMAGE_CHARS = 800000; // allow typical uploaded cover photos in list cards

const normalizeSizes = (sizes) => {
  if (!Array.isArray(sizes)) return [];
  return [...new Set(sizes.map((size) => String(size || '').trim()).filter(Boolean))];
};

const toNumericRating = (value) => {
  const n = Number(value);
  if (Number.isNaN(n)) return null;
  return Math.max(1, Math.min(5, n));
};

const sanitizeReviewList = (list) => {
  if (!Array.isArray(list)) return [];

  return list
    .map((review) => {
      const userId = review?.userId;
      const userIdString = typeof userId === 'object' && userId !== null && userId.toString
        ? userId.toString()
        : String(userId || '').trim();

      if (!mongoose.Types.ObjectId.isValid(userIdString)) {
        return null;
      }

      const rating = toNumericRating(review?.rating);
      const comment = String(review?.comment || '').trim();
      if (!rating || !comment) {
        return null;
      }

      return {
        _id: review?._id,
        userId: userIdString,
        userName: String(review?.userName || 'Customer').trim() || 'Customer',
        rating,
        comment,
        createdAt: review?.createdAt || new Date(),
        updatedAt: review?.updatedAt || review?.createdAt || new Date()
      };
    })
    .filter(Boolean);
};

const getUtf8Bytes = (value) => Buffer.byteLength(String(value || ''), 'utf8');

const getListSafeImage = (value) => {
  const str = String(value || '');
  if (!str) return '';
  // Keep list payload guarded by max chars while still allowing real stored cover images.
  if (str.length > MAX_LIST_IMAGE_CHARS) return '';
  return str;
};

const validateProductMediaPayload = ({ image, images }) => {
  const mediaItems = [];
  if (image) mediaItems.push(String(image));
  if (Array.isArray(images)) {
    for (const media of images) {
      if (media) mediaItems.push(String(media));
    }
  }

  let totalBytes = 0;
  for (const media of mediaItems) {
    const size = getUtf8Bytes(media);
    totalBytes += size;
    if (size > MAX_MEDIA_BYTES_PER_ITEM) {
      return { ok: false, msg: 'Single product media file is too large (max 4MB)' };
    }
  }

  if (totalBytes > MAX_MEDIA_TOTAL_BYTES) {
    return { ok: false, msg: 'Total product media payload is too large (max 8MB)' };
  }

  return { ok: true };
};

const recalculateProductRating = (product) => {
  const list = Array.isArray(product.reviewList) ? product.reviewList : [];
  if (!list.length) {
    product.rating = 0;
    product.reviews = 0;
    return;
  }

  const total = list.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  const avg = total / list.length;
  product.rating = Math.round(avg * 10) / 10;
  product.reviews = list.length;
};

// list all products
router.get('/', async (req, res) => {
  try {
    const items = await Product.find()
      .select('name brand category price originalPrice rating reviews badge description image images stock sizes colors tags createdAt')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    const normalizedItems = items.map((item) => {
      const rawCoverImage = item.image || (Array.isArray(item.images) && item.images.length ? item.images[0] : '');
      const coverImage = getListSafeImage(rawCoverImage);
      return {
        _id: item._id,
        name: item.name,
        brand: item.brand,
        category: item.category,
        price: item.price,
        originalPrice: item.originalPrice,
        rating: item.rating,
        reviews: item.reviews,
        badge: item.badge,
        description: item.description,
        image: coverImage,
        // Keep just cover image in list payload. Full media loads from /api/products/:id.
        images: coverImage ? [coverImage] : [],
        stock: item.stock,
        sizes: String(item.category || '').toLowerCase() === 'accessories' ? [] : (Array.isArray(item.sizes) ? item.sizes : []),
        colors: Array.isArray(item.colors) ? item.colors : [],
        tags: Array.isArray(item.tags) ? item.tags : [],
        createdAt: item.createdAt
      };
    });
    res.json(normalizedItems);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// get single product
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid product id' });
    }

    const product = await Product.findById(req.params.id).lean();
    if (!product) return res.status(404).json({ msg: 'Product not found' });
    product.reviewList = sanitizeReviewList(product.reviewList);
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// create product (admin only)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

    const {
      name,
      brand,
      category,
      price,
      originalPrice,
      badge,
      description,
      image,
      images,
      stock,
      sizes,
      colors,
      tags
    } = req.body;
    if (!name || !price) return res.status(400).json({ msg: 'Missing name or price' });

    const normalizedCategory = String(category || "Women's");
    const normalizedImages = Array.isArray(images) ? images : (image ? [image] : []);
    const mediaValidation = validateProductMediaPayload({ image, images: normalizedImages });
    if (!mediaValidation.ok) {
      return res.status(413).json({ msg: mediaValidation.msg });
    }

    const product = new Product({
      name,
      brand: brand || '',
      category: normalizedCategory,
      price,
      originalPrice: originalPrice || price,
      rating: 0,
      reviews: 0,
      badge: badge || '',
      description: description || '',
      image: image || '',
      images: normalizedImages,
      stock: stock || 0,
      sizes: normalizedCategory.toLowerCase() === 'accessories' ? [] : normalizeSizes(sizes),
      colors: Array.isArray(colors) ? colors : [],
      tags: Array.isArray(tags) ? tags : []
    });
    await product.save();
    res.json({ msg: 'Product created', product });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ERR_OUT_OF_RANGE') {
      return res.status(413).json({ msg: 'Product payload too large for database' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// update product (admin only)
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });

    const {
      name,
      brand,
      category,
      price,
      originalPrice,
      badge,
      description,
      image,
      images,
      stock,
      sizes,
      colors,
      tags
    } = req.body;

    const normalizedCategory = category !== undefined ? String(category || '').trim() : undefined;
    const normalizedImages = Array.isArray(images) ? images : (image ? [image] : []);
    const mediaValidation = validateProductMediaPayload({ image, images: normalizedImages });
    if (!mediaValidation.ok) {
      return res.status(413).json({ msg: mediaValidation.msg });
    }

    const updatePayload = {
      name,
      brand,
      category,
      price,
      originalPrice,
      badge,
      description,
      image,
      images: normalizedImages,
      stock,
      sizes: Array.isArray(sizes)
        ? ((normalizedCategory || '').toLowerCase() === 'accessories' ? [] : normalizeSizes(sizes))
        : (((normalizedCategory || '').toLowerCase() === 'accessories') ? [] : undefined),
      colors,
      tags
    };

    Object.keys(updatePayload).forEach((key) => updatePayload[key] === undefined && delete updatePayload[key]);

    const product = await Product.findByIdAndUpdate(req.params.id, updatePayload, { new: true });
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    res.json({ msg: 'Product updated', product });
  } catch (err) {
    console.error(err);
    if (err && err.code === 'ERR_OUT_OF_RANGE') {
      return res.status(413).json({ msg: 'Product payload too large for database' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// get product reviews
router.get('/:id/reviews', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid product id' });
    }

    const product = await Product.findById(req.params.id).select('reviewList rating reviews').lean();
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    const cleanedReviewList = sanitizeReviewList(product.reviewList);
    const sorted = [...cleanedReviewList].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    res.json({
      rating: cleanedReviewList.length ? (Math.round((cleanedReviewList.reduce((sum, r) => sum + Number(r.rating || 0), 0) / cleanedReviewList.length) * 10) / 10) : 0,
      reviews: cleanedReviewList.length,
      reviewList: sorted
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// add/update a review by customer (non-admin)
router.post('/:id/reviews', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('username role');
    if (!user) return res.status(401).json({ msg: 'Invalid user' });
    if (user.role === 'admin') return res.status(403).json({ msg: 'Admins cannot submit product reviews' });

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid product id' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    product.reviewList = sanitizeReviewList(product.reviewList);

    const rating = toNumericRating(req.body.rating);
    const comment = String(req.body.comment || '').trim();

    if (!rating) return res.status(400).json({ msg: 'Rating must be between 1 and 5' });
    if (!comment) return res.status(400).json({ msg: 'Review comment is required' });

    const existingIndex = (product.reviewList || []).findIndex((r) => String(r.userId) === String(user._id));
    if (existingIndex >= 0) {
      product.reviewList[existingIndex].rating = rating;
      product.reviewList[existingIndex].comment = comment;
      product.reviewList[existingIndex].updatedAt = new Date();
      product.reviewList[existingIndex].userName = user.username || 'Customer';
    } else {
      product.reviewList.push({
        userId: user._id,
        userName: user.username || 'Customer',
        rating,
        comment,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    recalculateProductRating(product);
    await product.save();

    const sorted = [...product.reviewList].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    res.json({
      msg: existingIndex >= 0 ? 'Review updated' : 'Review added',
      rating: product.rating,
      reviews: product.reviews,
      reviewList: sorted
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// delete own review (customer) or any review (admin)
router.delete('/:id/reviews/:reviewId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user) return res.status(401).json({ msg: 'Invalid user' });

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ msg: 'Invalid product id' });
    }

    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ msg: 'Product not found' });

    product.reviewList = sanitizeReviewList(product.reviewList);

    const reviewId = String(req.params.reviewId || '');
    const reviewIndex = (product.reviewList || []).findIndex((r) => String(r._id) === reviewId);
    if (reviewIndex < 0) return res.status(404).json({ msg: 'Review not found' });

    const review = product.reviewList[reviewIndex];
    const isOwner = String(review.userId) === String(req.userId);
    if (!isOwner && user.role !== 'admin') {
      return res.status(403).json({ msg: 'Not allowed to delete this review' });
    }

    product.reviewList.splice(reviewIndex, 1);
    recalculateProductRating(product);
    await product.save();

    const sorted = [...product.reviewList].sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
    res.json({
      msg: 'Review deleted',
      rating: product.rating,
      reviews: product.reviews,
      reviewList: sorted
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// delete product (admin only)
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') return res.status(403).json({ msg: 'Admin only' });
    
    await Product.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
