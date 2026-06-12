const express = require('express');
const Hotel = require('../models/Hotel');
const HotelBooking = require('../models/HotelBooking');
const Room = require('../models/Room');
const RoomInventoryLog = require('../models/RoomInventoryLog');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();
const MS_PER_DAY = 1000 * 60 * 60 * 24;
const BLOCKING_BOOKING_STATUSES = ['pending', 'confirmed', 'checked_in'];
const HOTEL_BOOKING_STATUSES = ['pending', 'confirmed', 'cancelled', 'checked_in', 'completed'];

const parseDateOnly = (value) => {
  if (typeof value !== 'string') return null;
  const parts = value.split('-').map(Number);
  if (parts.length !== 3) return null;
  const [year, month, day] = parts;
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const toStartOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const formatDateLabel = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'the required date';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

const getAllowedStatusTransitions = (booking, today = new Date()) => {
  const currentStatus = String(booking?.status || '').toLowerCase();
  const allowed = new Set([currentStatus]);

  const todayStart = toStartOfDay(today);
  const checkInStart = toStartOfDay(booking?.checkIn);
  const checkOutStart = toStartOfDay(booking?.checkOut);
  const canCheckInNow =
    Boolean(todayStart && checkInStart && checkOutStart) &&
    todayStart >= checkInStart &&
    todayStart < checkOutStart;
  const canCompleteNow =
    Boolean(todayStart && checkOutStart) &&
    todayStart > checkOutStart;

  if (currentStatus === 'pending') {
    allowed.add('confirmed');
    allowed.add('cancelled');
  } else if (currentStatus === 'confirmed') {
    allowed.add('cancelled');
    if (canCheckInNow) allowed.add('checked_in');
    if (canCompleteNow) allowed.add('completed');
  } else if (currentStatus === 'checked_in') {
    if (canCompleteNow) allowed.add('completed');
  }

  return { allowed, canCheckInNow, canCompleteNow, checkInStart, checkOutStart };
};

const getOverlapQuery = ({ hotelId, checkInDate, checkOutDate }) => {
  return {
    hotelId,
    status: { $in: BLOCKING_BOOKING_STATUSES },
    checkIn: { $lt: checkOutDate },
    checkOut: { $gt: checkInDate },
  };
};

const buildConflictMessage = (conflict) => {
  const hotelName = conflict?.hotelId?.name || 'this hotel';
  const roomLabel = conflict?.roomType ? `${conflict.roomType} room` : 'selected room';
  return `${hotelName} already has an active booking for the ${roomLabel} on these dates. Please choose another date.`;
};

const adjustRoomAvailability = async ({ hotelOwnerId, roomType, delta, bookingId, reason }) => {
  const room = await Room.findOne({ hotel: hotelOwnerId, type: roomType });
  if (!room) {
    throw new Error('Room type not found for this hotel.');
  }
  const previousAvailable = Number(room.available) || 0;
  if (delta < 0) {
    const requestedRooms = Math.abs(Number(delta)) || 0;
    if (room.status === 'Unavailable' || previousAvailable < requestedRooms) {
      throw new Error(`Only ${previousAvailable} rooms available for this type.`);
    }
  }
  const total = Number(room.total) || 0;
  let nextAvailable = previousAvailable + delta;
  if (nextAvailable < 0) nextAvailable = 0;
  if (nextAvailable > total) nextAvailable = total;
  room.available = nextAvailable;
  if (room.status !== 'Unavailable') {
    room.status = nextAvailable <= 0 ? 'Full' : 'Available';
  }
  await room.save();

  await RoomInventoryLog.create({
    hotelOwnerId,
    roomId: room._id,
    roomType: room.type,
    bookingId,
    delta,
    reason,
    previousAvailable,
    newAvailable: nextAvailable,
  });

  try {
    const setupSocket = require('../socket/chat');
    const io = setupSocket.ioInstance;
    if (io) {
      io.to(`hotel_${room.hotel.toString()}`).emit('hotelRoomUpdate', {
        hotelId: room.hotel.toString(),
        room,
      });
      io.emit('hotelRoomUpdatePublic', {
        hotelId: room.hotel.toString(),
        room,
      });
    }
  } catch (e) {
    console.log('[DEBUG] Socket emit error (room update from booking):', e);
  }

  return room;
};

const adjustRoomAvailabilityRaw = async ({ hotelOwnerId, roomType, delta }) => {
  const room = await Room.findOne({ hotel: hotelOwnerId, type: roomType });
  if (!room) {
    throw new Error('Room type not found for this hotel.');
  }
  const previousAvailable = Number(room.available) || 0;
  if (delta < 0) {
    const requestedRooms = Math.abs(Number(delta)) || 0;
    if (room.status === 'Unavailable' || previousAvailable < requestedRooms) {
      throw new Error(`Only ${previousAvailable} rooms available for this type.`);
    }
  }
  const total = Number(room.total) || 0;
  let nextAvailable = previousAvailable + delta;
  if (nextAvailable < 0) nextAvailable = 0;
  if (nextAvailable > total) nextAvailable = total;
  room.available = nextAvailable;
  if (room.status !== 'Unavailable') {
    room.status = nextAvailable <= 0 ? 'Full' : 'Available';
  }
  await room.save();
  return { room, previousAvailable, newAvailable: nextAvailable };
};

// Tourist creates a hotel booking
router.post('/', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const { hotelId, checkIn, checkOut, guests, roomCount, roomType, notes } = req.body;
    if (!hotelId || !checkIn || !checkOut) {
      return res.status(400).json({ message: 'hotelId, checkIn, and checkOut are required.' });
    }
    const rawRoomCount = roomCount;
    const hasRoomCount = rawRoomCount !== undefined && rawRoomCount !== null && rawRoomCount !== '';
    const roomCountValue = hasRoomCount ? Number(rawRoomCount) : 1;
    if (Number.isNaN(roomCountValue) || roomCountValue <= 0) {
      return res.status(400).json({ message: 'roomCount must be a positive number.' });
    }
    const requestedRoomCount = Math.max(1, Math.floor(roomCountValue));

    const checkInDate = parseDateOnly(checkIn);
    const checkOutDate = parseDateOnly(checkOut);
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({ message: 'Invalid check-in or check-out date.' });
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (checkInDate < today) {
      return res.status(400).json({ message: 'Check-in date cannot be in the past.' });
    }
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: 'Check-out must be after check-in.' });
    }
    const nights = Math.max(1, Math.ceil((checkOutDate - checkInDate) / MS_PER_DAY));
    const hotel = await Hotel.findById(hotelId);
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found.' });
    }
    const overlap = await HotelBooking.findOne(
      getOverlapQuery({ hotelId: hotel._id, roomType, checkInDate, checkOutDate })
    ).populate('hotelId', 'name');
    if (overlap) {
      return res.status(409).json({
        message: buildConflictMessage(overlap),
        conflict: {
          bookingId: overlap._id,
          status: overlap.status,
          roomType: overlap.roomType,
          checkIn: overlap.checkIn,
          checkOut: overlap.checkOut,
        },
      });
    }

    let reserved = false;
    let reservedRoom = null;
    let reservedPrev = null;
    let reservedNext = null;
    let pricePerNight = 0;
    let totalAmount = 0;
    try {
      if (roomType) {
        const result = await adjustRoomAvailabilityRaw({
          hotelOwnerId: hotel.user,
          roomType,
          delta: -requestedRoomCount,
        });
        reserved = true;
        reservedRoom = result.room;
        reservedPrev = result.previousAvailable;
        reservedNext = result.newAvailable;
        pricePerNight = Number(result.room?.price) || 0;
        totalAmount = pricePerNight ? pricePerNight * nights * requestedRoomCount : 0;
      }
    } catch (roomErr) {
      return res.status(400).json({ message: roomErr.message || 'No rooms available for the selected type.' });
    }

    let booking;
    try {
      booking = await HotelBooking.create({
        touristId: req.user.userId,
        hotelId: hotel._id,
        hotelOwnerId: hotel.user,
        checkIn,
        checkOut,
        guests: guests || 1,
        roomCount: requestedRoomCount,
        roomType: roomType || '',
        notes: notes || '',
        status: 'pending',
        roomReserved: reserved,
        pricePerNight,
        totalAmount,
      });
    } catch (err) {
      if (reserved) {
        await adjustRoomAvailability({
          hotelOwnerId: hotel.user,
          roomType,
          delta: requestedRoomCount,
          bookingId: null,
          reason: 'rollback_booking_create',
        });
      }
      throw err;
    }

    if (reserved && reservedRoom) {
      await RoomInventoryLog.create({
        hotelOwnerId: hotel.user,
        roomId: reservedRoom._id,
        roomType,
        bookingId: booking._id,
        delta: -requestedRoomCount,
        reason: 'reserve_on_booking',
        previousAvailable: reservedPrev ?? 0,
        newAvailable: reservedNext ?? 0,
      });
      try {
        const setupSocket = require('../socket/chat');
        const io = setupSocket.ioInstance;
        if (io) {
          io.to(`hotel_${reservedRoom.hotel.toString()}`).emit('hotelRoomUpdate', {
            hotelId: reservedRoom.hotel.toString(),
            room: reservedRoom,
          });
          io.emit('hotelRoomUpdatePublic', {
            hotelId: reservedRoom.hotel.toString(),
            room: reservedRoom,
          });
        }
      } catch (e) {
        console.log('[DEBUG] Socket emit error (room update from booking):', e);
      }
    }
    try {
      const setupSocket = require('../socket/chat');
      const io = setupSocket.ioInstance;
      if (io && booking.touristId) {
        io.to(`tourist_${booking.touristId.toString()}`).emit('hotelBookingUpdate', {
          touristId: booking.touristId.toString(),
          booking,
        });
      }
    } catch (e) {
      console.log('[DEBUG] Socket emit error (hotel booking create):', e);
    }
    res.status(201).json({ booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

router.get('/availability', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const { hotelId, checkIn, checkOut, roomType } = req.query;
    if (!hotelId || !checkIn || !checkOut) {
      return res.status(400).json({ message: 'hotelId, checkIn, and checkOut are required.' });
    }
    const checkInDate = parseDateOnly(checkIn);
    const checkOutDate = parseDateOnly(checkOut);
    if (!checkInDate || !checkOutDate) {
      return res.status(400).json({ message: 'Invalid check-in or check-out date.' });
    }
    if (checkOutDate <= checkInDate) {
      return res.status(400).json({ message: 'Check-out must be after check-in.' });
    }

    const hotel = await Hotel.findById(hotelId).select('name');
    if (!hotel) {
      return res.status(404).json({ message: 'Hotel not found.' });
    }

    const conflict = await HotelBooking.findOne(
      getOverlapQuery({ hotelId: hotel._id, roomType, checkInDate, checkOutDate })
    ).populate('hotelId', 'name');

    if (conflict) {
      return res.json({
        available: false,
        message: buildConflictMessage(conflict),
        conflict: {
          bookingId: conflict._id,
          status: conflict.status,
          roomType: conflict.roomType,
          checkIn: conflict.checkIn,
          checkOut: conflict.checkOut,
        },
      });
    }

    return res.json({ available: true, message: 'Selected dates are available.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Tourist view their hotel bookings
router.get('/tourist', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const bookings = await HotelBooking.find({ touristId: req.user.userId })
      .populate('hotelId', 'name email phone address cityState hotelType images amenities')
      .populate('hotelOwnerId', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Hotel view bookings created by tourists
router.get('/hotel', verifyToken, authorizeRoles('hotel'), async (req, res) => {
  try {
    const bookings = await HotelBooking.find({ hotelOwnerId: req.user.userId })
      .populate('touristId', 'name email phone avatar')
      .populate('hotelId', 'name email phone address cityState hotelType images amenities')
      .sort({ createdAt: -1 });
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Hotel updates booking status
router.patch('/:id/status', verifyToken, authorizeRoles('hotel'), async (req, res) => {
  try {
    const { status } = req.body;
    const nextStatus = String(status || '').toLowerCase().trim();
    if (!HOTEL_BOOKING_STATUSES.includes(nextStatus)) {
      return res.status(400).json({ message: 'Invalid status.' });
    }
    const booking = await HotelBooking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found.' });
    }
    if (booking.hotelOwnerId.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden.' });
    }
    if (booking.status === 'completed') {
      return res.status(400).json({ message: 'Completed bookings cannot be changed.' });
    }
    const previousStatus = String(booking.status || '').toLowerCase();
    const {
      allowed,
      canCheckInNow,
      canCompleteNow,
      checkInStart,
      checkOutStart,
    } = getAllowedStatusTransitions(booking, new Date());
    if (!allowed.has(nextStatus)) {
      if (nextStatus === 'checked_in' && !canCheckInNow) {
        return res.status(400).json({
          message: `Check-in can be marked only between ${formatDateLabel(checkInStart)} and before ${formatDateLabel(checkOutStart)}.`,
        });
      }
      if (nextStatus === 'completed' && !canCompleteNow) {
        return res.status(400).json({
          message: `Booking can be completed only after ${formatDateLabel(checkOutStart)}.`,
        });
      }
      return res.status(400).json({
        message: `Cannot change booking status from ${previousStatus} to ${nextStatus}.`,
      });
    }
    const bookedRooms = Math.max(1, Number(booking.roomCount) || 1);

    if (nextStatus === 'confirmed' && previousStatus !== 'confirmed') {
      if (!booking.roomReserved && booking.roomType) {
        try {
          await adjustRoomAvailability({
            hotelOwnerId: booking.hotelOwnerId,
            roomType: booking.roomType,
            delta: -bookedRooms,
            bookingId: booking._id,
            reason: 'reserve_on_confirm',
          });
          booking.roomReserved = true;
        } catch (roomErr) {
          return res.status(400).json({ message: roomErr.message || 'Room availability update failed.' });
        }
      }
    }

    if ((nextStatus === 'cancelled' || nextStatus === 'completed') && booking.roomReserved && booking.roomType) {
      try {
        await adjustRoomAvailability({
          hotelOwnerId: booking.hotelOwnerId,
          roomType: booking.roomType,
          delta: bookedRooms,
          bookingId: booking._id,
          reason: nextStatus === 'completed' ? 'release_on_complete' : 'release_on_cancel',
        });
        booking.roomReserved = false;
      } catch (roomErr) {
        return res.status(400).json({ message: roomErr.message || 'Room availability update failed.' });
      }
    }

    booking.status = nextStatus;
    await booking.save();
    await booking.populate('touristId', 'name email phone avatar');
    await booking.populate('hotelId', 'name email phone address cityState hotelType images amenities');
    try {
      const setupSocket = require('../socket/chat');
      const io = setupSocket.ioInstance;
      if (io && booking.touristId) {
        io.to(`tourist_${booking.touristId._id.toString()}`).emit('hotelBookingUpdate', {
          touristId: booking.touristId._id.toString(),
          booking,
        });
      }
    } catch (e) {
      console.log('[DEBUG] Socket emit error (hotel booking status):', e);
    }
    res.json({ booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
