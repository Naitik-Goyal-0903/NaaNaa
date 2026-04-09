const mongoose = require('mongoose');

const OfferSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  type: { type: String, enum: ['BUY_X_GET_Y'], default: 'BUY_X_GET_Y' },
  image: { type: String, default: '' },
  buyProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  getProduct: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Offer', OfferSchema);
