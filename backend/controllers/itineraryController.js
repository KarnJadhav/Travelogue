const mongoose = require('mongoose');
const { generateItinerary } = require('../services/itineraryService');
const { buildItineraryPdf } = require('../services/pdfService');
const SocialContentService = require('../services/socialContentService');
const TouristItinerary = require('../models/TouristItinerary');
const User = require('../models/User');
const Booking = require('../models/Booking');

const socialContentService = new SocialContentService();

const normalizeInterests = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(
      value
        .map((item) => String(item || '').trim())
        .filter(Boolean)
    )];
  }

  if (typeof value === 'string') {
    return [...new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )];
  }

  return [];
};

const normalizeChecklist = (checklist) => {
  if (!Array.isArray(checklist)) return [];

  return checklist
    .map((item) => ({
      label: String(item?.label || '').trim(),
      done: Boolean(item?.done),
    }))
    .filter((item) => item.label);
};

const buildDefaultChecklist = (destination) => {
  const safeDestination = String(destination || 'destination').trim();
  return [
    { label: `Passport and travel documents for ${safeDestination}`, done: false },
    { label: 'Local transport wallet and backup payment method', done: false },
    { label: 'Offline map and emergency contacts', done: false },
    { label: 'Accommodation confirmations and tickets', done: false },
    { label: 'Weather-appropriate packing list', done: false },
  ];
};

const resolveTripDays = (startDate, endDate, explicitDays) => {
  const parsedExplicitDays = Number(explicitDays);
  if (Number.isFinite(parsedExplicitDays) && parsedExplicitDays > 0) {
    return Math.max(1, Math.round(parsedExplicitDays));
  }

  if (!startDate || !endDate) return 3;
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 3;
  }

  const dayMs = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
};

const buildInput = (body = {}) => ({
  // Keep numeric handling safe against invalid text payloads.
  travelers: (() => {
    const parsed = Number(body.travelers);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : 1;
  })(),
  destination: String(body.destination || '').trim(),
  startDate: String(body.startDate || '').trim(),
  endDate: String(body.endDate || '').trim(),
  interests: normalizeInterests(body.interests),
  budget: String(body.budget || 'mid').trim(),
  pace: String(body.pace || 'balanced').trim(),
  transportMode: String(body.transportMode || 'car').trim(),
  dailyStartTime: String(body.dailyStartTime || '09:00').trim(),
  dailyEndTime: String(body.dailyEndTime || '21:00').trim(),
  specialRequirements: String(body.specialRequirements || '').trim(),
  currency: String(body.currency || 'INR').trim().toUpperCase(),
  days: resolveTripDays(body.startDate, body.endDate, body.days),
});

const resolveUserInterests = async (userId) => {
  if (!userId) return [];
  const user = await User.findById(userId).select('interests');
  return normalizeInterests(user?.interests || '');
};

