const express = require('express');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Tourist booking history
router.get('/tourist/history', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const bookings = await Booking.find({ touristId: req.user.userId })
      .populate('guideId', 'name email avatar')
      .select('status date guideId messages');
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Guide booking history
router.get('/guide/history', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const bookings = await Booking.find({ guideId: req.user.userId })
      .populate('touristId', 'name email avatar')
      .select('status date touristId messages');
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
