const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const Guide = require('../models/Guide');
const Hotel = require('../models/Hotel');
const Review = require('../models/Review');

const POSITIVE_CONFIRMATIONS = ['yes', 'confirm', 'book it', 'go ahead', 'submit', 'ok', 'okay', 'sure'];
const NEGATIVE_CONFIRMATIONS = ['no', 'cancel', 'stop', 'not now', 'never mind'];
const LANG_HINTS = ['english', 'hindi', 'marathi', 'french', 'spanish', 'german', 'japanese'];

const TAB_KEYWORDS = [
  { tab: 'Dashboard', patterns: ['dashboard', 'home'] },
  { tab: 'Explore Destinations', patterns: ['explore destination', 'destinations', 'discover places'] },
  { tab: 'Explore Guides', patterns: ['explore guides', 'browse guides'] },
  { tab: 'Virtual Guide', patterns: ['virtual guide'] },
  { tab: 'Hotel Booking', patterns: ['hotel booking', 'hotels'] },
  { tab: 'My Bookings', patterns: ['my bookings'] },
  { tab: 'Chat', patterns: ['chat', 'messages'] },
  { tab: 'Reviews', patterns: ['reviews', 'ratings'] },
  { tab: 'Travelogue', patterns: ['travelogue', 'stories'] },
  { tab: 'Travel Tips', patterns: ['travel tips'] },
  { tab: 'Emergency', patterns: ['emergency'] },
];

const clean = (v) => (typeof v === 'string' ? v.trim() : '');
const lower = (v) => clean(v).toLowerCase();
const normalize = (v = '') => lower(v).replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const tokens = (v = '') => normalize(v).split(' ').filter(Boolean);
const includesAny = (text, patterns = []) => patterns.some((p) => lower(text).includes(p));
const isPositive = (text) => includesAny(text, POSITIVE_CONFIRMATIONS);
const isNegative = (text) => includesAny(text, NEGATIVE_CONFIRMATIONS);

const scoreName = (name, hint) => {
  const n = normalize(name);
  const h = normalize(hint);
  if (!h) return 0;
  if (n === h) return 10;
  if (n.startsWith(h)) return 8;
  if (n.includes(h)) return 6;
  const nt = new Set(tokens(n));
  const ht = new Set(tokens(h));
  if (!nt.size || !ht.size) return 0;
  let overlap = 0;
  ht.forEach((t) => {
    if (nt.has(t)) overlap += 1;
  });
  return overlap > 0 ? (overlap / Math.max(nt.size, ht.size)) * 5 : 0;
};

