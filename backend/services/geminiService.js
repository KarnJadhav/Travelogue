const AIService = require('./aiService');
const API_CONFIG = require('../config/apiConfig');
const { jsonrepair } = require('jsonrepair');

class GeminiService {
  constructor(options = {}) {
    this.scope = String(options.scope || 'default').trim().toLowerCase();
    this.context = this.resolveContextConfig(this.scope);
    this.aiService = new AIService(this.context.providerOverrides);
    this.providerSequence = this.resolveProviderSequence();
  }

  resolveContextConfig(scope) {
    if (scope === 'itinerary') {
      const itineraryConfig = API_CONFIG.ITINERARY_AI || {};
      return {
        provider: String(itineraryConfig.PROVIDER || '').trim().toLowerCase(),
        providerSequence: String(itineraryConfig.PROVIDER_SEQUENCE || '').trim(),
        geminiModel:
          itineraryConfig.GEMINI?.MODEL ||
          API_CONFIG.GEMINI?.MODEL ||
          'gemini-2.5-flash',
        providerOverrides: {
          gemini: itineraryConfig.GEMINI || API_CONFIG.GEMINI,
          openrouter: itineraryConfig.OPENROUTER || API_CONFIG.OPENROUTER,
          openai: itineraryConfig.OPENAI || API_CONFIG.OPENAI,
          groq: itineraryConfig.GROQ || API_CONFIG.GROQ,
        },
      };
    }

    return {
      provider: String(API_CONFIG.AI?.PROVIDER || '').trim().toLowerCase(),
      providerSequence: String(API_CONFIG.AI?.PROVIDER_SEQUENCE || '').trim(),
      geminiModel: API_CONFIG.GEMINI?.MODEL || 'gemini-2.5-flash',
      providerOverrides: {},
    };
  }

  resolveProviderSequence() {
    const allowed = new Set(['gemini', 'openrouter', 'openai', 'groq']);
    const configuredDefault = this.context.provider;
    const configuredSequence = String(this.context.providerSequence || '')
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const fallbackOrder = ['gemini', 'openrouter', 'openai', 'groq'];
    const ordered = (configuredSequence.length ? configuredSequence : fallbackOrder)
      .filter((provider, index, list) => allowed.has(provider) && list.indexOf(provider) === index);

    if (configuredDefault && allowed.has(configuredDefault)) {
      return [configuredDefault, ...ordered.filter((provider) => provider !== configuredDefault)];
    }

    return ordered.length ? ordered : fallbackOrder;
  }

  normalizeJsonCandidate(content) {
    return String(content || '')
      .replace(/\uFEFF/g, '')
      .trim();
  }

