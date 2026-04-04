const mongoose = require('mongoose');

const ProductReviewSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  userName: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true });

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String, default: '' },
  category: { type: String, default: "Women's" },
  price: { type: Number, required: true },
  originalPrice: { type: Number, default: 0 },
  rating: { type: Number, default: 4.5 },
  reviews: { type: Number, default: 0 },
  badge: { type: String, default: '' },
  description: { type: String, default: '' },
  image: { type: String, default: '' },
  images: { type: [String], default: [] },
  stock: { type: Number, default: 0 },
  sizes: { type: [String], default: [] },
  colors: { type: [String], default: [] },
  tags: { type: [String], default: [] },
  reviewList: { type: [ProductReviewSchema], default: [] },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Product', ProductSchema);
