// notifications.js
const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const Booking = require('../models/Booking');
const User = require('../models/User');

// In-memory notifications store for demo (replace with DB in production)
const notifications = [];

// Guide triggers a tour completion notification for a tourist
router.post('/guide/complete-tour', verifyToken, async (req, res) => {
  try {
    const { bookingId, message } = req.body;
    console.log('[NOTIFICATIONS] Guide sending tour completion notification:', { bookingId, message });
    
    const booking = await Booking.findById(bookingId).populate('touristId guideId');
    if (!booking) {
      console.log('[NOTIFICATIONS] Booking not found:', bookingId);
      return res.status(404).json({ error: 'Booking not found' });
    }
    
    console.log('[NOTIFICATIONS] Booking found:', {
      _id: booking._id,
      touristId: booking.touristId._id.toString(),
      guideName: booking.guideId.name,
      destination: booking.destination
    });
    
    // Add notification for the tourist
    const notification = {
      id: `${Date.now()}_${bookingId}`,
      touristId: booking.touristId._id.toString(),
      guideName: booking.guideId.name,
      tourName: booking.destination,
      message: message || 'Tour is completed. Please confirm and leave a review.',
      bookingId: bookingId.toString(),
      status: 'pending',
      createdAt: new Date()
    };
    
    notifications.push(notification);
    console.log('[NOTIFICATIONS] Notification created:', notification);
    console.log('[NOTIFICATIONS] Total notifications in store:', notifications.length);
    
    res.json({ success: true, notification });
  } catch (err) {
    console.error('[NOTIFICATIONS] Error in /guide/complete-tour:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Tourist fetches their notifications
router.get('/tourist', verifyToken, async (req, res) => {
  try {
    const touristId = req.user.userId.toString();
    console.log('[NOTIFICATIONS] Fetching notifications for tourist:', touristId);
    const myNotifications = notifications.filter(n => n.touristId === touristId && n.status === 'pending');
    console.log('[NOTIFICATIONS] Found notifications:', myNotifications.length);
    res.json({ notifications: myNotifications });
  } catch (err) {
    console.error('[NOTIFICATIONS] Error in /tourist:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Tourist responds to a notification (accept/decline)
router.post('/tourist/respond', verifyToken, async (req, res) => {
  try {
    const { notificationId, action, message } = req.body; // action: 'accept' or 'decline'
    const touristId = req.user.userId.toString();
    
    console.log('[NOTIFICATIONS] Tourist responding:', { notificationId, action, touristId });
    
    const notif = notifications.find(n => n.id === notificationId);
    if (!notif) {
      console.log('[NOTIFICATIONS] Notification not found:', notificationId);
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    // Verify tourist owns this notification
    if (notif.touristId !== touristId) {
      console.log('[NOTIFICATIONS] Access denied - not owner:', { notifTouristId: notif.touristId, requestTouristId: touristId });
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const bookingId = notif.bookingId;
    
    // Update booking based on response
    if (action === 'accept') {
      // Tourist accepted tour completion - allow review
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.reviewRequestStatus = 'accepted';
        booking.canLeaveReview = true;
        await booking.save();
      }
      notif.status = 'accepted';
    } else if (action === 'decline') {
      // Tourist declined - save decline message
      const booking = await Booking.findById(bookingId);
      if (booking) {
        booking.reviewRequestStatus = 'declined';
        booking.touristDeclineMessage = message || 'I prefer not to leave a review at this time.';
        await booking.save();
      }
      notif.status = 'declined';
    }
    
    notif.touristResponse = message || '';
    notif.respondedAt = new Date();
    
    console.log('[NOTIFICATIONS] Notification updated:', notif);
    
    res.json({ success: true, notification: notif });
  } catch (err) {
    console.error('[NOTIFICATIONS] Error in /tourist/respond:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get guide notifications (when tourist declines review)
router.get('/guide', verifyToken, async (req, res) => {
  try {
    const guideId = req.user.userId.toString();
    console.log('[NOTIFICATIONS] Fetching guide notifications for:', guideId);
    
    // Get all bookings where this user is the guide and tourist declined review
    const bookings = await Booking.find({ 
      guideId: req.user.userId,
      reviewRequestStatus: 'declined'
    }).populate('touristId', 'name avatar');
    
    const guideNotifications = bookings.map(booking => ({
      id: `guide_${booking._id}`,
      guideId: guideId,
      touristName: booking.touristId?.name || 'Tourist',
      tourName: booking.destination,
      message: booking.touristDeclineMessage || 'The tourist declined to leave a review.',
      bookingId: booking._id.toString(),
      status: 'declined',
      type: 'review_declined',
      createdAt: booking.updatedAt
    }));
    
    res.json({ notifications: guideNotifications });
  } catch (err) {
    console.error('[NOTIFICATIONS] Error in /guide:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
module.exports.notifications = notifications;

