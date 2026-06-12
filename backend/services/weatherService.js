/**
 * Weather Service - Fetch weather data from OpenWeatherMap
 * Handles weather forecasts and recommendations
 */

const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');

class WeatherService {
  constructor() {
    this.apiKey = API_CONFIG.WEATHER.API_KEY;
    this.baseUrl = API_CONFIG.WEATHER.BASE_URL;
  }

  /**
   * Get current weather for a location
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @returns {Promise<Object>} Current weather data
   */
  async getCurrentWeather(latitude, longitude) {
    try {
      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          lat: latitude,
          lon: longitude,
          units: 'metric', // Celsius
          appid: this.apiKey,
        },
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
      });

      return this.formatWeather(response.data);
    } catch (error) {
      console.error('Current weather error:', error.message);
      return this.getDefaultWeather();
    }
  }

  /**
   * Get 5-day weather forecast
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @returns {Promise<Array>} 5-day forecast
   */
  async getForecast(latitude, longitude) {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          lat: latitude,
          lon: longitude,
          units: 'metric', // Celsius
          appid: this.apiKey,
          cnt: 40, // 5 days * 8 (3-hour intervals)
        },
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
      });

      return this.formatForecast(response.data.list);
    } catch (error) {
      console.error('Forecast error:', error.message);
      return [];
    }
  }

  /**
   * Get weather forecast organized by day
   * @param {number} latitude - Location latitude
   * @param {number} longitude - Location longitude
   * @param {number} numberOfDays - Number of days to forecast
   * @returns {Promise<Array>} Daily weather breakdown
   */
  async getDailyForecast(latitude, longitude, numberOfDays = 7) {
    try {
      const forecast = await this.getForecast(latitude, longitude);

      // Group by day
      const dailyWeather = {};

      forecast.forEach((item) => {
        const date = item.date.split('T')[0]; // YYYY-MM-DD

        if (!dailyWeather[date]) {
          dailyWeather[date] = {
            date,
            temperatures: [],
            conditions: [],
            humidity: [],
            windSpeed: [],
            rainProbability: 0,
            recommendations: [],
          };
        }

        dailyWeather[date].temperatures.push(item.temperature);
        dailyWeather[date].conditions.push(item.condition);
        dailyWeather[date].humidity.push(item.humidity);
        dailyWeather[date].windSpeed.push(item.windSpeed);
        dailyWeather[date].rainProbability = Math.max(
          dailyWeather[date].rainProbability,
          item.rainProbability
        );
      });

      // Calculate daily averages and recommendations
      return Object.values(dailyWeather)
        .slice(0, numberOfDays)
        .map((day) => {
          const condition = this.getMajorityCondition(day.conditions);
          return {
            date: day.date,
            maxTemp: Math.max(...day.temperatures),
            minTemp: Math.min(...day.temperatures),
            avgTemp:
              day.temperatures.reduce((a, b) => a + b, 0) / day.temperatures.length,
            condition,
            avgHumidity: day.humidity.reduce((a, b) => a + b, 0) / day.humidity.length,
            avgWindSpeed:
              day.windSpeed.reduce((a, b) => a + b, 0) / day.windSpeed.length,
            rainProbability: day.rainProbability,
            recommendations: this.getActivityRecommendations(
              condition,
              day.rainProbability
            ),
          };
        });
    } catch (error) {
      console.error('Daily forecast error:', error.message);
      return [];
    }
  }

  /**
   * Check if weather is suitable for outdoor activities
   * @param {string} weatherCondition - Weather condition string
   * @returns {boolean} True if suitable for outdoor activities
   */
  isGoodForOutdoor(weatherCondition) {
    const goodConditions = ['clear', 'clouds', 'sunny', 'partly cloudy'];
    return goodConditions.some((cond) =>
      weatherCondition.toLowerCase().includes(cond)
    );
  }

  /**
   * Get indoor activity suggestions for bad weather
   * @param {string} weatherCondition - Weather condition
   * @returns {Array<string>} Suggested indoor activities
   */
  getIndoorSuggestions(weatherCondition) {
    const indoorActivities = [
      'museums',
      'shopping malls',
      'art galleries',
      'restaurants',
      'cafes',
      'spas',
      'cinemas',
      'theaters',
      'libraries',
      'indoor markets',
    ];

    // For rainy weather, prioritize covered attractions
    if (weatherCondition.includes('rain')) {
      return [
        'museums',
        'shopping malls',
        'art galleries',
        'restaurants',
        'spas',
        ...indoorActivities,
      ];
    }

    return indoorActivities;
  }

  /**
   * Format current weather response
   * @private
   */
  formatWeather(data) {
    if (!data) return this.getDefaultWeather();

    const weather = data.weather?.[0] || {};
    const main = data.main || {};

    return {
      temperature: Math.round(main.temp || 0),
      feelsLike: Math.round(main.feels_like || 0),
      minTemp: Math.round(main.temp_min || 0),
      maxTemp: Math.round(main.temp_max || 0),
      humidity: main.humidity || 0,
      windSpeed: Math.round(data.wind?.speed || 0),
      condition: weather.main || 'Unknown',
      description: weather.description || '',
      cloudiness: data.clouds?.all || 0,
      rainProbability: 0,
      visibility: Math.round((data.visibility || 0) / 1000), // in km
      pressure: data.main?.pressure || 0,
      lastUpdated: new Date(data.dt * 1000),
    };
  }

  /**
   * Format 5-day forecast
   * @private
   */
  formatForecast(list) {
    return list.map((item) => {
      const weather = item.weather?.[0] || {};
      const main = item.main || {};

      return {
        date: new Date(item.dt * 1000).toISOString(),
        temperature: Math.round(main.temp || 0),
        feelsLike: Math.round(main.feels_like || 0),
        humidity: main.humidity || 0,
        windSpeed: Math.round(item.wind?.speed || 0),
        condition: weather.main || 'Unknown',
        description: weather.description || '',
        rainProbability: item.pop ? Math.round(item.pop * 100) : 0,
        cloudiness: item.clouds?.all || 0,
      };
    });
  }

  /**
   * Get majority weather condition from array
   * @private
   */
  getMajorityCondition(conditions) {
    if (!conditions || conditions.length === 0) return 'Unknown';

    const conditionCounts = {};
    conditions.forEach((cond) => {
      conditionCounts[cond] = (conditionCounts[cond] || 0) + 1;
    });

    return Object.keys(conditionCounts).reduce((a, b) =>
      conditionCounts[a] > conditionCounts[b] ? a : b
    );
  }

  /**
   * Get activity recommendations based on weather
   * @private
   */
  getActivityRecommendations(condition, rainProbability) {
    const recommendations = [];

    if (this.isGoodForOutdoor(condition)) {
      recommendations.push('outdoor_sightseeing');
      recommendations.push('hiking');
      recommendations.push('photography');
      if (rainProbability < 20) {
        recommendations.push('water_sports');
        recommendations.push('picnic');
      }
    } else {
      recommendations.push(...this.getIndoorSuggestions(condition));
    }

    if (rainProbability > 60) {
      recommendations.push('indoor_shopping');
      recommendations.push('museum_visit');
      recommendations.push('spa_relaxation');
    }

    return recommendations;
  }

  /**
   * Default weather object for fallback
   * @private
   */
  getDefaultWeather() {
    return {
      temperature: 20,
      feelsLike: 18,
      minTemp: 15,
      maxTemp: 25,
      humidity: 60,
      windSpeed: 10,
      condition: 'Clear',
      description: 'Clear sky',
      cloudiness: 10,
      rainProbability: 0,
      visibility: 10,
      pressure: 1013,
      lastUpdated: new Date(),
    };
  }
}

module.exports = WeatherService;
