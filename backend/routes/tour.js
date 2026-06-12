const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const axios = require('axios');
const Tour = require('../models/Tour');
const Guide = require('../models/Guide');
const Booking = require('../models/Booking');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { uploadAndCleanupLocalFile, safeRemoveLocalFile, destroyAsset } = require('../utils/cloudinaryUpload');
const { cloudinary } = require('../config/cloudinary');

const router = express.Router();

const TOUR_UPLOAD_DIR = path.join(__dirname, '../uploads/tours');
fs.mkdirSync(TOUR_UPLOAD_DIR, { recursive: true });

const weekdayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const timeSlotOptions = ['Morning', 'Afternoon', 'Evening', 'Night'];
const HOLD_WINDOW_MINUTES = 30;
const HOLD_WINDOW_MS = HOLD_WINDOW_MINUTES * 60 * 1000;

const tourMediaStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, TOUR_UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.bin';
    cb(null, `tour_${req.user.userId}_${Date.now()}_${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const tourMediaFilter = (req, file, cb) => {
  const type = String(file.mimetype || '').toLowerCase();
  if (type.startsWith('image/') || type.startsWith('video/') || type === 'application/pdf') {
    cb(null, true);
    return;
  }
  cb(new Error('Only image, video, and PDF files are allowed.'));
};

const uploadTourMedia = multer({
  storage: tourMediaStorage,
  fileFilter: tourMediaFilter,
  limits: { fileSize: 90 * 1024 * 1024 }
});

const runTourMediaUpload = (req, res, next) => {
  uploadTourMedia.fields([
    { name: 'coverImage', maxCount: 1 },
    { name: 'galleryImages', maxCount: 40 },
    { name: 'videos', maxCount: 20 },
    { name: 'images360', maxCount: 20 },
    { name: 'itineraryPdf', maxCount: 1 }
  ])(req, res, (err) => {
    if (!err) {
      next();
      return;
    }
    res.status(400).json({ message: err.message || 'Tour media upload failed' });
  });
};

const normalizeString = (value, fallback = '') => {
  if (typeof value !== 'string') return fallback;
  return value.trim();
};

const normalizeNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return numeric;
};

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
  }
  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  return fallback;
};

const parseMaybeJson = (value, fallback) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  if (typeof value !== 'string') return fallback;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return fallback;
  }
};

const normalizeDate = (value, fallback = null) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date;
};

const normalizeDateList = (value) => {
  const raw = Array.isArray(value) ? value : parseMaybeJson(value, []);
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => normalizeDate(entry, null))
    .filter((dateValue) => dateValue instanceof Date && !Number.isNaN(dateValue.getTime()));
};

const normalizeDiscount = (value = {}) => ({
  enabled: normalizeBoolean(value.enabled, false),
  type: value?.type === 'flat' ? 'flat' : 'percent',
  value: Math.max(0, normalizeNumber(value.value, 0))
});

const normalizePricing = (value = {}) => {
  const seasonalPricing = Array.isArray(value?.seasonalPricing) ? value.seasonalPricing : [];
  return {
    currency: 'INR',
    pricePerPerson: Math.max(0, normalizeNumber(value.pricePerPerson, 0)),
    groupPricing: Math.max(0, normalizeNumber(value.groupPricing, 0)),
    couplePricing: Math.max(0, normalizeNumber(value.couplePricing, 0)),
    childPricing: Math.max(0, normalizeNumber(value.childPricing, 0)),
    weekendPricing: Math.max(0, normalizeNumber(value.weekendPricing, 0)),
    seasonalPricing: seasonalPricing.map((item) => ({
      label: normalizeString(item?.label),
      startDate: normalizeDate(item?.startDate, null),
      endDate: normalizeDate(item?.endDate, null),
      pricePerPerson: Math.max(0, normalizeNumber(item?.pricePerPerson, 0)),
      weekendPrice: Math.max(0, normalizeNumber(item?.weekendPrice, 0))
    })),
    additionalCharges: {
      taxes: Math.max(0, normalizeNumber(value?.additionalCharges?.taxes, 0)),
      equipmentFees: Math.max(0, normalizeNumber(value?.additionalCharges?.equipmentFees, 0)),
      entryTickets: Math.max(0, normalizeNumber(value?.additionalCharges?.entryTickets, 0)),
      foodCharges: Math.max(0, normalizeNumber(value?.additionalCharges?.foodCharges, 0))
    },
    discounts: {
      earlyBird: normalizeDiscount(value?.discounts?.earlyBird),
      festivalOffer: normalizeDiscount(value?.discounts?.festivalOffer),
      couponCode: normalizeString(value?.discounts?.couponCode),
      couponDiscount: Math.max(0, normalizeNumber(value?.discounts?.couponDiscount, 0)),
      referralDiscount: Math.max(0, normalizeNumber(value?.discounts?.referralDiscount, 0))
    }
  };
};

const normalizeSchedule = (value = {}) => {
  const weeklyDays = Array.isArray(value?.weeklyDays) ? value.weeklyDays : [];
  const timeSlots = Array.isArray(value?.timeSlots) ? value.timeSlots : [];
  const customTimeSlots = Array.isArray(value?.customTimeSlots) ? value.customTimeSlots : [];
  const minTravelers = Math.max(1, normalizeNumber(value.minTravelers, 1));
  const maxTravelers = Math.max(minTravelers, normalizeNumber(value.maxTravelers, 10));
  return {
    availabilityType: ['daily', 'weekly', 'custom', 'recurring'].includes(value?.availabilityType)
      ? value.availabilityType
      : 'weekly',
    weeklyDays: weeklyDays.filter((day) => weekdayOptions.includes(day)),
    customDates: normalizeDateList(value?.customDates),
    recurring: {
      frequency: ['daily', 'weekly', 'monthly'].includes(value?.recurring?.frequency)
        ? value.recurring.frequency
        : 'weekly',
      interval: Math.max(1, normalizeNumber(value?.recurring?.interval, 1)),
      startDate: normalizeDate(value?.recurring?.startDate, null),
      endDate: normalizeDate(value?.recurring?.endDate, null)
    },
    timeSlots: timeSlots.filter((slot) => timeSlotOptions.includes(slot)),
    customTimeSlots: customTimeSlots
      .map((slot) => ({
        label: normalizeString(slot?.label),
        startTime: normalizeString(slot?.startTime),
        endTime: normalizeString(slot?.endTime)
      }))
      .filter((slot) => slot.label || slot.startTime || slot.endTime),
    minTravelers,
    maxTravelers,
    blockedDates: normalizeDateList(value?.blockedDates),
    autoCloseWhenFull: normalizeBoolean(value?.autoCloseWhenFull, true),
    googleCalendarSync: {
      enabled: normalizeBoolean(value?.googleCalendarSync?.enabled, false),
      calendarEmail: normalizeString(value?.googleCalendarSync?.calendarEmail),
      lastSyncedAt: normalizeDate(value?.googleCalendarSync?.lastSyncedAt, null)
    }
  };
};

const normalizeSmartFeatures = (value = {}) => ({
  autoImageCompression: normalizeBoolean(value?.autoImageCompression, true),
  aiImageEnhancement: normalizeBoolean(value?.aiImageEnhancement, false)
});

const normalizeSocialSettings = (value = {}) => ({
  allowLikes: normalizeBoolean(value?.allowLikes, true),
  allowFollowing: normalizeBoolean(value?.allowFollowing, true)
});

const extractScalarFields = (body = {}) => ({
  title: normalizeString(body.title),
  shortDescription: normalizeString(body.shortDescription),
  fullDescription: normalizeString(body.fullDescription),
  category: normalizeString(body.category),
  destination: normalizeString(body.destination),
  meetingPoint: normalizeString(body.meetingPoint),
  durationType: normalizeString(body.durationType),
  tourType: normalizeString(body.tourType),
  difficultyLevel: normalizeString(body.difficultyLevel),
  ageRestriction: normalizeString(body.ageRestriction),
  status: normalizeString(body.status) || 'published'
});

const validateRequiredTourFields = (payload) => {
  const requiredFields = [
    ['title', payload.title],
    ['shortDescription', payload.shortDescription],
    ['fullDescription', payload.fullDescription],
    ['category', payload.category],
    ['destination', payload.destination],
    ['meetingPoint', payload.meetingPoint],
    ['durationType', payload.durationType],
    ['tourType', payload.tourType],
    ['difficultyLevel', payload.difficultyLevel],
    ['ageRestriction', payload.ageRestriction]
  ];

  const missing = requiredFields.filter(([, value]) => !value).map(([key]) => key);
  if (missing.length > 0) {
    return `Missing required fields: ${missing.join(', ')}`;
  }

  const validDuration = ['2 hours', 'Half day', 'Full day', 'Multi-day'].includes(payload.durationType);
  if (!validDuration) return 'Invalid duration type.';

  const validTourType = ['Private Tour', 'Group Tour', 'Online Tour', 'Custom Tour'].includes(payload.tourType);
  if (!validTourType) return 'Invalid tour type.';

  const validDifficulty = ['Easy', 'Moderate', 'Hard'].includes(payload.difficultyLevel);
  if (!validDifficulty) return 'Invalid difficulty level.';

  const validAgeRestriction = ['Kids', 'Adults only', 'Family-friendly'].includes(payload.ageRestriction);
  if (!validAgeRestriction) return 'Invalid age restriction.';

  return '';
};

const startOfDay = (dateValue) => new Date(dateValue.getFullYear(), dateValue.getMonth(), dateValue.getDate());

const validateFutureTourDates = (schedule = {}) => {
  const rawDates = Array.isArray(schedule?.customDates) ? schedule.customDates : [];
  if (rawDates.length === 0) {
    return 'Please select tour dates. Start date must be from tomorrow.';
  }

  const parsedDates = rawDates
    .map((entry) => {
      const date = entry instanceof Date ? entry : new Date(entry);
      return Number.isNaN(date.getTime()) ? null : date;
    })
    .filter(Boolean);

  if (parsedDates.length === 0) {
    return 'Invalid tour dates. Please select future dates only.';
  }

  const tomorrow = startOfDay(new Date());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowEpoch = tomorrow.getTime();

  const hasPastOrToday = parsedDates.some((entry) => startOfDay(entry).getTime() < tomorrowEpoch);
  if (hasPastOrToday) {
    return 'Tour dates must be future dates only (tomorrow onwards).';
  }

  const orderedDates = [...parsedDates].sort((a, b) => a.getTime() - b.getTime());
  if (orderedDates[orderedDates.length - 1].getTime() < orderedDates[0].getTime()) {
    return 'End date cannot be before start date.';
  }

  return '';
};

const toDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const getTomorrowDateKey = () => {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return toDateKey(tomorrow);
};

const getScheduleDateKeys = (schedule = {}) => {
  const customDates = Array.isArray(schedule?.customDates) ? schedule.customDates : [];
  return Array.from(
    new Set(customDates.map((date) => toDateKey(date)).filter(Boolean))
  ).sort();
};

const hasMultipleScheduleDates = (schedule = {}) => getScheduleDateKeys(schedule).length > 1;

const getFutureScheduleDateKeys = (tour) => {
  const tomorrowKey = getTomorrowDateKey();
  return getScheduleDateKeys(tour?.schedule).filter((key) => key >= tomorrowKey);
};

const isMultiDayTour = (tour) =>
  String(tour?.durationType || '').toLowerCase() === 'multi-day' ||
  hasMultipleScheduleDates(tour?.schedule);

const getPackageRangeFromKeys = (dateKeys = []) => {
  if (!Array.isArray(dateKeys) || dateKeys.length === 0) {
    return { startKey: '', endKey: '', packageDays: 0 };
  }
  return {
    startKey: dateKeys[0],
    endKey: dateKeys[dateKeys.length - 1],
    packageDays: dateKeys.length
  };
};

const formatDateKeyForMessage = (dateKey) => {
  if (!dateKey) return 'selected date';
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const findGuideTourDateConflict = async ({ guideId, dateKeys = [], excludeTourId = '' }) => {
  const normalizedKeys = Array.from(
    new Set(
      (Array.isArray(dateKeys) ? dateKeys : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  ).sort();
  if (!guideId || normalizedKeys.length === 0) return null;

  const filter = { guideId };
  const excludeId = normalizeString(excludeTourId || '');
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const existingTours = await Tour.find(filter)
    .select('_id title schedule.customDates')
    .lean();

  const incomingSet = new Set(normalizedKeys);
  let earliestConflict = null;

  existingTours.forEach((tour) => {
    const existingKeys = getScheduleDateKeys(tour?.schedule);
    const conflictKey = existingKeys.find((key) => incomingSet.has(key));
    if (!conflictKey) return;

    if (!earliestConflict || conflictKey < earliestConflict.dateKey) {
      earliestConflict = {
        tourId: String(tour?._id || ''),
        title: normalizeString(tour?.title || 'Existing tour'),
        dateKey: conflictKey
      };
    }
  });

  return earliestConflict;
};

const getDateKeysBetweenDateTimes = ({ startDateTime, endDateTime }) => {
  const start = new Date(startDateTime);
  const end = new Date(endDateTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  const startUtc = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const endUtc = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  const dateKeys = [];
  const cursor = new Date(startUtc);

  while (cursor.getTime() <= endUtc.getTime()) {
    dateKeys.push(toDateKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    if (dateKeys.length > 370) break;
  }

  return dateKeys;
};

const getBookingDateKeys = (booking) =>
  getDateKeysBetweenDateTimes({
    startDateTime: booking?.startDateTime,
    endDateTime: booking?.endDateTime
  });

const findGuideBookingDateConflict = async ({ guideId, dateKeys = [], excludeTourId = '' }) => {
  const normalizedKeys = Array.from(
    new Set(
      (Array.isArray(dateKeys) ? dateKeys : [])
        .map((value) => String(value || '').trim())
        .filter(Boolean)
    )
  ).sort();
  if (!guideId || normalizedKeys.length === 0) return null;

  const holdWindowStart = new Date(Date.now() - HOLD_WINDOW_MS);
  const filter = {
    guideId,
    startDateTime: { $type: 'date' },
    endDateTime: { $type: 'date' },
    $or: [
      { status: 'confirmed' },
      { status: 'pending', advancePaymentStatus: 'submitted' },
      { status: 'pending', advancePaymentStatus: 'awaiting_payment', createdAt: { $gte: holdWindowStart } },
      { status: 'pending', advancePaymentStatus: 'rejected', createdAt: { $gte: holdWindowStart } }
    ]
  };

  const excludeId = normalizeString(excludeTourId || '');
  if (excludeId) {
    filter.$and = [
      {
        $or: [
          { sourceType: { $ne: 'tour' } },
          { sourceTourId: { $ne: excludeId } }
        ]
      }
    ];
  }

  const activeBookings = await Booking.find(filter)
    .select('_id destination startDateTime endDateTime sourceType sourceTourId')
    .lean();

  const incomingSet = new Set(normalizedKeys);
  let earliestConflict = null;

  activeBookings.forEach((booking) => {
    const conflictKey = getBookingDateKeys(booking).find((key) => incomingSet.has(key));
    if (!conflictKey) return;

    if (!earliestConflict || conflictKey < earliestConflict.dateKey) {
      earliestConflict = {
        bookingId: String(booking?._id || ''),
        title: normalizeString(booking?.destination || 'Existing booking'),
        dateKey: conflictKey
      };
    }
  });

  return earliestConflict;
};

const roundCurrency = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return 0;
  return Math.round(numeric);
};

const hasManualUpiSetup = (guide) =>
  Boolean(guide?.acceptManualUpi && guide?.upiId && guide?.upiPayeeName && guide?.upiQrImage);

const buildGuidePaymentSnapshot = (guide) => ({
  payeeName: normalizeString(guide?.upiPayeeName || ''),
  upiId: normalizeString(guide?.upiId || ''),
  qrImage: normalizeString(guide?.upiQrImage || ''),
  advancePaymentType: guide?.advancePaymentType === 'fixed' ? 'fixed' : 'percentage',
  advancePaymentValue: Number(guide?.advancePaymentValue || 0),
  advancePaymentNotes: normalizeString(guide?.advancePaymentNotes || '')
});

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

const calculateTourParticipantPricing = ({ tour, guide, seats }) => {
  const safeSeats = Math.max(1, Number(seats || 1));
  const pricePerPerson = roundCurrency(tour?.pricing?.pricePerPerson || 0);
  const totalAmount = roundCurrency(pricePerPerson * safeSeats);
  const advanceAmount = calculateAdvanceAmount(totalAmount, guide);
  const remainingAmount = Math.max(totalAmount - advanceAmount, 0);

  return {
    pricePerPerson,
    seats: safeSeats,
    totalAmount,
    advanceAmount,
    remainingAmount
  };
};

const isPendingPaymentWindowActive = (participant) => {
  const expiry = participant?.paymentWindowExpiresAt ? new Date(participant.paymentWindowExpiresAt) : null;
  if (!expiry || Number.isNaN(expiry.getTime())) return false;
  return expiry.getTime() > Date.now();
};

const isParticipantSeatReserved = (participant) => {
  const status = String(participant?.status || '').toLowerCase() || 'confirmed';
  if (status === 'confirmed') return true;
  if (status !== 'pending') return false;

  const advanceStatus = String(participant?.advancePaymentStatus || 'awaiting_payment').toLowerCase();
  if (advanceStatus === 'submitted') return true;
  if (['awaiting_payment', 'rejected'].includes(advanceStatus)) {
    return isPendingPaymentWindowActive(participant);
  }
  return false;
};

const buildSeatSnapshot = (tour) => {
  const maxSeats = Math.max(1, Number(tour?.schedule?.maxTravelers || 1));
  const scheduleDateKeys = getFutureScheduleDateKeys(tour);
  const participants = Array.isArray(tour?.participants) ? tour.participants : [];

  if (isMultiDayTour(tour)) {
    const { startKey, endKey, packageDays } = getPackageRangeFromKeys(scheduleDateKeys);
    const totalBookedSeats = participants.reduce((sum, participant) => {
      if (!isParticipantSeatReserved(participant)) return sum;
      const seats = Math.max(1, Number(participant?.seats || 1));
      return sum + seats;
    }, 0);
    const remainingSeats = Math.max(0, maxSeats - totalBookedSeats);
    const availability = startKey
      ? [
          {
            date: startKey,
            endDate: endKey || startKey,
            packageDays: Math.max(1, packageDays),
            bookedSeats: totalBookedSeats,
            remainingSeats,
            isFull: remainingSeats <= 0,
            isPackage: true
          }
        ]
      : [];

    return {
      maxSeats,
      totalBookedSeats,
      availability
    };
  }

  const bookedByDate = participants.reduce((acc, participant) => {
    if (!isParticipantSeatReserved(participant)) return acc;
    const key = toDateKey(participant?.tourDate);
    if (!key) return acc;
    const seats = Math.max(1, Number(participant?.seats || 1));
    acc[key] = (acc[key] || 0) + seats;
    return acc;
  }, {});

  const availability = scheduleDateKeys.map((dateKey) => {
    const bookedSeats = Number(bookedByDate[dateKey] || 0);
    const remainingSeats = Math.max(0, maxSeats - bookedSeats);
    return {
      date: dateKey,
      bookedSeats,
      remainingSeats,
      isFull: remainingSeats <= 0
    };
  });

  const totalBookedSeats = availability.reduce((sum, item) => sum + item.bookedSeats, 0);

  return {
    maxSeats,
    totalBookedSeats,
    availability
  };
};

const serializeTour = (tourDoc) => {
  const tour = typeof tourDoc?.toObject === 'function' ? tourDoc.toObject() : { ...(tourDoc || {}) };
  const seatSnapshot = buildSeatSnapshot(tour);
  return {
    ...tour,
    seatSummary: seatSnapshot
  };
};

const emitTourParticipationUpdate = ({ guideId, touristId, tour, participant, action = 'joined' }) => {
  try {
    const setupSocket = require('../socket/chat');
    const io = setupSocket?.ioInstance;
    if (!io || typeof io.emitBookingUpdate !== 'function') return;

    const safeTour = tour || {};
    const safeParticipant = participant || {};
    io.emitBookingUpdate(String(guideId || ''), {
      touristId,
      type: 'tour_participation',
      action,
      tourId: safeTour._id || null,
      tourTitle: safeTour.title || '',
      destination: safeTour.destination || '',
      seats: Number(safeParticipant.seats || 0),
      tourDate: safeParticipant.tourDate || null
    });
  } catch (err) {
    console.warn('Socket tour participation update failed:', err.message);
  }
};

const isPdfBuffer = (buffer) => {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;
  return buffer.subarray(0, 4).toString('utf8') === '%PDF';
};

const fetchPdfByUrl = async (url, source = 'direct') => {
  if (!url) {
    return { ok: false, source, message: 'Missing URL' };
  }

  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 18000,
      maxRedirects: 5,
      validateStatus: () => true
    });

    const status = Number(response?.status || 0);
    const dataBuffer = Buffer.from(response?.data || []);
    const contentType = String(response?.headers?.['content-type'] || '').toLowerCase();
    const isPdfType = contentType.includes('application/pdf');
    const isPdf = isPdfType || isPdfBuffer(dataBuffer);

    if (status >= 200 && status < 300 && isPdf) {
      return {
        ok: true,
        source,
        status,
        buffer: dataBuffer,
        contentType: 'application/pdf'
      };
    }

    return {
      ok: false,
      source,
      status,
      message: `Unexpected response status/type (${status}, ${contentType || 'unknown'})`
    };
  } catch (err) {
    return {
      ok: false,
      source,
      message: err?.message || 'Request failed'
    };
  }
};

const flattenFiles = (filesMap = {}) =>
  Object.values(filesMap || {}).reduce((acc, value) => acc.concat(value || []), []);

const uploadTourAsset = async ({ file, guideId, folderName }) => {
  const resourceType = file?.mimetype === 'application/pdf' ? 'raw' : 'auto';
  const uploaded = await uploadAndCleanupLocalFile(file.path, {
    folder: `travel2/tours/${guideId}/${folderName}`,
    resource_type: resourceType
  });
  return {
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    resourceType: uploaded.resource_type || resourceType,
    originalName: file.originalname || '',
    uploadedAt: new Date()
  };
};

const removeLocalTempFiles = async (files = []) => {
  await Promise.all(files.map((file) => safeRemoveLocalFile(file?.path)));
};

const destroyCloudinaryAssets = async (assets = []) => {
  await Promise.all(
    assets
      .filter((asset) => asset?.publicId)
      .map((asset) =>
        destroyAsset(asset.publicId, {
          resource_type: asset.resourceType || 'image'
        }).catch(() => {})
      )
  );
};

router.get('/guide/:guideId', verifyToken, async (req, res) => {
  try {
    const { guideId } = req.params;
    const requesterId = String(req.user.userId || '');
    const requesterRole = String(req.user.role || '');
    if (requesterId !== String(guideId) && requesterRole !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to view these tours.' });
    }

    const tours = await Tour.find({ guideId })
      .sort({ createdAt: -1 })
      .populate('participants.touristId', 'name email avatar')
      .lean();
    return res.json({ tours: tours.map((tour) => serializeTour(tour)) });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch guide tours.', error: err.message });
  }
});

router.get('/explore', async (req, res) => {
  try {
    const searchText = normalizeString(req.query.search || '');
    const destinationText = normalizeString(req.query.destination || '');
    const guideIdFilter = normalizeString(req.query.guideId || '');

    const filter = {
      status: 'published'
    };

    if (guideIdFilter) {
      filter.guideId = guideIdFilter;
    }

    if (searchText) {
      filter.$or = [
        { title: { $regex: searchText, $options: 'i' } },
        { shortDescription: { $regex: searchText, $options: 'i' } },
        { destination: { $regex: searchText, $options: 'i' } }
      ];
    }

    if (destinationText) {
      filter.destination = { $regex: destinationText, $options: 'i' };
    }

    const tours = await Tour.find(filter)
      .sort({ createdAt: -1 })
      .populate('guideId', 'name avatar country email')
      .lean();

    const serialized = tours
      .map((tour) => {
        const data = serializeTour(tour);
        delete data.participants;
        return data;
      })
      .filter((tour) => Array.isArray(tour?.seatSummary?.availability) && tour.seatSummary.availability.length > 0);

    return res.json({ tours: serialized });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to explore tours.', error: err.message });
  }
});

router.get('/:tourId/itinerary-pdf', async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.tourId)
      .select('title status media.itineraryPdf')
      .lean();
    if (!tour) return res.status(404).json({ message: 'Tour not found.' });

    const directUrl = normalizeString(tour?.media?.itineraryPdf?.url || '');
    const publicId = normalizeString(tour?.media?.itineraryPdf?.publicId || '');
    if (!directUrl && !publicId) {
      return res.status(404).json({ message: 'Itinerary PDF is not available for this tour.' });
    }

    const attempts = [];

    if (publicId) {
      try {
        const signedUrl = cloudinary.utils.private_download_url(publicId, 'pdf', {
          resource_type: 'raw',
          type: 'upload',
          expires_at: Math.floor(Date.now() / 1000) + 300,
          attachment: false
        });
        const signedResult = await fetchPdfByUrl(signedUrl, 'signed_cloudinary');
        if (signedResult.ok) {
          const fileName = `${normalizeString(tour.title || 'itinerary').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'itinerary'}.pdf`;
          res.setHeader('Content-Type', signedResult.contentType || 'application/pdf');
          res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
          return res.send(signedResult.buffer);
        }
        attempts.push({
          source: signedResult.source,
          status: signedResult.status || 0,
          message: signedResult.message || 'Signed Cloudinary fetch failed'
        });
      } catch (err) {
        attempts.push({
          source: 'signed_cloudinary',
          status: 0,
          message: err?.message || 'Signed URL generation failed'
        });
      }
    }

    if (directUrl) {
      const directResult = await fetchPdfByUrl(directUrl, 'direct_url');
      if (directResult.ok) {
        const fileName = `${normalizeString(tour.title || 'itinerary').replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'itinerary'}.pdf`;
        res.setHeader('Content-Type', directResult.contentType || 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
        return res.send(directResult.buffer);
      }
      attempts.push({
        source: directResult.source,
        status: directResult.status || 0,
        message: directResult.message || 'Direct itinerary URL failed'
      });
    }

    return res.status(502).json({
      message: 'Failed to load itinerary PDF from media provider.',
      attempts
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to open itinerary PDF.', error: err.message });
  }
});

router.get('/:tourId', async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.tourId)
      .populate('guideId', 'name avatar country email')
      .populate('participants.touristId', 'name email avatar')
      .lean();
    if (!tour) return res.status(404).json({ message: 'Tour not found.' });
    return res.json({ tour: serializeTour(tour) });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch tour.', error: err.message });
  }
});

router.post('/', verifyToken, authorizeRoles('guide'), runTourMediaUpload, async (req, res) => {
  const uploadedAssets = [];
  const allTempFiles = flattenFiles(req.files);

  try {
    const scalarPayload = extractScalarFields(req.body);
    const validationError = validateRequiredTourFields(scalarPayload);
    if (validationError) {
      await removeLocalTempFiles(allTempFiles);
      return res.status(400).json({ message: validationError });
    }

    const pricing = normalizePricing(parseMaybeJson(req.body.pricing, {}));
    const schedule = normalizeSchedule(parseMaybeJson(req.body.schedule, {}));
    const scheduleError = validateFutureTourDates(schedule);
    if (scheduleError) {
      await removeLocalTempFiles(allTempFiles);
      return res.status(400).json({ message: scheduleError });
    }
    const scheduleDateKeys = getScheduleDateKeys(schedule);
    const dateConflict = await findGuideTourDateConflict({
      guideId: req.user.userId,
      dateKeys: scheduleDateKeys
    });
    if (dateConflict) {
      await removeLocalTempFiles(allTempFiles);
      return res.status(409).json({
        message: `Date conflict: you already organized "${dateConflict.title}" on ${formatDateKeyForMessage(dateConflict.dateKey)}. Please start the next tour after current tour dates are over.`,
        conflict: dateConflict
      });
    }
    const bookingDateConflict = await findGuideBookingDateConflict({
      guideId: req.user.userId,
      dateKeys: scheduleDateKeys
    });
    if (bookingDateConflict) {
      await removeLocalTempFiles(allTempFiles);
      return res.status(409).json({
        message: `Date conflict: you already have a booking "${bookingDateConflict.title}" on ${formatDateKeyForMessage(bookingDateConflict.dateKey)}. Please choose free dates.`,
        conflict: bookingDateConflict
      });
    }
    const smartFeatures = normalizeSmartFeatures(parseMaybeJson(req.body.smartFeatures, {}));
    const socialSettings = normalizeSocialSettings(parseMaybeJson(req.body.socialSettings, {}));

    const coverFile = req.files?.coverImage?.[0];
    const galleryFiles = req.files?.galleryImages || [];
    const videoFiles = req.files?.videos || [];
    const images360Files = req.files?.images360 || [];
    const itineraryPdfFile = req.files?.itineraryPdf?.[0];

    const coverImage = coverFile ? await uploadTourAsset({ file: coverFile, guideId: req.user.userId, folderName: 'cover' }) : {};
    if (coverImage?.publicId) uploadedAssets.push(coverImage);

    const galleryAssets = [];
    for (const file of galleryFiles) {
      const asset = await uploadTourAsset({ file, guideId: req.user.userId, folderName: 'gallery' });
      galleryAssets.push(asset);
      uploadedAssets.push(asset);
    }

    const videoAssets = [];
    for (const file of videoFiles) {
      const asset = await uploadTourAsset({ file, guideId: req.user.userId, folderName: 'videos' });
      videoAssets.push(asset);
      uploadedAssets.push(asset);
    }

    const image360Assets = [];
    for (const file of images360Files) {
      const asset = await uploadTourAsset({ file, guideId: req.user.userId, folderName: 'images-360' });
      image360Assets.push(asset);
      uploadedAssets.push(asset);
    }

    const itineraryPdf = itineraryPdfFile
      ? await uploadTourAsset({ file: itineraryPdfFile, guideId: req.user.userId, folderName: 'itinerary' })
      : {};
    if (itineraryPdf?.publicId) uploadedAssets.push(itineraryPdf);

    const tour = await Tour.create({
      guideId: req.user.userId,
      ...scalarPayload,
      pricing,
      schedule,
      smartFeatures,
      socialSettings,
      media: {
        coverImage,
        images: galleryAssets,
        videos: videoAssets,
        images360: image360Assets,
        itineraryPdf
      },
      likes: [],
      followers: [],
      likesCount: 0,
      followersCount: 0
    });

    return res.status(201).json({ message: 'Tour created successfully.', tour });
  } catch (err) {
    await removeLocalTempFiles(allTempFiles);
    await destroyCloudinaryAssets(uploadedAssets);
    return res.status(500).json({ message: 'Failed to create tour.', error: err.message });
  }
});

router.put('/:tourId', verifyToken, authorizeRoles('guide'), runTourMediaUpload, async (req, res) => {
  const uploadedAssets = [];
  const allTempFiles = flattenFiles(req.files);
  const assetsToDestroyAfterSave = [];

  try {
    const tour = await Tour.findOne({ _id: req.params.tourId, guideId: req.user.userId });
    if (!tour) {
      await removeLocalTempFiles(allTempFiles);
      return res.status(404).json({ message: 'Tour not found or not owned by guide.' });
    }

    const scalarPayload = extractScalarFields(req.body);
    const mergedPayload = {
      title: scalarPayload.title || tour.title,
      shortDescription: scalarPayload.shortDescription || tour.shortDescription,
      fullDescription: scalarPayload.fullDescription || tour.fullDescription,
      category: scalarPayload.category || tour.category,
      destination: scalarPayload.destination || tour.destination,
      meetingPoint: scalarPayload.meetingPoint || tour.meetingPoint,
      durationType: scalarPayload.durationType || tour.durationType,
      tourType: scalarPayload.tourType || tour.tourType,
      difficultyLevel: scalarPayload.difficultyLevel || tour.difficultyLevel,
      ageRestriction: scalarPayload.ageRestriction || tour.ageRestriction
    };
    const validationError = validateRequiredTourFields(mergedPayload);
    if (validationError) {
      await removeLocalTempFiles(allTempFiles);
      return res.status(400).json({ message: validationError });
    }

    const parsedRemoveGalleryImageIds = parseMaybeJson(req.body.removeGalleryImageIds, []);
    const parsedRemoveVideoIds = parseMaybeJson(req.body.removeVideoIds, []);
    const parsedRemove360ImageIds = parseMaybeJson(req.body.remove360ImageIds, []);
    const removeGalleryImageIds = Array.isArray(parsedRemoveGalleryImageIds) ? parsedRemoveGalleryImageIds : [];
    const removeVideoIds = Array.isArray(parsedRemoveVideoIds) ? parsedRemoveVideoIds : [];
    const remove360ImageIds = Array.isArray(parsedRemove360ImageIds) ? parsedRemove360ImageIds : [];
    const removeCoverImage = normalizeBoolean(req.body.removeCoverImage, false);
    const removeItineraryPdf = normalizeBoolean(req.body.removeItineraryPdf, false);
    const parsedGalleryCombinedOrder = parseMaybeJson(req.body.galleryCombinedOrder, []);
    const galleryCombinedOrder = Array.isArray(parsedGalleryCombinedOrder) ? parsedGalleryCombinedOrder : [];

    const currentMedia = tour.media || {};
    const existingGallery = Array.isArray(currentMedia.images) ? currentMedia.images : [];
    const existingVideos = Array.isArray(currentMedia.videos) ? currentMedia.videos : [];
    const existing360 = Array.isArray(currentMedia.images360) ? currentMedia.images360 : [];

    let nextCoverImage = currentMedia.coverImage || {};
    let nextItineraryPdf = currentMedia.itineraryPdf || {};

    const retainedGallery = existingGallery.filter((asset) => {
      const shouldRemove = removeGalleryImageIds.includes(String(asset?._id));
      if (shouldRemove) assetsToDestroyAfterSave.push(asset);
      return !shouldRemove;
    });

    const retainedVideos = existingVideos.filter((asset) => {
      const shouldRemove = removeVideoIds.includes(String(asset?._id));
      if (shouldRemove) assetsToDestroyAfterSave.push(asset);
      return !shouldRemove;
    });

    const retained360 = existing360.filter((asset) => {
      const shouldRemove = remove360ImageIds.includes(String(asset?._id));
      if (shouldRemove) assetsToDestroyAfterSave.push(asset);
      return !shouldRemove;
    });

    if (removeCoverImage && nextCoverImage?.publicId) {
      assetsToDestroyAfterSave.push(nextCoverImage);
      nextCoverImage = {};
    }

    if (removeItineraryPdf && nextItineraryPdf?.publicId) {
      assetsToDestroyAfterSave.push(nextItineraryPdf);
      nextItineraryPdf = {};
    }

    const coverFile = req.files?.coverImage?.[0];
    const galleryFiles = req.files?.galleryImages || [];
    const videoFiles = req.files?.videos || [];
    const images360Files = req.files?.images360 || [];
    const itineraryPdfFile = req.files?.itineraryPdf?.[0];

    if (coverFile) {
      if (nextCoverImage?.publicId) assetsToDestroyAfterSave.push(nextCoverImage);
      nextCoverImage = await uploadTourAsset({ file: coverFile, guideId: req.user.userId, folderName: 'cover' });
      uploadedAssets.push(nextCoverImage);
    }

    const newGalleryAssets = [];
    for (const file of galleryFiles) {
      const asset = await uploadTourAsset({ file, guideId: req.user.userId, folderName: 'gallery' });
      newGalleryAssets.push(asset);
      uploadedAssets.push(asset);
    }

    const newVideoAssets = [];
    for (const file of videoFiles) {
      const asset = await uploadTourAsset({ file, guideId: req.user.userId, folderName: 'videos' });
      newVideoAssets.push(asset);
      uploadedAssets.push(asset);
    }

    const new360Assets = [];
    for (const file of images360Files) {
      const asset = await uploadTourAsset({ file, guideId: req.user.userId, folderName: 'images-360' });
      new360Assets.push(asset);
      uploadedAssets.push(asset);
    }

    if (itineraryPdfFile) {
      if (nextItineraryPdf?.publicId) assetsToDestroyAfterSave.push(nextItineraryPdf);
      nextItineraryPdf = await uploadTourAsset({ file: itineraryPdfFile, guideId: req.user.userId, folderName: 'itinerary' });
      uploadedAssets.push(nextItineraryPdf);
    }

    let orderedGallery = [...retainedGallery, ...newGalleryAssets];
    if (Array.isArray(galleryCombinedOrder) && galleryCombinedOrder.length > 0) {
      const existingMap = new Map(retainedGallery.map((asset) => [String(asset._id), asset]));
      const usedExisting = new Set();
      const usedNew = new Set();
      const sequence = [];

      for (const token of galleryCombinedOrder) {
        if (typeof token !== 'string') continue;
        if (token.startsWith('existing:')) {
          const id = token.slice('existing:'.length);
          const asset = existingMap.get(id);
          if (asset && !usedExisting.has(id)) {
            sequence.push(asset);
            usedExisting.add(id);
          }
          continue;
        }

        if (token.startsWith('new:')) {
          const index = Number(token.slice('new:'.length));
          if (!Number.isInteger(index) || index < 0 || index >= newGalleryAssets.length || usedNew.has(index)) {
            continue;
          }
          sequence.push(newGalleryAssets[index]);
          usedNew.add(index);
        }
      }

      retainedGallery.forEach((asset) => {
        const key = String(asset._id);
        if (!usedExisting.has(key)) sequence.push(asset);
      });
      newGalleryAssets.forEach((asset, index) => {
        if (!usedNew.has(index)) sequence.push(asset);
      });
      orderedGallery = sequence;
    }

    tour.title = mergedPayload.title;
    tour.shortDescription = mergedPayload.shortDescription;
    tour.fullDescription = mergedPayload.fullDescription;
    tour.category = mergedPayload.category;
    tour.destination = mergedPayload.destination;
    tour.meetingPoint = mergedPayload.meetingPoint;
    tour.durationType = mergedPayload.durationType;
    tour.tourType = mergedPayload.tourType;
    tour.difficultyLevel = mergedPayload.difficultyLevel;
    tour.ageRestriction = mergedPayload.ageRestriction;

    if (scalarPayload.status) {
      tour.status = ['draft', 'published', 'paused'].includes(scalarPayload.status)
        ? scalarPayload.status
        : tour.status;
    }

    let nextSchedule = null;
    if (req.body.schedule !== undefined) {
      nextSchedule = normalizeSchedule(parseMaybeJson(req.body.schedule, {}));
      const scheduleError = validateFutureTourDates(nextSchedule);
      if (scheduleError) {
        await removeLocalTempFiles(allTempFiles);
        return res.status(400).json({ message: scheduleError });
      }
      const scheduleDateKeys = getScheduleDateKeys(nextSchedule);
      const dateConflict = await findGuideTourDateConflict({
        guideId: req.user.userId,
        dateKeys: scheduleDateKeys,
        excludeTourId: tour._id
      });
      if (dateConflict) {
        await removeLocalTempFiles(allTempFiles);
        return res.status(409).json({
          message: `Date conflict: you already organized "${dateConflict.title}" on ${formatDateKeyForMessage(dateConflict.dateKey)}. Please start the next tour after current tour dates are over.`,
          conflict: dateConflict
        });
      }
      const bookingDateConflict = await findGuideBookingDateConflict({
        guideId: req.user.userId,
        dateKeys: scheduleDateKeys,
        excludeTourId: tour._id
      });
      if (bookingDateConflict) {
        await removeLocalTempFiles(allTempFiles);
        return res.status(409).json({
          message: `Date conflict: you already have a booking "${bookingDateConflict.title}" on ${formatDateKeyForMessage(bookingDateConflict.dateKey)}. Please choose free dates.`,
          conflict: bookingDateConflict
        });
      }
    }

    if (req.body.pricing !== undefined) {
      tour.pricing = normalizePricing(parseMaybeJson(req.body.pricing, {}));
    }
    if (nextSchedule) {
      tour.schedule = nextSchedule;
    }
    if (req.body.smartFeatures !== undefined) {
      tour.smartFeatures = normalizeSmartFeatures(parseMaybeJson(req.body.smartFeatures, {}));
    }
    if (req.body.socialSettings !== undefined) {
      tour.socialSettings = normalizeSocialSettings(parseMaybeJson(req.body.socialSettings, {}));
    }

    tour.media = {
      coverImage: nextCoverImage || {},
      images: orderedGallery,
      videos: [...retainedVideos, ...newVideoAssets],
      images360: [...retained360, ...new360Assets],
      itineraryPdf: nextItineraryPdf || {}
    };

    await tour.save();
    await destroyCloudinaryAssets(assetsToDestroyAfterSave);
    return res.json({ message: 'Tour updated successfully.', tour });
  } catch (err) {
    await removeLocalTempFiles(allTempFiles);
    await destroyCloudinaryAssets(uploadedAssets);
    return res.status(500).json({ message: 'Failed to update tour.', error: err.message });
  }
});

router.post('/:tourId/join', verifyToken, authorizeRoles('tourist'), async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.tourId);
    if (!tour) return res.status(404).json({ message: 'Tour not found.' });
    if (tour.status !== 'published') {
      return res.status(400).json({ message: 'This tour is not open for booking right now.' });
    }

    const availableDates = getFutureScheduleDateKeys(tour);
    if (availableDates.length === 0) {
      return res.status(400).json({ message: 'This tour has no future availability right now.' });
    }

    const multiDayMode = isMultiDayTour(tour);
    const packageRange = getPackageRangeFromKeys(availableDates);
    const fallbackDate = multiDayMode ? packageRange.startKey : '';
    const requestedTourDate = normalizeString(req.body.tourDate || fallbackDate);
    const requestedDate = normalizeDate(requestedTourDate, null);
    const requestedDateKey = toDateKey(requestedDate);
    if (!requestedDateKey) {
      return res.status(400).json({ message: 'Please select a valid tour date.' });
    }

    if (multiDayMode) {
      if (!availableDates.includes(requestedDateKey)) {
        return res.status(400).json({ message: 'Selected start date is unavailable for this multi-day tour.' });
      }
    } else if (!availableDates.includes(requestedDateKey)) {
      return res.status(400).json({ message: 'Selected date is unavailable for this tour.' });
    }

    const bookingDateKey = multiDayMode ? packageRange.startKey : requestedDateKey;
    if (!bookingDateKey) {
      return res.status(400).json({ message: 'This multi-day package does not have a valid start date.' });
    }

    const requestedSeats = Math.max(1, normalizeNumber(req.body.seats, 1));
    const maxSeats = Math.max(1, Number(tour?.schedule?.maxTravelers || 1));
    if (requestedSeats > maxSeats) {
      return res.status(400).json({ message: `You can book up to ${maxSeats} seats for this tour.` });
    }

    const guide = await Guide.findOne({ userId: tour.guideId });
    if (!guide || !guide.approved) {
      return res.status(404).json({ message: 'Guide not found or not approved for payments.' });
    }
    if (!hasManualUpiSetup(guide)) {
      return res.status(400).json({ message: 'This guide has not completed advance payment setup yet.' });
    }

    const alreadyJoined = (tour.participants || []).some((participant) => {
      if (String(participant?.touristId || '') !== String(req.user.userId)) return false;
      const participantStatus = String(participant?.status || 'confirmed').toLowerCase();
      if (participantStatus === 'cancelled') return false;
      if (participantStatus !== 'confirmed' && !isParticipantSeatReserved(participant)) return false;
      if (multiDayMode) return true;
      return (
        toDateKey(participant?.tourDate) === requestedDateKey
      );
    });
    if (alreadyJoined) {
      return res.status(409).json({
        message: multiDayMode
          ? 'You already joined this multi-day tour package.'
          : 'You already joined this tour on the selected date.'
      });
    }

    const seatSnapshot = buildSeatSnapshot(tour);
    const dayAvailability = multiDayMode
      ? (seatSnapshot.availability || [])[0]
      : (seatSnapshot.availability || []).find((entry) => entry.date === requestedDateKey);
    const remainingSeats = dayAvailability ? Number(dayAvailability.remainingSeats || 0) : maxSeats;
    if (requestedSeats > remainingSeats) {
      const limitedForDate = multiDayMode
        ? `${packageRange.startKey} to ${packageRange.endKey}`
        : requestedDateKey;
      return res.status(409).json({
        message: `Only ${remainingSeats} seat(s) left for ${limitedForDate}.`,
        remainingSeats
      });
    }

    const paymentWindowExpiresAt = new Date(Date.now() + HOLD_WINDOW_MS);
    const pricing = calculateTourParticipantPricing({ tour, guide, seats: requestedSeats });
    const requiresAdvancePayment = pricing.advanceAmount > 0;
    const participantNote = normalizeString(req.body.note || '').slice(0, 400);

    const participantPayload = {
      touristId: req.user.userId,
      tourDate: new Date(`${bookingDateKey}T00:00:00.000Z`),
      seats: requestedSeats,
      status: requiresAdvancePayment ? 'pending' : 'confirmed',
      bookingId: null,
      totalAmount: pricing.totalAmount,
      advanceAmount: pricing.advanceAmount,
      remainingAmount: pricing.remainingAmount,
      advancePaymentStatus: requiresAdvancePayment ? 'awaiting_payment' : 'verified',
      advanceRejectedReason: '',
      paymentWindowExpiresAt: requiresAdvancePayment ? paymentWindowExpiresAt : null,
      note: participantNote,
      joinedAt: new Date()
    };

    tour.participants.push(participantPayload);
    await tour.save();
    const createdParticipant = (tour.participants || [])[tour.participants.length - 1];

    const packageEndKey = multiDayMode ? packageRange.endKey || bookingDateKey : bookingDateKey;
    const bookingStartDateTime = new Date(`${bookingDateKey}T00:00:00.000Z`);
    const bookingEndDateTime = new Date(`${packageEndKey}T23:59:59.999Z`);

    const destinationLabel = [normalizeString(tour?.title || ''), normalizeString(tour?.destination || '')]
      .filter(Boolean)
      .join(' - ');

    const booking = new Booking({
      touristId: req.user.userId,
      guideId: tour.guideId,
      startDateTime: bookingStartDateTime,
      endDateTime: bookingEndDateTime,
      destination: destinationLabel || 'Tour booking',
      sourceType: 'tour',
      sourceTourId: tour._id,
      sourceTourParticipantId: createdParticipant?._id || null,
      sourceTourDateKey: bookingDateKey,
      guestCount: requestedSeats,
      specialRequests: participantNote,
      price: pricing.totalAmount,
      totalAmount: pricing.totalAmount,
      advanceAmount: pricing.advanceAmount,
      remainingAmount: pricing.remainingAmount,
      pricingSnapshot: {
        rateType: 'daily',
        guideRate: pricing.pricePerPerson,
        units: requestedSeats,
        unitLabel: 'seats',
        subtotal: pricing.totalAmount,
        platformFeeRate: 0,
        platformFeeAmount: 0
      },
      guidePaymentSnapshot: buildGuidePaymentSnapshot(guide),
      advancePaymentStatus: requiresAdvancePayment ? 'awaiting_payment' : 'verified',
      remainingPaymentStatus: pricing.remainingAmount > 0 ? 'pending' : 'paid',
      paymentWindowExpiresAt: requiresAdvancePayment ? paymentWindowExpiresAt : null,
      status: requiresAdvancePayment ? 'pending' : 'confirmed',
      messages: []
    });

    await booking.save();
    await Guide.findOneAndUpdate({ userId: tour.guideId }, { $push: { bookings: booking._id } });

    if (createdParticipant) {
      createdParticipant.bookingId = booking._id;
      createdParticipant.advancePaymentStatus = booking.advancePaymentStatus;
      createdParticipant.paymentWindowExpiresAt = booking.paymentWindowExpiresAt;
      createdParticipant.status = booking.status === 'confirmed' ? 'confirmed' : 'pending';
      await tour.save();
    }

    emitTourParticipationUpdate({
      guideId: tour.guideId,
      touristId: req.user.userId,
      tour,
      participant: createdParticipant || participantPayload,
      action: requiresAdvancePayment ? 'payment_pending' : 'joined'
    });

    const updatedTour = await Tour.findById(tour._id)
      .populate('guideId', 'name avatar country email')
      .populate('participants.touristId', 'name email avatar')
      .lean();

    return res.status(201).json({
      message: requiresAdvancePayment
        ? 'Tour booking request created. Pay the advance in My Bookings and submit proof for guide confirmation.'
        : multiDayMode
          ? 'Multi-day tour package booked successfully.'
          : 'Tour booked successfully.',
      requiresAdvancePayment,
      paymentWindowMinutes: requiresAdvancePayment ? HOLD_WINDOW_MINUTES : 0,
      booking,
      participantId: createdParticipant?._id || null,
      tour: serializeTour(updatedTour)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to join tour.', error: err.message });
  }
});

router.delete('/:tourId/join/:participantId', verifyToken, async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.tourId);
    if (!tour) return res.status(404).json({ message: 'Tour not found.' });

    const participantId = String(req.params.participantId || '');
    const participant = (tour.participants || []).find((item) => String(item?._id) === participantId);
    if (!participant) return res.status(404).json({ message: 'Join entry not found.' });

    const isOwner = String(tour.guideId) === String(req.user.userId);
    const isParticipant = String(participant.touristId) === String(req.user.userId);
    const isAdmin = String(req.user.role || '') === 'admin';
    if (!isOwner && !isParticipant && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to cancel this join entry.' });
    }

    participant.status = 'cancelled';
    if (participant?.bookingId) {
      const linkedBooking = await Booking.findById(participant.bookingId);
      if (linkedBooking && String(linkedBooking.touristId || '') === String(participant.touristId || '')) {
        linkedBooking.status = 'cancelled';
        linkedBooking.paymentWindowExpiresAt = null;
        await linkedBooking.save();
      }
    }
    await tour.save();
    emitTourParticipationUpdate({
      guideId: tour.guideId,
      touristId: participant?.touristId,
      tour,
      participant,
      action: 'cancelled'
    });
    return res.json({ message: 'Tour booking cancelled.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to cancel tour booking.', error: err.message });
  }
});

router.get('/tourist/:touristId/joined', verifyToken, async (req, res) => {
  try {
    const touristId = String(req.params.touristId || '');
    const isAdmin = String(req.user.role || '') === 'admin';
    if (!isAdmin && String(req.user.userId || '') !== touristId) {
      return res.status(403).json({ message: 'Not authorized to view joined tours.' });
    }

    const tours = await Tour.find({
      'participants.touristId': touristId,
      'participants.status': 'confirmed'
    })
      .populate('guideId', 'name avatar country email')
      .lean();

    const joinedTours = tours
      .map((tour) => {
        const participantEntries = (tour.participants || []).filter(
          (participant) =>
            String(participant?.touristId || '') === touristId &&
            (participant?.status || 'confirmed') === 'confirmed'
        );
        if (participantEntries.length === 0) return null;

        return {
          ...serializeTour(tour),
          myParticipation: participantEntries.map((entry) => ({
            _id: entry._id,
            tourDate: entry.tourDate,
            seats: entry.seats,
            status: entry.status,
            note: entry.note || '',
            joinedAt: entry.joinedAt
          }))
        };
      })
      .filter(Boolean);

    return res.json({ tours: joinedTours });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch joined tours.', error: err.message });
  }
});

router.delete('/:tourId', verifyToken, authorizeRoles('guide'), async (req, res) => {
  try {
    const tour = await Tour.findOne({ _id: req.params.tourId, guideId: req.user.userId });
    if (!tour) return res.status(404).json({ message: 'Tour not found or not owned by guide.' });

    const allAssets = [];
    if (tour.media?.coverImage?.publicId) allAssets.push(tour.media.coverImage);
    if (tour.media?.itineraryPdf?.publicId) allAssets.push(tour.media.itineraryPdf);
    (tour.media?.images || []).forEach((asset) => allAssets.push(asset));
    (tour.media?.videos || []).forEach((asset) => allAssets.push(asset));
    (tour.media?.images360 || []).forEach((asset) => allAssets.push(asset));

    await Tour.deleteOne({ _id: tour._id });
    await destroyCloudinaryAssets(allAssets);
    return res.json({ message: 'Tour deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete tour.', error: err.message });
  }
});

router.post('/:tourId/like', verifyToken, async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.tourId);
    if (!tour) return res.status(404).json({ message: 'Tour not found.' });

    const requesterId = String(req.user.userId || '');
    const isOwner = String(tour.guideId) === requesterId;
    if (!tour.socialSettings?.allowLikes && !isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Likes are disabled for this tour.' });
    }

    const existingIndex = tour.likes.findIndex((entry) => String(entry.userId) === requesterId);
    if (existingIndex >= 0) {
      tour.likes.splice(existingIndex, 1);
    } else {
      tour.likes.push({ userId: requesterId, createdAt: new Date() });
    }
    tour.likesCount = tour.likes.length;
    await tour.save();
    return res.json({ liked: existingIndex < 0, likesCount: tour.likesCount });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to toggle like.', error: err.message });
  }
});

router.post('/:tourId/follow', verifyToken, async (req, res) => {
  try {
    const tour = await Tour.findById(req.params.tourId);
    if (!tour) return res.status(404).json({ message: 'Tour not found.' });

    const requesterId = String(req.user.userId || '');
    const isOwner = String(tour.guideId) === requesterId;
    if (!tour.socialSettings?.allowFollowing && !isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Following is disabled for this tour.' });
    }

    const existingIndex = tour.followers.findIndex((entry) => String(entry.userId) === requesterId);
    if (existingIndex >= 0) {
      tour.followers.splice(existingIndex, 1);
    } else {
      tour.followers.push({ userId: requesterId, createdAt: new Date() });
    }
    tour.followersCount = tour.followers.length;
    await tour.save();
    return res.json({ following: existingIndex < 0, followersCount: tour.followersCount });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to toggle following.', error: err.message });
  }
});

module.exports = router;
