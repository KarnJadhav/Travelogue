const express = require('express');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Get tourist profile
router.get('/:userId', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'tourist') return res.status(404).json({ error: 'Tourist not found' });
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      country: user.country,
      interests: user.interests,
      avatar: user.avatar
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update tourist profile
router.put('/:userId', verifyToken, async (req, res) => {
  try {
    const { name, email, phone, country, interests, avatar } = req.body;
    const update = { name, email, phone, country, interests, avatar };
    const user = await User.findOneAndUpdate(
      { _id: req.params.userId, role: 'tourist' },
      update,
      { new: true }
    );
    if (!user) return res.status(404).json({ error: 'Tourist not found' });
    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      country: user.country,
      interests: user.interests,
      avatar: user.avatar
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
