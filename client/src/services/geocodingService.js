/**
 * GEOCODING SERVICE
 * Handles address search, reverse geocoding, and location resolution
 * Uses Nominatim (OpenStreetMap) for geocoding
 */

import axios from 'axios';
import { GEOCODING_CONFIG } from '../config/mapConfig';

// In-memory cache for geocoding results
const geocodeCache = new Map();

/**
 * Clear expired cache entries
 */
const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of geocodeCache.entries()) {
    if (now > value.expireAt) {
      geocodeCache.delete(key);
    }
  }
};

/**
 * Get cached geocoding result
 */
const getCachedResult = (key) => {
  if (!GEOCODING_CONFIG.USE_CACHE) return null;
  clearExpiredCache();
  const cached = geocodeCache.get(key);
  return cached ? cached.data : null;
};

/**
 * Cache geocoding result
 */
const cacheResult = (key, data) => {
  if (!GEOCODING_CONFIG.USE_CACHE) return;
  geocodeCache.set(key, {
    data,
    expireAt: Date.now() + GEOCODING_CONFIG.CACHE_DURATION,
  });
};

/**
 * Search for locations by address/place name
 * @param {string} query - Search query (address, place name, POI)
 * @param {Object} options - Search options
 * @returns {Promise<Array>} Array of location results
 */
export const searchLocation = async (query, options = {}) => {
  try {
    if (!query || query.trim().length === 0) {
      return { success: false, error: 'Search query cannot be empty' };
    }

    const cacheKey = `search_${query}`;
    const cachedResult = getCachedResult(cacheKey);

    if (cachedResult) {
      console.log('📦 Using cached search result');
      return cachedResult;
    }

    const params = {
      q: query,
      format: 'json',
      limit: options.limit || GEOCODING_CONFIG.REQUEST_OPTIONS.limit,
      zoom: options.zoom,
      addressdetails: 1,
      extratags: 1,
      namedetails: 1,
      ...options.params,
    };

    // Add country code if specified
    if (options.countryCode) {
      params.countrycodes = options.countryCode;
    }

    const response = await axios.get(`${GEOCODING_CONFIG.NOMINATIM_API}${GEOCODING_CONFIG.SEARCH_ENDPOINT}`, {
      params,
      timeout: GEOCODING_CONFIG.REQUEST_OPTIONS.timeout,
    });

    const results = {
      success: true,
      query,
      count: response.data.length,
      locations: response.data.map((item) => ({
        id: item.osm_id,
        name: item.name,
        displayName: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        boundingBox: item.boundingbox ? {
          south: parseFloat(item.boundingbox[0]),
          north: parseFloat(item.boundingbox[1]),
          west: parseFloat(item.boundingbox[2]),
          east: parseFloat(item.boundingbox[3]),
        } : null,
        type: item.type,
        osmType: item.osm_type,
        importance: parseFloat(item.importance),
        address: {
          street: item.address?.road,
          city: item.address?.city || item.address?.town,
          state: item.address?.state,
          country: item.address?.country,
          postcode: item.address?.postcode,
        },
        class: item.class,
        icon: item.icon,
      })),
      timestamp: Date.now(),
    };

    cacheResult(cacheKey, results);
    return results;
  } catch (error) {
    console.error('❌ Location Search Error:', error.message);
    return {
      success: false,
      error: error.message,
      query,
    };
  }
};

/**
 * Reverse geocode coordinates to address
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {Object} options - Options
 * @returns {Promise<Object>} Address information
 */
export const reverseGeocode = async (lat, lng, options = {}) => {
  try {
    if (!lat || !lng) {
      return { success: false, error: 'Latitude and longitude are required' };
    }

    const cacheKey = `reverse_${lat}_${lng}`;
    const cachedResult = getCachedResult(cacheKey);

    if (cachedResult) {
      console.log('📦 Using cached reverse geocode result');
      return cachedResult;
    }

    const params = {
      lat,
      lon: lng,
      format: 'json',
      zoom: options.zoom || 18,
      addressdetails: 1,
      extratags: 1,
      namedetails: 1,
    };

    const response = await axios.get(
      `${GEOCODING_CONFIG.NOMINATIM_API}${GEOCODING_CONFIG.REVERSE_ENDPOINT}`,
      {
        params,
        timeout: GEOCODING_CONFIG.REQUEST_OPTIONS.timeout,
      }
    );

    const result = {
      success: true,
      coordinate: { lat, lng },
      name: response.data.name,
      displayName: response.data.display_name,
      type: response.data.type,
      osmType: response.data.osm_type,
      osmId: response.data.osm_id,
      address: {
        street: response.data.address?.road,
        houseNumber: response.data.address?.house_number,
        city: response.data.address?.city || response.data.address?.town,
        state: response.data.address?.state,
        country: response.data.address?.country,
        postcode: response.data.address?.postcode,
        neighbourhood: response.data.address?.neighbourhood,
        village: response.data.address?.village,
        county: response.data.address?.county,
      },
      boundingBox: response.data.boundingbox ? {
        south: parseFloat(response.data.boundingbox[0]),
        north: parseFloat(response.data.boundingbox[1]),
        west: parseFloat(response.data.boundingbox[2]),
        east: parseFloat(response.data.boundingbox[3]),
      } : null,
      icon: response.data.icon,
      timestamp: Date.now(),
    };

    cacheResult(cacheKey, result);
    return result;
  } catch (error) {
    console.error('❌ Reverse Geocode Error:', error.message);
    return {
      success: false,
      error: error.message,
      coordinate: { lat, lng },
    };
  }
};

