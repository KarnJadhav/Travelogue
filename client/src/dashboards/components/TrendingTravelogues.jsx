// Trending Travelogues masonry/grid layout with images and social actions
// Layout logic: Grid of trending travelogues with images, author, and social actions (like, save). Uses MUI Grid and Card, with Framer Motion for hover effects.
import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import IconButton from '@mui/material/IconButton';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import Grid from '@mui/material/Grid';
import { motion } from 'framer-motion';

// Dummy data
const travelogues = [
  {
    id: 1,
    title: 'Sunsets in Santorini',
    image: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80',
    author: 'Maria Papadopoulos',
    liked: true,
    saved: false,
  },
  {
    id: 2,
    title: 'Kyoto in Spring',
    image: 'https://images.unsplash.com/photo-1464983953574-0892a716854b?auto=format&fit=crop&w=600&q=80',
    author: 'Kenji Takahashi',
    liked: false,
    saved: true,
  },
  {
    id: 3,
    title: 'Banff: Lakes & Peaks',
    image: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=600&q=80',
    author: 'Ava Smith',
    liked: false,
    saved: false,
  },
  {
    id: 4,
    title: 'Cape Town Vibes',
    image: 'https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=600&q=80',
    author: 'Sipho Dlamini',
    liked: true,
    saved: true,
  },
];

export default function TrendingTravelogues() {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h5" fontWeight={600} mb={2}>
        Trending Travelogues
      </Typography>
      <Grid container spacing={3}>
        {travelogues.map((t) => (
          <Grid item xs={12} sm={6} md={3} key={t.id}>
            <motion.div
              whileHover={{ scale: 1.03, boxShadow: '0px 8px 32px rgba(79,138,139,0.18)' }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              <Card sx={{ borderRadius: 4, boxShadow: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="160"
                  image={t.image}
                  alt={t.title}
                  sx={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    {t.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    by {t.author}
                  </Typography>
                </CardContent>
                <CardActions>
                  <IconButton color="error">
                    {t.liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                  </IconButton>
                  <IconButton color="primary">
                    {t.saved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                  </IconButton>
                </CardActions>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
