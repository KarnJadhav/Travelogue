const express = require('express');
const Review = require('../models/Review');
const Guide = require('../models/Guide');
const Booking = require('../models/Booking');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// Tourist posts a review (one per booking, only after accepting tour completion)
router.post('/', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const { guideId, bookingId, place, rating, comment, photo, report } = req.body;
    const userId = req.user.userId;
    
    // Validate required fields
    if (!bookingId || !guideId || !rating) {
      return res.status(400).json({ message: 'Missing required fields: bookingId, guideId, rating' });
    }
    
    // Check if booking exists and belongs to this tourist
    const booking = await Booking.findById(bookingId).populate('touristId guideId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    if (booking.touristId._id.toString() !== userId) {
      return res.status(403).json({ message: 'This booking does not belong to you' });
    }
    
    // Check if tour is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({ message: 'Tour must be completed to leave a review' });
    }
    
    // Check if review was requested and tourist accepted
    if (!booking.reviewRequestSent) {
      return res.status(400).json({ message: 'Review was not requested for this tour' });
    }
    
    if (booking.reviewRequestStatus !== 'accepted') {
      return res.status(400).json({ message: 'You must accept the review request to leave a review' });
    }
    
    // Check if review already exists for this booking
    const existing = await Review.findOne({ bookingId, userId });
    if (existing) {
      return res.status(400).json({ message: 'Review already exists for this booking.' });
    }
    
    // Create review (auto-approved)
    const review = new Review({ 
      userId, 
      guideId, 
      bookingId, 
      place: place || booking.destination,
      rating, 
      comment, 
      photo, 
      report, 
      status: 'approved' 
    });
    await review.save();
    
    // Mark review as submitted in booking
    booking.reviewSubmitted = true;
    await booking.save();

    const approvedReviews = await Review.find({
      guideId,
      status: 'approved',
      isHidden: false,
      isDeleted: false
    });
    const avgRating = approvedReviews.length > 0
      ? approvedReviews.reduce((sum, item) => sum + item.rating, 0) / approvedReviews.length
      : 0;
    await Guide.findOneAndUpdate(
      { userId: guideId },
      { ratings: Number(avgRating.toFixed(1)) }
    );

    res.status(201).json({ message: 'Review submitted successfully', review });
  } catch (err) {
    console.error('[REVIEW] Error posting review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete review (by owner or admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    // Only owner or admin can delete
    if (review.userId.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    await review.deleteOne();
    res.json({ message: 'Review deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Admin approves/rejects review
router.put('/:id/moderate', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }
    review.status = status;
    await review.save();
    // If approved, update guide's average rating
    if (status === 'approved') {
      const reviews = await Review.find({ guideId: review.guideId, status: 'approved' });
      const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
      await Guide.findOneAndUpdate({ userId: review.guideId }, { ratings: avgRating });
    }
    res.json({ message: `Review ${status}`, review });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Edit review (within 24h, only if pending)
router.put('/:id', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) return res.status(404).json({ message: 'Review not found' });
    if (review.userId.toString() !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });
    const now = new Date();
    const created = new Date(review.createdAt);
    if ((now - created) > 24 * 60 * 60 * 1000) return res.status(400).json({ message: 'Edit window expired' });
    const { rating, comment, photo, report } = req.body;
    review.rating = rating;
    review.comment = comment;
    review.photo = photo;
    review.report = report;
    await review.save();
    res.json({ message: 'Review updated', review });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Fetch all reviews for a guide (only approved and visible)
router.get('/guide/:id/reviews', async (req, res) => {
  try {
    const guideId = req.params.id;
    const reviews = await Review.find({ guideId, status: 'approved', isHidden: false, isDeleted: false })
      .populate('userId', 'name avatar')
      .sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Fetch all reviews by a user
router.get('/user/:id/reviews', verifyToken, async (req, res) => {
  try {
    if (req.user.userId !== req.params.id && req.user.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });
    const reviews = await Review.find({ userId: req.params.id });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Check if tourist can review a guide (booked + tour completed + accepted review request)
router.get('/can-review/:bookingId', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return res.status(404).json({ canReview: false, message: 'Booking not found' });
    }
    
    if (booking.touristId.toString() !== req.user.userId) {
      return res.status(403).json({ canReview: false, message: 'Not your booking' });
    }
    
    const canReview = booking.status === 'completed' && 
                      booking.reviewRequestSent && 
                      booking.reviewRequestStatus === 'accepted' &&
                      !booking.reviewSubmitted;
    
    res.json({ 
      canReview,
      booking: {
        status: booking.status,
        reviewRequestSent: booking.reviewRequestSent,
        reviewRequestStatus: booking.reviewRequestStatus,
        reviewSubmitted: booking.reviewSubmitted
      }
    });
  } catch (err) {
    res.status(500).json({ canReview: false, error: err.message });
  }
});

// Guide replies to a review
router.put('/:id/reply', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    
    // Check if guide owns this review (review is about their tours)
    if (review.guideId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Can only reply to reviews of your tours' });
    }
    
    const { guideReply } = req.body;
    if (!guideReply || !guideReply.trim()) {
      return res.status(400).json({ message: 'Reply cannot be empty' });
    }
    
    review.guideReply = guideReply.trim();
    review.guideReplyDate = new Date();
    await review.save();
    
    res.json({ message: 'Reply added successfully', review });
  } catch (err) {
    console.error('[REVIEW] Error adding reply:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
