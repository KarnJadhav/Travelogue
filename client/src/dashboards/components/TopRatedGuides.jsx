// Top Rated Guides section with profile cards
// Layout logic: Displays a row of guide profile cards with avatar, languages, experience, and rating. Uses MUI Card, Stack, and Framer Motion for layout and animation.
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import { motion } from 'framer-motion';

// Dummy data
const guides = [
  {
    name: 'Maria Papadopoulos',
    avatar: 'https://randomuser.me/api/portraits/women/65.jpg',
    languages: ['English', 'Greek'],
    experience: 8,
    rating: 4.9,
  },
  {
    name: 'Kenji Takahashi',
    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    languages: ['Japanese', 'English'],
    experience: 12,
    rating: 4.8,
  },
  {
    name: 'Ava Smith',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    languages: ['English', 'French'],
    experience: 6,
    rating: 4.7,
  },
  {
    name: 'Sipho Dlamini',
    avatar: 'https://randomuser.me/api/portraits/men/76.jpg',
    languages: ['English', 'Zulu'],
    experience: 10,
    rating: 4.8,
  },
];

export default function TopRatedGuides() {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Top Rated Guides
      </Typography>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        {guides.map((guide) => (
          <motion.div
            key={guide.name}
            whileHover={{ scale: 1.03, boxShadow: '0px 8px 32px rgba(79,138,139,0.18)' }}
            transition={{ type: 'spring', stiffness: 300 }}
            style={{ minWidth: 260, maxWidth: 280 }}
          >
            <Card sx={{ borderRadius: 4, boxShadow: 2, minWidth: 260, maxWidth: 280 }}>
              <CardContent>
                <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                  <Avatar src={guide.avatar} alt={guide.name} sx={{ width: 56, height: 56 }} />
                  <Box>
                    <Typography variant="h6" fontWeight={700}>
                      {guide.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {guide.experience} yrs exp
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" spacing={1} mb={1}>
                  {guide.languages.map((lang) => (
                    <Chip key={lang} label={lang} size="small" sx={{ fontWeight: 500 }} />
                  ))}
                </Stack>
                <Chip
                  label={`⭐ ${guide.rating}`}
                  size="small"
                  sx={{ fontWeight: 600, background: '#fffbe6', color: 'primary.main' }}
                />
              </CardContent>
              <CardActions>
                <Button variant="outlined" color="primary" size="small" sx={{ borderRadius: 2 }}>
                  Book Guide
                </Button>
              </CardActions>
            </Card>
          </motion.div>
        ))}
      </Box>
    </Box>
  );
}
