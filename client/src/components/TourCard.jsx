import React from 'react';
import { Card, CardMedia, CardContent, Typography, Chip, Button, Box } from '@mui/material';

export default function TourCard({ image, title, price, duration, status, onEdit }) {
  return (
    <Card sx={{ borderRadius: 4, boxShadow: 3, transition: 'transform 0.2s', '&:hover': { transform: 'scale(1.03)', boxShadow: 6 } }}>
      <CardMedia
        component="img"
        height="160"
        image={image}
        alt={title}
        sx={{ objectFit: 'cover' }}
      />
      <CardContent>
        <Typography variant="h6" fontWeight={700} gutterBottom>{title}</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">{duration}</Typography>
          <Chip label={status} color={status === 'Active' ? 'success' : 'warning'} size="small" />
        </Box>
        <Typography variant="subtitle1" color="primary" fontWeight={600}>
          ₹{price}
        </Typography>
        <Button variant="outlined" size="small" sx={{ mt: 2 }} onClick={onEdit} fullWidth>Edit</Button>
      </CardContent>
    </Card>
  );
}
