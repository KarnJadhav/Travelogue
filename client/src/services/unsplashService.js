import axios from 'axios';

const UNSPLASH_API_BASE = 'https://api.unsplash.com';
const UNSPLASH_ACCESS_KEY = String(import.meta.env.VITE_UNSPLASH_ACCESS_KEY || '').trim();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

const photoCache = new Map();
const inflightRequests = new Map();

const normalizeQuery = (value = '') => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');

const clearExpiredCache = () => {
  const now = Date.now();
  for (const [key, value] of photoCache.entries()) {
    if (now > value.expireAt) {
      photoCache.delete(key);
    }
  }
};

const getCachedPhotos = (cacheKey) => {
  clearExpiredCache();
  const cached = photoCache.get(cacheKey);
  return cached ? cached.photos : null;
};

const cachePhotos = (cacheKey, photos) => {
  photoCache.set(cacheKey, {
    photos,
    expireAt: Date.now() + CACHE_TTL_MS,
  });
};

const toPhotoSummary = (photo) => {
  const imageUrl = photo?.urls?.small || photo?.urls?.regular || photo?.urls?.full || '';
  if (!imageUrl) return null;
  return {
    id: photo?.id || '',
    imageUrl,
    photographerName: photo?.user?.name || '',
    photographerLink: photo?.user?.links?.html || '',
    unsplashPhotoLink: photo?.links?.html || '',
  };
};

export const isUnsplashConfigured = () => Boolean(UNSPLASH_ACCESS_KEY);

export const searchUnsplashPlacePhotos = async (query, limit = 6) => {
  const normalized = normalizeQuery(query);
  const safeLimit = Math.min(Math.max(Number(limit) || 1, 1), 10);
  if (!normalized || normalized.length < 3 || !isUnsplashConfigured()) {
    return [];
  }

  const cacheKey = `${normalized}_${safeLimit}`;
  const cached = getCachedPhotos(cacheKey);
  if (cached) return cached;
  if (inflightRequests.has(cacheKey)) {
    return inflightRequests.get(cacheKey);
  }

  const request = axios.get(`${UNSPLASH_API_BASE}/search/photos`, {
    params: {
      query: normalized,
      page: 1,
      per_page: safeLimit,
      orientation: 'landscape',
      content_filter: 'high',
      order_by: 'relevant',
    },
    headers: {
      Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
    },
    timeout: 12000,
  })
    .then((response) => {
      const photos = Array.isArray(response?.data?.results)
        ? response.data.results.map(toPhotoSummary).filter(Boolean)
        : [];
      cachePhotos(cacheKey, photos);
      return photos;
    })
    .catch(() => [])
    .finally(() => {
      inflightRequests.delete(cacheKey);
    });

  inflightRequests.set(cacheKey, request);
  return request;
};

export default {
  isUnsplashConfigured,
  searchUnsplashPlacePhotos,
};
