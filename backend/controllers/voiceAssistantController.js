/**
 * Voice Assistant Controller
 * API endpoints for voice command processing
 */

const voiceService = require("../services/voiceAssistantService");
const User = require("../models/User");

/**
 * Section name mapping for navigation
 */
const sectionNameMap = {
  booking: "MyBookings",
  review: "MyReviews",
  travelogue: "MyTravelogues",
  profile: "Profile",
  explore: "ExploreDestinations",
  chat: "Chat",
  dashboard: "Dashboard",
};

/**
 * Process user speech command - AGENT MODE (auto-execute)
 * POST /api/voiceAssistant/process-speech
 * 
 * NEW: Directly executes commands without requiring confirmation
 */
async function processSpeech(req, res) {
  try {
    const { transcribedText } = req.body;
    const userId = req.user.userId;

    if (!transcribedText || transcribedText.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "No speech text provided. Please try again.",
      });
    }

    // Parse the speech using AI
    const parsed = await voiceService.parseSpeechCommand(
      transcribedText,
      userId
    );

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Couldn't understand that. Try saying 'book a guide' or 'create a review'.",
        guidance: "I didn't catch that. Can you repeat?",
      });
    }

    // If low confidence, ask for clarification
    if (parsed.confidence < 40) {
      return res.json({
        success: false,
        confidence: parsed.confidence,
        message: "Could you say that again? I'm not quite sure what you mean.",
      });
    }

    let result = { success: false, message: "No action taken" };
    let actionType = "unknown";

    // Route to appropriate handler based on intent
    switch (parsed.intent) {
      case "booking":
        actionType = "booking";
        result = await voiceService.handleBookingRequest(
          parsed.entities,
          userId
        );
        // AUTO-BOOK: If guide found, create booking immediately
        if (result.success && result.suggestedGuides?.length > 0) {
          const firstGuide = result.suggestedGuides[0];
          result = await voiceService.createBookingFromVoice(
            {
              guideId: firstGuide._id,
              guideName: firstGuide.name,
              activity: parsed.entities.activity || firstGuide.specialization,
              date: parsed.entities.date || new Date().toISOString(),
              notes: `Booked via voice: ${transcribedText}`,
            },
            userId
          );
          result.message = `✅ Booked ${firstGuide.name} for ${parsed.entities.activity || firstGuide.specialization}!`;
          result.actionExecuted = true;
        }
        break;

      case "review":
        actionType = "review";
        result = await voiceService.handleReviewRequest(transcribedText, userId);
        // AUTO-CREATE REVIEW: Create directly without confirmation
        if (result.success && result.metadata) {
          result = await voiceService.createReviewFromVoice(
            result.metadata,
            userId
          );
          result.message = `✅ Review created! Rating: ${result.metadata?.rating}⭐`;
          result.actionExecuted = true;
        }
        break;

      case "travelogue":
        actionType = "travelogue";
        result = await voiceService.handleTravelogueRequest(transcribedText, userId);
        // AUTO-CREATE TRAVELOGUE: Create directly
        if (result.success && result.metadata) {
          result = await voiceService.createTravelogueFromVoice(
            result.metadata,
            userId
          );
          result.message = `✅ Travelogue started! Title: "${result.metadata?.title}"`;
          result.actionExecuted = true;
        }
        break;

      case "navigation":
        // NEW: Handle navigation commands
        actionType = "navigation";
        // Try parsed.entities.targetSection first (from service)
        let navResult;
        if (parsed.entities?.targetSection) {
          navResult = {
            success: true,
            navigateTo: sectionNameMap[parsed.entities.targetSection],
            actionExecuted: true,
          };
        } else {
          navResult = handleNavigationCommand(transcribedText, userId);
        }
        result = navResult;
        break;

      case "status":
        actionType = "status";
        result = await voiceService.getBookingStatus(userId);
        break;

      case "search":
        actionType = "search";
        result = await voiceService.handleBookingRequest(
          parsed.entities,
          userId
        );
        break;

      default:
        return res.json({
          success: false,
          message: "I can help you book guides, create reviews, or write stories. What would you like?",
          intent: parsed.intent,
          confidence: parsed.confidence,
        });
    }

    // Always success response with action execution
    res.json({
      success: result.success || true,
      message: result.message || "Processing your request...",
      actionType: actionType,
      actionExecuted: result.actionExecuted || false,
      navigateTo: result.navigateTo || null, // For navigation commands
      data: result.booking || result.review || result.travelogue || result.suggestedGuides || null,
      confidence: parsed.confidence,
      metadata: result.metadata || null,
    });
  } catch (error) {
    console.error("Error processing speech:", error);
    res.status(500).json({
      success: false,
      message: "Sorry, something went wrong. Please try again.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Please try again.",
    });
  }
}

/**
 * Handle navigation commands (opening sections)
 * FLEXIBLE KEYWORD MATCHING - Works with partial phrases and variations
 */
