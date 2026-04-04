const mongoose = require('mongoose');

const OrderSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.Mixed,
  name: { type: String, required: true },
  mobile: { type: String, required: true },
  address: { type: String, required: true },
  items: [{
    productId: mongoose.Schema.Types.Mixed,
    name: String,
    price: Number,
    qty: { type: Number, default: 1 },
    quantity: { type: Number, default: 1 },
    image: { type: String, default: '' }
  }],
  total: { type: Number, required: true },
  status: { type: String, default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Order', OrderSchema);