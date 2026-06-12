const GeminiService = require('./geminiService');
const PlacesService = require('./placesService');
const WikipediaService = require('./wikipediaService');

const geminiService = new GeminiService({ scope: 'itinerary' });
const placesService = new PlacesService();
const wikipediaService = new WikipediaService();

const BUDGET_MULTIPLIER = {
  low: 0.78,
  mid: 1,
  high: 1.55,
};

const CATEGORY_BASE_COST = {
  food: 1100,
  shopping: 2500,
  nature: 900,
  culture: 1300,
  adventure: 1700,
  entertainment: 1500,
  relaxation: 1400,
  sightseeing: 1200,
};

const CATEGORY_ACTIVITY_DETAIL = {
  food: {
    bestFor: ['Food Lovers', 'Local Experience', 'Couples'],
    crowdTip: 'Try to arrive before peak meal hours for shorter queues.',
    openingHours: '10:00 - 22:00',
    detail: 'Explore local specialties, signature dishes, and neighborhood culinary culture.',
  },
  shopping: {
    bestFor: ['Shopping', 'Families', 'Local Crafts'],
    crowdTip: 'Visit in late morning for better movement and store availability.',
    openingHours: '10:00 - 21:00',
    detail: 'Browse popular stores, local markets, and handcrafted finds unique to the city.',
  },
  nature: {
    bestFor: ['Photography', 'Relaxation', 'Families'],
    crowdTip: 'Early morning or sunset usually offers the best light and fewer crowds.',
    openingHours: '06:00 - 19:00',
    detail: 'Enjoy scenic viewpoints, open-air walks, and a calmer pace away from city rush.',
  },
  culture: {
    bestFor: ['History', 'Culture', 'Photography'],
    crowdTip: 'Arrive early to avoid guided-group rush windows.',
    openingHours: '09:00 - 18:00',
    detail: 'Discover heritage stories, architecture, and local traditions connected to this place.',
  },
  adventure: {
    bestFor: ['Adventure', 'Active Travelers', 'Friends'],
    crowdTip: 'Carry water and keep buffer time for activity preparation.',
    openingHours: '08:00 - 18:00',
    detail: 'Plan for active exploration with practical prep for weather and movement.',
  },
  entertainment: {
    bestFor: ['Friends', 'Nightlife', 'Couples'],
    crowdTip: 'Weekday slots are typically more comfortable than weekend peaks.',
    openingHours: '11:00 - 23:00',
    detail: 'Great for lively experiences, social spaces, and evening city energy.',
  },
  relaxation: {
    bestFor: ['Relaxation', 'Couples', 'Wellness'],
    crowdTip: 'Keep this as a lower-intensity block between two busy activities.',
    openingHours: '09:00 - 20:00',
    detail: 'Use this stop to slow down, reset energy, and enjoy a gentle travel rhythm.',
  },
  sightseeing: {
    bestFor: ['First-time Visitors', 'Photography', 'General Travelers'],
    crowdTip: 'Start early and keep 15-20 minutes buffer for transfers and entry lines.',
    openingHours: '09:00 - 19:00',
    detail: 'A classic city highlight that helps you understand local character and landmarks.',
  },
};

