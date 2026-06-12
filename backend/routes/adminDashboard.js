const express = require('express');
const User = require('../models/User');
const Guide = require('../models/Guide');
const Travelogue = require('../models/Travelogue');
const Chat = require('../models/Chat');
const Booking = require('../models/Booking');
const HotelBooking = require('../models/HotelBooking');
const Review = require('../models/Review');
const HotelReview = require('../models/HotelReview');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

const PERIOD_CONFIG = {
  day: {
    buckets: 12,
    unitMs: 2 * 60 * 60 * 1000,
    labelFormatter: (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  week: {
    buckets: 7,
    unitMs: 24 * 60 * 60 * 1000,
    labelFormatter: (date) => date.toLocaleDateString([], { weekday: 'short' }),
  },
  month: {
    buckets: 30,
    unitMs: 24 * 60 * 60 * 1000,
    labelFormatter: (date) => date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
  },
};

const REPORT_PERIOD_CONFIG = {
  week: {
    buckets: 7,
    unitMs: 24 * 60 * 60 * 1000,
    labelFormatter: (date) => date.toLocaleDateString([], { weekday: 'short' }),
  },
  month: {
    buckets: 30,
    unitMs: 24 * 60 * 60 * 1000,
    labelFormatter: (date) => date.toLocaleDateString([], { month: 'short', day: 'numeric' }),
  },
  year: {
    buckets: 12,
    unitMs: 30 * 24 * 60 * 60 * 1000,
    labelFormatter: (date) => date.toLocaleDateString([], { month: 'short' }),
  },
};

const buildBuckets = (period = 'month') => {
  const config = REPORT_PERIOD_CONFIG[period] || REPORT_PERIOD_CONFIG.month;
  const now = Date.now();
  return Array.from({ length: config.buckets }, (_, idx) => {
    const fromEnd = config.buckets - idx;
    const from = new Date(now - fromEnd * config.unitMs);
    const to = new Date(now - (fromEnd - 1) * config.unitMs);
    return { from, to, label: config.labelFormatter(to) };
  });
};

const countByField = (items, fieldName = '_id') =>
  (items || []).reduce((acc, item) => {
    acc[item[fieldName] || 'unknown'] = item.count || 0;
    return acc;
  }, {});

const averageRating = async (Model) => {
  const result = await Model.aggregate([
    { $match: { isDeleted: { $ne: true }, isHidden: { $ne: true }, status: { $ne: 'rejected' } } },
    { $group: { _id: null, avg: { $avg: '$rating' } } },
  ]);
  return Number((result[0]?.avg || 0).toFixed(1));
};

// Admin dashboard stats
router.get('/dashboard-stats', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const [touristCount, guideCount, hotelCount, hospitalCount, travelogueCount, chatCount, pendingGuides] = await Promise.all([
      User.countDocuments({ role: 'tourist' }),
      User.countDocuments({ role: 'guide' }),
      User.countDocuments({ role: 'hotel' }),
      User.countDocuments({ role: 'hospital' }),
      Travelogue.countDocuments({}),
      Chat.countDocuments({ status: 'ACTIVE' }),
      Guide.countDocuments({ approved: false, rejected: false })
    ]);
    res.json({
      touristCount,
      guideCount,
      hotelCount,
      hospitalCount,
      travelogueCount,
      chatCount,
      pendingGuides
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/activity-trend', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const period = (req.query.period || 'week').toLowerCase();
    const config = PERIOD_CONFIG[period] || PERIOD_CONFIG.week;
    const now = Date.now();

    const buckets = Array.from({ length: config.buckets }, (_, idx) => {
      const fromEnd = config.buckets - idx;
      const from = new Date(now - fromEnd * config.unitMs);
      const to = new Date(now - (fromEnd - 1) * config.unitMs);
      return { from, to, label: config.labelFormatter(to) };
    });

    const points = await Promise.all(
      buckets.map(async (bucket) => {
        const [tourists, guides, hotels, hospitals, travelogues, activeChats] = await Promise.all([
          User.countDocuments({ role: 'tourist', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
          User.countDocuments({ role: 'guide', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
          User.countDocuments({ role: 'hotel', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
          User.countDocuments({ role: 'hospital', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
          Travelogue.countDocuments({ createdAt: { $gte: bucket.from, $lt: bucket.to } }),
          Chat.countDocuments({ createdAt: { $gte: bucket.from, $lt: bucket.to }, status: 'ACTIVE' }),
        ]);

        return {
          label: bucket.label,
          usersTotal: tourists + guides,
          servicesTotal: hotels + hospitals,
          travelogues,
          chatActivity: activeChats,
        };
      })
    );

    res.json({ period, points });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/reports', verifyToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const period = (req.query.period || 'month').toLowerCase();
    const buckets = buildBuckets(period);

    const [
      roleGroups,
      guideStatusGroups,
      travelogueStatusGroups,
      guideBookingStatusGroups,
      hotelBookingStatusGroups,
      travelogueCount,
      guideBookingCount,
      hotelBookingCount,
      guideReviewCount,
      hotelReviewCount,
      guideRevenueAgg,
      hotelRevenueAgg,
      guideAvgRating,
      hotelAvgRating,
      mostViewedTravelogue,
      popularDestinationAgg,
      topGuideAgg,
      topHotelAgg,
      recentHotelBookings,
    ] = await Promise.all([
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      Guide.aggregate([
        {
          $project: {
            status: {
              $cond: [
                '$rejected',
                'rejected',
                { $cond: ['$approved', 'approved', 'pending'] },
              ],
            },
          },
        },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Travelogue.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Booking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      HotelBooking.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
      Travelogue.countDocuments({}),
      Booking.countDocuments({}),
      HotelBooking.countDocuments({}),
      Review.countDocuments({ isDeleted: { $ne: true } }),
      HotelReview.countDocuments({ isDeleted: { $ne: true } }),
      Booking.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$price' } } },
      ]),
      HotelBooking.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      averageRating(Review),
      averageRating(HotelReview),
      Travelogue.findOne({}).sort({ views: -1, createdAt: -1 }).select('title views destination location').lean(),
      Travelogue.aggregate([
        {
          $project: {
            place: { $ifNull: ['$destination', '$location'] },
            views: { $ifNull: ['$views', 0] },
          },
        },
        { $match: { place: { $nin: [null, ''] } } },
        { $group: { _id: '$place', count: { $sum: 1 }, views: { $sum: '$views' } } },
        { $sort: { count: -1, views: -1 } },
        { $limit: 1 },
      ]),
      Booking.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: '$guideId', bookings: { $sum: 1 }, revenue: { $sum: '$price' } } },
        { $sort: { bookings: -1, revenue: -1 } },
        { $limit: 1 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'guide' } },
        { $unwind: { path: '$guide', preserveNullAndEmptyArrays: true } },
        { $project: { name: '$guide.name', bookings: 1, revenue: 1 } },
      ]),
      HotelBooking.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: '$hotelId', bookings: { $sum: 1 }, revenue: { $sum: '$totalAmount' } } },
        { $sort: { bookings: -1, revenue: -1 } },
        { $limit: 1 },
        { $lookup: { from: 'hotels', localField: '_id', foreignField: '_id', as: 'hotel' } },
        { $unwind: { path: '$hotel', preserveNullAndEmptyArrays: true } },
        { $project: { name: '$hotel.name', bookings: 1, revenue: 1 } },
      ]),
      HotelBooking.find({})
        .populate('touristId', 'name email')
        .populate('hotelId', 'name')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
    ]);

    const roleCounts = countByField(roleGroups);
    const guideStatusCounts = countByField(guideStatusGroups);
    const travelogueStatusCounts = countByField(travelogueStatusGroups);
    const guideBookingStatusCounts = countByField(guideBookingStatusGroups);
    const hotelBookingStatusCounts = countByField(hotelBookingStatusGroups);
    const guideRevenue = guideRevenueAgg[0]?.total || 0;
    const hotelRevenue = hotelRevenueAgg[0]?.total || 0;
    const userTotal = Object.entries(roleCounts).reduce(
      (sum, [role, count]) => (role === 'admin' ? sum : sum + count),
      0
    );

    const [userGrowth, revenueTrend] = await Promise.all([
      Promise.all(
        buckets.map(async (bucket) => {
          const [tourists, guides, hotels, hospitals] = await Promise.all([
            User.countDocuments({ role: 'tourist', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
            User.countDocuments({ role: 'guide', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
            User.countDocuments({ role: 'hotel', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
            User.countDocuments({ role: 'hospital', createdAt: { $gte: bucket.from, $lt: bucket.to } }),
          ]);
          return {
            label: bucket.label,
            tourists,
            guides,
            hotels,
            hospitals,
            total: tourists + guides + hotels + hospitals,
          };
        })
      ),
      Promise.all(
        buckets.map(async (bucket) => {
          const [guideRevenueBucket, hotelRevenueBucket] = await Promise.all([
            Booking.aggregate([
              { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: bucket.from, $lt: bucket.to } } },
              { $group: { _id: null, total: { $sum: '$price' } } },
            ]),
            HotelBooking.aggregate([
              { $match: { status: { $ne: 'cancelled' }, createdAt: { $gte: bucket.from, $lt: bucket.to } } },
              { $group: { _id: null, total: { $sum: '$totalAmount' } } },
            ]),
          ]);
          const guideValue = guideRevenueBucket[0]?.total || 0;
          const hotelValue = hotelRevenueBucket[0]?.total || 0;
          return {
            label: bucket.label,
            guideRevenue: guideValue,
            hotelRevenue: hotelValue,
            totalRevenue: guideValue + hotelValue,
          };
        })
      ),
    ]);

    res.json({
      period,
      totals: {
        users: userTotal,
        tourists: roleCounts.tourist || 0,
        guides: roleCounts.guide || 0,
        hotels: roleCounts.hotel || 0,
        hospitals: roleCounts.hospital || 0,
        travelogues: travelogueCount,
        guideBookings: guideBookingCount,
        hotelBookings: hotelBookingCount,
        bookings: guideBookingCount + hotelBookingCount,
        guideReviews: guideReviewCount,
        hotelReviews: hotelReviewCount,
        reviews: guideReviewCount + hotelReviewCount,
        guideRevenue,
        hotelRevenue,
        revenue: guideRevenue + hotelRevenue,
        avgGuideRating: guideAvgRating,
        avgHotelRating: hotelAvgRating,
      },
      distributions: {
        roles: [
          { label: 'Tourists', value: roleCounts.tourist || 0 },
          { label: 'Guides', value: roleCounts.guide || 0 },
          { label: 'Hotels', value: roleCounts.hotel || 0 },
          { label: 'Hospitals', value: roleCounts.hospital || 0 },
        ],
        guideStatus: [
          { label: 'Approved', value: guideStatusCounts.approved || 0 },
          { label: 'Pending', value: guideStatusCounts.pending || 0 },
          { label: 'Rejected', value: guideStatusCounts.rejected || 0 },
        ],
        travelogueStatus: [
          { label: 'Approved', value: travelogueStatusCounts.approved || 0 },
          { label: 'Pending', value: travelogueStatusCounts.pending || 0 },
          { label: 'Rejected', value: travelogueStatusCounts.rejected || 0 },
          { label: 'Draft', value: travelogueStatusCounts.draft || 0 },
        ],
        bookingStatus: [
          { label: 'Guide Pending', value: guideBookingStatusCounts.pending || 0 },
          { label: 'Guide Confirmed', value: guideBookingStatusCounts.confirmed || 0 },
          { label: 'Guide Completed', value: guideBookingStatusCounts.completed || 0 },
          { label: 'Hotel Pending', value: hotelBookingStatusCounts.pending || 0 },
          { label: 'Hotel Confirmed', value: hotelBookingStatusCounts.confirmed || 0 },
          { label: 'Hotel Completed', value: hotelBookingStatusCounts.completed || 0 },
        ],
      },
      highlights: {
        mostViewedTravelogue: mostViewedTravelogue
          ? {
              title: mostViewedTravelogue.title || 'Untitled travelogue',
              value: mostViewedTravelogue.views || 0,
              subtitle: mostViewedTravelogue.destination || mostViewedTravelogue.location || 'No destination',
            }
          : null,
        popularDestination: popularDestinationAgg[0]
          ? {
              title: popularDestinationAgg[0]._id,
              value: popularDestinationAgg[0].count,
              subtitle: `${popularDestinationAgg[0].views || 0} views`,
            }
          : null,
        topGuide: topGuideAgg[0]
          ? {
              title: topGuideAgg[0].name || 'Guide',
              value: topGuideAgg[0].bookings || 0,
              revenue: topGuideAgg[0].revenue || 0,
            }
          : null,
        topHotel: topHotelAgg[0]
          ? {
              title: topHotelAgg[0].name || 'Hotel',
              value: topHotelAgg[0].bookings || 0,
              revenue: topHotelAgg[0].revenue || 0,
            }
          : null,
      },
      recentHotelBookings: recentHotelBookings.map((booking) => ({
        id: booking._id,
        touristName: booking.touristId?.name || 'Tourist',
        touristEmail: booking.touristId?.email || '',
        hotelName: booking.hotelId?.name || 'Hotel',
        status: booking.status || 'pending',
        roomType: booking.roomType || 'Room',
        roomCount: booking.roomCount || 1,
        totalAmount: booking.totalAmount || 0,
        pricePerNight: booking.pricePerNight || 0,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        createdAt: booking.createdAt,
      })),
      trends: {
        userGrowth,
        revenue: revenueTrend,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
