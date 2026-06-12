import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Button from '../../common/Button';

export default function ReviewForm({ booking, onSubmit, onClose, initialReview, isEdit }) {
  const [rating, setRating] = useState(initialReview?.rating || 0);
  const [comment, setComment] = useState(initialReview?.comment || '');
  const [photo, setPhoto] = useState(null);
  const [report, setReport] = useState('');

  const handlePhotoChange = (e) => {
    setPhoto(e.target.files[0]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      bookingId: booking._id,
      guideId: booking.guideId?._id || booking.guideId,
      tripDate: booking.startDateTime,
      rating,
      comment,
      photo,
      report,
    });
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ p: 2, minWidth: 320 }}>
      <Typography variant="h6" mb={2}>{isEdit ? 'Edit Review' : 'Write a Review'}</Typography>
      <Typography fontSize={14} color="text.secondary" mb={1}>Trip Date: {booking.startDateTime ? new Date(booking.startDateTime).toLocaleDateString() : ''}</Typography>
      <Rating value={rating} onChange={(_, v) => setRating(v)} size="large" sx={{ mb: 2 }} />
      <TextField
        label="Your Review"
        value={comment}
        onChange={e => setComment(e.target.value)}
        fullWidth
        multiline
        minRows={3}
        sx={{ mb: 2 }}
        required
      />
      <TextField
        label="Report an Issue (optional)"
        value={report}
        onChange={e => setReport(e.target.value)}
        fullWidth
        multiline
        minRows={2}
        sx={{ mb: 2 }}
      />
      <Box sx={{ mb: 2 }}>
        <input type="file" accept="image/*" onChange={handlePhotoChange} />
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button type="submit">{isEdit ? 'Update Review' : 'Submit Review'}</Button>
        <Button type="button" onClick={onClose} className="bg-gray-400 hover:bg-gray-500">Cancel</Button>
      </Box>
    </Box>
  );
}
