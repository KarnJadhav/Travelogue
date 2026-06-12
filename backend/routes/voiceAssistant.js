/**
 * Voice Assistant Routes
 * API endpoints for voice command processing
 */

const express = require("express");
const voiceController = require("../controllers/voiceAssistantController");
const { verifyToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// Process speech command (tourist only)
router.post(
  "/process-speech",
  verifyToken,
  authorizeRoles("tourist"),
  voiceController.processSpeech
);

// Confirm and execute action (tourist only)
router.post(
  "/confirm-action",
  verifyToken,
  authorizeRoles("tourist"),
  voiceController.confirmAction
);

// Get available commands (tourist only)
router.get(
  "/commands",
  verifyToken,
  authorizeRoles("tourist"),
  voiceController.getAvailableCommands
);

// Get voice configuration (tourist only)
router.get(
  "/config",
  verifyToken,
  authorizeRoles("tourist"),
  voiceController.getVoiceConfig
);

module.exports = router;