const CURATED_DESTINATION_PLACES = {
  kolhapur: [
    { name: 'Mahalakshmi Temple, Kolhapur', category: 'culture', address: 'Mahalakshmi Mandir, Kolhapur', lat: 16.7007, lng: 74.2439 },
    { name: 'Rankala Lake', category: 'nature', address: 'Rankala Lake, Kolhapur', lat: 16.6848, lng: 74.2162 },
    { name: 'New Palace Museum', category: 'culture', address: 'New Palace, Kolhapur', lat: 16.7089, lng: 74.2396 },
    { name: 'Jyotiba Temple', category: 'culture', address: 'Wadi Ratnagiri, near Kolhapur', lat: 16.8284, lng: 74.1645 },
    { name: 'Panhala Fort', category: 'culture', address: 'Panhala, Kolhapur district', lat: 16.8124, lng: 74.1109 },
    { name: 'Siddhagiri Gramjivan Museum (Kaneri Math)', category: 'culture', address: 'Kaneri, Kolhapur', lat: 16.6136, lng: 74.2901 },
    { name: 'Shalini Palace', category: 'sightseeing', address: 'Rankala Lake West Bank, Kolhapur', lat: 16.6881, lng: 74.2148 },
    { name: 'Bhavani Mandap', category: 'culture', address: 'Old City, Kolhapur', lat: 16.6955, lng: 74.2318 },
    { name: 'Town Hall Museum', category: 'culture', address: 'Dasara Chowk, Kolhapur', lat: 16.6951, lng: 74.2296 },
    { name: 'Radhanagari Wildlife Sanctuary', category: 'nature', address: 'Radhanagari, Kolhapur district', lat: 16.3972, lng: 73.9958 },
    { name: 'Local Kolhapuri Food Street', category: 'food', address: 'Central Kolhapur food market area', lat: 16.6998, lng: 74.2336 },
    { name: 'Kolhapuri Chappal Market', category: 'shopping', address: 'Laxmipuri, Kolhapur', lat: 16.7019, lng: 74.2274 },
    { name: 'Binkhambi Ganesh Mandir', category: 'culture', address: 'Shivaji Peth, Kolhapur', lat: 16.6985, lng: 74.2278 },
    { name: 'Khasbag Wrestling Stadium', category: 'sightseeing', address: 'Khasbag, Kolhapur', lat: 16.6942, lng: 74.2382 },
    { name: 'Temblai Devi Temple', category: 'culture', address: 'Temblai Hill, Kolhapur', lat: 16.7182, lng: 74.2672 },
    { name: 'Teen Darwaza, Panhala', category: 'culture', address: 'Panhala Fort area', lat: 16.8097, lng: 74.1096 },
    { name: 'Sajja Kothi', category: 'culture', address: 'Panhala Fort area', lat: 16.812, lng: 74.1086 },
    { name: 'Kopeshwar Temple', category: 'culture', address: 'Khidrapur, Kolhapur region', lat: 16.5281, lng: 74.5982 },
    { name: 'Narsobawadi Dattatreya Temple', category: 'culture', address: 'Narsobawadi, near Kolhapur', lat: 16.7426, lng: 74.6097 },
    { name: 'Kalamba Lake', category: 'nature', address: 'Kalamba, Kolhapur', lat: 16.7578, lng: 74.2025 },
    { name: 'Dajipur Wildlife Sanctuary', category: 'nature', address: 'Near Radhanagari, Kolhapur', lat: 16.3562, lng: 73.8848 },
    { name: 'Vishalgad Fort Viewpoint', category: 'adventure', address: 'Vishalgad route, Kolhapur side', lat: 16.9545, lng: 73.7385 },
  ],
};

function getCuratedPlacesForDestination(destination = '') {
  const normalized = sanitizeKeyPart(destination);
  if (!normalized) return [];

  if (CURATED_DESTINATION_PLACES[normalized]) {
    return CURATED_DESTINATION_PLACES[normalized];
  }

  const entry = Object.entries(CURATED_DESTINATION_PLACES).find(([key]) =>
    normalized.includes(key) || key.includes(normalized)
  );

  return entry ? entry[1] : [];
}

function assessFallbackQuality(itinerary, input) {
  const days = Array.isArray(itinerary?.days) ? itinerary.days : [];
  const requestedDays = resolveRequestedDays(input);
  if (!days.length || days.length < requestedDays) return { ok: false, reason: 'insufficient-day-count' };

  const allStops = days.flatMap((day) => (Array.isArray(day?.stops) ? day.stops : []));
  if (!allStops.length) return { ok: false, reason: 'no-stops' };

  const names = allStops.map((stop) => sanitizeKeyPart(stop?.name || '')).filter(Boolean);
  const uniqueNames = new Set(names);
  const uniqueRatio = names.length ? uniqueNames.size / names.length : 0;

  const coordCount = allStops.filter((stop) => hasValidCoordinates(stop?.location)).length;
  const coordRatio = allStops.length ? coordCount / allStops.length : 0;

  const templatePatterns = [
    'historic district walk',
    'local food trail',
    'waterfront sunset point',
  ];
  const templateCount = names.filter((name) => templatePatterns.some((pattern) => name.includes(pattern))).length;
  const templateRatio = allStops.length ? templateCount / allStops.length : 1;

  const veryShortDescCount = allStops.filter(
    (stop) => String(stop?.description || '').trim().length < 60
  ).length;
  const descriptionQualityRatio = allStops.length
    ? (allStops.length - veryShortDescCount) / allStops.length
    : 0;

  const lowDayCoverage = days.some((day) => (Array.isArray(day?.stops) ? day.stops.length : 0) < 3);
  if (lowDayCoverage) return { ok: false, reason: 'low-day-coverage' };
  if (coordRatio < 0.75) return { ok: false, reason: 'low-coordinate-coverage' };
  if (uniqueRatio < 0.82) return { ok: false, reason: 'low-uniqueness' };
  if (templateRatio > 0.35) return { ok: false, reason: 'template-heavy' };
  if (descriptionQualityRatio < 0.8) return { ok: false, reason: 'low-description-quality' };

  return {
    ok: true,
    meta: {
      coordRatio: Number(coordRatio.toFixed(2)),
      uniqueRatio: Number(uniqueRatio.toFixed(2)),
      templateRatio: Number(templateRatio.toFixed(2)),
      descriptionQualityRatio: Number(descriptionQualityRatio.toFixed(2)),
    },
  };
}

