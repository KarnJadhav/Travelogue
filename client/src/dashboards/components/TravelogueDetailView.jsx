import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Stack, Avatar, Rating, Chip, Divider, TextField, CircularProgress, Card, CardContent, Grid, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ShareIcon from '@mui/icons-material/Share';
import CloseIcon from '@mui/icons-material/Close';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import GroupIcon from '@mui/icons-material/Group';
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn';
import SendIcon from '@mui/icons-material/Send';
import DeleteIcon from '@mui/icons-material/Delete';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../api';
import { buildImageUrl, isVideoFile } from '../../utils/imageHelper';

export default function TravelogueDetailView({ travelogueId, travelogue: initialTravelogue, onClose, open }) {
  const [travelogue, setTravelogue] = useState(initialTravelogue || null);
  const [loading, setLoading] = useState(!initialTravelogue);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [imageIndex, setImageIndex] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [commentingLoading, setCommentingLoading] = useState(false);
  const [error, setError] = useState('');
  const userId = JSON.parse(localStorage.getItem('user') || '{}')._id;

  useEffect(() => {
    if (travelogueId && !initialTravelogue) {
      fetchTravelogue();
    }
  }, [travelogueId, initialTravelogue]);

  const fetchTravelogue = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`/travelogue/${travelogueId}`);
      setTravelogue(response.data);
    } catch (err) {
      console.error('Error fetching travelogue:', err);
      setError('Failed to load travelogue details.');
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    try {
      const id = travelogue?._id || travelogueId;
      if (!id) return;
      const response = await api.post(`/travelogue/${id}/like`);
      setLiked(response.data.liked);
      setTravelogue(prev => ({
        ...prev,
        likes: response.data.liked
          ? [...(prev.likes || []), { userId }]
          : (prev.likes || []).filter(l => l.userId !== userId)
      }));
    } catch (err) {
      console.error('Error liking:', err);
    }
  };

  const handleSave = async () => {
    try {
      const id = travelogue?._id || travelogueId;
      if (!id) return;
      const response = await api.post(`/travelogue/${id}/save`);
      setSaved(response.data.saved);
      setTravelogue(prev => ({
        ...prev,
        saves: response.data.saved
          ? [...(prev.saves || []), { userId }]
          : (prev.saves || []).filter(s => s.userId !== userId)
      }));
    } catch (err) {
      console.error('Error saving:', err);
    }
  };

  const handleAddComment = async () => {
    if (!commentText.trim()) return;

    try {
      setCommentingLoading(true);
      const id = travelogue?._id || travelogueId;
      if (!id) return;
      const response = await api.post(`/travelogue/${id}/comment`, {
        text: commentText,
        userName: JSON.parse(localStorage.getItem('user') || '{}').name,
        userAvatar: JSON.parse(localStorage.getItem('user') || '{}').avatar
      });

      setTravelogue(prev => ({
        ...prev,
        comments: [...(prev.comments || []), response.data.comment]
      }));
      setCommentText('');
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to post comment.');
    } finally {
      setCommentingLoading(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      const id = travelogue?._id || travelogueId;
      if (!id) return;
      await api.delete(`/travelogue/${id}/comment/${commentId}`);
      setTravelogue(prev => ({
        ...prev,
        comments: prev.comments.filter(c => c._id !== commentId)
      }));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  const handleShare = () => {
    const text = `Check out "${travelogue?.title}"!`;
    const url = window.location.origin;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(`${text} ${url}`);
      alert('Link copied to clipboard!');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  if (loading) {
    return (
      <Dialog open={open !== false} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: '24px' } }}>
        <DialogContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <CircularProgress sx={{ color: '#4F8A8B' }} />
        </DialogContent>
      </Dialog>
    );
  }

  if (!travelogue) {
    return (
      <Dialog open={open !== false} onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px' } }}>
        <DialogContent>
          <Alert severity="error">Failed to load travelogue detail</Alert>
        </DialogContent>
      </Dialog>
    );
  }

  const mediaPath = travelogue?.images?.[imageIndex] || '';
  const mediaUrl = buildImageUrl(mediaPath);
  const mediaIsVideo = isVideoFile(mediaPath);

  return (
    <Dialog
      open={open !== false}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      scroll="body"
      PaperProps={{
        sx: {
          borderRadius: '28px',
          overflow: 'hidden',
          boxShadow: '0 24px 70px rgba(0,0,0,0.15)',
          border: '1px solid rgba(148,163,184,0.08)'
        }
      }}
    >
      <DialogContent sx={{ p: 0, bgcolor: '#ffffff' }}>
        
        {/* Cinematic Media Carousel Hero Header */}
        <Box 
          sx={{ 
            position: 'relative', 
            width: '100%',
            height: { xs: 320, sm: 420, md: 520 }, 
            bgcolor: '#0f172a', 
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {mediaIsVideo ? (
            <video
              key={`vid-${imageIndex}`}
              src={mediaUrl}
              controls
              autoPlay
              muted
              playsInline
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <img
              key={`img-${imageIndex}`}
              src={mediaUrl}
              alt={travelogue.title}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
              }}
            />
          )}

          {/* Top dark gradient to shade controls */}
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 90,
              background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)',
              pointerEvents: 'none',
              zIndex: 3
            }}
          />

          {/* Floating Glassmorphic Close Button */}
          <IconButton
            onClick={onClose}
            sx={{
              position: 'absolute',
              right: 20,
              top: 20,
              zIndex: 10,
              bgcolor: 'rgba(255, 255, 255, 0.25)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              width: 40,
              height: 40,
              boxShadow: '0 4px 15px rgba(0,0,0,0.2)',
              transition: 'all 0.2s ease',
              '&:hover': { 
                bgcolor: 'rgba(255, 255, 255, 0.35)',
                transform: 'scale(1.05)'
              }
            }}
          >
            <CloseIcon sx={{ fontSize: 20 }} />
          </IconButton>

          {/* Left/Right Carousel Navigations */}
          {travelogue.images && travelogue.images.length > 1 && (
            <>
              <IconButton
                onClick={() => setImageIndex(prev => prev === 0 ? travelogue.images.length - 1 : prev - 1)}
                sx={{
                  position: 'absolute',
                  left: 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 5,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  '&:hover': { bgcolor: 'rgba(79, 138, 139, 0.85)' }
                }}
              >
                <ChevronLeftIcon fontSize="medium" />
              </IconButton>
              <IconButton
                onClick={() => setImageIndex(prev => prev === travelogue.images.length - 1 ? 0 : prev + 1)}
                sx={{
                  position: 'absolute',
                  right: 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 5,
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  backdropFilter: 'blur(8px)',
                  color: '#fff',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  '&:hover': { bgcolor: 'rgba(79, 138, 139, 0.85)' }
                }}
              >
                <ChevronRightIcon fontSize="medium" />
              </IconButton>

              {/* Slider Dots */}
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  gap: 1,
                  zIndex: 5,
                  bgcolor: 'rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(8px)',
                  px: 2,
                  py: 1,
                  borderRadius: '30px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {travelogue.images.map((_, idx) => (
                  <Box
                    key={idx}
                    onClick={() => setImageIndex(idx)}
                    sx={{
                      width: idx === imageIndex ? 18 : 6,
                      height: 6,
                      borderRadius: '10px',
                      background: idx === imageIndex ? '#4F8A8B' : 'rgba(255,255,255,0.3)',
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  />
                ))}
              </Box>
            </>
          )}

          {/* Floating Slide Counter */}
          {travelogue.images && travelogue.images.length > 1 && (
            <Typography
              sx={{
                position: 'absolute',
                top: 20,
                left: 20,
                bgcolor: 'rgba(0,0,0,0.4)',
                backdropFilter: 'blur(8px)',
                color: '#fff',
                px: 1.5,
                py: 0.5,
                borderRadius: '10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                border: '1px solid rgba(255,255,255,0.1)',
                zIndex: 5
              }}
            >
              {imageIndex + 1} / {travelogue.images.length}
            </Typography>
          )}
        </Box>

        {/* Content Wrapper */}
        <Box sx={{ p: { xs: 3, md: 5 } }}>
          
          {/* Header Row */}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2.5} mb={3.5} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Box>
              <Typography 
                variant="h4" 
                fontWeight={800} 
                color="#0f172a" 
                mb={1} 
                sx={{ letterSpacing: '-0.5px', fontFamily: '"Sora", sans-serif' }}
              >
                {travelogue.title}
              </Typography>
              <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" gap={1.5}>
                {travelogue.location && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <LocationOnIcon sx={{ fontSize: 18, color: '#4F8A8B' }} />
                    <Typography variant="body2" fontWeight={700} color="#64748B">
                      {travelogue.location}
                    </Typography>
                  </Stack>
                )}
                {travelogue.rating > 0 && (
                  <Stack direction="row" spacing={0.5} alignItems="center">
                    <Rating value={travelogue.rating} readOnly size="small" />
                    <Typography variant="body2" fontWeight={800} color="#4F8A8B" sx={{ fontSize: '0.85rem' }}>
                      {travelogue.rating.toFixed(1)}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </Box>

            {/* Quick Actions Panel */}
            <Stack direction="row" spacing={1.5}>
              <Button
                variant={liked ? 'contained' : 'outlined'}
                startIcon={liked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
                onClick={handleLike}
                sx={{
                  borderRadius: '12px',
                  color: liked ? '#fff' : '#ef4444',
                  bgcolor: liked ? '#ef4444' : 'transparent',
                  borderColor: '#ef4444',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 2.5,
                  '&:hover': { bgcolor: liked ? '#dc2626' : 'rgba(239, 68, 68, 0.05)' }
                }}
                size="medium"
              >
                {travelogue.likes?.length || 0}
              </Button>
              <Button
                variant={saved ? 'contained' : 'outlined'}
                startIcon={saved ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                onClick={handleSave}
                sx={{
                  borderRadius: '12px',
                  color: saved ? '#fff' : '#eab308',
                  bgcolor: saved ? '#eab308' : 'transparent',
                  borderColor: '#eab308',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 2.5,
                  '&:hover': { bgcolor: saved ? '#ca8a04' : 'rgba(234, 179, 8, 0.05)' }
                }}
                size="medium"
              >
                Save
              </Button>
              <Button
                variant="outlined"
                startIcon={<ShareIcon />}
                onClick={handleShare}
                sx={{
                  borderRadius: '12px',
                  color: '#4F8A8B',
                  borderColor: 'rgba(79, 138, 139, 0.4)',
                  fontWeight: 700,
                  textTransform: 'none',
                  px: 2.5,
                  '&:hover': { borderColor: '#4F8A8B', bgcolor: 'rgba(79, 138, 139, 0.05)' }
                }}
                size="medium"
              >
                Share
              </Button>
            </Stack>
          </Stack>

          <Divider sx={{ my: 3.5 }} />

          {/* Main Layout Grid */}
          <Grid container spacing={4}>
            
            {/* Left Column (Details) */}
            <Grid item xs={12} md={8}>
              
              {/* Author Card Info */}
              <Stack direction="row" spacing={2} alignItems="center" mb={4} sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: '18px', border: '1px solid rgba(148,163,184,0.1)' }}>
                <Avatar
                  src={
                    travelogue.userId?.avatar
                      ? buildImageUrl(travelogue.userId.avatar)
                      : '/default-avatar.png'
                  }
                  sx={{ width: 50, height: 50, border: '2px solid #fff', boxShadow: '0 4px 10px rgba(0,0,0,0.05)' }}
                />
                <Box>
                  <Typography variant="body1" fontWeight={800} color="#0f172a">
                    {travelogue.userId?.name || 'Anonymous Explorer'}
                  </Typography>
                  <Typography variant="caption" color="#64748B" fontWeight={500}>
                    Published on {formatDate(travelogue.createdAt)}
                  </Typography>
                </Box>
              </Stack>

              {/* Journal Entry text content */}
              <Typography
                variant="body1"
                color="#334155"
                sx={{
                  lineHeight: 1.8,
                  fontSize: '1.025rem',
                  mb: 4.5,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontFamily: '"Plus Jakarta Sans", sans-serif'
                }}
              >
                {travelogue.description}
              </Typography>

              {/* Highlights section if available */}
              {travelogue.highlights && travelogue.highlights.length > 0 && (
                <Box mb={5}>
                  <Typography variant="subtitle1" fontWeight={800} color="#0f172a" mb={2} sx={{ fontFamily: '"Sora", sans-serif' }}>
                    Journey Highlights
                  </Typography>
                  <Stack spacing={1.5}>
                    {travelogue.highlights.map((highlight, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4F8A8B', flexShrink: 0 }} />
                        <Typography color="#475569" fontWeight={500} sx={{ fontSize: '0.95rem' }}>{highlight}</Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              )}

              {/* Tags block */}
              {travelogue.tags && travelogue.tags.length > 0 && (
                <Box mb={5}>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {travelogue.tags.map(tag => (
                      <Chip
                        key={tag}
                        label={tag}
                        sx={{
                          fontWeight: 700,
                          bgcolor: 'rgba(79,138,139,0.06)',
                          color: '#4F8A8B',
                          border: '1px solid rgba(79,138,139,0.1)',
                          fontSize: '0.75rem',
                          height: 26
                        }}
                      />
                    ))}
                  </Stack>
                </Box>
              )}
            </Grid>

            {/* Right Column (Overview Metrics Panel) */}
            <Grid item xs={12} md={4}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 3, 
                  bgcolor: '#f8fafc', 
                  borderRadius: '24px', 
                  border: '1px solid rgba(148, 163, 184, 0.12)',
                  position: 'sticky',
                  top: 24
                }}
              >
                <Typography variant="subtitle2" fontWeight={800} color="#0f172a" mb={2.5} sx={{ fontFamily: '"Sora", sans-serif', letterSpacing: '0.2px' }}>
                  TRIP TIMELINES
                </Typography>
                
                <Stack spacing={2}>
                  {travelogue.duration && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#fff', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.08)' }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <CalendarTodayIcon sx={{ color: '#4F8A8B', fontSize: 20 }} />
                        <Typography variant="body2" fontWeight={600} color="#64748B">Duration</Typography>
                      </Stack>
                      <Typography variant="subtitle2" fontWeight={800} color="#0f172a">{travelogue.duration} Days</Typography>
                    </Box>
                  )}
                  {travelogue.travelersCount && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#fff', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.08)' }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <GroupIcon sx={{ color: '#4F8A8B', fontSize: 20 }} />
                        <Typography variant="body2" fontWeight={600} color="#64748B">Travelers</Typography>
                      </Stack>
                      <Typography variant="subtitle2" fontWeight={800} color="#0f172a">{travelogue.travelersCount} People</Typography>
                    </Box>
                  )}
                  {travelogue.estimatedCost && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#fff', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.08)' }}>
                      <Stack direction="row" spacing={1.5} alignItems="center">
                        <MonetizationOnIcon sx={{ color: '#4F8A8B', fontSize: 20 }} />
                        <Typography variant="body2" fontWeight={600} color="#64748B">Est. Cost</Typography>
                      </Stack>
                      <Typography variant="subtitle2" fontWeight={800} color="#0f172a">₹{travelogue.estimatedCost}</Typography>
                    </Box>
                  )}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5, bgcolor: '#fff', borderRadius: '12px', border: '1px solid rgba(148,163,184,0.08)' }}>
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <VisibilityIcon sx={{ color: '#4F8A8B', fontSize: 20 }} />
                      <Typography variant="body2" fontWeight={600} color="#64748B">Total Views</Typography>
                    </Stack>
                    <Typography variant="subtitle2" fontWeight={800} color="#0f172a">{travelogue.views || 0}</Typography>
                  </Box>
                </Stack>
              </Paper>
            </Grid>
          </Grid>

          <Divider sx={{ my: 5 }} />

          {/* Timeline / Comments Layout Section */}
          <Box sx={{ maxWidth: 750 }}>
            <Typography variant="h6" fontWeight={800} color="#0f172a" mb={3} sx={{ fontFamily: '"Sora", sans-serif' }}>
              Conversations ({travelogue.comments?.length || 0})
            </Typography>

            {/* Comment Composer */}
            <Paper elevation={0} sx={{ p: 2.5, mb: 4, bgcolor: '#f8fafc', borderRadius: '18px', border: '1px solid rgba(148,163,184,0.1)' }}>
              <Stack direction="row" spacing={2} alignItems="flex-start">
                <Avatar
                  src={JSON.parse(localStorage.getItem('user') || '{}').avatar ? buildImageUrl(JSON.parse(localStorage.getItem('user') || '{}').avatar) : '/default-avatar.png'}
                  sx={{ width: 36, height: 36, mt: 0.5 }}
                />
                <Stack spacing={2} sx={{ flexGrow: 1 }}>
                  <TextField
                    placeholder="Ask a question or share your thoughts..."
                    multiline
                    rows={2}
                    fullWidth
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    disabled={commentingLoading}
                    variant="outlined"
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '14px',
                        bgcolor: '#fff',
                        '&.Mui-focused fieldset': { borderColor: '#4F8A8B' }
                      }
                    }}
                  />
                  <Button
                    variant="contained"
                    endIcon={<SendIcon />}
                    disabled={!commentText.trim() || commentingLoading}
                    onClick={handleAddComment}
                    sx={{
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #4F8A8B 0%, #6BA8AC 100%)',
                      alignSelf: 'flex-end',
                      px: 3,
                      py: 1,
                      textTransform: 'none',
                      fontWeight: 700,
                      boxShadow: '0 8px 18px rgba(79, 138, 139, 0.25)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5ea1a2 0%, #7cbfc3 100%)',
                      }
                    }}
                  >
                    {commentingLoading ? 'Posting...' : 'Post Comment'}
                  </Button>
                </Stack>
              </Stack>
            </Paper>

            {/* Comments List Timeline */}
            <Stack spacing={2.5}>
              {travelogue.comments && travelogue.comments.map(comment => (
                <Box key={comment._id} sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                  <Avatar 
                    src={comment.userId?.avatar ? buildImageUrl(comment.userId.avatar) : '/default-avatar.png'} 
                    sx={{ width: 36, height: 36, border: '1px solid rgba(148,163,184,0.2)' }} 
                  />
                  <Box sx={{ flexGrow: 1, p: 2, bgcolor: '#f8fafc', borderRadius: '16px', border: '1px solid rgba(148,163,184,0.08)' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.6}>
                      <Typography variant="subtitle2" fontWeight={800} color="#1e293b">
                        {comment.userName || comment.userId?.name}
                      </Typography>
                      {comment.userId === userId && (
                        <IconButton
                          size="small"
                          onClick={() => handleDeleteComment(comment._id)}
                          sx={{ color: '#ef4444', p: 0.5 }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      )}
                    </Stack>
                    <Typography variant="caption" color="#94a3b8" sx={{ display: 'block', mb: 1, fontWeight: 500 }}>
                      {formatDate(comment.createdAt)}
                    </Typography>
                    <Typography color="#334155" variant="body2" sx={{ lineHeight: 1.5, fontWeight: 500 }}>
                      {comment.text}
                    </Typography>
                  </Box>
                </Box>
              ))}

              {(!travelogue.comments || travelogue.comments.length === 0) && (
                <Typography color="#94a3b8" textAlign="center" variant="body2" sx={{ py: 4, fontWeight: 500 }}>
                  No comments yet. Start the conversation!
                </Typography>
              )}
            </Stack>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
