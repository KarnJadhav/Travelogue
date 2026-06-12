import React from 'react';
import {
  Avatar,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

export default function GuideReviewsDialog({ open, guide, onClose }) {
  const reviews = Array.isArray(guide?.reviews) ? guide.reviews : [];
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviews.length
    : 0;

  const formatReviewDate = (value) => {
    if (!value) return 'Recently';
    return new Date(value).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 2, maxHeight: '88vh' } }}
    >
      <DialogTitle sx={{ pr: 6, pb: 1.2 }}>
        <Typography sx={{ fontSize: '1.15rem', fontWeight: 800, color: '#111827' }}>
          Tourist Reviews
        </Typography>
        <Typography sx={{ fontSize: '0.84rem', color: '#64748b', mt: 0.3 }}>
          {guide?.name || 'Guide'}
        </Typography>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{ position: 'absolute', top: 14, right: 14 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1, pb: 2.5 }}>
        {reviews.length > 0 && (
          <Paper
            elevation={0}
            sx={{
              p: 1.5,
              mb: 1.5,
              borderRadius: 1.5,
              bgcolor: '#f8fafc',
              border: '1px solid #e5e7eb',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between" gap={2}>
              <Box>
                <Typography sx={{ fontSize: '1.4rem', fontWeight: 900, color: '#2d7a4a' }}>
                  {averageRating.toFixed(1)}
                </Typography>
                <Rating value={averageRating} precision={0.1} readOnly size="small" />
              </Box>
              <Typography sx={{ fontSize: '0.84rem', color: '#64748b', fontWeight: 700 }}>
                {reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}
              </Typography>
            </Stack>
          </Paper>
        )}

        {reviews.length === 0 ? (
          <Paper
            elevation={0}
            sx={{
              p: 3,
              borderRadius: 1.5,
              bgcolor: '#f8fafc',
              border: '1px dashed #cbd5e1',
              textAlign: 'center',
            }}
          >
            <Typography sx={{ fontWeight: 800, color: '#111827' }}>
              No tourist reviews yet
            </Typography>
            <Typography sx={{ mt: 0.6, fontSize: '0.88rem', color: '#64748b' }}>
              Reviews from tourists will appear here after completed tours.
            </Typography>
          </Paper>
        ) : (
          <Stack spacing={1.2}>
            {reviews.map((review) => (
              <Paper
                key={review._id}
                elevation={0}
                sx={{
                  p: 1.5,
                  borderRadius: 1.5,
                  bgcolor: '#ffffff',
                  border: '1px solid #e5e7eb',
                }}
              >
                <Stack direction="row" gap={1.1} alignItems="flex-start">
                  <Avatar src={review.touristAvatar} sx={{ width: 38, height: 38 }}>
                    {review.touristName?.charAt(0)?.toUpperCase() || 'T'}
                  </Avatar>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                      <Typography sx={{ fontSize: '0.9rem', fontWeight: 800, color: '#111827' }}>
                        {review.touristName || 'Tourist'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.72rem', color: '#94a3b8', flexShrink: 0 }}>
                        {formatReviewDate(review.createdAt)}
                      </Typography>
                    </Stack>
                    <Stack direction="row" alignItems="center" gap={0.8} sx={{ mt: 0.3, flexWrap: 'wrap' }}>
                      <Rating value={Number(review.rating || 0)} readOnly size="small" />
                      {review.place && (
                        <Chip
                          label={review.place}
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '0.68rem',
                            bgcolor: '#ecfdf5',
                            color: '#166534',
                            fontWeight: 700,
                          }}
                        />
                      )}
                    </Stack>
                    <Typography sx={{ mt: 0.9, fontSize: '0.88rem', lineHeight: 1.6, color: '#475569' }}>
                      {review.comment || 'No written comment provided.'}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </DialogContent>
    </Dialog>
  );
}
