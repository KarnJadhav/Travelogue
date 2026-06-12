// Horizontal scrollable Popular Destinations cards
// Layout logic: Horizontally scrollable row of destination cards. Each card shows image, rating, best time, and a CTA button. Uses MUI Card and Framer Motion for hover animation.
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import StarIcon from '@mui/icons-material/Star';
import { motion } from 'framer-motion';

// Dummy data
const destinations = [
  {
    name: 'Santorini',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    bestTime: 'May - September',
    description: 'Famous for its whitewashed houses and blue domes.',
  },
  {
    name: 'Kyoto',
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80',
    rating: 4.8,
    bestTime: 'March - May',
    description: 'Historic temples and cherry blossoms.',
  },
  {
    name: 'Banff',
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80',
    rating: 4.7,
    bestTime: 'June - August',
    description: 'Stunning lakes and mountain scenery.',
  },
  {
    name: 'Cape Town',
    image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80',
    rating: 4.8,
    bestTime: 'November - March',
    description: 'Iconic Table Mountain and vibrant culture.',
  },
];

export default function PopularDestinations() {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Popular Destinations
      </Typography>
      <Box sx={{ display: 'flex', overflowX: 'auto', gap: 3, pb: 1 }}>
        {destinations.map((dest, idx) => (
          <motion.div
            key={dest.name}
            whileHover={{ scale: 1.04, boxShadow: '0px 8px 32px rgba(79,138,139,0.18)' }}
            transition={{ type: 'spring', stiffness: 300 }}
            style={{ minWidth: 320, maxWidth: 340 }}
          >
            <Card sx={{ borderRadius: 4, boxShadow: 2, minWidth: 320, maxWidth: 340 }}>
              <CardMedia
                component="img"
                height="180"
                image={dest.image}
                alt={dest.name}
                sx={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
              />
              <CardContent>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  {dest.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={1}>
                  {dest.description}
                </Typography>
                <Chip
                  icon={<StarIcon sx={{ color: 'gold' }} />}
                  label={dest.rating}
                  size="small"
                  sx={{ mr: 1, fontWeight: 600, background: '#fffbe6' }}
                />
                <Chip
                  label={`Best: ${dest.bestTime}`}
                  size="small"
                  sx={{ fontWeight: 500, background: '#e3fcec', color: 'primary.main' }}
                />
              </CardContent>
              <CardActions>
                <Button variant="contained" color="primary" size="small" sx={{ borderRadius: 2 }}>
                  Explore
                </Button>
              </CardActions>
            </Card>
          </motion.div>
        ))}
      </Box>
    </Box>
  );
}
