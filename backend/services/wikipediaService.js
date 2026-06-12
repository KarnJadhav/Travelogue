/**
 * Wikipedia Service - Free place summaries and nearby POIs
 * Uses Wikipedia API (no key required)
 */

const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');

class WikipediaService {
  constructor() {
    this.baseUrl = API_CONFIG.WIKIPEDIA.BASE_URL;
    this.summaryBaseUrl = 'https://en.wikipedia.org/api/rest_v1/page/summary';
    this.requestHeaders = {
      'User-Agent': 'travel2-platform/1.0 (support@example.com)',
      'Accept': 'application/json',
    };
  }

  async geoSearch(latitude, longitude, radius = 10000, limit = 20) {
    try {
      const { data } = await axios.get(this.baseUrl, {
        params: {
          action: 'query',
          list: 'geosearch',
          gscoord: `${latitude}|${longitude}`,
          gsradius: radius,
          gslimit: Math.min(limit, 50),
          format: 'json',
          origin: '*',
        },
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
        headers: this.requestHeaders,
      });

      const results = data?.query?.geosearch || [];
      return results.map((item) => ({
        id: item.pageid,
        title: item.title,
        latitude: item.lat,
        longitude: item.lon,
      }));
    } catch (error) {
      console.error('Wikipedia geosearch error:', error.message);
      return [];
    }
  }

  async getSummary(title) {
    if (!title) return null;
    try {
      const url = `${this.summaryBaseUrl}/${encodeURIComponent(title)}`;
      const { data } = await axios.get(url, {
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
        headers: this.requestHeaders,
      });
      return data || null;
    } catch (error) {
      console.error('Wikipedia summary error:', error.message);
      return null;
    }
  }

  async searchByTitle(query, limit = 10) {
    if (!query) return [];
    try {
      const { data } = await axios.get(this.baseUrl, {
        params: {
          action: 'query',
          list: 'search',
          srsearch: query,
          srlimit: Math.min(limit, 20),
          format: 'json',
          origin: '*',
        },
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
        headers: this.requestHeaders,
      });

      const results = data?.query?.search || [];
      return results.map((item) => item.title).filter(Boolean);
    } catch (error) {
      console.error('Wikipedia search error:', error.message);
      return [];
    }
  }

  inferCategory(text) {
    const value = String(text || '').toLowerCase();
    if (
      value.includes('temple') ||
      value.includes('church') ||
      value.includes('mosque') ||
      value.includes('palace') ||
      value.includes('fort') ||
      value.includes('museum') ||
      value.includes('monument')
    ) {
      return 'culture';
    }
    if (
      value.includes('lake') ||
      value.includes('park') ||
      value.includes('mountain') ||
      value.includes('beach') ||
      value.includes('waterfall') ||
      value.includes('forest') ||
      value.includes('wildlife') ||
      value.includes('sanctuary')
    ) {
      return 'nature';
    }
    if (value.includes('market') || value.includes('bazaar') || value.includes('shopping')) {
      return 'shopping';
    }
    if (value.includes('restaurant') || value.includes('cuisine') || value.includes('food')) {
      return 'food';
    }
    return 'sightseeing';
  }

  toPlaceFromSummary(summary) {
    if (!summary) return null;
    const description = summary.extract || summary.description || '';
    const category = this.inferCategory(`${summary.title || ''} ${description}`);
    const latitude = summary.coordinates?.lat || 0;
    const longitude = summary.coordinates?.lon || 0;

    return {
      id: `wiki:${summary.pageid || summary.title}`,
      name: summary.title || 'Local attraction',
      description: description || 'Popular local attraction worth visiting.',
      category,
      location: {
        coordinates: {
          latitude,
          longitude,
        },
        address: summary.description || '',
      },
      rating: 0,
      imageUrl: summary.thumbnail?.source || null,
      source: 'wikipedia',
      url: summary.content_urls?.desktop?.page || null,
    };
  }

  toPlace(geoItem, summary) {
    const description =
      summary?.extract ||
      summary?.description ||
      'Popular local attraction worth visiting.';
    const category = this.inferCategory(`${geoItem?.title || ''} ${description}`);

    return {
      id: `wiki:${geoItem?.id || geoItem?.title}`,
      name: geoItem?.title || summary?.title || 'Local attraction',
      description,
      category,
      location: {
        coordinates: {
          latitude: geoItem?.latitude || summary?.coordinates?.lat || 0,
          longitude: geoItem?.longitude || summary?.coordinates?.lon || 0,
        },
        address: summary?.description || '',
      },
      rating: 0,
      imageUrl: summary?.thumbnail?.source || null,
      source: 'wikipedia',
      url: summary?.content_urls?.desktop?.page || null,
    };
  }

  async getNearbyPlaces(latitude, longitude, limit = 12) {
    const geoResults = await this.geoSearch(latitude, longitude, 10000, limit);
    if (geoResults.length === 0) return [];

    const summaries = await Promise.all(
      geoResults.map((item) => this.getSummary(item.title))
    );

    return geoResults.map((item, idx) => this.toPlace(item, summaries[idx])).filter(Boolean);
  }

  async getPlacesByTitle(query, limit = 12) {
    const titles = await this.searchByTitle(query, limit);
    if (titles.length === 0) return [];

    const summaries = await Promise.all(titles.map((title) => this.getSummary(title)));
    return summaries
      .map((summary) => this.toPlaceFromSummary(summary))
      .filter(Boolean);
  }

  async getCityOverview(destination) {
    const titles = await this.searchByTitle(destination, 1);
    const title = titles[0] || destination;
    const summary = await this.getSummary(title);
    return this.toPlaceFromSummary(summary);
  }
}

module.exports = WikipediaService;
