/**
 * Voice Assistant Service - AGENT MODE
 * Auto-executes voice commands without confirmation
 * Falls back to simple regex if Gemini is unavailable
 */

const Guide = require("../models/Guide");
const Booking = require("../models/Booking");
const Review = require("../models/Review");
const User = require("../models/User");
const Travelogue = require("../models/Travelogue");

/**
 * Initialize Gemini API with fallback
 */
let genAI = null;
let model = null;
let geminiReady = false;

function initializeGemini() {
  try {
    if (!process.env.GEMINI_API_KEY) {
      console.warn("⚠️ GEMINI_API_KEY not set - using fallback mode");
      return false;
    }
    
    const { GoogleGenerativeAI } = require("@google/generative-ai");
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("✅ Gemini AI initialized successfully");
    return true;
  } catch (error) {
    console.warn("⚠️ Gemini initialization failed - using fallback:", error.message);
    return false;
  }
}

// Initialize on startup
geminiReady = initializeGemini();

/**
 * Simple regex-based intent parsing (fallback) - FLEXIBLE KEYWORD MATCHING
 * IMPORTANT: More flexible - works with partial words and variations
 */
function parseIntentSimple(text) {
  const lowerText = text.toLowerCase();
  
  // NAVIGATION FIRST - Very flexible keyword matching
  const navKeywords = {
    booking: ["open.*booking", "show.*booking", "go.*booking", "my booking", "bookings", "view booking"],
    review: ["open.*review", "show.*review", "go.*review", "my review", "reviews", "view review"],
    travelogue: ["open.*travel", "show.*travel", "open.*story", "show.*story", "my story", "stories", "travelogue"],
    profile: ["open.*profile", "show.*profile", "go.*profile", "my profile", "account", "settings"],
    explore: ["open.*explore", "show.*explore", "explore", "browse destination", "find place"],
    chat: ["open.*chat", "show.*chat", "go.*chat", "my chat", "message", "chat section"],
    dashboard: ["dashboard", "home", "go back", "main page"],
  };

  // Check if any nav keyword matches
  for (const [section, keywords] of Object.entries(navKeywords)) {
    for (const keyword of keywords) {
      const regex = new RegExp(keyword, "i");
      if (regex.test(lowerText) && (lowerText.includes("open") || lowerText.includes("show") || lowerText.includes("go"))) {
        return { intent: "navigation", targetSection: section, confidence: 85 };
      }
    }
  }

  // BOOKING - More flexible
  const bookingKeywords = ["book", "find guide", "search guide", "guide", "trek", "trekking", "adventure"];
  if (bookingKeywords.some(kw => lowerText.includes(kw))) {
    return { intent: "booking", confidence: 85 };
  }

  // REVIEW - More flexible
  const reviewKeywords = ["review", "star", "rate", "rating", "amazing", "great", "excellent", "terrible", "bad"];
  if (reviewKeywords.some(kw => lowerText.includes(kw))) {
    return { intent: "review", confidence: 80 };
  }

  // TRAVELOGUE - More flexible
  const travelogueKeywords = ["travelogue", "story", "write", "document", "travel story", "journey"];
  if (travelogueKeywords.some(kw => lowerText.includes(kw))) {
    return { intent: "travelogue", confidence: 80 };
  }

  // STATUS - More specific
  const statusKeywords = ["status", "how many", "booking count", "completed"];
  if (statusKeywords.some(kw => lowerText.includes(kw))) {
    return { intent: "status", confidence: 70 };
  }

  // SEARCH - New intent for location searches
  const locations = ["lonavala", "goa", "pune", "delhi", "jaipur", "agra", "himalaya", "ladakh", "kerala"];
  if (locations.some(loc => lowerText.includes(loc))) {
    return { intent: "search", confidence: 75 };
  }

  return { intent: "unknown", confidence: 30 };
}

/**
 * Parse user speech - with Gemini fallback
 */
