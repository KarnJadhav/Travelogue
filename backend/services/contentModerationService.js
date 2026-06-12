/**
 * Content Moderation Service
 * Detects inappropriate content including profanity, abusive language, spam, etc.
 */

const AIService = require('./aiService');

const aiService = new AIService();

// List of profanity and bad words to check for
const badwords = [
  'damn', 'hell', 'crap', 'piss', 'ass', 'shit', 'fuck', 'bitch', 'bastard',
  'asshole', 'dick', 'cock', 'pussy', 'whore', 'slut', 'motherfucker',
  'scam', 'fraud', 'stolen', 'fake', 'cheap', 'rip-off', 'danger', 'threat',
  'harass', 'bully', 'hate', 'racist', 'sexist', 'violent', 'illegal',
  'stupid', 'dumb', 'idiot', 'moron', 'retard', 'faggot'
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const badwordRegexes = badwords.map((word) => ({
  word,
  regex: new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i'),
}));

// Abusive language patterns
const abusivePatterns = [
  /\b(?:kill|rape|murder|assault|punch|beat|stab)\b/gi,
  /\b(?:hate|despise|loathe|detest)\s+(?:you|him|her|them)\b/gi,
  /\b(?:go\s+)?(?:fuck|get)\s+(?:yourself|himself|herself|themself)/gi,
  /you\s+(?:suck|blow|are|were|is|are)\s+(?:shit|ass|crap|terrible|awful|horrible|disgusting)/gi
];

// Spam patterns
const spamPatterns = [
  /^(.*?)\1{3,}$/, // Repeated characters
  /https?:\/\/[^\s]+/g, // URLs/Links
  /\b(?:\d{7,}|[\w\.-]+@[\w\.-]+\.\w+)\b/, // Phone numbers and emails
  /(?:dm|call|whatsapp|telegram|viber|contact|dm me|text me|call me).*?(?:\d{5,}|[\w\.-]+@)/gi // Contact info
];

/**
 * Analyze text content for inappropriate material
 * @param {String} text - Text to analyze
 * @returns {Object} - Analysis result with flags and confidence
 */
function analyzeContent(text) {
  if (!text || typeof text !== 'string') {
    return {
      isFlagged: false,
      reason: null,
      flaggedWords: [],
      confidence: 0,
      details: 'No text to analyze'
    };
  }

  const result = {
    isFlagged: false,
    reason: null,
    flaggedWords: [],
    confidence: 0,
    checks: {}
  };

  // 1. Check for profanity and abusive language
  const flaggedBadwords = [];
  for (const { word, regex } of badwordRegexes) {
    if (regex.test(text)) {
      flaggedBadwords.push(word);
      result.isFlagged = true;
      result.reason = 'abusive';
      result.confidence = Math.max(result.confidence, 85);
      result.checks.profanity = true;
    }
  }
  
  if (flaggedBadwords.length > 0) {
    result.flaggedWords = [...new Set(flaggedBadwords)];
  }

  // Check for abusive patterns
  for (const pattern of abusivePatterns) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      result.isFlagged = true;
      result.reason = 'abusive';
      result.confidence = Math.max(result.confidence, 85);
      result.checks.abusivePattern = true;
      break;
    }
  }

  // 2. Check for excessive caps or repetition
  const capsPercentage = (text.match(/[A-Z]/g) || []).length / text.length;
  if (capsPercentage > 0.5 && text.length > 10) {
    if (!result.isFlagged) {
      result.isFlagged = true;
      result.reason = 'spam';
      result.confidence = 60;
    }
    result.checks.excessiveCaps = true;
  }

  // 3. Check for repeated characters
  if (spamPatterns[0].test(text)) {
    if (!result.isFlagged) {
      result.isFlagged = true;
      result.reason = 'spam';
      result.confidence = 70;
    }
    result.checks.repeatedCharacters = true;
  }

  // 4. Check for external links
  const linkMatches = text.match(spamPatterns[1]);
  if (linkMatches && linkMatches.length > 0) {
    if (!result.isFlagged) {
      result.isFlagged = true;
      result.reason = 'spam';
      result.confidence = 75;
    }
    result.checks.externalLinks = true;
    result.flaggedWords = [...result.flaggedWords, ...linkMatches];
  }

  // 5. Check for contact information (phone, email, chat apps)
  const contactMatch = text.match(spamPatterns[3]);
  if (contactMatch) {
    if (!result.isFlagged) {
      result.isFlagged = true;
      result.reason = 'spam';
      result.confidence = 80;
    }
    result.checks.contactInfo = true;
  }

  // 6. Check for very short or empty reviews
  if (text.trim().length === 0) {
    result.isFlagged = true;
    result.reason = 'irrelevant';
    result.confidence = 90;
    result.checks.emptyContent = true;
  }

  // 7. Check for excessive punctuation
  const punctuationCount = (text.match(/[!?]{2,}/g) || []).length;
  if (punctuationCount >= 3) {
    if (!result.isFlagged) {
      result.isFlagged = true;
      result.reason = 'spam';
      result.confidence = 65;
    }
    result.checks.excessivePunctuation = true;
  }

  // Remove duplicate flagged words
  result.flaggedWords = [...new Set(result.flaggedWords)];
  
  // Clean up checks object if not flagged
  if (!result.isFlagged) {
    delete result.checks;
  }

  return result;
}

