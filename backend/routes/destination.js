const express = require('express');
const Destination = require('../models/Destination');

const router = express.Router();

// GET /api/destinations
router.get('/destinations', async (req, res) => {
  try {
    const destinations = await Destination.find({});
    res.json(destinations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
