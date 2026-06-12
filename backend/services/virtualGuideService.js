const axios = require('axios');
const API_CONFIG = require('../config/apiConfig');

const SYSTEM_PROMPT = `You are a premium virtual travel guide for India.
Answer the tourist's question clearly and concisely.
Use short sections or bullets when helpful.
If a detail is time-sensitive (prices, timings, closures), give a safe range and suggest verifying locally.
If PDFs are mentioned but you only have file names, ask the user to paste key text for accuracy.`;

const extractOpenAIOutputText = (responseData) => {
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
};

const parseModelSpec = (model) => {
  if (!model || typeof model !== 'string') {
    return { raw: '', provider: null, name: '' };
  }
  const raw = model.trim();
  if (!raw) return { raw: '', provider: null, name: '' };
  const parts = raw.split('/');
  if (parts.length === 1) {
    return { raw, provider: null, name: raw };
  }
  const provider = parts.shift();
  const name = parts.join('/');
  return { raw, provider, name };
};

const buildPrompt = ({ question, destination, attachments }) => {
  const lines = [];
  if (destination) {
    lines.push(`Destination: ${destination}`);
  }
  if (Array.isArray(attachments) && attachments.length > 0) {
    const names = attachments.map((file) => file?.name).filter(Boolean);
    if (names.length) {
      lines.push(`Reference PDFs (names only): ${names.join(', ')}`);
    }
  }
  lines.push(`Question: ${question}`);
  return lines.join('\n');
};

const OFFLINE_DESTINATIONS = {
  Goa: {
    summary: 'Beach towns, Portuguese heritage, and easygoing nightlife.',
    bestTime: 'November to February for cooler evenings and clear skies.',
    highlights: ['Candolim beach sunset', 'Old Goa churches', 'Assagao cafes'],
    stayAreas: 'North Goa for energy, South Goa for quieter stays.',
    tips: ['Pre-book scooters in peak season.', 'Carry cash for beach shacks.'],
    food: ['fish thali', 'prawn curry', 'bebinca', 'cafes in Assagao'],
  },
  Jaipur: {
    summary: 'Royal forts, pink city markets, and heritage hotels.',
    bestTime: 'October to March for comfortable sightseeing.',
    highlights: ['Amber Fort', 'Hawa Mahal sunrise', 'City Palace'],
    stayAreas: 'C Scheme for hotels, old city for close access.',
    tips: ['Start early to avoid crowds.', 'Plan one market evening.'],
    food: ['dal baati churma', 'laal maas', 'kathi rolls', 'lassi'],
  },
  Kerala: {
    summary: 'Backwaters, spice plantations, and wellness retreats.',
    bestTime: 'October to March for drier weather.',
    highlights: ['Alleppey houseboat', 'Munnar tea estates', 'Kochi heritage walk'],
    stayAreas: 'Kochi for culture, Alleppey for backwaters, Munnar for hills.',
    tips: ['Book houseboats one day ahead.', 'Pack light rain layers.'],
    food: ['appam with stew', 'karimeen pollichathu', 'sadhya'],
  },
  Leh: {
    summary: 'High-altitude passes, monasteries, and dramatic landscapes.',
    bestTime: 'June to September for open roads.',
    highlights: ['Khardung La', 'Pangong Lake', 'Thiksey Monastery'],
    stayAreas: 'Leh town for convenience, Nubra for desert views.',
    tips: ['Take a rest day to acclimatize.', 'Carry layers for night chill.'],
    food: ['thukpa', 'momos', 'skyu'],
  },
  Varanasi: {
    summary: 'Sacred ghats, morning rituals, and timeless lanes.',
    bestTime: 'October to March for mild mornings.',
    highlights: ['Sunrise boat ride', 'Dashashwamedh aarti', 'Sarnath day trip'],
    stayAreas: 'Near the ghats for walking access.',
    tips: ['Morning boats need early booking.', 'Keep valuables secure in crowds.'],
    food: ['kashi chaat', 'malaiyo', 'banarasi lassi'],
  },
  Rishikesh: {
    summary: 'Yoga retreats, river rafting, and mountain air.',
    bestTime: 'September to November or February to April.',
    highlights: ['Laxman Jhula area', 'Ganga aarti', 'Rafting stretches'],
    stayAreas: 'Tapovan for cafes, near Ram Jhula for calm stays.',
    tips: ['Check rafting seasons in advance.', 'Avoid late-night riverside walks.'],
    food: ['satvik thali', 'chai by the ghat'],
  },
  Udaipur: {
    summary: 'Lakeside palaces, romantic sunsets, and artsy bazaars.',
    bestTime: 'October to March for mild evenings.',
    highlights: ['City Palace', 'Lake Pichola boat ride', 'Bagore Ki Haveli'],
    stayAreas: 'Lakeside for views, old city for markets.',
    tips: ['Book lake cruises before sunset.', 'Carry light layers at night.'],
    food: ['gatte ki sabzi', 'dal baati', 'kesar lassi'],
  },
  Delhi: {
    summary: 'Historic monuments, layered neighborhoods, and modern dining.',
    bestTime: 'October to March for pleasant days.',
    highlights: ['Red Fort', 'Humayun’s Tomb', 'India Gate evening walk'],
    stayAreas: 'Central Delhi for monuments, South Delhi for cafes.',
    tips: ['Use metro to skip traffic.', 'Start early for heritage spots.'],
    food: ['chole bhature', 'paratha', 'kebabs'],
  },
  Mumbai: {
    summary: 'Coastal skyline, colonial architecture, and vibrant street food.',
    bestTime: 'November to February for cooler days.',
    highlights: ['Marine Drive', 'Gateway of India', 'Colaba causeway'],
    stayAreas: 'South Mumbai for sights, Bandra for cafes.',
    tips: ['Plan around traffic peaks.', 'Carry light rain gear in monsoon.'],
    food: ['vada pav', 'pav bhaji', 'Irani cafe snacks'],
  },
  Hampi: {
    summary: 'Ancient ruins, boulder landscapes, and sunset viewpoints.',
    bestTime: 'October to February for cool mornings.',
    highlights: ['Virupaksha Temple', 'Vijaya Vittala Temple', 'Hemakuta Hill sunset'],
    stayAreas: 'Hampi Bazaar for walkability, Anegundi for quiet stays.',
    tips: ['Rent a bicycle for ruins.', 'Carry water for midday heat.'],
    food: ['South Indian thali', 'banana pancakes'],
  },
  Andaman: {
    summary: 'Turquoise beaches, snorkeling, and quiet island life.',
    bestTime: 'November to April for calm seas.',
    highlights: ['Radhanagar Beach', 'Havelock snorkeling', 'Cellular Jail light show'],
    stayAreas: 'Havelock for beaches, Port Blair for access.',
    tips: ['Book ferries in advance.', 'Carry reef-safe sunscreen.'],
    food: ['seafood curry', 'grilled fish'],
  },
  Darjeeling: {
    summary: 'Tea gardens, Himalayan views, and colonial-era charm.',
    bestTime: 'October to December or March to May.',
    highlights: ['Tiger Hill sunrise', 'Tea estate visits', 'Batasia Loop'],
    stayAreas: 'Mall Road for views, tucked-away tea estates for calm.',
    tips: ['Carry layers for cold mornings.', 'Book sunrise rides early.'],
    food: ['momos', 'thukpa', 'Darjeeling tea'],
  },
};