const parseDate = (command) => {
  const text = lower(command);
  const now = new Date();
  now.setSeconds(0, 0);
  if (text.includes('day after tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 2);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  if (text.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }
  if (text.includes('today')) {
    const d = new Date(now);
    d.setHours(Math.min(20, Math.max(9, now.getHours() + 1)), 0, 0, 0);
    return d;
  }
  const iso = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 9, 0, 0, 0);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
};

const parseBudget = (command) => {
  const m = lower(command).replace(/,/g, '').match(/\b(?:budget|under|below|within|max|upto)\s*(?:inr|rs|rupees|usd|\$)?\s*(\d{3,7})\b/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) && v >= 100 ? v : null;
};

const parseDays = (command) => {
  const m = lower(command).match(/\b(\d{1,2})\s*(day|days)\b/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) && v >= 1 && v <= 30 ? v : null;
};

const parseTravelers = (command) => {
  const m = lower(command).match(/\b(\d{1,2})\s*(traveler|travelers|people|person|members)\b/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) && v >= 1 && v <= 20 ? v : null;
};

const parseDestination = (command) => {
  const m = clean(command).match(/\b(?:to|in|at|for)\s+([A-Za-z][A-Za-z\s-]{1,60})/i);
  if (!m) return '';
  const cleaned = clean(m[1])
    .replace(
      /\b(with|on|tomorrow|today|next|from|starting|budget|under|below|within|max|around)\b.*$/i,
      ''
    )
    .replace(/\b\d+\s*(day|days|traveler|travelers|people|person|members)\b.*$/i, '')
    .replace(/\s+(and|&)\s+[A-Za-z].*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned;
};

const parseRateType = (command) => {
  const text = lower(command);
  if (includesAny(text, ['hourly', 'per hour', '/hour', 'by hour'])) return 'hourly';
  if (includesAny(text, ['daily', 'per day', '/day', 'full day', 'by day'])) return 'daily';
  return '';
};

const parseMinRating = (command) => {
  const m = lower(command).match(/\b(?:rating|rated|above|at least|min)\s*([1-5](?:\.\d)?)\b/);
  if (!m) return null;
  const v = Number(m[1]);
  return Number.isFinite(v) ? Math.max(1, Math.min(5, v)) : null;
};

const parseLanguage = (command) => LANG_HINTS.find((l) => lower(command).includes(l)) || '';

const parseNameHint = (command) => {
  const match = clean(command).match(/\b(?:guide|chat with|message|talk to|open|book|hire)\s+([A-Za-z][A-Za-z\s]{1,50})/i);
  return clean(match?.[1] || '');
};

const parseReviewRating = (command) => {
  const text = lower(command);
  const explicit = text.match(/\b([1-5])\s*(star|stars)\b/);
  if (explicit) return Number(explicit[1]);
  if (includesAny(text, ['excellent', 'amazing', 'awesome', 'fantastic', 'perfect'])) return 5;
  if (includesAny(text, ['good', 'great', 'nice', 'helpful'])) return 4;
  if (includesAny(text, ['okay', 'average', 'decent'])) return 3;
  if (includesAny(text, ['poor', 'bad', 'not good'])) return 2;
  if (includesAny(text, ['terrible', 'worst', 'awful', 'horrible'])) return 1;
  return 4;
};

const parseReviewComment = (command) => {
  const stripped = clean(command)
    .replace(/^(create|write|make|post|submit)\s+(a\s+)?review\s*/i, '')
    .replace(/^(review|rate)\s*/i, '')
    .trim();
  return stripped.length >= 20 ? stripped : '';
};

const findTab = (command) => {
  const text = lower(command);
  const found = TAB_KEYWORDS.find((item) => item.patterns.some((p) => text.includes(p)));
  return found?.tab || '';
};

const loadGuideCandidates = async () => {
  const guides = await Guide.find({ approved: true, isAvailable: { $ne: false } })
    .populate('userId', 'name country email avatar')
    .limit(250);
  const base = guides.map((g) => ({
    guideUserId: String(g.userId?._id || g.userId || ''),
    guideName: clean(g.userId?.name) || 'Guide',
    country: clean(g.userId?.country),
    languages: (Array.isArray(g.languages) ? g.languages : []).map((x) => clean(x?.name || x)).filter(Boolean),
    price: Number(g.price || 0),
    currency: 'INR',
    rateType: g.rateType || 'daily',
    rating: Number(g.ratings || 0),
    reviewCount: 0,
    bio: clean(g.bio),
  })).filter((g) => g.guideUserId);

  const ids = base
    .map((g) => g.guideUserId)
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));

  if (!ids.length) return base;

  const stats = await Review.aggregate([
    { $match: { guideId: { $in: ids }, status: 'approved', isHidden: false, isDeleted: false } },
    { $group: { _id: '$guideId', avgRating: { $avg: '$rating' }, reviewCount: { $sum: 1 } } },
  ]);
  const map = new Map(stats.map((s) => [String(s._id), s]));
  return base.map((g) => {
    const s = map.get(g.guideUserId);
    if (!s) return g;
    return { ...g, rating: Number(s.avgRating || g.rating || 0), reviewCount: Number(s.reviewCount || 0) };
  });
};

const pickGuides = async ({ destination, language, budget, rateType, minRating, nameHint }) => {
  let list = await loadGuideCandidates();
  if (rateType) {
    const v = list.filter((g) => g.rateType === rateType);
    if (v.length) list = v;
  }
  if (minRating) {
    const v = list.filter((g) => g.rating >= minRating);
    if (v.length) list = v;
  }
  if (budget) {
    const v = list.filter((g) => g.price <= budget || g.price === 0);
    if (v.length) list = v;
  }
  if (destination) {
    const d = lower(destination);
    const v = list.filter((g) => lower(g.country).includes(d) || lower(g.bio).includes(d));
    if (v.length) list = v;
  }
  if (language) {
    const l = lower(language);
    const v = list.filter((g) => g.languages.some((x) => lower(x).includes(l)));
    if (v.length) list = v;
  }
  if (nameHint) {
    const v = list.filter((g) => scoreName(g.guideName, nameHint) > 0);
    if (v.length) list = v;
  }

  return list
    .map((g) => {
      let score = g.rating * 2 + Math.min(4, Math.log10((g.reviewCount || 0) + 1) * 2) + scoreName(g.guideName, nameHint) * 2;
      if (budget && g.price > 0 && g.price <= budget) score += 2;
      return { ...g, _score: score };
    })
    .sort((a, b) => b._score - a._score || a.price - b.price)
    .slice(0, 5);
};

