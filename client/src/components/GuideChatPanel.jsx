import React, { useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import api from '../api';
import { SOCKET_BASE_URL } from '../config/runtime';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import SendIcon from '@mui/icons-material/Send';
import CircularProgress from '@mui/material/CircularProgress';

const SOCKET_URL = SOCKET_BASE_URL;

export default function GuideChatPanel({ guideId }) {
  const [tourists, setTourists] = useState([]);
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const chatIdRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Fetch unique tourists for this guide
  useEffect(() => {
    async function fetchTourists() {
      setLoading(true);
      try {
        const res = await api.get(`/chat/guide/${guideId}/tourists`);
        setTourists(res.data.tourists);
      } catch (err) {
        setTourists([]);
      }
      setLoading(false);
    }
    if (guideId) fetchTourists();
  }, [guideId]);

  // Connect to socket
  useEffect(() => {
    socketRef.current = io(SOCKET_URL);
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Fetch chat history when tourist selected
  useEffect(() => {
    async function fetchChat() {
      if (!selectedTourist) return;
      setLoading(true);
      try {
        const res = await api.get(`/chat/direct/${selectedTourist._id}/${guideId}`);
        setMessages(res.data.messages);
        chatIdRef.current = res.data.chatId;
        // Join chat room
        socketRef.current.emit('joinRoom', { chatId: res.data.chatId, userId: guideId });
      } catch (err) {
        setMessages([]);
      }
      setLoading(false);
    }
    fetchChat();
  }, [selectedTourist, guideId]);

  // Listen for new messages
  useEffect(() => {
    if (!socketRef.current) return;
    const handler = (msg) => {
      setMessages((prev) => [...prev, msg]);
    };
    socketRef.current.on('newMessage', handler);
    const deleteHandler = ({ messageId }) => {
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
    };
    socketRef.current.on('messageDeleted', deleteHandler);
    return () => {
      socketRef.current.off('newMessage', handler);
      socketRef.current.off('messageDeleted', deleteHandler);
    };
  }, []);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const sendMessage = () => {
    if (!input.trim() || !chatIdRef.current) return;
    socketRef.current.emit('chatMessage', {
      chatId: chatIdRef.current,
      senderId: guideId,
      content: input,
      senderRole: 'guide',
    });
    setInput('');
  };

  // Handle Enter key only if input is not empty
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && input.trim()) {
      sendMessage();
    }
  };

  return (
    <Box sx={{ display: 'flex', height: '70vh', border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
      {/* Left panel: Tourists */}
      <Box sx={{ width: 280, bgcolor: '#f7f7fa', borderRight: '1px solid #eee', overflowY: 'auto' }}>
        <Typography variant="h6" sx={{ p: 2 }}>Tourists</Typography>
        {loading && <CircularProgress size={24} sx={{ m: 2 }} />}
        {tourists.map((tourist) => (
          <Box key={tourist._id} sx={{ display: 'flex', alignItems: 'center', p: 2, cursor: 'pointer', bgcolor: selectedTourist?._id === tourist._id ? '#e3f2fd' : 'inherit' }} onClick={() => setSelectedTourist(tourist)}>
            <Avatar src={tourist.avatar} sx={{ mr: 2 }}>{tourist.name?.[0]}</Avatar>
            <Typography>{tourist.name}</Typography>
          </Box>
        ))}
        {!loading && tourists.length === 0 && <Typography sx={{ p: 2 }}>No tourists found.</Typography>}
      </Box>
      {/* Right panel: Chat */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2, bgcolor: '#f5f7fb', position: 'relative' }}>
          {loading && <CircularProgress size={24} sx={{ m: 2 }} />}
          {!loading && messages.map((msg, idx) => {
            const isGuide = msg.senderRole === 'guide';
            return (
              <Box
                key={msg._id || idx}
                sx={{
                  mb: 2,
                  display: 'flex',
                  flexDirection: isGuide ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  justifyContent: isGuide ? 'flex-end' : 'flex-start',
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    ml: isGuide ? 1 : 0,
                    mr: !isGuide ? 1 : 0,
                    bgcolor: isGuide ? '#1976d2' : '#8bc34a',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: 18,
                  }}
                >
                  {isGuide ? 'G' : 'T'}
                </Avatar>
                <Box
                  sx={{
                    bgcolor: isGuide ? '#e3f2fd' : '#f1f8e9',
                    color: '#222',
                    px: 2,
                    py: 1.2,
                    borderRadius: 3,
                    maxWidth: 340,
                    boxShadow: '0 2px 8px 0 rgba(0,0,0,0.07)',
                    ml: isGuide ? 0 : 1,
                    mr: isGuide ? 1 : 0,
                    position: 'relative',
                    minWidth: 60,
                    transition: 'background 0.2s',
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      wordBreak: 'break-word',
                      fontSize: 15,
                      fontStyle: msg.isDeleted ? 'italic' : 'normal',
                      color: msg.isDeleted ? '#64748b' : '#222',
                    }}
                  >
                    {msg.isDeleted ? 'This message was deleted' : msg.content}
                  </Typography>
                  {msg.createdAt && (
                    <Typography variant="caption" sx={{ color: '#888', fontSize: 11, mt: 0.5, display: 'block', textAlign: isGuide ? 'right' : 'left' }}>
                      {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          })}
          <div ref={messagesEndRef} />
        </Box>
        {/* Input */}
        {selectedTourist && (
          <Box sx={{ display: 'flex', alignItems: 'center', p: 2, borderTop: '1px solid #eee', bgcolor: '#fafafa', gap: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              sx={{ mr: 1, bgcolor: '#fff', borderRadius: 2, boxShadow: '0 1px 4px 0 rgba(0,0,0,0.03)' }}
              inputProps={{ style: { padding: '10px 12px' } }}
              autoFocus
            />
            <IconButton color="primary" onClick={sendMessage} disabled={!input.trim()} sx={{ bgcolor: input.trim() ? '#1976d2' : '#e0e0e0', color: '#fff', '&:hover': { bgcolor: input.trim() ? '#1565c0' : '#e0e0e0' } }}>
              <SendIcon />
            </IconButton>
          </Box>
        )}
      </Box>
    </Box>
  );
}
