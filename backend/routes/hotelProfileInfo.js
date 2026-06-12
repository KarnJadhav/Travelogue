const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { verifyToken } = require("../middleware/auth");

// Get hotel profile (all editable fields)
router.get("/:userId", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user || user.role !== 'hotel') return res.status(404).json({ error: 'Hotel not found' });
    res.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address || '',
      amenities: user.amenities || [],
      images: user.hotelImages || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update hotel profile (all editable fields)
router.put("/:userId", verifyToken, async (req, res) => {
  try {
    const { name, email, phone, address, amenities } = req.body;
    // Always set address and amenities, even if empty
    const update = { name, email, phone, address, amenities };
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      update,
      { new: true, upsert: false }
    );
    res.json({
      name: user.name,
      email: user.email,
      phone: user.phone,
      address: user.address || '',
      amenities: user.amenities || [],
      images: user.hotelImages || []
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