const formatGuide = (g) => `${g.guideName}${g.country ? ` - ${g.country}` : ''} (${Number(g.rating || 0).toFixed(1)}, ${g.reviewCount || 0} reviews, ₹${g.price}/${g.rateType})`;

const handleGuide = async ({ command, suggestionOnly = false }) => {
  const destination = parseDestination(command);
  const language = parseLanguage(command);
  const budget = parseBudget(command);
  const rateType = parseRateType(command);
  const minRating = parseMinRating(command);
  const nameHint = parseNameHint(command);
  const startDate = parseDate(command);
  const endDate = new Date(startDate);
  endDate.setHours(17, 0, 0, 0);
  const guides = await pickGuides({ destination, language, budget, rateType, minRating, nameHint });
  if (!guides.length) {
    return {
      success: false,
      reply: 'No matching guides found right now. I opened Explore Guides so you can choose manually.',
      action: { type: 'navigate_tab', tab: 'Explore Guides', payload: { search: destination || nameHint, language, maxPrice: budget || '', minRating: minRating || '', rateType } },
      pendingAction: null,
    };
  }
  const top = guides[0];
  const topLines = guides.slice(0, 3).map((g, i) => `${i + 1}. ${formatGuide(g)}`).join('\n');
  if (suggestionOnly) {
    return {
      success: true,
      reply: `Top matching guides:\n${topLines}\nI opened Explore Guides with filters applied.`,
      action: { type: 'navigate_tab', tab: 'Explore Guides', payload: { search: destination || nameHint || top.guideName, language, maxPrice: budget || '', minRating: minRating || '', rateType } },
      pendingAction: null,
      data: { suggestedGuides: guides },
    };
  }
  const estimatedPrice = top.rateType === 'hourly' ? Math.max(1, endDate.getHours() - startDate.getHours()) * Math.max(0, top.price) : Math.max(0, top.price);
  return {
    success: true,
    reply: `Top matching guides:\n${topLines}\nI opened booking panel for ${top.guideName}. Say "confirm booking" to book, or "second guide" to switch.`,
    action: { type: 'open_guide_booking', tab: 'Explore Guides', payload: { search: destination || nameHint || top.guideName, language, maxPrice: budget || '', minRating: minRating || '', rateType, openBooking: true, guideUserId: top.guideUserId, guideName: top.guideName } },
    pendingAction: {
      type: 'confirm_guide_booking',
      payload: {
        guideUserId: top.guideUserId,
        guideName: top.guideName,
        destination: destination || top.country || 'Guided Tour',
        startDateTime: startDate.toISOString(),
        endDateTime: endDate.toISOString(),
        price: estimatedPrice,
        suggestedGuides: guides.map((g) => ({
          guideUserId: g.guideUserId,
          guideName: g.guideName,
          destination: destination || g.country || 'Guided Tour',
          startDateTime: startDate.toISOString(),
          endDateTime: endDate.toISOString(),
          price: g.rateType === 'hourly' ? Math.max(1, endDate.getHours() - startDate.getHours()) * Math.max(0, g.price) : Math.max(0, g.price),
        })),
      },
    },
    data: { suggestedGuides: guides },
  };
};

const findChatTarget = async ({ hint, preferredType = '' }) => {
  const safeHint = clean(hint);
  const guides = await Guide.find({ approved: true, isAvailable: { $ne: false } }).populate('userId', 'name avatar country email').limit(250);
  const hotels = await Hotel.find({}).populate('user', 'name avatar email').limit(250);
  let list = [
    ...guides.map((g) => ({ type: 'guide', userId: String(g.userId?._id || g.userId), name: clean(g.userId?.name) || 'Guide', subtitle: clean(g.userId?.country), email: clean(g.userId?.email), avatar: clean(g.userId?.avatar), score: scoreName(clean(g.userId?.name), safeHint) + Number(g.ratings || 0) / 5 })),
    ...hotels.map((h) => ({ type: 'hotel', userId: String(h.user?._id || h.user), name: clean(h.name) || clean(h.user?.name) || 'Hotel', subtitle: clean(h.address) || (clean(h.user?.name) ? `Owner: ${clean(h.user?.name)}` : 'Hotel admin'), email: clean(h.email || h.user?.email), avatar: clean(h.images?.[0] || h.user?.avatar), score: Math.max(scoreName(clean(h.name), safeHint), scoreName(clean(h.user?.name), safeHint)) })),
  ].filter((x) => x.userId);
  if (preferredType) {
    const f = list.filter((x) => x.type === preferredType);
    if (f.length) list = f;
  }
  list.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  if (safeHint && (!list.length || list[0].score <= 0)) return null;
  return list[0] || null;
};

