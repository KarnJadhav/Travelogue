import React from 'react';
import { Box, Typography, Avatar, Paper, Rating, Stack } from '@mui/material';

const reviews = [
  {
    id: 1,
    name: 'Alice Smith',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    rating: 5,
    text: 'Amazing tour! The guide was super friendly and knowledgeable.',
    date: 'Jan 2026',
  },
  {
    id: 2,
    name: 'Bob Lee',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    rating: 4,
    text: 'Great experience, would recommend to friends.',
    date: 'Dec 2025',
  },
  {
    id: 3,
    name: 'Carla Gomez',
    avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
    rating: 5,
    text: 'Loved every moment! Will book again.',
    date: 'Nov 2025',
  },
];

export default function ReviewsList() {
  return (
    <Stack spacing={3}>
      {reviews.map(r => (
        <Paper key={r.id} elevation={3} sx={{ p: 3, borderRadius: 4, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <Avatar src={r.avatar} sx={{ width: 56, height: 56, mr: 2 }} />
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>{r.name}</Typography>
            <Rating value={r.rating} readOnly size="small" sx={{ mb: 0.5 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{r.date}</Typography>
            <Typography variant="body1">{r.text}</Typography>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}