function normalizeAiAnalysis(result) {
  const isFlagged = Boolean(result?.isFlagged);
  const reason = typeof result?.reason === 'string' ? result.reason : null;
  const flaggedWords = Array.isArray(result?.flaggedWords)
    ? result.flaggedWords.filter((word) => typeof word === 'string' && word.trim())
    : [];
  const confidence = Number.isFinite(result?.confidence)
    ? Math.max(0, Math.min(100, result.confidence))
    : 0;

  return {
    isFlagged,
    reason,
    flaggedWords,
    confidence,
  };
}

function mergeAnalyses(localAnalysis, aiAnalysis) {
  if (!aiAnalysis) return localAnalysis;

  const flaggedWords = new Set([
    ...(localAnalysis.flaggedWords || []),
    ...(aiAnalysis.flaggedWords || []),
  ]);

  const merged = {
    ...localAnalysis,
    isFlagged: Boolean(localAnalysis.isFlagged || aiAnalysis.isFlagged),
    reason: aiAnalysis.reason || localAnalysis.reason,
    flaggedWords: Array.from(flaggedWords),
    confidence: Math.max(localAnalysis.confidence || 0, aiAnalysis.confidence || 0),
    checks: {
      ...(localAnalysis.checks || {}),
      aiModeration: true,
    },
  };

  if (!merged.isFlagged) {
    delete merged.checks;
  }

  return merged;
}

/**
 * Analyze text content using Gemini (if available) with local fallback
 * @param {String} text - Text to analyze
 * @returns {Promise<Object>} - Analysis result
 */
async function analyzeContentWithAI(text) {
  const localAnalysis = analyzeContent(text);

  if (!text || typeof text !== 'string') {
    return localAnalysis;
  }

  if (!aiService?.hasGeminiAccess) {
    return localAnalysis;
  }

  const prompt = `
    You are a content moderation system. Analyze the text and return JSON only.

    Text:
    "${text}"

    Rules:
    - Flag abusive, hateful, explicit sexual, violent threats, harassment, spam, scams, fraud, or illegal activity.
    - "reason" must be one of: abusive, spam, scam, illegal, irrelevant, safe
    - "flaggedWords" should include short phrases or keywords found in the text
    - "confidence" is 0-100

    Return JSON only:
    {
      "isFlagged": true|false,
      "reason": "abusive|spam|scam|illegal|irrelevant|safe",
      "flaggedWords": ["word1", "word2"],
      "confidence": 0
    }
  `;

  try {
    const content = await aiService.callGemini({
      prompt,
      temperature: 0.2,
      maxOutputTokens: 400,
      responseMimeType: 'application/json',
    });

    const jsonBlock = aiService.extractJsonBlock(content);
    if (!jsonBlock) return localAnalysis;

    const parsed = JSON.parse(jsonBlock);
    const aiAnalysis = normalizeAiAnalysis(parsed);
    return mergeAnalyses(localAnalysis, aiAnalysis);
  } catch (error) {
    console.warn('Gemini moderation failed, using local checks:', error.message);
    return localAnalysis;
  }
}

/**
 * Check if review content is appropriate
 * @param {String} comment - Review comment to check
 * @returns {Object} - Moderation result
 */
function moderateReview(comment) {
  if (!comment) {
    return {
      approved: true,
      analysis: null
    };
  }

  const analysis = analyzeContent(comment);

  return {
    approved: !analysis.isFlagged,
    analysis: analysis,
    recommendation: analysis.isFlagged ? 'REQUIRES_REVIEW' : 'APPROVED'
  };
}

/**
 * Check if review content is appropriate (Gemini + fallback)
 * @param {String} comment - Review comment to check
 * @returns {Promise<Object>} - Moderation result
 */
async function moderateReviewWithAI(comment) {
  if (!comment) {
    return {
      approved: true,
      analysis: null
    };
  }

  const analysis = await analyzeContentWithAI(comment);

  return {
    approved: !analysis.isFlagged,
    analysis: analysis,
    recommendation: analysis.isFlagged ? 'REQUIRES_REVIEW' : 'APPROVED'
  };
}

/**
 * Batch analyze multiple reviews
 * @param {Array} reviews - Array of review objects with comment field
 * @returns {Array} - Reviews with moderation results
 */
function moderateBatch(reviews) {
  return reviews.map(review => ({
    ...review,
    moderation: analyzeContent(review.comment || '')
  }));
}

/**
 * Batch analyze multiple reviews (Gemini + fallback)
 * @param {Array} reviews - Array of review objects with comment field
 * @returns {Promise<Array>} - Reviews with moderation results
 */
async function moderateBatchWithAI(reviews) {
  const results = [];

  for (const review of reviews) {
    const moderation = await analyzeContentWithAI(review.comment || '');
    results.push({
      ...review,
      moderation,
    });
  }

  return results;
}

/**
 * Get a risk score from 0-100 for content
 * @param {String} text - Text to analyze
 * @returns {Number} - Risk score
 */
function getRiskScore(text) {
  const analysis = analyzeContent(text);
  return analysis.confidence;
}

/**
 * Get a risk score from 0-100 for content (Gemini + fallback)
 * @param {String} text - Text to analyze
 * @returns {Promise<Number>} - Risk score
 */
async function getRiskScoreWithAI(text) {
  const analysis = await analyzeContentWithAI(text);
  return analysis.confidence;
}

module.exports = {
  analyzeContent,
  analyzeContentWithAI,
  moderateReview,
  moderateReviewWithAI,
  moderateBatch,
  getRiskScore,
  moderateBatchWithAI,
  getRiskScoreWithAI,
  badwords,
  spamPatterns
};
