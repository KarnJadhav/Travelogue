import React, { useEffect, useMemo, useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import useMediaQuery from '@mui/material/useMediaQuery';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import io from 'socket.io-client';
import api from '../../api';
import PremiumAvatar from '../../components/PremiumAvatar';
import { buildMediaUrl } from '../../utils/media';
import { SOCKET_BASE_URL } from '../../config/runtime';

const SOCKET_URL = SOCKET_BASE_URL;
const DELETE_WINDOW_MS = 60 * 60 * 1000;
const emojiList = [
  '\u{1F600}',
  '\u{1F60A}',
  '\u{1F60D}',
  '\u{1F44D}',
  '\u{1F64F}',
  '\u{1F389}',
  '\u{1F642}',
  '\u{1F525}',
  '\u{2705}',
  '\u{1F4CD}',
];

const getDateKey = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const formatDateDivider = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB');
};

const resolveId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const candidate = value._id || value.id || value.userId;
    if (!candidate) return '';
    return typeof candidate === 'string' ? candidate : String(candidate);
  }
  return String(value);
};

const toTimestamp = (value) => {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const formatConversationTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const sameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (sameDay) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const buildMessagePreview = (message) => {
  if (!message) return '';
  if (message.isDeleted) return 'Message deleted';
  if (message.messageType === 'IMAGE') return message.content || message.attachmentName || 'Image';
  if (message.messageType === 'FILE') return message.attachmentName || message.content || 'File';
  return message.content || '';
};

const getTouristSortTime = (tourist) =>
  toTimestamp(
    tourist?.lastMessageAt ||
      tourist?.lastMessage?.createdAt ||
      tourist?.updatedAt
  );

const sortTouristsByLatest = (touristList = []) =>
  [...touristList].sort((a, b) => {
    const diff = getTouristSortTime(b) - getTouristSortTime(a);
    if (diff !== 0) return diff;
    return (a?.name || '').localeCompare(b?.name || '');
  });

const normalizeTouristEntry = (entry = {}) => {
  const tourist = entry.tourist || entry;
  const id = tourist?._id || tourist?.id || tourist?.userId;
  if (!id) return null;

  const avatar = tourist.avatar ? buildMediaUrl(tourist.avatar) : '';
  const lastMessage = entry.lastMessage || tourist.lastMessage || null;
  const lastMessageAt = entry.lastMessageAt || tourist.lastMessageAt || lastMessage?.createdAt || null;
  const unreadCount = Math.max(0, Number(entry.unreadCount ?? tourist.unreadCount ?? 0));
  const preview = entry.preview || tourist.preview || buildMessagePreview(lastMessage);

  return {
    ...tourist,
    _id: String(id),
    name: tourist.name || tourist.fullName || tourist.email || 'Tourist',
    email: tourist.email || '',
    avatar,
    country: tourist.country || tourist.nationality || '',
    chatId: entry.chatId || tourist.chatId || null,
    bookingId: entry.bookingId || tourist.bookingId || null,
    unreadCount,
    lastMessage,
    lastMessageAt,
    preview
  };
};

const mergeTourists = (current = [], incoming = []) => {
  const byId = new Map();

  current.forEach((item) => {
    if (!item?._id) return;
    byId.set(String(item._id), item);
  });

  incoming.forEach((item) => {
    const normalized = normalizeTouristEntry(item);
    if (!normalized?._id) return;
    const touristId = String(normalized._id);
    const existing = byId.get(touristId);

    if (!existing) {
      byId.set(touristId, normalized);
      return;
    }

    const nextTime = getTouristSortTime(normalized);
    const existingTime = getTouristSortTime(existing);
    const useNextActivity = nextTime >= existingTime;

    byId.set(touristId, {
      ...existing,
      ...normalized,
      lastMessage: useNextActivity
        ? normalized.lastMessage || existing.lastMessage || null
        : existing.lastMessage || normalized.lastMessage || null,
      lastMessageAt: useNextActivity
        ? normalized.lastMessageAt || existing.lastMessageAt || null
        : existing.lastMessageAt || normalized.lastMessageAt || null,
      preview: useNextActivity
        ? normalized.preview || existing.preview || ''
        : existing.preview || normalized.preview || '',
      unreadCount:
        normalized.unreadCount !== undefined && normalized.unreadCount !== null
          ? normalized.unreadCount
          : existing.unreadCount || 0
    });
  });

  return sortTouristsByLatest(Array.from(byId.values()));
};

export default function GuideChatPanel({ guideId, preselectedTouristId, preselectToken, onTouristsChange = () => {} }) {
  const [tourists, setTourists] = useState([]);
  const [filteredTourists, setFilteredTourists] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [chatId, setChatId] = useState(null);
  const [chatStatus, setChatStatus] = useState('ACTIVE');
  const [chatNotice, setChatNotice] = useState('');
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [error, setError] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const selectedMessages = useMemo(() => {
    if (!selectedMessageIds.length) return [];
    const idSet = new Set(selectedMessageIds);
    return messages.filter((msg) => idSet.has(msg?._id || msg?.id));
  }, [messages, selectedMessageIds]);
  const messageRows = useMemo(() => {
    const rows = [];
    let previousDateKey = '';
    messages.forEach((msg, idx) => {
      const dateKey = getDateKey(msg.createdAt);
      if (dateKey && dateKey !== previousDateKey) {
        rows.push({
          type: 'divider',
          id: `date-${dateKey}-${idx}`,
          label: formatDateDivider(msg.createdAt),
        });
        previousDateKey = dateKey;
      }
      rows.push({
        type: 'message',
        id: msg._id || `msg-${idx}`,
        message: msg,
      });
    });
    return rows;
  }, [messages]);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const lastAppliedPreselectTokenRef = useRef(null);
  const refreshTouristsRef = useRef(async () => {});

  useEffect(() => {
    onTouristsChange(tourists);
  }, [tourists, onTouristsChange]);

  // Fetch tourists linked to this guide and keep summaries fresh.
  useEffect(() => {
    if (!guideId) return;
    let isMounted = true;

    const loadTourists = async (withLoading = false) => {
      if (withLoading) {
        setLoading(true);
      }
      try {
        const res = await api.get(`/chat/guide/${guideId}/tourists`);
        if (!isMounted) return;
        const touristsList = (res.data.tourists || [])
          .map((item) => normalizeTouristEntry(item))
          .filter(Boolean);
        setTourists((prev) => mergeTourists(prev, touristsList));
        setError('');
      } catch (err) {
        if (!isMounted) return;
        setError('Failed to load tourists.');
      } finally {
        if (isMounted && withLoading) {
          setLoading(false);
        }
      }
    };

    refreshTouristsRef.current = async () => {
      await loadTourists(false);
    };

    loadTourists(true);
    const interval = setInterval(() => {
      refreshTouristsRef.current();
    }, 12000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [guideId]);

  // Filter tourists by search
  useEffect(() => {
    const query = search.trim().toLowerCase();
    const next = sortTouristsByLatest(
      tourists.filter((t) =>
        !query ||
        t.name?.toLowerCase().includes(query) ||
        t.email?.toLowerCase().includes(query) ||
        t.country?.toLowerCase().includes(query) ||
        t.preview?.toLowerCase().includes(query)
      )
    );
    setFilteredTourists(next);
  }, [search, tourists]);

  useEffect(() => {
    if (!selectedTourist?._id) return;
    const latest = tourists.find((tourist) => tourist._id === selectedTourist._id);
    if (!latest) return;
    setSelectedTourist((prev) => {
      if (!prev || prev._id !== latest._id) return prev;
      const shouldUpdate =
        prev.name !== latest.name ||
        prev.avatar !== latest.avatar ||
        prev.country !== latest.country ||
        prev.unreadCount !== latest.unreadCount ||
        prev.chatId !== latest.chatId;
      return shouldUpdate ? { ...prev, ...latest } : prev;
    });
  }, [tourists, selectedTourist?._id]);

  useEffect(() => {
    if (tourists.length === 0) {
      setSelectedTourist(null);
      return;
    }

    const targetTouristId = preselectedTouristId ? String(preselectedTouristId) : '';
    const hasNewPreselect =
      Boolean(targetTouristId) &&
      preselectToken &&
      lastAppliedPreselectTokenRef.current !== preselectToken;

    if (hasNewPreselect) {
      const targetTourist = tourists.find((tourist) => tourist._id === targetTouristId);
      if (targetTourist) {
        setSelectedTourist(targetTourist);
        setSearch('');
        lastAppliedPreselectTokenRef.current = preselectToken;
        return;
      }
    }

    if (!selectedTourist || !tourists.some((tourist) => tourist._id === selectedTourist._id)) {
      setSelectedTourist(tourists[0]);
    }
  }, [tourists, selectedTourist?._id, preselectedTouristId, preselectToken]);

  const markChatAsRead = async (activeChatId, touristId) => {
    if (!activeChatId) return;
    try {
      await api.post(`/chat/${activeChatId}/read`);
    } catch (err) {
      // keep UI responsive even if mark-as-read fails
    }

    const normalizedTouristId = touristId ? String(touristId) : '';
    if (!normalizedTouristId) return;

    setTourists((prev) =>
      sortTouristsByLatest(
        prev.map((tourist) =>
          tourist._id === normalizedTouristId
            ? { ...tourist, unreadCount: 0, chatId: activeChatId }
            : tourist
        )
      )
    );
  };

  // Fetch or create chat and messages when tourist is selected
  useEffect(() => {
    const selectedTouristId = selectedTourist?._id ? String(selectedTourist._id) : '';
    if (!selectedTouristId || !guideId) return;
    setLoading(true);
    setError('');
    setMessages([]);
    setChatId(null);
    api.get(`/chat/direct/${selectedTouristId}/${guideId}`)
      .then(res => {
        const resolvedChatId = res.data.chatId;
        const resolvedMessages = res.data.messages || [];
        const lastMessage = resolvedMessages.length ? resolvedMessages[resolvedMessages.length - 1] : null;

        setChatId(resolvedChatId);
        setMessages(resolvedMessages);
        setChatStatus(res.data.status || 'ACTIVE');
        setTourists((prev) =>
          sortTouristsByLatest(
            prev.map((tourist) =>
              tourist._id === selectedTouristId
                ? {
                    ...tourist,
                    chatId: resolvedChatId,
                    unreadCount: 0,
                    lastMessage: lastMessage || tourist.lastMessage || null,
                    lastMessageAt:
                      lastMessage?.createdAt ||
                      tourist.lastMessageAt ||
                      tourist.lastMessage?.createdAt ||
                      null,
                    preview: buildMessagePreview(lastMessage) || tourist.preview || ''
                  }
                : tourist
            )
          )
        );
        setLoading(false);
        markChatAsRead(resolvedChatId, selectedTouristId);
        refreshTouristsRef.current();
      })
      .catch(() => {
        setLoading(false);
        setError('Failed to load chat.');
      });
  }, [selectedTourist?._id, guideId]);

  // Socket.io setup for chat
  useEffect(() => {
    if (!chatId || !guideId) return;
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL);
    }
    const myGuideId = String(guideId);
    socketRef.current.emit('joinRoom', { chatId, userId: myGuideId });
    socketRef.current.off('newMessage');
    socketRef.current.on('newMessage', (msg) => {
      setMessages(prev => {
        if (msg?._id && prev.some(item => item._id === msg._id)) return prev;
        return [...prev, msg];
      });

      const activeTouristId = selectedTourist?._id ? String(selectedTourist._id) : '';
      const senderId = resolveId(msg?.senderId);
      const isIncoming = !!senderId && senderId !== myGuideId;
      const preview = buildMessagePreview(msg);

      if (activeTouristId) {
        setTourists((prev) =>
          sortTouristsByLatest(
            prev.map((tourist) =>
              tourist._id === activeTouristId
                ? {
                    ...tourist,
                    chatId,
                    lastMessage: msg,
                    lastMessageAt: msg?.createdAt || new Date().toISOString(),
                    preview: preview || tourist.preview || '',
                    unreadCount: 0
                  }
                : tourist
            )
          )
        );
      }

      if (isIncoming) {
        markChatAsRead(chatId, activeTouristId);
      }
    });
    socketRef.current.off('messageDeleted');
    socketRef.current.on('messageDeleted', ({ messageId }) => {
      setMessages(prev =>
        prev.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                isDeleted: true,
                content: '',
                attachmentUrl: '',
                attachmentName: '',
                attachmentType: '',
                attachmentSize: 0,
                messageType: 'TEXT',
              }
            : msg
        )
      );
      refreshTouristsRef.current();
    });
    return () => {
      if (socketRef.current) {
        socketRef.current.off('newMessage');
        socketRef.current.off('messageDeleted');
      }
    };
  }, [chatId, guideId, selectedTourist?._id]);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Chat status and input control
  useEffect(() => {
    let notice = '';
    let disabled = false;
    if (chatStatus === 'POST_TOUR') {
      notice = 'Chat is in post-tour mode.';
    }
    if (chatStatus === 'LOCKED') {
      notice = 'Chat is locked due to a dispute.';
      disabled = true;
    }
    if (chatStatus === 'CLOSED') {
      notice = 'Chat is closed. You can view previous messages.';
      disabled = true;
    }
    setChatNotice(notice);
    setIsInputDisabled(disabled);
  }, [chatStatus]);

  // Prevent double send by debouncing handleSend
  const sendingRef = useRef(false);

  const postMessage = async ({ content, messageType = 'TEXT', attachment }) => {
    const payload = {
      content,
      messageType,
      attachmentUrl: attachment?.url || '',
      attachmentName: attachment?.name || '',
      attachmentType: attachment?.type || '',
      attachmentSize: attachment?.size || 0,
    };

    let resp;
    // If this is a direct chat (bookingId is null), use the direct message endpoint
    if (selectedTourist && chatId && tourists.find(t => t._id === selectedTourist._id)) {
      resp = await api.post(`/chat/direct/${selectedTourist._id}/${guideId}/message`, payload);
      // If chatId was just created, update it
      if (resp.data.chatId && resp.data.chatId !== chatId) {
        setChatId(resp.data.chatId);
      }
    } else {
      // fallback for booking-based chat (should not happen in this panel)
      resp = await api.post(`/chat/${chatId}/message`, payload);
    }

    return resp;
  };

  const handleSend = async () => {
    if (sendingRef.current) return;
    if (!input.trim() || isInputDisabled || !chatId) return;
    sendingRef.current = true;
    setLoading(true);
    try {
      await postMessage({ content: input.trim(), messageType: 'TEXT' });
      // Do not update messages here; rely on socket event only
      setInput('');
      refreshTouristsRef.current();
    } catch (err) {
      alert(err.response?.data?.error || 'Message failed');
    }
    setLoading(false);
    setTimeout(() => { sendingRef.current = false; }, 250); // allow next send after short delay
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || isInputDisabled || !chatId) return;

    setUploadingAttachment(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const attachment = res.data;
      const isImage = attachment.type?.startsWith('image/');
      await postMessage({
        content: isImage ? 'Image' : attachment.name || 'Attachment',
        messageType: isImage ? 'IMAGE' : 'FILE',
        attachment,
      });
      refreshTouristsRef.current();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploadingAttachment(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const isWithinDeleteWindow = (value) => {
    if (!value) return false;
    const createdAt = new Date(value).getTime();
    if (Number.isNaN(createdAt)) return false;
    return Date.now() - createdAt <= DELETE_WINDOW_MS;
  };

  const toggleMessageSelection = (messageId) => {
    if (!messageId) return;
    setSelectedMessageIds((prev) => (
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    ));
  };

  const clearSelection = () => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const openBulkDeleteDialog = () => {
    if (!selectedMessageIds.length) return;
    setBulkDeleteOpen(true);
  };

  const closeBulkDeleteDialog = () => {
    setBulkDeleteOpen(false);
  };

  const applyDeleteForEveryone = (ids) => {
    const idSet = new Set(ids);
    setMessages((prev) =>
      prev.map((msg) => {
        const msgId = msg?._id || msg?.id;
        if (!idSet.has(msgId)) return msg;
        return {
          ...msg,
          isDeleted: true,
          content: '',
          attachmentUrl: '',
          attachmentName: '',
          attachmentType: '',
          attachmentSize: 0,
          messageType: 'TEXT',
        };
      })
    );
  };

  const applyDeleteForMe = (ids) => {
    const idSet = new Set(ids);
    setMessages((prev) => prev.filter((msg) => !idSet.has(msg?._id || msg?.id)));
  };

  const handleBulkDelete = async (mode) => {
    const ids = selectedMessageIds.filter(Boolean);
    if (!ids.length) return;
    const successIds = [];
    for (const id of ids) {
      try {
        if (mode === 'everyone') {
          await api.delete(`/chat/message/${id}`);
        } else {
          await api.delete(`/chat/message/${id}/for-me`);
        }
        successIds.push(id);
      } catch (err) {
        // ignore individual failure
      }
    }
    if (successIds.length) {
      if (mode === 'everyone') {
        applyDeleteForEveryone(successIds);
      } else {
        applyDeleteForMe(successIds);
      }
      refreshTouristsRef.current();
    }
    if (successIds.length !== ids.length) {
      alert('Some messages could not be deleted.');
    }
    clearSelection();
    closeBulkDeleteDialog();
  };

  const guideIdValue = guideId ? String(guideId) : '';
  const isNarrow = useMediaQuery('(max-width:960px)');
  const showTouristListPane = !isNarrow || !selectedTourist;
  const showThreadPane = !isNarrow || Boolean(selectedTourist);
  const canBulkDeleteForEveryone =
    selectedMessages.length > 0 &&
    selectedMessages.every(
      (message) =>
        !message.isDeleted &&
        resolveId(message?.senderId) === guideIdValue &&
        isWithinDeleteWindow(message.createdAt)
    );

  return (
    <Paper
      elevation={4}
      sx={{
        display: 'flex',
        height: { xs: 'calc(100vh - 190px)', md: '70vh' },
        minHeight: { xs: 520, md: 620 },
        bgcolor: '#f8fdf7',
        borderRadius: { xs: 2.5, md: 4 },
        boxShadow: 3,
        overflow: 'hidden',
      }}
    >
      {/* Tourist List */}
      <Box sx={{ width: { xs: '100%', md: 320 }, bgcolor: '#fff', borderRight: { xs: 'none', md: '1.5px solid #e0e0e0' }, p: 0, display: showTouristListPane ? 'flex' : 'none', flexDirection: 'column' }}>
        <Box sx={{ p: { xs: 2, md: 3 }, pb: 1 }}>
          <Typography variant="h4" fontWeight={800} mb={0.5} sx={{ fontFamily: 'serif', fontSize: { xs: '1.5rem', md: '2rem' } }}>Messages</Typography>
          <Typography variant="subtitle2" color="text.secondary" mb={2}>
            Chat with your tourists in real-time
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search tourists..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            sx={{ mb: 2 }}
          />
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1, pb: 2 }}>
          {!loading && filteredTourists.length === 0 && (
            <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
              <Typography fontWeight={700} color="text.secondary">
                No tourists found
              </Typography>
              <Typography fontSize={13} color="text.disabled" sx={{ mt: 0.5 }}>
                Tourists will appear here after they book your guide service.
              </Typography>
            </Box>
          )}
          {filteredTourists.map((tourist) => (
            <Box
              key={tourist._id}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 1.2,
                mb: 1,
                borderRadius: 2,
                cursor: 'pointer',
                bgcolor: selectedTourist?._id === tourist._id ? '#eafbe7' : 'transparent',
                transition: 'background 0.2s',
                '&:hover': { bgcolor: '#f0f7f4' }
              }}
              onClick={() => {
                setSelectedTourist({ ...tourist, unreadCount: 0 });
                setTourists((prev) =>
                  sortTouristsByLatest(
                    prev.map((item) =>
                      item._id === tourist._id ? { ...item, unreadCount: 0 } : item
                    )
                  )
                );
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedTourist({ ...tourist, unreadCount: 0 });
                  setTourists((prev) =>
                    sortTouristsByLatest(
                      prev.map((item) =>
                        item._id === tourist._id ? { ...item, unreadCount: 0 } : item
                      )
                    )
                  );
                }
              }}
            >
              <PremiumAvatar
                src={tourist.avatar}
                name={tourist.name}
                size={44}
                sx={{ border: selectedTourist?._id === tourist._id ? '2px solid #388e3c' : '2px solid #fff' }}
              />
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <Typography fontWeight={700} fontSize={{ xs: 15, md: 17 }} noWrap sx={{ maxWidth: '68%' }}>
                    {tourist.name || 'No Name'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
                    {formatConversationTime(tourist.lastMessageAt || tourist.lastMessage?.createdAt)}
                  </Typography>
                </Box>
                <Typography fontSize={13} color="text.secondary" noWrap>
                  {tourist.preview || tourist.country || 'Start conversation'}
                </Typography>
              </Box>
              {tourist.unreadCount > 0 && (
                <Box
                  sx={{
                    minWidth: 22,
                    height: 22,
                    px: 0.7,
                    borderRadius: '999px',
                    bgcolor: '#2e7d32',
                    color: '#fff',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 14px rgba(46, 125, 50, 0.3)'
                  }}
                >
                  {tourist.unreadCount > 99 ? '99+' : tourist.unreadCount}
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>
      {/* Chat Window */}
      <Box sx={{ flex: 1, display: showThreadPane ? 'flex' : 'none', flexDirection: 'column', bgcolor: '#f8fdf7', borderRadius: 0, p: 0 }}>
        {selectedTourist && (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: { xs: 1.5, md: 3 }, bgcolor: '#f4fbf6', borderBottom: '1.5px solid #e0e0e0', gap: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isNarrow && (
                <IconButton size="small" onClick={() => setSelectedTourist(null)} sx={{ mr: 1 }} aria-label="Back to tourist list">
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              )}
              <PremiumAvatar
                src={selectedTourist.avatar}
                name={selectedTourist.name}
                size={44}
                sx={{ mr: 2 }}
              />
              <Box>
                <Typography fontWeight={700} fontSize={{ xs: 16, md: 18 }}>{selectedTourist.name}</Typography>
                <Typography fontSize={13} color="text.secondary">{selectedTourist.country}</Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {selectionMode ? (
                <>
                  <Chip
                    label={`${selectedMessageIds.length} selected`}
                    size="small"
                    sx={{ bgcolor: 'rgba(15,23,42,0.08)', fontWeight: 600 }}
                  />
                  <Tooltip title="Delete selected" arrow>
                    <span>
                      <IconButton
                        onClick={openBulkDeleteDialog}
                        disabled={!selectedMessageIds.length}
                      >
                        <DeleteOutlineIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Button size="small" variant="outlined" onClick={clearSelection}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button size="small" variant="outlined" onClick={() => setSelectionMode(true)}>
                  Select
                </Button>
              )}
            </Box>
          </Box>
        )}
        {/* Chat status banner */}
        {chatNotice && (
          <Box sx={{ px: 3, py: 1, bgcolor: chatStatus === 'LOCKED' ? '#ffe0e0' : chatStatus === 'POST_TOUR' ? '#fffbe6' : chatStatus === 'CLOSED' ? '#f0f0f0' : '#eafbe7', borderBottom: '1.5px solid #e0e0e0' }}>
            <Chip label={chatNotice} color={chatStatus === 'LOCKED' ? 'error' : chatStatus === 'POST_TOUR' ? 'warning' : chatStatus === 'CLOSED' ? 'default' : 'success'} />
          </Box>
        )}
        <Box sx={{ flex: 1, overflowY: 'auto', px: 0, py: 0, bgcolor: '#ece5dd', position: 'relative', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : error && !chatId ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
              <Button onClick={() => setSelectedTourist(null)} color="primary" variant="outlined">Back</Button>
            </Box>
          ) : (
            <Box sx={{ flex: 1, px: { xs: 1.5, md: 3 }, py: { xs: 1.5, md: 2 }, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {messages.length === 0 && (
                <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 8 }}>
                  No messages yet. Start the conversation!
                </Typography>
              )}
              {messageRows.map((row, idx) => {
                if (row.type === 'divider') {
                  return (
                    <Box key={row.id} sx={{ display: 'flex', justifyContent: 'center', my: 1 }}>
                      <Chip
                        label={row.label}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(15, 23, 42, 0.08)',
                          color: '#36574c',
                          fontWeight: 700,
                          borderRadius: '10px',
                          height: 26,
                          '& .MuiChip-label': { px: 1.5 },
                        }}
                      />
                    </Box>
                  );
                }

                const msg = row.message;
                const senderId = resolveId(msg?.senderId);
                const senderRole = msg?.senderRole || '';
                let isMe = false;
                if (senderRole) {
                  isMe = senderRole === 'guide';
                } else {
                  isMe = senderId && guideIdValue ? senderId === guideIdValue : false;
                }
                const messageId = msg?._id || msg?.id;
                const isSelected = selectionMode && messageId
                  ? selectedMessageIds.includes(messageId)
                  : false;
                const canSelect = selectionMode && messageId && !msg.isDeleted;
                // Get guide avatar from localStorage user
                let guideAvatar = '';
                let guideName = 'Guide';
                try {
                  const user = JSON.parse(localStorage.getItem('user'));
                  guideAvatar = user?.avatar || '';
                  guideName = user?.name || guideName;
                } catch {}
                const senderAvatar = msg?.senderAvatar || msg?.senderId?.avatar || '';
                const incomingAvatar = senderAvatar || selectedTourist?.avatar;
                const outgoingAvatar = guideAvatar || senderAvatar;
                const attachmentUrl = msg?.attachmentUrl ? buildMediaUrl(msg.attachmentUrl) : '';
                return (
                  <Box key={row.id || idx} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', mb: 1 }}>
                    {!isMe && (
                      <PremiumAvatar
                        src={incomingAvatar}
                        name={selectedTourist?.name}
                        size={32}
                        sx={{ mr: 1 }}
                      />
                    )}
                    <Box sx={{
                      bgcolor: isMe ? '#dcf8c6' : '#fff',
                      color: 'text.primary',
                      px: selectionMode ? 2.5 : 2,
                      py: selectionMode ? 2 : 1.2,
                      pl: selectionMode ? 4 : 2,
                      pt: selectionMode ? 2.2 : 1.2,
                      borderRadius: isMe ? '16px 16px 0 16px' : '16px 16px 16px 0',
                      maxWidth: { xs: '78vw', md: 380 },
                      boxShadow: 1,
                      position: 'relative',
                      outline: isSelected ? '2px solid #0ea67f' : 'none',
                      cursor: canSelect ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (canSelect) toggleMessageSelection(messageId);
                    }}>
                      {canSelect && (
                        <Checkbox
                          size="small"
                          checked={isSelected}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleMessageSelection(messageId);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 4,
                            left: 4,
                            color: '#4b5563',
                            '&.Mui-checked': {
                              color: '#0f172a',
                            },
                          }}
                        />
                      )}
                      {msg.isDeleted ? (
                        <Typography
                          fontSize={15}
                          sx={{ wordBreak: 'break-word', fontStyle: 'italic', color: '#64748b' }}
                        >
                          This message was deleted
                        </Typography>
                      ) : msg.messageType === 'IMAGE' && attachmentUrl ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box
                            component="img"
                            src={attachmentUrl}
                            alt={msg.attachmentName || 'Image'}
                            sx={{
                              width: '100%',
                              maxWidth: 240,
                              maxHeight: 220,
                              objectFit: 'cover',
                              borderRadius: 2,
                              display: 'block',
                            }}
                          />
                          <Typography variant="caption" sx={{ color: '#4b5563' }}>
                            {msg.attachmentName || 'Image'}
                          </Typography>
                        </Box>
                      ) : msg.messageType === 'FILE' && attachmentUrl ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                          <Typography fontSize={15} fontWeight={700} sx={{ wordBreak: 'break-word' }}>
                            {msg.attachmentName || 'File'}
                          </Typography>
                          <Typography
                            component="a"
                            href={attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            fontSize={13}
                            fontWeight={700}
                            sx={{ color: '#1769aa', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                          >
                            Download file
                          </Typography>
                        </Box>
                      ) : (
                        <Typography fontSize={15} sx={{ wordBreak: 'break-word', color: '#222' }}>
                          {msg.content}
                        </Typography>
                      )}
                      <Typography fontSize={11} sx={{ mt: 0.5, textAlign: 'right', opacity: 0.7 }}>
                        {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString() : ''}
                      </Typography>
                    </Box>
                    {isMe && (
                      <PremiumAvatar
                        src={outgoingAvatar}
                        name={guideName}
                        size={32}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Box>
                );
              })}
              <div ref={messagesEndRef} />
            </Box>
          )}
        </Box>
        <Box
          sx={{
            display: 'flex',
            bgcolor: '#fafafa',
            p: { xs: 1.25, md: 2 },
            borderTop: '1.5px solid #e0e0e0',
            boxShadow: '0 1px 4px 0 rgba(76,175,80,0.04)',
            mt: 'auto',
            flexDirection: 'column',
            gap: 1,
          }}
        >
          {emojiOpen && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, alignSelf: 'flex-start' }}>
              {emojiList.map((emoji) => (
                <IconButton
                  key={emoji}
                  size="small"
                  onClick={() => setInput((prev) => `${prev}${emoji}`)}
                  disabled={isInputDisabled || loading || !!error || !chatId}
                >
                  <span style={{ fontSize: 20 }}>{emoji}</span>
                </IconButton>
              ))}
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', minWidth: 0 }}>
            <Tooltip title="Add emoji" arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={() => setEmojiOpen((prev) => !prev)}
                  disabled={isInputDisabled || loading || !!error || !chatId}
                >
                  <EmojiEmotionsOutlinedIcon />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title={uploadingAttachment ? 'Uploading file...' : 'Upload file'} arrow>
              <span>
                <IconButton
                  size="small"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isInputDisabled || loading || uploadingAttachment || !!error || !chatId}
                >
                  <AttachFileIcon />
                </IconButton>
              </span>
            </Tooltip>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <TextField
              fullWidth
              placeholder={selectedTourist ? 'Type your message...' : 'Select a tourist to start chatting'}
              value={input}
              onChange={e => setInput(e.target.value)}
              variant="outlined"
              size={isNarrow ? 'small' : 'medium'}
              sx={{ bgcolor: '#fff', borderRadius: 3, fontSize: 16, minWidth: 0 }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={isInputDisabled || loading || uploadingAttachment || !!error || !chatId}
              inputProps={{ style: { fontSize: isNarrow ? 15 : 16, padding: isNarrow ? '10px' : '12px' } }}
            />
            <Button
              variant="contained"
              color="success"
              sx={{ minWidth: { xs: 42, md: 48 }, minHeight: { xs: 42, md: 48 }, borderRadius: 2, fontWeight: 700, fontSize: { xs: 14, md: 16 }, boxShadow: 'none', textTransform: 'none', flexShrink: 0, px: { xs: 1.6, md: 2.2 } }}
              onClick={e => {
                e.preventDefault();
                handleSend();
              }}
              disabled={!input.trim() || isInputDisabled || loading || uploadingAttachment || !!error || !chatId}
            >
              Send
            </Button>
          </Box>
        </Box>
      </Box>
      <Dialog open={bulkDeleteOpen} onClose={closeBulkDeleteDialog}>
        <DialogTitle>Delete selected messages?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            You have selected {selectedMessageIds.length} message(s). Delete for me removes them only from your view.
          </Typography>
          {!canBulkDeleteForEveryone && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled' }}>
              Delete for everyone is only available for your messages sent within the last hour.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeBulkDeleteDialog} variant="outlined">
            Cancel
          </Button>
          <Button onClick={() => handleBulkDelete('me')} variant="contained">
            Delete for me
          </Button>
          <Button
            onClick={() => handleBulkDelete('everyone')}
            variant="contained"
            color="error"
            disabled={!canBulkDeleteForEveryone}
          >
            Delete for everyone
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}