const sanitizeSavedDocument = (doc) => ({
  _id: doc._id,
  title: doc.title,
  destination: doc.destination,
  startDate: doc.startDate,
  endDate: doc.endDate,
  tripRequest: doc.tripRequest || {},
  itinerary: doc.itinerary || {},
  notes: doc.notes || '',
  checklist: Array.isArray(doc.checklist) ? doc.checklist : [],
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

const generate = async (req, res) => {
  try {
    const input = buildInput(req.body || {});
    if (!input.destination) {
      return res.status(400).json({ message: 'Destination is required.' });
    }

    if (!input.interests.length) {
      input.interests = await resolveUserInterests(req.user?.userId);
    }

    const itinerary = await generateItinerary(input);
    const checklist = normalizeChecklist(req.body?.checklist);

    return res.json({
      itinerary,
      tripRequest: input,
      checklist: checklist.length ? checklist : buildDefaultChecklist(input.destination),
    });
  } catch (error) {
    console.error('[Itinerary] generate error:', error.message);
    return res.status(500).json({ message: 'Unable to generate itinerary right now. Please try again later.' });
  }
};

const saveGenerated = async (req, res) => {
  try {
    const itinerary = req.body?.itinerary;
    const incomingTripRequest = req.body?.tripRequest || {};
    const input = buildInput(incomingTripRequest);

    if (!itinerary || !Array.isArray(itinerary.days) || itinerary.days.length === 0) {
      return res.status(400).json({ message: 'Valid itinerary payload is required.' });
    }

    if (!input.destination) {
      input.destination = String(itinerary.destination || '').trim();
    }

    if (!input.destination) {
      return res.status(400).json({ message: 'Destination is required in itinerary or trip request.' });
    }

    if (!input.interests.length) {
      input.interests = await resolveUserInterests(req.user?.userId);
    }

    const checklist = normalizeChecklist(req.body?.checklist);
    const title = String(req.body?.title || `${input.destination} Itinerary`).trim();

    const saved = await TouristItinerary.create({
      userId: req.user.userId,
      title,
      destination: input.destination,
      startDate: input.startDate,
      endDate: input.endDate,
      tripRequest: input,
      itinerary,
      notes: String(req.body?.notes || '').trim(),
      checklist: checklist.length ? checklist : buildDefaultChecklist(input.destination),
      meta: {
        source: 'planner-module',
      },
    });

    return res.status(201).json({ itinerary: sanitizeSavedDocument(saved) });
  } catch (error) {
    console.error('[Itinerary] save error:', error.message);
    return res.status(500).json({ message: 'Unable to save itinerary.' });
  }
};

const listSaved = async (req, res) => {
  try {
    const docs = await TouristItinerary.find({ userId: req.user.userId })
      .sort({ updatedAt: -1 })
      .select('title destination startDate endDate itinerary.summary itinerary.days updatedAt createdAt');

    const items = docs.map((doc) => ({
      _id: doc._id,
      title: doc.title,
      destination: doc.destination,
      startDate: doc.startDate,
      endDate: doc.endDate,
      daysCount: Array.isArray(doc.itinerary?.days) ? doc.itinerary.days.length : 0,
      summary: String(doc.itinerary?.summary || '').trim(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return res.json({ items });
  } catch (error) {
    console.error('[Itinerary] list error:', error.message);
    return res.status(500).json({ message: 'Unable to fetch saved itineraries.' });
  }
};

const getSavedById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid itinerary id.' });
    }

    const doc = await TouristItinerary.findOne({ _id: id, userId: req.user.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Itinerary not found.' });
    }

    return res.json({ itinerary: sanitizeSavedDocument(doc) });
  } catch (error) {
    console.error('[Itinerary] get error:', error.message);
    return res.status(500).json({ message: 'Unable to fetch itinerary.' });
  }
};

const updateSaved = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid itinerary id.' });
    }

    const doc = await TouristItinerary.findOne({ _id: id, userId: req.user.userId });
    if (!doc) {
      return res.status(404).json({ message: 'Itinerary not found.' });
    }

    if (typeof req.body?.title === 'string') {
      doc.title = req.body.title.trim() || doc.title;
    }

    if (typeof req.body?.notes === 'string') {
      doc.notes = req.body.notes;
    }

    const checklist = normalizeChecklist(req.body?.checklist);
    if (checklist.length) {
      doc.checklist = checklist;
    }

    if (req.body?.tripRequest && typeof req.body.tripRequest === 'object') {
      const mergedInput = buildInput({ ...doc.tripRequest, ...req.body.tripRequest });
      if (!mergedInput.interests.length) {
        mergedInput.interests = await resolveUserInterests(req.user?.userId);
      }
      doc.tripRequest = mergedInput;
      doc.destination = mergedInput.destination || doc.destination;
      doc.startDate = mergedInput.startDate || doc.startDate;
      doc.endDate = mergedInput.endDate || doc.endDate;
    }

    if (req.body?.itinerary && Array.isArray(req.body.itinerary.days)) {
      doc.itinerary = req.body.itinerary;
      if (req.body.itinerary.destination) {
        doc.destination = String(req.body.itinerary.destination).trim();
      }
    }

    await doc.save();

    return res.json({ itinerary: sanitizeSavedDocument(doc) });
  } catch (error) {
    console.error('[Itinerary] update error:', error.message);
    return res.status(500).json({ message: 'Unable to update itinerary.' });
  }
};

const deleteSaved = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid itinerary id.' });
    }

    const removed = await TouristItinerary.findOneAndDelete({ _id: id, userId: req.user.userId });
    if (!removed) {
      return res.status(404).json({ message: 'Itinerary not found.' });
    }

    return res.json({ message: 'Itinerary deleted successfully.' });
  } catch (error) {
    console.error('[Itinerary] delete error:', error.message);
    return res.status(500).json({ message: 'Unable to delete itinerary.' });
  }
};

const getPreferences = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('name fullName country interests');
    if (!user) {
      return res.status(404).json({ message: 'User profile not found.' });
    }

    const recentBookings = await Booking.find({
      touristId: req.user.userId,
      destination: { $exists: true, $ne: '' },
    })
      .sort({ startDateTime: -1 })
      .limit(10)
      .select('destination');

    const seen = new Set();
    const recentDestinations = [];
    recentBookings.forEach((booking) => {
      const destination = String(booking.destination || '').trim();
      const key = destination.toLowerCase();
      if (!destination || seen.has(key)) return;
      seen.add(key);
      recentDestinations.push(destination);
    });

    return res.json({
      profile: {
        name: user.fullName || user.name,
        country: user.country || '',
        interests: normalizeInterests(user.interests || ''),
      },
      suggestions: {
        recentDestinations,
      },
    });
  } catch (error) {
    console.error('[Itinerary] preferences error:', error.message);
    return res.status(500).json({ message: 'Unable to load itinerary preferences.' });
  }
};

const downloadPdf = async (req, res) => {
  try {
    const itinerary = req.body?.itinerary;
    const tripRequest = req.body?.tripRequest || {};
    if (!itinerary || !Array.isArray(itinerary.days)) {
      return res.status(400).json({ message: 'Valid itinerary payload is required.' });
    }

    const pdfBuffer = await buildItineraryPdf({ itinerary, tripRequest });
    const safeDestination = String(itinerary.destination || 'trip').replace(/[^a-z0-9]+/gi, '-').toLowerCase();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="itinerary-${safeDestination}.pdf"`);
    return res.send(pdfBuffer);
  } catch (error) {
    console.error('[Itinerary] pdf error:', error.message);
    return res.status(500).json({ message: 'Unable to generate PDF.' });
  }
};

const getSocialContent = async (req, res) => {
  try {
    const destination = String(req.query?.destination || '').trim();
    const stopName = String(req.query?.stopName || '').trim();
    const limit = Number(req.query?.limit);

    if (!destination && !stopName) {
      return res.status(400).json({ message: 'Destination or stop name is required.' });
    }

    const payload = await socialContentService.getSocialContent({
      destination,
      stopName,
      limit: Number.isFinite(limit) ? limit : undefined,
    });

    return res.json(payload);
  } catch (error) {
    console.error('[Itinerary] social content error:', error.message);
    return res.status(500).json({ message: 'Unable to load social content right now.' });
  }
};

module.exports = {
  generate,
  saveGenerated,
  listSaved,
  getSavedById,
  updateSaved,
  deleteSaved,
  getPreferences,
  downloadPdf,
  getSocialContent,
};

