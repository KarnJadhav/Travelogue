/**
 * MapService.js - Comprehensive Map & Location Service
 * Handles all map-related API calls and data operations
 * 
 * API Endpoints Used:
 * - /api/opentripmap/search - Search destinations by query
 * - /api/opentripmap/place/:xid - Get detailed place information
 * - /api/opentripmap/popular - Get popular destinations
 * 
 * OPTIMIZATIONS:
 * - API response caching (10 min TTL)
 * - Debounced search calls
 * - Batch marker processing
 */

import api from '../api';
import { apiCache, debounce } from './mapOptimizations';
import { OLA_CONFIG } from '../config/mapConfig';

// Category colors and icons for different POI types
const POI_CATEGORIES = {
  monument: { color: '#8B4513', icon: '🏛️', label: 'Monument' },
  historic: { color: '#D2691E', icon: '🏰', label: 'Historic Site' },
  museum: { color: '#4169E1', icon: '🎨', label: 'Museum' },
  nature: { color: '#228B22', icon: '🌿', label: 'Nature' },
  beach: { color: '#1E90FF', icon: '🏖️', label: 'Beach' },
  park: { color: '#32CD32', icon: '🌳', label: 'Park' },
  temple: { color: '#FF6347', icon: '🙏', label: 'Temple' },
  churches: { color: '#8B0000', icon: '⛪', label: 'Religious Site' },
  fort: { color: '#556B2F', icon: '🏯', label: 'Fort' },
  palace: { color: '#FFD700', icon: '👑', label: 'Palace' },
  restaurant: { color: '#FF4500', icon: '🍽️', label: 'Restaurant' },
  hotel: { color: '#4F8A8B', icon: '🏨', label: 'Hotel' },
  cafe: { color: '#CD853F', icon: '☕', label: 'Cafe' },
  shop: { color: '#FF69B4', icon: '🛍️', label: 'Shop' },
  entertainment: { color: '#9370DB', icon: '🎭', label: 'Entertainment' },
  water: { color: '#00CED1', icon: '💧', label: 'Water Body' },
  default: { color: '#4F8A8B', icon: '📍', label: 'Place' }
};

/**
 * Search destinations by query or coordinates
 * @param {string} query - Search query (city name, landmark)
 * @param {object} coords - Optional {lat, lon}
 * @param {number} radius - Search radius in meters
 * @param {number} limit - Maximum results
 */
export const searchDestinations = async (query, coords = null, radius = 15000, limit = 20) => {
  try {
    // Create cache key
    const cacheKey = `search-${query}-${coords ? `${coords.lat}-${coords.lon}` : 'nocoords'}-${radius}-${limit}`;
    
    // Check cache first
    const cachedResult = apiCache.get(cacheKey);
    if (cachedResult) {
      console.log('Using cached search results');
      return cachedResult;
    }

    const params = {
      query,
      limit: Math.min(limit, 30), // Limit max results to 30
      radius,
      ...(coords && { lat: coords.lat, lon: coords.lon })
    };

    const response = await api.get('/api/opentripmap/search', { params });
    
    // Transform response with enhanced properties
    const features = response.data.features || [];
    const results = features.map(feature => transformFeature(feature));
    
    // Cache the results
    apiCache.set(cacheKey, results);
    
    return results;
  } catch (error) {
    console.error('Search destinations error:', error);
    throw error;
  }
};

/**
 * Get detailed information about a place
 * @param {string} xid - Unique identifier of the place
 */
export const getPlaceDetails = async (xid) => {
  try {
    // Check cache first
    const cacheKey = `place-${xid}`;
    const cachedResult = apiCache.get(cacheKey);
    if (cachedResult) {
      console.log('Using cached place details');
      return cachedResult;
    }

    const response = await api.get(`/api/opentripmap/place/${xid}`);
    
    // Cache the result (longer TTL for place details)
    apiCache.set(cacheKey, response.data);
    
    return response.data;
  } catch (error) {
    console.error('Get place details error:', error);
    throw error;
  }
};

