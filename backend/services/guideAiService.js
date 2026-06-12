const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');

const GUIDE_SYSTEM_PROMPT = [
  'You are a friendly and knowledgeable local tourist guide.',
  'Answer clearly, conversationally, and helpfully.',
  'Include weather, places to visit, local culture, and useful travel tips.',
  'Keep answers engaging and easy to understand.',
  'Be specific to the location asked by the user and avoid generic filler.',
  'If the user asks follow-up questions, use chat context naturally.',
  'Use concise sections with practical details and complete every section cleanly.',
  'Keep answers compact enough to avoid cut-off responses.',
  'Do not output raw markdown syntax like #, **, or pipe-table characters.',
  'Prefer clean plain headings, short bullet points, and easy-to-read travel guidance.',
].join(' ');

const MAX_CONTEXT_MESSAGES = 10;
const DEFAULT_TEMPERATURE = 0.5;
const DEFAULT_MAX_TOKENS = 1200;
const PROVIDER_PRIORITY = ['openai', 'openrouter', 'groq'];
const MAX_CONTINUATION_CALLS = 2;
const CONTINUATION_PROMPT =
  'Continue exactly from where you stopped. Do not repeat earlier text. If this is a provider handoff, continue naturally from the partial assistant text. Finish all remaining sections in concise complete sentences.';

const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const parseProviderSequence = () => {
  const rawSequence = normalizeText(API_CONFIG.GUIDE_AI?.PROVIDER_SEQUENCE).toLowerCase();
  const configuredDefault = normalizeText(API_CONFIG.GUIDE_AI?.PROVIDER).toLowerCase();
  const allowedProviders = new Set(PROVIDER_PRIORITY);

  const configuredOrder = rawSequence
    ? rawSequence
        .split(',')
        .map((item) => normalizeText(item).toLowerCase())
        .filter(Boolean)
    : [];

  const dedupedOrderedProviders = (configuredOrder.length ? configuredOrder : PROVIDER_PRIORITY).filter(
    (providerName, index, list) =>
      allowedProviders.has(providerName) && list.indexOf(providerName) === index
  );

  if (configuredDefault && allowedProviders.has(configuredDefault)) {
    return [
      configuredDefault,
      ...dedupedOrderedProviders.filter((providerName) => providerName !== configuredDefault),
    ];
  }

  return dedupedOrderedProviders.length ? dedupedOrderedProviders : [...PROVIDER_PRIORITY];
};

const OPENROUTER_REFERER = (process.env.APP_PUBLIC_URL || process.env.FRONTEND_PUBLIC_URL || '').trim();

const sanitizeHistory = (history) => {
  if (!Array.isArray(history)) return [];
  return history
    .filter((item) => item && (item.role === 'user' || item.role === 'assistant'))
    .map((item) => ({
      role: item.role,
      content: normalizeText(item.content || item.text || ''),
    }))
    .filter((item) => item.content)
    .slice(-MAX_CONTEXT_MESSAGES);
};

const buildMessages = ({ query, history }) => {
  const safeQuery = normalizeText(query);
  return [
    { role: 'system', content: GUIDE_SYSTEM_PROMPT },
    ...sanitizeHistory(history),
    { role: 'user', content: safeQuery },
  ];
};

const buildContinuationMessages = ({ baseMessages, partialAnswer }) => [
  ...baseMessages,
  { role: 'assistant', content: String(partialAnswer || '').slice(-12000) },
  { role: 'user', content: CONTINUATION_PROMPT },
];

const readStreamToString = (stream) =>
  new Promise((resolve, reject) => {
    let output = '';
    stream.on('data', (chunk) => {
      output += chunk.toString('utf8');
    });
    stream.on('end', () => resolve(output));
    stream.on('error', reject);
  });

const parseProviderSse = ({ stream, onToken, signal }) =>
  new Promise((resolve, reject) => {
    let buffer = '';
    let finished = false;
    let finishReason = '';

    const cleanup = () => {
      stream.removeAllListeners('data');
      stream.removeAllListeners('end');
      stream.removeAllListeners('error');
    };

    const handleLine = (rawLine) => {
      const line = rawLine.trim();
      if (!line || line.startsWith(':')) return;
      if (!line.startsWith('data:')) return;
      const payload = line.slice(5).trim();
      if (!payload) return;

      if (payload === '[DONE]') {
        finished = true;
        cleanup();
        resolve({ finishReason });
        return;
      }

      try {
        const parsed = JSON.parse(payload);
        const choice = parsed?.choices?.[0] || {};
        if (choice?.finish_reason) {
          finishReason = String(choice.finish_reason).toLowerCase();
        } else if (choice?.native_finish_reason) {
          finishReason = String(choice.native_finish_reason).toLowerCase();
        }
        const delta = choice?.delta;
        const token = delta?.content || choice?.message?.content || '';
        if (token) onToken(token);
      } catch (err) {
        // Ignore invalid partial chunks and continue.
      }
    };

    const flushBuffer = () => {
      let newlineIndex = buffer.indexOf('\n');
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        handleLine(line);
        if (finished) return;
        newlineIndex = buffer.indexOf('\n');
      }
    };

    stream.on('data', (chunk) => {
      if (signal?.aborted || finished) return;
      buffer += chunk.toString('utf8').replace(/\r/g, '');
      flushBuffer();
    });

    stream.on('end', () => {
      if (signal?.aborted || finished) {
        cleanup();
        return resolve();
      }
      if (buffer.trim()) {
        handleLine(buffer);
      }
      cleanup();
      resolve({ finishReason });
    });

    stream.on('error', (error) => {
      cleanup();
      reject(error);
    });
  });

