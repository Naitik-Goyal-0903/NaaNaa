const express = require('express');
const router = express.Router();
const Template = require('../models/Template');
const auth = require('../middleware/auth');
const User = require('../models/User');

const MAX_TEMPLATE_MEDIA_BYTES = 12 * 1024 * 1024; // 12MB UTF-8 payload cap

const getUtf8Bytes = (value) => Buffer.byteLength(String(value || ''), 'utf8');

const validateTemplatePayload = ({ mediaUrl }) => {
  const mediaBytes = getUtf8Bytes(mediaUrl);
  if (mediaBytes > MAX_TEMPLATE_MEDIA_BYTES) {
    return {
      ok: false,
        msg: `Template media is too large (${Math.ceil(mediaBytes / (1024 * 1024))}MB). Max allowed is 12MB.`
    };
  }
  return { ok: true };
};

// ✅ GET ALL TEMPLATES
router.get('/', async (req, res) => {
  try {
    const templates = await Template.find().sort({ createdAt: -1 });
    res.json(templates);
  } catch (err) {
    console.error('Get templates error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ CREATE TEMPLATE (ADMIN ONLY)
router.post('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin only' });
    }

    const { badge, title, subtitle, buttonText, targetCategory, background, overlay, mediaUrl, mediaType } = req.body;
    const validation = validateTemplatePayload({ mediaUrl });
    if (!validation.ok) {
      return res.status(413).json({ msg: validation.msg });
    }
    
    const template = new Template({
      badge,
      title,
      subtitle,
      buttonText,
      targetCategory: targetCategory || 'All',
      background,
      overlay,
      mediaUrl: mediaUrl || '',
      mediaType: mediaType || ''
    });

    await template.save();
    res.json({ msg: 'Template created', template });
  } catch (err) {
    console.error('Create template error:', err);
    if (err && err.code === 'ERR_OUT_OF_RANGE') {
      return res.status(413).json({ msg: 'Template payload too large for database' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ UPDATE TEMPLATE (ADMIN ONLY)
router.put('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin only' });
    }

    const { badge, title, subtitle, buttonText, targetCategory, background, overlay, mediaUrl, mediaType } = req.body;
    const validation = validateTemplatePayload({ mediaUrl });
    if (!validation.ok) {
      return res.status(413).json({ msg: validation.msg });
    }

    const template = await Template.findByIdAndUpdate(
      req.params.id,
      { badge, title, subtitle, buttonText, targetCategory: targetCategory || 'All', background, overlay, mediaUrl: mediaUrl || '', mediaType: mediaType || '', updatedAt: new Date() },
      { new: true }
    );

    if (!template) {
      return res.status(404).json({ msg: 'Template not found' });
    }

    res.json({ msg: 'Template updated', template });
  } catch (err) {
    console.error('Update template error:', err);
    if (err && err.code === 'ERR_OUT_OF_RANGE') {
      return res.status(413).json({ msg: 'Template payload too large for database' });
    }
    res.status(500).json({ msg: 'Server error' });
  }
});

// ✅ DELETE TEMPLATE (ADMIN ONLY)
router.delete('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Admin only' });
    }

    await Template.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Template deleted' });
  } catch (err) {
    console.error('Delete template error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
