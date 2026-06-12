import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Chip,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import MicRoundedIcon from '@mui/icons-material/MicRounded';
import MicOffRoundedIcon from '@mui/icons-material/MicOffRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import VolumeUpRoundedIcon from '@mui/icons-material/VolumeUpRounded';
import VolumeOffRoundedIcon from '@mui/icons-material/VolumeOffRounded';
import PauseCircleRoundedIcon from '@mui/icons-material/PauseCircleRounded';
import PlayCircleRoundedIcon from '@mui/icons-material/PlayCircleRounded';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import CircleIcon from '@mui/icons-material/Circle';
import { AnimatePresence, motion } from 'framer-motion';
import { jsPDF } from 'jspdf';
import { streamGuideAnswer } from '../../services/guideChatService';

const GREETING_MESSAGE =
  'Hi, I am your virtual local guide. Ask me about any destination and I will help with weather, places, food, culture, and smart travel tips.';
const GUIDE_UNAVAILABLE = 'Guide is temporarily unavailable';
const MAX_CONTEXT_MESSAGES = 10;
const MotionSpan = motion.span;
const MotionDiv = motion.div;

const TypingDots = ({ color }) => (
  <Stack direction="row" spacing={0.6} alignItems="center">
    {[0, 1, 2].map((index) => (
      <MotionSpan
        key={`dot-${index}`}
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          display: 'inline-block',
          backgroundColor: color,
        }}
        animate={{ opacity: [0.35, 1, 0.35], y: [0, -2, 0] }}
        transition={{ duration: 0.9, repeat: Infinity, delay: index * 0.12 }}
      />
    ))}
  </Stack>
);

const formatMessageTime = (timestamp) =>
  new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const HEADING_REGEX = /^(#{1,6})\s+(.+)$/;
const BULLET_REGEX = /^[-*]\s+(.+)$/;
const NUMBERED_REGEX = /^\d+\.\s+(.+)$/;

const cleanInlineMarkdown = (value = '') =>
  String(value || '')
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .replace(/~~([^~]+)~~/g, '$1')
    .replace(/^\s*>\s*/g, '')
    .replace(/\s+/g, ' ')
    .trim();

const replaceSpecialChars = (value = '') => {
  let text = String(value || '');
  const replacements = {
    '\u2018': "'",
    '\u2019': "'",
    '\u201c': '"',
    '\u201d': '"',
    '\u2013': '-',
    '\u2014': '-',
    '\u2026': '...',
    '\u2022': '-',
    '\u00b0': ' deg ',
    '\u20b9': 'Rs ',
    '\u00a0': ' ',
    '\u200b': '',
    '\u200c': '',
    '\u200d': '',
    '\ufeff': '',
  };

  Object.entries(replacements).forEach(([key, replacement]) => {
    text = text.split(key).join(replacement);
  });
  return text;
};

const collapseSpacedLetters = (value = '') =>
  String(value || '').replace(/\b(?:[A-Za-z]\s+){3,}[A-Za-z]\b/g, (match) => match.replace(/\s+/g, ''));

const toPdfSafeText = (value = '') =>
  collapseSpacedLetters(replaceSpecialChars(value))
    .replace(/[^\n\x20-\x7E]/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .trim();

const isTableLine = (line = '') => {
  const trimmed = line.trim();
  return Boolean(trimmed) && trimmed.includes('|') && trimmed.split('|').length >= 3;
};

const isMarkdownTableDivider = (line = '') => {
  const trimmed = line.trim();
  return Boolean(trimmed) && /^[:|\s-]+$/.test(trimmed) && trimmed.includes('-');
};

const isDividerLine = (line = '') => {
  const compact = line.replace(/\s/g, '');
  return /^[-*_]{3,}$/.test(compact);
};

const parseTableRow = (line = '') =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cleanInlineMarkdown(cell));

const parseGuideBlocks = (content = '') => {
  const lines = String(content || '').replace(/\r/g, '').split('\n');
  const blocks = [];
  const isStructureLine = (line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    return (
      HEADING_REGEX.test(trimmed) ||
      BULLET_REGEX.test(trimmed) ||
      NUMBERED_REGEX.test(trimmed) ||
      isTableLine(trimmed) ||
      isDividerLine(trimmed)
    );
  };

  let index = 0;
  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      index += 1;
      continue;
    }

    if (isTableLine(trimmed)) {
      const tableLines = [];
      while (index < lines.length && isTableLine(lines[index].trim())) {
        tableLines.push(lines[index].trim());
        index += 1;
      }

      const normalizedRows = tableLines
        .filter((line) => !isMarkdownTableDivider(line))
        .map(parseTableRow)
        .filter((row) => row.some(Boolean));

      if (normalizedRows.length > 1) {
        blocks.push({
          type: 'table',
          header: normalizedRows[0],
          rows: normalizedRows.slice(1),
        });
      } else if (normalizedRows.length === 1) {
        blocks.push({ type: 'paragraph', text: normalizedRows[0].join(' | ') });
      }
      continue;
    }

    const headingMatch = trimmed.match(HEADING_REGEX);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: cleanInlineMarkdown(headingMatch[2]),
      });
      index += 1;
      continue;
    }

    if (isDividerLine(trimmed)) {
      blocks.push({ type: 'divider' });
      index += 1;
      continue;
    }

    const bulletMatch = trimmed.match(BULLET_REGEX);
    const numberedMatch = trimmed.match(NUMBERED_REGEX);
    if (bulletMatch || numberedMatch) {
      const ordered = Boolean(numberedMatch);
      const items = [];

      while (index < lines.length) {
        const listLine = lines[index].trim();
        if (!listLine) {
          index += 1;
          continue;
        }

        const currentMatch = ordered ? listLine.match(NUMBERED_REGEX) : listLine.match(BULLET_REGEX);
        if (currentMatch) {
          items.push(cleanInlineMarkdown(currentMatch[1]));
          index += 1;
          continue;
        }

        if (items.length && !isStructureLine(listLine)) {
          items[items.length - 1] = `${items[items.length - 1]} ${cleanInlineMarkdown(listLine)}`.trim();
          index += 1;
          continue;
        }
        break;
      }

      if (items.length) {
        blocks.push({ type: 'list', ordered, items });
      }
      continue;
    }

    let paragraph = cleanInlineMarkdown(trimmed);
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index].trim();
      if (!nextLine || isStructureLine(nextLine)) break;
      paragraph = `${paragraph} ${cleanInlineMarkdown(nextLine)}`.trim();
      index += 1;
    }

    if (paragraph) {
      blocks.push({ type: 'paragraph', text: paragraph });
    }
  }

  return blocks;
};

