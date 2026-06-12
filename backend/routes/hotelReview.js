const express = require('express');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const Hotel = require('../models/Hotel');
const HotelBooking = require('../models/HotelBooking');
const HotelReview = require('../models/HotelReview');

const router = express.Router();

// Tourist creates a hotel review (only after completed stay)
router.post('/', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const { hotelId, bookingId, rating, comment } = req.body;
    if (!hotelId || !bookingId || !rating || !comment) {
      return res.status(400).json({ message: 'hotelId, bookingId, rating, and comment are required.' });
    }
    const booking = await HotelBooking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    if (booking.touristId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    if (booking.hotelId.toString() !== hotelId) {
      return res.status(400).json({ message: 'Booking does not match this hotel.' });
    }
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Stay must be completed before leaving a review.' });
    }
    const existing = await HotelReview.findOne({ bookingId, touristId: req.user.userId });
    if (existing) {
      return res.status(400).json({ message: 'Review already exists for this booking.' });
    }
    const review = await HotelReview.create({
      touristId: req.user.userId,
      hotelId,
      bookingId,
      rating,
      comment,
    });
    const populated = await review.populate('touristId', 'name avatar');
    try {
      const hotel = await Hotel.findById(hotelId).select('user');
      const setupSocket = require('../socket/chat');
      const io = setupSocket.ioInstance;
      if (io && hotel?.user) {
        io.to(`hotel_${hotel.user.toString()}`).emit('hotelReviewUpdate', {
          hotelId,
          review: populated
        });
      }
    } catch (e) {
      console.log('[DEBUG] Socket emit error (hotel review):', e);
    }
    res.status(201).json({ review: populated });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Public: fetch reviews for a hotel
router.get('/hotel/:hotelId', async (req, res) => {
  try {
    const { hotelId } = req.params;
    const reviews = await HotelReview.find({ hotelId, status: 'approved', isHidden: false, isDeleted: false })
      .populate('touristId', 'name avatar')
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Hotel owner fetches reviews for their hotel
router.get('/owner', verifyToken, authorizeRoles('hotel'), async (req, res) => {
  try {
    const hotel = await Hotel.findOne({ user: req.user.userId });
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found.' });
    }
    const reviews = await HotelReview.find({ hotelId: hotel._id, status: 'approved', isHidden: false, isDeleted: false })
      .populate('touristId', 'name avatar')
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
