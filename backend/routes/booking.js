const express = require('express');
const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const Tour = require('../models/Tour');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadAndCleanupLocalFile, safeRemoveLocalFile, destroyAsset } = require('../utils/cloudinaryUpload');

const router = express.Router();

const HOLD_WINDOW_MINUTES = 30;
const HOLD_WINDOW_MS = HOLD_WINDOW_MINUTES * 60 * 1000;
const UPI_REF_MIN_LENGTH = 6;
const ALLOWED_REMAINING_PAYMENT_METHODS = ['', 'cash', 'direct_upi', 'bank_transfer', 'other'];

const advanceProofStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/booking-payments');
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeExt = ext || '.png';
    cb(null, `advance_payment_${req.user.userId}_${Date.now()}_${Math.round(Math.random() * 1e9)}${safeExt}`);
  }
});

const advanceProofUpload = multer({
  storage: advanceProofStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
      return;
    }
    cb(new Error('Only image files are allowed for payment proof.'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

const getIO = () => {
  const setupSocket = require('../socket/chat');
  return setupSocket.ioInstance;
};

const roundCurrency = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.round(numeric);
};

const startOfDay = (date) => {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
};

const hasManualUpiSetup = (guide) =>
  Boolean(guide?.acceptManualUpi && guide?.upiId && guide?.upiPayeeName && guide?.upiQrImage);

const buildGuidePaymentSnapshot = (guide) => ({
  payeeName: String(guide?.upiPayeeName || '').trim(),
  upiId: String(guide?.upiId || '').trim(),
  qrImage: String(guide?.upiQrImage || '').trim(),
  advancePaymentType: guide?.advancePaymentType === 'fixed' ? 'fixed' : 'percentage',
  advancePaymentValue: Number(guide?.advancePaymentValue || 0),
  advancePaymentNotes: String(guide?.advancePaymentNotes || '').trim()
});

const normalizeDestinationLabel = (value) => String(value || '').replace(/\s+/g, ' ').trim();

const normalizeDestinationKey = (value) => normalizeDestinationLabel(value).toLowerCase();

const getGuideDestinationPricing = (guide) => {
  const rawEntries = Array.isArray(guide?.serviceDestinations) ? guide.serviceDestinations : [];

  return rawEntries
    .map((entry) => {
      const destination = normalizeDestinationLabel(entry?.destination || entry?.name || '');
      const destinationKey = normalizeDestinationKey(destination);
      const price = Number(entry?.price || 0);
      if (!destinationKey || !Number.isFinite(price) || price <= 0) return null;
      return {
        id: String(entry?._id || ''),
        destination,
        destinationKey,
        price: roundCurrency(price)
      };
    })
    .filter(Boolean);
};

const resolveGuideDestinationPricing = ({ guide, destination, destinationPricingId = '' }) => {
  const pricingList = getGuideDestinationPricing(guide);
  const availableDestinations = pricingList.map((item) => item.destination);

  if (pricingList.length === 0) {
    return {
      error: 'This guide has not configured local destinations yet. Please choose another guide.',
      availableDestinations
    };
  }

  const destinationId = String(destinationPricingId || '').trim();
  const destinationKey = normalizeDestinationKey(destination);

  let matched = null;
  if (destinationId) {
    matched = pricingList.find((item) => item.id && item.id === destinationId) || null;
  }

  if (!matched && destinationKey) {
    matched = pricingList.find((item) => item.destinationKey === destinationKey) || null;
  }

  if (!matched) {
    return {
      error: "Please choose one of the guide's available local destinations.",
      availableDestinations
    };
  }

  return {
    destinationPricing: matched,
    availableDestinations
  };
};

const calculateAdvanceAmount = (totalAmount, guide) => {
  const safeTotal = roundCurrency(totalAmount);
  if (safeTotal <= 0) return 0;

  const advanceType = guide?.advancePaymentType === 'fixed' ? 'fixed' : 'percentage';
  const rawValue = Number(guide?.advancePaymentValue || 0);
  const safeValue = Number.isFinite(rawValue) && rawValue > 0 ? rawValue : 20;

  if (advanceType === 'fixed') {
    return Math.min(safeTotal, roundCurrency(safeValue));
  }

  return Math.min(safeTotal, Math.max(1, roundCurrency((safeTotal * safeValue) / 100)));
};

const calculatePricing = ({ guide, startDateTime, endDateTime, destinationPricing = null }) => {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  const rateType = guide?.rateType === 'hourly' ? 'hourly' : 'daily';
  const destinationRate = roundCurrency(destinationPricing?.price || 0);
  const fallbackGuideRate = roundCurrency(guide?.price || 0);
  const guideRate = destinationRate > 0 ? destinationRate : fallbackGuideRate;
  const durationMs = end.getTime() - start.getTime();

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || durationMs <= 0) {
    throw new Error('Valid guide, start time, and end time are required.');
  }

  let units = 1;
  let unitLabel = 'days';

  if (rateType === 'hourly') {
    units = Math.max(1, Math.ceil(durationMs / (1000 * 60 * 60)));
    unitLabel = 'hours';
  } else {
    const diffDays = Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / (1000 * 60 * 60 * 24));
    units = Math.max(1, diffDays + 1);
    unitLabel = 'days';
  }

  const subtotal = roundCurrency(guideRate * units);
  const platformFeeRate = 0;
  const platformFeeAmount = 0;
  const totalAmount = subtotal + platformFeeAmount;
  const advanceAmount = calculateAdvanceAmount(totalAmount, guide);
  const remainingAmount = Math.max(totalAmount - advanceAmount, 0);

  return {
    rateType,
    guideRate,
    units,
    unitLabel,
    subtotal,
    platformFeeRate,
    platformFeeAmount,
    totalAmount,
    advanceAmount,
    remainingAmount
  };
};

