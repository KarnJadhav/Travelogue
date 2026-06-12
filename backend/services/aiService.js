const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');

class AIService {
  constructor(overrides = {}) {
    const geminiConfig = overrides.gemini || API_CONFIG.GEMINI || {};
    const openAIConfig = overrides.openai || API_CONFIG.OPENAI || {};
    const openRouterConfig = overrides.openrouter || API_CONFIG.OPENROUTER || {};
    const groqConfig = overrides.groq || API_CONFIG.GROQ || {};

    this.geminiKey = (geminiConfig.API_KEY || '').trim();
    this.geminiBaseUrl =
      geminiConfig.BASE_URL ||
      'https://generativelanguage.googleapis.com/v1beta';
    this.geminiModel = geminiConfig.MODEL || 'gemini-2.5-flash';
    this.geminiVisionModel =
      geminiConfig.VISION_MODEL || this.geminiModel;
    this.hasGeminiAccess = Boolean(this.geminiKey);

    this.openaiKey = (openAIConfig.API_KEY || '').trim();
    this.openaiBaseUrl = openAIConfig.BASE_URL || 'https://api.openai.com/v1';
    this.openaiModel = openAIConfig.MODEL || 'gpt-oss-120b';
    this.openaiMaxOutputTokens = Number(openAIConfig.MAX_OUTPUT_TOKENS || 7000);
    this.hasOpenAIAccess = Boolean(this.openaiKey);

    this.openRouterKey = (openRouterConfig.API_KEY || '').trim();
    this.openRouterBaseUrl = openRouterConfig.BASE_URL || 'https://openrouter.ai/api/v1';
    this.openRouterModel = openRouterConfig.MODEL || 'openrouter/free';
    this.hasOpenRouterAccess = Boolean(this.openRouterKey);

    this.groqKey = (groqConfig.API_KEY || '').trim();
    this.groqBaseUrl = groqConfig.BASE_URL || 'https://api.groq.com/openai/v1';
    this.groqModel = groqConfig.MODEL || 'llama-3.1-8b-instant';
    this.hasGroqAccess = Boolean(this.groqKey);
  }

  extractJsonBlock(content, fallback = null) {
    if (!content || typeof content !== 'string') return fallback;
    const objectMatch = content.match(/\{[\s\S]*\}/);
    if (objectMatch) return objectMatch[0];
    const arrayMatch = content.match(/\[[\s\S]*\]/);
    if (arrayMatch) return arrayMatch[0];
    return fallback;
  }

  normalizeImagePayload(imageData, imageMimeType) {
    if (!imageData || typeof imageData !== 'string') return null;

    let data = imageData.trim();
    let mimeType = imageMimeType;
    const dataUrlMatch = data.match(/^data:(.+?);base64,(.+)$/);
    if (dataUrlMatch) {
      mimeType = mimeType || dataUrlMatch[1];
      data = dataUrlMatch[2];
    }

    data = data.replace(/\s/g, '');
    return {
      data,
      mimeType: mimeType || 'image/jpeg',
    };
  }

  extractOpenAIOutputText(responseData) {
    if (!responseData) return '';
    if (typeof responseData.output_text === 'string') {
      return responseData.output_text.trim();
    }

    const output = Array.isArray(responseData.output) ? responseData.output : [];
    const chunks = [];

    output.forEach((item) => {
      if (item?.type !== 'message') return;
      const content = Array.isArray(item.content) ? item.content : [];
      content.forEach((part) => {
        if (part?.type === 'output_text' && part.text) {
          chunks.push(part.text);
        }
      });
    });

    return chunks.join('').trim();
  }

  async callGemini({
    prompt,
    imageData,
    imageMimeType,
    model,
    temperature = 0.7,
    maxOutputTokens = 1200,
    responseMimeType,
    thinkingBudget,
    timeoutMs,
  }) {
    if (!this.hasGeminiAccess) {
      throw new Error('Gemini API key is missing');
    }

    const parts = [{ text: prompt }];
    if (imageData) {
      const normalized = this.normalizeImagePayload(imageData, imageMimeType);
      if (normalized?.data) {
        parts.push({
          inline_data: {
            mime_type: normalized.mimeType,
            data: normalized.data,
          },
        });
      }
    }

    const generationConfig = {
      temperature,
      maxOutputTokens,
    };
    if (responseMimeType) {
      generationConfig.responseMimeType = responseMimeType;
    }
    if (Number.isFinite(Number(thinkingBudget)) && Number(thinkingBudget) >= 0) {
      generationConfig.thinkingConfig = {
        thinkingBudget: Math.floor(Number(thinkingBudget)),
      };
    }

    const requestBody = {
      contents: [{ role: 'user', parts }],
      generationConfig,
    };

    const modelName = model || this.geminiModel;
    const url = `${this.geminiBaseUrl}/models/${encodeURIComponent(modelName)}:generateContent?key=${this.geminiKey}`;

    const response = await axios.post(url, requestBody, {
      timeout: Number(timeoutMs) > 0 ? Number(timeoutMs) : API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
      headers: { 'Content-Type': 'application/json' },
    });

    const partsOut = response.data?.candidates?.[0]?.content?.parts || [];
    return partsOut.map((part) => part.text || '').join('').trim();
  }