const normalizeDestinationKey = (destination) => {
  const raw = (destination || '').trim();
  if (!raw) return '';
  const match = Object.keys(OFFLINE_DESTINATIONS).find(
    (key) => key.toLowerCase() === raw.toLowerCase()
  );
  return match || raw;
};

const buildOfflineAnswer = ({ question, destination }) => {
  const safeDestination = normalizeDestinationKey(destination) || 'your destination';
  const profile = OFFLINE_DESTINATIONS[safeDestination] || {
    summary: `${safeDestination} is a strong choice for a balanced mix of culture, scenery, and local experiences.`,
    bestTime: 'Look for shoulder seasons to avoid crowds and get better rates.',
    highlights: ['Signature viewpoint', 'Local market visit', 'Day trip to nearby town'],
    stayAreas: 'Stay near the center for convenience and easy transit.',
    tips: ['Book key tickets ahead.', 'Plan one slow morning to reset.'],
    food: ['local thali', 'seasonal street food'],
  };

  const lower = (question || '').toLowerCase();
  const wantsStay = /stay|hotel|accommodation|where should i stay/.test(lower);
  const wantsFood = /food|dining|restaurant|eat|cuisine/.test(lower);
  const wantsBudget = /budget|cost|price|expensive|cheap/.test(lower);

  const sections = [];
  sections.push(`Overview: ${profile.summary}`);
  sections.push(`Where to stay: ${profile.stayAreas}`);

  if (wantsFood) {
    sections.push(`Local flavors: ${profile.food.join(', ')}.`);
  }

  if (wantsBudget) {
    sections.push('Budget guide: budget stays ₹1500–3500/night, mid-range ₹3500–8000/night, meals ₹200–600.');
  }

  sections.push(`Best time: ${profile.bestTime}`);
  sections.push(`Top experiences: ${profile.highlights.join(', ')}.`);
  sections.push(`Local tips: ${profile.tips.join(' ')}`);
  sections.push('Preview answer shown because a live model is not connected yet.');

  return sections.join('\n\n');
};

