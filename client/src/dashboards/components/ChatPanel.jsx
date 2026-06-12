


import React, { useEffect, useMemo, useState, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import EmojiEmotionsOutlinedIcon from '@mui/icons-material/EmojiEmotionsOutlined';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import Paper from '@mui/material/Paper';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import useMediaQuery from '@mui/material/useMediaQuery';
import HotelRoundedIcon from '@mui/icons-material/HotelRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import io from 'socket.io-client';
import api from '../../api';
import PremiumAvatar from '../../components/PremiumAvatar';
import { buildMediaUrl } from '../../utils/media';
import { SOCKET_BASE_URL } from '../../config/runtime';

const SOCKET_URL = SOCKET_BASE_URL;
const DELETE_WINDOW_MS = 60 * 60 * 1000;
const buildImageUrl = buildMediaUrl;
const emojiList = ['😀', '😊', '😍', '👍', '🙏', '🎉', '😢', '😮', '🔥', '✅'];

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

  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const msgStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.round((todayStart - msgStart) / (24 * 60 * 60 * 1000));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return date.toLocaleDateString('en-GB');
};

const formatMessageTime = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
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

const getContactSortTime = (contact) =>
  toTimestamp(contact?.lastMessageAt || contact?.lastMessage?.createdAt);

const sortContactsByLatest = (items = []) =>
  [...items].sort((a, b) => {
    const diff = getContactSortTime(b) - getContactSortTime(a);
    if (diff !== 0) return diff;
    return (a?.name || '').localeCompare(b?.name || '');
  });

const normalizeContact = (contact = {}) => {
  const userId = contact?.userId ? String(contact.userId) : '';
  if (!userId) return null;

  const rawAvatar = typeof contact.avatar === 'string' ? contact.avatar : '';
  const avatar = rawAvatar ? buildImageUrl(rawAvatar) : '';
  const unreadCount = Number.isFinite(Number(contact.unreadCount))
    ? Math.max(0, Number(contact.unreadCount))
    : 0;
  const preview = contact.preview || buildMessagePreview(contact.lastMessage);

  return {
    ...contact,
    userId,
    name: contact.name || (contact.type === 'hotel' ? 'Hotel' : 'Guide'),
    avatar,
    email: contact.email || '',
    subtitle: contact.subtitle || '',
    type: contact.type === 'hotel' ? 'hotel' : 'guide',
    lastMessage: contact.lastMessage || null,
    lastMessageAt: contact.lastMessageAt || contact.lastMessage?.createdAt || null,
    preview,
    unreadCount
  };
};

