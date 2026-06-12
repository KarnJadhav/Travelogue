/**
 * MAP CONFIGURATION FILE - CENTRALIZED API & SETTINGS
 * All map-related configurations, API keys, and settings are managed here
 * Supports multiple environments (development, production, staging)
 */

// ============================================================================
// API KEYS & ENDPOINTS CONFIGURATION
// ============================================================================

const ENV = import.meta.env.MODE || 'development';
const MAP_PROVIDER = (import.meta.env.VITE_MAP_PROVIDER || 'osm').toLowerCase();
const OLA_MAPS_API_KEY = import.meta.env.VITE_OLA_MAPS_API_KEY || '';
const OLA_MAPS_TILE_URL = import.meta.env.VITE_OLA_MAPS_TILE_URL || '';
const LEAFLET_TILE_VARIABLES = new Set(['s', 'x', 'y', 'z', 'r']);

const appendApiKeyToTileUrl = (url, apiKey) => {
  if (!url) return '';
  let normalizedUrl = url.replace('https://{s}.tile.olamaps.io', 'https://tile.olamaps.io');
  const safeApiKey = encodeURIComponent(apiKey || '');

  // Replace explicit template placeholder first.
  normalizedUrl = normalizedUrl.replace(/\{apiKey\}/gi, safeApiKey);

  // If api_key already exists and uses any {...} token, force it to the provided API key.
  if (/(^|[?&])(api_key|apikey)=/i.test(normalizedUrl)) {
    normalizedUrl = normalizedUrl.replace(
      /([?&](?:api_key|apikey)=)\{[^}]+\}/gi,
      `$1${safeApiKey}`
    );
    return normalizedUrl;
  }

  // Guard against accidental unknown variable tokens in query params.
  normalizedUrl = normalizedUrl.replace(/\{([^}]+)\}/g, (match, varName) => {
    return LEAFLET_TILE_VARIABLES.has(varName) ? match : safeApiKey;
  });

  return `${normalizedUrl}${normalizedUrl.includes('?') ? '&' : '?'}api_key=${safeApiKey}`;
};

const olaTileUrl = appendApiKeyToTileUrl(OLA_MAPS_TILE_URL, OLA_MAPS_API_KEY);
const hasInlineOlaApiKey = /(^|[?&])(api_key|apikey)=([^&{}][^&]*)/i.test(OLA_MAPS_TILE_URL);
const hasOlaTileConfig = Boolean(olaTileUrl && (OLA_MAPS_API_KEY || hasInlineOlaApiKey));

// Map API Configuration
export const MAP_CONFIG = {
  // OpenStreetMap Tile Servers (No API key required)
  TILE_SERVERS: {
    OSM: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 2,
    },
    CartoDB_Light: {
      url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
      attribution: '© CartoDB',
      maxZoom: 19,
      minZoom: 2,
    },
    CartoDB_Dark: {
      url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      attribution: '© CartoDB',
      maxZoom: 19,
      minZoom: 2,
    },
    Satellite: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: 'Tiles © Esri',
      maxZoom: 18,
      minZoom: 2,
    },
    TopoMap: {
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      attribution: '© OpenTopoMap',
      maxZoom: 17,
      minZoom: 2,
    },
    OLA_Light: {
      url:
        hasOlaTileConfig && olaTileUrl
          ? olaTileUrl
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: hasOlaTileConfig ? '© Ola Maps' : '© OpenStreetMap contributors',
      maxZoom: 20,
      minZoom: 2,
    },
  },

  // Default tile server
  DEFAULT_TILE: MAP_PROVIDER === 'ola' && hasOlaTileConfig ? 'OLA_Light' : 'CartoDB_Light',

  // Map center (default to world center)
  DEFAULT_CENTER: [20.5937, 78.9629], // India center
  DEFAULT_ZOOM: 4,

  // Map bounds and constraints
  BOUNDS: {
    WORLD: [[-90, -180], [90, 180]],
    INDIA: [[8, 68], [35, 97]],
  },

  // Cluster settings for marker grouping
  CLUSTER_OPTIONS: {
    maxClusterRadius: 80,
    disableClusteringAtZoom: 15,
    chunkedLoading: true,
    chunkSize: 100,
    iconCreateFunction: null, // Will be set dynamically
  },

  // Pointer icon settings
  ICON_SIZE: [32, 41],
  ICON_ANCHOR: [16, 41],
  POPUP_ANCHOR: [0, -41],

  // Animation settings
  ANIMATION_DURATION: 800,
  ANIMATION_EASING: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Search/Zoom on destination
  DESTINATION_ZOOM: 13,
  ROUTE_PADDING: 50,
};

// ============================================================================
// NOMINATIM CONFIGURATION (Geocoding & Search)
// ============================================================================

