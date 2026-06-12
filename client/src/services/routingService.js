/**
 * ROUTING SERVICE
 * Handles directions, route optimization, and travel time calculations
 * Uses OpenRouteService with OSRM fallback for real routing information
 */

import axios from 'axios';
import { ROUTING_CONFIG, getRouteColor, isRoutingConfigured } from '../config/mapConfig';

// Simple in-memory cache
const routeCache = new Map();
const MAX_LOCAL_ESTIMATED_FALLBACK_DISTANCE_METERS = 250000; // 250km for unknown-country local fallback
const MAX_ORS_ALTERNATIVE_ROUTE_DISTANCE_METERS = 100000; // ORS cloud limit for alternative_routes
const FLIGHT_CRUISE_SPEED_KMH = 820;
const FLIGHT_FIXED_OVERHEAD_SECONDS = 90 * 60; // boarding/taxi/security buffer

const MAJOR_AIRPORTS = [
  { code: 'AMS', name: 'Amsterdam Schiphol', city: 'Amsterdam', country: 'Netherlands', lat: 52.3105, lon: 4.7683 },
  { code: 'KTM', name: 'Tribhuvan International', city: 'Kathmandu', country: 'Nepal', lat: 27.6977, lon: 85.3591 },
  { code: 'DEL', name: 'Indira Gandhi International', city: 'Delhi', country: 'India', lat: 28.5562, lon: 77.1 },
  { code: 'BOM', name: 'Chhatrapati Shivaji Maharaj International', city: 'Mumbai', country: 'India', lat: 19.0896, lon: 72.8656 },
  { code: 'BLR', name: 'Kempegowda International', city: 'Bengaluru', country: 'India', lat: 13.1986, lon: 77.7066 },
  { code: 'MAA', name: 'Chennai International', city: 'Chennai', country: 'India', lat: 12.9941, lon: 80.1709 },
  { code: 'CCU', name: 'Netaji Subhas Chandra Bose International', city: 'Kolkata', country: 'India', lat: 22.6547, lon: 88.4467 },
  { code: 'GOI', name: 'Goa International', city: 'Goa', country: 'India', lat: 15.3808, lon: 73.8314 },
  { code: 'LHR', name: 'Heathrow', city: 'London', country: 'United Kingdom', lat: 51.47, lon: -0.4543 },
  { code: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', lat: 49.0097, lon: 2.5479 },
  { code: 'FRA', name: 'Frankfurt Airport', city: 'Frankfurt', country: 'Germany', lat: 50.0379, lon: 8.5622 },
  { code: 'MAD', name: 'Adolfo Suarez Madrid-Barajas', city: 'Madrid', country: 'Spain', lat: 40.4983, lon: -3.5676 },
  { code: 'FCO', name: 'Leonardo da Vinci International', city: 'Rome', country: 'Italy', lat: 41.8003, lon: 12.2389 },
  { code: 'IST', name: 'Istanbul Airport', city: 'Istanbul', country: 'Turkey', lat: 41.2753, lon: 28.7519 },
  { code: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'United Arab Emirates', lat: 25.2532, lon: 55.3657 },
  { code: 'SIN', name: 'Singapore Changi', city: 'Singapore', country: 'Singapore', lat: 1.3644, lon: 103.9915 },
  { code: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand', lat: 13.69, lon: 100.7501 },
  { code: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan', lat: 35.5494, lon: 139.7798 },
  { code: 'ICN', name: 'Incheon International', city: 'Seoul', country: 'South Korea', lat: 37.4602, lon: 126.4407 },
  { code: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', lat: -33.9399, lon: 151.1753 },
  { code: 'JFK', name: 'John F. Kennedy International', city: 'New York', country: 'United States', lat: 40.6413, lon: -73.7781 },
  { code: 'EWR', name: 'Newark Liberty International', city: 'Newark', country: 'United States', lat: 40.6895, lon: -74.1745 },
  { code: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'United States', lat: 33.9416, lon: -118.4085 },
  { code: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'United States', lat: 37.6213, lon: -122.379 },
  { code: 'ORD', name: 'Chicago O Hare International', city: 'Chicago', country: 'United States', lat: 41.9742, lon: -87.9073 },
  { code: 'YYZ', name: 'Toronto Pearson International', city: 'Toronto', country: 'Canada', lat: 43.6777, lon: -79.6248 },
  { code: 'GRU', name: 'Sao Paulo Guarulhos International', city: 'Sao Paulo', country: 'Brazil', lat: -23.4356, lon: -46.4731 },
  { code: 'JNB', name: 'O R Tambo International', city: 'Johannesburg', country: 'South Africa', lat: -26.1337, lon: 28.242 },
  { code: 'CAI', name: 'Cairo International', city: 'Cairo', country: 'Egypt', lat: 30.1219, lon: 31.4056 },
  { code: 'DOH', name: 'Hamad International', city: 'Doha', country: 'Qatar', lat: 25.2731, lon: 51.6081 },
];

/**
 * Clear expired cache entries
 */
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of routeCache.entries()) {
    if (now > value.expireAt) {
      routeCache.delete(key);
    }
  }
};

/**
 * Generate cache key
 */
const generateCacheKey = (coordinates, profile, avoidPolygons, provider = 'auto', options = {}) => {
  const behaviorOptions = {
    noAlternatives: options.noAlternatives === true,
    allowEstimatedFallback: options.allowEstimatedFallback === true,
    allowEstimatedFallbackAnyDistance: options.allowEstimatedFallbackAnyDistance === true,
    routeOptions: options.routeOptions || {},
  };
  return `${coordinates.join(',')}_${profile}_${provider}_${JSON.stringify(avoidPolygons || {})}_${JSON.stringify(behaviorOptions)}`;
};

/**
 * Get route from cache if available
 */
const getCachedRoute = (key) => {
  if (!ROUTING_CONFIG.USE_CACHE) return null;
  clearExpiredCache();
  const cached = routeCache.get(key);
  return cached ? cached.data : null;
};

/**
 * Cache route result
 */
const cacheRoute = (key, data) => {
  if (!ROUTING_CONFIG.USE_CACHE) return;
  routeCache.set(key, {
    data,
    expireAt: Date.now() + ROUTING_CONFIG.CACHE_DURATION,
  });
};

/**
 * Format coordinates for OpenRouteService API
 * Expects array of [lat, lng] and converts to [lng, lat]
 */
const formatCoordinates = (coords) => {
  if (Array.isArray(coords[0])) {
    // Array of coordinates
    return coords.map((c) => [c[1], c[0]]); // [lat, lng] -> [lng, lat]
  }
  // Single coordinate
  return [coords[1], coords[0]];
};

/**
 * Parse route instructions from OpenRouteService segments
 */
const parseRouteInstructions = (feature) => {
  const segments = feature?.properties?.segments || [];
  const geometryCoords = feature?.geometry?.coordinates || [];
  const latLngCoords = geometryCoords.map((coord) => [coord[1], coord[0]]);
  const instructions = [];
  let stepNumber = 1;

  segments.forEach((segment, segmentIndex) => {
    (segment?.steps || []).forEach((step, stepIndex) => {
      const wayPoints = Array.isArray(step?.way_points) ? step.way_points : [];
      const fromIndex = Number.isInteger(wayPoints[0]) ? wayPoints[0] : 0;
      const toIndex = Number.isInteger(wayPoints[1]) ? wayPoints[1] : fromIndex;

      instructions.push({
        id: `${segmentIndex}-${stepIndex}`,
        stepNumber,
        text: step?.instruction || 'Continue',
        name: step?.name || '',
        type: step?.type ?? null,
        distance: step?.distance || 0,
        distanceText: formatDistance(step?.distance || 0),
        duration: step?.duration || 0,
        durationText: formatDuration(step?.duration || 0),
        fromIndex,
        toIndex,
        fromCoord: latLngCoords[fromIndex] || null,
        toCoord: latLngCoords[toIndex] || latLngCoords[fromIndex] || null,
      });

      stepNumber += 1;
    });
  });

  return instructions;
};

const OSRM_BASE_URL = 'https://router.project-osrm.org/route/v1';

const getProfileForOSRM = (profile = ROUTING_CONFIG.DEFAULT_PROFILE) => {
  if (String(profile).includes('cycling')) return 'cycling';
  if (String(profile).includes('foot')) return 'walking';
  return 'driving';
};

const getAverageSpeedKmh = (profile = ROUTING_CONFIG.DEFAULT_PROFILE) => {
  const normalized = String(profile || '').toLowerCase();
  if (normalized.includes('foot') || normalized.includes('walk')) return 5;
  if (normalized.includes('cycling') || normalized.includes('bike')) return 16;
  return 42;
};

const estimateDurationByProfile = (distanceMeters, profile) => {
  const speedKmh = getAverageSpeedKmh(profile);
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return 0;
  const speedMetersPerSecond = (speedKmh * 1000) / 3600;
  return distanceMeters / speedMetersPerSecond;
};

const calculateHaversineDistance = (from, to) => {
  const [fromLat, fromLng] = from || [];
  const [toLat, toLng] = to || [];
  if (![fromLat, fromLng, toLat, toLng].every(Number.isFinite)) return 0;

  const toRadians = (value) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(fromLat)) * Math.cos(toRadians(toLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadiusMeters * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const createEstimatedRouteFallback = (waypoints, profile, options = {}) => {
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    throw new Error('At least 2 waypoints are required');
  }

  const distances = [];
  for (let index = 0; index < waypoints.length - 1; index += 1) {
    distances.push(calculateHaversineDistance(waypoints[index], waypoints[index + 1]));
  }

  const totalDistance = distances.reduce((sum, segment) => sum + segment, 0);
  const totalDuration = estimateDurationByProfile(totalDistance, profile);
  const routeCoordinates = waypoints.map(([lat, lng]) => [lng, lat]);
  const instructions = distances.map((distance, index) => {
    const duration = estimateDurationByProfile(distance, profile);
    return {
      id: `estimated-${index}`,
      stepNumber: index + 1,
      text: index === 0 ? 'Head towards destination' : 'Continue to next waypoint',
      name: '',
      type: index === 0 ? 'depart' : 'continue',
      modifier: null,
      distance,
      distanceText: formatDistance(distance),
      duration,
      durationText: formatDuration(duration),
      fromIndex: index,
      toIndex: index + 1,
      fromCoord: waypoints[index],
      toCoord: waypoints[index + 1],
    };
  });

  instructions.push({
    id: `estimated-arrive-${waypoints.length - 1}`,
    stepNumber: instructions.length + 1,
    text: 'You have arrived at your destination',
    name: '',
    type: 'arrive',
    modifier: null,
    distance: 0,
    distanceText: formatDistance(0),
    duration: 0,
    durationText: formatDuration(0),
    fromIndex: waypoints.length - 1,
    toIndex: waypoints.length - 1,
    fromCoord: waypoints[waypoints.length - 1],
    toCoord: waypoints[waypoints.length - 1],
  });

  return {
    success: true,
    provider: 'estimated',
    routes: [
      {
        id: 0,
        type: 'route',
        geometry: {
          type: 'LineString',
          coordinates: routeCoordinates,
        },
        distance: totalDistance,
        duration: totalDuration,
        ascent: 0,
        descent: 0,
        distanceKM: (totalDistance / 1000).toFixed(2),
        durationHM: formatDuration(totalDuration),
        color: options.color || getRouteColor(profile),
        isAlternative: false,
        segments: [],
        instructions,
        waypoints,
      },
    ],
    waypoints,
    profile,
    timestamp: Date.now(),
    fallback: true,
  };
};

const getWaypointChainDistanceMeters = (waypoints = []) => {
  if (!Array.isArray(waypoints) || waypoints.length < 2) return 0;
  let totalDistance = 0;
  for (let index = 0; index < waypoints.length - 1; index += 1) {
    totalDistance += calculateHaversineDistance(waypoints[index], waypoints[index + 1]);
  }
  return totalDistance;
};

const normalizeCountry = (value = '') => String(value || '').trim().toLowerCase();

const isNoRouteError = (error) => {
  const message = String(
    error?.response?.data?.error?.message
    || error?.response?.data?.message
    || error?.message
    || ''
  ).toLowerCase();

  return (
    message.includes('did not return a route')
    || message.includes('could not find routable point')
    || message.includes('no route')
    || message.includes('route not found')
    || message.includes('cannot find')
  );
};

const findNearestAirport = (location, country = '') => {
  const targetLat = Number(location?.lat);
  const targetLon = Number(location?.lon ?? location?.lng);
  if (![targetLat, targetLon].every(Number.isFinite)) return null;

  const normalizedCountry = normalizeCountry(country || location?.country || '');
  const countryPool = normalizedCountry
    ? MAJOR_AIRPORTS.filter((airport) => normalizeCountry(airport.country) === normalizedCountry)
    : [];
  const pool = countryPool.length > 0 ? countryPool : MAJOR_AIRPORTS;

  let winner = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  pool.forEach((airport) => {
    const distance = calculateHaversineDistance([targetLat, targetLon], [airport.lat, airport.lon]);
    if (distance < bestDistance) {
      bestDistance = distance;
      winner = airport;
    }
  });

  if (!winner) return null;
  return {
    ...winner,
    distanceMeters: bestDistance,
    distanceKM: (bestDistance / 1000).toFixed(1),
  };
};

const estimateFlightDurationSeconds = (distanceMeters) => {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return FLIGHT_FIXED_OVERHEAD_SECONDS;
  const speedMetersPerSecond = (FLIGHT_CRUISE_SPEED_KMH * 1000) / 3600;
  return Math.round(distanceMeters / speedMetersPerSecond) + FLIGHT_FIXED_OVERHEAD_SECONDS;
};

export const getMultimodalSuggestion = (origin, destination, options = {}) => {
  if (!origin || !destination) return null;

  const originCountry = options.originCountry || origin?.country || '';
  const destinationCountry = options.destinationCountry || destination?.country || '';

  const departureAirport = findNearestAirport(origin, originCountry);
  const arrivalAirport = findNearestAirport(destination, destinationCountry);
  if (!departureAirport || !arrivalAirport) return null;

  const originRoadMeters = calculateHaversineDistance(
    [Number(origin.lat), Number(origin.lon ?? origin.lng)],
    [departureAirport.lat, departureAirport.lon]
  );
  const destinationRoadMeters = calculateHaversineDistance(
    [arrivalAirport.lat, arrivalAirport.lon],
    [Number(destination.lat), Number(destination.lon ?? destination.lng)]
  );
  const flightMeters = calculateHaversineDistance(
    [departureAirport.lat, departureAirport.lon],
    [arrivalAirport.lat, arrivalAirport.lon]
  );

  const profile = options.profile || ROUTING_CONFIG.DEFAULT_PROFILE;
  const originRoadSeconds = estimateDurationByProfile(originRoadMeters, profile);
  const destinationRoadSeconds = estimateDurationByProfile(destinationRoadMeters, profile);
  const flightSeconds = estimateFlightDurationSeconds(flightMeters);
  const totalSeconds = originRoadSeconds + flightSeconds + destinationRoadSeconds;

  return {
    success: true,
    type: 'multimodal',
    reason: 'No direct road path available',
    totalDistanceKM: ((originRoadMeters + flightMeters + destinationRoadMeters) / 1000).toFixed(1),
    totalDurationHM: formatDuration(totalSeconds),
    departureAirport,
    arrivalAirport,
    legs: [
      {
        mode: 'road',
        title: `Road to ${departureAirport.code}`,
        from: origin?.name || 'Origin',
        to: `${departureAirport.city} (${departureAirport.code})`,
        distanceKM: (originRoadMeters / 1000).toFixed(1),
        durationHM: formatDuration(originRoadSeconds),
      },
      {
        mode: 'flight',
        title: `Flight ${departureAirport.code} -> ${arrivalAirport.code}`,
        from: `${departureAirport.city} (${departureAirport.code})`,
        to: `${arrivalAirport.city} (${arrivalAirport.code})`,
        distanceKM: (flightMeters / 1000).toFixed(1),
        durationHM: formatDuration(flightSeconds),
      },
      {
        mode: 'road',
        title: `Road to destination`,
        from: `${arrivalAirport.city} (${arrivalAirport.code})`,
        to: destination?.name || 'Destination',
        distanceKM: (destinationRoadMeters / 1000).toFixed(1),
        durationHM: formatDuration(destinationRoadSeconds),
      },
    ],
  };
};

const buildInstructionTextFromOSRM = (step) => {
  const maneuver = step?.maneuver || {};
  const type = maneuver?.type || '';
  const modifier = maneuver?.modifier || '';
  const road = step?.name ? ` onto ${step.name}` : '';

  if (type === 'depart') return `Head ${modifier || 'forward'}${road}`;
  if (type === 'arrive') return 'You have arrived at your destination';
  if (type === 'roundabout') return `Enter roundabout and take exit${road}`;
  if (type === 'merge') return `Merge ${modifier || ''}${road}`.trim();
  if (type === 'fork') return `Keep ${modifier || 'forward'}${road}`;
  if (type === 'end of road') return `Turn ${modifier || 'ahead'}${road}`;
  if (type === 'on ramp') return `Take ramp ${modifier || ''}${road}`.trim();
  if (type === 'off ramp') return `Take exit ${modifier || ''}${road}`.trim();
  if (modifier) return `Turn ${modifier}${road}`;
  if (step?.name) return `Continue on ${step.name}`;
  return 'Continue straight';
};

const parseOSRMInstructions = (route, profile = ROUTING_CONFIG.DEFAULT_PROFILE) => {
  const shouldEstimateByProfile = getProfileForOSRM(profile) !== 'driving';
  const instructions = [];
  const legs = route?.legs || [];
  let stepNumber = 1;

  legs.forEach((leg, legIndex) => {
    (leg?.steps || []).forEach((step, stepIndex) => {
      const geometry = step?.geometry?.coordinates || [];
      const firstCoord = geometry[0];
      const lastCoord = geometry[geometry.length - 1] || firstCoord;
      const maneuver = step?.maneuver || {};

      const distance = step?.distance || 0;
      const duration = shouldEstimateByProfile
        ? estimateDurationByProfile(distance, profile)
        : (step?.duration || 0);

      instructions.push({
        id: `${legIndex}-${stepIndex}`,
        stepNumber,
        text: buildInstructionTextFromOSRM(step),
        name: step?.name || '',
        type: maneuver?.type || null,
        modifier: maneuver?.modifier || null,
        distance,
        distanceText: formatDistance(distance),
        duration,
        durationText: formatDuration(duration),
        fromIndex: null,
        toIndex: null,
        fromCoord: firstCoord ? [firstCoord[1], firstCoord[0]] : null,
        toCoord: lastCoord ? [lastCoord[1], lastCoord[0]] : null,
      });

      stepNumber += 1;
    });
  });

  return instructions;
};

const normalizeOpenRouteServiceData = (response, options, profile, waypoints) => {
  return {
    success: true,
    provider: 'openrouteservice',
    routes: response.data.features.map((feature, index) => ({
      id: index,
      type: 'route',
      geometry: feature.geometry,
      distance: feature.properties.summary.distance,
      duration: feature.properties.summary.duration,
      ascent: feature.properties.summary.ascent || 0,
      descent: feature.properties.summary.descent || 0,
      distanceKM: (feature.properties.summary.distance / 1000).toFixed(2),
      durationHM: formatDuration(feature.properties.summary.duration),
      color: options.color || getRouteColor(profile),
      isAlternative: index > 0,
      segments: feature.properties.segments || [],
      instructions: parseRouteInstructions(feature),
      waypoints: feature.geometry.coordinates.map((coord) => [coord[1], coord[0]]),
    })),
    waypoints,
    profile,
    timestamp: Date.now(),
  };
};

const normalizeOSRMData = (response, options, profile, waypoints) => {
  const routes = response?.data?.routes || [];
  const shouldEstimateByProfile = getProfileForOSRM(profile) !== 'driving';
  return {
    success: true,
    provider: 'osrm',
    routes: routes.map((route, index) => ({
      distance: route.distance || 0,
      duration: shouldEstimateByProfile
        ? estimateDurationByProfile(route.distance || 0, profile)
        : (route.duration || 0),
      id: index,
      type: 'route',
      geometry: route.geometry,
      ascent: 0,
      descent: 0,
      distanceKM: (((route.distance || 0)) / 1000).toFixed(2),
      durationHM: formatDuration(
        shouldEstimateByProfile
          ? estimateDurationByProfile(route.distance || 0, profile)
          : (route.duration || 0)
      ),
      color: options.color || getRouteColor(profile),
      isAlternative: index > 0,
      segments: route.legs || [],
      instructions: parseOSRMInstructions(route, profile),
      waypoints: (route.geometry?.coordinates || []).map((coord) => [coord[1], coord[0]]),
    })),
    waypoints,
    profile,
    timestamp: Date.now(),
  };
};

const getRouteFromOpenRouteService = async (coordinates, waypoints, profile, options) => {
  const safeCoordinates = (Array.isArray(coordinates) ? coordinates : [])
    .filter((coord) => Array.isArray(coord) && coord.length >= 2)
    .map((coord) => [Number(coord[0]), Number(coord[1])])
    .filter((coord) => Number.isFinite(coord[0]) && Number.isFinite(coord[1]));

  if (safeCoordinates.length < 2) {
    throw new Error('Invalid routing coordinates');
  }

  const requestBody = {
    coordinates: safeCoordinates,
    elevation: options.elevation || false,
    instructions: options.instructions !== false,
    ...options.routeOptions,
  };

  const approximateRouteDistance = getWaypointChainDistanceMeters(waypoints);
  const canRequestAlternativeRoutes = (
    ROUTING_CONFIG.ALTERNATIVE_ROUTES.enabled
    && !options.noAlternatives
    && approximateRouteDistance > 0
    && approximateRouteDistance <= MAX_ORS_ALTERNATIVE_ROUTE_DISTANCE_METERS
  );

  if (canRequestAlternativeRoutes) {
    requestBody.alternative_routes = {
      share_factor: ROUTING_CONFIG.ALTERNATIVE_ROUTES.shareFactor,
      target_count: ROUTING_CONFIG.ALTERNATIVE_ROUTES.count,
    };
  }

  const requestUrl = `${ROUTING_CONFIG.API_BASE}${ROUTING_CONFIG.DIRECTIONS_ENDPOINT}/${profile}/geojson`;
  const requestHeaders = {
    Authorization: `Bearer ${ROUTING_CONFIG.API_KEY}`,
    'Content-Type': 'application/json',
    Accept: 'application/geo+json, application/json;q=0.9, */*;q=0.8',
  };

  let response;
  try {
    response = await axios.post(requestUrl, requestBody, {
      headers: requestHeaders,
      timeout: ROUTING_CONFIG.REQUEST_OPTIONS.timeout,
    });
  } catch (error) {
    // Some optional fields (preference/alternative config) can trigger ORS 400.
    // Retry once with a minimal valid payload to keep routing resilient.
    if (error?.response?.status === 400) {
      const minimalBody = {
        coordinates: safeCoordinates,
        elevation: false,
        instructions: true,
      };
      response = await axios.post(requestUrl, minimalBody, {
        headers: requestHeaders,
        timeout: ROUTING_CONFIG.REQUEST_OPTIONS.timeout,
      });
    } else {
      throw error;
    }
  }

  return normalizeOpenRouteServiceData(response, options, profile, waypoints);
};

const getRouteFromOSRM = async (coordinates, waypoints, profile, options) => {
  const osrmProfile = getProfileForOSRM(profile);
  const coordinateParam = coordinates.map((coord) => `${coord[0]},${coord[1]}`).join(';');
  const alternatives = options.noAlternatives ? 'false' : 'true';

  const response = await axios.get(`${OSRM_BASE_URL}/${osrmProfile}/${coordinateParam}`, {
    params: {
      overview: 'full',
      geometries: 'geojson',
      steps: options.instructions !== false,
      alternatives,
      annotations: false,
    },
    timeout: ROUTING_CONFIG.REQUEST_OPTIONS.timeout,
  });

  if (!Array.isArray(response?.data?.routes) || response.data.routes.length === 0) {
    throw new Error('OSRM did not return a route');
  }

  return normalizeOSRMData(response, options, profile, waypoints);
};

/**
 * Get route between two or more points
 * @param {Array<Array>} waypoints - Array of [lat, lng] coordinates
 * @param {Object} options - Route options
 * @returns {Promise<Object>} Route data with geometry, distance, duration
 */
export const getRoute = async (waypoints, options = {}) => {
  try {
    if (!waypoints || waypoints.length < 2) {
      throw new Error('At least 2 waypoints are required');
    }

    const profile = options.profile || ROUTING_CONFIG.DEFAULT_PROFILE;
    const provider = options.provider || 'auto';
    const allowEstimatedFallback = options.allowEstimatedFallback === true;
    const allowEstimatedFallbackAnyDistance = options.allowEstimatedFallbackAnyDistance === true;
    const cacheKey = generateCacheKey(waypoints, profile, options.avoidPolygons, provider, options);

    const cachedRoute = getCachedRoute(cacheKey);
    if (cachedRoute) return cachedRoute;

    const coordinates = formatCoordinates(waypoints);
    let routeData = null;
    let lastError = null;
    let orsError = null;
    let osrmError = null;

    if ((provider === 'auto' || provider === 'openrouteservice') && isRoutingConfigured()) {
      try {
        routeData = await getRouteFromOpenRouteService(coordinates, waypoints, profile, options);
      } catch (error) {
        orsError = error;
        lastError = error;
      }
    }

    if (!routeData && (provider === 'auto' || provider === 'osrm')) {
      try {
        routeData = await getRouteFromOSRM(coordinates, waypoints, profile, options);
      } catch (error) {
        osrmError = error;
        lastError = error;
      }
    }

    if (!routeData) {
      if (provider === 'auto') {
        if (isNoRouteError(lastError)) {
          throw new Error(
            'No direct road route found. This trip likely needs a flight or ferry for part of the journey.'
          );
        }

        if (allowEstimatedFallback) {
          const originCountry = normalizeCountry(options.originCountry);
          const destinationCountry = normalizeCountry(options.destinationCountry);
          const sameCountry = Boolean(
            originCountry
            && destinationCountry
            && originCountry === destinationCountry
          );
          const straightLineDistance = getWaypointChainDistanceMeters(waypoints);
          if (
            allowEstimatedFallbackAnyDistance
            || sameCountry
            || straightLineDistance <= MAX_LOCAL_ESTIMATED_FALLBACK_DISTANCE_METERS
          ) {
            routeData = createEstimatedRouteFallback(waypoints, profile, options);
          } else {
            throw new Error(
              'No direct road route found. This trip likely needs a flight or ferry for part of the journey.'
            );
          }
        } else {
          const preferredError = orsError || osrmError || lastError;
          const providerMessage = preferredError?.response?.data?.error?.message
            || preferredError?.response?.data?.message
            || preferredError?.message;
          if (providerMessage) {
            throw new Error(providerMessage);
          }
          throw new Error('Unable to fetch road route right now. Please check routing connectivity and try again.');
        }
      } else if (lastError?.message) {
        throw lastError;
      } else {
        throw new Error('No routing provider available');
      }
    }

    cacheRoute(cacheKey, routeData);

    return routeData;
  } catch (error) {
    const message = error?.response?.data?.error?.message || error?.response?.data?.message || error?.message || 'Routing failed';
    if (error?.response?.data) {
      console.error('Routing provider response:', error.response.data);
    }
    console.error('Routing Error:', message);
    throw {
      success: false,
      error: message,
      code: error.response?.status || 'UNKNOWN_ERROR',
    };
  }
};

/**
 * Get isochrone (reachable area) from a point
 * Shows area reachable within specified time/distance
 */
export const getIsochrone = async (center, options = {}) => {
  try {
    if (!isRoutingConfigured()) {
      throw new Error('OpenRouteService API key not configured');
    }

    const profile = options.profile || ROUTING_CONFIG.DEFAULT_PROFILE;
    const type = options.type || 'time'; // 'time' or 'distance'
    const value = options.value || 300; // seconds or meters
    const intervals = options.intervals || [value];

    const [lng, lat] = formatCoordinates(center);

    const response = await axios.get(
      `${ROUTING_CONFIG.API_BASE}${ROUTING_CONFIG.ISOCHRONE_ENDPOINT}/${profile}`,
      {
        params: {
          locations: `${lng},${lat}`,
          range_type: type,
          range: intervals.join(','),
          interval: value,
          format: 'geojson',
        },
        headers: {
          'Authorization': `Bearer ${ROUTING_CONFIG.API_KEY}`,
          'Accept': 'application/json',
        },
        timeout: ROUTING_CONFIG.REQUEST_OPTIONS.timeout,
      }
    );

    return {
      success: true,
      center: [lat, lng],
      type,
      value,
      features: response.data.features,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('âŒ Isochrone Error:', error.message);
    throw {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Get travel matrix (distances/times between multiple points)
 * Useful for calculating travel times from one point to many destinations
 */
export const getTravelMatrix = async (sources, destinations, options = {}) => {
  try {
    if (!isRoutingConfigured()) {
      throw new Error('OpenRouteService API key not configured');
    }

    const profile = options.profile || ROUTING_CONFIG.DEFAULT_PROFILE;

    const sourceCoords = formatCoordinates(sources);
    const destCoords = formatCoordinates(destinations);

    const response = await axios.post(
      `${ROUTING_CONFIG.API_BASE}${ROUTING_CONFIG.MATRIX_ENDPOINT}/${profile}`,
      {
        sources: 'all',
        destinations: 'all',
        locations: [...sourceCoords, ...destCoords],
      },
      {
        headers: {
          'Authorization': `Bearer ${ROUTING_CONFIG.API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        timeout: ROUTING_CONFIG.REQUEST_OPTIONS.timeout,
      }
    );

    return {
      success: true,
      distances: response.data.distances, // meters
      durations: response.data.durations, // seconds
      sources: sources,
      destinations: destinations,
      profile,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('âŒ Travel Matrix Error:', error.message);
    throw {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Calculate total distance and duration for multiple waypoints
 */
export const calculateRouteStats = (route) => {
  if (!route || !route.routes || route.routes.length === 0) {
    return { distance: 0, duration: 0, distanceKM: '0', durationHM: '0h 0m' };
  }

  const mainRoute = route.routes[0];
  return {
    distance: mainRoute.distance,
    duration: mainRoute.duration,
    distanceKM: mainRoute.distanceKM,
    durationHM: mainRoute.durationHM,
  };
};

/**
 * Format seconds to human readable format (e.g., "1h 30m")
 */
export const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m';
  if (seconds < 60) return '<1m';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${Math.max(1, minutes)}m`;
  return `${hours}h ${minutes}m`;
};

/**
 * Format meters to human readable format
 */
export const formatDistance = (meters) => {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(2)}km`;
};

/**
 * Optimize route order for visiting multiple destinations
 * Returns waypoints in optimized order
 */
export const optimizeRoute = async (waypoints, options = {}) => {
  try {
    const startPoint = waypoints[0];
    const middlePoints = waypoints.slice(1, -1);

    if (middlePoints.length === 0) {
      return { success: true, waypoints, optimized: false };
    }

    // Use matrix to find best order (simple greedy approach)
    const response = await getTravelMatrix(
      [startPoint],
      waypoints.slice(1),
      options
    );

    if (!response.success) throw new Error('Matrix calculation failed');

    // Greedy: always go to nearest unvisited point
    const optimized = [startPoint];
    const visited = new Set([0]);
    let current = startPoint;

    while (visited.size < waypoints.length) {
      let nearest = -1;
      let minDistance = Infinity;

      const row = response.durations[0];

      for (let i = 0; i < waypoints.length; i++) {
        if (!visited.has(i) && row[i] < minDistance) {
          minDistance = row[i];
          nearest = i;
        }
      }

      if (nearest === -1) break;
      visited.add(nearest);
      current = waypoints[nearest];
      optimized.push(current);
    }

    return {
      success: true,
      waypoints: optimized,
      optimized: true,
    };
  } catch (error) {
    console.error('âŒ Route Optimization Error:', error.message);
    return {
      success: false,
      error: error.message,
      waypoints,
    };
  }
};

/**
 * Clear all cached routes
 */
export const clearRouteCache = () => {
  routeCache.clear();
  console.log('âœ“ Route cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    totalCachedRoutes: routeCache.size,
    cacheSize: Array.from(routeCache.values()).reduce((sum, item) => sum + JSON.stringify(item).length, 0),
  };
};

export default {
  getRoute,
  getIsochrone,
  getTravelMatrix,
  getMultimodalSuggestion,
  calculateRouteStats,
  formatDuration,
  formatDistance,
  optimizeRoute,
  clearRouteCache,
  getCacheStats,
};