const buildOverlapQueryForCreate = ({ guideId, startDateTime, endDateTime, excludeBookingId = null }) => {
  const holdWindowStart = new Date(Date.now() - HOLD_WINDOW_MS);
  const query = {
    guideId,
    startDateTime: { $lt: endDateTime },
    endDateTime: { $gt: startDateTime },
    $or: [
      { status: 'confirmed' },
      { status: 'pending', advancePaymentStatus: 'submitted' },
      { status: 'pending', advancePaymentStatus: 'awaiting_payment', createdAt: { $gte: holdWindowStart } },
      { status: 'pending', advancePaymentStatus: 'rejected', createdAt: { $gte: holdWindowStart } }
    ]
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }

  return query;
};

const buildOverlapQueryForApproval = ({ guideId, startDateTime, endDateTime, excludeBookingId }) => ({
  guideId,
  _id: { $ne: excludeBookingId },
  status: 'confirmed',
  startDateTime: { $lt: endDateTime },
  endDateTime: { $gt: startDateTime }
});

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const getDateKeysBetween = ({ startDateTime, endDateTime }) => {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  const startUtc = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const keys = [];
  const cursor = new Date(startUtc);

  while (cursor.getTime() <= endUtc.getTime()) {
    keys.push(toDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (keys.length > 370) break;
  }

  return keys;
};

const getTourDateKeys = (tour) => {
  const customDates = Array.isArray(tour?.schedule?.customDates) ? tour.schedule.customDates : [];
  return Array.from(new Set(customDates.map((value) => toDateKey(value)).filter(Boolean))).sort();
};

const findGuideTourDateConflictInRange = async ({ guideId, startDateTime, endDateTime }) => {
  const incomingKeys = getDateKeysBetween({ startDateTime, endDateTime });
  if (!guideId || incomingKeys.length === 0) return null;

  const existingTours = await Tour.find({ guideId })
    .select('_id title schedule.customDates')
    .lean();

  const incomingSet = new Set(incomingKeys);
  let earliestConflict = null;

  existingTours.forEach((tour) => {
    const conflictKey = getTourDateKeys(tour).find((dateKey) => incomingSet.has(dateKey));
    if (!conflictKey) return;

    if (!earliestConflict || conflictKey < earliestConflict.dateKey) {
      earliestConflict = {
        tourId: String(tour?._id || ''),
        title: String(tour?.title || 'Guide tour').trim() || 'Guide tour',
        dateKey: conflictKey
      };
    }
  });

  return earliestConflict;
};

const isTourSourceBooking = (booking) =>
  String(booking?.sourceType || '') === 'tour' &&
  booking?.sourceTourId &&
  booking?.sourceTourParticipantId;

const syncTourParticipantFromBooking = async (booking, { forceCancelled = false } = {}) => {
  if (!isTourSourceBooking(booking)) return;

  try {
    const tour = await Tour.findById(booking.sourceTourId);
    if (!tour) return;

    const participant = (tour.participants || []).find(
      (entry) => String(entry?._id || '') === String(booking.sourceTourParticipantId || '')
    );
    if (!participant) return;

    participant.bookingId = booking._id;
    participant.totalAmount = Number(booking.totalAmount || 0);
    participant.advanceAmount = Number(booking.advanceAmount || 0);
    participant.remainingAmount = Number(booking.remainingAmount || 0);
    participant.advancePaymentStatus = booking.advancePaymentStatus || participant.advancePaymentStatus || 'awaiting_payment';
    participant.advanceRejectedReason = String(booking.advanceRejectedReason || '').trim();
    participant.paymentWindowExpiresAt = booking.paymentWindowExpiresAt || null;

    if (forceCancelled || booking.status === 'cancelled') {
      participant.status = 'cancelled';
    } else if (booking.status === 'confirmed' || booking.status === 'completed' || booking.advancePaymentStatus === 'verified') {
      participant.status = 'confirmed';
    } else {
      participant.status = 'pending';
    }

    await tour.save();
  } catch (error) {
    console.warn('Tour participant sync failed:', error.message);
  }
};

const emitBookingUpdate = (booking) => {
  try {
    const io = getIO();
    if (!io) return;

    if (io.emitBookingUpdate) {
      io.emitBookingUpdate(String(booking.guideId), booking);
    }

    if (io.to) {
      io.to(`tourist_${String(booking.touristId)}`).emit('bookingUpdate', {
        touristId: String(booking.touristId),
        booking
      });
    }
  } catch (error) {
    console.warn('Socket booking update failed:', error.message);
  }
};

// Guide accepts or rejects a booking. Confirmation now requires verified advance payment.
router.patch('/status/:id', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    let { status } = req.body;
    if (status === 'accepted') status = 'confirmed';
    if (status === 'rejected') status = 'cancelled';

    if (!['confirmed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.guideId) !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });

    if (status === 'confirmed' && booking.advanceAmount > 0 && booking.advancePaymentStatus !== 'verified') {
      return res.status(400).json({ message: 'Verify the advance payment before confirming this booking.' });
    }

    if (status === 'confirmed' && !isTourSourceBooking(booking)) {
      const overlappingConfirmed = await Booking.findOne(
        buildOverlapQueryForApproval({
          guideId: booking.guideId,
          startDateTime: booking.startDateTime,
          endDateTime: booking.endDateTime,
          excludeBookingId: booking._id
        })
      );
      if (overlappingConfirmed) {
        return res.status(409).json({ message: 'Another confirmed booking already covers this time slot.' });
      }

      const tourConflict = await findGuideTourDateConflictInRange({
        guideId: booking.guideId,
        startDateTime: booking.startDateTime,
        endDateTime: booking.endDateTime
      });
      if (tourConflict) {
        return res.status(409).json({
          message: `Guide is unavailable on ${tourConflict.dateKey} due to tour "${tourConflict.title}".`
        });
      }
    }

    booking.status = status;
    await booking.save();
    await syncTourParticipantFromBooking(booking, { forceCancelled: status === 'cancelled' });
    emitBookingUpdate(booking);
    res.json({ message: 'Booking status updated', booking });
  } catch (err) {
    console.error('Error updating booking status:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Tourist can reschedule only while no payment proof has been submitted.
router.put('/:id', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.touristId) !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });
    if (isTourSourceBooking(booking)) {
      return res.status(400).json({ message: 'Tour-linked bookings cannot be rescheduled from this screen.' });
    }
    if (!['pending', 'cancelled'].includes(booking.status)) return res.status(400).json({ message: 'Cannot edit this booking' });
    if (!['awaiting_payment', 'rejected'].includes(booking.advancePaymentStatus)) {
      return res.status(400).json({ message: 'Advance payment has already been submitted. This booking can no longer be edited.' });
    }

    const { destination, destinationPricingId, startDateTime, endDateTime, guestCount, specialRequests } = req.body;
    const hasDestinationUpdate = destination !== undefined || destinationPricingId !== undefined;
    const hasTimeUpdate = Boolean(startDateTime || endDateTime);

    if (guestCount !== undefined) booking.guestCount = Math.max(1, Number(guestCount) || 1);
    if (specialRequests !== undefined) booking.specialRequests = String(specialRequests || '').trim();

    let nextStartDateTime = booking.startDateTime;
    let nextEndDateTime = booking.endDateTime;

    if (hasTimeUpdate) {
      const start = new Date(startDateTime || booking.startDateTime);
      const end = new Date(endDateTime || booking.endDateTime);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
        return res.status(400).json({ message: 'Valid start and end times are required.' });
      }
      nextStartDateTime = start;
      nextEndDateTime = end;
    }

    if (hasDestinationUpdate || hasTimeUpdate) {
      const guide = await Guide.findOne({ userId: booking.guideId });
      if (!guide) return res.status(404).json({ message: 'Guide profile not found' });

      const resolvedDestination = resolveGuideDestinationPricing({
        guide,
        destination: destination !== undefined ? destination : booking.destination,
        destinationPricingId
      });

      if (resolvedDestination.error) {
        return res.status(400).json({
          message: resolvedDestination.error,
          availableDestinations: resolvedDestination.availableDestinations
        });
      }

      if (hasTimeUpdate) {
        const overlappingBooking = await Booking.findOne(
          buildOverlapQueryForCreate({
            guideId: booking.guideId,
            startDateTime: nextStartDateTime,
            endDateTime: nextEndDateTime,
            excludeBookingId: booking._id
          })
        );

        if (overlappingBooking) {
          return res.status(409).json({ message: 'This guide is already booked for the selected date and time.' });
        }

        const tourConflict = await findGuideTourDateConflictInRange({
          guideId: booking.guideId,
          startDateTime: nextStartDateTime,
          endDateTime: nextEndDateTime
        });
        if (tourConflict) {
          return res.status(409).json({
            message: `Guide is unavailable on ${tourConflict.dateKey} due to tour "${tourConflict.title}".`
          });
        }
      }

      const pricing = calculatePricing({
        guide,
        startDateTime: nextStartDateTime,
        endDateTime: nextEndDateTime,
        destinationPricing: resolvedDestination.destinationPricing
      });

      booking.destination = resolvedDestination.destinationPricing.destination;
      booking.startDateTime = nextStartDateTime;
      booking.endDateTime = nextEndDateTime;
      booking.price = pricing.totalAmount;
      booking.totalAmount = pricing.totalAmount;
      booking.advanceAmount = pricing.advanceAmount;
      booking.remainingAmount = pricing.remainingAmount;
      booking.pricingSnapshot = {
        rateType: pricing.rateType,
        guideRate: pricing.guideRate,
        units: pricing.units,
        unitLabel: pricing.unitLabel,
        destinationId: resolvedDestination.destinationPricing.id || '',
        destinationLabel: resolvedDestination.destinationPricing.destination || '',
        subtotal: pricing.subtotal,
        platformFeeRate: pricing.platformFeeRate,
        platformFeeAmount: pricing.platformFeeAmount
      };
      booking.guidePaymentSnapshot = buildGuidePaymentSnapshot(guide);
      booking.paymentWindowExpiresAt = new Date(Date.now() + HOLD_WINDOW_MS);
    }

    await booking.save();
    await syncTourParticipantFromBooking(booking);
    res.json({ message: 'Booking updated', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a booking before the guide verifies advance payment.
router.delete('/:id', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.touristId) !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });
    if (!['pending', 'cancelled'].includes(booking.status)) return res.status(400).json({ message: 'Cannot delete this booking' });
    if (!['awaiting_payment', 'rejected'].includes(booking.advancePaymentStatus)) {
      return res.status(400).json({ message: 'Advance payment has already been submitted. Contact the guide for cancellation.' });
    }

    if (booking.advanceScreenshotPublicId) {
      await destroyAsset(booking.advanceScreenshotPublicId, { resource_type: 'image' }).catch(() => {});
    }

    if (isTourSourceBooking(booking)) {
      booking.status = 'cancelled';
      booking.paymentWindowExpiresAt = null;
      await syncTourParticipantFromBooking(booking, { forceCancelled: true });
    }

    await Booking.deleteOne({ _id: req.params.id });
    await Guide.findOneAndUpdate({ userId: booking.guideId }, { $pull: { bookings: booking._id } });
    res.json({ message: 'Booking deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all bookings for a specific tourist
router.get('/tourist/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ touristId: req.params.userId })
      .populate('guideId', 'name email country avatar price currency rateType');
    res.json({ bookings });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Tourist creates a booking request. Amounts are always calculated on the server.
router.post('/book', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const { guideId, startDateTime, endDateTime, destination, destinationPricingId, guestCount, specialRequests } = req.body;
    const touristId = req.user.userId;
    const start = new Date(startDateTime);
    const end = new Date(endDateTime);

    if (!guideId || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return res.status(400).json({ message: 'Valid guide, start time, and end time are required.' });
    }

    const guide = await Guide.findOne({ userId: guideId });
    if (!guide || !guide.approved) {
      return res.status(404).json({ message: 'Guide not found or not available for bookings.' });
    }

    if (guide.isAvailable === false) {
      return res.status(400).json({ message: 'This guide has paused bookings right now.' });
    }

    if (!hasManualUpiSetup(guide)) {
      return res.status(400).json({ message: 'This guide has not completed advance payment setup yet.' });
    }

    const resolvedDestination = resolveGuideDestinationPricing({
      guide,
      destination,
      destinationPricingId
    });

    if (resolvedDestination.error) {
      return res.status(400).json({
        message: resolvedDestination.error,
        availableDestinations: resolvedDestination.availableDestinations
      });
    }

    const overlappingBooking = await Booking.findOne(
      buildOverlapQueryForCreate({ guideId, startDateTime: start, endDateTime: end })
    );

    if (overlappingBooking) {
      return res.status(409).json({ message: 'This guide is already booked for the selected date and time.' });
    }

    const tourConflict = await findGuideTourDateConflictInRange({
      guideId,
      startDateTime: start,
      endDateTime: end
    });
    if (tourConflict) {
      return res.status(409).json({
        message: `Guide is unavailable on ${tourConflict.dateKey} due to tour "${tourConflict.title}".`
      });
    }

    const pricing = calculatePricing({
      guide,
      startDateTime: start,
      endDateTime: end,
      destinationPricing: resolvedDestination.destinationPricing
    });
    const paymentWindowExpiresAt = new Date(Date.now() + HOLD_WINDOW_MS);

    const booking = new Booking({
      touristId,
      guideId,
      startDateTime: start,
      endDateTime: end,
      destination: resolvedDestination.destinationPricing.destination,
      guestCount: Math.max(1, Number(guestCount) || 1),
      specialRequests: String(specialRequests || '').trim(),
      price: pricing.totalAmount,
      totalAmount: pricing.totalAmount,
      advanceAmount: pricing.advanceAmount,
      remainingAmount: pricing.remainingAmount,
      pricingSnapshot: {
        rateType: pricing.rateType,
        guideRate: pricing.guideRate,
        units: pricing.units,
        unitLabel: pricing.unitLabel,
        destinationId: resolvedDestination.destinationPricing.id || '',
        destinationLabel: resolvedDestination.destinationPricing.destination || '',
        subtotal: pricing.subtotal,
        platformFeeRate: pricing.platformFeeRate,
        platformFeeAmount: pricing.platformFeeAmount
      },
      guidePaymentSnapshot: buildGuidePaymentSnapshot(guide),
      advancePaymentStatus: pricing.advanceAmount > 0 ? 'awaiting_payment' : 'verified',
      remainingPaymentStatus: pricing.remainingAmount > 0 ? 'pending' : 'paid',
      paymentWindowExpiresAt,
      status: 'pending',
      messages: []
    });

    await booking.save();
    await Guide.findOneAndUpdate({ userId: guideId }, { $push: { bookings: booking._id } });
    emitBookingUpdate(booking);

    res.status(201).json({
      message: 'Booking created. Submit the advance payment proof to continue.',
      booking,
      paymentWindowMinutes: HOLD_WINDOW_MINUTES
    });
  } catch (err) {
    console.error('Booking creation error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Tourist submits the advance payment proof.
router.post('/:id/advance-payment', verifyToken, authorizeRoles('tourist'), (req, res) => {
  advanceProofUpload.single('screenshot')(req, res, async (uploadError) => {
    let uploaded = null;

    try {
      if (uploadError) {
        return res.status(400).json({ message: uploadError.message || 'Payment proof upload failed.' });
      }

      const booking = await Booking.findById(req.params.id);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      if (String(booking.touristId) !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });
      if (booking.status !== 'pending') return res.status(400).json({ message: 'Advance payment can only be submitted for pending bookings.' });
      if (!['awaiting_payment', 'rejected', 'submitted'].includes(booking.advancePaymentStatus)) {
        return res.status(400).json({ message: 'Advance payment is no longer editable for this booking.' });
      }

      const txnRef = String(req.body?.txnRef || '').trim();
      if (txnRef.length < UPI_REF_MIN_LENGTH) {
        return res.status(400).json({ message: 'Enter a valid UPI reference / UTR number.' });
      }

      if (req.file) {
        uploaded = await uploadAndCleanupLocalFile(req.file.path, {
          folder: `travel2/bookings/${booking._id}/advance-payment`,
          resource_type: 'image'
        });
      }

      const previousPublicId = booking.advanceScreenshotPublicId || '';
      booking.advanceTxnRef = txnRef;
      booking.advancePaymentStatus = 'submitted';
      booking.advanceSubmittedAt = new Date();
      booking.advanceRejectedReason = '';
      booking.paymentWindowExpiresAt = new Date(Date.now() + HOLD_WINDOW_MS);

      if (uploaded) {
        booking.advanceScreenshot = uploaded.secure_url;
        booking.advanceScreenshotPublicId = uploaded.public_id || '';
      }

      await booking.save();
      await syncTourParticipantFromBooking(booking);

      if (previousPublicId && uploaded) {
        await destroyAsset(previousPublicId, { resource_type: 'image' }).catch(() => {});
      }

      emitBookingUpdate(booking);
      res.json({ message: 'Advance payment proof submitted. The guide will verify it shortly.', booking });
    } catch (err) {
      await safeRemoveLocalFile(req.file?.path);
      if (uploaded?.public_id) {
        await destroyAsset(uploaded.public_id, { resource_type: 'image' }).catch(() => {});
      }
      console.error('Advance payment submission error:', err);
      res.status(500).json({ message: 'Server error', error: err.message });
    }
  });
});

// Guide verifies or rejects the submitted advance proof.
router.patch('/:id/verify-advance', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;
    if (!['approve', 'reject'].includes(String(action || ''))) {
      return res.status(400).json({ message: 'Action must be approve or reject.' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.guideId) !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });
    if (booking.status !== 'pending') return res.status(400).json({ message: 'Only pending bookings can be verified.' });

    if (action === 'approve') {
      if (booking.advancePaymentStatus !== 'submitted') {
        return res.status(400).json({ message: 'No submitted advance payment is waiting for verification.' });
      }

      const overlappingConfirmed = await Booking.findOne(
        buildOverlapQueryForApproval({
          guideId: booking.guideId,
          startDateTime: booking.startDateTime,
          endDateTime: booking.endDateTime,
          excludeBookingId: booking._id
        })
      );

      if (overlappingConfirmed) {
        return res.status(409).json({ message: 'Another confirmed booking already covers this time slot.' });
      }

      if (!isTourSourceBooking(booking)) {
        const tourConflict = await findGuideTourDateConflictInRange({
          guideId: booking.guideId,
          startDateTime: booking.startDateTime,
          endDateTime: booking.endDateTime
        });
        if (tourConflict) {
          return res.status(409).json({
            message: `Guide is unavailable on ${tourConflict.dateKey} due to tour "${tourConflict.title}".`
          });
        }
      }

      booking.advancePaymentStatus = 'verified';
      booking.advanceVerifiedAt = new Date();
      booking.advanceRejectedReason = '';
      booking.status = 'confirmed';
    } else {
      if (!['submitted', 'awaiting_payment', 'rejected'].includes(booking.advancePaymentStatus)) {
        return res.status(400).json({ message: 'This booking cannot be returned for payment resubmission.' });
      }
      booking.advancePaymentStatus = 'rejected';
      booking.advanceRejectedReason = String(rejectionReason || '').trim() || 'Payment proof was not sufficient. Please upload a clearer proof.';
      booking.advanceVerifiedAt = null;
      booking.status = 'pending';
      booking.paymentWindowExpiresAt = new Date(Date.now() + HOLD_WINDOW_MS);
    }

    await booking.save();
    await syncTourParticipantFromBooking(booking);
    emitBookingUpdate(booking);
    res.json({
      message: action === 'approve' ? 'Advance payment verified and booking confirmed.' : 'Advance payment rejected. The tourist can resubmit the proof.',
      booking
    });
  } catch (err) {
    console.error('Advance verification error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Guide records the remaining amount after receiving it directly during / after the tour.
router.patch('/:id/remaining-payment', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const { paymentMethod, notes } = req.body;
    const normalizedMethod = String(paymentMethod || '').trim();
    if (!ALLOWED_REMAINING_PAYMENT_METHODS.includes(normalizedMethod)) {
      return res.status(400).json({ message: 'Invalid remaining payment method.' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (String(booking.guideId) !== req.user.userId) return res.status(403).json({ message: 'Forbidden' });
    if (!['confirmed', 'completed'].includes(booking.status)) {
      return res.status(400).json({ message: 'Remaining payment can be marked only for confirmed or completed bookings.' });
    }
    if (booking.remainingAmount <= 0) {
      return res.status(400).json({ message: 'This booking does not have any remaining balance.' });
    }

    booking.remainingPaymentStatus = 'paid';
    booking.remainingPaymentMethod = normalizedMethod || 'other';
    booking.remainingPaymentNotes = String(notes || '').trim();
    booking.remainingPaidAt = new Date();
    await booking.save();

    emitBookingUpdate(booking);
    res.json({ message: 'Remaining balance marked as received.', booking });
  } catch (err) {
    console.error('Remaining payment update error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all bookings for a specific guide
router.get('/guide/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ guideId: req.params.userId })
      .populate('touristId', 'name email')
      .populate('guideId', 'name email rateType');
    res.json({ bookings });
  } catch (err) {
    console.error('Error fetching guide bookings:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Guide marks tour as completed and sends review request
router.post('/complete/:id', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const { message } = req.body;

    const booking = await Booking.findById(req.params.id).populate('touristId').populate('guideId');
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const bookingGuideId = booking.guideId?._id?.toString() || booking.guideId?.toString();
    if (bookingGuideId !== req.user.userId) {
      return res.status(403).json({ message: 'Forbidden - You are not the guide for this booking' });
    }

    if (!['confirmed', 'accepted'].includes(booking.status)) {
      return res.status(400).json({
        message: `Booking must be confirmed before completing tour. Current status: ${booking.status}`
      });
    }

    const tourEnd = new Date(booking.endDateTime);
    if (Number.isNaN(tourEnd.getTime())) {
      return res.status(400).json({ message: 'Invalid booking end date/time.' });
    }
    if (Date.now() < tourEnd.getTime()) {
      return res.status(400).json({
        message: `Tour can be completed only after ${tourEnd.toISOString()}.`
      });
    }

    booking.status = 'completed';
    booking.reviewRequestSent = true;
    booking.reviewRequestMessage = message || 'Thank you for completing this tour. Please leave a review!';
    booking.reviewRequestStatus = '';
    await booking.save();
    await syncTourParticipantFromBooking(booking);

    try {
      const notificationsModule = require('./notifications');
      const notifications = notificationsModule.notifications || [];

      const guideName = booking.guideId?.name || 'Guide';
      const touristId = booking.touristId?._id?.toString() || booking.touristId?.toString();
      const guideId = booking.guideId?._id?.toString() || booking.guideId?.toString();

      notifications.push({
        id: `${Date.now()}_${booking._id}`,
        touristId,
        guideName,
        tourName: booking.destination,
        message: message || 'Tour is completed. Please confirm and leave a review.',
        bookingId: booking._id.toString(),
        status: 'pending',
        guideId,
        createdAt: new Date()
      });
    } catch (e) {
      console.warn('Could not create booking completion notification:', e.message);
    }

    emitBookingUpdate(booking);
    res.json({ message: 'Tour marked as completed, review request sent', booking });
  } catch (err) {
    console.error('Error completing tour:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
