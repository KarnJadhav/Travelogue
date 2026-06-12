const express = require('express');
const HotelReview = require('../models/HotelReview');
const Hotel = require('../models/Hotel');
const contentModeration = require('../services/contentModerationService');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

const buildSearchFilter = async (search) => {
  if (!search) return null;
  const hotelMatches = await Hotel.find({ name: { $regex: search, $options: 'i' } }).select('_id');
  const hotelIds = hotelMatches.map(h => h._id);
  const or = [{ comment: { $regex: search, $options: 'i' } }];
  if (hotelIds.length > 0) {
    or.push({ hotelId: { $in: hotelIds } });
  }
  return { $or: or };
};

/**
 * GET /adminHotelReview/all-reviews
 * Fetch all hotel reviews with optional filtering
 * Query params: status, hidden, flagged, hotelId, search
 */
router.get('/all-reviews', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { status, hidden, flagged, hotelId, search, page = 1, limit = 20 } = req.query;

    let filter = {};
    if (status) filter.status = status;
    if (hidden === 'true') filter.isHidden = true;
    if (hidden === 'false') filter.isHidden = false;
    if (flagged === 'true') filter['aiModeration.isFlagged'] = true;
    if (flagged === 'false') filter['aiModeration.isFlagged'] = false;
    if (hotelId) filter.hotelId = hotelId;

    const searchFilter = await buildSearchFilter(search);
    if (searchFilter) {
      filter = { ...filter, ...searchFilter };
    }

    const skip = (page - 1) * limit;
    const [reviews, total] = await Promise.all([
      HotelReview.find(filter)
        .populate('touristId', 'name email avatar')
        .populate('hotelId', 'name address city')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit, 10)),
      HotelReview.countDocuments(filter)
    ]);

    res.json({
      reviews,
      pagination: {
        current: parseInt(page, 10),
        total: Math.ceil(total / limit),
        limit: parseInt(limit, 10),
        count: total
      }
    });
  } catch (err) {
    console.error('[ADMIN HOTEL REVIEW] Error fetching reviews:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /adminHotelReview/scan-review/:id
 * AI scan a single hotel review for inappropriate content
 */
router.post('/scan-review/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const review = await HotelReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    const analysis = await contentModeration.analyzeContentWithAI(review.comment || '');

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
    console.error('[ADMIN HOTEL REVIEW] Error scanning review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /adminHotelReview/scan-all
 * AI scan all hotel reviews for inappropriate content
 */
router.post('/scan-all', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { hotelId, status } = req.query;

    let filter = {};
    if (hotelId) filter.hotelId = hotelId;
    if (status) filter.status = status;

    const reviews = await HotelReview.find(filter);

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
    console.error('[ADMIN HOTEL REVIEW] Error scanning all reviews:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /adminHotelReview/hide/:id
 */
router.put('/hide/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { reason, notes } = req.body;
    const review = await HotelReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isHidden = true;
    review.hiddenReason = reason || 'Admin moderation';
    review.adminNotes = notes || '';
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({ message: 'Review hidden successfully', review });
  } catch (err) {
    console.error('[ADMIN HOTEL REVIEW] Error hiding review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /adminHotelReview/unhide/:id
 */
router.put('/unhide/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const review = await HotelReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isHidden = false;
    review.hiddenReason = '';
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({ message: 'Review unhidden successfully', review });
  } catch (err) {
    console.error('[ADMIN HOTEL REVIEW] Error unhiding review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * DELETE /adminHotelReview/delete/:id
 */
router.delete('/delete/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { reason, notes } = req.body;
    const review = await HotelReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isDeleted = true;
    review.deletedReason = reason || 'Admin deletion';
    review.adminNotes = notes || '';
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({ message: 'Review deleted successfully', review });
  } catch (err) {
    console.error('[ADMIN HOTEL REVIEW] Error deleting review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /adminHotelReview/restore/:id
 */
router.put('/restore/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const review = await HotelReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.isDeleted = false;
    review.deletedReason = '';
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({ message: 'Review restored successfully', review });
  } catch (err) {
    console.error('[ADMIN HOTEL REVIEW] Error restoring review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /adminHotelReview/flag/:id
 */
router.put('/flag/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { reason, notes } = req.body;
    const review = await HotelReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.aiModeration = review.aiModeration || {};
    review.aiModeration.isFlagged = true;
    review.aiModeration.reason = reason || 'manual';
    review.aiModeration.checkedAt = new Date();
    review.adminNotes = notes || '';
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({ message: 'Review flagged successfully', review });
  } catch (err) {
    console.error('[ADMIN HOTEL REVIEW] Error flagging review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * PUT /adminHotelReview/unflag/:id
 */
router.put('/unflag/:id', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const review = await HotelReview.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    review.aiModeration = review.aiModeration || {};
    review.aiModeration.isFlagged = false;
    review.aiModeration.reason = null;
    review.moderatedBy = req.user.userId;
    review.moderatedAt = new Date();

    await review.save();

    res.json({ message: 'Review unflagged successfully', review });
  } catch (err) {
    console.error('[ADMIN HOTEL REVIEW] Error unflagging review:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * GET /adminHotelReview/stats
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
      HotelReview.countDocuments({}),
      HotelReview.countDocuments({ isHidden: true }),
      HotelReview.countDocuments({ isDeleted: true }),
      HotelReview.countDocuments({ 'aiModeration.isFlagged': true }),
      HotelReview.countDocuments({ status: 'pending' }),
      HotelReview.countDocuments({ status: 'approved' }),
      HotelReview.countDocuments({ status: 'rejected' })
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
    console.error('[ADMIN HOTEL REVIEW] Error fetching stats:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /adminHotelReview/bulk-action
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

    const result = await HotelReview.updateMany(
      { _id: { $in: reviewIds } },
      { $set: update }
    );

    res.json({ message, updated: result.modifiedCount || 0 });
  } catch (err) {
    console.error('[ADMIN HOTEL REVIEW] Error running bulk action:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

/**
 * POST /adminHotelReview/bulk-delete
 */
router.post('/bulk-delete', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { reviewIds, reason } = req.body;
    if (!Array.isArray(reviewIds) || reviewIds.length === 0) {
      return res.status(400).json({ message: 'reviewIds are required' });
    }

    const now = new Date();
    const result = await HotelReview.updateMany(
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
    console.error('[ADMIN HOTEL REVIEW] Error bulk deleting reviews:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