const buildProviderCandidates = () => {
  const orderedProviders = parseProviderSequence();

  const candidates = [];

  orderedProviders.forEach((providerName) => {
    if (providerName === 'openai' && API_CONFIG.OPENAI?.API_KEY) {
      candidates.push({
        provider: 'openai',
        apiKey: API_CONFIG.OPENAI.API_KEY,
        url: `${API_CONFIG.OPENAI.BASE_URL}/chat/completions`,
        model: API_CONFIG.GUIDE_AI?.OPENAI_MODEL || API_CONFIG.OPENAI.MODEL,
        headers: {},
      });
      return;
    }

    if (providerName === 'groq' && API_CONFIG.GROQ?.API_KEY) {
      candidates.push({
        provider: 'groq',
        apiKey: API_CONFIG.GROQ.API_KEY,
        url: `${API_CONFIG.GROQ.BASE_URL}/chat/completions`,
        model: API_CONFIG.GUIDE_AI?.GROQ_MODEL || API_CONFIG.GROQ.MODEL,
        headers: {},
      });
      return;
    }

    if (providerName === 'openrouter' && API_CONFIG.OPENROUTER?.API_KEY) {
      candidates.push({
        provider: 'openrouter',
        apiKey: API_CONFIG.OPENROUTER.API_KEY,
        url: `${API_CONFIG.OPENROUTER.BASE_URL}/chat/completions`,
        model: API_CONFIG.GUIDE_AI?.OPENROUTER_MODEL || API_CONFIG.OPENROUTER.MODEL,
        headers: {
          ...(OPENROUTER_REFERER ? { 'HTTP-Referer': OPENROUTER_REFERER } : {}),
          'X-Title': process.env.APP_NAME || 'Travel Virtual Guide',
        },
      });
    }
  });

  if (!candidates.length) {
    throw new Error('No AI provider is configured for Virtual Guide.');
  }

  return candidates;
};

const callProviderStream = async ({ candidate, messages, signal, onToken }) => {
  const payload = {
    model: candidate.model,
    messages,
    stream: true,
    temperature: DEFAULT_TEMPERATURE,
    ...(candidate.provider === 'openai'
      ? { max_completion_tokens: DEFAULT_MAX_TOKENS }
      : { max_tokens: DEFAULT_MAX_TOKENS }),
  };

  const response = await axios.post(
    candidate.url,
    payload,
    {
      headers: {
        Authorization: `Bearer ${candidate.apiKey}`,
        'Content-Type': 'application/json',
        ...candidate.headers,
      },
      responseType: 'stream',
      timeout: API_CONFIG.GUIDE_AI?.STREAM_TIMEOUT_MS || 45000,
      signal,
      validateStatus: () => true,
    }
  );

  if (response.status < 200 || response.status >= 300) {
    const details = await readStreamToString(response.data).catch(() => '');
    const shortDetails = details ? ` ${details.slice(0, 220)}` : '';
    throw new Error(`Provider request failed (${response.status}).${shortDetails}`);
  }

  return parseProviderSse({ stream: response.data, onToken, signal });
};

const streamGuideReply = async ({ query, history, signal, onToken }) => {
  const safeQuery = normalizeText(query);
  if (!safeQuery) {
    throw new Error('Query is required.');
  }
  if (typeof onToken !== 'function') {
    throw new Error('Streaming callback is required.');
  }

  const messages = buildMessages({ query: safeQuery, history });
  const candidates = buildProviderCandidates();
  const errors = [];
  let fullAnswer = '';
  let anyTokenEmitted = false;
  let totalContinuationCount = 0;

  for (const candidate of candidates) {
    let finishReason = '';
    let emittedByCurrentProvider = false;

    try {
      const emitToken = (token) => {
        if (!token) return;
        emittedByCurrentProvider = true;
        anyTokenEmitted = true;
        fullAnswer += token;
        onToken(token);
      };

      const attemptMessages = fullAnswer
        ? buildContinuationMessages({ baseMessages: messages, partialAnswer: fullAnswer })
        : messages;

      const firstPass = await callProviderStream({
        candidate,
        messages: attemptMessages,
        signal,
        onToken: emitToken,
      });
      finishReason = (firstPass?.finishReason || '').toLowerCase();

      while (
        finishReason === 'length' &&
        totalContinuationCount < MAX_CONTINUATION_CALLS &&
        !signal?.aborted
      ) {
        totalContinuationCount += 1;
        const continuationMessages = buildContinuationMessages({
          baseMessages: messages,
          partialAnswer: fullAnswer,
        });

        const continuationPass = await callProviderStream({
          candidate,
          messages: continuationMessages,
          signal,
          onToken: emitToken,
        });
        finishReason = (continuationPass?.finishReason || '').toLowerCase();
      }

      return {
        provider: candidate.provider,
        model: candidate.model,
        finishReason: finishReason || 'stop',
        continuationCount: totalContinuationCount,
      };
    } catch (error) {
      errors.push(`[${candidate.provider}] ${error.message}`);
      if (signal?.aborted) {
        throw error;
      }
      // Continue to next provider even after partial streaming from current provider.
      if (emittedByCurrentProvider) {
        continue;
      }
    }
  }

  if (anyTokenEmitted) {
    return {
      provider: 'fallback',
      model: 'multi-provider',
      finishReason: 'partial',
      continuationCount: totalContinuationCount,
    };
  }

  throw new Error(errors.join(' | ') || 'No AI provider could complete the request.');
};

module.exports = {
  streamGuideReply,
  sanitizeHistory,
};