function handleNavigationCommand(speech, userId) {
  const lowerSpeech = speech.toLowerCase();

  // Check each section with multiple keyword variations
  const sections = {
    MyBookings: {
      keywords: ["booking", "bookings", "reserve", "reservation", "my booking"],
      triggers: ["open", "show", "go", "view", "display"],
    },
    MyReviews: {
      keywords: ["review", "reviews", "my review", "rating", "ratings"],
      triggers: ["open", "show", "go", "view", "display"],
    },
    MyTravelogues: {
      keywords: ["travelogue", "story", "stories", "travel story", "journey", "trip story"],
      triggers: ["open", "show", "go", "view", "display", "write"],
    },
    Profile: {
      keywords: ["profile", "my profile", "account", "user profile", "personal"],
      triggers: ["open", "show", "go", "view", "display"],
    },
    ExploreDestinations: {
      keywords: ["explore", "destination", "destinations", "browse", "search place", "find place"],
      triggers: ["open", "show", "go", "view", "display", "browse"],
    },
    Chat: {
      keywords: ["chat", "message", "messages", "talk", "discussion"],
      triggers: ["open", "show", "go", "view", "display"],
    },
    Dashboard: {
      keywords: ["dashboard", "home", "main", "homepage"],
      triggers: ["go", "back", "open"],
    },
  };

  // Check each section
  for (const [section, config] of Object.entries(sections)) {
    // Check if any keyword matches
    const hasKeyword = config.keywords.some(kw => {
      const regex = new RegExp(`\\b${kw}\\b`, "i");
      return regex.test(lowerSpeech);
    });

    // Check if trigger words are present (for navigation intent)
    const hasTrigger = config.triggers.some(trigger => lowerSpeech.includes(trigger));

    // For short commands like "chat", "review", no trigger needed
    if (hasKeyword && (hasTrigger || speech.split(" ").length <= 3)) {
      const messages = {
        MyBookings: "Opening your bookings...",
        MyReviews: "Opening your reviews...",
        MyTravelogues: "Opening your travelogues...",
        Profile: "Opening your profile...",
        ExploreDestinations: "Opening explore destinations...",
        Chat: "Opening chat...",
        Dashboard: "Going to dashboard...",
      };

      return {
        success: true,
        message: messages[section] || "Navigating...",
        navigateTo: section,
        actionExecuted: true,
      };
    }
  }

  return {
    success: false,
    message: "Could not understand. Say 'open reviews', 'open chat', 'open bookings', etc.",
  };
}

/**
 * Confirm action and execute
 * POST /api/voiceAssistant/confirm-action
 */
async function confirmAction(req, res) {
  try {
    const { action, metadata, confirmation } = req.body;
    const userId = req.user.userId;

    if (!action) {
      return res.status(400).json({
        success: false,
        message: "No action specified.",
      });
    }

    // User cancelled the action
    if (!confirmation) {
      return res.json({
        success: false,
        message:
          "Action cancelled. How else can I help? Try saying 'book a guide' or 'create a review'.",
      });
    }

    let result;

    switch (action) {
      case "SELECT_GUIDE":
        result = await voiceService.createBookingFromVoice(metadata, userId);
        break;

      case "CONFIRM_REVIEW":
        result = await voiceService.createReviewFromVoice(metadata, userId);
        break;

      case "CREATE_TRAVELOGUE":
        result = await voiceService.createTravelogueFromVoice(metadata, userId);
        break;

      default:
        return res.status(400).json({
          success: false,
          message: "Unknown action type.",
        });
    }

    // Emit success notification if Socket.io available
    try {
      const setupSocket = require("../socket/chat");
      if (setupSocket && setupSocket.ioInstance) {
        setupSocket.ioInstance
          .to(`user_${userId}`)
          .emit("voiceActionComplete", {
            action: action,
            success: result.success,
            message: result.message,
          });
      }
    } catch (e) {
      console.log("[INFO] Socket notification skipped:", e.message);
    }

    res.json({
      success: result.success,
      message: result.message,
      data: result.booking || result.review || result.travelogue || null,
      action: action,
    });
  } catch (error) {
    console.error("Error confirming action:", error);
    res.status(500).json({
      success: false,
      message: "Error executing action",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : "Please try again.",
    });
  }
}

/**
 * Get available commands (for UI guidance)
 * GET /api/voiceAssistant/commands
 */
async function getAvailableCommands(req, res) {
  try {
    const commands = {
      booking: [
        "Book a guide for trekking in Lonavala",
        "Find adventure guides under ₹3000",
        "Book an English-speaking guide for photography",
      ],
      review: [
        "Create a 5-star review for my guide",
        "The trek was amazing, leave a review",
        "Review guide Raj",
      ],
      travelogue: [
        "Create a travelogue for my Goa trip",
        "Start my travel story",
        "Write about my mountain biking adventure",
      ],
      status: [
        "What's the status of my bookings?",
        "Show me my pending bookings",
        "How many completed tours do I have?",
      ],
    };

    res.json({
      success: true,
      commands: commands,
      message: "Available voice commands for your assistant",
    });
  } catch (error) {
    console.error("Error getting commands:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving commands",
    });
  }
}

/**
 * Get voice assistant configuration
 * GET /api/voiceAssistant/config
 */
async function getVoiceConfig(req, res) {
  try {
    const userId = req.user.userId;

    const config = {
      userId: userId,
      voiceEnabled: voiceService.geminiReady,
      supportedIntents: [
        "booking",
        "review",
        "travelogue",
        "status",
        "search",
      ],
      languages: ["en-US", "en-GB", "en-IN"],
      features: {
        voiceBooking: true,
        voiceReview: true,
        voiceTravelogue: true,
        voiceStatus: true,
        voiceSearch: true,
      },
    };

    res.json({
      success: true,
      config: config,
    });
  } catch (error) {
    console.error("Error getting config:", error);
    res.status(500).json({
      success: false,
      message: "Error retrieving configuration",
    });
  }
}

module.exports = {
  processSpeech,
  confirmAction,
  getAvailableCommands,
  getVoiceConfig,
};
