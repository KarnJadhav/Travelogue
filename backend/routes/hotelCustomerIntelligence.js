const express = require('express');
const mongoose = require('mongoose');
const HotelBooking = require('../models/HotelBooking');
const Room = require('../models/Room');
const HotelCustomerProfile = require('../models/HotelCustomerProfile');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

const SEGMENTS = ['Business', 'Family', 'Solo', 'Couples', 'Other'];
const MS_PER_DAY = 1000 * 60 * 60 * 24;

const toNumber = (value) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
};

const computeNights = (checkIn, checkOut) => {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = end - start;
  if (diff <= 0) return 0;
  return Math.max(1, Math.ceil(diff / MS_PER_DAY));
};

const deriveSegment = (avgGuests) => {
  if (avgGuests >= 3) return 'Family';
  if (avgGuests >= 2) return 'Couples';
  return 'Solo';
};

// Hotel: customer intelligence overview
router.get('/', verifyToken, authorizeRoles('hotel'), async (req, res) => {
  try {
    const hotelOwnerId = req.user.userId;
    const [bookings, rooms, profiles] = await Promise.all([
      HotelBooking.find({ hotelOwnerId, status: { $ne: 'cancelled' } })
        .populate('touristId', 'name email phone avatar')
        .sort({ createdAt: -1 })
        .lean(),
      Room.find({ hotel: hotelOwnerId }).lean(),
      HotelCustomerProfile.find({ hotelOwnerId }).lean(),
    ]);

    const roomPriceMap = new Map();
    rooms.forEach((room) => {
      if (!room?.type) return;
      roomPriceMap.set(room.type, toNumber(room.price));
    });

    const profileByTouristId = new Map();
    profiles.forEach((profile) => {
      if (!profile?.touristId) return;
      profileByTouristId.set(profile.touristId.toString(), profile);
    });

    const statsByTourist = new Map();
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    let last90Bookings = 0;
    let last90Nights = 0;

    bookings.forEach((booking) => {
      const tourist = booking.touristId;
      const touristId = tourist?._id
        ? tourist._id.toString()
        : booking.touristId?.toString();
      if (!touristId) return;

      const entry =
        statsByTourist.get(touristId) ||
        {
          touristId,
          name: tourist?.name || 'Guest',
          email: tourist?.email || '',
          phone: tourist?.phone || '',
          avatar: tourist?.avatar || '',
          stays: 0,
          spending: 0,
          totalGuests: 0,
          totalNights: 0,
          lastStay: null,
        };

      entry.stays += 1;
      entry.totalGuests += toNumber(booking.guests);

      const nights = computeNights(booking.checkIn, booking.checkOut);
      entry.totalNights += nights;

      if (booking.checkOut) {
        const checkOutDate = new Date(booking.checkOut);
        if (!Number.isNaN(checkOutDate.getTime())) {
          if (!entry.lastStay || checkOutDate > entry.lastStay) {
            entry.lastStay = checkOutDate;
          }
        }
      }

      const pricePerNight = toNumber(booking.pricePerNight)
        || (booking.roomType ? roomPriceMap.get(booking.roomType) || 0 : 0);
      let totalAmount = toNumber(booking.totalAmount);
      if (!totalAmount && pricePerNight && nights) {
        totalAmount = pricePerNight * nights;
      }
      entry.spending += totalAmount;

      if (booking.checkIn) {
        const checkInDate = new Date(booking.checkIn);
        if (!Number.isNaN(checkInDate.getTime()) && checkInDate >= ninetyDaysAgo) {
          last90Bookings += 1;
          last90Nights += nights;
        }
      }

      statsByTourist.set(touristId, entry);
    });

    const customers = Array.from(statsByTourist.values()).map((entry) => {
      const avgGuests = entry.stays ? entry.totalGuests / entry.stays : 0;
      const profile = profileByTouristId.get(entry.touristId);
      const profileSegment = profile?.segment && SEGMENTS.includes(profile.segment)
        ? profile.segment
        : '';
      const segment = profileSegment || deriveSegment(avgGuests);
      const spending = Math.round(entry.spending);
      const loyaltyScore = entry.stays * 2 + Math.round(spending / 1000);
      return {
        touristId: entry.touristId,
        name: entry.name,
        email: entry.email,
        phone: entry.phone,
        avatar: entry.avatar,
        stays: entry.stays,
        spending,
        loyaltyScore,
        segment,
        notes: profile?.notes || '',
        vip: !!profile?.vip,
        tags: profile?.tags || [],
        lastStay: entry.lastStay,
      };
    });

    customers.sort((a, b) => (b.spending - a.spending) || (b.stays - a.stays));

    const totalCustomers = customers.length;
    const repeatCustomers = customers.filter((customer) => customer.stays >= 2).length;
    const repeatRate = totalCustomers
      ? Math.round((repeatCustomers / totalCustomers) * 100)
      : 0;
    const avgStay = last90Bookings
      ? Math.round((last90Nights / last90Bookings) * 10) / 10
      : 0;

    res.json({
      summary: {
        totalCustomers,
        repeatCustomers,
        repeatRate,
        avgStay,
      },
      customers,
      topCustomers: customers.slice(0, 5),
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Hotel: update per-customer profile (segment, notes, etc.)
router.patch('/:touristId', verifyToken, authorizeRoles('hotel'), async (req, res) => {
  try {
    const { segment, notes, vip, tags } = req.body;
    const hotelOwnerId = req.user.userId;
    const { touristId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(touristId)) {
      return res.status(400).json({ message: 'Invalid customer id.' });
    }

    if (segment !== undefined && segment !== '' && !SEGMENTS.includes(segment)) {
      return res.status(400).json({ message: 'Invalid segment.' });
    }

    const exists = await HotelBooking.exists({ hotelOwnerId, touristId });
    if (!exists) {
      return res.status(404).json({ message: 'Customer not found for this hotel.' });
    }

    const update = {};
    if (segment !== undefined) update.segment = segment;
    if (notes !== undefined) update.notes = String(notes || '').slice(0, 500);
    if (vip !== undefined) update.vip = !!vip;
    if (tags !== undefined) {
      update.tags = Array.isArray(tags)
        ? tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 10)
        : [];
    }

    const profile = await HotelCustomerProfile.findOneAndUpdate(
      { hotelOwnerId, touristId },
      update,
      { new: true, upsert: true }
    );

    res.json({ profile });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
