
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputBase,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import useMediaQuery from "@mui/material/useMediaQuery";
import SearchIcon from "@mui/icons-material/Search";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EmojiEmotionsOutlinedIcon from "@mui/icons-material/EmojiEmotionsOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import SendIcon from "@mui/icons-material/Send";
import DoneAllIcon from "@mui/icons-material/DoneAll";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { io } from "socket.io-client";
import api from "../api";
import { SOCKET_BASE_URL, toAbsoluteAssetUrl } from "../config/runtime";

const listItemStyle = {
  p: 1.5,
  borderRadius: 2,
  display: "flex",
  gap: 1.5,
  alignItems: "center",
  cursor: "pointer",
  position: "relative",
  transition: "all 0.2s ease",
};

const formatTimestamp = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const now = new Date();
  const diff = now - date;
  if (diff < 1000 * 60 * 60 * 24) {
    return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  if (diff < 1000 * 60 * 60 * 48) {
    return "Yesterday";
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatDateDivider = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB");
};

const isRecentlyActive = (value) => {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() < 1000 * 60 * 5;
};

const formatDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const candidate = value._id || value.id || value.userId;
    if (!candidate) return "";
    return typeof candidate === "string" ? candidate : String(candidate);
  }
  return String(value);
};

const emojiList = ["😀", "😊", "😍", "👍", "🙏", "🎉", "😢", "😮", "🔥", "✅"];
const DELETE_WINDOW_MS = 60 * 60 * 1000;