const handleChat = async ({ command, preferredType = '', forcedHint = '' }) => {
  const hint = forcedHint || parseNameHint(command);
  const target = await findChatTarget({ hint, preferredType });
  if (!target) {
    return {
      success: false,
      reply: hint ? `I could not find "${hint}" in chat contacts. I opened Chat so you can choose manually.` : 'I opened Chat. Tell me who you want to chat with.',
      action: { type: 'navigate_tab', tab: 'Chat' },
      pendingAction: null,
    };
  }
  return { success: true, reply: `Opening chat with ${target.name}.`, action: { type: 'open_chat', tab: 'Chat', payload: { chatTarget: target } }, pendingAction: null };
};

const handleReview = async ({ command, userId }) => {
  const booking = await Booking.findOne({
    touristId: userId,
    status: 'completed',
    reviewRequestSent: true,
    reviewRequestStatus: 'accepted',
    reviewSubmitted: false,
  }).sort({ endDateTime: -1, createdAt: -1 }).populate('guideId', 'name');

  if (!booking) {
    return { success: false, reply: 'No eligible completed booking found for review right now.', action: { type: 'navigate_tab', tab: 'Reviews' }, pendingAction: null };
  }

  const rating = parseReviewRating(command);
  const guideName = clean(booking.guideId?.name) || 'your guide';
  const destination = clean(booking.destination) || 'the tour';
  const comment = parseReviewComment(command) || `My ${destination} tour with ${guideName} was very good and well managed.`;
  return {
    success: true,
    reply: `I drafted a ${rating}-star review for ${guideName}. Say "confirm review" to submit, or type edits.`,
    action: { type: 'prefill_review', tab: 'Reviews', payload: { guideName, rating, comment } },
    pendingAction: { type: 'confirm_review_submission', payload: { bookingId: String(booking._id), guideId: String(booking.guideId?._id || booking.guideId), guideName, place: destination, rating, comment } },
  };
};

const executeBooking = async ({ userId, payload }) => {
  const booking = await Booking.create({
    touristId: userId,
    guideId: payload.guideUserId,
    startDateTime: new Date(payload.startDateTime),
    endDateTime: new Date(payload.endDateTime),
    destination: payload.destination || 'Guided Tour',
    price: Number(payload.price || 0),
    status: 'pending',
  });
  await Guide.findOneAndUpdate({ userId: payload.guideUserId }, { $push: { bookings: booking._id }, $set: { lastBookingDate: new Date(payload.startDateTime) } });
  return { success: true, reply: 'Booking created successfully and is now pending guide confirmation.', action: { type: 'navigate_tab', tab: 'My Bookings' }, result: { bookingId: String(booking._id), status: booking.status } };
};

const executeReview = async ({ userId, payload }) => {
  const booking = await Booking.findById(payload.bookingId);
  if (!booking) return { success: false, reply: 'I could not find that booking for review submission.' };
  if (String(booking.touristId) !== String(userId)) return { success: false, reply: 'That booking does not belong to your account.' };
  if (booking.status !== 'completed' || !booking.reviewRequestSent || booking.reviewRequestStatus !== 'accepted') return { success: false, reply: 'This booking is not eligible for review yet.' };
  const exists = await Review.findOne({ bookingId: booking._id, userId });
  if (exists) return { success: false, reply: 'You already submitted a review for this booking.' };
  const review = await Review.create({ userId, guideId: payload.guideId, bookingId: payload.bookingId, place: payload.place || booking.destination || 'Tour', rating: Math.max(1, Math.min(5, Number(payload.rating || 4))), comment: clean(payload.comment), status: 'approved' });
  booking.reviewSubmitted = true;
  await booking.save();
  return { success: true, reply: 'Review submitted successfully.', action: { type: 'navigate_tab', tab: 'Reviews' }, result: { reviewId: String(review._id), rating: review.rating } };
};