  async callOpenAIResponse({
    prompt,
    temperature = 0.7,
    maxOutputTokens,
    responseFormat = 'json_object',
  }) {
    if (!this.hasOpenAIAccess) {
      throw new Error('OpenAI API key is missing');
    }

    const input = [
      {
        role: 'system',
        content: [
          {
            type: 'input_text',
            text: 'Respond with valid JSON only.',
          },
        ],
      },
      {
        role: 'user',
        content: [
          {
            type: 'input_text',
            text: prompt,
          },
        ],
      },
    ];

    const requestBody = {
      model: this.openaiModel,
      input,
      temperature,
      max_output_tokens: Number.isFinite(maxOutputTokens)
        ? maxOutputTokens
        : this.openaiMaxOutputTokens,
    };

    if (responseFormat) {
      requestBody.text = { format: { type: responseFormat } };
    }

    const response = await axios.post(
      `${this.openaiBaseUrl}/responses`,
      requestBody,
      {
        timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
        headers: {
          Authorization: `Bearer ${this.openaiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return this.extractOpenAIOutputText(response.data);
  }

  async callOpenRouterChat({
    prompt,
    model,
    temperature = 0.3,
    maxTokens = 2200,
    responseFormat = 'json_object',
  }) {
    if (!this.hasOpenRouterAccess) {
      throw new Error('OpenRouter API key is missing');
    }

    const requestBody = {
      model: model || this.openRouterModel,
      messages: [
        { role: 'system', content: 'Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    if (responseFormat === 'json_object') {
      requestBody.response_format = { type: 'json_object' };
    }

    const openRouterReferer = (process.env.APP_PUBLIC_URL || process.env.FRONTEND_PUBLIC_URL || '').trim();
    const requestConfig = {
      timeout: Math.max(API_CONFIG.DEFAULTS.REQUEST_TIMEOUT, 18000),
      headers: {
        Authorization: `Bearer ${this.openRouterKey}`,
        'Content-Type': 'application/json',
        ...(openRouterReferer ? { 'HTTP-Referer': openRouterReferer } : {}),
        'X-Title': process.env.APP_NAME || 'Travel Platform',
      },
    };

    const response = await axios.post(
      `${this.openRouterBaseUrl}/chat/completions`,
      requestBody,
      requestConfig
    );

    let content = response.data?.choices?.[0]?.message?.content || '';
    if (String(content || '').trim()) {
      return content;
    }

    // Some models return empty content with strict response_format.
    // Retry once without response_format before failing.
    if (responseFormat === 'json_object') {
      const relaxedBody = { ...requestBody };
      delete relaxedBody.response_format;
      const relaxedResponse = await axios.post(
        `${this.openRouterBaseUrl}/chat/completions`,
        relaxedBody,
        requestConfig
      );
      content = relaxedResponse.data?.choices?.[0]?.message?.content || '';
    }

    return content;
  }

  async callGroqChat({
    prompt,
    temperature = 0.3,
    maxTokens = 2200,
    responseFormat = 'json_object',
  }) {
    if (!this.hasGroqAccess) {
      throw new Error('Groq API key is missing');
    }

    const requestBody = {
      model: this.groqModel,
      messages: [
        { role: 'system', content: 'Respond with valid JSON only.' },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    if (responseFormat === 'json_object') {
      requestBody.response_format = { type: 'json_object' };
    }

    const response = await axios.post(
      `${this.groqBaseUrl}/chat/completions`,
      requestBody,
      {
        timeout: Math.max(API_CONFIG.DEFAULTS.REQUEST_TIMEOUT, 30000),
        headers: {
          Authorization: `Bearer ${this.groqKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data?.choices?.[0]?.message?.content || '';
  }

  /**
   * Generate a complete itinerary using AI
   * @param {Object} params - Itinerary generation parameters
   * @param {string} params.destination - Travel destination
   * @param {number} params.days - Number of days for the trip
   * @param {number} params.budget - Total budget in INR
   * @param {Array<string>} params.interests - User interests (food, culture, adventure, etc.)
   * @param {string} params.travelStyle - Travel style (luxury, budget, adventure, relaxed)
   * @param {number} params.travelers - Number of travelers
   * @returns {Promise<Object>} Generated itinerary structure
   */
  async generateItinerary(params) {
    const {
      destination,
      days,
      budget,
      interests = [],
      travelStyle = 'moderate',
      travelers = 1,
    } = params;

    const prompt = this.buildItineraryPrompt({
      destination,
      days,
      budget,
      currency: 'INR',
      interests,
      travelStyle,
      travelers,
      startDate: params.startDate,
      aiNotes: params.aiNotes,
      placesToVisit: params.placesToVisit,
    });

    const providers = this.getItineraryProviderSequence();
    const errors = [];

    for (const provider of providers) {
      if (provider === 'gemini') {
        if (!this.hasGeminiAccess) {
          errors.push('gemini: missing API key');
          continue;
        }
        try {
          const geminiResponse = await this.callGemini({
            prompt,
            maxOutputTokens: 8000,
            responseMimeType: 'text/plain',
            temperature: 0.4,
            timeoutMs: 75000,
            includeUsage: true,
          });
          const content =
            typeof geminiResponse === 'string'
              ? geminiResponse
              : (geminiResponse?.text || '');
          const parsed = this.normalizeItineraryFromAnyResponse(content, params);
          if (parsed) {
            parsed.meta = {
              provider: 'gemini',
              model: this.geminiModel,
              usage: geminiResponse?.usage || null,
            };
            console.log('[ITINERARY][AI] Provider success: gemini');
            console.log('[ITINERARY][AI] Raw preview:', String(content || '').slice(0, 400));
            console.log(
              '[ITINERARY][AI] Parsed day/activity counts:',
              (parsed.dailyPlan || []).map((d) => `D${d.day}:${(d.activities || []).length}`).join(', ')
            );
            return parsed;
          }
          errors.push('gemini: response could not be converted into itinerary');
        } catch (error) {
          errors.push(`gemini: ${this.formatProviderError(error)}`);
        }
      }

      if (provider === 'openrouter') {
        if (!this.hasOpenRouterAccess) {
          errors.push('openrouter: missing API key');
          continue;
        }
        try {
          // Attempt 1: strict JSON mode (works for many providers, fails for some)
          const requestBody = {
            model: this.openRouterModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.4,
            max_tokens: 6000,
            response_format: { type: 'json_object' },
          };
          const requestConfig = {
            headers: {
              Authorization: `Bearer ${this.openRouterKey}`,
              'Content-Type': 'application/json',
              ...((process.env.APP_PUBLIC_URL || process.env.FRONTEND_PUBLIC_URL || '').trim()
                ? { 'HTTP-Referer': (process.env.APP_PUBLIC_URL || process.env.FRONTEND_PUBLIC_URL || '').trim() }
                : {}),
              'X-Title': 'travel-itinerary-planner',
            },
            timeout: Math.max(API_CONFIG.DEFAULTS.REQUEST_TIMEOUT, 75000),
          };

          let response;
          try {
            response = await axios.post(
              `${this.openRouterBaseUrl}/chat/completions`,
              requestBody,
              requestConfig
            );
          } catch (strictError) {
            // Attempt 2: fallback without response_format for providers rejecting json_object
            response = await axios.post(
              `${this.openRouterBaseUrl}/chat/completions`,
              {
                ...requestBody,
                response_format: undefined,
              },
              requestConfig
            );
          }

          const content = response.data?.choices?.[0]?.message?.content || '';
          const parsed = this.normalizeItineraryFromAnyResponse(content, params);
          if (parsed) {
            parsed.meta = {
              provider: 'openrouter',
              model: this.openRouterModel,
              usage: response.data?.usage || null,
            };
            console.log('[ITINERARY][AI] Provider success: openrouter');
            console.log('[ITINERARY][AI] Raw preview:', String(content || '').slice(0, 400));
            console.log(
              '[ITINERARY][AI] Parsed day/activity counts:',
              (parsed.dailyPlan || []).map((d) => `D${d.day}:${(d.activities || []).length}`).join(', ')
            );
            return parsed;
          }
          errors.push('openrouter: response could not be converted into itinerary');
        } catch (error) {
          errors.push(`openrouter: ${this.formatProviderError(error)}`);
        }
      }
    }

    const finalError = new Error(
      `Itinerary generation failed with providers ${providers.join(' -> ')}`
    );
    finalError.providerErrors = errors;
    throw finalError;
  }
  /**
   * Generate itinerary enhancement metadata using Gemini (optional image input)

   * @param {Object} params - Itinerary parameters
   * @returns {Promise<Object|null>} Enhancement data or null
   */
  async generateItineraryEnhancement(params) {
    const prompt = this.buildEnhancementPrompt(params);
    const useVision = Boolean(params?.imageData);
    const providers = this.getProviderSequence();
    const providerOrder = providers;

    for (const provider of providerOrder) {
      if (provider === 'groq' && this.hasGroqAccess) {
        try {
          const content = await this.callGroqChat({
            prompt,
            maxTokens: 1400,
            responseFormat: 'json_object',
          });
          const jsonBlock = this.extractJsonBlock(content);
          if (!jsonBlock) throw new Error('No JSON returned');
          return JSON.parse(jsonBlock);
        } catch (error) {
          console.error('Groq enhancement error:', error.message);
        }
      }

      if (provider === 'gemini' && this.hasGeminiAccess) {
        try {
          const content = await this.callGemini({
            prompt,
            imageData: params?.imageData,
            imageMimeType: params?.imageMimeType,
            model: useVision ? this.geminiVisionModel : this.geminiModel,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
          });

          const jsonBlock = this.extractJsonBlock(content);
          if (!jsonBlock) continue;
          return JSON.parse(jsonBlock);
        } catch (error) {
          console.error('Gemini enhancement error:', error.message);
        }
      }

      if (provider === 'openai' && this.hasOpenAIAccess) {
        try {
          const content = await this.callOpenAIResponse({
            prompt,
            maxOutputTokens: 1400,
            responseFormat: 'json_object',
          });
          const jsonBlock = this.extractJsonBlock(content);
          if (!jsonBlock) continue;
          return JSON.parse(jsonBlock);
        } catch (error) {
          console.error('OpenAI enhancement error:', error.message);
        }
      }

      if (provider === 'openrouter' && this.hasOpenRouterAccess) {
        try {
          const response = await axios.post(
            `${this.openRouterBaseUrl}/chat/completions`,
            {
              model: this.openRouterModel,
              messages: [
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              temperature: 0.4,
              max_tokens: 1400,
              response_format: { type: 'json_object' },
            },
            {
              headers: {
                Authorization: `Bearer ${this.openRouterKey}`,
                'Content-Type': 'application/json',
              },
              timeout: Math.max(API_CONFIG.DEFAULTS.REQUEST_TIMEOUT, 30000),
            }
          );

          const content = response.data?.choices?.[0]?.message?.content || '';
          const jsonBlock = this.extractJsonBlock(content);
          if (!jsonBlock) continue;
          return JSON.parse(jsonBlock);
        } catch (error) {
          console.error('OpenRouter enhancement error:', error.message);
        }
      }
    }

    return null;
  }

  async generateLocationBudgetInsights(params) {
    const prompt = this.buildLocationBudgetPrompt(params);
    const providers = this.getProviderSequence();

    for (const provider of providers) {
      if (provider === 'groq' && this.hasGroqAccess) {
        try {
          const content = await this.callGroqChat({
            prompt,
            temperature: 0.2,
            maxTokens: 900,
            responseFormat: 'json_object',
          });
          const jsonBlock = this.extractJsonBlock(content);
          if (!jsonBlock) continue;
          const parsed = JSON.parse(jsonBlock);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (error) {
          console.error('Groq budget insights error:', error.message);
        }
      }

      if (provider === 'gemini' && this.hasGeminiAccess) {
        try {
          const content = await this.callGemini({
            prompt,
            temperature: 0.2,
            maxOutputTokens: 900,
            responseMimeType: 'application/json',
          });
          const jsonBlock = this.extractJsonBlock(content);
          if (!jsonBlock) continue;
          const parsed = JSON.parse(jsonBlock);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (error) {
          console.error('Gemini budget insights error:', error.message);
        }
      }

      if (provider === 'openai' && this.hasOpenAIAccess) {
        try {
          const content = await this.callOpenAIResponse({
            prompt,
            maxOutputTokens: 900,
            responseFormat: 'json_object',
          });
          const jsonBlock = this.extractJsonBlock(content);
          if (!jsonBlock) continue;
          const parsed = JSON.parse(jsonBlock);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (error) {
          console.error('OpenAI budget insights error:', error.message);
        }
      }

      if (provider === 'openrouter' && this.hasOpenRouterAccess) {
        try {
          const response = await axios.post(
            `${this.openRouterBaseUrl}/chat/completions`,
            {
              model: this.openRouterModel,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.2,
              max_tokens: 900,
              response_format: { type: 'json_object' },
            },
            {
              headers: {
                Authorization: `Bearer ${this.openRouterKey}`,
                'Content-Type': 'application/json',
              },
              timeout: Math.max(API_CONFIG.DEFAULTS.REQUEST_TIMEOUT, 30000),
            }
          );
          const content = response.data?.choices?.[0]?.message?.content || '';
          const jsonBlock = this.extractJsonBlock(content);
          if (!jsonBlock) continue;
          const parsed = JSON.parse(jsonBlock);
          if (parsed && typeof parsed === 'object') return parsed;
        } catch (error) {
          console.error('OpenRouter budget insights error:', error.message);
        }
      }
    }

    return null;
  }

  async generateItineraryNarrative(params) {
    const prompt = this.buildNarrativePrompt(params);
    const providers = this.getProviderSequence();

    for (const provider of providers) {
      if (provider === 'groq' && this.hasGroqAccess) {
        try {
          const content = await this.callGroqChat({
            prompt,
            temperature: 0.45,
            maxTokens: 2200,
            responseFormat: null,
          });
          const jsonBlock = this.extractJsonBlock(content);
          if (jsonBlock) {
            const parsed = JSON.parse(jsonBlock);
            if (parsed && typeof parsed === 'object') return parsed;
          }
          if (content && String(content).trim()) {
            return { raw_text: String(content).trim() };
          }
        } catch (error) {
          console.error('Groq narrative generation error:', error.message);
        }
      }

      if (provider === 'gemini' && this.hasGeminiAccess) {
        try {
          const content = await this.callGemini({
            prompt,
            temperature: 0.45,
            maxOutputTokens: 2200,
            responseMimeType: 'text/plain',
          });
          const jsonBlock = this.extractJsonBlock(content);
          if (jsonBlock) {
            const parsed = JSON.parse(jsonBlock);
            if (parsed && typeof parsed === 'object') return parsed;
          }
          if (content && String(content).trim()) {
            return { raw_text: String(content).trim() };
          }
        } catch (error) {
          console.error('Gemini narrative generation error:', error.message);
        }
      }

      if (provider === 'openrouter' && this.hasOpenRouterAccess) {
        try {
          const response = await axios.post(
            `${this.openRouterBaseUrl}/chat/completions`,
            {
              model: this.openRouterModel,
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.45,
              max_tokens: 2200,
            },
            {
              headers: {
                Authorization: `Bearer ${this.openRouterKey}`,
                'Content-Type': 'application/json',
              },
              timeout: Math.max(API_CONFIG.DEFAULTS.REQUEST_TIMEOUT, 30000),
            }
          );
          const content = response.data?.choices?.[0]?.message?.content || '';
          const jsonBlock = this.extractJsonBlock(content);
          if (jsonBlock) {
            const parsed = JSON.parse(jsonBlock);
            if (parsed && typeof parsed === 'object') return parsed;
          }
          if (content && String(content).trim()) {
            return { raw_text: String(content).trim() };
          }
        } catch (error) {
          console.error('OpenRouter narrative generation error:', error.message);
        }
      }

      if (provider === 'openai' && this.hasOpenAIAccess) {
        try {
          const content = await this.callOpenAIResponse({
            prompt,
            maxOutputTokens: 2200,
            responseFormat: null,
          });
          const jsonBlock = this.extractJsonBlock(content);
          if (jsonBlock) {
            const parsed = JSON.parse(jsonBlock);
            if (parsed && typeof parsed === 'object') return parsed;
          }
          if (content && String(content).trim()) {
            return { raw_text: String(content).trim() };
          }
        } catch (error) {
          console.error('OpenAI narrative generation error:', error.message);
        }
      }
    }

    return this.buildNarrativeFallback(params);
  }

  buildNarrativePrompt(params) {
    const activitiesByDay = (params.activities || []).reduce((acc, activity) => {
      const day = Number(activity?.dayNumber) || 1;
      if (!acc[day]) acc[day] = [];
      acc[day].push(activity);
      return acc;
    }, {});

    const dayBlocks = Object.keys(activitiesByDay)
      .sort((a, b) => Number(a) - Number(b))
      .map((dayKey) => {
        const dayActivities = activitiesByDay[dayKey]
          .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))
          .slice(0, 8)
          .map((item) => `- ${item.startTime || 'TBD'} ${item.name} (${item.category || 'activity'})`)
          .join('\n');
        return `Day ${dayKey}:\n${dayActivities}`;
      })
      .join('\n\n');

    return `
You are a professional AI travel planner.

Trip input:
- Destination: ${params.destination}
- Days: ${params.days}
- Budget: INR ${params.budget}
- Travelers: ${params.travelers || 1}
- Travel style: ${params.travelStyle || 'solo'}
- Start date: ${params.startDate || 'N/A'}
- Interests: ${(params.interests || []).join(', ') || 'general'}
- Preferred places: ${(params.placesToVisit || []).join(', ') || 'none'}

Real activities to use:
${dayBlocks}

Rules:
- ONLY include real, well-known tourist places for the given destination.
- DO NOT invent or hallucinate places.
- DO NOT generate fake latitude/longitude.
- If coordinates are not known with confidence, use null.
- Ensure places belong to the destination and day plan is practical.
- Maximum 3-4 activities per day.
- Use morning/afternoon/evening timings.

Output format (STRICT JSON):
{
  "destination": "${params.destination}",
  "itinerary": [
    {
      "day": 1,
      "theme": "",
      "activities": [
        {
          "time": "morning|afternoon|evening",
          "place_name": "",
          "location": "",
          "category": "",
          "description": "",
          "duration": "",
          "travel_note": "",
          "lat": null,
          "lon": null
        }
      ]
    }
  ],
  "summary": {
    "total_days": ${Number(params.days) || 1},
    "pace": "relaxed|moderate|packed",
    "highlights": [],
    "tips": []
  }
}

Return ONLY JSON.
`;
  }

  buildNarrativeFallback(params) {
    const activities = Array.isArray(params.activities) ? params.activities : [];
    const grouped = activities.reduce((acc, item) => {
      const day = Number(item?.dayNumber) || 1;
      if (!acc[day]) acc[day] = [];
      acc[day].push(item);
      return acc;
    }, {});

    const dayText = Object.keys(grouped)
      .sort((a, b) => Number(a) - Number(b))
      .map((dayKey) => {
        const items = grouped[dayKey]
          .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))
          .map((activity) => `- ${activity.startTime || 'TBD'} ${activity.name} (${activity.category || 'activity'})`)
          .join('\n');
        return `### Day ${dayKey}\n${items || '- Explore local attractions and food spots.'}`;
      })
      .join('\n\n');

    const itinerary = Object.keys(grouped)
      .sort((a, b) => Number(a) - Number(b))
      .map((dayKey) => {
        const activitiesForDay = grouped[dayKey]
          .sort((a, b) => String(a.startTime || '').localeCompare(String(b.startTime || '')))
          .slice(0, 4)
          .map((activity) => ({
            time:
              String(activity.timeBlock || '').toLowerCase() === 'lunch'
                ? 'afternoon'
                : (activity.timeBlock || 'morning'),
            place_name: activity.name || '',
            location: activity.location?.city || params.destination || '',
            category: activity.category || 'sightseeing',
            description: activity.description || '',
            duration: String(activity.duration || 90),
            travel_note: activity.notes || '',
            lat: Number.isFinite(Number(activity.location?.coordinates?.[1]))
              ? Number(activity.location.coordinates[1])
              : null,
            lon: Number.isFinite(Number(activity.location?.coordinates?.[0]))
              ? Number(activity.location.coordinates[0])
              : null,
          }));

        return {
          day: Number(dayKey),
          theme: `Day ${dayKey} exploration`,
          activities: activitiesForDay,
        };
      });

    return {
      destination: params.destination || '',
      itinerary,
      summary: {
        total_days: Number(params.days) || itinerary.length || 1,
        pace: 'moderate',
        highlights: itinerary.flatMap((d) => d.activities.map((a) => a.place_name)).slice(0, 8),
        tips: [
          'Visit popular landmarks in the morning for lighter crowds.',
          'Use local taxi or public transport between clustered attractions.',
          'Check weather and opening hours before leaving for each stop.',
        ],
      },
    };
  }

  /**
   * Build enhancement prompt for Gemini
   * @private
   */
  buildEnhancementPrompt(params) {
    const notes = params?.aiNotes ? `Additional notes: ${params.aiNotes}` : '';
    const preferredPlaces = Array.isArray(params?.placesToVisit) && params.placesToVisit.length
      ? `- Preferred places to include: ${params.placesToVisit.join(', ')}`
      : '';
    return `
      You are a travel planning assistant. Create structured metadata for a trip.

      Trip details:
      - Destination: ${params.destination}
      - Days: ${params.days}
      - Budget: INR ${params.budget}
      - Travelers: ${params.travelers || params.numberOfTravelers || 1}
      - Interests: ${(params.interests || []).join(', ')}
      ${preferredPlaces}
      - Travel style: ${params.travelStyle}
      - Start date: ${params.startDate || 'N/A'}
      ${notes}

      If an image is provided, infer landmarks, vibe, and suitable activities.

      Return ONLY valid JSON with this exact structure:
      {
        "summary": "1-2 sentence overview",
        "highlights": ["3-6 key highlights"],
        "tags": ["theme tags"],
        "dailyThemes": [
          { "day": 1, "theme": "Theme", "focus": "Focus area", "tip": "Actionable tip" }
        ],
        "packingTips": ["tips"],
        "localTips": ["local etiquette or safety tips"],
        "budgetSplit": { "accommodation": 35, "transportation": 15, "activities": 25, "food": 20, "misc": 5 },
        "difficulty": "easy|moderate|hard",
        "season": "spring|summer|fall|winter"
      }

      Rules:
      - dailyThemes length must equal the number of days.
      - budgetSplit values are percentages and must sum to 100.
      - Use only the allowed values for difficulty and season.
    `;
  }

  buildLocationBudgetPrompt(params) {
    return `
You are a travel budgeting expert. Estimate realistic location-based trip budget.

Trip details:
- Destination: ${params.destination}
- Days: ${params.days}
- Travelers: ${params.travelers || 1}
- Travel style: ${params.travelStyle || 'solo'}
- Currency: INR
- User entered budget: INR ${params.budget}
- Interests: ${(params.interests || []).join(', ') || 'general'}

Return ONLY valid JSON:
{
  "minimumRecommended": 0,
  "comfortableEstimate": 0,
  "premiumEstimate": 0,
  "suggestedDailyBudget": 0,
  "adjustedBudget": 0,
  "budgetStatus": "below-minimum|within-range|above-premium",
  "adjustmentApplied": true,
  "adjustmentMessage": "",
  "destinationCostLevel": "low|medium|high|very-high",
  "destinationType": "domestic-city|international-city|island|mountain|metro-city|heritage-city"
}

Rules:
- Numbers only, no currency symbols.
- adjustedBudget should be realistic and not less than minimumRecommended.
- If input budget is too low, set adjustmentApplied true and explain why.
- Keep budgetStatus aligned with estimates.
`;
  }

  /**
   * Build itinerary generation prompt
   * @private
   */
  buildItineraryPrompt(params) {
    const days = Number(params.days) || 3;
    const destination = params.destination || 'the destination';
    const startDate = params.startDate || 'N/A';
    const preferredPlaces = Array.isArray(params.placesToVisit) && params.placesToVisit.length
      ? params.placesToVisit.join(', ')
      : 'not specified';
    const notes = params.aiNotes ? String(params.aiNotes) : 'none';
    const travelers = Number(params.travelers || 1);
    return `
You are a travel planner.

Create a ${days}-day itinerary for ${destination}.

Inputs:
Budget: INR ${params.budget || 'N/A'}
Travelers: ${travelers}
Style: ${params.travelStyle || 'general'}
Start Date: ${startDate}
Preferences: ${notes || 'general'}
Preferred places: ${preferredPlaces}

Rules:
- Use only real and popular tourist places
- Keep route logical (nearby places together)
- Adjust plan based on budget (low/medium/high)
- No random or irrelevant places
- Include realistic arrival_time for each place
- Include how_to_reach from previous place
- Include travel_time_from_previous in text like "15 minutes"

IMPORTANT:
For each place include approximate latitude and longitude so it can be shown on OpenStreetMap.

Return ONLY valid JSON:
{
  "destination": "${destination}",
  "summary": "",
  "days": [
    {
      "day": 1,
      "activities": {
        "morning": [
          {
            "time": "",
            "arrival_time": "",
            "place": "",
            "desc": "",
            "cost": "",
            "how_to_reach": "",
            "travel_time_from_previous": "",
            "lat": 0,
            "lng": 0
          }
        ],
        "afternoon": [],
        "evening": []
      }
    }
  ],
  "tips": []
}
`;
  }

  /**
   * Try to parse itinerary response from AI without fallback
   * @private
   */
  tryParseItineraryResponse(content) {
    try {
      if (!content || typeof content !== 'string') return null;
      const jsonBlock = this.extractJsonBlock(content);
      if (!jsonBlock) return null;
      const parsed = JSON.parse(jsonBlock);
      let dailyPlan = Array.isArray(parsed?.dailyPlan)
        ? parsed.dailyPlan
        : (Array.isArray(parsed?.itinerary) ? parsed.itinerary : null);
      if (!dailyPlan && Array.isArray(parsed?.days)) {
        dailyPlan = parsed.days.map((dayObj, idx) => {
          const day = Number(dayObj?.day) || idx + 1;
          const buckets = dayObj?.activities || {};
          const slotOrder = ['morning', 'afternoon', 'evening'];
          const activities = slotOrder.flatMap((slot) => {
            const entries = Array.isArray(buckets?.[slot]) ? buckets[slot] : [];
            return entries.map((entry) => ({
              timeSlot: slot,
              time: String(entry?.time || '').trim() || (slot === 'morning' ? '09:00' : slot === 'afternoon' ? '13:00' : '18:00'),
              placeName: String(entry?.place || entry?.name || '').trim(),
              category: 'sightseeing',
              description: String(entry?.desc || '').trim(),
              durationMinutes: 90,
              estimatedCost: Number(String(entry?.cost || '0').replace(/[^\d.]/g, '')) || 0,
              location: parsed?.destination || '',
              lat: Number.isFinite(Number(entry?.lat)) ? Number(entry.lat) : null,
              lng: Number.isFinite(Number(entry?.lng)) ? Number(entry.lng) : null,
              arrivalTime: String(entry?.arrival_time || '').trim(),
              howToReach: String(entry?.how_to_reach || '').trim(),
              travelTimeFromPrevious: String(entry?.travel_time_from_previous || '').trim(),
            }));
          });
          return { day, theme: `Day ${day}`, activities };
        });
      }
      if (!dailyPlan) return null;
      return {
        summary: String(parsed.summary || '').trim(),
        travelTips: Array.isArray(parsed.travelTips)
          ? parsed.travelTips
          : (Array.isArray(parsed.tips) ? parsed.tips : []),
        dailyPlan,
        rawText: String(content || '').trim(),
      };
    } catch {
      return null;
    }
  }

  normalizeItineraryFromAnyResponse(content, params = {}) {
    const parsedJson = this.tryParseItineraryResponse(content);
    if (parsedJson) return parsedJson;

    const raw = String(content || '').trim();
    if (!raw) return null;

    const dayCount = Math.max(1, Number(params.days) || 1);
    const lines = raw
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    const tipParts = [];
    for (const line of lines) {
      const numberedSplit = line
        .split(/\b\d+\.\s*/)
        .map((part) => part.trim())
        .filter(Boolean);
      if (numberedSplit.length > 1) {
        numberedSplit.slice(1).forEach((t) => {
          if (t.length > 12) tipParts.push(t.replace(/[;,\s]+$/, ''));
        });
        continue;
      }
      if (/tip|note|remember|avoid|carry/i.test(line)) {
        const t = line.replace(/^[-*]\s*/, '').trim();
        if (t.length > 12) tipParts.push(t);
      }
    }
    const travelTips = tipParts.slice(0, 4);

    const dailyPlan = Array.from({ length: dayCount }, (_, i) => ({
      day: i + 1,
      theme: `Day ${i + 1} plan`,
      activities: [],
    }));

    let currentDay = 1;
    let currentSlot = null;
    let lastCost = null;

    const extractCost = (text) => {
      const costMatch = String(text || '').match(/INR\s*([\d,]+)(?:\s*-\s*([\d,]+))?/i);
      if (!costMatch) return null;
      const low = Number(String(costMatch[1] || '').replace(/,/g, ''));
      const high = Number(String(costMatch[2] || '').replace(/,/g, ''));
      if (Number.isFinite(low) && Number.isFinite(high) && high > 0) {
        return Math.round((low + high) / 2);
      }
      return Number.isFinite(low) ? low : null;
    };

    const normalizePlace = (name) =>
      String(name || '')
        .replace(/[*#`_]/g, '')
        .replace(/^(Activity|Place|Reason)\s*:\s*/i, '')
        .replace(/^visit\s+/i, '')
        .replace(/\s+/g, ' ')
        .trim();

    const addActivity = (name, descriptionText) => {
      const placeName = normalizePlace(name);
      if (!placeName || placeName.length < 3) return;
      if (/^(and|visit|activity|place)$/i.test(placeName)) return;
      if (/estimated cost|cost|reason/i.test(placeName)) return;
      const slot = currentSlot || 'morning';
      dailyPlan[currentDay - 1].activities.push({
        timeSlot: slot,
        time: slot === 'morning' ? '09:00' : slot === 'afternoon' ? '13:00' : '17:00',
        placeName: placeName.slice(0, 90),
        category:
          /museum|temple|fort|palace|church|gallery|monument/i.test(placeName)
            ? 'culture'
            : /cafe|lunch|dinner|food|restaurant/i.test(placeName)
              ? 'food'
              : /park|beach|walk|sunset|cruise/i.test(placeName)
                ? 'relaxation'
                : 'sightseeing',
        description: String(descriptionText || placeName).slice(0, 220),
        durationMinutes: slot === 'evening' ? 90 : 120,
        estimatedCost: Number.isFinite(lastCost) ? lastCost : (slot === 'afternoon' ? 900 : 1200),
        location: params.destination || '',
      });
    };

    for (const line of lines) {
      const dayMatch = line.match(/^day\s*(\d+)/i);
      if (dayMatch) {
        currentDay = Math.max(1, Math.min(dayCount, Number(dayMatch[1]) || 1));
        continue;
      }

      // Parse strict text format:
      // Morning (09:00) - Rijksmuseum - reason - INR 1200
      const dashFormat = line.match(
        /^(Morning|Afternoon|Evening|Night)\s*\(([^)]+)\)\s*-\s*([^-\n]+?)\s*-\s*([^-\n]+?)\s*-\s*(.+)$/i
      );
      if (dashFormat) {
        const slotLabel = dashFormat[1];
        const timeLabel = String(dashFormat[2] || '').trim();
        const place = String(dashFormat[3] || '').trim();
        const reason = String(dashFormat[4] || '').trim();
        const costText = String(dashFormat[5] || '').trim();

        currentSlot = /afternoon/i.test(slotLabel)
          ? 'afternoon'
          : /evening|night/i.test(slotLabel)
            ? 'evening'
            : 'morning';

        const parsedCost = extractCost(costText);
        if (Number.isFinite(parsedCost)) lastCost = parsedCost;

        dailyPlan[currentDay - 1].activities.push({
          timeSlot: currentSlot,
          time: /^\d{1,2}:\d{2}/.test(timeLabel)
            ? String(timeLabel).padStart(5, '0')
            : (currentSlot === 'morning' ? '09:00' : currentSlot === 'afternoon' ? '13:00' : '17:00'),
          placeName: normalizePlace(place).slice(0, 90),
          category:
            /museum|temple|fort|palace|church|gallery|monument/i.test(place)
              ? 'culture'
              : /cafe|lunch|dinner|food|restaurant/i.test(place)
                ? 'food'
                : /park|beach|walk|sunset|cruise/i.test(place)
                  ? 'relaxation'
                  : 'sightseeing',
          description: `${reason}${costText ? ` | ${costText}` : ''}`.slice(0, 220),
          durationMinutes: currentSlot === 'evening' ? 90 : 120,
          estimatedCost: Number.isFinite(lastCost) ? lastCost : (currentSlot === 'afternoon' ? 900 : 1200),
          location: params.destination || '',
        });
        continue;
      }

      // Parse format:
      // Morning (08:00-09:00):Mahalakshmi Temple - reason - cost/notes
      const colonFormat = line.match(
        /^(Morning|Afternoon|Evening|Night)\s*\(([^)]+)\)\s*:\s*([^-\n;]+?)\s*-\s*(.+)$/i
      );
      if (colonFormat) {
        const slotLabel = colonFormat[1];
        const timeRange = String(colonFormat[2] || '').trim();
        const place = String(colonFormat[3] || '').trim();
        const reasonAndCost = String(colonFormat[4] || '').trim();

        currentSlot = /afternoon/i.test(slotLabel)
          ? 'afternoon'
          : /evening|night/i.test(slotLabel)
            ? 'evening'
            : 'morning';

        const timeStartMatch = timeRange.match(/(\d{1,2}:\d{2})/);
        const parsedCost = extractCost(reasonAndCost);
        if (Number.isFinite(parsedCost)) lastCost = parsedCost;

        dailyPlan[currentDay - 1].activities.push({
          timeSlot: currentSlot,
          time: timeStartMatch
            ? String(timeStartMatch[1]).padStart(5, '0')
            : (currentSlot === 'morning' ? '09:00' : currentSlot === 'afternoon' ? '13:00' : '17:00'),
          placeName: normalizePlace(place).slice(0, 90),
          category:
            /museum|temple|fort|palace|church|gallery|monument/i.test(place)
              ? 'culture'
              : /cafe|lunch|dinner|food|restaurant/i.test(place)
                ? 'food'
                : /park|beach|walk|sunset|cruise|lake/i.test(place)
                  ? 'relaxation'
                  : 'sightseeing',
          description: reasonAndCost.slice(0, 220),
          durationMinutes: currentSlot === 'evening' ? 90 : 120,
          estimatedCost: Number.isFinite(lastCost) ? lastCost : (currentSlot === 'afternoon' ? 900 : 1200),
          location: params.destination || '',
        });
        continue;
      }

      if (/morning/i.test(line)) currentSlot = 'morning';
      if (/afternoon/i.test(line)) currentSlot = 'afternoon';
      if (/evening|night/i.test(line)) currentSlot = 'evening';

      const lineCost = extractCost(line);
      if (Number.isFinite(lineCost)) lastCost = lineCost;
      if (/estimated cost|total daily cost|cost breakdown/i.test(line)) continue;

      const activityLabelMatch = line.match(/Activity\s*:\s*(.+)$/i);
      if (activityLabelMatch) {
        const text = activityLabelMatch[1];
        const placeMatches = [...line.matchAll(/\*\*([^*]{3,80})\*\*/g)]
          .map((m) => m[1])
          .filter((token) => !/activity|reason|estimated cost|cost/i.test(String(token)));
        if (placeMatches.length) {
          placeMatches.forEach((place) => addActivity(place, text));
        } else {
          const chunks = text
            .split(/,| and |\\./i)
            .map((s) => s.replace(/^visit\s+/i, '').trim())
            .filter((s) => s && s.length > 3);
          addActivity(chunks[0] || text, text);
        }
        continue;
      }

      const bulletPlaceMatch = line.match(/^\*\s+\*\*Place:\*\*\s*(.+)$/i);
      if (bulletPlaceMatch) {
        addActivity(bulletPlaceMatch[1], line);
        continue;
      }

      const boldPlaceMatches = [...line.matchAll(/\*\*([^*]{3,80})\*\*/g)].map((m) => m[1]);
      if (boldPlaceMatches.length && currentSlot) {
        boldPlaceMatches.forEach((place) => addActivity(place, line));
        continue;
      }

      const slotSentenceMatch = line.match(/^(Morning|Afternoon|Evening|Night)\s*[:\-]\s*(.+)$/i);
      if (slotSentenceMatch) {
        currentSlot = /afternoon/i.test(slotSentenceMatch[1])
          ? 'afternoon'
          : /evening|night/i.test(slotSentenceMatch[1]) ? 'evening' : 'morning';
        addActivity(slotSentenceMatch[2], line);
      }
    }

    for (const day of dailyPlan) {
      const deduped = [];
      const seen = new Set();
      day.activities.forEach((activity) => {
        const key = `${String(activity.placeName || '').toLowerCase()}|${activity.timeSlot}`;
        if (!seen.has(key)) {
          seen.add(key);
          deduped.push(activity);
        }
      });
      day.activities = deduped;
      day.activities = deduped
        .sort((a, b) => String(a.time).localeCompare(String(b.time)))
        .slice(0, 8);
    }

    return {
      summary: raw.slice(0, 500),
      travelTips,
      dailyPlan,
      rawText: raw,
    };
  }
  /**
   * Parse itinerary response from AI

   * @private
   */
  parseItineraryResponse(content, days) {
    try {
      const jsonBlock = this.extractJsonBlock(content);
      if (!jsonBlock) throw new Error('No JSON found');

      const parsed = JSON.parse(jsonBlock);
      return parsed.itinerary || this.generateDefaultItinerary({ days });
    } catch {
      return this.generateDefaultItinerary({ days });
    }
  }

  /**
   * Generate default itinerary when AI fails
   * @private
   */
  generateDefaultItinerary(params) {
    const { destination, days, budget, interests } = params;
    const dailyPlan = [];

    for (let i = 1; i <= days; i++) {
      dailyPlan.push({
        day: i,
        theme: `Day ${i} - ${destination} Exploration`,
        activities: [
          {
            timeSlot: 'morning',
            time: '09:00',
            placeName: 'Local breakfast',
            category: 'food',
            durationMinutes: 60,
            estimatedCost: 300,
            description: 'Start your day with local cuisine',
            location: destination,
          },
          {
            timeSlot: 'morning',
            time: '10:30',
            placeName: 'Main attraction',
            category: 'sightseeing',
            durationMinutes: 120,
            estimatedCost: 600,
            description: 'Visit major landmarks and attractions',
            location: destination,
          },
          {
            timeSlot: 'afternoon',
            time: '13:00',
            placeName: 'Lunch',
            category: 'food',
            durationMinutes: 60,
            estimatedCost: 500,
            description: 'Try local restaurants',
            location: destination,
          },
          {
            timeSlot: 'afternoon',
            time: '14:30',
            placeName: 'Secondary attraction',
            category: 'sightseeing',
            durationMinutes: 120,
            estimatedCost: 400,
            description: 'Explore cultural sites or nature',
            location: destination,
          },
          {
            timeSlot: 'evening',
            time: '17:00',
            placeName: 'Dinner & relaxation',
            category: 'food',
            durationMinutes: 90,
            estimatedCost: 700,
            description: 'Evening dining experience',
            location: destination,
          },
        ],
      });
    }

    return {
      summary: `AI-generated itinerary for ${destination}`,
      travelTips: [
        'Start early to maximize daylight.',
        'Book popular attractions in advance.',
      ],
      dailyPlan,
    };
  }
}

module.exports = AIService;