export default function HotelChat({ showHeader = true }) {
  const isNarrow = useMediaQuery("(max-width:900px)");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const [tourists, setTourists] = useState([]);
  const [messagesByChat, setMessagesByChat] = useState({});
  const [messageInput, setMessageInput] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const socketRef = useRef(null);
  const fileInputRef = useRef(null);
  const selectedChatIdRef = useRef(null);
  const refreshTouristsRef = useRef(null);
  const userId = localStorage.getItem("userId");
  const userIdValue = userId ? String(userId) : "";
  const userRole = localStorage.getItem("role") || "hotel";

  const filteredTourists = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tourists;
    return tourists.filter((tourist) =>
      tourist.name.toLowerCase().includes(term)
    );
  }, [search, tourists]);

  const selectedTourist = tourists.find((tourist) => tourist.id === selectedId);
  const messages = selectedTourist?.chatId
    ? messagesByChat[selectedTourist.chatId] || []
    : [];

  useEffect(() => {
    if (!isNarrow && !selectedId && tourists.length > 0) {
      setSelectedId(tourists[0].id);
    }
  }, [isNarrow, selectedId, tourists]);

  const selectedMessages = useMemo(() => {
    if (!selectedMessageIds.length) return [];
    const idSet = new Set(selectedMessageIds);
    return messages.filter((message) => idSet.has(message?._id || message?.id));
  }, [messages, selectedMessageIds]);
  const messageRows = useMemo(() => {
    const rows = [];
    let previousDateKey = "";
    messages.forEach((msg, idx) => {
      const dateKey = getDateKey(msg.createdAt);
      if (dateKey && dateKey !== previousDateKey) {
        rows.push({
          type: "divider",
          id: `date-${dateKey}-${idx}`,
          label: formatDateDivider(msg.createdAt),
        });
        previousDateKey = dateKey;
      }
      rows.push({
        type: "message",
        id: msg._id || `msg-${idx}`,
        message: msg,
      });
    });
    return rows;
  }, [messages]);

  useEffect(() => {
    selectedChatIdRef.current = selectedTourist?.chatId || null;
  }, [selectedTourist?.chatId]);

  useEffect(() => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  }, [selectedTourist?.chatId]);

  useEffect(() => {
    if (!userId) return;
    const socket = io(SOCKET_BASE_URL, { transports: ["websocket"] });
    socketRef.current = socket;

    socket.on("newMessage", (msg) => {
      setMessagesByChat((prev) => {
        const existing = prev[msg.chatId] || [];
        if (existing.some((item) => item._id === msg._id)) return prev;
        return { ...prev, [msg.chatId]: [...existing, msg] };
      });

      setTourists((prev) => {
        const exists = prev.some((tourist) => tourist.chatId === msg.chatId);
        if (!exists && refreshTouristsRef.current) {
          refreshTouristsRef.current();
          return prev;
        }
        return prev.map((tourist) => {
          if (tourist.chatId !== msg.chatId) return tourist;
          const isActive = selectedChatIdRef.current === msg.chatId;
          const lastMessageText = msg.isDeleted
            ? "This message was deleted"
            : msg.content;
          return {
            ...tourist,
            lastMessage: lastMessageText,
            lastMessageAt: msg.createdAt,
            time: formatTimestamp(msg.createdAt),
            online: isRecentlyActive(msg.createdAt),
            unread: isActive ? 0 : (tourist.unread || 0) + 1,
          };
        });
      });
    });

    socket.on("messageDeleted", ({ messageId, chatId }) => {
      setMessagesByChat((prev) => {
        if (!chatId) return prev;
        const existing = prev[chatId] || [];
        const updated = existing.map((msg) =>
          msg._id === messageId
            ? {
                ...msg,
                isDeleted: true,
                content: "",
                attachmentUrl: "",
                attachmentName: "",
                attachmentType: "",
                attachmentSize: 0,
                messageType: "TEXT",
              }
            : msg
        );
        return { ...prev, [chatId]: updated };
      });
      if (refreshTouristsRef.current) {
        refreshTouristsRef.current();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const loadTourists = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/chat/hotel/${userId}/tourists`);
        const touristsData = data.tourists || [];
        const mapped = touristsData
          .map((item) => {
            if (!item?.tourist?._id) return null;
            const lastMessage = item.lastMessage;
            const lastMessageText = lastMessage?.isDeleted
              ? "This message was deleted"
              : lastMessage?.content || "No messages yet";
            const displayName =
              item.tourist?.fullName ||
              item.tourist?.name ||
              item.tourist?.email ||
              "";
            if (!displayName) return null;
            const displayBookingId = item.hotelBookingId || item.bookingId || null;
            return {
              id: item.tourist._id,
              name: displayName,
              avatar: item.tourist?.avatar || "",
              room: item.room || item.tourist?.roomNumber || item.roomType || "--",
              bookingId: displayBookingId ? String(displayBookingId).slice(-6) : "N/A",
              bookingIdRaw: null,
              chatId: item.chatId,
              lastMessage: lastMessageText,
              lastMessageAt: lastMessage?.createdAt || null,
              time: formatTimestamp(lastMessage?.createdAt),
              unread: item.unreadCount || 0,
              online: isRecentlyActive(lastMessage?.createdAt),
            };
          })
          .filter(Boolean);

        setTourists(mapped);
        if (mapped.length > 0) {
          setSelectedId((prevSelectedId) => {
            const hasCurrent = prevSelectedId && mapped.some((item) => item.id === prevSelectedId);
            if (hasCurrent) return prevSelectedId;
            return isNarrow ? null : mapped[0].id;
          });
        } else {
          setSelectedId(null);
        }
      } catch (error) {
        setTourists([]);
      } finally {
        setLoading(false);
      }
    };

    refreshTouristsRef.current = loadTourists;
    loadTourists();
  }, [userId, isNarrow]);

  useEffect(() => {
    if (!selectedTourist?.id || !userId) return;
    const loadMessages = async () => {
      try {
        const response = await api.get(`/chat/direct/${selectedTourist.id}/${userId}`);
        const chatId = response.data?.chatId;
        const messagesList = response.data?.messages || [];
        if (chatId) {
          setMessagesByChat((prev) => ({ ...prev, [chatId]: messagesList }));
          setTourists((prev) =>
            prev.map((tourist) =>
              tourist.id === selectedTourist.id ? { ...tourist, chatId } : tourist
            )
          );
        }
      } catch (error) {
        // ignore
      }
    };

    loadMessages();
  }, [selectedTourist?.id, userId]);

  useEffect(() => {
    if (!selectedTourist?.chatId || !socketRef.current || !userId) return;
    socketRef.current.emit("joinRoom", { chatId: selectedTourist.chatId, userId });
  }, [selectedTourist?.chatId, userId]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setTourists((prev) =>
      prev.map((tourist) =>
        tourist.id === id ? { ...tourist, unread: 0 } : tourist
      )
    );
  };

  const sendMessage = async ({ content, messageType = "TEXT", attachment }) => {
    if (!selectedTourist || !userId) return;
    const payload = {
      content,
      messageType,
      attachmentUrl: attachment?.url || "",
      attachmentName: attachment?.name || "",
      attachmentType: attachment?.type || "",
      attachmentSize: attachment?.size || 0,
    };
    await api.post(`/chat/direct/${selectedTourist.id}/${userId}/message`, payload);
  };

  const handleSend = async () => {
    const text = messageInput.trim();
    if (!text || !selectedTourist?.chatId || !userId) return;
    try {
      await sendMessage({ content: text, messageType: "TEXT" });
      setTourists((prev) =>
        prev.map((tourist) =>
          tourist.id === selectedId
            ? {
                ...tourist,
                lastMessage: text,
                lastMessageAt: new Date().toISOString(),
                time: "Now",
              }
            : tourist
        )
      );
      setMessageInput("");
    } catch (err) {
      // ignore
    }
  };

  const handleDeleteMessage = async (messageId) => {
    if (!messageId) return;
    try {
      await api.delete(`/chat/message/${messageId}`);
      setMessagesByChat((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          updated[key] = updated[key].map((msg) =>
            msg._id === messageId
              ? {
                  ...msg,
                  isDeleted: true,
                  content: "",
                  attachmentUrl: "",
                  attachmentName: "",
                  attachmentType: "",
                  attachmentSize: 0,
                  messageType: "TEXT",
                }
              : msg
          );
        });
        return updated;
      });
      if (refreshTouristsRef.current) {
        refreshTouristsRef.current();
      }
    } catch (err) {
      const message = err?.response?.data?.message || "Unable to delete message.";
      alert(message);
    }
  };

  const handleDeleteForMe = async (messageId) => {
    if (!messageId) return;
    try {
      await api.delete(`/chat/message/${messageId}/for-me`);
      setMessagesByChat((prev) => {
        const updated = { ...prev };
        Object.keys(updated).forEach((key) => {
          updated[key] = updated[key].filter((msg) => msg._id !== messageId);
        });
        return updated;
      });
      if (refreshTouristsRef.current) {
        refreshTouristsRef.current();
      }
    } catch (err) {
      const message = err?.response?.data?.message || "Unable to delete message.";
      alert(message);
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
    if (!selectedTourist?.chatId) return;
    const idSet = new Set(ids);
    setMessagesByChat((prev) => {
      const updated = { ...prev };
      updated[selectedTourist.chatId] = (updated[selectedTourist.chatId] || []).map((msg) => {
        const msgId = msg?._id || msg?.id;
        if (!idSet.has(msgId)) return msg;
        return {
          ...msg,
          isDeleted: true,
          content: "",
          attachmentUrl: "",
          attachmentName: "",
          attachmentType: "",
          attachmentSize: 0,
          messageType: "TEXT",
        };
      });
      return updated;
    });
  };

  const applyDeleteForMe = (ids) => {
    if (!selectedTourist?.chatId) return;
    const idSet = new Set(ids);
    setMessagesByChat((prev) => {
      const updated = { ...prev };
      updated[selectedTourist.chatId] = (updated[selectedTourist.chatId] || []).filter((msg) => {
        const msgId = msg?._id || msg?.id;
        return !idSet.has(msgId);
      });
      return updated;
    });
  };

  const handleBulkDelete = async (mode) => {
    const ids = selectedMessageIds.filter(Boolean);
    if (!ids.length) return;
    const successIds = [];
    for (const id of ids) {
      try {
        if (mode === "everyone") {
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
      if (mode === "everyone") {
        applyDeleteForEveryone(successIds);
      } else {
        applyDeleteForMe(successIds);
      }
    }
    if (successIds.length !== ids.length) {
      alert("Some messages could not be deleted.");
    }
    if (refreshTouristsRef.current) {
      refreshTouristsRef.current();
    }
    clearSelection();
    closeBulkDeleteDialog();
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

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !selectedTourist?.chatId) return;
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await api.post("/chat/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const attachment = res.data;
      const isImage = attachment.type?.startsWith("image/");
      await sendMessage({
        content: isImage ? "Image" : attachment.name || "Attachment",
        messageType: isImage ? "IMAGE" : "FILE",
        attachment,
      });
      setTourists((prev) =>
        prev.map((tourist) =>
          tourist.id === selectedId
            ? {
                ...tourist,
                lastMessage: attachment.name || "Attachment",
                lastMessageAt: new Date().toISOString(),
                time: "Now",
              }
            : tourist
        )
      );
    } catch (err) {
      // ignore
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const canDeleteForEveryone =
    deleteTarget &&
    !deleteTarget.isDeleted &&
    resolveId(deleteTarget?.senderId) === userIdValue &&
    isWithinDeleteWindow(deleteTarget.createdAt);
  const canBulkDeleteForEveryone =
    selectedMessages.length > 0 &&
    selectedMessages.every(
      (message) =>
        !message.isDeleted &&
        resolveId(message?.senderId) === userIdValue &&
        isWithinDeleteWindow(message.createdAt)
    );
  const showTouristListPane = !isNarrow || !selectedTourist;
  const showThreadPane = !isNarrow || Boolean(selectedTourist);

  return (
    <Box
      sx={{
        height: { xs: "calc(100dvh - 190px)", md: "calc(100vh - 220px)" },
        minHeight: { xs: 520, md: 600 },
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        gap: 2.5,
      }}
    >
      <Paper
        sx={{
          width: { xs: "100%", md: "30%" },
          minWidth: { md: 260 },
          bgcolor: "#f8fffb",
          color: "#123b2f",
          p: 2,
          borderRadius: 3,
          border: "1px solid #d7e8df",
          boxShadow: "0 16px 36px rgba(13, 86, 67, 0.12)",
          display: showTouristListPane ? "flex" : "none",
          flexDirection: "column",
        }}
      >
        <Box sx={{ mb: 2 }}>
          <Typography variant="h6" fontWeight={700}>
            Tourist Messages
          </Typography>
          <Typography variant="body2" sx={{ color: "#5a7b70" }}>
            Chat with your guests
          </Typography>
        </Box>
        <Paper
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1.5,
            py: 0.5,
            borderRadius: 999,
            bgcolor: "#ffffff",
            border: "1px solid #d3e5dc",
            mb: 2,
            boxShadow: "0 6px 16px rgba(13, 86, 67, 0.08)",
          }}
        >
          <SearchIcon sx={{ color: "#6d8a80" }} fontSize="small" />
          <InputBase
            placeholder="Search tourists"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            sx={{ color: "#1b3c32", width: "100%" }}
          />
        </Paper>
        <Box sx={{ flex: 1, overflowY: "auto", pr: 0.5 }}>
          <Stack spacing={1.2}>
            {loading && (
              <Typography variant="body2" sx={{ color: "#6c887d" }}>
                Loading tourists...
              </Typography>
            )}
            {!loading && filteredTourists.length === 0 && (
              <Typography variant="body2" sx={{ color: "#6c887d" }}>
                No active guest chats yet.
              </Typography>
            )}
            {filteredTourists.map((tourist) => {
              const isActive = tourist.id === selectedId;
              return (
                <Box
                  key={tourist.id}
                  onClick={() => handleSelect(tourist.id)}
                  sx={{
                    ...listItemStyle,
                    bgcolor: isActive ? "rgba(16,166,128,0.14)" : "transparent",
                    borderLeft: isActive ? "3px solid #0ea67f" : "3px solid transparent",
                    "&:hover": {
                      bgcolor: isActive ? "rgba(16,166,128,0.18)" : "rgba(14,166,127,0.08)",
                    },
                  }}
                >
                  <Box sx={{ position: "relative" }}>
                    <Avatar
                      sx={{ bgcolor: "#e4f2ec", color: "#1b3c32" }}
                      src={tourist.avatar ? toAbsoluteAssetUrl(tourist.avatar) : undefined}
                    >
                      {tourist.name
                        .split(" ")
                        .map((item) => item[0])
                        .join("")}
                    </Avatar>
                    {tourist.online && (
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 2,
                          right: 2,
                          width: 10,
                          height: 10,
                          bgcolor: "#22c55e",
                          borderRadius: "50%",
                          border: "2px solid #f8fffb",
                        }}
                      />
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography fontWeight={700} noWrap>{tourist.name}</Typography>
                    <Typography variant="caption" sx={{ color: "#6b857b", display: "block" }}>
                      Room {tourist.room}
                    </Typography>
                    <Typography variant="body2" sx={{ color: "#6b857b" }} noWrap>
                      {tourist.lastMessage}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: "right" }}>
                    <Typography variant="caption" sx={{ color: "#6b857b" }}>
                      {tourist.time}
                    </Typography>
                    {tourist.unread > 0 && (
                      <Badge
                        badgeContent={tourist.unread}
                        sx={{
                          "& .MuiBadge-badge": {
                            bgcolor: "#0ea67f",
                            color: "#ffffff",
                            fontWeight: 700,
                          },
                        }}
                      />
                    )}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        </Box>
      </Paper>

      <Paper
        sx={{
          flex: 1,
          bgcolor: "#f8fafc",
          borderRadius: 3,
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.12)",
          display: showThreadPane ? "flex" : "none",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <Box
          sx={{
            p: { xs: 1.5, md: 2.5 },
            borderBottom: "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#fff",
            gap: 1,
          }}
        >
          <Stack direction="row" spacing={1.5} alignItems="center">
            {isNarrow && (
              <IconButton size="small" onClick={() => setSelectedId(null)} aria-label="Back to tourists">
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            )}
            <Avatar sx={{ bgcolor: "#14b8a6" }}>
              {selectedTourist?.name
                ?.split(" ")
                .map((item) => item[0])
                .join("")}
            </Avatar>
            <Box>
              <Typography fontWeight={700} sx={{ fontSize: { xs: 15, md: 16 } }}>{selectedTourist?.name}</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", maxWidth: { xs: 170, sm: 380 } }} noWrap>
                Room {selectedTourist?.room ?? "--"} - Booking {selectedTourist?.bookingId ?? "N/A"}
              </Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" justifyContent="flex-end">
            {selectionMode ? (
              <>
                <Chip
                  label={`${selectedMessageIds.length} selected`}
                  size="small"
                  sx={{ bgcolor: "rgba(15,23,42,0.08)", fontWeight: 600 }}
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
            <IconButton>
              <MoreVertIcon />
            </IconButton>
          </Stack>
        </Box>

        <Box sx={{ flex: 1, overflowY: "auto", p: { xs: 1.5, md: 3 } }}>
          <Stack spacing={2.5} mt={2}>
            {messageRows.map((row) => {
              if (row.type === "divider") {
                return (
                  <Box key={row.id} sx={{ display: "flex", justifyContent: "center", my: 1 }}>
                    <Chip
                      label={row.label}
                      size="small"
                      sx={{
                        bgcolor: "rgba(15, 23, 42, 0.08)",
                        color: "#36574c",
                        fontWeight: 700,
                        borderRadius: "10px",
                        height: 26,
                        "& .MuiChip-label": { px: 1.5 },
                      }}
                    />
                  </Box>
                );
              }
                const message = row.message;
                const isAdmin = message.senderRole
                  ? message.senderRole !== "tourist"
                  : message.sender === "admin";
                const senderId = resolveId(message?.senderId);
                const senderRole = message?.senderRole || "";
                let isMe = false;
                if (senderRole) {
                  isMe = userRole === "hotel" ? senderRole === "guide" : senderRole === userRole;
                } else {
                  isMe = senderId && userIdValue ? senderId === userIdValue : false;
                }
              const messageId = message?._id || message?.id;
              const isSelected = selectionMode && messageId
                ? selectedMessageIds.includes(messageId)
                : false;
              const canSelect = selectionMode && messageId && !message.isDeleted;
              const canDelete = !message.isDeleted;
              const canDeleteForEveryoneMessage =
                !message.isDeleted && isMe && isWithinDeleteWindow(message.createdAt);
              const deleteTooltip = canDeleteForEveryoneMessage
                ? "Delete for everyone (available for 1 hour)"
                : "Delete for me (delete for everyone is only available for your messages within 1 hour)";
              const attachmentUrl = message.attachmentUrl
                ? toAbsoluteAssetUrl(message.attachmentUrl)
                : "";
              return (
                <Box
                  key={message._id || message.id}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: isAdmin ? "flex-end" : "flex-start",
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: { xs: "84%", md: "75%" },
                      bgcolor: isAdmin ? "#14b8a6" : "#e2e8f0",
                      color: isAdmin ? "#fff" : "#0f172a",
                      px: selectionMode ? 2.5 : 2,
                      py: selectionMode ? 2 : 1.5,
                      pl: selectionMode ? 4 : 2,
                      pt: selectionMode ? 2.5 : 1.5,
                      borderRadius: 3,
                      boxShadow: "0 4px 10px rgba(15, 23, 42, 0.08)",
                      position: "relative",
                      outline: isSelected ? "2px solid #0ea67f" : "none",
                      cursor: canSelect ? "pointer" : "default",
                      "&:hover .message-delete": {
                        opacity: 1,
                        pointerEvents: "auto",
                      },
                    }}
                    onClick={() => {
                      if (canSelect) toggleMessageSelection(messageId);
                    }}
                  >
                    {canSelect && (
                      <Checkbox
                        size="small"
                        checked={isSelected}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleMessageSelection(messageId);
                        }}
                        sx={{
                          position: "absolute",
                          top: 4,
                          left: 4,
                          color: isAdmin ? "#e2e8f0" : "#475569",
                          "&.Mui-checked": {
                            color: isAdmin ? "#ffffff" : "#0f172a",
                          },
                        }}
                      />
                    )}
                    {message.isDeleted ? (
                      <Typography sx={{ fontStyle: "italic", color: isAdmin ? "rgba(255,255,255,0.85)" : "#64748b" }}>
                        This message was deleted
                      </Typography>
                    ) : message.messageType === "IMAGE" && attachmentUrl ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        <img
                          src={attachmentUrl}
                          alt={message.attachmentName || "Image"}
                          style={{ maxWidth: 240, borderRadius: 8 }}
                        />
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>
                          {message.attachmentName || "Image"}
                        </Typography>
                      </Box>
                    ) : message.messageType === "FILE" && attachmentUrl ? (
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
                        <Typography fontWeight={600}>
                          {message.attachmentName || "File"}
                        </Typography>
                        <a href={attachmentUrl} download style={{ color: isAdmin ? "#fff" : "#0f172a" }}>
                          Download
                        </a>
                      </Box>
                    ) : (
                      <Typography>{message.content || message.text}</Typography>
                    )}
                    {canDelete && !selectionMode && (
                      <Tooltip title={deleteTooltip} placement="top" arrow>
                        <IconButton
                          size="small"
                          onClick={() => openDeleteDialog(message)}
                          className="message-delete"
                          sx={{
                            position: "absolute",
                            top: 4,
                            right: 4,
                            color: isAdmin ? "#e2e8f0" : "#475569",
                            bgcolor: "rgba(15, 23, 42, 0.08)",
                            opacity: 0,
                            pointerEvents: "none",
                            transition: "opacity 0.2s ease",
                            "&:hover": { bgcolor: "rgba(15, 23, 42, 0.16)" },
                          }}
                        >
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                  <Stack direction="row" spacing={0.5} alignItems="center" mt={0.6}>
                    <Typography variant="caption" sx={{ color: "#94a3b8" }}>
                      {formatDateTime(message.createdAt)}
                    </Typography>
                    {isAdmin && <DoneAllIcon sx={{ fontSize: 14, color: "#94a3b8" }} />}
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Box>

        <Box
          sx={{
            p: { xs: 1.25, md: 2 },
            borderTop: "1px solid #e2e8f0",
            background: "#fff",
            position: "sticky",
            bottom: 0,
          }}
        >
          {emojiOpen && (
            <Box sx={{ mb: 1, display: "flex", flexWrap: "wrap", gap: 1 }}>
              {emojiList.map((emoji) => (
                <IconButton
                  key={emoji}
                  size="small"
                  onClick={() => setMessageInput((prev) => `${prev}${emoji}`)}
                >
                  <span style={{ fontSize: 18 }}>{emoji}</span>
                </IconButton>
              ))}
            </Box>
          )}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 1,
              px: { xs: 1.25, md: 2 },
              borderRadius: { xs: 2.5, md: 999 },
              bgcolor: "#fff",
              boxShadow: "0 6px 18px rgba(15, 23, 42, 0.08)",
            }}
          >
            <IconButton size="small" onClick={() => setEmojiOpen((prev) => !prev)}>
              <EmojiEmotionsOutlinedIcon />
            </IconButton>
            <InputBase
              placeholder="Type your message..."
              value={messageInput}
              onChange={(event) => setMessageInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") handleSend();
              }}
              sx={{ flex: 1, px: 1, fontSize: { xs: 14, md: 15 } }}
            />
            <IconButton size="small" onClick={() => fileInputRef.current?.click()}>
              <AttachFileIcon />
            </IconButton>
            <input
              ref={fileInputRef}
              type="file"
              style={{ display: "none" }}
              onChange={handleFileUpload}
            />
            <IconButton
              onClick={handleSend}
              sx={{
                bgcolor: "#14b8a6",
                color: "#fff",
                "&:hover": { bgcolor: "#0f766e" },
              }}
            >
              <SendIcon />
            </IconButton>
          </Box>
        </Box>
      </Paper>
      <Dialog open={deleteOpen} onClose={closeDeleteDialog}>
        <DialogTitle>Delete message?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            Delete for me removes it only from your view. Delete for everyone is available within 1 hour of sending.
          </Typography>
          {!canDeleteForEveryone && (
            <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.disabled" }}>
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
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            You have selected {selectedMessageIds.length} message(s). Delete for me removes them only from your view.
          </Typography>
          {!canBulkDeleteForEveryone && (
            <Typography variant="caption" sx={{ display: "block", mt: 1, color: "text.disabled" }}>
              Delete for everyone is only available for your messages sent within the last hour.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeBulkDeleteDialog} variant="outlined">
            Cancel
          </Button>
          <Button onClick={() => handleBulkDelete("me")} variant="contained">
            Delete for me
          </Button>
          <Button
            onClick={() => handleBulkDelete("everyone")}
            variant="contained"
            color="error"
            disabled={!canBulkDeleteForEveryone}
          >
            Delete for everyone
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
