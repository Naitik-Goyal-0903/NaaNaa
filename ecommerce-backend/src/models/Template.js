const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
  badge: String,
  title: String,
  subtitle: String,
  buttonText: String,
  targetCategory: { type: String, default: 'All' },
  background: String,
  overlay: String,
  mediaUrl: { type: String, default: '' },
  mediaType: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Template', TemplateSchema);
