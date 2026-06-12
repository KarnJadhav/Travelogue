/**
 * Centralized API Configuration File
 * All external API keys and endpoints are managed here
 * This allows for easy updates and environment-specific configurations
 */

module.exports = {
  // OpenTripMap API - Free destination & attraction data
  OPENTRIPMAP: {
    API_KEY: process.env.OPENTRIPMAP_API_KEY || '',
    BASE_URL: 'https://api.opentripmap.com/0.1/en/places',
    DETAILS_URL: 'https://api.opentripmap.com/0.1/en/places/xid',
    // Radius endpoint returns stable place data for destination exploration
    AROUND_URL: 'https://api.opentripmap.com/0.1/en/places/radius',
  },

  // OpenWeatherMap API - Free weather data
  WEATHER: {
    API_KEY: process.env.OPENWEATHER_API_KEY || '',
    BASE_URL: 'https://api.openweathermap.org/data/2.5',
    FORECAST_URL: 'https://api.openweathermap.org/data/2.5/forecast',
    CURRENT_URL: 'https://api.openweathermap.org/data/2.5/weather',
  },

  // OpenRouter API - Free AI models (Mistral, Llama, etc.)
  // Sign up at https://openrouter.ai/ to get free credits
  OPENROUTER: {
    API_KEY: process.env.OPENROUTER_API_KEY || '',
    BASE_URL: 'https://openrouter.ai/api/v1',
    MODEL: process.env.OPENROUTER_MODEL || 'openrouter/free', // Free models router
  },

  // Groq API - Fast inference for chat models
  GROQ: {
    API_KEY: process.env.GROQ_API_KEY || '',
    BASE_URL: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
    MODEL: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
  },

  // Google Gemini API - Multimodal AI (text + images)
  // Get your API key from Google AI Studio
  GEMINI: {
    API_KEY: process.env.GEMINI_API_KEY || '',
    BASE_URL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
    MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    VISION_MODEL: process.env.GEMINI_VISION_MODEL || '',
    MAX_IMAGE_MB: Number(process.env.GEMINI_MAX_IMAGE_MB || 4),
  },

  // OpenAI API - GPT-OSS models (Responses API)
  OPENAI: {
    API_KEY: process.env.OPENAI_API_KEY || '',
    BASE_URL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
    MODEL: process.env.OPENAI_MODEL || 'gpt-oss-120b',
    MAX_OUTPUT_TOKENS: Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 7000),
  },

  // Preferred AI provider (openai | gemini | openrouter)
  AI: {
    PROVIDER: process.env.AI_PROVIDER || '',
    PROVIDER_SEQUENCE: process.env.AI_PROVIDER_SEQUENCE || 'gemini,openrouter',
  },

  // Itinerary Planner dedicated AI routing and keys
  // Falls back to global AI keys/models when itinerary-specific vars are not set.
  ITINERARY_AI: {
    PROVIDER: process.env.ITINERARY_AI_PROVIDER || process.env.AI_PROVIDER || '',
    PROVIDER_SEQUENCE:
      process.env.ITINERARY_AI_PROVIDER_SEQUENCE ||
      process.env.AI_PROVIDER_SEQUENCE ||
      'gemini,openrouter',
    GEMINI: {
      API_KEY: process.env.ITINERARY_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '',
      BASE_URL:
        process.env.ITINERARY_GEMINI_BASE_URL ||
        process.env.GEMINI_BASE_URL ||
        'https://generativelanguage.googleapis.com/v1beta',
      MODEL:
        process.env.ITINERARY_GEMINI_MODEL ||
        process.env.GEMINI_MODEL ||
        'gemini-2.5-flash',
      VISION_MODEL:
        process.env.ITINERARY_GEMINI_VISION_MODEL ||
        process.env.GEMINI_VISION_MODEL ||
        '',
      MAX_IMAGE_MB: Number(
        process.env.ITINERARY_GEMINI_MAX_IMAGE_MB ||
          process.env.GEMINI_MAX_IMAGE_MB ||
          4
      ),
    },
    OPENROUTER: {
      API_KEY:
        process.env.ITINERARY_OPENROUTER_API_KEY ||
        process.env.OPENROUTER_API_KEY ||
        '',
      BASE_URL:
        process.env.ITINERARY_OPENROUTER_BASE_URL ||
        process.env.OPENROUTER_BASE_URL ||
        'https://openrouter.ai/api/v1',
      MODEL:
        process.env.ITINERARY_OPENROUTER_MODEL ||
        process.env.OPENROUTER_MODEL ||
        'openrouter/free',
    },
    OPENAI: {
      API_KEY: process.env.ITINERARY_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '',
      BASE_URL: process.env.ITINERARY_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      MODEL: process.env.ITINERARY_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      MAX_OUTPUT_TOKENS: Number(
        process.env.ITINERARY_OPENAI_MAX_OUTPUT_TOKENS ||
          process.env.OPENAI_MAX_OUTPUT_TOKENS ||
          7000
      ),
    },
    GROQ: {
      API_KEY: process.env.ITINERARY_GROQ_API_KEY || process.env.GROQ_API_KEY || '',
      BASE_URL:
        process.env.ITINERARY_GROQ_BASE_URL ||
        process.env.GROQ_BASE_URL ||
        'https://api.groq.com/openai/v1',
      MODEL:
        process.env.ITINERARY_GROQ_MODEL ||
        process.env.GROQ_MODEL ||
        'llama-3.1-8b-instant',
    },
  },

  // Virtual Guide AI routing
  GUIDE_AI: {
    PROVIDER: process.env.GUIDE_AI_PROVIDER || '',
    PROVIDER_SEQUENCE: process.env.GUIDE_AI_PROVIDER_SEQUENCE || 'openai,openrouter,groq',
    OPENAI_MODEL: process.env.GUIDE_AI_OPENAI_MODEL || process.env.OPENAI_MODEL || 'gpt-oss-20b',
    OPENROUTER_MODEL:
      process.env.GUIDE_AI_OPENROUTER_MODEL || process.env.OPENROUTER_MODEL || 'openrouter/free',
    GROQ_MODEL:
      process.env.GUIDE_AI_GROQ_MODEL || process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    STREAM_TIMEOUT_MS: Number(process.env.GUIDE_AI_STREAM_TIMEOUT_MS || 45000),
  },

  // Google Maps (optional for premium features)
  GOOGLE_MAPS: {
    API_KEY: process.env.GOOGLE_MAPS_API_KEY || 'your-google-maps-key',
    BASE_URL: 'https://maps.googleapis.com/maps/api',
  },

  // OpenRouteService - Free routing & optimization
  OPENROUTE_SERVICE: {
    API_KEY: process.env.OPENROUTE_API_KEY || 'your-openroute-api-key',
    BASE_URL: 'https://api.openrouteservice.org/v2',
    MATRIX_URL: 'https://api.openrouteservice.org/v2/matrix',
    DIRECTIONS_URL: 'https://api.openrouteservice.org/v2/directions',
  },

  // Geodb Cities API - City data (via RapidAPI free tier)
  GEODB: {
    API_KEY: process.env.GEODB_API_KEY || 'your-geodb-api-key',
    BASE_URL: 'https://wft-geo-db.p.rapidapi.com/v1/geo',
  },

  // Geoapify API - Geocoding + map-friendly place context
  GEOAPIFY: {
    API_KEY: process.env.GEOAPIFY_API_KEY || '',
    BASE_URL: 'https://api.geoapify.com/v1',
  },

  // Foursquare Places API - POI, hotels, cafes, restaurants
  FOURSQUARE: {
    API_KEY: process.env.FOURSQUARE_API_KEY || process.env.FSQ_API_KEY || '',
    BASE_URL: 'https://api.foursquare.com/v3',
  },

  // Unsplash API - Free images
  UNSPLASH: {
    API_KEY:
      process.env.UNSPLASH_API_KEY ||
      process.env.UNSPLASH_ACCESS_KEY ||
      process.env.VITE_UNSPLASH_ACCESS_KEY ||
      '',
    BASE_URL: 'https://api.unsplash.com',
  },

  // YouTube Data API - destination videos/shorts for itinerary insights
  YOUTUBE: {
    API_KEY: process.env.YOUTUBE_API_KEY || '',
    BASE_URL: 'https://www.googleapis.com/youtube/v3',
    DEFAULT_RESULTS: Number(process.env.YOUTUBE_DEFAULT_RESULTS || 6),
    CACHE_TTL_MS: Number(process.env.YOUTUBE_CACHE_TTL_MS || 20 * 60 * 1000),
  },

  // Wikipedia API - Free info & images
  WIKIPEDIA: {
    BASE_URL: 'https://en.wikipedia.org/w/api.php',
  },

  // Amadeus API - Real hotel and flight data
  AMADEUS: {
    CLIENT_ID: process.env.AMADEUS_CLIENT_ID || 'your-amadeus-client-id',
    CLIENT_SECRET: process.env.AMADEUS_CLIENT_SECRET || 'your-amadeus-client-secret',
    BASE_URL: 'https://api.amadeus.com/v2',
    AUTH_URL: 'https://api.amadeus.com/v1/security/oauth2/token',
  },

  // Exchange Rates API - Free currency conversion
  EXCHANGE_RATES: {
    API_KEY: process.env.EXCHANGE_RATES_KEY || '',
    BASE_URL: 'https://api.exchangerate-api.com/v4/latest',
  },

  // Default timeouts and limits
  DEFAULTS: {
    REQUEST_TIMEOUT: 10000, // 10 seconds
    MAX_RESULTS: 50,
    MAX_ACTIVITIES_PER_DAY: 8,
    DEFAULT_ACTIVITY_DURATION: 120, // 2 hours in minutes
    DEFAULT_TRAVEL_TIME: 30, // 30 minutes between activities
  },
};
