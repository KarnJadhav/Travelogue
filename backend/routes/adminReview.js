const express = require('express');
const Review = require('../models/Review');
const User = require('../models/User');
const Guide = require('../models/Guide');
const contentModeration = require('../services/contentModerationService');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /adminReview/all-reviews
 * Fetch all reviews with optional filtering
 * Query params: status (pending, approved, rejected), hidden, flagged, guideId, search
 */
router.get('/all-reviews', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status, hidden, flagged, guideId, search, page = 1, limit = 20 } = req.query;
    
    let filter = {};
    
    if (status) filter.status = status;
    if (hidden === 'true') filter.isHidden = true;
    if (hidden === 'false') filter.isHidden = false;
    if (flagged === 'true') filter['aiModeration.isFlagged'] = true;
    if (flagged === 'false') filter['aiModeration.isFlagged'] = false;
    if (guideId) filter.guideId = guideId;
    if (search) {
      filter.$or = [
        { place: { $regex: search, $options: 'i' } },
        { comment: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;
    
    const [reviews, total] = await Promise.all([
      Review.find(filter)
        .populate('userId', 'name email avatar')
        .populate('guideId', 'name avatar email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Review.countDocuments(filter)
    ]);

    res.json({
      reviews,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / limit),
        limit: parseInt(limit),
        count: total
      }
    });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error fetching reviews:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /adminReview/scan-review/:id
 * AI scan a single review for inappropriate content
 */
router.post('/scan-review/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Analyze the review comment using AI moderation service
    const analysis = await contentModeration.analyzeContentWithAI(review.comment || '');

    // Update review with moderation results
    review.aiModeration = {
      isFlagged: analysis.isFlagged,
      reason: analysis.reason || null,
      flaggedWords: analysis.flaggedWords || [],
      confidence: analysis.confidence || 0,
      checkedAt: new Date()
    };

    await review.save();

    res.json({
      message: 'Review scanned successfully',
      review,
      analysis
    });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error scanning review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /adminReview/scan-all
 * AI scan all reviews for inappropriate content
 * Query param: guideId (optional), status (optional)
 */
router.post('/scan-all', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { guideId, status } = req.query;
    
    let filter = {};
    if (guideId) filter.guideId = guideId;
    if (status) filter.status = status;

    const reviews = await Review.find(filter);

    if (reviews.length === 0) {
      return res.json({
        message: 'No reviews to scan',
        scanned: 0,
        flagged: 0,
        results: []
      });
    }

    let flaggedCount = 0;
    const results = [];

    for (const review of reviews) {
      const analysis = await contentModeration.analyzeContentWithAI(review.comment || '');
      
      review.aiModeration = {
        isFlagged: analysis.isFlagged,
        reason: analysis.reason || null,
        flaggedWords: analysis.flaggedWords || [],
        confidence: analysis.confidence || 0,
        checkedAt: new Date()
      };

      if (analysis.isFlagged) {
        flaggedCount++;
      }

      await review.save();
      
      results.push({
        reviewId: review._id,
        place: review.place,
        isFlagged: analysis.isFlagged,
        reason: analysis.reason,
        confidence: analysis.confidence,
        flaggedWords: analysis.flaggedWords
      });
    }

    res.json({
      message: `Scanned ${reviews.length} reviews`,
      scanned: reviews.length,
      flagged: flaggedCount,
      results
    });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error scanning all reviews:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /adminReview/hide/:id
 * Hide a review (make it invisible to public)
 */
router.put('/hide/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { reason, notes } = req.body;

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isHidden = true;
    review.hiddenReason = reason || 'Admin moderation';
    review.adminNotes = notes || '';
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({
      message: 'Review hidden successfully',
      review
    });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error hiding review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /adminReview/unhide/:id
 * Unhide a review (make it visible)
 */
router.put('/unhide/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isHidden = false;
    review.hiddenReason = '';
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({
      message: 'Review unhidden successfully',
      review
    });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error unhiding review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * DELETE /adminReview/delete/:id
 * Permanently delete a review
 */
router.delete('/delete/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { reason, notes } = req.body;

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Soft delete - mark as deleted instead of removing from database
    review.isDeleted = true;
    review.deletedReason = reason || 'Admin deletion';
    review.adminNotes = notes || '';
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({
      message: 'Review deleted successfully',
      review
    });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error deleting review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /adminReview/restore/:id
 * Restore a deleted review
 */
router.put('/restore/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isDeleted = false;
    review.deletedReason = '';
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({
      message: 'Review restored successfully',
      review
    });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error restoring review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /adminReview/flag/:id
 * Manually flag a review for further review
 */
router.put('/flag/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { reason, notes } = req.body;

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.aiModeration.isFlagged = true;
    review.aiModeration.reason = reason || 'manual';
    review.aiModeration.checkedAt = new Date();
    review.adminNotes = notes || '';
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({
      message: 'Review flagged successfully',
      review
    });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error flagging review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /adminReview/unflag/:id
 * Remove flag from a review
 */
router.put('/unflag/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.aiModeration.isFlagged = false;
    review.aiModeration.reason = null;
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({
      message: 'Review unflagged successfully',
      review
    });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error unflagging review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * GET /adminReview/stats
 * Get review moderation statistics
 */
router.get('/stats', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [
      totalReviews,
      hiddenReviews,
      deletedReviews,
      flaggedReviews,
      pendingReviews,
      approvedReviews,
      rejectedReviews
    ] = await Promise.all([
      Review.countDocuments({}),
      Review.countDocuments({ isHidden: true }),
      Review.countDocuments({ isDeleted: true }),
      Review.countDocuments({ 'aiModeration.isFlagged': true }),
      Review.countDocuments({ status: 'pending' }),
      Review.countDocuments({ status: 'approved' }),
      Review.countDocuments({ status: 'rejected' })
    ]);

    res.json({
      totalReviews,
      hiddenReviews,
      deletedReviews,
      flaggedReviews,
      pendingReviews,
      approvedReviews,
      rejectedReviews,
      visibleReviews: totalReviews - hiddenReviews - deletedReviews
    });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error fetching stats:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

const updateGuideRatings = async (guideIds) => {
  if (!guideIds || guideIds.length === 0) return;
  const uniqueGuideIds = Array.from(new Set(guideIds.map(id => id.toString())));
  for (const guideId of uniqueGuideIds) {
    const reviews = await Review.find({ guideId, status: 'approved', isHidden: false, isDeleted: false });
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;
    await Guide.findOneAndUpdate({ userId: guideId }, { ratings: avgRating });
  }
};

/**
 * POST /adminReview/bulk-action
 * Bulk actions: approve, reject, hide, unhide, flag, unflag
 */
router.post('/bulk-action', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { reviewIds, action } = req.body;
    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({ message: 'reviewIds are required' });
    }

    const now = new Date();
    let update = null;
    let message = 'Reviews updated';

    switch (action) {
      case 'approve':
        update = { status: 'approved', moderatedBy: req.user.userId, moderatedAt: now };
        message = 'Reviews approved';
        break;
      case 'reject':
        update = { status: 'rejected', moderatedBy: req.user.userId, moderatedAt: now };
        message = 'Reviews rejected';
        break;
      case 'hide':
        update = { isHidden: true, hiddenReason: 'Bulk moderation', moderatedBy: req.user.userId, moderatedAt: now };
        message = 'Reviews hidden';
        break;
      case 'unhide':
        update = { isHidden: false, hiddenReason: '', moderatedBy: req.user.userId, moderatedAt: now };
        message = 'Reviews unhidden';
        break;
      case 'flag':
        update = {
          'aiModeration.isFlagged': true,
          'aiModeration.reason': 'manual',
          'aiModeration.checkedAt': now,
          moderatedBy: req.user.userId,
          moderatedAt: now
        };
        message = 'Reviews flagged';
        break;
      case 'unflag':
        update = {
          'aiModeration.isFlagged': false,
          'aiModeration.reason': null,
          moderatedBy: req.user.userId,
          moderatedAt: now
        };
        message = 'Reviews unflagged';
        break;
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    const result = await Review.updateMany(
      { _id: { $in: reviewIds } },
      { $set: update }
    );

    if (action === 'approve') {
      const reviews = await Review.find({ _id: { $in: reviewIds } }).select('guideId');
      const guideIds = reviews.map(r => r.guideId).filter(Boolean);
      await updateGuideRatings(guideIds);
    }

    res.json({ message, updated: result.modifiedCount || 0 });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error running bulk action:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /adminReview/bulk-delete
 */
router.post('/bulk-delete', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { reviewIds, reason } = req.body;
    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({ message: 'reviewIds are required' });
    }

    const now = new Date();
    const result = await Review.updateMany(
      { _id: { $in: reviewIds } },
      {
        $set: {
          isDeleted: true,
          deletedReason: reason || 'Bulk deletion',
          moderatedBy: req.user.userId,
          moderatedAt: now
        }
      }
    );

    res.json({ message: 'Reviews deleted', updated: result.modifiedCount || 0 });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error bulk deleting reviews:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * GET /adminReview/guide/:guideId/reviews
 * Get all reviews for a specific guide with moderation info
 */
router.get('/guide/:guideId/reviews', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { guideId } = req.params;
    const { includeHidden = false, includeFlagged = false } = req.query;

    let filter = { guideId };
    
    if (includeHidden !== 'true') {
      filter.isHidden = false;
    }
    
    if (includeFlagged === 'true') {
      filter['aiModeration.isFlagged'] = true;
    }

    const reviews = await Review.find(filter)
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 });

    const stats = {
      total: reviews.length,
      flagged: reviews.filter(r => r.aiModeration?.isFlagged).length,
      hidden: reviews.filter(r => r.isHidden).length,
      deleted: reviews.filter(r => r.isDeleted).length,
      avgRating: reviews.length > 0 ? 
        (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(2) : 0
    };

    res.json({
      reviews,
      stats
    });
  } catch (err) {
    console.error('[ADMIN REVIEW] Error fetching guide reviews:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