const buildGuideTextForPdf = (content = '') => {
  const blocks = parseGuideBlocks(content);
  if (!blocks.length) return toPdfSafeText(cleanInlineMarkdown(content));

  const normalizedText = blocks
    .map((block) => {
      if (block.type === 'heading') return block.text;
      if (block.type === 'paragraph') return block.text;
      if (block.type === 'divider') return '--------------------------------------------------';
      if (block.type === 'list') {
        return block.items
          .map((item, idx) => `${block.ordered ? `${idx + 1}.` : '-'} ${item}`)
          .join('\n');
      }
      if (block.type === 'table') {
        const headerLine = block.header.join(' | ');
        const rowLines = block.rows.map((row) =>
          block.header.map((_, index) => row[index] || '-').join(' | ')
        );
        return [headerLine, ...rowLines].join('\n');
      }
      return '';
    })
    .filter(Boolean)
    .join('\n\n');

  return toPdfSafeText(normalizedText);
};

const buildGuideTextForSpeech = (content = '') => {
  const blocks = parseGuideBlocks(content);
  const rawText = blocks.length
    ? blocks
        .map((block) => {
          if (block.type === 'heading') return `${block.text}.`;
          if (block.type === 'paragraph') return block.text;
          if (block.type === 'divider') return '';
          if (block.type === 'list') return block.items.map((item) => `- ${item}`).join('. ');
          if (block.type === 'table') {
            return block.rows
              .map((row) =>
                block.header
                  .map((headerCell, index) => `${headerCell}: ${row[index] || '-'}`)
                  .join('. ')
              )
              .join('. ');
          }
          return '';
        })
        .filter(Boolean)
        .join('\n')
    : cleanInlineMarkdown(content);

  return replaceSpecialChars(rawText)
    .replace(/\s+/g, ' ')
    .replace(/[-]{2,}/g, '. ')
    .trim();
};

