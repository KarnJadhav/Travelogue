const express = require('express');
const Guide = require('../models/Guide');
const Booking = require('../models/Booking');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { askGuide } = require('../controllers/guideAiController');

const router = express.Router();
const USER_PROFILE_FIELDS = 'name email phone country interests avatar role';

function toGuidePayload(guide) {
  const payload = guide.toObject();
  const user = payload.userId && typeof payload.userId === 'object' ? payload.userId : {};

  payload.name = user.name || payload.name || '';
  payload.email = user.email || payload.email || '';
  payload.phone = payload.phone || user.phone || '';
  payload.country = user.country || payload.country || '';
  payload.interests = user.interests || payload.interests || '';
  payload.avatar = user.avatar || payload.avatar || '';
  payload.currency = 'INR';

  return payload;
}

// Real-time virtual guide route (SSE streaming)
router.post('/ask', verifyToken, askGuide);

// Guide application route
router.post('/apply', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const { bio, languages, experienceYears } = req.body;
    const userId = req.user.userId;
    // Save guide profile with approved=false
    const guide = new Guide({
      userId,
      bio,
      languages,
      experienceYears,
      currency: 'INR',
      approved: false
    });
    await guide.save();
    // Simulate notification to admin (replace with actual notification logic)
    // e.g., send email, push notification, or create a DB entry
    console.log(`Admin notification: New guide application from user ${userId}`);
    res.status(201).json({ message: 'Guide application submitted. Awaiting admin approval.', guide });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get guide profile by userId (for dashboard)
router.get('/profile/:userId', async (req, res) => {
  try {
    const guide = await Guide.findOne({ userId: req.params.userId })
      .populate('userId', USER_PROFILE_FIELDS)
      .populate('travelogues')
      .populate('bookings');
    if (!guide) {
      return res.status(404).json({ message: 'Guide profile not found' });
    }
    const payload = toGuidePayload(guide);
    res.json({ guide: payload, user: payload.userId });
  } catch (err) {
    console.log('[DEBUG] Error in /profile/:userId:', err);
    if (err && err.stack) console.log(err.stack);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all approved guides (for tourists to explore)
router.get('/', async (req, res) => {
  try {
    const guides = await Guide.find({ approved: true }).populate('userId', USER_PROFILE_FIELDS);
    const payloads = guides.map(toGuidePayload);

    const guideUserIds = payloads
      .map((payload) => {
        const id = payload?.userId?._id || payload?.userId;
        return id ? String(id) : '';
      })
      .filter(Boolean);

    if (guideUserIds.length === 0) {
      return res.json({ guides: payloads });
    }

    const now = new Date();
    const busyStatuses = ['pending', 'confirmed', 'accepted'];

    // Active booking means the guide is currently on a booked time slot.
    const activeBookings = await Booking.find({
      guideId: { $in: guideUserIds },
      status: { $in: busyStatuses },
      startDateTime: { $lte: now },
      endDateTime: { $gt: now },
    }).select('guideId endDateTime');

    const activeByGuideId = new Map();

    activeBookings.forEach((booking) => {
      const guideId = String(booking.guideId || '');
      if (!guideId) return;
      const existing = activeByGuideId.get(guideId) || { count: 0, nextAvailableAt: null };
      existing.count += 1;

      const endAt = booking.endDateTime ? new Date(booking.endDateTime) : null;
      if (endAt && !Number.isNaN(endAt.getTime())) {
        if (!existing.nextAvailableAt || endAt < existing.nextAvailableAt) {
          existing.nextAvailableAt = endAt;
        }
      }

      activeByGuideId.set(guideId, existing);
    });

    const enriched = payloads.map((payload) => {
      const guideId = String(payload?.userId?._id || payload?.userId || '');
      const activeInfo = activeByGuideId.get(guideId);

      const isCurrentlyBooked = Boolean(activeInfo && activeInfo.count > 0);
      const nextAvailableAt = activeInfo?.nextAvailableAt ? activeInfo.nextAvailableAt.toISOString() : null;
      const manualAvailability = payload.isAvailable !== false;
      const isAvailableNow = !isCurrentlyBooked;

      let availabilityReason = 'available_now';
      if (!manualAvailability) availabilityReason = 'manual_offline';
      else if (!isAvailableNow) availabilityReason = 'booked_now';

      payload.isCurrentlyBooked = isCurrentlyBooked;
      payload.activeBookingCount = activeInfo?.count || 0;
      payload.nextAvailableAt = nextAvailableAt;
      payload.manualAvailability = manualAvailability;
      payload.isAvailableNow = isAvailableNow;

      // Guide is available only if profile is online and they are not in an active overlapping slot.
      payload.isAvailable = manualAvailability && isAvailableNow;
      payload.availabilityReason = availabilityReason;

      return payload;
    });

    res.json({
      guides: enriched
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