export const GEOCODING_CONFIG = {
  NOMINATIM_API: 'https://nominatim.openstreetmap.org',
  SEARCH_ENDPOINT: '/search',
  REVERSE_ENDPOINT: '/reverse',

  // Request options
  REQUEST_OPTIONS: {
    timeout: 10000,
    format: 'json',
    limit: 10,
    countrycodes: '', // Leave empty for world, or use country codes like 'in' for India
  },

  // Debounce search to avoid excessive API calls
  SEARCH_DEBOUNCE: 500,

  // Cache settings
  CACHE_DURATION: 1000 * 60 * 60, // 1 hour
  USE_CACHE: true,
};

export const OLA_CONFIG = {
  API_KEY: OLA_MAPS_API_KEY,
  TILE_URL_TEMPLATE: OLA_MAPS_TILE_URL,
  TILE_URL: olaTileUrl,
  IS_CONFIGURED: hasOlaTileConfig,
  PROVIDER: MAP_PROVIDER,
};

// ============================================================================
// OPENROUTESERVICE CONFIGURATION (Routing & Directions)
// ============================================================================

export const ROUTING_CONFIG = {
  // ⚠️ IMPORTANT: Get your free API key from https://openrouteservice.org/
  // Free tier: 50 requests/day, up to 10 endpoints per request
  API_KEY: import.meta.env.VITE_OPENROUTESERVICE_KEY || import.meta.env.REACT_APP_OPENROUTESERVICE_KEY || 'YOUR_OPENROUTESERVICE_API_KEY_HERE',

  // API endpoints
  API_BASE: 'https://api.openrouteservice.org/v2',
  DIRECTIONS_ENDPOINT: '/directions',
  ISOCHRONE_ENDPOINT: '/isochrones',
  MATRIX_ENDPOINT: '/matrix',

  // Route profiles
  PROFILES: {
    DRIVING: 'driving-car',
    CYCLING: 'cycling-regular',
    WALKING: 'foot-walking',
    HIKING: 'foot-hiking',
  },

  // Default profile
  DEFAULT_PROFILE: 'driving-car',

  // Request options
  REQUEST_OPTIONS: {
    timeout: 30000,
    radiusFormat: 'm', // meters
    format: 'geojson',
  },

  // Route display options
  ROUTE_STYLE: {
    color: '#1f77b4',
    weight: 4,
    opacity: 0.8,
    dashArray: null,
    lineCap: 'round',
    lineJoin: 'round',
  },

  // Alternative routes
  ALTERNATIVE_ROUTES: {
    enabled: true,
    count: 2,
    shareFactor: 0.6,
  },

  // Cache settings
  CACHE_DURATION: 1000 * 60 * 30, // 30 minutes
  USE_CACHE: true,
};

// ============================================================================
// MARKER CONFIGURATION
// ============================================================================

export const MARKER_CONFIG = {
  // Marker types with custom styling
  TYPES: {
    DESTINATION: {
      color: '#FF6B6B',
      icon: '📍',
      popup_template: 'destination',
      zIndex: 400,
    },
    HOTEL: {
      color: '#4ECDC4',
      icon: '🏨',
      popup_template: 'hotel',
      zIndex: 300,
    },
    GUIDE: {
      color: '#45B7D1',
      icon: '👤',
      popup_template: 'guide',
      zIndex: 300,
    },
    RESTAURANT: {
      color: '#FFA07A',
      icon: '🍽️',
      popup_template: 'restaurant',
      zIndex: 300,
    },
    ATTRACTION: {
      color: '#98D8C8',
      icon: '⭐',
      popup_template: 'attraction',
      zIndex: 300,
    },
    USER_LOCATION: {
      color: '#007AFF',
      icon: '📍',
      popup_template: 'user',
      zIndex: 500,
    },
    START_POINT: {
      color: '#00B894',
      icon: '▶',
      popup_template: 'start',
      zIndex: 450,
    },
    END_POINT: {
      color: '#D63031',
      icon: '⏹',
      popup_template: 'end',
      zIndex: 450,
    },
  },

  // Default marker
  DEFAULT_TYPE: 'DESTINATION',

  // Marker size
  SIZE: '2rem',
};

// ============================================================================
// ADVANCED FEATURES CONFIGURATION
// ============================================================================

export const FEATURES_CONFIG = {
  // Enable/disable features
  ENABLE_SEARCH: true,
  ENABLE_ROUTING: true,
  ENABLE_CLUSTERING: true,
  ENABLE_GEOLOCATION: true,
  ENABLE_MEASURING: true,
  ENABLE_DRAWING: true,
  ENABLE_HEATMAP: false,
  ENABLE_LAYER_CONTROL: true,
  ENABLE_FULLSCREEN: true,
  ENABLE_SCALE: true,
  ENABLE_EXPORT: true,

  // Geolocation options
  GEOLOCATION_OPTIONS: {
    enableHighAccuracy: false,
    maximumAge: 300000, // 5 minutes
    timeout: 10000,
  },

  // Export options
  EXPORT_FORMATS: ['png', 'jpeg', 'svg', 'geojson'],
  EXPORT_DPI: 300,
};