const splitSpeechIntoChunks = (text = '', maxLength = 210) => {
  const normalized = String(text || '').trim();
  if (!normalized) return [];

  const sentences = normalized
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const chunks = [];
  let current = '';

  const pushCurrent = () => {
    if (current.trim()) {
      chunks.push(current.trim());
      current = '';
    }
  };

  sentences.forEach((sentence) => {
    if (sentence.length > maxLength) {
      pushCurrent();
      const words = sentence.split(/\s+/);
      let longChunk = '';
      words.forEach((word) => {
        const candidate = longChunk ? `${longChunk} ${word}` : word;
        if (candidate.length > maxLength) {
          if (longChunk) chunks.push(longChunk.trim());
          longChunk = word;
        } else {
          longChunk = candidate;
        }
      });
      if (longChunk.trim()) chunks.push(longChunk.trim());
      return;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length > maxLength) {
      pushCurrent();
      current = sentence;
    } else {
      current = candidate;
    }
  });

  pushCurrent();
  return chunks;
};

const pickBestVoice = (voices = []) => {
  if (!Array.isArray(voices) || !voices.length) return null;
  const englishVoices = voices.filter((voice) =>
    String(voice?.lang || '').toLowerCase().startsWith('en')
  );
  const pool = englishVoices.length ? englishVoices : voices;

  const scoreVoice = (voice) => {
    const name = String(voice?.name || '').toLowerCase();
    let score = 0;
    if (name.includes('neural')) score += 4;
    if (name.includes('natural')) score += 4;
    if (name.includes('google')) score += 3;
    if (name.includes('microsoft')) score += 3;
    if (name.includes('female')) score += 2;
    if (voice?.default) score += 1;
    return score;
  };

  return pool.reduce((best, current) => (scoreVoice(current) > scoreVoice(best) ? current : best), pool[0]);
};

