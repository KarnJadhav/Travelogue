/**
 * Map Optimization Utilities
 * - Debouncing for search queries
 * - Caching for API responses
 * - Lazy loading for markers
 */

// Debounce function for search (prevents rapid API calls)
export const debounce = (func, delay = 500) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};

// Cache for API responses
class APICache {
  constructor(maxSize = 100, ttl = 5 * 60 * 1000) { // 5 minutes TTL
    this.cache = new Map();
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  set(key, value) {
    // Remove oldest item if cache is full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if cache expired
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  clear() {
    this.cache.clear();
  }

  has(key) {
    return this.get(key) !== null;
  }
}

// Create global cache instance
export const apiCache = new APICache(200, 10 * 60 * 1000); // 10 minute TTL

// Batch processing for large marker arrays
export const batchProcessMarkers = (markers, batchSize = 50) => {
  const batches = [];
  for (let i = 0; i < markers.length; i += batchSize) {
    batches.push(markers.slice(i, i + batchSize));
  }
  return batches;
};

// Throttle function for map events
export const throttle = (func, limit = 100) => {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Memoization for expensive calculations
export const memoize = (func) => {
  const cache = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }
    const result = func(...args);
    cache.set(key, result);
    return result;
  };
};

// Request animation frame throttling for smooth rendering
export const rafThrottle = (func) => {
  let rafId;
  let lastCall = 0;
  return (...args) => {
    const now = Date.now();
    if (now - lastCall > 16) { // ~60fps
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        func(...args);
        lastCall = Date.now();
      });
    }
  };
};

// Worker pool for parallel processing
export class WorkerPool {
  constructor(size = 4) {
    this.size = size;
    this.queue = [];
    this.activeWorkers = 0;
  }

  async run(task) {
    if (this.activeWorkers < this.size) {
      this.activeWorkers++;
      try {
        return await task();
      } finally {
        this.activeWorkers--;
        this.processQueue();
      }
    } else {
      return new Promise(resolve => {
        this.queue.push(() => {
          this.activeWorkers++;
          task().then(resolve).finally(() => {
            this.activeWorkers--;
            this.processQueue();
          });
        });
      });
    }
  }

  processQueue() {
    if (this.queue.length > 0 && this.activeWorkers < this.size) {
      const task = this.queue.shift();
      task();
    }
  }
}

// Create worker pool for marker processing
export const markerWorkerPool = new WorkerPool(4);

// Optimize marker data for rendering
export const optimizeMarkerData = (marker) => {
  return {
    xid: marker.xid,
    lat: parseFloat(marker.lat),
    lon: parseFloat(marker.lon),
    name: marker.name,
    kinds: marker.kinds,
    importance: marker.importance || 0,
    icon: marker.icon,
    // Include only necessary fields
  };
};

// Sort markers by importance and distance
export const sortMarkersByImportance = (markers, userLat = null, userLon = null) => {
  return [...markers].sort((a, b) => {
    const importanceA = a.importance || 0;
    const importanceB = b.importance || 0;
    
    // Sort by importance first
    if (importanceA !== importanceB) {
      return importanceB - importanceA;
    }

    // If user location is provided, sort by distance
    if (userLat && userLon) {
      const distA = Math.hypot(a.lat - userLat, a.lon - userLon);
      const distB = Math.hypot(b.lat - userLat, b.lon - userLon);
      return distA - distB;
    }

    return 0;
  });
};

export default {
  debounce,
  apiCache,
  batchProcessMarkers,
  throttle,
  memoize,
  rafThrottle,
  WorkerPool,
  markerWorkerPool,
  optimizeMarkerData,
  sortMarkersByImportance,
};
