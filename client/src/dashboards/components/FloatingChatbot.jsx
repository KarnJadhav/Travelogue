import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  TextField,
  Tooltip,
  CircularProgress,
  Chip,
  Stack,
} from '@mui/material';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import { sendTouristAgentCommand } from '../../services/touristAgentService';

const createMessage = (role, text, data = null) => ({
  id: `${Date.now()}-${Math.random()}`,
  role,
  text,
  data,
});

const GREETING =
  'I can help with voice and text commands: book guides, suggest best guides, open chat by name, create reviews, and build itineraries.';

export default function FloatingChatbot({ onAgentAction }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(true);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [input, setInput] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [messages, setMessages] = useState(() => [createMessage('assistant', GREETING)]);

  const recognitionRef = useRef(null);
  const spokenReplyRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const voiceDraftRef = useRef('');

  const canSend = useMemo(() => input.trim().length > 0 && !isLoading, [input, isLoading]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      setVoiceSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
      voiceDraftRef.current = '';
    };

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      voiceDraftRef.current = transcript.trim();
      if (voiceDraftRef.current) {
        setInput(voiceDraftRef.current);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (voiceDraftRef.current) {
        sendCommand(voiceDraftRef.current);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return () => {
      recognitionRef.current?.stop?.();
    };
  }, []);

  const speakReply = (text) => {
    if (!voiceOutputEnabled || !spokenReplyRef.current || !text) return;
    try {
      spokenReplyRef.current.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1;
      utterance.pitch = 1;
      utterance.volume = 0.9;
      spokenReplyRef.current.speak(utterance);
    } catch {
      // ignore speech errors
    }
  };

  const resetConversation = () => {
    setMessages([createMessage('assistant', GREETING)]);
    setPendingAction(null);
    setInput('');
    setIsMinimized(false);
    voiceDraftRef.current = '';
  };

  const sendCommand = async (rawCommand = input) => {
    const command = rawCommand.trim();
    if (!command || isLoading) return;

    setInput('');
    setIsLoading(true);
    setMessages((prev) => [...prev, createMessage('user', command)]);

    try {
      const data = await sendTouristAgentCommand({
        command,
        pendingAction,
      });

      if (data?.reply) {
        setMessages((prev) => [...prev, createMessage('assistant', data.reply, data?.data || null)]);
        speakReply(data.reply);
      }

      setPendingAction(data?.pendingAction || null);

      if (data?.action && typeof onAgentAction === 'function') {
        onAgentAction(data.action);
      }
    } catch {
      const fallback = 'I am temporarily unavailable. Please try again.';
      setMessages((prev) => [...prev, createMessage('assistant', fallback)]);
      speakReply(fallback);
    } finally {
      setIsLoading(false);
      voiceDraftRef.current = '';
    }
  };

  const toggleVoiceInput = () => {
    if (!voiceSupported || !recognitionRef.current || isLoading) return;
    if (isListening) {
      recognitionRef.current.stop();
      return;
    }
    recognitionRef.current.start();
  };

  return (
    <>
      {!isOpen && (
        <Tooltip title="Open Tourist Agent" placement="left">
          <IconButton
            onClick={() => {
              setIsOpen(true);
              setIsMinimized(false);
            }}
            sx={{
              position: 'fixed',
              right: 20,
              bottom: 20,
              zIndex: 1300,
              width: 60,
              height: 60,
              color: '#ffffff',
              background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
              boxShadow: '0 14px 28px rgba(15, 118, 110, 0.32)',
              '&:hover': {
                background: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
              },
            }}
          >
            <SmartToyRoundedIcon />
          </IconButton>
        </Tooltip>
      )}

      {isOpen && (
        <Paper
          elevation={0}
          sx={{
            position: 'fixed',
            right: 20,
            bottom: 20,
            zIndex: 1300,
            width: { xs: 'calc(100vw - 24px)', sm: 420 },
            maxWidth: 420,
            borderRadius: 3,
            overflow: 'hidden',
            border: '1px solid rgba(15, 23, 42, 0.12)',
            boxShadow: '0 24px 45px rgba(15, 23, 42, 0.25)',
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1.4,
              color: '#f8fafc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #0f172a, #1e293b)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SmartToyRoundedIcon sx={{ fontSize: 20 }} />
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Tourist Agent Voice</Typography>
              {isListening && <Chip size="small" label="Listening" sx={{ color: '#0f172a', bgcolor: '#a7f3d0', fontWeight: 700 }} />}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <Tooltip title={voiceOutputEnabled ? 'Mute voice output' : 'Enable voice output'}>
                <IconButton size="small" onClick={() => setVoiceOutputEnabled((prev) => !prev)} sx={{ color: '#f8fafc' }}>
                  {voiceOutputEnabled ? <VolumeUpRoundedIcon fontSize="small" /> : <VolumeOffRoundedIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Reset chat">
                <IconButton size="small" onClick={resetConversation} sx={{ color: '#f8fafc' }}>
                  <RestartAltRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={isMinimized ? 'Expand' : 'Minimize'}>
                <IconButton size="small" onClick={() => setIsMinimized((prev) => !prev)} sx={{ color: '#f8fafc' }}>
                  <RemoveRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Close">
                <IconButton size="small" onClick={() => setIsOpen(false)} sx={{ color: '#f8fafc' }}>
                  <CloseRoundedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {!isMinimized && (
            <>
              <Box
                sx={{
                  p: 1.5,
                  height: 360,
                  overflowY: 'auto',
                  bgcolor: '#f8fafc',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1,
                }}
              >
                {messages.map((message) => {
                  const isUser = message.role === 'user';
                  const suggestions = message?.data?.suggestedGuides || [];
                  return (
                    <Box key={message.id} sx={{ alignSelf: isUser ? 'flex-end' : 'flex-start', maxWidth: '94%' }}>
                      <Box
                        sx={{
                          px: 1.3,
                          py: 1,
                          borderRadius: 2,
                          borderBottomRightRadius: isUser ? 0.5 : 2,
                          borderBottomLeftRadius: isUser ? 2 : 0.5,
                          color: isUser ? '#f8fafc' : '#0f172a',
                          background: isUser ? 'linear-gradient(135deg, #0f766e, #14b8a6)' : '#ffffff',
                          border: isUser ? 'none' : '1px solid #e2e8f0',
                          boxShadow: isUser ? '0 10px 20px rgba(15, 118, 110, 0.25)' : '0 6px 18px rgba(15, 23, 42, 0.08)',
                        }}
                      >
                        <Typography sx={{ fontSize: '0.9rem', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {message.text}
                        </Typography>
                      </Box>
                      {!isUser && suggestions.length > 0 && (
                        <Stack spacing={0.6} sx={{ mt: 0.6, ml: 0.4 }}>
                          {suggestions.slice(0, 3).map((guide, idx) => (
                            <Chip
                              key={`${message.id}-guide-${idx}`}
                              size="small"
                              label={`${idx + 1}. ${guide.guideName} | ${guide.rating} | ₹${guide.price}/${guide.rateType}`}
                              onClick={() => sendCommand(`book ${guide.guideName}`)}
                              sx={{ justifyContent: 'flex-start', maxWidth: '100%', fontWeight: 700 }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>
                  );
                })}
                {isLoading && (
                  <Box sx={{ alignSelf: 'flex-start', px: 1, py: 0.4 }}>
                    <CircularProgress size={18} />
                  </Box>
                )}
              </Box>

              <Box
                sx={{
                  p: 1.2,
                  borderTop: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                  display: 'flex',
                  alignItems: 'flex-end',
                  gap: 1,
                }}
              >
                <Tooltip title={voiceSupported ? (isListening ? 'Stop voice input' : 'Start voice input') : 'Voice input not supported'}>
                  <span>
                    <IconButton
                      onClick={toggleVoiceInput}
                      disabled={!voiceSupported || isLoading}
                      sx={{
                        width: 40,
                        height: 40,
                        color: '#ffffff',
                        background: isListening
                          ? 'linear-gradient(135deg, #dc2626, #ef4444)'
                          : 'linear-gradient(135deg, #334155, #475569)',
                        '&:hover': {
                          background: isListening
                            ? 'linear-gradient(135deg, #b91c1c, #dc2626)'
                            : 'linear-gradient(135deg, #1e293b, #334155)',
                        },
                      }}
                    >
                      {isListening ? <MicOffRoundedIcon fontSize="small" /> : <MicRoundedIcon fontSize="small" />}
                    </IconButton>
                  </span>
                </Tooltip>

                <TextField
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      sendCommand();
                    }
                  }}
                  placeholder='Try voice or type: "open pranav"'
                  multiline
                  minRows={1}
                  maxRows={3}
                  size="small"
                  fullWidth
                />

                <IconButton
                  onClick={() => sendCommand()}
                  disabled={!canSend}
                  sx={{
                    width: 40,
                    height: 40,
                    color: '#ffffff',
                    background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
                    '&:hover': {
                      background: 'linear-gradient(135deg, #0d9488, #2dd4bf)',
                    },
                    '&.Mui-disabled': {
                      background: '#cbd5e1',
                      color: '#f1f5f9',
                    },
                  }}
                >
                  <SendRoundedIcon fontSize="small" />
                </IconButton>
              </Box>
            </>
          )}
        </Paper>
      )}
    </>
  );
}
