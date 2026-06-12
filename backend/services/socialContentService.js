const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');

const CACHE_LIMIT = 180;
const MIN_RESULTS = 2;
const MAX_RESULTS = 12;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function pickThumbnail(thumbnails = {}) {
  return (
    thumbnails?.high?.url ||
    thumbnails?.medium?.url ||
    thumbnails?.default?.url ||
    ''
  );
}

function parseIso8601DurationToSeconds(value = '') {
  const match = String(value || '').match(
    /^P(?:(\d+)D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i
  );

  if (!match) return 0;
  const days = Number(match[1] || 0);
  const hours = Number(match[2] || 0);
  const minutes = Number(match[3] || 0);
  const seconds = Number(match[4] || 0);
  return (days * 24 * 60 * 60) + (hours * 60 * 60) + (minutes * 60) + seconds;
}

function formatDuration(seconds = 0) {
  const safeSeconds = Math.max(0, Math.round(Number(seconds || 0)));
  const hh = Math.floor(safeSeconds / 3600);
  const mm = Math.floor((safeSeconds % 3600) / 60);
  const ss = safeSeconds % 60;

  if (hh > 0) {
    return `${hh}h ${String(mm).padStart(2, '0')}m`;
  }
  return `${mm}m ${String(ss).padStart(2, '0')}s`;
}

class SocialContentService {
  constructor() {
    this.apiKey = String(API_CONFIG.YOUTUBE?.API_KEY || '').trim();
    this.baseUrl = String(API_CONFIG.YOUTUBE?.BASE_URL || 'https://www.googleapis.com/youtube/v3').trim();
    this.cacheTtlMs = Math.max(
      60 * 1000,
      Number(API_CONFIG.YOUTUBE?.CACHE_TTL_MS || 20 * 60 * 1000)
    );
    this.defaultResults = clamp(
      Number(API_CONFIG.YOUTUBE?.DEFAULT_RESULTS || 6),
      MIN_RESULTS,
      MAX_RESULTS
    );
    this.cache = new Map();
  }

  hasApiKey() {
    return Boolean(this.apiKey);
  }

  sanitizeText(value) {
    return String(value || '')
      .replace(/[^\p{L}\p{N}\s,'\-()]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  buildLocationLabel(destination, stopName) {
    const cleanDestination = this.sanitizeText(destination);
    const cleanStop = this.sanitizeText(stopName);
    if (cleanStop && cleanDestination) return `${cleanStop}, ${cleanDestination}`;
    return cleanStop || cleanDestination;
  }

  buildCacheKey({ destination = '', stopName = '', limit = this.defaultResults }) {
    const destinationKey = this.sanitizeText(destination).toLowerCase();
    const stopKey = this.sanitizeText(stopName).toLowerCase();
    const limitKey = clamp(Number(limit || this.defaultResults), MIN_RESULTS, MAX_RESULTS);
    return `${destinationKey}|${stopKey}|${limitKey}`;
  }

  getCached(cacheKey) {
    const cached = this.cache.get(cacheKey);
    if (!cached) return null;
    if (Date.now() - cached.createdAt > this.cacheTtlMs) {
      this.cache.delete(cacheKey);
      return null;
    }
    return cached.payload;
  }

  setCached(cacheKey, payload) {
    this.cache.set(cacheKey, {
      createdAt: Date.now(),
      payload,
    });

    if (this.cache.size <= CACHE_LIMIT) return;
    const staleEntries = [...this.cache.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
    while (this.cache.size > CACHE_LIMIT && staleEntries.length) {
      const [oldestKey] = staleEntries.shift();
      this.cache.delete(oldestKey);
    }
  }

  buildSearchUrl(query) {
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  }

  mapVideoItem(item, durationSeconds = 0) {
    const videoId = String(item?.id?.videoId || '').trim();
    if (!videoId) return null;

    const title = String(item?.snippet?.title || '').trim();
    const description = String(item?.snippet?.description || '').trim();
    const channelTitle = String(item?.snippet?.channelTitle || '').trim();
    const publishedAt = String(item?.snippet?.publishedAt || '').trim();

    return {
      id: videoId,
      title,
      description,
      channelTitle,
      publishedAt,
      thumbnail: pickThumbnail(item?.snippet?.thumbnails),
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      durationSeconds,
      durationLabel: formatDuration(durationSeconds),
      isShort: durationSeconds > 0 && durationSeconds <= 180,
    };
  }

  async fetchDurations(videoIds = []) {
    const ids = [...new Set(videoIds.map((id) => String(id || '').trim()).filter(Boolean))];
    if (!ids.length || !this.hasApiKey()) return new Map();

    try {
      const { data } = await axios.get(`${this.baseUrl}/videos`, {
        params: {
          key: this.apiKey,
          part: 'contentDetails',
          id: ids.join(','),
          maxResults: ids.length,
        },
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
      });

      const map = new Map();
      const items = Array.isArray(data?.items) ? data.items : [];
      items.forEach((item) => {
        const videoId = String(item?.id || '').trim();
        if (!videoId) return;
        const duration = parseIso8601DurationToSeconds(item?.contentDetails?.duration || '');
        map.set(videoId, duration);
      });
      return map;
    } catch (error) {
      console.warn('[YouTube] duration fetch failed:', error.message);
      return new Map();
    }
  }

  async searchVideos(query, { maxResults = this.defaultResults, duration = 'any' } = {}) {
    if (!this.hasApiKey()) return [];

    const safeQuery = this.sanitizeText(query);
    if (!safeQuery) return [];

    const safeResults = clamp(Number(maxResults || this.defaultResults), MIN_RESULTS, MAX_RESULTS);
    const safeDuration = ['any', 'short', 'medium', 'long'].includes(duration) ? duration : 'any';

    const { data } = await axios.get(`${this.baseUrl}/search`, {
      params: {
        key: this.apiKey,
        part: 'snippet',
        type: 'video',
        q: safeQuery,
        maxResults: safeResults,
        order: 'relevance',
        safeSearch: 'moderate',
        videoEmbeddable: 'true',
        videoSyndicated: 'true',
        videoDuration: safeDuration,
      },
      timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
    });

    const items = Array.isArray(data?.items) ? data.items : [];
    const ids = items
      .map((item) => String(item?.id?.videoId || '').trim())
      .filter(Boolean);
    const durationMap = await this.fetchDurations(ids);

    return items
      .map((item) => this.mapVideoItem(
        item,
        durationMap.get(String(item?.id?.videoId || '').trim()) || 0
      ))
      .filter(Boolean);
  }

  buildFallbackPayload({ destination = '', stopName = '', limit = this.defaultResults } = {}) {
    const safeLimit = clamp(Number(limit || this.defaultResults), MIN_RESULTS, MAX_RESULTS);
    const locationLabel = this.buildLocationLabel(destination, stopName);
    const focus = locationLabel || this.sanitizeText(destination || stopName || 'travel destination');

    const queries = {
      videos: `${focus} travel guide`,
      shorts: `${focus} travel shorts`,
    };

    return {
      configured: this.hasApiKey(),
      provider: 'fallback-links',
      location: {
        destination: this.sanitizeText(destination),
        stopName: this.sanitizeText(stopName),
        label: locationLabel,
      },
      queries,
      videos: [],
      shorts: [],
      quickLinks: [
        {
          label: 'Open YouTube videos search',
          url: this.buildSearchUrl(queries.videos),
        },
        {
          label: 'Open YouTube Shorts search',
          url: this.buildSearchUrl(queries.shorts),
        },
      ],
      limit: safeLimit,
    };
  }

  dedupeByVideoId(list = []) {
    const seen = new Set();
    const next = [];
    list.forEach((item) => {
      const id = String(item?.id || '').trim();
      if (!id || seen.has(id)) return;
      seen.add(id);
      next.push(item);
    });
    return next;
  }

  async getSocialContent({ destination = '', stopName = '', limit = this.defaultResults } = {}) {
    const safeLimit = clamp(Number(limit || this.defaultResults), MIN_RESULTS, MAX_RESULTS);
    const safeDestination = this.sanitizeText(destination);
    const safeStop = this.sanitizeText(stopName);
    const focus = this.buildLocationLabel(safeDestination, safeStop);

    if (!focus) {
      return this.buildFallbackPayload({ destination: safeDestination, stopName: safeStop, limit: safeLimit });
    }

    const cacheKey = this.buildCacheKey({
      destination: safeDestination,
      stopName: safeStop,
      limit: safeLimit,
    });
    const cached = this.getCached(cacheKey);
    if (cached) return cached;

    const queries = {
      videos: `${focus} travel guide`,
      shorts: `${focus} travel shorts`,
    };

    if (!this.hasApiKey()) {
      const fallback = this.buildFallbackPayload({
        destination: safeDestination,
        stopName: safeStop,
        limit: safeLimit,
      });
      this.setCached(cacheKey, fallback);
      return fallback;
    }

    try {
      const mergedResults = await this.searchVideos(queries.videos, {
        maxResults: clamp(safeLimit * 2, MIN_RESULTS, MAX_RESULTS),
        duration: 'any',
      });
      const shortsByRule = mergedResults.filter((item) => {
        if (item.isShort) return true;
        const title = String(item?.title || '').toLowerCase();
        return title.includes('#shorts') || title.includes(' shorts');
      });
      const shortIds = new Set(shortsByRule.map((item) => item.id));
      const nonShortVideos = mergedResults.filter((item) => !shortIds.has(item.id));

      const videos = nonShortVideos.length ? nonShortVideos : mergedResults;
      const shorts = shortsByRule;

      const payload = {
        configured: true,
        provider: 'youtube-data-api',
        location: {
          destination: safeDestination,
          stopName: safeStop,
          label: focus,
        },
        queries,
        videos: this.dedupeByVideoId(videos).slice(0, safeLimit),
        shorts: this.dedupeByVideoId(shorts).slice(0, safeLimit),
        quickLinks: [
          {
            label: 'Open YouTube videos search',
            url: this.buildSearchUrl(queries.videos),
          },
          {
            label: 'Open YouTube Shorts search',
            url: this.buildSearchUrl(queries.shorts),
          },
        ],
        limit: safeLimit,
      };

      this.setCached(cacheKey, payload);
      return payload;
    } catch (error) {
      console.warn('[YouTube] social content fetch failed:', error.message);
      const fallback = this.buildFallbackPayload({
        destination: safeDestination,
        stopName: safeStop,
        limit: safeLimit,
      });
      this.setCached(cacheKey, fallback);
      return fallback;
    }
  }
}

module.exports = SocialContentService;
