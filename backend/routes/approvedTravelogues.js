const express = require('express');
const Travelogue = require('../models/Travelogue');
const User = require('../models/User');

const router = express.Router();

// Fetch approved travelogues with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, location, guideId } = req.query;
    const filter = { status: 'approved' };
    if (location) filter.location = location;
    if (guideId) filter.guideId = guideId;
    const travelogues = await Travelogue.find(filter)
      .populate('guideId', 'name email avatar')
      .select('images title description location guideId')
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await Travelogue.countDocuments(filter);
    res.json({
      travelogues,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
      total
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