const handlePending = async ({ command, pendingAction, userId }) => {
  if (!pendingAction) return null;
  if (isNegative(command)) return { success: true, reply: 'No problem, I cancelled that request.', pendingAction: null };

  if (pendingAction.type === 'confirm_guide_booking') {
    const suggestions = pendingAction.payload?.suggestedGuides || [];
    if (!isPositive(command)) {
      let idx = -1;
      if (includesAny(command, ['first', '1st'])) idx = 0;
      if (includesAny(command, ['second', '2nd'])) idx = 1;
      if (includesAny(command, ['third', '3rd'])) idx = 2;
      if (idx >= 0 && suggestions[idx]) {
        const next = suggestions[idx];
        return {
          success: true,
          reply: `Switched to ${next.guideName}. Say "confirm booking" to proceed.`,
          pendingAction: { ...pendingAction, payload: { ...pendingAction.payload, ...next } },
          action: { type: 'open_guide_booking', tab: 'Explore Guides', payload: { search: next.guideName, openBooking: true, guideUserId: next.guideUserId, guideName: next.guideName } },
        };
      }
      return null;
    }
    const result = await executeBooking({ userId, payload: pendingAction.payload });
    return { ...result, pendingAction: null };
  }

  if (pendingAction.type === 'confirm_review_submission') {
    if (!isPositive(command)) {
      const rating = includesAny(command, ['star', 'rating']) ? parseReviewRating(command) : pendingAction.payload.rating;
      const comment = includesAny(command, ['star', 'rating']) ? pendingAction.payload.comment : clean(command);
      return {
        success: true,
        reply: 'Updated review draft. Say "confirm review" to submit.',
        pendingAction: { ...pendingAction, payload: { ...pendingAction.payload, rating, comment } },
        action: { type: 'prefill_review', tab: 'Reviews', payload: { guideName: pendingAction.payload.guideName, rating, comment } },
      };
    }
    const result = await executeReview({ userId, payload: pendingAction.payload });
    return { ...result, pendingAction: null };
  }

  return null;
};

const handleCommand = async ({ command, userId, pendingAction }) => {
  const safe = clean(command);
  if (!safe) return { success: false, reply: 'Please type or speak a command so I can help.', action: null, pendingAction: pendingAction || null };

  const pending = await handlePending({ command: safe, pendingAction, userId });
  if (pending) return pending;

  const text = lower(safe);
  if (includesAny(text, ['help', 'what can you do'])) {
    return { success: true, reply: 'Try: "book guide in Goa tomorrow under 3000 per day", "suggest guides in Pune above rating 4", "open pranav", "chat with hotel taj", "create 5 star review".', action: null, pendingAction: null };
  }
  if (isPositive(text) || isNegative(text)) {
    return { success: false, reply: 'There is no pending action right now. Tell me what you want to do.', action: null, pendingAction: null };
  }

  if (includesAny(text, ['chat with', 'message', 'talk to'])) {
    const preferredType = text.includes('hotel') ? 'hotel' : text.includes('guide') ? 'guide' : '';
    return handleChat({ command: safe, preferredType });
  }
  if (includesAny(text, ['book guide', 'hire guide', 'find guide', 'guide for', 'book '])) return handleGuide({ command: safe, suggestionOnly: false });
  if (includesAny(text, ['suggest guide', 'recommend guide', 'explore guides', 'show guides'])) return handleGuide({ command: safe, suggestionOnly: true });
  if (includesAny(text, ['review', 'rate', 'rating', 'feedback'])) return handleReview({ command: safe, userId });
  if (includesAny(text, ['open', 'show', 'go to', 'navigate'])) {
    const tab = findTab(safe);
    if (tab) return { success: true, reply: `Opening ${tab}.`, action: { type: 'navigate_tab', tab }, pendingAction: null };
    const openTarget = clean(safe.replace(/^(open|show|go to|navigate to|navigate)\s+/i, ''));
    if (openTarget) return handleChat({ command: safe, forcedHint: openTarget });
  }

  if (includesAny(text, ['explore destination', 'destinations'])) return { success: true, reply: 'Opening Explore Destinations.', action: { type: 'navigate_tab', tab: 'Explore Destinations' }, pendingAction: null };

  const fallbackHint = parseNameHint(safe);
  if (fallbackHint && tokens(fallbackHint).length <= 3) {
    const attempt = await handleChat({ command: safe, forcedHint: fallbackHint });
    if (attempt?.success) return attempt;
  }

  return { success: true, reply: 'Try: "book guide in Goa", "open chat", "open pranav", or "create review".', action: null, pendingAction: null };
};

module.exports = {
  handleCommand,
};