const FormattedGuideMessage = ({ content, palette, isError }) => {
  const blocks = useMemo(() => parseGuideBlocks(content), [content]);
  if (isError) {
    return (
      <Typography sx={{ fontSize: '0.95rem', lineHeight: 1.5, fontWeight: 600, color: '#ef4444' }}>
        {content}
      </Typography>
    );
  }

  if (!blocks.length) {
    return (
      <Typography sx={{ fontSize: '0.95rem', lineHeight: 1.5, fontWeight: 500, whiteSpace: 'pre-wrap' }}>
        {cleanInlineMarkdown(content)}
      </Typography>
    );
  }

  return (
    <Stack spacing={1}>
      {blocks.map((block, blockIndex) => {
        const key = `${block.type}-${blockIndex}`;

        if (block.type === 'heading') {
          const fontSize =
            block.level <= 1 ? '1.05rem' : block.level === 2 ? '1rem' : '0.95rem';
          return (
            <Typography key={key} sx={{ fontWeight: 800, fontSize }}>
              {block.text}
            </Typography>
          );
        }

        if (block.type === 'paragraph') {
          return (
            <Typography key={key} sx={{ fontSize: '0.95rem', lineHeight: 1.55, fontWeight: 500 }}>
              {block.text}
            </Typography>
          );
        }

        if (block.type === 'divider') {
          return (
            <Box
              key={key}
              sx={{
                height: 1,
                backgroundColor: palette.assistantBorder,
                my: 0.4,
              }}
            />
          );
        }

        if (block.type === 'list') {
          return (
            <Box
              key={key}
              component={block.ordered ? 'ol' : 'ul'}
              sx={{ m: 0, pl: 2.5, '& li': { mb: 0.45, lineHeight: 1.5 } }}
            >
              {block.items.map((item, itemIndex) => (
                <li key={`${key}-item-${itemIndex}`}>
                  <Typography component="span" sx={{ fontSize: '0.94rem', fontWeight: 500 }}>
                    {item}
                  </Typography>
                </li>
              ))}
            </Box>
          );
        }

        if (block.type === 'table') {
          return (
            <TableContainer
              key={key}
              sx={{
                borderRadius: '12px',
                border: `1px solid ${palette.assistantBorder}`,
                overflow: 'hidden',
                backgroundColor: 'rgba(148, 163, 184, 0.08)',
              }}
            >
              <Table size="small" aria-label="Guide response table">
                <TableHead>
                  <TableRow>
                    {block.header.map((cell, cellIndex) => (
                      <TableCell
                        key={`${key}-head-${cellIndex}`}
                        sx={{
                          fontWeight: 800,
                          color: palette.textPrimary,
                          backgroundColor: 'rgba(148, 163, 184, 0.12)',
                          borderBottom: `1px solid ${palette.assistantBorder}`,
                        }}
                      >
                        {cell || '-'}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {block.rows.map((row, rowIndex) => (
                    <TableRow key={`${key}-row-${rowIndex}`}>
                      {block.header.map((_, columnIndex) => (
                        <TableCell
                          key={`${key}-row-${rowIndex}-col-${columnIndex}`}
                          sx={{ color: palette.textPrimary, verticalAlign: 'top', fontWeight: 500 }}
                        >
                          {row[columnIndex] || '-'}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          );
        }

        return null;
      })}
    </Stack>
  );
};

export default function VirtualGuide() {
  const [isDark, setIsDark] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'guide-greeting',
      role: 'assistant',
      content: GREETING_MESSAGE,
      createdAt: Date.now(),
    },
  ]);
  const [draft, setDraft] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedVoiceName, setSelectedVoiceName] = useState('Auto');

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const speechRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);
  const speechVoiceRef = useRef(null);
  const speechGenerationRef = useRef(0);
  const sendDebounceRef = useRef(null);
  const streamAbortRef = useRef(null);

  const palette = useMemo(
    () =>
      isDark
        ? {
            pageBg: 'linear-gradient(145deg, #0f172a 0%, #111827 100%)',
            shell: 'rgba(15, 23, 42, 0.86)',
            shellBorder: 'rgba(148, 163, 184, 0.22)',
            textPrimary: '#e2e8f0',
            textSecondary: '#94a3b8',
            assistantBubble: 'rgba(30, 41, 59, 0.82)',
            assistantBorder: 'rgba(148, 163, 184, 0.22)',
            userBubble: 'linear-gradient(135deg, #0ea5a4, #14b8a6)',
            inputBg: 'rgba(15, 23, 42, 0.72)',
            inputBorder: 'rgba(148, 163, 184, 0.28)',
            typingDot: '#cbd5e1',
          }
        : {
            pageBg: 'linear-gradient(145deg, #e0f2fe 0%, #f8fafc 35%, #dbeafe 100%)',
            shell: 'rgba(255, 255, 255, 0.86)',
            shellBorder: 'rgba(15, 23, 42, 0.1)',
            textPrimary: '#0f172a',
            textSecondary: '#475569',
            assistantBubble: 'rgba(255, 255, 255, 0.92)',
            assistantBorder: 'rgba(148, 163, 184, 0.28)',
            userBubble: 'linear-gradient(135deg, #0f766e, #0ea5a4)',
            inputBg: 'rgba(255, 255, 255, 0.82)',
            inputBorder: 'rgba(100, 116, 139, 0.28)',
            typingDot: '#334155',
          },
    [isDark]
  );

  const latestAssistantMessage = useMemo(
    () => [...messages].reverse().find((msg) => msg.role === 'assistant' && msg.content && !msg.isError),
    [messages]
  );
  const latestDownloadableMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find(
          (msg) =>
            msg.role === 'assistant' &&
            msg.content &&
            !msg.isError &&
            msg.id !== 'guide-greeting'
        ),
    [messages]
  );
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, showTyping]);

  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SpeechRecognition) return undefined;

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      if (!transcript) return;
      setDraft((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };

    recognition.onerror = () => {
      setErrorMessage(GUIDE_UNAVAILABLE);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return () => {
      recognition.stop();
      recognitionRef.current = null;
    };
  }, []);

  useEffect(() => {
    const synth = speechRef.current;
    if (!synth) return undefined;

    const applyBestVoice = () => {
      const voices = synth.getVoices?.() || [];
      const bestVoice = pickBestVoice(voices);
      if (bestVoice) {
        speechVoiceRef.current = bestVoice;
        setSelectedVoiceName(bestVoice.name || 'Auto');
      }
    };

    applyBestVoice();
    synth.onvoiceschanged = applyBestVoice;

    return () => {
      if (synth.onvoiceschanged === applyBestVoice) {
        synth.onvoiceschanged = null;
      }
    };
  }, []);

  useEffect(
    () => () => {
      if (sendDebounceRef.current) clearTimeout(sendDebounceRef.current);
      if (streamAbortRef.current) streamAbortRef.current.abort();
      if (speechRef.current) {
        speechGenerationRef.current += 1;
        speechRef.current.cancel();
      }
    },
    []
  );

  const speakMessage = (text) => {
    if (!text || isMuted || !speechRef.current) return;
    const synth = speechRef.current;
    const speechText = buildGuideTextForSpeech(text);
    const chunks = splitSpeechIntoChunks(speechText, 220);
    if (!chunks.length) return;

    speechGenerationRef.current += 1;
    const generationId = speechGenerationRef.current;
    synth.cancel();
    setIsPaused(false);

    const speakChunk = (index) => {
      if (generationId !== speechGenerationRef.current) return;
      if (index >= chunks.length) {
        setIsSpeaking(false);
        setIsPaused(false);
        return;
      }

      const utterance = new SpeechSynthesisUtterance(chunks[index]);
      if (speechVoiceRef.current) {
        utterance.voice = speechVoiceRef.current;
      }
      utterance.rate = 0.98;
      utterance.pitch = 1.02;
      utterance.volume = 1;

      utterance.onstart = () => {
        if (generationId !== speechGenerationRef.current) return;
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        if (generationId !== speechGenerationRef.current) return;
        if (synth.paused) return;
        speakChunk(index + 1);
      };

      utterance.onerror = () => {
        if (generationId !== speechGenerationRef.current) return;
        setIsSpeaking(false);
        setIsPaused(false);
      };

      synth.speak(utterance);
    };

    speakChunk(0);
  };

  const togglePauseSpeech = () => {
    if (!speechRef.current) return;
    if (speechRef.current.speaking && !speechRef.current.paused) {
      speechRef.current.pause();
      setIsPaused(true);
      return;
    }
    if (speechRef.current.paused) {
      speechRef.current.resume();
      setIsPaused(false);
    }
  };

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      if (next && speechRef.current) {
        speechGenerationRef.current += 1;
        speechRef.current.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
      }
      return next;
    });
  };

  const downloadLatestGuidePdf = () => {
    const sourceText = latestDownloadableMessage?.content || '';
    if (!sourceText.trim()) return;

    const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginX = 42;
    const bottomMargin = 46;
    const lineHeight = 15;
    let cursorY = 56;
    const blocks = parseGuideBlocks(sourceText);

    const writeWrappedText = (text, options = {}) => {
      const safeText = toPdfSafeText(text);
      if (!safeText) return;
      const {
        font = 'helvetica',
        style = 'normal',
        size = 11,
        color = [15, 23, 42],
        spacingAfter = 8,
        indent = 0,
      } = options;

      pdf.setFont(font, style);
      pdf.setFontSize(size);
      pdf.setTextColor(color[0], color[1], color[2]);
      const wrapped = pdf.splitTextToSize(safeText, pageWidth - marginX * 2 - indent);
      wrapped.forEach((line) => {
        if (cursorY > pageHeight - bottomMargin) {
          pdf.addPage();
          cursorY = 56;
          pdf.setDrawColor(226, 232, 240);
          pdf.line(marginX, 42, pageWidth - marginX, 42);
        }
        pdf.text(line, marginX + indent, cursorY);
        cursorY += lineHeight;
      });
      cursorY += spacingAfter;
    };

    pdf.setFillColor(15, 118, 110);
    pdf.roundedRect(marginX, 24, 12, 12, 2, 2, 'F');
    writeWrappedText('Virtual Guide Brief', { style: 'bold', size: 20, spacingAfter: 4 });
    writeWrappedText(`Generated on ${new Date().toLocaleString()}`, {
      size: 10,
      color: [71, 85, 105],
      spacingAfter: 12,
    });
    pdf.setDrawColor(226, 232, 240);
    pdf.line(marginX, cursorY - 4, pageWidth - marginX, cursorY - 4);
    cursorY += 6;

    if (!blocks.length) {
      writeWrappedText(buildGuideTextForPdf(sourceText), { size: 11, spacingAfter: 0 });
    } else {
      blocks.forEach((block) => {
        if (block.type === 'heading') {
          writeWrappedText(block.text, {
            style: 'bold',
            size: block.level <= 2 ? 14 : 12,
            spacingAfter: 6,
          });
          return;
        }

        if (block.type === 'paragraph') {
          writeWrappedText(block.text, { size: 11, spacingAfter: 8 });
          return;
        }

        if (block.type === 'divider') {
          pdf.setDrawColor(226, 232, 240);
          pdf.line(marginX, cursorY - 2, pageWidth - marginX, cursorY - 2);
          cursorY += 8;
          return;
        }

        if (block.type === 'list') {
          block.items.forEach((item, itemIndex) => {
            const prefix = block.ordered ? `${itemIndex + 1}. ` : '- ';
            writeWrappedText(`${prefix}${item}`, { size: 11, spacingAfter: 3, indent: 8 });
          });
          cursorY += 4;
          return;
        }

        if (block.type === 'table') {
          block.rows.forEach((row) => {
            const rowText = block.header
              .map((headerCell, index) => `${headerCell}: ${row[index] || '-'}`)
              .join(' | ');
            writeWrappedText(rowText, { size: 10.5, spacingAfter: 4, indent: 8 });
          });
          cursorY += 4;
        }
      });
    }

    const fileStamp = new Date().toISOString().replace(/[:.]/g, '-');
    pdf.save(`virtual-guide-${fileStamp}.pdf`);
  };

  const toggleMic = () => {
    if (!recognitionRef.current) {
      setErrorMessage(GUIDE_UNAVAILABLE);
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      return;
    }
    recognitionRef.current.start();
    setIsListening(true);
    setErrorMessage('');
  };

  const sendMessage = async () => {
    const query = draft.trim();
    if (!query || isStreaming) return;

    setErrorMessage('');
    setDraft('');
    setShowTyping(true);
    setIsStreaming(true);

    const now = Date.now();
    const userMessage = { id: `user-${now}`, role: 'user', content: query, createdAt: now };
    const assistantId = `assistant-${now + 1}`;
    const assistantMessage = { id: assistantId, role: 'assistant', content: '', createdAt: now + 1 };

    const contextHistory = [...messages, userMessage]
      .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
      .slice(-MAX_CONTEXT_MESSAGES)
      .map((msg) => ({ role: msg.role, content: msg.content }));

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    if (streamAbortRef.current) streamAbortRef.current.abort();
    const controller = new AbortController();
    streamAbortRef.current = controller;

    let streamError = '';
    let assistantText = '';
    let receivedToken = false;

    try {
      await streamGuideAnswer({
        query,
        history: contextHistory,
        signal: controller.signal,
        onEvent: ({ event, data }) => {
          if (event === 'token') {
            const token = typeof data === 'string' ? data : data?.token || '';
            if (!token) return;
            receivedToken = true;
            assistantText += token;
            setShowTyping(false);
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, content: `${msg.content}${token}` } : msg
              )
            );
            return;
          }

          if (event === 'error') {
            streamError = typeof data === 'string' ? data : data?.message || GUIDE_UNAVAILABLE;
            return;
          }

          if (event === 'done') {
            return;
          }
        },
      });

      if (streamError || !receivedToken || !assistantText.trim()) {
        throw new Error(streamError || GUIDE_UNAVAILABLE);
      }

      speakMessage(assistantText);
    } catch {
      if (controller.signal.aborted) return;
      setErrorMessage(GUIDE_UNAVAILABLE);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId ? { ...msg, content: GUIDE_UNAVAILABLE, isError: true } : msg
        )
      );
    } finally {
      setShowTyping(false);
      setIsStreaming(false);
      if (streamAbortRef.current === controller) {
        streamAbortRef.current = null;
      }
    }
  };

  const queueSend = () => {
    if (sendDebounceRef.current) clearTimeout(sendDebounceRef.current);
    sendDebounceRef.current = setTimeout(() => {
      sendMessage();
    }, 140);
  };

  return (
    <Box
      sx={{
        minHeight: { xs: 'calc(100vh - 120px)', md: 'calc(100vh - 170px)' },
        background: palette.pageBg,
        borderRadius: '28px',
        p: { xs: 1.5, sm: 2.5 },
        display: 'flex',
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          borderRadius: '24px',
          p: { xs: 1.2, sm: 1.8 },
          background: palette.shell,
          border: `1px solid ${palette.shellBorder}`,
          boxShadow: isDark
            ? '0 20px 45px rgba(2, 6, 23, 0.45)'
            : '0 20px 45px rgba(15, 23, 42, 0.13)',
          backdropFilter: 'blur(14px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 1.2,
        }}
      >
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} justifyContent="space-between">
          <Box>
            <Typography sx={{ color: palette.textPrimary, fontWeight: 800, fontSize: '1.3rem' }}>
              Virtual Guide
            </Typography>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
              <CircleIcon sx={{ color: '#22c55e', fontSize: 11 }} />
              <Typography sx={{ color: palette.textSecondary, fontSize: '0.86rem', fontWeight: 600 }}>
                AI Live
              </Typography>
            </Stack>
          </Box>

          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Tooltip title="Download latest guide response (PDF)">
              <span>
                <IconButton
                  onClick={downloadLatestGuidePdf}
                  disabled={!latestDownloadableMessage?.content}
                  sx={{ borderRadius: '12px', border: `1px solid ${palette.inputBorder}`, color: palette.textPrimary }}
                >
                  <DownloadRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={isMuted ? 'Unmute voice' : 'Mute voice'}>
              <IconButton
                onClick={toggleMute}
                sx={{ borderRadius: '12px', border: `1px solid ${palette.inputBorder}`, color: palette.textPrimary }}
              >
                {isMuted ? <VolumeOffRoundedIcon /> : <VolumeUpRoundedIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Play latest guide response">
              <span>
                <IconButton
                  onClick={() => speakMessage(latestAssistantMessage?.content || '')}
                  disabled={!latestAssistantMessage?.content}
                  sx={{ borderRadius: '12px', border: `1px solid ${palette.inputBorder}`, color: palette.textPrimary }}
                >
                  <PlayCircleRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={isPaused ? 'Resume voice' : 'Pause voice'}>
              <span>
                <IconButton
                  onClick={togglePauseSpeech}
                  disabled={!isSpeaking && !isPaused}
                  sx={{ borderRadius: '12px', border: `1px solid ${palette.inputBorder}`, color: palette.textPrimary }}
                >
                  <PauseCircleRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
              <IconButton
                onClick={() => setIsDark((prev) => !prev)}
                sx={{ borderRadius: '12px', border: `1px solid ${palette.inputBorder}`, color: palette.textPrimary }}
              >
                {isDark ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
              </IconButton>
            </Tooltip>
          </Stack>
        </Stack>

        {errorMessage && (
          <Box
            sx={{
              px: 1.5,
              py: 1,
              borderRadius: '12px',
              backgroundColor: 'rgba(239,68,68,0.12)',
              border: '1px solid rgba(239,68,68,0.32)',
              color: '#ef4444',
              fontWeight: 600,
              fontSize: '0.9rem',
            }}
          >
            {GUIDE_UNAVAILABLE}
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            minHeight: { xs: 360, md: 420 },
            maxHeight: { xs: 'calc(100vh - 340px)', md: 'calc(100vh - 300px)' },
            overflowY: 'auto',
            p: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.1,
          }}
        >
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <MotionDiv
                key={message.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start' }}
              >
                <Box
                  sx={{
                    maxWidth: { xs: '95%', sm: '80%' },
                    px: 1.6,
                    py: 1.2,
                    borderRadius: '22px',
                    borderBottomRightRadius: message.role === 'user' ? 6 : 18,
                    borderBottomLeftRadius: message.role === 'assistant' ? 6 : 18,
                    background:
                      message.role === 'user'
                        ? palette.userBubble
                        : isDark
                          ? 'linear-gradient(145deg, rgba(30,41,59,0.95), rgba(15,23,42,0.9))'
                          : 'linear-gradient(145deg, rgba(255,255,255,0.98), rgba(248,250,252,0.95))',
                    color: message.role === 'user' ? '#f8fafc' : palette.textPrimary,
                    border:
                      message.role === 'assistant'
                        ? `1px solid ${palette.assistantBorder}`
                        : '1px solid rgba(15,118,110,0.38)',
                    backdropFilter: message.role === 'assistant' ? 'blur(8px)' : 'none',
                    boxShadow:
                      message.role === 'user'
                        ? '0 10px 25px rgba(13, 148, 136, 0.3)'
                        : isDark
                          ? '0 14px 30px rgba(2, 6, 23, 0.35)'
                          : '0 14px 30px rgba(15, 23, 42, 0.14)',
                  }}
                >
                  {message.role === 'assistant' ? (
                    <FormattedGuideMessage
                      content={message.content}
                      palette={palette}
                      isError={message.isError}
                    />
                  ) : (
                    <Typography
                      sx={{
                        whiteSpace: 'pre-wrap',
                        fontSize: '0.95rem',
                        lineHeight: 1.5,
                        fontWeight: 500,
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {message.content}
                    </Typography>
                  )}
                  <Typography sx={{ mt: 0.6, fontSize: '0.72rem', opacity: 0.8, textAlign: 'right' }}>
                    {formatMessageTime(message.createdAt)}
                  </Typography>
                </Box>
              </MotionDiv>
            ))}
          </AnimatePresence>

          {showTyping && (
            <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
              <Box
                sx={{
                  px: 1.5,
                  py: 1.1,
                  borderRadius: '16px',
                  background: palette.assistantBubble,
                  border: `1px solid ${palette.assistantBorder}`,
                }}
              >
                <TypingDots color={palette.typingDot} />
              </Box>
            </Box>
          )}
          <Box ref={messagesEndRef} />
        </Box>

        <Paper
          elevation={0}
          sx={{
            p: 1,
            borderRadius: '18px',
            background: palette.inputBg,
            border: `1px solid ${palette.inputBorder}`,
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          <TextField
            multiline
            minRows={2}
            maxRows={5}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Ask about any destination worldwide..."
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                queueSend();
              }
            }}
            fullWidth
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                px: 1,
                color: palette.textPrimary,
                fontWeight: 500,
                '& textarea::placeholder': {
                  color: palette.textSecondary,
                  opacity: 1,
                },
              },
            }}
          />

          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title={isListening ? 'Stop voice input' : 'Start voice input'}>
                <IconButton
                  onClick={toggleMic}
                  sx={{
                    borderRadius: '12px',
                    border: `1px solid ${palette.inputBorder}`,
                    color: isListening ? '#ef4444' : palette.textPrimary,
                  }}
                >
                  {isListening ? <MicOffRoundedIcon /> : <MicRoundedIcon />}
                </IconButton>
              </Tooltip>
              <Chip
                label={
                  isListening
                    ? 'Listening...'
                    : isSpeaking
                      ? 'Speaking...'
                      : `Voice: ${selectedVoiceName.split(' ')[0] || 'Ready'}`
                }
                size="small"
                sx={{
                  borderRadius: '10px',
                  fontWeight: 700,
                  color: palette.textPrimary,
                  border: `1px solid ${palette.inputBorder}`,
                  backgroundColor: 'transparent',
                }}
              />
            </Stack>

            <Tooltip title="Send message">
              <span>
                <IconButton
                  onClick={queueSend}
                  disabled={!draft.trim() || isStreaming}
                  sx={{
                    width: 46,
                    height: 46,
                    borderRadius: '14px',
                    color: '#f8fafc',
                    background: 'linear-gradient(135deg, #0f766e, #14b8a6)',
                    boxShadow: '0 12px 20px rgba(15, 118, 110, 0.3)',
                    '&:hover': { background: 'linear-gradient(135deg, #0d9488, #2dd4bf)' },
                    '&.Mui-disabled': {
                      background: 'rgba(148,163,184,0.55)',
                      color: '#f8fafc',
                    },
                  }}
                >
                  <SendRoundedIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Stack>
        </Paper>
      </Paper>
    </Box>
  );
}

