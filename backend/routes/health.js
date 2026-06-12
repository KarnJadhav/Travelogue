const express = require('express');
const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');
const HotelsService = require('../services/hotelsService');

const router = express.Router();

const DEFAULT_TIMEOUT = API_CONFIG.DEFAULTS?.REQUEST_TIMEOUT || 10000;

const hasRealKey = (value) => {
  if (!value) return false;
  const trimmed = String(value).trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('your-')) return false;
  if (trimmed.includes('your_')) return false;
  return true;
};

const buildError = (error) => {
  const status = error?.response?.status;
  const message = error?.response?.data?.message || error?.response?.data?.error || error?.message;
  return { status, message: message || 'Unknown error' };
};

router.get('/external', async (req, res) => {
  const results = {};
  const checks = [];

  const runCheck = async (name, isConfigured, fn) => {
    if (!isConfigured) {
      results[name] = { status: 'missing' };
      return;
    }
    try {
      const data = await fn();
      results[name] = { status: 'ok', ...data };
    } catch (error) {
      results[name] = { status: 'error', error: buildError(error) };
    }
  };

  checks.push(runCheck('opentripmap', hasRealKey(API_CONFIG.OPENTRIPMAP.API_KEY), async () => {
    const response = await axios.get(`${API_CONFIG.OPENTRIPMAP.BASE_URL}/geoname`, {
      params: {
        name: 'Paris',
        apikey: API_CONFIG.OPENTRIPMAP.API_KEY,
      },
      timeout: DEFAULT_TIMEOUT,
    });
    return {
      sample: response.data?.name || 'Paris',
    };
  }));

  checks.push(runCheck('openweather', hasRealKey(API_CONFIG.WEATHER.API_KEY), async () => {
    const response = await axios.get(`${API_CONFIG.WEATHER.BASE_URL}/weather`, {
      params: {
        lat: 48.8566,
        lon: 2.3522,
        units: 'metric',
        appid: API_CONFIG.WEATHER.API_KEY,
      },
      timeout: DEFAULT_TIMEOUT,
    });
    return {
      sample: response.data?.weather?.[0]?.main || 'OK',
    };
  }));

  checks.push(runCheck('openrouter', hasRealKey(API_CONFIG.OPENROUTER.API_KEY), async () => {
    const response = await axios.post(
      `${API_CONFIG.OPENROUTER.BASE_URL}/chat/completions`,
      {
        model: API_CONFIG.OPENROUTER.MODEL,
        messages: [{ role: 'user', content: 'ping' }],
        temperature: 0.2,
        max_tokens: 5,
      },
      {
        headers: {
          Authorization: `Bearer ${API_CONFIG.OPENROUTER.API_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: DEFAULT_TIMEOUT,
      }
    );
    return {
      sample: response.data?.choices?.[0]?.message?.content?.slice(0, 20) || 'OK',
    };
  }));

  checks.push(runCheck('gemini', hasRealKey(API_CONFIG.GEMINI.API_KEY), async () => {
    const modelName = API_CONFIG.GEMINI.MODEL || 'gemini-1.5-flash';
    const response = await axios.post(
      `${API_CONFIG.GEMINI.BASE_URL}/models/${encodeURIComponent(modelName)}:generateContent?key=${API_CONFIG.GEMINI.API_KEY}`,
      {
        contents: [{ role: 'user', parts: [{ text: 'ping' }] }],
        generationConfig: { maxOutputTokens: 5, temperature: 0.2 },
      },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: DEFAULT_TIMEOUT,
      }
    );
    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
    return { sample: String(text).slice(0, 20) };
  }));

  checks.push(runCheck(
    'amadeus',
    hasRealKey(API_CONFIG.AMADEUS.CLIENT_ID) && hasRealKey(API_CONFIG.AMADEUS.CLIENT_SECRET),
    async () => {
      const hotelsService = new HotelsService();
      const token = await hotelsService.getAccessToken();
      if (!token) {
        throw new Error('Unable to fetch Amadeus token');
      }
      return { sample: 'token_ok' };
    }
  ));

  await Promise.allSettled(checks);

  return res.json({
    status: 'ok',
    checks: results,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;