const mergeContacts = (current = [], incoming = []) => {
  const byId = new Map();

  current.forEach((item) => {
    const normalized = normalizeContact(item);
    if (normalized) byId.set(normalized.userId, normalized);
  });

  incoming.forEach((item) => {
    const normalized = normalizeContact(item);
    if (!normalized) return;

    const existing = byId.get(normalized.userId);
    if (!existing) {
      byId.set(normalized.userId, normalized);
      return;
    }

    const nextTime = getContactSortTime(normalized);
    const existingTime = getContactSortTime(existing);
    const useNextActivity = nextTime >= existingTime;

    byId.set(normalized.userId, {
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

  return sortContactsByLatest(Array.from(byId.values()));
};

export default function ChatPanel({ chatTarget, onChatHandled, onContactSummariesChange = () => {} }) {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [contactTypeFilter, setContactTypeFilter] = useState('all');
  const [selectedContact, setSelectedContact] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [chatId, setChatId] = useState(null);
  const [chatStatus, setChatStatus] = useState('ACTIVE');
  const [chatNotice, setChatNotice] = useState('');
  const [isInputDisabled, setIsInputDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const refreshContactsRef = useRef(async () => {});
  const isMobile = useMediaQuery('(max-width:900px)');
  const [showConversationList, setShowConversationList] = useState(true);

  useEffect(() => {
    if (!isMobile) {
      setShowConversationList(true);
    }
  }, [isMobile]);

  useEffect(() => {
    if (isMobile && selectedContact) {
      setShowConversationList(false);
    }
  }, [isMobile, selectedContact]);

  useEffect(() => {
    onContactSummariesChange(contacts);
  }, [contacts, onContactSummariesChange]);

  // Fetch user and chat contacts
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;
    const parsedUser = JSON.parse(storedUser);
    setUser(parsedUser);

    const loadContacts = async () => {
      if (parsedUser.role === 'tourist') {
        const touristId = parsedUser.userId || parsedUser._id;
        if (!touristId) return;
        const response = await api.get(`/chat/tourist/${touristId}/contacts?includeAll=true`);
        const contactList = (response?.data?.contacts || [])
          .map((item) => normalizeContact(item))
          .filter(Boolean);
        setContacts((prev) => mergeContacts(prev, contactList));
      } else {
        // fallback for non-tourist users
        const res = await api.get('/guide');
        const allGuides = (res.data.guides || [])
          .map((g) =>
            normalizeContact({
              userId: String(g.userId?._id || g.userId || g._id),
              name: g.userId?.name || g.name || 'Guide',
              avatar: g.userId?.avatar || g.avatar || '',
              email: g.userId?.email || g.email || '',
              subtitle: g.userId?.country || g.country || '',
              type: 'guide',
              unreadCount: 0
            })
          )
          .filter(Boolean);
        setContacts((prev) => mergeContacts(prev, allGuides));
      }
    };

    refreshContactsRef.current = async () => {
      try {
        await loadContacts();
      } catch (err) {
        console.error('[ChatPanel] Failed to refresh contacts:', err);
      }
    };

    let isMounted = true;
    const safeLoad = async () => {
      if (!isMounted) return;
      await refreshContactsRef.current();
    };

    safeLoad();
    const interval = setInterval(safeLoad, 12000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // Filter contacts by search
  useEffect(() => {
    const query = search.trim().toLowerCase();
    const next = sortContactsByLatest(
      contacts.filter((c) => {
        const typeMatch = contactTypeFilter === 'all' || c.type === contactTypeFilter;
        const searchMatch =
          !query ||
          c.name?.toLowerCase().includes(query) ||
          c.email?.toLowerCase().includes(query) ||
          c.subtitle?.toLowerCase().includes(query) ||
          c.preview?.toLowerCase().includes(query);
        return typeMatch && searchMatch;
      })
    );
    setFilteredContacts(next);
  }, [search, contacts, contactTypeFilter]);

  useEffect(() => {
    if (!selectedContact?.userId) return;
    const latest = contacts.find((item) => item.userId === selectedContact.userId);
    if (!latest) return;
    setSelectedContact((prev) => {
      if (!prev || prev.userId !== latest.userId) return prev;
      const shouldUpdate =
        prev.name !== latest.name ||
        prev.avatar !== latest.avatar ||
        prev.subtitle !== latest.subtitle ||
        prev.unreadCount !== latest.unreadCount ||
        prev.chatId !== latest.chatId;
      return shouldUpdate ? { ...prev, ...latest } : prev;
    });
  }, [contacts, selectedContact?.userId]);

  useEffect(() => {
    if (!chatTarget?.userId) return;
    const normalized = normalizeContact({
      userId: String(chatTarget.userId),
      name: chatTarget.name || (chatTarget.type === 'hotel' ? 'Hotel' : 'Guide'),
      avatar: chatTarget.avatar || '',
      email: chatTarget.email || '',
      subtitle: chatTarget.subtitle || '',
      type: chatTarget.type || 'guide',
      unreadCount: 0
    });
    if (!normalized) return;

    setContacts((prev) => mergeContacts(prev, [normalized]));
    setSelectedContact((prev) => {
      if (prev?.userId === normalized.userId) return { ...prev, ...normalized };
      return { ...normalized };
    });
    if (onChatHandled) onChatHandled();
  }, [chatTarget, onChatHandled]);

  const markChatAsRead = async (activeChatId, contactUserId) => {
    if (!activeChatId) return;
    try {
      await api.post(`/chat/${activeChatId}/read`);
    } catch (err) {
      // Keep UI responsive even if read endpoint fails momentarily
    }

    const normalizedContactId = contactUserId ? String(contactUserId) : '';
    if (normalizedContactId) {
      setContacts((prev) =>
        sortContactsByLatest(
          prev.map((item) =>
            item.userId === normalizedContactId ? { ...item, unreadCount: 0, chatId: activeChatId } : item
          )
        )
      );
    }
  };

  // Fetch or create chat and messages when contact is selected
  useEffect(() => {
    const selectedUserId = selectedContact?.userId ? String(selectedContact.userId) : '';
    if (!selectedUserId || !user) return;
    setLoading(true);
    setError('');
    setInput('');
    setChatId(null);
    setMessages([]);
    setChatStatus('ACTIVE');
    // Always use touristId first, guideId second
    const isTourist = user.role === 'tourist';
    const touristId = isTourist ? (user.userId || user._id) : selectedUserId;
    const guideId = isTourist ? selectedUserId : user.userId;
    api.get(`/chat/direct/${touristId}/${guideId}`)
      .then(res => {
        if (!res.data.chatId) {
          setLoading(false);
          setError('Failed to load chat.');
          return;
        }
        // Only allow chat if user is a participant
        if (user.userId === touristId || user._id === touristId || user.userId === guideId || user._id === guideId) {
          const resolvedChatId = res.data.chatId;
          const resolvedMessages = res.data.messages || [];
          const lastMessage = resolvedMessages.length ? resolvedMessages[resolvedMessages.length - 1] : null;

          setChatId(resolvedChatId);
          setMessages(resolvedMessages);
          setChatStatus(res.data.status || 'ACTIVE');
          setContacts((prev) =>
            sortContactsByLatest(
              prev.map((item) =>
                item.userId === selectedUserId
                  ? {
                      ...item,
                      chatId: resolvedChatId,
                      unreadCount: 0,
                      lastMessage: lastMessage || item.lastMessage || null,
                      lastMessageAt:
                        lastMessage?.createdAt ||
                        item.lastMessageAt ||
                        item.lastMessage?.createdAt ||
                        null,
                      preview: buildMessagePreview(lastMessage) || item.preview || ''
                    }
                  : item
              )
            )
          );
          setSelectedContact((prev) =>
            prev && prev.userId === selectedUserId
              ? (prev.chatId === resolvedChatId && Number(prev.unreadCount || 0) === 0
                  ? prev
                  : {
                      ...prev,
                      chatId: resolvedChatId,
                      unreadCount: 0
                    })
              : prev
          );
          setLoading(false);
          setError('');
          markChatAsRead(resolvedChatId, selectedUserId);
          refreshContactsRef.current();
        } else {
          setLoading(false);
          setError('You are not allowed to access this chat.');
        }
      })
      .catch(() => {
        setLoading(false);
        setError('Failed to load chat.');
      });
  }, [selectedContact?.userId, user]);

  // Fetch chat status and messages when chatId changes
  // Only fetch for booking-based chats (not direct chats)
  // Direct chat messages are already loaded from /chat/direct/:touristId/:guideId
  // If you want to support booking-based chat, you can check for bookingId here
  // For now, skip this effect for direct chats

  // Socket.io setup for chat
  useEffect(() => {
    if (!chatId || !user) return;
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_URL);
    }
    const myUserId = String(user.userId || user._id || '');
    socketRef.current.emit('joinRoom', { chatId, userId: myUserId });
    socketRef.current.off('newMessage');
    socketRef.current.on('newMessage', (msg) => {
      setMessages((prev) => {
        if (msg?._id && prev.some((item) => item._id === msg._id)) {
          return prev;
        }
        return [...prev, msg];
      });

      const incomingSenderId = resolveId(msg?.senderId);
      const isIncoming = !!incomingSenderId && incomingSenderId !== myUserId;
      const preview = buildMessagePreview(msg);

      if (selectedContact?.userId) {
        setContacts((prev) =>
          sortContactsByLatest(
            prev.map((item) =>
              item.userId === selectedContact.userId
                ? {
                    ...item,
                    chatId,
                    lastMessage: msg,
                    lastMessageAt: msg?.createdAt || new Date().toISOString(),
                    preview: preview || item.preview || '',
                    unreadCount: 0
                  }
                : item
            )
          )
        );
      }

      if (isIncoming) {
        markChatAsRead(chatId, selectedContact?.userId);
      }
    });
    socketRef.current.off('messageDeleted');
    socketRef.current.on('messageDeleted', ({ messageId }) => {
      setMessages((prev) =>
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
      refreshContactsRef.current();
    });
    return () => {
      if (socketRef.current) {
        socketRef.current.off('newMessage');
        socketRef.current.off('messageDeleted');
      }
    };
  }, [chatId, user, selectedContact?.userId]);

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
  const sendMessage = async ({ content, messageType = 'TEXT', attachment }) => {
    const isTourist = user.role === 'tourist';
    const touristId = isTourist ? (user.userId || user._id) : selectedContact.userId;
    const guideId = isTourist ? selectedContact.userId : user.userId;
    const payload = {
      content,
      messageType,
      attachmentUrl: attachment?.url || '',
      attachmentName: attachment?.name || '',
      attachmentType: attachment?.type || '',
      attachmentSize: attachment?.size || 0
    };
    await api.post(`/chat/direct/${touristId}/${guideId}/message`, payload);
  };

  const handleSend = async () => {
    if (sendingRef.current) return;
    if (!input.trim() || !chatId || !user || isInputDisabled) return;
    sendingRef.current = true;
    setLoading(true);
    try {
      await sendMessage({ content: input, messageType: 'TEXT' });
      // Do not update messages here; rely on socket event only
      setInput('');
      refreshContactsRef.current();
    } catch (err) {
      alert(err.response?.data?.error || 'Message failed');
    }
    setLoading(false);
    setTimeout(() => { sendingRef.current = false; }, 250);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !chatId) return;
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/chat/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const attachment = res.data;
      const isImage = attachment.type?.startsWith('image/');
      await sendMessage({
        content: isImage ? 'Image' : attachment.name || 'Attachment',
        messageType: isImage ? 'IMAGE' : 'FILE',
        attachment
      });
      refreshContactsRef.current();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    try {
      await api.delete(`/chat/message/${messageId}`);
      setMessages((prev) =>
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
      refreshContactsRef.current();
    } catch (err) {
      alert(err?.response?.data?.message || 'Unable to delete message.');
    }
  };

  const handleDeleteForMe = async (messageId) => {
    if (!messageId) return;
    try {
      await api.delete(`/chat/message/${messageId}/for-me`);
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
      refreshContactsRef.current();
    } catch (err) {
      alert(err?.response?.data?.message || 'Unable to delete message.');
    }
  };

  const isWithinDeleteWindow = (value) => {
    if (!value) return false;
    const createdAt = new Date(value).getTime();
    if (Number.isNaN(createdAt)) return false;
    return Date.now() - createdAt <= DELETE_WINDOW_MS;
  };

  const openDeleteDialog = (message) => {
    if (!message?._id) return;
    setDeleteTarget(message);
    setDeleteOpen(true);
  };

  const closeDeleteDialog = () => {
    setDeleteOpen(false);
    setDeleteTarget(null);
  };

  const confirmDeleteForEveryone = async () => {
    if (!deleteTarget?._id) return;
    await handleDeleteMessage(deleteTarget._id);
    closeDeleteDialog();
  };

  const confirmDeleteForMe = async () => {
    if (!deleteTarget?._id) return;
    await handleDeleteForMe(deleteTarget._id);
    closeDeleteDialog();
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
      refreshContactsRef.current();
    }
    if (successIds.length !== ids.length) {
      alert('Some messages could not be deleted.');
    }
    clearSelection();
    closeBulkDeleteDialog();
  };

  const myUserId = user?.userId || user?._id;
  const myUserIdValue = myUserId ? String(myUserId) : '';
  const selectedMessages = useMemo(() => {
    if (!selectedMessageIds.length) return [];
    const idSet = new Set(selectedMessageIds);
    return messages.filter((msg) => idSet.has(msg?._id || msg?.id));
  }, [messages, selectedMessageIds]);
  const canDeleteForEveryone =
    deleteTarget &&
    !deleteTarget.isDeleted &&
    resolveId(deleteTarget?.senderId) === myUserIdValue &&
    isWithinDeleteWindow(deleteTarget.createdAt);
  const canBulkDeleteForEveryone =
    selectedMessages.length > 0 &&
    selectedMessages.every(
      (message) =>
        !message.isDeleted &&
        resolveId(message?.senderId) === myUserIdValue &&
        isWithinDeleteWindow(message.createdAt)
    );

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

  // (Removed duplicate handleSend declaration)

  return (
    <Paper
      elevation={0}
      sx={{
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        height: { xs: 'calc(100vh - 150px)', md: '72vh' },
        minHeight: { xs: 520, md: 620 },
        bgcolor: '#f8fafc',
        background: 'linear-gradient(135deg, #f8fafc 0%, #eef2f7 55%, #ecfeff 100%)',
        borderRadius: { xs: '20px', md: '36px' },
        border: '1px solid rgba(148, 163, 184, 0.28)',
        boxShadow: '0 22px 48px rgba(15, 23, 42, 0.14)',
        overflow: 'hidden'
      }}
    >
      {/* Contact List */}
      <Box
        sx={{
          width: { xs: '100%', md: 330 },
          minWidth: 0,
          display: isMobile && !showConversationList ? 'none' : 'flex',
          bgcolor: 'rgba(255, 255, 255, 0.9)',
          borderRight: { xs: 'none', md: '1px solid rgba(148, 163, 184, 0.2)' },
          backdropFilter: 'blur(12px)',
          p: 0,
          flexDirection: 'column',
          borderTopLeftRadius: { xs: '20px', md: '36px' },
          borderBottomLeftRadius: { xs: 0, md: '36px' },
          borderBottom: { xs: '1px solid rgba(148, 163, 184, 0.2)', md: 'none' },
        }}
      >
        <Box sx={{ p: { xs: 2, md: 3 }, pb: 1 }}>
          <Typography
            variant="h4"
            fontWeight={800}
            mb={0.5}
            sx={{ color: '#0f172a', letterSpacing: '-0.3px', fontSize: { xs: '1.4rem', md: '2rem' } }}
          >
            Messages
          </Typography>
          <Typography variant="subtitle2" sx={{ color: '#475569', fontWeight: 500 }} mb={2}>
            Chat with your guides and hotels in real-time
          </Typography>
          <TextField
            fullWidth
            size="small"
            placeholder="Search chats..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#5f7b71' }} />
                </InputAdornment>
              ),
              sx: {
                borderRadius: 4,
                bgcolor: '#f8fafc',
                color: '#0f172a',
                '& fieldset': { borderColor: '#e2e8f0' },
                '&:hover fieldset': { borderColor: '#cbd5e1' },
                '&.Mui-focused fieldset': { borderColor: '#0f766e' },
                '& input': { color: '#0f172a' },
                '& input::placeholder': { color: '#64748b', opacity: 1 },
              }
            }}
            sx={{ mb: 2 }}
          />
          <ToggleButtonGroup
            value={contactTypeFilter}
            exclusive
            onChange={(_, nextValue) => {
              if (nextValue !== null) setContactTypeFilter(nextValue);
            }}
            size="small"
            fullWidth
            sx={{
              mb: 1,
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                fontWeight: 600,
                color: '#475569',
                borderColor: '#e2e8f0',
                borderRadius: '14px !important',
                '&.Mui-selected': {
                  background: 'linear-gradient(120deg, #0f766e 0%, #0ea5a4 100%)',
                  color: '#ffffff',
                  '&:hover': { background: 'linear-gradient(120deg, #0b5f59 0%, #0d9488 100%)' },
                },
              },
            }}
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="guide">Guides</ToggleButton>
            <ToggleButton value="hotel">Hotels</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <Box sx={{ flex: 1, overflowY: 'auto', px: 1, pb: 2 }}>
          {filteredContacts.length === 0 ? (
            <Typography sx={{ px: 2, py: 1, color: '#68887c' }}>
              No chats found.
            </Typography>
          ) : (
            filteredContacts.map((contact) => {
              return (
              <Box
                key={contact.userId}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                  p: 1.2,
                  mb: 1,
                  borderRadius: 3,
                  cursor: 'pointer',
                  bgcolor: selectedContact?.userId === contact.userId ? 'rgba(18, 166, 131, 0.12)' : 'transparent',
                  transition: 'all 0.2s ease',
                  border: selectedContact?.userId === contact.userId ? '1px solid rgba(14, 163, 128, 0.28)' : '1px solid transparent',
                  '&:hover': {
                    bgcolor: 'rgba(18, 166, 131, 0.08)',
                    transform: 'translateY(-1px)'
                  }
                }}
                onClick={() => {
                  setSelectedContact({ ...contact, unreadCount: 0 });
                  setContacts((prev) =>
                    sortContactsByLatest(
                      prev.map((item) =>
                        item.userId === contact.userId ? { ...item, unreadCount: 0 } : item
                      )
                    )
                  );
                  if (isMobile) setShowConversationList(false);
                }}
              >
                <PremiumAvatar
                  src={contact.avatar}
                  name={contact.name}
                  size={44}
                  variant={contact.type === 'hotel' ? 'rounded' : 'circular'}
                  fallbackIcon={contact.type === 'hotel' ? HotelRoundedIcon : undefined}
                  sx={{
                    border: selectedContact?.userId === contact.userId ? '2px solid #0ea783' : '2px solid #e9f3ee',
                    boxShadow: selectedContact?.userId === contact.userId ? '0 0 0 4px rgba(14, 167, 131, 0.15)' : 'none',
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'space-between' }}>
                    <Typography fontWeight={700} fontSize={17} noWrap sx={{ color: '#10352c', maxWidth: '70%' }}>
                      {contact.name || 'No Name'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600 }}>
                      {formatConversationTime(contact.lastMessageAt || contact.lastMessage?.createdAt)}
                    </Typography>
                  </Box>
                  <Typography fontSize={13} sx={{ color: '#5d7d71' }} noWrap>
                    {contact.preview || contact.subtitle || 'Start a conversation'}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.8 }}>
                  <Chip
                    label={contact.type === 'hotel' ? 'Hotel' : 'Guide'}
                    size="small"
                    sx={{
                      bgcolor: contact.type === 'hotel' ? 'rgba(14, 165, 233, 0.14)' : 'rgba(16, 185, 129, 0.14)',
                      color: contact.type === 'hotel' ? '#0369a1' : '#047857',
                      fontWeight: 700
                    }}
                  />
                  {contact.unreadCount > 0 && (
                    <Box
                      sx={{
                        minWidth: 22,
                        height: 22,
                        px: 0.7,
                        borderRadius: '999px',
                        bgcolor: '#0ea67f',
                        color: '#ffffff',
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 8px 14px rgba(14, 166, 127, 0.3)'
                      }}
                    >
                      {contact.unreadCount > 99 ? '99+' : contact.unreadCount}
                    </Box>
                  )}
                </Box>
              </Box>
            );
            })
          )}
        </Box>
      </Box>
      {/* Chat Window */}
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: isMobile && showConversationList ? 'none' : 'flex',
          flexDirection: 'column',
          bgcolor: 'transparent',
          borderRadius: 0,
          p: 0
        }}
      >
        {selectedContact && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: { xs: 1.5, md: 2.5 },
              background: 'linear-gradient(90deg, rgba(255,255,255,0.9) 0%, rgba(240, 253, 250, 0.7) 100%)',
              borderBottom: '1px solid rgba(148, 163, 184, 0.2)',
              backdropFilter: 'blur(10px)',
              borderTopRightRadius: { xs: '20px', md: '36px' }
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {isMobile && (
                <IconButton
                  onClick={() => {
                    setSelectedContact(null);
                    setShowConversationList(true);
                  }}
                  sx={{ mr: 1 }}
                  aria-label="Back to chats"
                >
                  <ArrowBackRoundedIcon />
                </IconButton>
              )}
              <PremiumAvatar
                src={selectedContact.avatar}
                name={selectedContact.name}
                size={44}
                variant={selectedContact.type === 'hotel' ? 'rounded' : 'circular'}
                fallbackIcon={selectedContact.type === 'hotel' ? HotelRoundedIcon : undefined}
                sx={{ mr: 2 }}
              />
              <Box>
                <Typography fontWeight={800} fontSize={{ xs: 16, md: 20 }} sx={{ color: '#10352c' }}>
                  {selectedContact.name}
                </Typography>
                <Typography fontSize={13} sx={{ color: '#55786c' }} noWrap>
                  {selectedContact.subtitle || ''}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
          <Box sx={{ px: 3, py: 1, bgcolor: 'rgba(255,255,255,0.64)', borderBottom: '1px solid rgba(148, 163, 184, 0.2)' }}>
            <Chip label={chatNotice} color={chatStatus === 'LOCKED' ? 'error' : chatStatus === 'POST_TOUR' ? 'warning' : chatStatus === 'CLOSED' ? 'default' : 'success'} />
          </Box>
        )}
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: 0,
            py: 0,
            background:
              'linear-gradient(180deg, rgba(248,250,252,0.9) 0%, rgba(236,254,255,0.7) 100%)',
            backgroundImage:
              'radial-gradient(circle at 20px 20px, rgba(15, 118, 110, 0.08) 2px, transparent 0), radial-gradient(circle at 80px 80px, rgba(59, 130, 246, 0.06) 2px, transparent 0)',
            backgroundSize: '120px 120px',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {loading ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
              <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>
              <Button
                onClick={() => {
                  setSelectedContact(null);
                  if (isMobile) setShowConversationList(true);
                }}
                color="primary"
                variant="outlined"
              >
                Back
              </Button>
            </Box>
          ) : (
            <Box sx={{ flex: 1, px: { xs: 1.5, md: 3 }, py: 2, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {messages.length === 0 && (
                <Typography sx={{ textAlign: 'center', mt: 8, color: '#597b70' }}>
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
                const isTouristUser = user?.role === 'tourist';
                const isGuideLikeUser = user?.role === 'guide' || user?.role === 'hotel';
                let isMe = false;
                if (senderRole) {
                  if (isTouristUser) {
                    isMe = senderRole === 'tourist';
                  } else if (isGuideLikeUser) {
                    isMe = senderRole === 'guide';
                  } else {
                    isMe = senderId && myUserIdValue ? senderId === myUserIdValue : false;
                  }
                } else {
                  isMe = senderId && myUserIdValue ? senderId === myUserIdValue : false;
                }
                const senderAvatar = msg?.senderAvatar || msg?.senderId?.avatar || '';
                const incomingAvatar = senderAvatar || selectedContact?.avatar;
                const outgoingAvatar = user?.avatar || senderAvatar;
                const messageId = msg?._id || msg?.id;
                const isSelected = selectionMode && messageId
                  ? selectedMessageIds.includes(messageId)
                  : false;
                const canSelect = selectionMode && messageId && !msg.isDeleted;
                const canDelete = !msg.isDeleted;
                const canDeleteForEveryoneMessage =
                  !msg.isDeleted && isMe && isWithinDeleteWindow(msg.createdAt);
                const deleteTooltip = canDeleteForEveryoneMessage
                  ? 'Delete for everyone (available for 1 hour)'
                  : 'Delete for me (delete for everyone is only available for your messages within 1 hour)';
                const attachmentUrl = msg.attachmentUrl
                  ? buildImageUrl(msg.attachmentUrl)
                  : '';
                return (
                  <Box key={row.id || idx} sx={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start', alignItems: 'flex-end', mb: 1 }}>
                    <Box sx={{
                      background: isMe
                        ? 'linear-gradient(135deg, #0f766e 0%, #0ea5a4 100%)'
                        : '#ffffff',
                      color: isMe ? '#ffffff' : '#0f172a',
                      px: selectionMode ? 2.5 : 2,
                      py: selectionMode ? 2 : 1.2,
                      pl: selectionMode ? 4 : 2,
                      pt: selectionMode ? 2.2 : 1.2,
                      borderRadius: isMe ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
                      maxWidth: { xs: '90%', sm: 380 },
                      boxShadow: isMe
                        ? '0 12px 24px rgba(15, 118, 110, 0.24)'
                        : '0 12px 22px rgba(15, 23, 42, 0.12)',
                      border: isMe ? 'none' : '1px solid #e2e8f0',
                      position: 'relative',
                      outline: isSelected ? '2px solid #0ea67f' : 'none',
                      cursor: canSelect ? 'pointer' : 'default',
                      '&:hover .message-delete': {
                        opacity: 1,
                        pointerEvents: 'auto',
                      },
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
                            color: isMe ? '#f8fffd' : '#33574b',
                            '&.Mui-checked': {
                              color: isMe ? '#ffffff' : '#0f172a',
                            },
                          }}
                        />
                      )}
                      {msg.isDeleted ? (
                        <Typography fontSize={14} sx={{ wordBreak: 'break-word', fontStyle: 'italic', color: isMe ? 'rgba(255,255,255,0.85)' : '#5b7d72' }}>
                          This message was deleted
                        </Typography>
                      ) : msg.messageType === 'IMAGE' && attachmentUrl ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <img
                            src={attachmentUrl}
                            alt={msg.attachmentName || 'Image'}
                            style={{ maxWidth: 220, borderRadius: 8 }}
                          />
                          <Typography variant="caption" sx={{ opacity: 0.8 }}>
                            {msg.attachmentName || 'Image'}
                          </Typography>
                        </Box>
                      ) : msg.messageType === 'FILE' && attachmentUrl ? (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography fontWeight={600}>
                            {msg.attachmentName || 'File'}
                          </Typography>
                          <a href={attachmentUrl} download style={{ color: isMe ? '#d7fff4' : '#0c7fb2' }}>
                            Download
                          </a>
                        </Box>
                      ) : (
                        <Typography fontSize={15} sx={{ wordBreak: 'break-word' }}>{msg.content}</Typography>
                      )}
                      {canDelete && !selectionMode && (
                        <Tooltip title={deleteTooltip} placement="top" arrow>
                          <IconButton
                            size="small"
                            onClick={() => openDeleteDialog(msg)}
                            className="message-delete"
                            sx={{
                              position: 'absolute',
                              top: 4,
                              right: 4,
                              color: isMe ? '#f8fffd' : '#33574b',
                              bgcolor: isMe ? 'rgba(255, 255, 255, 0.16)' : 'rgba(15, 23, 42, 0.08)',
                              opacity: 0,
                              pointerEvents: 'none',
                              transition: 'opacity 0.2s ease',
                              '&:hover': { bgcolor: isMe ? 'rgba(255, 255, 255, 0.24)' : 'rgba(15, 23, 42, 0.16)' },
                            }}
                          >
                            <DeleteOutlineIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                      <Typography
                        fontSize={11}
                        sx={{
                          mt: 0.5,
                          textAlign: 'right',
                          opacity: 0.85,
                          color: isMe ? 'rgba(255,255,255,0.95)' : '#64748b'
                        }}
                      >
                        {formatMessageTime(msg.createdAt)}
                      </Typography>
                    </Box>
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
            alignItems: 'center',
            bgcolor: 'rgba(255, 255, 255, 0.9)',
            p: { xs: 1.25, md: 2 },
            borderTop: '1px solid rgba(148, 163, 184, 0.2)',
            boxShadow: 'none',
            mt: 'auto',
            flexDirection: 'column',
            gap: 1,
            backdropFilter: 'blur(10px)',
            borderBottomRightRadius: { xs: '20px', md: '36px' },
            borderBottomLeftRadius: { xs: '20px', md: 0 },
          }}
        >
          {emojiOpen && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignSelf: 'flex-start' }}>
              {emojiList.map((emoji) => (
                <IconButton key={emoji} size="small" onClick={() => setInput((prev) => `${prev}${emoji}`)}>
                  <span style={{ fontSize: 18 }}>{emoji}</span>
                </IconButton>
              ))}
            </Box>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', minWidth: 0 }}>
            <IconButton size="small" onClick={() => setEmojiOpen((prev) => !prev)}>
              <EmojiEmotionsOutlinedIcon />
            </IconButton>
            <IconButton size="small" onClick={() => fileInputRef.current?.click()}>
              <AttachFileIcon />
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
            />
            <TextField
              placeholder="Type your message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              variant="outlined"
              size="medium"
              sx={{
                flex: 1,
                minWidth: 0,
                bgcolor: '#ffffff',
                borderRadius: 3,
                fontSize: 16,
                '& .MuiOutlinedInput-root': {
                  color: '#0f172a',
                  '& fieldset': { borderColor: '#e2e8f0' },
                  '&:hover fieldset': { borderColor: '#cbd5e1' },
                  '&.Mui-focused fieldset': { borderColor: '#0f766e' },
                },
                '& input::placeholder': { color: '#64748b', opacity: 1 },
              }}
              onKeyDown={e => { if (e.key === 'Enter') handleSend(); }}
              disabled={isInputDisabled || loading || !!error}
              inputProps={{ style: { fontSize: 16, padding: '12px' } }}
            />
            <Button
              variant="contained"
              color="success"
              sx={{
                minWidth: { xs: 76, sm: 92 },
                height: { xs: 42, sm: 48 },
                borderRadius: '999px',
                fontWeight: 700,
                fontSize: { xs: 14, sm: 16 },
                px: { xs: 1.6, sm: 2.5 },
                flexShrink: 0,
                boxShadow: '0 10px 20px rgba(15, 118, 110, 0.25)',
                textTransform: 'none',
                background: 'linear-gradient(120deg, #0f766e 0%, #0ea5a4 100%)',
                '&:hover': { background: 'linear-gradient(120deg, #0b5f59 0%, #0d9488 100%)' },
              }}
              onClick={handleSend}
              disabled={!input.trim() || isInputDisabled || loading || !!error}
            >
              Send
            </Button>
          </Box>
        </Box>
      </Box>
      <Dialog open={deleteOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Delete message?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Delete for me removes it only from your view. Delete for everyone is available within 1 hour of sending.
          </Typography>
          {!canDeleteForEveryone && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled' }}>
              This message is older than 1 hour, so it can only be deleted for you.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeDeleteDialog} variant="outlined">
            Cancel
          </Button>
          <Button onClick={confirmDeleteForMe} variant="contained">
            Delete for me
          </Button>
          <Button onClick={confirmDeleteForEveryone} variant="contained" color="error" disabled={!canDeleteForEveryone}>
            Delete for everyone
          </Button>
        </DialogActions>
      </Dialog>
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