  stripCodeFence(content) {
    const text = this.normalizeJsonCandidate(content);
    const fullFence = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fullFence?.[1]) return fullFence[1].trim();
    return text;
  }

  extractPositionFromError(message) {
    const match = String(message || '').match(/position\s+(\d+)/i);
    return match ? Number(match[1]) : null;
  }

  summarizeParseError(error, input) {
    const message = String(error?.message || error || 'Invalid JSON');
    const pos = this.extractPositionFromError(message);
    if (!Number.isFinite(pos)) return message;
    const radius = 48;
    const start = Math.max(0, pos - radius);
    const end = Math.min(String(input || '').length, pos + radius);
    const snippet = String(input || '').slice(start, end).replace(/\s+/g, ' ').trim();
    return `${message}. Near: "${snippet}"`;
  }

  repairJsonContent(content) {
    let text = this.stripCodeFence(content);

    // Normalize quotes and remove invalid control bytes.
    text = text
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

    // Remove comments frequently injected by models.
    text = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

    // Remove trailing commas before closing tokens.
    text = text.replace(/,\s*([}\]])/g, '$1');

    // Common model bug: missing comma between adjacent objects/arrays.
    text = text
      .replace(/}\s*{/g, '},{')
      .replace(/]\s*\[/g, '],[');

    return text.trim();
  }

  buildJsonCandidates(rawText) {
    const text = this.normalizeJsonCandidate(rawText);
    const candidates = [];
    const seen = new Set();

    const add = (value) => {
      const normalized = this.normalizeJsonCandidate(value);
      if (!normalized) return;
      if (seen.has(normalized)) return;
      seen.add(normalized);
      candidates.push(normalized);
    };

    add(text);

    const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/gi;
    let match;
    while ((match = codeBlockRegex.exec(text)) !== null) {
      add(match[1]);
    }

    const extracted = this.aiService.extractJsonBlock(text, '');
    if (extracted) add(extracted);

    const firstObject = text.indexOf('{');
    const lastObject = text.lastIndexOf('}');
    if (firstObject >= 0 && lastObject > firstObject) {
      add(text.slice(firstObject, lastObject + 1));
    }

    const firstArray = text.indexOf('[');
    const lastArray = text.lastIndexOf(']');
    if (firstArray >= 0 && lastArray > firstArray) {
      add(text.slice(firstArray, lastArray + 1));
    }

    return candidates;
  }

  parseStructuredJson(content) {
    const text = this.normalizeJsonCandidate(content);
    if (!text) {
      throw new Error('AI provider returned empty content.');
    }

    const candidates = this.buildJsonCandidates(text);
    const parseErrors = [];

    for (const candidate of candidates) {
      const attempts = [];
      const seen = new Set();
      const queue = [candidate];

      for (let pass = 0; pass < 3 && queue.length; pass += 1) {
        const current = queue.shift();
        const normalized = this.normalizeJsonCandidate(current);
        if (!normalized || seen.has(normalized)) continue;
        seen.add(normalized);
        attempts.push(normalized);
        queue.push(this.repairJsonContent(normalized));
      }

      for (const attempt of attempts) {
        try {
          return JSON.parse(attempt);
        } catch (error) {
          try {
            const repaired = jsonrepair(attempt);
            if (repaired && repaired !== attempt) {
              return JSON.parse(repaired);
            }
          } catch (repairError) {
            parseErrors.push(this.summarizeParseError(repairError, attempt));
          }
          parseErrors.push(this.summarizeParseError(error, attempt));
        }
      }
    }

    const topError = parseErrors[0] || 'AI provider returned invalid JSON.';
    throw new Error(topError);
  }

  async callProvider(provider, { prompt, maxOutputTokens, temperature }) {
    if (provider === 'gemini') {
      return this.aiService.callGemini({
        prompt,
        model: this.context.geminiModel || this.aiService.geminiModel,
        temperature,
        maxOutputTokens,
        responseMimeType: 'application/json',
        thinkingBudget: 0,
        timeoutMs: 45000,
      });
    }

    if (provider === 'openrouter') {
      return this.aiService.callOpenRouterChat({
        prompt,
        temperature: Math.min(temperature, 0.15),
        maxTokens: Math.max(2200, Math.min(maxOutputTokens, 8000)),
        responseFormat: 'json_object',
      });
    }

    if (provider === 'openai') {
      return this.aiService.callOpenAIResponse({
        prompt,
        temperature: Math.min(temperature, 0.35),
        maxOutputTokens,
        responseFormat: 'json_object',
      });
    }

    if (provider === 'groq') {
      return this.aiService.callGroqChat({
        prompt,
        temperature: Math.min(temperature, 0.35),
        maxTokens: Math.max(2200, Math.min(maxOutputTokens, 7000)),
        responseFormat: 'json_object',
      });
    }

    throw new Error(`Unsupported provider: ${provider}`);
  }

  async generateStructuredJson({
    prompt,
    maxOutputTokens = 2600,
    temperature = 0.4,
    validateJson,
  }) {
    const errors = [];

    for (const provider of this.providerSequence) {
      try {
        const response = await this.callProvider(provider, {
          prompt,
          maxOutputTokens,
          temperature,
        });
        const parsed = this.parseStructuredJson(response);
        if (typeof validateJson === 'function') {
          const verdict = validateJson(parsed);
          if (verdict !== true) {
            throw new Error(
              typeof verdict === 'string'
                ? verdict
                : 'Parsed JSON does not match required structure.'
            );
          }
        }
        return parsed;
      } catch (error) {
        errors.push(`[${provider}] ${error.message}`);
      }
    }

    throw new Error(`All structured AI providers failed: ${errors.join(' | ')}`);
  }
}

module.exports = GeminiService;
