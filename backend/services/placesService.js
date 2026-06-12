/**
 * Places Service - Fetch attractions and POI from OpenTripMap
 * Handles all location-based queries and place data
 */

const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');

class PlacesService {
  constructor() {
    this.apiKey = (API_CONFIG.OPENTRIPMAP.API_KEY || '').trim();
    this.baseUrl = API_CONFIG.OPENTRIPMAP.BASE_URL;
    this.detailsUrl = API_CONFIG.OPENTRIPMAP.DETAILS_URL;
    this.aroundUrl = API_CONFIG.OPENTRIPMAP.AROUND_URL;
  }

  hasApiKey() {
    return Boolean(this.apiKey && !this.apiKey.startsWith('your-'));
  }

  normalizeDestination(destination) {
    if (!destination) return '';
    return String(destination).split(',')[0].trim().toLowerCase();
  }

  getKnownCoordinates(destination) {
    const knownCoordinates = {
      'paris': { lat: 48.8566, lon: 2.3522 },
      'london': { lat: 51.5074, lon: -0.1278 },
      'amsterdam': { lat: 52.3676, lon: 4.9041 },
      'new york': { lat: 40.7128, lon: -74.006 },
      'tokyo': { lat: 35.6762, lon: 139.6503 },
      'dubai': { lat: 25.2048, lon: 55.2708 },
      'delhi': { lat: 28.7041, lon: 77.1025 },
      'bangkok': { lat: 13.7563, lon: 100.5018 },
      'singapore': { lat: 1.3521, lon: 103.8198 },
      'mumbai': { lat: 19.076, lon: 72.8777 },
      'agra': { lat: 27.1767, lon: 78.0081 },
      'jaipur': { lat: 26.9124, lon: 75.7873 },
      'goa': { lat: 15.2993, lon: 74.124 },
      'kolhapur': { lat: 16.705, lon: 74.2433 },
      'luxembourg': { lat: 49.6116, lon: 6.1319 },
    };

    return knownCoordinates[destination] || null;
  }