const callOpenRouter = async ({ prompt, model }) => {
  if (!API_CONFIG.OPENROUTER.API_KEY) {
    throw new Error('OpenRouter API key is missing');
  }

  const response = await axios.post(
    `${API_CONFIG.OPENROUTER.BASE_URL}/chat/completions`,
    {
      model: model || API_CONFIG.OPENROUTER.MODEL,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 900,
    },
    {
      headers: {
        Authorization: `Bearer ${API_CONFIG.OPENROUTER.API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
    }
  );

  return response.data?.choices?.[0]?.message?.content?.trim() || '';
};

const callOpenAI = async ({ prompt, model }) => {
  if (!API_CONFIG.OPENAI.API_KEY) {
    throw new Error('OpenAI API key is missing');
  }

  const input = [
    {
      role: 'system',
      content: [{ type: 'input_text', text: SYSTEM_PROMPT }],
    },
    {
      role: 'user',
      content: [{ type: 'input_text', text: prompt }],
    },
  ];

  const response = await axios.post(
    `${API_CONFIG.OPENAI.BASE_URL}/responses`,
    {
      model: model || API_CONFIG.OPENAI.MODEL,
      input,
      temperature: 0.4,
      max_output_tokens: 900,
    },
    {
      headers: {
        Authorization: `Bearer ${API_CONFIG.OPENAI.API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
    }
  );

  return extractOpenAIOutputText(response.data);
};

const callGemini = async ({ prompt, model }) => {
  if (!API_CONFIG.GEMINI.API_KEY) {
    throw new Error('Gemini API key is missing');
  }

  const modelName = model || API_CONFIG.GEMINI.MODEL;
  const url = `${API_CONFIG.GEMINI.BASE_URL}/models/${encodeURIComponent(modelName)}:generateContent?key=${API_CONFIG.GEMINI.API_KEY}`;

  const response = await axios.post(
    url,
    {
      contents: [
        {
          role: 'user',
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 900,
      },
    },
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: API_CONFIG.DEFAULTS.REQUEST_TIMEOUT,
    }
  );

  const parts = response.data?.candidates?.[0]?.content?.parts || [];
  return parts.map((part) => part.text || '').join('').trim();
};

const resolveProvider = (model) => {
  const parsed = parseModelSpec(model);
  const hasProviderPrefix = Boolean(parsed.provider);

  if (hasProviderPrefix) {
    if (parsed.provider === 'openai' && API_CONFIG.OPENAI.API_KEY) {
      return {
        provider: 'openai',
        model: parsed.name || API_CONFIG.OPENAI.MODEL,
        modeLabel: `openai/${parsed.name || API_CONFIG.OPENAI.MODEL}`,
      };
    }

    if (parsed.provider === 'gemini' && API_CONFIG.GEMINI.API_KEY) {
      return {
        provider: 'gemini',
        model: parsed.name || API_CONFIG.GEMINI.MODEL,
        modeLabel: `gemini/${parsed.name || API_CONFIG.GEMINI.MODEL}`,
      };
    }

    if (API_CONFIG.OPENROUTER.API_KEY) {
      const resolvedModel = parsed.raw || API_CONFIG.OPENROUTER.MODEL;
      return {
        provider: 'openrouter',
        model: resolvedModel,
        modeLabel: resolvedModel || 'openrouter',
      };
    }

    throw new Error('Selected model needs OpenRouter or the matching provider key.');
  }

  if (API_CONFIG.OPENAI.API_KEY) {
    const resolvedModel = parsed.name || API_CONFIG.OPENAI.MODEL;
    return {
      provider: 'openai',
      model: resolvedModel,
      modeLabel: `openai/${resolvedModel}`,
    };
  }

  if (API_CONFIG.GEMINI.API_KEY) {
    const resolvedModel = parsed.name || API_CONFIG.GEMINI.MODEL;
    return {
      provider: 'gemini',
      model: resolvedModel,
      modeLabel: `gemini/${resolvedModel}`,
    };
  }

  if (API_CONFIG.OPENROUTER.API_KEY) {
    const resolvedModel = parsed.raw || API_CONFIG.OPENROUTER.MODEL;
    return {
      provider: 'openrouter',
      model: resolvedModel,
      modeLabel: resolvedModel || 'openrouter',
    };
  }

  throw new Error('No AI provider configured');
};

const askVirtualGuide = async ({ question, destination, model, attachments }) => {
  const prompt = buildPrompt({ question, destination, attachments });
  try {
    const { provider, model: resolvedModel, modeLabel } = resolveProvider(model);

    let answer = '';
    if (provider === 'openai') {
      answer = await callOpenAI({ prompt, model: resolvedModel });
    } else if (provider === 'gemini') {
      answer = await callGemini({ prompt, model: resolvedModel });
    } else {
      answer = await callOpenRouter({ prompt, model: resolvedModel });
    }

    if (!answer) {
      throw new Error('No response from provider');
    }

    return { answer, mode: modeLabel };
  } catch (error) {
    console.warn('[VirtualGuide] Falling back to preview mode:', error.message);
    const answer = buildOfflineAnswer({ question, destination });
    return { answer, mode: 'preview' };
  }
};

module.exports = {
  askVirtualGuide,
};