/**
 * Batch reverse geocode multiple coordinates
 * @param {Array<Array>} coordinates - Array of [lat, lng]
 * @param {Object} options - Options
 * @returns {Promise<Array>} Array of address results
 */
export const batchReverseGeocode = async (coordinates, options = {}) => {
  try {
    const results = await Promise.all(
      coordinates.map((coord) => reverseGeocode(coord[0], coord[1], options))
    );

    return {
      success: true,
      count: results.length,
      results,
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ Batch Reverse Geocode Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Autocomplete address/location
 * Optimized for real-time search suggestions
 */
export const autocompleteLocation = async (query, options = {}) => {
  try {
    if (!query || query.trim().length < 2) {
      return { success: true, suggestions: [] };
    }

    const searchResults = await searchLocation(query, {
      limit: options.limit || 8,
      ...options,
    });

    if (!searchResults.success) {
      return { success: false, error: searchResults.error };
    }

    return {
      success: true,
      suggestions: searchResults.locations.map((loc) => ({
        id: loc.id,
        label: loc.displayName,
        name: loc.name,
        lat: loc.lat,
        lng: loc.lng,
        type: loc.type,
        icon: loc.icon,
      })),
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ Autocomplete Error:', error.message);
    return {
      success: false,
      error: error.message,
      suggestions: [],
    };
  }
};

/**
 * Get location details
 */
export const getLocationDetails = async (lat, lng, options = {}) => {
  try {
    const geocoded = await reverseGeocode(lat, lng, options);

    if (!geocoded.success) {
      return geocoded;
    }

    // Add additional information
    return {
      ...geocoded,
      coordinates: { lat, lng },
      accuracy: options.accuracy || 'street',
    };
  } catch (error) {
    console.error('❌ Get Location Details Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Find nearest city/town from coordinates
 */
export const findNearestPlace = async (lat, lng, options = {}) => {
  try {
    const geocoded = await reverseGeocode(lat, lng, { zoom: 10 });

    if (!geocoded.success) {
      return geocoded;
    }

    return {
      success: true,
      place: geocoded.address.city || geocoded.address.state || geocoded.address.country,
      address: geocoded.address,
      coordinates: { lat, lng },
      timestamp: Date.now(),
    };
  } catch (error) {
    console.error('❌ Find Nearest Place Error:', error.message);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Clear all cached results
 */
export const clearGeocodeCache = () => {
  geocodeCache.clear();
  console.log('✓ Geocoding cache cleared');
};

/**
 * Get cache statistics
 */
export const getGeocodeStats = () => {
  return {
    totalCachedResults: geocodeCache.size,
    cacheSize: Array.from(geocodeCache.values()).reduce(
      (sum, item) => sum + JSON.stringify(item).length,
      0
    ),
  };
};

/**
 * Format address object to string
 */
export const formatAddress = (address) => {
  const parts = [];
  if (address.street) parts.push(address.street);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.country) parts.push(address.country);
  if (address.postcode) parts.push(address.postcode);
  return parts.filter(Boolean).join(', ');
};

/**
 * Get country code from coordinates
 */
export const getCountryCode = async (lat, lng) => {
  try {
    const result = await reverseGeocode(lat, lng);
    if (result.success && result.address) {
      return result.address.country?.toUpperCase() || null;
    }
    return null;
  } catch (error) {
    console.error('❌ Get Country Code Error:', error.message);
    return null;
  }
};

export default {
  searchLocation,
  reverseGeocode,
  batchReverseGeocode,
  autocompleteLocation,
  getLocationDetails,
  findNearestPlace,
  clearGeocodeCache,
  getGeocodeStats,
  formatAddress,
  getCountryCode,
};