/**
 * Get popular destinations
 */
export const getPopularDestinations = async () => {
  try {
    const response = await api.get('/api/opentripmap/popular');
    const destinations = response.data.popularDestinations || [];
    return destinations.map(dest => ({
      ...dest,
      xid: dest._id,
      lat: dest.lat,
      lon: dest.lon,
      category: 'popular',
      markerColor: POI_CATEGORIES.monument.color,
      icon: '⭐'
    }));
  } catch (error) {
    console.error('Get popular destinations error:', error);
    return [];
  }
};

/**
 * Search nearby points of interest by category
 * @param {number} lat
 * @param {number} lon
 * @param {string} category - Filter by category (museum, restaurant, etc)
 * @param {number} radius
 */
export const searchNearbyPOI = async (lat, lon, category = null, radius = 10000, limit = 25) => {
  try {
    // Build search query based on category
    const categoryQueries = {
      restaurant: 'restaurant',
      hotel: 'hotel',
      museum: 'museum',
      temple: 'temple',
      historic: 'historic',
      nature: 'nature',
      beach: 'beach',
      park: 'park'
    };

    const query = categoryQueries[category] || category || 'attraction';
    
    return await searchDestinations(query, { lat, lon }, radius, limit);
  } catch (error) {
    console.error('Search nearby POI error:', error);
    throw error;
  }
};

/**
 * Get category information from POI kind
 */
export const getCategoryInfo = (kinds) => {
  if (!kinds) return POI_CATEGORIES.default;
  
  const kindsList = kinds.toLowerCase().split(',');
  
  for (const kind of kindsList) {
    const trimmed = kind.trim();
    if (POI_CATEGORIES[trimmed]) {
      return POI_CATEGORIES[trimmed];
    }
  }
  
  // Fuzzy match
  for (const kind of kindsList) {
    const trimmed = kind.trim();
    for (const [key, value] of Object.entries(POI_CATEGORIES)) {
      if (trimmed.includes(key) || key.includes(trimmed)) {
        return value;
      }
    }
  }
  
  return POI_CATEGORIES.default;
};

/**
 * Transform raw API feature to enhanced marker object
 */
export const transformFeature = (feature) => {
  const { properties = {}, geometry = {} } = feature;
  const coords = geometry.coordinates || [0, 0];
  const category = getCategoryInfo(properties.kinds);

  return {
    xid: properties.xid,
    name: properties.name || 'Unknown',
    lat: coords[1],
    lon: coords[0],
    category: properties.kinds || 'place',
    description: properties.description || 'No description available',
    image: properties.image || properties.preview?.source || getPlaceholderImage(properties.name),
    rating: properties.rate || 4.0,
    address: properties.address || '',
    kinds: properties.kinds || '',
    markerColor: category.color,
    icon: category.icon,
    label: category.label,
    wikipedia: properties.wikipedia || '',
    url: properties.url || '',
    osm: properties.osm || '',
    distance: properties.dist ? `${(properties.dist / 1000).toFixed(1)} km` : null
  };
};

/**
 * Generate placeholder image URL
 */
