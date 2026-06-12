const express = require('express');
const HotelBooking = require('../models/HotelBooking');
const Room = require('../models/Room');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const STATUS_PRESETS = {
  actual: ['confirmed', 'checked_in', 'completed'],
  projected: ['confirmed', 'checked_in', 'completed', 'pending'],
};
const ALL_STATUSES = ['pending', 'confirmed', 'checked_in', 'completed', 'cancelled'];

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const toDayNumber = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY);
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const addMonths = (date, count) => {
  const next = new Date(date.getFullYear(), date.getMonth() + count, 1);
  return next;
};

const formatDayLabel = (date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatMonthLabel = (date, includeYear) =>
  date.toLocaleDateString('en-US', includeYear
    ? { month: 'short', year: '2-digit' }
    : { month: 'short' });

const buildBuckets = (rangeLabel, endDate) => {
  const today = new Date(endDate);
  const endDay = toDayNumber(today);
  const endExclusiveDay = endDay + 1;

  if (rangeLabel === 'Last 7 days') {
    const startDay = endExclusiveDay - 7;
    return Array.from({ length: 7 }, (_, idx) => {
      const bucketStart = startDay + idx;
      return {
        label: formatDayLabel(new Date((bucketStart + 1) * MS_PER_DAY - 1)),
        startDay: bucketStart,
        endDay: bucketStart + 1,
      };
    });
  }

  if (rangeLabel === 'Last 30 days') {
    const totalDays = 30;
    const startDay = endExclusiveDay - totalDays;
    const buckets = [];
    let cursor = startDay;
    let weekIndex = 1;
    while (cursor < endExclusiveDay) {
      const next = Math.min(cursor + 7, endExclusiveDay);
      buckets.push({
        label: `Week ${weekIndex}`,
        startDay: cursor,
        endDay: next,
      });
      cursor = next;
      weekIndex += 1;
    }
    return buckets;
  }

  const months = rangeLabel === 'Last 12 months' ? 12 : 6;
  const monthEnd = startOfMonth(today);
  const monthStart = addMonths(monthEnd, -(months - 1));
  const includeYear = monthStart.getFullYear() !== monthEnd.getFullYear() || months >= 12;

  const buckets = [];
  for (let i = 0; i < months; i += 1) {
    const start = addMonths(monthStart, i);
    const end = addMonths(start, 1);
    const startDay = toDayNumber(start);
    let endDay = toDayNumber(end);
    if (endDay > endExclusiveDay) endDay = endExclusiveDay;
    buckets.push({
      label: formatMonthLabel(start, includeYear),
      startDay,
      endDay,
    });
  }
  return buckets;
};

router.get('/', verifyToken, authorizeRoles('hotel'), async (req, res) => {
  try {
    const hotelOwnerId = req.user.userId;
    const rangeLabel = req.query.range || 'Last 6 months';
    const rawStatus = String(req.query.status || 'actual').toLowerCase();
    const statusParam = STATUS_PRESETS[rawStatus]
      ? rawStatus
      : (ALL_STATUSES.includes(rawStatus) ? rawStatus : 'actual');
    const statusList = STATUS_PRESETS[statusParam]
      || (ALL_STATUSES.includes(statusParam) ? [statusParam] : STATUS_PRESETS.actual);
    const roomTypeParam = String(req.query.roomType || '').trim();
    const buckets = buildBuckets(rangeLabel, new Date());
    const rangeStartDay = buckets[0]?.startDay ?? toDayNumber(new Date());
    const rangeEndDay = buckets[buckets.length - 1]?.endDay ?? rangeStartDay;

    const bookingQuery = {
      hotelOwnerId,
      status: { $in: statusList },
      checkOut: { $gt: new Date(rangeStartDay * MS_PER_DAY) },
      checkIn: { $lt: new Date(rangeEndDay * MS_PER_DAY) },
    };
    if (roomTypeParam && roomTypeParam !== 'All') {
      bookingQuery.roomType = roomTypeParam;
    }

    const [bookings, rooms] = await Promise.all([
      HotelBooking.find(bookingQuery).lean(),
      Room.find({ hotel: hotelOwnerId }).lean(),
    ]);

    const filteredRooms = roomTypeParam && roomTypeParam !== 'All'
      ? rooms.filter((room) => room?.type === roomTypeParam)
      : rooms;
    const totalRooms = filteredRooms.reduce((sum, room) => sum + toNumber(room.total), 0);
    const roomPriceMap = new Map();
    const roomTypes = Array.from(
      new Set(
        rooms.map((room) => room?.type).filter(Boolean)
      )
    ).sort();
    rooms.forEach((room) => {
      if (!room?.type) return;
      roomPriceMap.set(room.type, toNumber(room.price));
    });

    const revenue = buckets.map((bucket) => ({ label: bucket.label, value: 0 }));
    const occupancyNights = buckets.map(() => 0);
    const customerSets = buckets.map(() => new Set());
    const overallCustomers = new Set();

    bookings.forEach((booking) => {
      const checkInDay = toDayNumber(booking.checkIn);
      const checkOutDay = toDayNumber(booking.checkOut);
      if (checkInDay === null || checkOutDay === null) return;
      if (checkOutDay <= checkInDay) return;

      const bookingNights = checkOutDay - checkInDay;
      let pricePerNight = toNumber(booking.pricePerNight);
      if (!pricePerNight) {
        const totalAmount = toNumber(booking.totalAmount);
        if (totalAmount && bookingNights) {
          pricePerNight = totalAmount / bookingNights;
        } else if (booking.roomType) {
          pricePerNight = roomPriceMap.get(booking.roomType) || 0;
        }
      }

      buckets.forEach((bucket, idx) => {
        const overlapStart = Math.max(checkInDay, bucket.startDay);
        const overlapEnd = Math.min(checkOutDay, bucket.endDay);
        const overlapNights = Math.max(0, overlapEnd - overlapStart);
        if (!overlapNights) return;
        occupancyNights[idx] += overlapNights;
        if (pricePerNight) {
          revenue[idx].value += pricePerNight * overlapNights;
        }
        if (booking.touristId) {
          const touristKey = booking.touristId.toString();
          customerSets[idx].add(touristKey);
          overallCustomers.add(touristKey);
        }
      });
    });

    const occupancy = buckets.map((bucket, idx) => {
      const bucketDays = Math.max(1, bucket.endDay - bucket.startDay);
      const capacity = totalRooms * bucketDays;
      const percentage = capacity
        ? Math.round((occupancyNights[idx] / capacity) * 100)
        : 0;
      return { label: bucket.label, value: Math.min(100, percentage) };
    });

    const customerGrowth = buckets.map((bucket, idx) => ({
      label: bucket.label,
      value: customerSets[idx].size,
    }));

    const totalRevenue = Math.round(revenue.reduce((sum, item) => sum + toNumber(item.value), 0));
    const totalNights = occupancyNights.reduce((sum, nights) => sum + nights, 0);
    const totalCapacity = totalRooms * Math.max(1, rangeEndDay - rangeStartDay);
    const avgOccupancy = totalCapacity
      ? Math.round((totalNights / totalCapacity) * 100)
      : 0;

    res.json({
      range: rangeLabel,
      status: statusParam,
      roomType: roomTypeParam || 'All',
      roomTypes,
      totals: {
        revenue: totalRevenue,
        avgOccupancy: Math.min(100, avgOccupancy),
        customers: overallCustomers.size,
        nights: totalNights,
      },
      revenue: revenue.map((item) => ({ ...item, value: Math.round(item.value) })),
      occupancy,
      customerGrowth,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