function normalizeCategory(value) {
  const category = String(value || '').trim().toLowerCase();
  if (!category) return 'sightseeing';
  if (category.includes('food')) return 'food';
  if (category.includes('shop')) return 'shopping';
  if (category.includes('nature')) return 'nature';
  if (category.includes('culture')) return 'culture';
  if (category.includes('adventure')) return 'adventure';
  if (category.includes('entertainment')) return 'entertainment';
  if (category.includes('relax')) return 'relaxation';
  return 'sightseeing';
}

function estimateStopCost(category, budgetLevel = 'mid') {
  const normalizedCategory = normalizeCategory(category);
  const base = CATEGORY_BASE_COST[normalizedCategory] || CATEGORY_BASE_COST.sightseeing;
  const multiplier = BUDGET_MULTIPLIER[String(budgetLevel || '').toLowerCase()] || BUDGET_MULTIPLIER.mid;
  return Math.max(250, Math.round(base * multiplier));
}

function getStopsPerDayForPace(pace = 'balanced') {
  const normalized = String(pace || '').toLowerCase();
  if (normalized === 'fast') return 5;
  if (normalized === 'relaxed') return 3;
  return 4;
}

function hasValidCoordinates(location) {
  const lat = Number(location?.lat);
  const lng = Number(location?.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0;
}

function sanitizeKeyPart(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildStopIdentity(stop) {
  const nameKey = sanitizeKeyPart(stop?.name || 'unknown-stop');
  const lat = Number(stop?.location?.lat);
  const lng = Number(stop?.location?.lng);
  const coordKey =
    Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0
      ? `${lat.toFixed(3)}:${lng.toFixed(3)}`
      : '';
  return coordKey ? `${nameKey}|${coordKey}` : nameKey;
}

function toSafeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function enrichStopNarrative(stop, input) {
  const category = normalizeCategory(stop?.category);
  const detailPack = CATEGORY_ACTIVITY_DETAIL[category] || CATEGORY_ACTIVITY_DETAIL.sightseeing;

  if (!Array.isArray(stop.bestFor) || !stop.bestFor.length) {
    stop.bestFor = detailPack.bestFor.slice(0, 3);
  }

  if (!String(stop.crowdTip || '').trim()) {
    stop.crowdTip = detailPack.crowdTip;
  }

  if (!String(stop.openingHours || '').trim()) {
    stop.openingHours = detailPack.openingHours;
  }

  const existingDescription = String(stop.description || '').trim();
  if (existingDescription.length >= 80) return stop;

  const areaHint = stop.address
    ? `around ${stop.address}`
    : `in ${input.destination}`;
  const timeHint = stop.arrivalTime
    ? `Best visited around ${stop.arrivalTime}.`
    : '';

  stop.description = `${stop.name} is a popular ${category} experience ${areaHint}. ${detailPack.detail} ${timeHint}`
    .replace(/\s+/g, ' ')
    .trim();

  return stop;
}

function isLowQualityPlaceName(name, destination = '') {
  const normalized = sanitizeKeyPart(name);
  const destinationNorm = sanitizeKeyPart(destination);
  if (!normalized) return true;

  const blockedTerms = [
    'list of',
    'tourism in',
    'district',
    'municipal',
    'city corporation',
    'state of',
    'wikipedia',
    'category',
    'history of',
    'culture of',
    'geography of',
    'economy of',
  ];

  if (blockedTerms.some((term) => normalized.includes(term))) return true;
  if (destinationNorm && normalized === destinationNorm) return true;
  if (normalized.length < 4) return true;
  return false;
}

function defaultCityDayStops({ destination, dayNumber, center, budget, startMinutes }) {
  const lat = Number(center?.lat || 0);
  const lng = Number(center?.lon || 0);
  const delta = 0.012;
  const dayLabel = `Day ${dayNumber}`;
  const templates = [
    {
      name: `${destination} Historic District Walk (${dayLabel})`,
      category: 'culture',
      description: 'Explore iconic streets, architecture, and public squares at a comfortable pace.',
      bestFor: ['Culture', 'Walking'],
      crowdTip: 'Start early to avoid peak footfall.',
    },
    {
      name: `${destination} Local Food Trail (${dayLabel})`,
      category: 'food',
      description: 'Taste regional specialties and discover neighborhood cafes and markets.',
      bestFor: ['Food', 'Local Experience'],
      crowdTip: 'Reserve lunch slots in advance where possible.',
    },
    {
      name: `${destination} Waterfront & Sunset Point (${dayLabel})`,
      category: 'nature',
      description: 'Relax with scenic views and light exploration during golden hour.',
      bestFor: ['Photography', 'Relaxation'],
      crowdTip: 'Carry a light jacket for evening breeze.',
    },
  ];

  return templates.map((item, index) => {
    const arrival = startMinutes + index * 140;
    const departure = arrival + 95;
    return {
      name: item.name,
      address: destination,
      description: item.description,
      arrivalTime: minutesToTime(arrival),
      departureTime: minutesToTime(departure),
      durationMinutes: 95,
      category: item.category,
      openingHours: '',
      estimatedCost: estimateStopCost(item.category, budget),
      rating: 4.2,
      image: '',
      bestFor: item.bestFor,
      crowdTip: item.crowdTip,
      location: {
        lat: lat ? Number((lat + delta * Math.cos(index + dayNumber)).toFixed(6)) : 0,
        lng: lng ? Number((lng + delta * Math.sin(index + dayNumber)).toFixed(6)) : 0,
      },
    };
  });
}

function toMinutes(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') return null;
  const m = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

function minutesToTime(mins) {
  const safe = Math.max(0, Math.min(23 * 60 + 59, mins));
  const hh = Math.floor(safe / 60);
  const mm = safe % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function estimateTransit(distanceKm, mode = 'car') {
  const speed = mode === 'walk' ? 4.5 : mode === 'bike' ? 15 : 28;
  const mins = Math.max(8, Math.round((distanceKm / speed) * 60));
  return mins;
}

function resolveRequestedDays(input = {}) {
  const explicit = Number(input.days);
  if (Number.isFinite(explicit) && explicit > 0) {
    return Math.max(1, Math.round(explicit));
  }

  const start = new Date(input.startDate || '');
  const end = new Date(input.endDate || '');
  if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start) {
    const dayMs = 24 * 60 * 60 * 1000;
    return Math.floor((end.getTime() - start.getTime()) / dayMs) + 1;
  }

  return 3;
}

function normalizeStop(stop) {
  const normalizedCategory = normalizeCategory(stop?.category);
  const parsedEstimatedCost = Number(stop?.estimatedCost);
  return {
    name: String(stop?.name || 'Unknown destination').trim(),
    address: String(stop?.address || '').trim(),
    description: String(stop?.description || '').trim(),
    arrivalTime: String(stop?.arrivalTime || '').trim(),
    departureTime: String(stop?.departureTime || '').trim(),
    durationMinutes: Number(stop?.durationMinutes || 90),
    category: normalizedCategory,
    openingHours: String(stop?.openingHours || '').trim(),
    estimatedCost: Number.isFinite(parsedEstimatedCost) ? parsedEstimatedCost : 0,
    rating: Number(stop?.rating || 0),
    image: String(stop?.image || '').trim(),
    bestFor: Array.isArray(stop?.bestFor)
      ? stop.bestFor.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
      : [],
    crowdTip: String(stop?.crowdTip || '').trim(),
    location: {
      lat: Number(stop?.location?.lat || 0),
      lng: Number(stop?.location?.lng || 0),
    },
  };
}

async function enrichStopCoordinates(destination, stop) {
  if (Number.isFinite(stop.location.lat) && Number.isFinite(stop.location.lng) && stop.location.lat && stop.location.lng) {
    return stop;
  }

  // When place APIs are not configured, avoid repeated geocode calls per stop.
  // Day-level coordinate fallback logic will still keep map rendering usable.
  if (!placesService.hasApiKey()) {
    return stop;
  }

  const query = stop.address || `${stop.name}, ${destination}`;
  const coords = await placesService.getCoordinatesForDestination(query);
  if (coords) {
    stop.location.lat = Number(coords.lat);
    stop.location.lng = Number(coords.lon);
  }
  return stop;
}

function mapPlaceToDraftStop(place, input, index = 0) {
  const name = String(place?.name || `Attraction ${index + 1}`).trim();
  const description = String(place?.description || '').trim();
  const category = normalizeCategory(place?.category || place?.kinds || 'sightseeing');
  const lat = toSafeNumber(
    place?.location?.coordinates?.latitude ?? place?.location?.lat ?? place?.lat,
    0
  );
  const lng = toSafeNumber(
    place?.location?.coordinates?.longitude ?? place?.location?.lng ?? place?.lon,
    0
  );

  return normalizeStop({
    name,
    address: String(place?.location?.address || input.destination || '').trim(),
    description: description || `Visit ${name} while exploring ${input.destination}.`,
    arrivalTime: '',
    departureTime: '',
    durationMinutes: category === 'food' ? 75 : 90,
    category,
    openingHours: String(place?.openingHours || '').trim(),
    estimatedCost: estimateStopCost(category, input.budget),
    rating: Number(place?.rating || 0),
    image: String(place?.imageUrl || place?.image || '').trim(),
    bestFor: [],
    crowdTip: '',
    location: { lat, lng },
  });
}

async function getSupplementalPlaces(destination, neededCount, excludedNames = new Set()) {
  const candidates = [];
  const seen = new Set(
    [...excludedNames].map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)
  );

  const pushCandidate = (item) => {
    const name = String(item?.name || '').trim();
    if (!name) return;
    if (isLowQualityPlaceName(name, destination)) return;
    const normalizedName = sanitizeKeyPart(name);
    const destinationFirstToken = sanitizeKeyPart(destination).split(' ')[0] || '';
    const isWiki = String(item?.source || '').toLowerCase() === 'wikipedia';
    if (isWiki) {
      const tokenCount = normalizedName.split(' ').filter(Boolean).length;
      if (tokenCount <= 1 && destinationFirstToken && !normalizedName.includes(destinationFirstToken)) {
        return;
      }
    }
    const key = name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    candidates.push(item);
  };

  const curatedSeed = getCuratedPlacesForDestination(destination);
  curatedSeed.forEach((entry) =>
    pushCandidate({
      name: entry.name,
      category: entry.category,
      location: {
        coordinates: {
          latitude: entry.lat,
          longitude: entry.lng,
        },
        address: entry.address,
      },
      description: '',
      openingHours: '',
      rating: 4.2,
      source: 'curated',
    })
  );

  const popularPlaces = await placesService.getPopularAttractions(
    destination,
    Math.min(50, Math.max(neededCount * 3, 18))
  );
  popularPlaces.forEach(pushCandidate);

  if (candidates.length < neededCount) {
    const wikiByTitle = await wikipediaService.getPlacesByTitle(
      `${destination} tourist attractions`,
      Math.min(24, Math.max(neededCount * 2, 12))
    );
    wikiByTitle.forEach(pushCandidate);
  }

  if (candidates.length < neededCount) {
    const center = await placesService.getCoordinatesForDestination(destination);
    if (center?.lat && center?.lon) {
      const nearbyWiki = await wikipediaService.getNearbyPlaces(
        Number(center.lat),
        Number(center.lon),
        Math.min(24, Math.max(neededCount * 2, 12))
      );
      nearbyWiki.forEach(pushCandidate);
    }
  }

  return candidates;
}

async function buildSupplementalDayDrafts(rawDays, input, requestedDays) {
  const perDayStops = getStopsPerDayForPace(input.pace);
  const parsedDays = Array.isArray(rawDays) ? rawDays : [];

  const dayMap = new Map();
  parsedDays.forEach((day, index) => {
    const dayNumber = Number(day?.day || index + 1);
    if (!Number.isFinite(dayNumber) || dayNumber < 1 || dayNumber > requestedDays) return;
    if (!dayMap.has(dayNumber)) {
      dayMap.set(dayNumber, day);
    }
  });

  const usedNames = new Set();
  dayMap.forEach((day) => {
    const stops = Array.isArray(day?.stops) ? day.stops : [];
    stops.forEach((stop) => {
      const name = String(stop?.name || '').trim().toLowerCase();
      if (name) usedNames.add(name);
    });
  });

  const missingSlots = [];
  for (let dayNumber = 1; dayNumber <= requestedDays; dayNumber += 1) {
    const existing = dayMap.get(dayNumber);
    const hasStops = Array.isArray(existing?.stops) && existing.stops.length > 0;
    if (!hasStops) {
      missingSlots.push(dayNumber);
    }
  }

  if (!missingSlots.length) {
    return Array.from({ length: requestedDays }).map((_, index) => dayMap.get(index + 1));
  }

  const supplementalPlaces = await getSupplementalPlaces(
    input.destination,
    missingSlots.length * perDayStops,
    usedNames
  );
  const destinationCenter = await placesService.getCoordinatesForDestination(input.destination);
  let pointer = 0;

  missingSlots.forEach((dayNumber) => {
    const draftedStops = [];
    while (draftedStops.length < perDayStops && pointer < supplementalPlaces.length) {
      const nextPlace = supplementalPlaces[pointer];
      pointer += 1;
      draftedStops.push(mapPlaceToDraftStop(nextPlace, input, draftedStops.length));
    }

    if (!draftedStops.length) {
      const fallbackStart = toMinutes(input.dailyStartTime) || 540;
      dayMap.set(dayNumber, {
        day: dayNumber,
        title: `Day ${dayNumber} Highlights`,
        stops: defaultCityDayStops({
          destination: input.destination,
          dayNumber,
          center: destinationCenter,
          budget: input.budget,
          startMinutes: fallbackStart,
        }),
      });
      return;
    }

    dayMap.set(dayNumber, {
      day: dayNumber,
      title: `Day ${dayNumber} City Highlights`,
      stops: draftedStops,
    });
  });

  return Array.from({ length: requestedDays }).map((_, index) => dayMap.get(index + 1));
}

function buildPrompt(input) {
  const requestedDays = resolveRequestedDays(input);
  return `You are a strict travel planner. Create a realistic itinerary JSON for ${input.destination}.
Rules:
- Respect daily start time ${input.dailyStartTime} and end time ${input.dailyEndTime}
- Generate exactly ${requestedDays} day plans in the "days" array (no fewer, no extra).
- Day numbers must be sequential from 1 to ${requestedDays}.
- Include realistic arrivalTime and departureTime for each stop in 24h HH:MM format.
- Include 3-6 stops per day.
- Include popular real places in ${input.destination}.
- Respect interests but keep itinerary balanced: include iconic highlights plus preference-based stops.
- Avoid repeating the same attraction name across days (case-insensitive).
- Include location lat/lng if known, else 0.
- Keep travel realistic and non-overlapping.
- Include short address.
- Include estimatedCost in ${input.currency || 'INR'} and openingHours when possible.
- Include quick traveler tips and bestFor tags.
- Return strict valid JSON only (RFC8259).
- Do not include markdown fences, comments, explanations, or trailing commas.
Return ONLY JSON in this schema:
{
  "destination": "string",
  "summary": "string",
  "days": [
    {
      "day": 1,
      "title": "string",
      "stops": [
        {
          "name": "string",
          "address": "string",
          "description": "string",
          "arrivalTime": "09:00",
          "departureTime": "10:30",
          "durationMinutes": 90,
          "category": "sightseeing|food|shopping|nature|culture",
          "openingHours": "09:00 - 18:00",
          "estimatedCost": 1200,
          "rating": 4.3,
          "bestFor": ["Culture", "Photography"],
          "crowdTip": "string",
          "location": { "lat": 0, "lng": 0 }
        }
      ]
    }
  ]
}
Traveler preferences: interests=${(input.interests || []).join(', ') || 'general'}, budget=${input.budget || 'mid'}, pace=${input.pace || 'balanced'}, transport=${input.transportMode || 'car'}, travelers=${input.travelers || 1}, specialRequirements=${input.specialRequirements || 'none'}, travelDates=${input.startDate || '-'} to ${input.endDate || '-'}`;
}

function validateRawItineraryShape(raw) {
  if (!raw || typeof raw !== 'object') {
    return 'Generated payload is not an object.';
  }

  if (raw.days != null && !Array.isArray(raw.days)) {
    return 'Generated payload has invalid day plans.';
  }

  return true;
}

async function validateAndEnhanceItinerary(raw, input) {
  const requestedDays = resolveRequestedDays(input);
  const draftedDays = await buildSupplementalDayDrafts(raw?.days, input, requestedDays);
  const destinationCenter = await placesService.getCoordinatesForDestination(input.destination);
  const preferredStopsPerDay = getStopsPerDayForPace(input.pace);
  const replacementPlaces = await getSupplementalPlaces(
    input.destination,
    Math.max(24, requestedDays * (preferredStopsPerDay + 2)),
    new Set()
  );
  let replacementCursor = 0;
  const globalStopKeys = new Set();
  const resultDays = [];
  let overallDistanceKm = 0;
  let overallTravelMinutes = 0;
  let overallEstimatedCost = 0;

  for (let dayIndex = 0; dayIndex < requestedDays; dayIndex += 1) {
    const dayNumber = dayIndex + 1;
    const day = draftedDays?.[dayIndex] || {};
    const fallbackStart = toMinutes(input.dailyStartTime) || 540;

    const fallbackStops = defaultCityDayStops({
      destination: input.destination,
      dayNumber,
      center: destinationCenter,
      budget: input.budget,
      startMinutes: fallbackStart,
    });

    const rawStops = Array.isArray(day?.stops) && day.stops.length ? day.stops : fallbackStops;
    const stops = rawStops.map(normalizeStop);
    const enriched = [];
    let dayDistanceKm = 0;
    let dayTravelMinutes = 0;

    for (const stop of stops) {
      const fixed = await enrichStopCoordinates(input.destination, stop);
      fixed.category = normalizeCategory(fixed.category);
      if (!Number.isFinite(Number(fixed.estimatedCost)) || Number(fixed.estimatedCost) <= 0) {
        fixed.estimatedCost = estimateStopCost(fixed.category, input.budget);
      }
      enrichStopNarrative(fixed, input);
      enriched.push(fixed);
    }

    const dayStopKeys = new Set();
    let uniqueStops = [];
    for (const stop of enriched) {
      const key = buildStopIdentity(stop);
      if (globalStopKeys.has(key) || dayStopKeys.has(key)) {
        continue;
      }
      dayStopKeys.add(key);
      globalStopKeys.add(key);
      uniqueStops.push(stop);
    }

    const targetStopCount = Math.max(3, preferredStopsPerDay);
    while (uniqueStops.length < targetStopCount && replacementCursor < replacementPlaces.length) {
      const place = replacementPlaces[replacementCursor];
      replacementCursor += 1;
      const candidate = mapPlaceToDraftStop(place, input, uniqueStops.length);
      const fixedCandidate = await enrichStopCoordinates(input.destination, candidate);
      fixedCandidate.category = normalizeCategory(fixedCandidate.category);
      if (!Number.isFinite(Number(fixedCandidate.estimatedCost)) || Number(fixedCandidate.estimatedCost) <= 0) {
        fixedCandidate.estimatedCost = estimateStopCost(fixedCandidate.category, input.budget);
      }
      enrichStopNarrative(fixedCandidate, input);
      const key = buildStopIdentity(fixedCandidate);
      if (globalStopKeys.has(key) || dayStopKeys.has(key)) {
        continue;
      }
      dayStopKeys.add(key);
      globalStopKeys.add(key);
      uniqueStops.push(fixedCandidate);
    }

    if (!uniqueStops.length) {
      uniqueStops = defaultCityDayStops({
        destination: input.destination,
        dayNumber,
        center: destinationCenter,
        budget: input.budget,
        startMinutes: fallbackStart,
      }).map((stop) => {
        const normalized = normalizeStop(stop);
        enrichStopNarrative(normalized, input);
        return normalized;
      });
      uniqueStops.forEach((stop) => {
        const key = buildStopIdentity(stop);
        dayStopKeys.add(key);
        globalStopKeys.add(key);
      });
    }

    const hasAnyCoords = uniqueStops.some((stop) => hasValidCoordinates(stop.location));
    if (!hasAnyCoords && destinationCenter?.lat && destinationCenter?.lon) {
      const anchorLat = Number(destinationCenter.lat);
      const anchorLng = Number(destinationCenter.lon);
      const delta = 0.01;
      uniqueStops.forEach((stop, index) => {
        stop.location.lat = Number((anchorLat + delta * Math.cos(index + dayNumber)).toFixed(6));
        stop.location.lng = Number((anchorLng + delta * Math.sin(index + dayNumber)).toFixed(6));
      });
    }

    const fallbackAnchor = (() => {
      const fromStop = uniqueStops.find((stop) => hasValidCoordinates(stop.location));
      if (fromStop) {
        return { lat: Number(fromStop.location.lat), lng: Number(fromStop.location.lng) };
      }
      if (destinationCenter?.lat && destinationCenter?.lon) {
        return { lat: Number(destinationCenter.lat), lng: Number(destinationCenter.lon) };
      }
      return null;
    })();

    if (fallbackAnchor) {
      uniqueStops.forEach((stop, index) => {
        if (hasValidCoordinates(stop.location)) return;
        const delta = 0.0045 + index * 0.0007;
        stop.location.lat = Number((fallbackAnchor.lat + delta * Math.cos(index + dayNumber)).toFixed(6));
        stop.location.lng = Number((fallbackAnchor.lng + delta * Math.sin(index + dayNumber)).toFixed(6));
      });
    }

    for (let i = 0; i < uniqueStops.length; i += 1) {
      const current = uniqueStops[i];
      const arr = toMinutes(current.arrivalTime);
      const dep = toMinutes(current.departureTime);
      if (arr == null || dep == null || dep <= arr) {
        const fallbackArr = i === 0 ? toMinutes(input.dailyStartTime) || 540 : (toMinutes(uniqueStops[i - 1].departureTime) || 540) + 20;
        const fallbackDep = fallbackArr + Math.max(45, current.durationMinutes || 90);
        current.arrivalTime = minutesToTime(fallbackArr);
        current.departureTime = minutesToTime(fallbackDep);
      }

      if (i > 0) {
        const prev = uniqueStops[i - 1];
        const distKm = (prev.location.lat && prev.location.lng && current.location.lat && current.location.lng)
          ? haversineKm(prev.location.lat, prev.location.lng, current.location.lat, current.location.lng)
          : 3;
        const travelMin = estimateTransit(distKm, input.transportMode);
        current.travelFromPrevious = {
          mode: input.transportMode || 'car',
          distanceKm: Number(distKm.toFixed(1)),
          estimatedMinutes: travelMin,
        };
        dayDistanceKm += Number(distKm.toFixed(1));
        dayTravelMinutes += travelMin;

        const prevDep = toMinutes(prev.departureTime) || 540;
        const expectedArr = prevDep + travelMin;
        const currArr = toMinutes(current.arrivalTime) || expectedArr;
        if (currArr < expectedArr) {
          const delta = expectedArr - currArr;
          const currDep = toMinutes(current.departureTime) || currArr + 90;
          current.arrivalTime = minutesToTime(expectedArr);
          current.departureTime = minutesToTime(currDep + delta);
        }
      }
    }

    const dayEstimatedCost = uniqueStops.reduce(
      (sum, stop) => sum + Number(stop.estimatedCost || 0),
      0
    );

    resultDays.push({
      day: dayNumber,
      title: String(day?.title || `Day ${dayNumber}`).trim(),
      summary: {
        distanceKm: Number(dayDistanceKm.toFixed(1)),
        movingTimeMinutes: dayTravelMinutes,
        estimatedCost: Math.round(dayEstimatedCost),
      },
      stops: uniqueStops,
    });

    overallDistanceKm += dayDistanceKm;
    overallTravelMinutes += dayTravelMinutes;
    overallEstimatedCost += dayEstimatedCost;
  }

  return {
    destination: raw?.destination || input.destination,
    summary: raw?.summary || `Personalized ${requestedDays}-day plan for ${input.destination}`,
    meta: {
      overallDistanceKm: Number(overallDistanceKm.toFixed(1)),
      overallTravelMinutes,
      overallEstimatedCost: Math.round(overallEstimatedCost),
      currency: input.currency || 'INR',
    },
    days: resultDays,
  };
}

async function buildDeterministicFallbackItinerary(input) {
  const requestedDays = resolveRequestedDays(input);
  const fallbackSeed = {
    destination: input.destination,
    summary: `Curated ${requestedDays}-day plan for ${input.destination}`,
    days: [],
  };
  const itinerary = await validateAndEnhanceItinerary(fallbackSeed, input);
  const qualityCheck = assessFallbackQuality(itinerary, input);
  if (!qualityCheck.ok) {
    throw new Error(`Fallback data quality too weak: ${qualityCheck.reason}`);
  }
  itinerary.meta = {
    ...(itinerary.meta || {}),
    generationMode: 'deterministic-fallback',
    aiFailed: true,
    fallbackQuality: qualityCheck.meta || null,
  };
  return itinerary;
}

async function generateItinerary(input) {
  const prompt = buildPrompt(input);
  const requestedDays = resolveRequestedDays(input);
  const dynamicMaxOutputTokens = Math.min(12000, Math.max(3200, requestedDays * 1400));
  try {
    const raw = await geminiService.generateStructuredJson({
      prompt,
      maxOutputTokens: dynamicMaxOutputTokens,
      temperature: 0.35,
      validateJson: validateRawItineraryShape,
    });
    const itinerary = await validateAndEnhanceItinerary(raw, input);

    const hasValidDays = Array.isArray(itinerary?.days) && itinerary.days.length > 0;
    const hasAtLeastOneStop = hasValidDays && itinerary.days.some((day) => Array.isArray(day?.stops) && day.stops.length > 0);

    if (!hasAtLeastOneStop) {
      throw new Error('Generated itinerary is empty.');
    }

    return itinerary;
  } catch (error) {
    console.warn('[Itinerary] generation failed:', error.message);
    try {
      console.warn('[Itinerary] attempting deterministic fallback itinerary...');
      return await buildDeterministicFallbackItinerary(input);
    } catch (fallbackError) {
      console.warn('[Itinerary] deterministic fallback failed:', fallbackError.message);
      throw new Error('Unable to generate itinerary right now. Please try again later.');
    }
  }
}

module.exports = {
  generateItinerary,
};