export const getPlaceholderImage = (name) => {
  return `https://via.placeholder.com/400x300?text=${encodeURIComponent(name || 'Destination')}`;
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Cluster markers by proximity
 */
export const clusterMarkers = (markers, clusterRadius = 0.5) => {
  const clusters = [];
  const visited = new Set();

  markers.forEach((marker, idx) => {
    if (visited.has(idx)) return;

    const cluster = [marker];
    visited.add(idx);

    markers.forEach((otherMarker, otherIdx) => {
      if (!visited.has(otherIdx)) {
        const distance = calculateDistance(
          marker.lat, marker.lon,
          otherMarker.lat, otherMarker.lon
        );
        if (distance <= clusterRadius) {
          cluster.push(otherMarker);
          visited.add(otherIdx);
        }
      }
    });

    clusters.push(cluster);
  });

  return clusters;
};

/**
 * Filter destinations by criteria
 */
export const filterDestinations = (destinations, filters = {}) => {
  let filtered = [...destinations];

  if (filters.rating) {
    filtered = filtered.filter(d => (d.rating || 0) >= filters.rating);
  }

  if (filters.categories && filters.categories.length > 0) {
    filtered = filtered.filter(d => {
      const kinds = (d.kinds || '').toLowerCase();
      return filters.categories.some(cat => kinds.includes(cat.toLowerCase()));
    });
  }

  if (filters.distance && filters.userLat && filters.userLon) {
    filtered = filtered.filter(d => {
      const dist = calculateDistance(
        filters.userLat, filters.userLon,
        d.lat, d.lon
      );
      return dist <= filters.distance;
    });
  }

  if (filters.search) {
    const searchTerm = filters.search.toLowerCase();
    filtered = filtered.filter(d =>
      d.name.toLowerCase().includes(searchTerm) ||
      d.description.toLowerCase().includes(searchTerm) ||
      d.category.toLowerCase().includes(searchTerm)
    );
  }

  return filtered;
};

/**
 * Get bounds for all markers
 */
export const getBounds = (markers) => {
  if (!markers || markers.length === 0) {
    return null;
  }

  let minLat = markers[0].lat;
  let maxLat = markers[0].lat;
  let minLon = markers[0].lon;
  let maxLon = markers[0].lon;

  markers.forEach(marker => {
    minLat = Math.min(minLat, marker.lat);
    maxLat = Math.max(maxLat, marker.lat);
    minLon = Math.min(minLon, marker.lon);
    maxLon = Math.max(maxLon, marker.lon);
  });

  return {
    southwest: [minLat, minLon],
    northeast: [maxLat, maxLon]
  };
};

/**
 * Get user's current location
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          resolve({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
        },
        error => {
          reject(error);
        }
      );
    } else {
      reject(new Error('Geolocation not supported'));
    }
  });
};

/**
 * Tile layer configurations
 */
export const TILE_LAYERS = {
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    name: 'OpenStreetMap',
    maxZoom: 19,
    subdomains: 'abc',
    crossOrigin: 'anonymous'
  },
  osmde: {
    url: 'https://{s}.tile.openstreetmap.de/tiles/osmde/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    name: 'OpenStreetMap DE',
    maxZoom: 18,
    subdomains: 'abc',
    crossOrigin: 'anonymous'
  },
  otp: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors, © OpenTopoMap',
    name: 'OpenTopoMap',
    maxZoom: 17,
    subdomains: 'abc',
    crossOrigin: 'anonymous'
  },
  wmf: {
    url: 'https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap contributors',
    name: 'Wikimedia',
    maxZoom: 18,
    crossOrigin: 'anonymous'
  },
  cartodb_positron: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '© OpenStreetMap contributors, © CartoDB',
    name: 'CartoDB Light',
    maxZoom: 19,
    subdomains: 'abcd',
    crossOrigin: 'anonymous'
  },
  ola_light: {
    url: OLA_CONFIG.TILE_URL || 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: OLA_CONFIG.IS_CONFIGURED ? '© Ola Maps' : '© OpenStreetMap contributors',
    name: OLA_CONFIG.IS_CONFIGURED ? 'Ola Light' : 'Ola Light (fallback)',
    maxZoom: 20,
    crossOrigin: 'anonymous'
  }
};

export default {
  searchDestinations,
  getPlaceDetails,
  getPopularDestinations,
  searchNearbyPOI,
  getCategoryInfo,
  transformFeature,
  calculateDistance,
  clusterMarkers,
  filterDestinations,
  getBounds,
  getCurrentLocation,
  TILE_LAYERS,
  POI_CATEGORIES
};