  async geocodeWithNominatim(query) {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: query,
          format: 'json',
          limit: 1,
        },
        headers: {
          'User-Agent': 'travel2-platform/1.0 (support@example.com)',
        },
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
      });

      const result = response.data?.[0];
      if (result?.lat && result?.lon) {
        return { lat: Number(result.lat), lon: Number(result.lon) };
      }
    } catch (error) {
      console.warn('Nominatim geocode failed:', error.message);
    }

    return null;
  }

  async getCoordinatesForDestination(destination) {
    const raw = destination ? String(destination).trim() : '';
    if (!raw) return null;
    const primaryQuery = raw;
    const fallbackQuery = String(raw).split(',')[0].trim();
    const normalized = fallbackQuery.toLowerCase();
    const fallback = this.getKnownCoordinates(normalized);

    if (fallback) {
      return fallback;
    }

    if (this.hasApiKey()) {
      try {
        const geoUrl = `${this.baseUrl}/geoname`;
        const { data } = await axios.get(geoUrl, {
          params: {
            name: primaryQuery,
            apikey: this.apiKey,
          },
          timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
        });

        if (data && data.lat != null && data.lon != null) {
          return { lat: Number(data.lat), lon: Number(data.lon) };
        }
      } catch (error) {
        console.warn('Geoname lookup failed:', error.message);
      }
    }

    let nominatim = await this.geocodeWithNominatim(primaryQuery);
    if (!nominatim && fallbackQuery && fallbackQuery !== primaryQuery) {
      nominatim = await this.geocodeWithNominatim(fallbackQuery);
    }
    if (nominatim) return nominatim;

    return fallback;
  }

  shufflePlaces(places) {
    const array = [...places];
    for (let i = array.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  dedupePlaces(places) {
    const seen = new Set();
    return places.filter((place) => {
      const id = place?.id || '';
      const lat = place?.location?.coordinates?.latitude ?? '';
      const lon = place?.location?.coordinates?.longitude ?? '';
      const name = (place?.name || '').toLowerCase();
      const key = id || `${name}:${lat}:${lon}`;
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  extractFeatures(payload) {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.features)) return payload.features;
    return [];
  }

  /**
   * Search for places by name and location
   * @param {string} query - Search query (place name)
   * @param {number} latitude - Latitude of center point
   * @param {number} longitude - Longitude of center point
   * @param {number} radius - Search radius in meters (default: 5000m = 5km)
   * @param {number} limit - Max results to return
   * @returns {Promise<Array>} Array of place objects
   */
  async searchPlacesByName(query, latitude, longitude, radius = 5000, limit = 20) {
    try {
      if (!this.hasApiKey()) {
        return [];
      }

      // Find OSM object ID by coordinates and search within radius
      const response = await axios.get(`${this.aroundUrl}`, {
        params: {
          apikey: this.apiKey,
          lon: longitude,
          lat: latitude,
          radius: radius,
          limit: Math.min(limit, 50), // Max 50 from API
          format: 'geojson',
        },
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
      });

      const features = this.extractFeatures(response.data);

      // Filter results by name similarity if query provided
      if (query) {
        return this.filterAndFormatResults(features, query);
      }

      return this.formatPlaces(features);
    } catch (error) {
      console.error('Places search error:', error.message);
      return [];
    }
  }

  /**
   * Get details about a specific place
   * @param {string} xid - OpenTripMap place ID
   * @returns {Promise<Object>} Detailed place information
   */
  async getPlaceDetails(xid) {
    try {
      if (!xid || !this.hasApiKey()) return null;

      const response = await axios.get(
        `${this.detailsUrl}/${encodeURIComponent(xid)}`,
        {
        params: {
          apikey: this.apiKey,
        },
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
      }
      );

      return this.formatPlaceDetails(response.data);
    } catch (error) {
      if (error?.response?.status === 429) {
        return null;
      }
      console.error('Place details error:', error.message);
      return null;
    }
  }

  /**
   * Get attractions around a center point by category
   * @param {number} latitude - Center latitude
   * @param {number} longitude - Center longitude
   * @param {string} category - Category filter (e.g., "museums", "restaurants")
   * @param {number} radius - Search radius in meters
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Filtered attractions
   */
  async getAttractionsByCategory(latitude, longitude, category = '', radius = 5000, limit = 20) {
    try {
      if (!this.hasApiKey()) {
        return [];
      }

      const params = {
        apikey: this.apiKey,
        lon: longitude,
        lat: latitude,
        radius: radius,
        limit: Math.min(limit, 50),
        format: 'geojson',
      };

      // Add category filter if provided
      if (category) {
        params.kinds = category;
      }

      const response = await axios.get(`${this.aroundUrl}`, {
        params,
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
      });

      const features = this.extractFeatures(response.data);
      return this.formatPlaces(features);
    } catch (error) {
      if (error?.response?.status === 400) {
        if (
          typeof category === 'string' &&
          category.includes(',')
        ) {
          const tokens = category
            .split(',')
            .map((item) => item.trim())
            .filter(Boolean)
            .slice(0, 8);

          if (tokens.length > 1) {
            const perTokenLimit = Math.max(4, Math.ceil(limit / tokens.length));
            const tokenResults = await Promise.all(
              tokens.map((token) =>
                this.getAttractionsByCategory(
                  latitude,
                  longitude,
                  token,
                  radius,
                  perTokenLimit
                )
              )
            );

            const merged = tokenResults.flat();
            return this.dedupePlaces(merged).slice(0, limit);
          }
        }
        return [];
      }

      if (error?.response?.status === 429) {
        return [];
      }

      console.error('Category attractions error:', error.message);
      return [];
    }
  }

  async getAttractionsByKinds(latitude, longitude, kinds = '', radius = 5000, limit = 20) {
    return this.getAttractionsByCategory(latitude, longitude, kinds, radius, limit);
  }

  /**
   * Get popular attractions for a destination
   * @param {string} destination - City or region name
   * @param {number} limit - Max results
   * @returns {Promise<Array>} Top popular attractions
   */
  async getPopularAttractions(destination, limit = 30) {
    try {
      const coords = await this.getCoordinatesForDestination(destination);
      if (!coords) return [];

      const raw = await this.getAttractionsByCategory(
        coords.lat,
        coords.lon,
        'interesting_places',
        10000,
        Math.min(limit * 2, 50)
      );

      const broadFallback = raw.length >= Math.max(8, Math.floor(limit / 2))
        ? []
        : await this.getAttractionsByCategory(
            coords.lat,
            coords.lon,
            '',
            12000,
            Math.min(limit * 2, 50)
          );

      const unique = this.dedupePlaces([...raw, ...broadFallback]);
      return this.shufflePlaces(unique).slice(0, limit);
    } catch (error) {
      console.error('Popular attractions error:', error.message);
      return [];
    }
  }

  /**
   * Filter and sort results by name similarity
   * @private
   */
  filterAndFormatResults(features, query) {
    const queryLower = query.toLowerCase();
    const formatted = this.formatPlaces(features);

    return formatted
      .filter((place) => (place?.name || '').toLowerCase().includes(queryLower))
      .sort((a, b) => {
        // Prioritize exact matches or name starts with query
        const aName = (a.name || '').toLowerCase();
        const bName = (b.name || '').toLowerCase();
        if (aName.startsWith(queryLower)) return -1;
        if (bName.startsWith(queryLower)) return 1;
        return aName.localeCompare(bName);
      })
      .slice(0, 20);
  }

  /**
   * Format place object for API response
   * @private
   */
  formatPlace(feature) {
    if (!feature || typeof feature !== 'object') return null;

    const isGeoJson = Boolean(feature.geometry && feature.properties);
    const props = isGeoJson ? feature.properties || {} : feature;
    const name = String(props.name || feature.name || '').trim();
    const lat =
      Number(
        isGeoJson
          ? feature.geometry?.coordinates?.[1]
          : feature.point?.lat ?? feature.location?.lat ?? feature.lat
      ) || 0;
    const lon =
      Number(
        isGeoJson
          ? feature.geometry?.coordinates?.[0]
          : feature.point?.lon ?? feature.location?.lon ?? feature.lon
      ) || 0;
    const kinds = props.kinds || feature.kinds || '';
    const xid = props.xid || feature.xid || feature.id || null;

    const rawRating = Number(props.rate ?? feature.rate ?? 0);
    const rating = Number.isFinite(rawRating)
      ? Math.min(5, Math.max(0, rawRating))
      : 0;

    return {
      id: xid,
      name,
      category: this.mapCategory(kinds),
      location: {
        coordinates: {
          latitude: lat,
          longitude: lon,
        },
        address:
          props.address ||
          (props.dist ? `Approx. ${Math.round(Number(props.dist) || 0)}m from center` : ''),
      },
      rating,
      imageUrl: this.getImageUrl(props),
      description:
        props.wikipedia_extracts?.text ||
        props.info?.descr ||
        feature.wikipedia_extracts?.text ||
        '',
      kinds,
      openingHours: props.opening_hours || props.open_hours || feature.open_hours || null,
    };
  }

  /**
   * Format multiple places
   * @private
   */
  formatPlaces(features) {
    const list = this.extractFeatures(features);
    return list
      .map((f) => this.formatPlace(f))
      .filter((p) => p?.id && p?.name && p.name.toLowerCase() !== 'unknown');
  }

  /**
   * Format detailed place information
   * @private
   */
  formatPlaceDetails(data) {
    if (!data || !data.geometry) return null;

    const coords = data.geometry?.coordinates || [0, 0];

    const rawRating = Number(data.rate ?? 0);
    const rating = Number.isFinite(rawRating)
      ? Math.min(5, Math.max(0, rawRating))
      : 0;

    return {
      id: data.xid,
      name: data.name,
      description: data.wikipedia_extracts?.text || data.description || '',
      category: this.mapCategory(data.kinds),
      location: {
        coordinates: {
          latitude: coords[1],
          longitude: coords[0],
        },
        address: data.address?.house_number
          ? `${data.address.house_number} ${data.address.road}`
          : '',
      },
      rating,
      imageUrl: this.getImageUrl(data),
      openingHours: data.open_hours || null,
      phoneNumber: data.phone || null,
      website: data.url || null,
      wikipediaUrl: data.wikipedia || null,
      tags: data.kinds || [],
      kinds: data.kinds || '',
    };
  }

  /**
   * Map OpenTripMap kinds to activity categories
   * @private
   */
  mapCategory(kinds) {
    if (!kinds) return 'sightseeing';

    const kindsList = Array.isArray(kinds)
      ? kinds
      : String(kinds)
          .split(',')
          .map((item) => item.trim().toLowerCase())
          .filter(Boolean);

    const categoryMap = {
      // Sightseeing & Culture
      'historic': 'culture',
      'archaeology': 'culture',
      'museums': 'culture',
      'monuments': 'sightseeing',
      'palaces': 'sightseeing',
      'temples': 'culture',
      'churches': 'culture',
      'mosques': 'culture',
      'synagogues': 'culture',
      'cathedrals': 'culture',
      'castles': 'sightseeing',

      // Food & Dining
      'restaurants': 'food',
      'cafes': 'food',
      'food': 'food',
      'fast_food': 'food',

      // Shopping
      'shops': 'shopping',
      'markets': 'shopping',
      'malls': 'shopping',

      // Nature & Adventure
      'natural': 'nature',
      'parks': 'nature',
      'gardens': 'nature',
      'beaches': 'nature',
      'lakes': 'nature',
      'viewpoints': 'nature',
      'mountains': 'adventure',
      'hiking': 'adventure',
      'trekking': 'adventure',
      'climbing': 'adventure',
      'skiing': 'adventure',

      // Entertainment
      'entertainment': 'entertainment',
      'nightclubs': 'entertainment',
      'bars': 'entertainment',
      'pubs': 'entertainment',
      'karaoke': 'entertainment',
      'cinemas': 'entertainment',
      'theatres': 'entertainment',
      'amusement_parks': 'entertainment',
      'zoo': 'entertainment',
      'aquariums': 'entertainment',

      // Relaxation
      'spas': 'relaxation',
      'swimming_pools': 'relaxation',
    };

    for (const kind of kindsList) {
      if (categoryMap[kind]) return categoryMap[kind];

      const fuzzy = Object.keys(categoryMap).find((key) => kind.includes(key));
      if (fuzzy) return categoryMap[fuzzy];
    }

    return 'sightseeing';
  }

  /**
   * Extract image URL from place data
   * @private
   */
  getImageUrl(props) {
    return props.image || props.preview?.source || props.wikidata_image || null;
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   * @private
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }
}

module.exports = PlacesService;