async function parseSpeechCommand(userSpeech, userId) {
  try {
    // Get user context
    const user = await User.findById(userId);

    // TRY Gemini first
    if (geminiReady && model) {
      try {
        const prompt = `You are an INTELLIGENT, FLEXIBLE voice command parser for a travel booking app.

User said: "${userSpeech}"

FLEXIBLE PARSING RULES:
1. Keywords > exact phrases. "review" = "reviews" = "my review"
2. Short commands work: "chat" alone = navigation to Chat
3. "find guide" = "book guide" = same intent
4. Partial activity words count: "trek" = trekking, "bike" = mountain biking
5. Priority: Navigation > Booking > Review > Travelogue

INTENT OPTIONS (pick ONE):
- "navigation" → Commands with "open|show|go|display" + location (booking, review, chat, profile, explore)
- "booking" → Commands with "book|find|search" + "guide" or activity names
- "review" → Commands with "review|rate|rating|star|comment"
- "travelogue" → Commands with "story|travelogue|write|document"
- "status" → Commands asking "how many", "my bookings", "completed"
- "unknown" → If really unclear

CRITICAL EXAMPLES:
- "open review" → navigation (not booking!)
- "open chat" → navigation
- "then search Lonapur" → booking (search = find guide)
- "book trekking" → booking
- "rate my guide" → review
- "write a story" → travelogue

Return ONLY JSON:
{
  "intent": "one of above",
  "target_section": "booking|review|travelogue|profile|explore|chat|dashboard|null",
  "destination": "location or null",
  "activity": "activity or null",
  "confidence": 70-100
}`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        
        const cleanedText = text.replace(/```json\n?|\n?```/g, "").replace(/```\n?/g, "").trim();
        const parsed = JSON.parse(cleanedText);
        
        return {
          success: true,
          intent: parsed.intent || "unknown",
          confidence: parsed.confidence || 75,
          entities: {
            destination: parsed.destination || null,
            activity: parsed.activity || null,
            targetSection: parsed.target_section || null,
          },
        };
      } catch (geminiError) {
        console.warn("⚠️ Gemini parsing failed, using fallback:", geminiError.message);
        // Fall through to simple parsing below
      }
    }

    // FALLBACK: Simple regex-based parsing
    const simpleIntent = parseIntentSimple(userSpeech);
    
    return {
      success: true,
      intent: simpleIntent.intent,
      confidence: simpleIntent.confidence,
      entities: {
        destination: extractDestination(userSpeech),
        activity: extractActivity(userSpeech),
        date: extractDate(userSpeech),
      },
      message: "Using fast mode (Gemini not available)",
    };
  } catch (error) {
    console.error("Error parsing speech:", error);
    return {
      success: false,
      intent: "unknown",
      confidence: 0,
      error: error.message,
    };
  }
}

/**
 * Extract destination from text
 */
function extractDestination(text) {
  const destinations = [
    "lonavala", "goa", "kolhapur", "pune", "mumbai", "delhi",
    "jaipur", "agra", "kerela", "rajasthan", "maharashtra",
    "ladakh", "himalaya", "western ghats"
  ];
  
  const lowerText = text.toLowerCase();
  for (let dest of destinations) {
    if (lowerText.includes(dest)) return dest;
  }
  return null;
}

/**
 * Extract activity from text
 */
function extractActivity(text) {
  const activities = [
    "trekking", "mountain biking", "photography", "adventure", "hiking",
    "camping", "rafting", "paragliding", "diving", "rock climbing"
  ];
  
  const lowerText = text.toLowerCase();
  for (let activity of activities) {
    if (lowerText.includes(activity)) return activity;
  }
  return null;
}

/**
 * Extract date from text
 */
function extractDate(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes("tomorrow")) return "tomorrow";
  if (lowerText.includes("today")) return "today";
  if (lowerText.includes("next sunday")) return "next Sunday";
  if (lowerText.includes("next monday")) return "next Monday";
  if (lowerText.includes("next week")) return "next week";
  if (lowerText.includes("this weekend")) return "this weekend";
  
  return null;
}
async function handleBookingRequest(entities, userId) {
  try {
    // Validate required entities
    if (!entities.destination && !entities.activity) {
      return {
        success: false,
        message:
          "I need at least a destination or activity type. What would you like to do?",
      };
    }

    // Build search query
    const searchQuery = {};

    if (entities.destination) {
      searchQuery.country = {
        $regex: entities.destination,
        $options: "i",
      };
    }

    if (entities.activity) {
      searchQuery.specialties = {
        $in: [new RegExp(entities.activity, "i")],
      };
    }

    searchQuery.isApproved = true;

    // Search for matching guides
    const guides = await Guide.find(searchQuery)
      .populate("userId", "name avatar email phone")
      .limit(5)
      .sort({ rating: -1 });

    if (guides.length === 0) {
      return {
        success: false,
        message: `Sorry, no guides found matching your criteria. Try different destination or activity.`,
      };
    }

    // Format guide suggestions
    const suggestions = guides.slice(0, 3).map((guide, idx) => ({
      id: guide._id,
      rank: idx + 1,
      guideName: guide.userId?.name || "Guide",
      rating: guide.rating || 4.5,
      experience: guide.yearsOfExperience || 5,
      specialties: guide.specialties?.slice(0, 3).join(", ") || "Various",
      pricePerDay: guide.pricePerDay || 2500,
    }));

    return {
      success: true,
      action: "SELECT_GUIDE",
      suggestedGuides: suggestions,
      message: `Found ${guides.length} great guides! ${suggestions[0].guideName} has a ${suggestions[0].rating}⭐ rating and ${suggestions[0].experience}+ years experience. Would you like to book them?`,
      requiresConfirmation: true,
      metadata: {
        destination: entities.destination,
        date: entities.date,
        activity: entities.activity,
        selectedGuideId: guides[0]._id,
        selectedGuideName: guides[0].userId?.name,
        pricePerDay: guides[0].pricePerDay || 2500,
      },
    };
  } catch (error) {
    console.error("Error handling booking:", error);
    return {
      success: false,
      message:
        "Sorry, I had trouble searching for guides. Please try again.",
    };
  }
}

/**
 * Confirm and create booking
 */
async function createBookingFromVoice(metadata, userId) {
  try {
    const { selectedGuideId, destination, date, activity } = metadata;

    if (!selectedGuideId) {
      return {
        success: false,
        message: "No guide selected. Please try again.",
      };
    }

    // Parse date (simplified)
    let bookingDate = new Date();
    if (date) {
      // Try to parse relative dates like "tomorrow", "next Sunday", etc
      if (date.toLowerCase() === "today") {
        bookingDate = new Date();
      } else if (date.toLowerCase() === "tomorrow") {
        bookingDate.setDate(bookingDate.getDate() + 1);
      } else {
        bookingDate = new Date(date);
      }
    } else {
      // Default to tomorrow
      bookingDate.setDate(bookingDate.getDate() + 1);
    }

    const endDate = new Date(bookingDate);
    endDate.setDate(endDate.getDate() + 1);

    // Create booking
    const booking = new Booking({
      touristId: userId,
      guideId: selectedGuideId,
      startDateTime: bookingDate,
      endDateTime: endDate,
      destination: destination || activity || "Adventure Tour",
      price: metadata.pricePerDay || 2500,
      status: "pending",
    });

    await booking.save();

    // Populate guide info for response
    const populatedBooking = await Booking.findById(booking._id).populate(
      "guideId",
      "name email"
    );

    return {
      success: true,
      message: `Perfect! Your booking with ${populatedBooking.guideId.name} has been created. They usually respond within 2 hours. Check your dashboard for updates!`,
      booking: {
        id: booking._id,
        guideName: populatedBooking.guideId.name,
        destination: destination,
        date: bookingDate.toLocaleDateString(),
        price: booking.price,
        status: "pending",
      },
    };
  } catch (error) {
    console.error("Error creating booking:", error);
    return {
      success: false,
      message: "Sorry, I couldn't complete the booking. Please try again.",
    };
  }
}

/**
 * Handle review creation via voice
 */
async function handleReviewRequest(userSpeech, userId) {
  try {
    // Find user's most recent completed booking
    const booking = await Booking.findOne({
      touristId: userId,
      status: "completed",
    })
      .sort({ endDateTime: -1 })
      .populate("guideId", "name");

    if (!booking) {
      return {
        success: false,
        message:
          "You don't have any completed tours yet. Complete a tour first to leave a review.",
      };
    }

    // Check if already reviewed
    const existingReview = await Review.findOne({
      userId: userId,
      bookingId: booking._id,
    });

    if (existingReview) {
      return {
        success: false,
        message: `You've already reviewed this tour with ${booking.guideId.name}.`,
      };
    }

    if (!geminiReady || !model) {
      return {
        success: false,
        message:
          "Review service temporarily unavailable. Please try again later.",
      };
    }

    // Extract sentiment and rating from user speech
    const sentimentPrompt = `Analyze this travel review and extract:
1. Star rating (1-5) based on sentiment
2. Cleaned comment (just the meaningful part)
3. Keywords (up to 3)

Review: "${userSpeech}"

Return JSON:
{
  "rating": number (1-5),
  "cleanedComment": "string",
  "keywords": ["string"]
}

Respond with ONLY valid JSON.`;

    const result = await model.generateContent(sentimentPrompt);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text
      .replace(/```json\n?|\n?```/g, "")
      .replace(/```\n?|\n?```/g, "")
      .trim();
    const analysis = JSON.parse(cleanedText);

    // Ensure rating is valid
    const rating = Math.max(1, Math.min(5, analysis.rating));

    return {
      success: true,
      action: "CONFIRM_REVIEW",
      preview: {
        guideName: booking.guideId.name,
        destination: booking.destination,
        rating: rating,
        comment: analysis.cleanedComment,
        keywords: analysis.keywords,
      },
      message: `I'll post a ${rating}⭐ review for ${booking.guideId.name}. Is this correct?`,
      requiresConfirmation: true,
      metadata: {
        bookingId: booking._id,
        guideId: booking.guideId._id,
        rating: rating,
        comment: analysis.cleanedComment,
      },
    };
  } catch (error) {
    console.error("Error handling review:", error);
    return {
      success: false,
      message: "I had trouble creating your review. Please try again.",
    };
  }
}

/**
 * Confirm and create review
 */
async function createReviewFromVoice(metadata, userId) {
  try {
    const { bookingId, guideId, rating, comment } = metadata;

    // Validate
    if (!bookingId || !guideId || !rating) {
      return {
        success: false,
        message: "Invalid review data. Please try again.",
      };
    }

    // Create review
    const review = new Review({
      userId: userId,
      guideId: guideId,
      bookingId: bookingId,
      place: "",
      rating: Math.max(1, Math.min(5, rating)),
      comment: comment || "",
      status: "approved",
    });

    await review.save();

    // Mark booking as reviewed
    await Booking.findByIdAndUpdate(bookingId, { reviewSubmitted: true });

    return {
      success: true,
      message: `${rating}⭐ review posted! The guide will see it in their dashboard. Great job!`,
      review: {
        id: review._id,
        rating: rating,
        comment: comment,
      },
    };
  } catch (error) {
    console.error("Error creating review:", error);
    return {
      success: false,
      message: "I couldn't save your review. Please try again.",
    };
  }
}

/**
 * Handle travelogue creation
 */
async function handleTravelogueRequest(userSpeech, userId) {
  try {
    if (!geminiReady || !model) {
      return {
        success: false,
        message:
          "Travelogue service temporarily unavailable. Please try again later.",
      };
    }

    const traveloguePrompt = `Analyze this travelogue request and extract key information:

Request: "${userSpeech}"

Return JSON:
{
  "destination": "string or 'General' if not specified",
  "title": "string (creative title)",
  "description": "string (1-2 sentence summary)"
}

Respond with ONLY valid JSON.`;

    const result = await model.generateContent(traveloguePrompt);
    const response = await result.response;
    const text = response.text();
    const cleanedText = text
      .replace(/```json\n?|\n?```/g, "")
      .replace(/```\n?|\n?```/g, "")
      .trim();
    const analysis = JSON.parse(cleanedText);

    return {
      success: true,
      action: "CREATE_TRAVELOGUE",
      message: `I'll create a travelogue titled "${analysis.title}". You can start writing your story now. Ready?`,
      metadata: {
        destination: analysis.destination,
        title: analysis.title,
        description: analysis.description,
      },
      requiresConfirmation: true,
    };
  } catch (error) {
    console.error("Error handling travelogue:", error);
    return {
      success: false,
      message:
        "I had trouble understanding your travelogue request. Please try again.",
    };
  }
}

/**
 * Create travelogue from voice
 */
async function createTravelogueFromVoice(metadata, userId) {
  try {
    const { destination, title, description } = metadata;

    const travelogue = new Travelogue({
      userId: userId,
      destination: destination || "My Adventure",
      title: title || "My Travel Story",
      description: description || "",
      status: "draft",
      content: "",
    });

    await travelogue.save();

    return {
      success: true,
      message: `Travelogue "${title}" created! You can now add stories, photos, and details. Go to your Travelogue section to start writing!`,
      travelogue: {
        id: travelogue._id,
        destination: destination,
        title: title,
      },
    };
  } catch (error) {
    console.error("Error creating travelogue:", error);
    return {
      success: false,
      message: "Couldn't create your travelogue. Please try again.",
    };
  }
}

/**
 * Get user's booking status
 */
async function getBookingStatus(userId) {
  try {
    const bookings = await Booking.find({ touristId: userId })
      .populate("guideId", "name")
      .sort({ createdAt: -1 });

    const summary = {
      total: bookings.length,
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };

    const message = `You have ${summary.total} total bookings: ${summary.pending} pending, ${summary.confirmed} confirmed, ${summary.completed} completed.`;

    return {
      success: true,
      message: message,
      summary: summary,
    };
  } catch (error) {
    console.error("Error getting status:", error);
    return {
      success: false,
      message: "Couldn't retrieve your booking status.",
    };
  }
}

module.exports = {
  parseSpeechCommand,
  handleBookingRequest,
  createBookingFromVoice,
  handleReviewRequest,
  createReviewFromVoice,
  handleTravelogueRequest,
  createTravelogueFromVoice,
  getBookingStatus,
  geminiReady,
};
