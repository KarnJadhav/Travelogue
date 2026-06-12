import React from 'react';
import { Box, Typography, Avatar, List, ListItem, ListItemAvatar, ListItemText, Paper, Divider, TextField, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

const users = [
  { id: 1, name: 'Alice Smith', avatar: 'https://randomuser.me/api/portraits/women/44.jpg' },
  { id: 2, name: 'Bob Lee', avatar: 'https://randomuser.me/api/portraits/men/32.jpg' },
  { id: 3, name: 'Carla Gomez', avatar: 'https://randomuser.me/api/portraits/women/68.jpg' },
];

const messages = [
  { id: 1, from: 1, text: 'Hi, I have a question about the tour.', time: '10:01' },
  { id: 2, from: 0, text: 'Sure! How can I help?', time: '10:02' },
  { id: 3, from: 1, text: 'What should I bring?', time: '10:03' },
  { id: 4, from: 0, text: 'Just comfortable shoes and a camera!', time: '10:04' },
];

export default function MessagesPanel() {
  const [selectedUser, setSelectedUser] = React.useState(users[0]);
  const [input, setInput] = React.useState('');

  return (
    <Box sx={{ display: 'flex', height: 420, bgcolor: 'background.paper', borderRadius: 4, boxShadow: 3, overflow: 'hidden' }}>
      <Box sx={{ width: 180, bgcolor: 'grey.100', borderRight: 1, borderColor: 'divider' }}>
        <List>
          {users.map(user => (
            <ListItem button key={user.id} selected={selectedUser.id === user.id} onClick={() => setSelectedUser(user)}>
              <ListItemAvatar>
                <Avatar src={user.avatar} />
              </ListItemAvatar>
              <ListItemText primary={user.name} />
            </ListItem>
          ))}
        </List>
      </Box>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Paper elevation={0} sx={{ flex: 1, p: 2, overflowY: 'auto', bgcolor: 'background.default' }}>
          <Typography variant="subtitle1" fontWeight={700} mb={1}>{selectedUser.name}</Typography>
          <Divider sx={{ mb: 2 }} />
          {messages.map((msg, idx) => (
            <Box key={msg.id} sx={{ display: 'flex', justifyContent: msg.from === 0 ? 'flex-end' : 'flex-start', mb: 1 }}>
              <Box sx={{ bgcolor: msg.from === 0 ? 'primary.main' : 'grey.200', color: msg.from === 0 ? 'primary.contrastText' : 'text.primary', px: 2, py: 1, borderRadius: 2, maxWidth: 240, boxShadow: 1 }}>
                <Typography variant="body2">{msg.text}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>{msg.time}</Typography>
              </Box>
            </Box>
          ))}
        </Paper>
        <Divider />
        <Box sx={{ display: 'flex', p: 1, bgcolor: 'background.paper' }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            sx={{ mr: 1 }}
          />
          <IconButton color="primary" disabled={!input}>
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}