// ============================================================================
// PERFORMANCE & OPTIMIZATION
// ============================================================================

export const PERFORMANCE_CONFIG = {
  // Tile loading
  TILE_SIZE: 256,
  TILE_UPDATE_WHEN_IDLE: true,
  KEEP_BUFFER: 2,

  // Marker optimization
  MAX_MARKERS_TO_LOAD: 1000,
  LOAD_MARKERS_BY_VIEWPORT: true,
  MARKER_BATCH_SIZE: 100,

  // AJAX settings
  AJAX_TIMEOUT: 15000,
  AJAX_RETRY_ATTEMPTS: 3,
  AJAX_RETRY_DELAY: 1000,

  // Canvas rendering
  USE_CANVAS_RENDERER: true,
  CANVAS_UPDATE_INTERVAL: 100,
};

// ============================================================================
// STYLING & COLORS
// ============================================================================

export const STYLE_CONFIG = {
  // Color schemes
  PRIMARY_COLOR: '#1f77b4',
  SECONDARY_COLOR: '#ff7f0e',
  SUCCESS_COLOR: '#00B894',
  ERROR_COLOR: '#D63031',
  WARNING_COLOR: '#FDCB6E',
  INFO_COLOR: '#74B9FF',

  // Route colors for different profiles
  ROUTE_COLORS: {
    'driving-car': '#1f77b4',
    'cycling-regular': '#2ecc71',
    'foot-walking': '#f39c12',
    'foot-hiking': '#9b59b6',
  },

  // Popup styling
  POPUP_WIDTH: 300,
  POPUP_MAX_HEIGHT: 500,
  POPUP_OFFSET: [0, -41],

  // Tooltip styling
  TOOLTIP_OFFSET: [0, 0],
  TOOLTIP_PANE: 'overlayPane',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get OpenRouteService API key
 * @returns {string} API key
 */
export const getRoutingAPIKey = () => {
  const key = ROUTING_CONFIG.API_KEY;
  if (key === 'YOUR_OPENROUTESERVICE_API_KEY_HERE') {
    console.warn(
      '⚠️ WARNING: OpenRouteService API key not configured. Get one at https://openrouteservice.org/'
    );
  }
  return key;
};

/**
 * Get tile server configuration
 * @param {string} serverName - Name of the tile server
 * @returns {object} Tile server configuration
 */
export const getTileServer = (serverName = MAP_CONFIG.DEFAULT_TILE) => {
  return MAP_CONFIG.TILE_SERVERS[serverName] || MAP_CONFIG.TILE_SERVERS[MAP_CONFIG.DEFAULT_TILE];
};

/**
 * Get marker type configuration
 * @param {string} type - Marker type
 * @returns {object} Marker configuration
 */
export const getMarkerConfig = (type = MARKER_CONFIG.DEFAULT_TYPE) => {
  return MARKER_CONFIG.TYPES[type] || MARKER_CONFIG.TYPES[MARKER_CONFIG.DEFAULT_TYPE];
};

/**
 * Get route color based on profile
 * @param {string} profile - Routing profile
 * @returns {string} Color for the route
 */
export const getRouteColor = (profile = ROUTING_CONFIG.DEFAULT_PROFILE) => {
  return (
    STYLE_CONFIG.ROUTE_COLORS[profile] ||
    STYLE_CONFIG.ROUTE_COLORS[ROUTING_CONFIG.DEFAULT_PROFILE]
  );
};

/**
 * Validate if routing is configured
 * @returns {boolean}
 */
export const isRoutingConfigured = () => {
  return (
    ROUTING_CONFIG.API_KEY && ROUTING_CONFIG.API_KEY !== 'YOUR_OPENROUTESERVICE_API_KEY_HERE'
  );
};

/**
 * Log configuration status
 */
export const logConfigStatus = () => {
  console.log('🗺️ Map Configuration Status:');
  console.log('✓ Nominatim (Geocoding):', 'Ready');
  console.log(
    '✓ OpenRouteService (Routing):',
    isRoutingConfigured() ? 'Ready' : '⚠️ Not Configured'
  );
  console.log('✓ Leaflet:', 'Ready');
  console.log('✓ OpenStreetMap Tiles:', 'Ready');
  console.log(
    '✓ Ola Maps Tiles:',
    OLA_CONFIG.IS_CONFIGURED ? 'Ready' : '⚠️ Not configured (using OSM fallback)'
  );
};

export default {
  MAP_CONFIG,
  OLA_CONFIG,
  GEOCODING_CONFIG,
  ROUTING_CONFIG,
  MARKER_CONFIG,
  FEATURES_CONFIG,
  PERFORMANCE_CONFIG,
  STYLE_CONFIG,
  getRoutingAPIKey,
  getTileServer,
  getMarkerConfig,
  getRouteColor,
  isRoutingConfigured,
  logConfigStatus,
};
