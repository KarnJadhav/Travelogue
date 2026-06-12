/**
 * Premium Voice Assistant Component
 * AI-powered voice assistant for booking guides, creating reviews, and writing travelogues
 * Features: Speech recognition, real-time transcription, intelligent response, smooth animations
 */

import React, { useState, useRef, useEffect } from "react";
import api from "../api";
import {
  Box,
  IconButton,
  Dialog,
  Paper,
  Typography,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Card,
  CardContent,
  Grid,
} from "@mui/material";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic,
  MicOff,
  Close,
  CheckCircle,
  Cancel,
  VolumeUp,
  Lightbulb,
} from "@mui/icons-material";
import "./VoiceAssistant.css";

const VoiceAssistant = ({ userId }) => {
  // State management
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [response, setResponse] = useState(null);
  const [error, setError] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [commands, setCommands] = useState(null);
  const [audioFeedback, setAudioFeedback] = useState(true);

  // Refs
  const recognitionRef = useRef(null);
  const synthRef = useRef(window.speechSynthesis);
  const recognitionInterimRef = useRef("");

  // Initialize Web Speech API
  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError("Speech recognition not supported in your browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
      recognitionInterimRef.current = "";
      setTranscript(""); // Clear on fresh start
    };

    recognition.onresult = (event) => {
      let finalTranscript = "";
      let interimTranscript = "";

      // Process results - IMPORTANT: Only process NEW results starting from event.resultIndex
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;

        if (event.results[i].isFinal) {
          finalTranscript += transcriptSegment + " ";
        } else {
          interimTranscript += transcriptSegment;
        }
      }

      // Add final results to transcript (ONLY new ones, not duplicates)
      if (finalTranscript.trim()) {
        setTranscript((prev) => {
          const combined = prev + finalTranscript;
          return combined.trim();
        });
      }

      // Show interim results
      if (interimTranscript) {
        recognitionInterimRef.current = interimTranscript;
      } else {
        recognitionInterimRef.current = "";
      }
    };

    recognition.onerror = (event) => {
      const errorMessages = {
        "no-speech": "🔇 No speech detected. Speak clearly into the microphone.",
        "audio-capture": "🎙️ Microphone not found. Check permissions in settings.",
        "network": "🌐 Network error. Check your connection and try again.",
        "not-allowed": "❌ Microphone permission denied. Enable in browser settings.",
      };
      setError(errorMessages[event.error] || `⚠️ Error: ${event.error}`);
      setIsListening(false);
      console.warn("Voice recognition error:", event.error);
    };

    recognition.onend = () => {
      setIsListening(false);
      console.log("Voice recognition ended");
    };

    recognitionRef.current = recognition;

    // Fetch available commands on mount
    fetchAvailableCommands();
  }, []);

  // Fetch available commands
  const fetchAvailableCommands = async () => {
    try {
      const res = await api.get("/voiceAssistant/commands");
      setCommands(res.data.commands);
    } catch (err) {
      console.error("Error fetching commands:", err);
    }
  };

  // Start listening
  const handleStartListening = () => {
    if (recognitionRef.current && !isListening) {
      setError(null);
      setTranscript("");
      recognitionRef.current.start();
    }
  };

  // Stop listening
  const handleStopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  // Send speech for processing - AGENT MODE (auto-execute) - IMPROVED
  const handleProcessSpeech = async () => {
    // Combine transcript + interim (interim is temporary/ghost words)
    let finalTranscript = transcript.trim();
    
    // Clean up any duplicates (if text was accidentally captured twice)
    finalTranscript = finalTranscript.split(" ").filter((word, idx, arr) => {
      return idx === 0 || arr[idx - 1] !== word; // Remove consecutive duplicates
    }).join(" ");

    if (!finalTranscript) {
      setError("🎤 Please say something and try again.");
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      console.log("📤 Sending to backend:", finalTranscript); // Debug log
      const res = await api.post("/voiceAssistant/process-speech", {
        transcribedText: finalTranscript,
      });

      if (!res.data.success && res.data.confidence < 40) {
        setError(res.data.message);
        console.warn("Low confidence response:", res.data);
        if (res.data.guidance) {
          speakResponse(res.data.guidance);
        }
      } else {
        setResponse(res.data);
        setSessionId(res.data.sessionId);

        // Add to conversation history
        setConversationHistory((prev) => [
          ...prev,
          {
            type: "user",
            text: finalTranscript,
            confidence: res.data.confidence,
          },
          {
            type: "bot",
            text: res.data.message,
          },
        ]);

        console.log("✅ Action executed:", res.data.actionType); // Debug log

        // Speak bot response
        speakResponse(res.data.message);

        // AGENT MODE: Handle navigation if provided
        if (res.data.navigateTo) {
          setTimeout(() => {
            handleNavigation(res.data.navigateTo);
          }, 1500);
        }

        // AGENT MODE: Auto-reset after action execution
        if (res.data.actionExecuted) {
          setTimeout(() => {
            setResponse(null);
            setTranscript("");
            setError(null);
            recognitionInterimRef.current = "";
          }, 3000);
        }
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "⚠️ Error connecting to server";
      setError(errorMsg);
      console.error("API Error:", err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle navigation to dashboard sections (AGENT MODE feature)
  const handleNavigation = (section) => {
    // Dispatch custom event for TouristDashboard to listen to
    window.dispatchEvent(
      new CustomEvent("voiceNavigate", { detail: { section } })
    );

    // Speak confirmation
    const navigationMessages = {
      MyBookings: "Opening your bookings...",
      MyReviews: "Opening your reviews...",
      MyTravelogues: "Opening your travelogues...",
      Profile: "Opening your profile...",
      ExploreDestinations: "Opening explore destinations...",
    };

    speakResponse(navigationMessages[section] || "Navigating...");
  };

  // Confirm action
  const handleConfirmAction = async (confirmation) => {
    if (!response) return;

    try {
      const res = await api.post("/voiceAssistant/confirm-action", {
        action: response.action,
        metadata: response.metadata,
        confirmation: confirmation,
      });

      if (res.data.success) {
        speakResponse(res.data.message);

        // Add to history
        setConversationHistory((prev) => [
          ...prev,
          {
            type: "bot",
            text: res.data.message,
          },
        ]);

        // Reset after success
        setTimeout(() => {
          setResponse(null);
          setTranscript("");
          setAwaitingConfirmation(false);
          setError(null);
        }, 2000);
      } else {
        speakResponse(res.data.message);
        setResponse(null);
        setAwaitingConfirmation(false);
      }
    } catch (err) {
      const errorMsg =
        err.response?.data?.message || "Error confirming action";
      setError(errorMsg);
    }
  };

  // Text to speech
  const speakResponse = (text) => {
    if (!audioFeedback) return;

    // Cancel any ongoing speech
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 0.7;
    synthRef.current.speak(utterance);
  };

  // Toggle dialog
  const toggleDialog = () => {
    if (!isOpen) {
      setConversationHistory([]);
      setResponse(null);
      setError(null);
      setTranscript("");
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      {/* Floating Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.5 }}
        className="voice-assistant-fab"
      >
        <IconButton
          onClick={toggleDialog}
          className={`va-fab-button ${isOpen ? "active" : ""}`}
          sx={{
            width: 60,
            height: 60,
            backgroundColor: isOpen ? "#667eea" : "#667eea",
            color: "white",
            "&:hover": {
              backgroundColor: "#764ba2",
              transform: "scale(1.1)",
            },
            boxShadow: "0 4px 20px rgba(102, 126, 234, 0.4)",
          }}
        >
          <Mic sx={{ fontSize: 28 }} />
        </IconButton>
      </motion.div>

      {/* Main Dialog */}
      <Dialog
        open={isOpen}
        onClose={toggleDialog}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            backdropFilter: "blur(10px)",
            backgroundColor: "rgba(255, 255, 255, 0.95)",
          },
        }}
      >
        {/* Header */}
        <Box
          sx={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              🎤 AI Voice Assistant
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9 }}>
              Talk to book guides, create reviews, write travelogues
            </Typography>
          </Box>
          <IconButton
            onClick={toggleDialog}
            sx={{ color: "white" }}
            size="small"
          >
            <Close />
          </IconButton>
        </Box>

        {/* Content */}
        <Box sx={{ p: 3, minHeight: 400, display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Conversation History - ADVANCED */}
          {conversationHistory.length > 0 && (
            <Box
              sx={{
                maxHeight: 180,
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: 1,
                mb: 2,
                p: 1,
                backgroundColor: "#fafafa",
                borderRadius: 1,
              }}
            >
              {conversationHistory.map((msg, idx) => (
                <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                  <Box
                    sx={{
                      p: 1.2,
                      borderRadius: 1.5,
                      backgroundColor:
                        msg.type === "user" ? "#e8f5e9" : "#e3f2fd",
                      borderLeft:
                        msg.type === "user"
                          ? "4px solid #4caf50"
                          : "4px solid #667eea",
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: msg.type === "user" ? "#2e7d32" : "#1565c0" }}>
                        {msg.type === "user" ? "👤 You" : "🤖 Bot"}
                      </Typography>
                      {msg.confidence && (
                        <Typography variant="caption" sx={{ color: msg.confidence > 70 ? "#4caf50" : "#f57c00" }}>
                          {msg.confidence > 70 ? "✓" : "⚠"} {msg.confidence}%
                        </Typography>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ color: "#333", mt: 0.5 }}>
                      {msg.text}
                    </Typography>
                  </Box>
                </motion.div>
              ))}
            </Box>
          )}

          {/* Listening State */}
          {!response && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flex: 1 }}>
              {/* Microphone Button */}
              <motion.div
                animate={isListening ? { scale: [1, 1.05, 1] } : {}}
                transition={{ duration: 1, repeat: isListening ? Infinity : 0 }}
              >
                <Button
                  onClick={
                    isListening ? handleStopListening : handleStartListening
                  }
                  disabled={isProcessing}
                  fullWidth
                  variant="contained"
                  sx={{
                    py: 3,
                    fontSize: 16,
                    fontWeight: 600,
                    backgroundColor: isListening
                      ? "#ff6b6b"
                      : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    "&:hover": {
                      backgroundColor: isListening ? "#ff5252" : "#667eea",
                    },
                  }}
                  startIcon={isListening ? <MicOff /> : <Mic />}
                >
                  {isListening
                    ? "🎙️ Listening... Tap to Stop"
                    : "🎤 Tap to Speak"}
                </Button>
              </motion.div>

              {/* Transcript Display */}
              <AnimatePresence>
                {(transcript || recognitionInterimRef.current) && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                  >
                    <Paper
                      sx={{
                        p: 2,
                        backgroundColor: "#f9f9f9",
                        border: "2px solid #667eea",
                        borderRadius: 2,
                      }}
                    >
                      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                        <Typography variant="body2" sx={{ color: "#666", fontWeight: 600 }}>
                          🎙️ You're saying:
                        </Typography>
                        {recognitionInterimRef.current && (
                          <Typography variant="caption" sx={{ color: "#f57c00", fontStyle: "italic" }}>
                            Still listening...
                          </Typography>
                        )}
                      </Box>
                      <Paper
                        sx={{
                          p: 1.5,
                          backgroundColor: "#fff",
                          border: "1px solid #e0e0e0",
                          borderRadius: 1,
                          mb: 1,
                        }}
                      >
                        <Typography
                          variant="body1"
                          sx={{
                            fontSize: 16,
                            fontWeight: 500,
                            color: "#222",
                            lineHeight: 1.5,
                          }}
                        >
                          {transcript || "(no words captured yet)"}
                          {recognitionInterimRef.current && (
                            <span style={{ opacity: 0.5, fontStyle: "italic" }}>
                              {" "}{recognitionInterimRef.current}
                            </span>
                          )}
                        </Typography>
                      </Paper>
                      <Box sx={{ mt: 1, display: "flex", gap: 1 }}>
                        <Button
                          size="small"
                          variant="contained"
                          onClick={handleProcessSpeech}
                          disabled={isProcessing || !transcript.trim()}
                          startIcon={
                            isProcessing ? (
                              <CircularProgress size={16} />
                            ) : null
                          }
                          sx={{
                            backgroundColor: "#667eea",
                            "&:hover": { backgroundColor: "#5568d3" },
                          }}
                        >
                          {isProcessing ? "Processing..." : "✓ Send"}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setTranscript("");
                            recognitionInterimRef.current = "";
                          }}
                        >
                          ✕ Clear
                        </Button>
                      </Box>
                    </Paper>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Example Commands - ADVANCED */}
              {commands && !transcript && (
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1.5 }}>
                    <Lightbulb sx={{ color: "#ffc107", fontSize: 20 }} />
                    <Typography
                      variant="subtitle2"
                      sx={{ fontWeight: 700, color: "#333" }}
                    >
                      💡 Quick Commands:
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    {commands.booking &&
                      commands.booking[0] && (
                        <Chip
                          icon={<span>📍</span>}
                          label={commands.booking[0]}
                          size="medium"
                          variant="outlined"
                          onClick={() => {
                            setTranscript(commands.booking[0]);
                          }}
                          sx={{
                            justifyContent: "flex-start",
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "#f0f0f0",
                              borderColor: "#667eea",
                            },
                          }}
                        />
                      )}
                    {commands.review &&
                      commands.review[0] && (
                        <Chip
                          icon={<span>⭐</span>}
                          label={commands.review[0]}
                          size="medium"
                          variant="outlined"
                          onClick={() => {
                            setTranscript(commands.review[0]);
                          }}
                          sx={{
                            justifyContent: "flex-start",
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "#f0f0f0",
                              borderColor: "#667eea",
                            },
                          }}
                        />
                      )}
                    {commands.travelogue &&
                      commands.travelogue[0] && (
                        <Chip
                          icon={<span>✍️</span>}
                          label={commands.travelogue[0]}
                          size="medium"
                          variant="outlined"
                          onClick={() => {
                            setTranscript(commands.travelogue[0]);
                          }}
                          sx={{
                            justifyContent: "flex-start",
                            cursor: "pointer",
                            "&:hover": {
                              backgroundColor: "#f0f0f0",
                              borderColor: "#667eea",
                            },
                          }}
                        />
                      )}
                  </Box>
                </Box>
              )}
            </Box>
          )}

          {/* Response State - Guide Suggestions */}
          {response && response.suggestedGuides && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Box>
                <Typography
                  variant="body2"
                  sx={{ mb: 2, color: "#333", fontWeight: 500 }}
                >
                  {response.message}
                </Typography>

                <Grid container spacing={1}>
                  {response.suggestedGuides.map((guide) => (
                    <Grid item xs={12} key={guide.id}>
                      <Card
                        sx={{
                          cursor: "pointer",
                          border: "2px solid transparent",
                          "&:hover": {
                            borderColor: "#667eea",
                            boxShadow: 2,
                          },
                        }}
                        onClick={() => {
                          setResponse({
                            ...response,
                            metadata: {
                              ...response.metadata,
                              selectedGuideId: guide.id,
                              selectedGuideName: guide.guideName,
                            },
                          });
                        }}
                      >
                        <CardContent sx={{ p: 1.5 }}>
                          <Typography
                            variant="subtitle2"
                            sx={{ fontWeight: 600 }}
                          >
                            {guide.guideName}
                          </Typography>
                          <Typography variant="caption" sx={{ color: "#666" }}>
                            ⭐ {guide.rating} | {guide.experience}+ years |₹
                            {guide.pricePerDay}/day
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </motion.div>
          )}

          {/* Response State - Preview */}
          {response && response.preview && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Paper sx={{ p: 2, backgroundColor: "#f5f7ff" }}>
                <Typography variant="body2" sx={{ mb: 2, fontWeight: 600 }}>
                  {response.message}
                </Typography>

                <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#666" }}>
                      Guide:
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {response.preview.guideName}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#666" }}>
                      Rating:
                    </Typography>
                    <Typography variant="body2">
                      {"⭐".repeat(response.preview.rating)}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: "#666" }}>
                      Review:
                    </Typography>
                    <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                      {response.preview.comment}
                    </Typography>
                  </Box>
                </Box>
              </Paper>
            </motion.div>
          )}

          {/* Action Executed Success State - AGENT MODE */}
          {response && response.actionExecuted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: "#e8f5e9",
                  border: "2px solid #4caf50",
                  textAlign: "center",
                }}
              >
                <CheckCircle sx={{ color: "#4caf50", fontSize: 40, mb: 1 }} />
                <Typography variant="h6" sx={{ color: "#2e7d32", mb: 1 }}>
                  ✅ Action Executed!
                </Typography>
                <Typography variant="body2" sx={{ color: "#555" }}>
                  {response.message}
                </Typography>
              </Box>
            </motion.div>
          )}

          {/* Processing Indicator */}
          {isProcessing && (
            <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
              <CircularProgress size={40} />
            </Box>
          )}
        </Box>

        {/* Footer - ADVANCED */}
        <Box
          sx={{
            p: 2,
            backgroundColor: "#f5f5f5",
            borderTop: "1px solid #e0e0e0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography variant="caption" sx={{ color: "#666", fontWeight: 500 }}>
              🎤 Speak naturally
            </Typography>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              size="small"
              variant="text"
              onClick={() => setAudioFeedback(!audioFeedback)}
              startIcon={audioFeedback ? <VolumeUp /> : <Mic />}
              sx={{
                color: audioFeedback ? "#667eea" : "#999",
                "&:hover": {
                  backgroundColor: "transparent",
                  color: "#667eea",
                },
              }}
            >
              {audioFeedback ? "🔊 On" : "🔇 Off"}
            </Button>
          </Box>
        </Box>
      </Dialog>
    </>
  );
};

export default VoiceAssistant;
