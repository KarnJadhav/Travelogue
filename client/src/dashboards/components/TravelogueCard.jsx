import React, { useState } from 'react';
import {
  Card, Box, CardContent, CardActions, Typography, IconButton, Chip, Stack, Avatar, Tooltip, Menu, MenuItem, Divider
} from '@mui/material';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import ShareIcon from '@mui/icons-material/Share';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import { motion } from 'framer-motion';
import api from '../../api';
import { buildImageUrl, isVideoFile } from '../../utils/imageHelper';

export default function TravelogueCard({ travelogue, onViewDetails, onRefresh }) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [likeCount, setLikeCount] = useState(travelogue.likes?.length || 0);
  const [saveCount, setSaveCount] = useState(travelogue.saves?.length || 0);
  const [imageIndex, setImageIndex] = useState(0);
  const [anchorEl, setAnchorEl] = useState(null);
  const userId = JSON.parse(localStorage.getItem('user') || '{}')._id;

  const handleLike = async (e) => {
    e.stopPropagation();
    try {
      const response = await api.post(`/travelogue/${travelogue._id}/like`);
      setLiked(response.data.liked);
      setLikeCount(response.data.likeCount);
    } catch (err) {
      console.error('Error liking travelogue:', err);
    }
  };

  const handleSave = async (e) => {
    e.stopPropagation();
    try {
      const response = await api.post(`/travelogue/${travelogue._id}/save`);
      setSaved(response.data.saved);
      setSaveCount(response.data.saveCount);
    } catch (err) {
      console.error('Error saving travelogue:', err);
    }
  };

  const handlePrevImage = (e) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev === 0 ? travelogue.images?.length - 1 : prev - 1));
  };

  const handleNextImage = (e) => {
    e.stopPropagation();
    setImageIndex((prev) => (prev === travelogue.images?.length - 1 ? 0 : prev + 1));
  };

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setAnchorEl(e.currentTarget);
  };

  const handleShare = (platform) => {
    setAnchorEl(null);
    const text = `Check out "${travelogue.title}" - ${travelogue.destination}!`;
    const url = window.location.origin;
    
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(text)} ${url}`);
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`);
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${url}`);
    } else if (platform === 'copy') {
      navigator.clipboard.writeText(`${text} ${url}`);
      alert('Link copied to clipboard!');
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const mediaPath = travelogue?.images?.[imageIndex] || '';
  const mediaUrl = React.useMemo(() => {
    if (!mediaPath) {
      return '/no-image.png';
    }
    return buildImageUrl(mediaPath);
  }, [mediaPath]);
  const mediaIsVideo = isVideoFile(mediaPath);

  return (
    <motion.div
      whileHover={{ y: -8 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      onClick={() => onViewDetails?.(travelogue._id)}
      style={{ height: '100%' }}
    >
      <Card
        elevation={0}
        sx={{
          borderRadius: '24px',
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: '1px solid rgba(148, 163, 184, 0.15)',
          boxShadow: '0 10px 30px rgba(15, 23, 42, 0.04)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          bgcolor: '#ffffff',
          cursor: 'pointer',
          '&:hover': {
            boxShadow: '0 20px 40px rgba(15, 23, 42, 0.08)',
            '& .card-media-img': { transform: 'scale(1.04)' }
          }
        }}
      >
        {/* Media Container with 3:2 aspect ratio */}
        <Box sx={{ position: 'relative', pt: '64%', overflow: 'hidden', bgcolor: '#f1f5f9' }}>
          {mediaIsVideo ? (
            <Box
              component="video"
              src={mediaUrl}
              muted
              loop
              playsInline
              preload="metadata"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          ) : (
            <Box
              component="img"
              src={mediaUrl}
              alt={travelogue.title}
              className="card-media-img"
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
              onError={(e) => {
                e.target.src = '/no-image.png';
              }}
            />
          )}

          {/* Left/Right Carousel Controls */}
          {travelogue.images && travelogue.images.length > 1 && (
            <>
              <IconButton
                size="small"
                onClick={handlePrevImage}
                sx={{
                  position: 'absolute',
                  left: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(4px)',
                  color: '#1e293b',
                  zIndex: 2,
                  width: 28,
                  height: 28,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                  '&:hover': { bgcolor: '#ffffff' }
                }}
              >
                <ChevronLeftIcon sx={{ fontSize: 18 }} />
              </IconButton>
              <IconButton
                size="small"
                onClick={handleNextImage}
                sx={{
                  position: 'absolute',
                  right: 10,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255, 255, 255, 0.85)',
                  backdropFilter: 'blur(4px)',
                  color: '#1e293b',
                  zIndex: 2,
                  width: 28,
                  height: 28,
                  boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                  '&:hover': { bgcolor: '#ffffff' }
                }}
              >
                <ChevronRightIcon sx={{ fontSize: 18 }} />
              </IconButton>

              {/* Slider dots indicators */}
              <Stack
                direction="row"
                spacing={0.6}
                sx={{
                  position: 'absolute',
                  bottom: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(4px)',
                  px: 1.2,
                  py: 0.6,
                  borderRadius: '10px'
                }}
              >
                {travelogue.images.map((_, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      width: 5,
                      height: 5,
                      borderRadius: '50%',
                      backgroundColor: idx === imageIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                      transition: 'all 0.2s ease'
                    }}
                  />
                ))}
              </Stack>
            </>
          )}

          {/* Rating Badge */}
          {travelogue.rating > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: 14,
                right: 14,
                bgcolor: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(6px)',
                borderRadius: '12px',
                px: 1.2,
                py: 0.5,
                display: 'flex',
                alignItems: 'center',
                gap: 0.4,
                zIndex: 2,
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                border: '1px solid rgba(255,255,255,0.5)'
              }}
            >
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a' }}>
                {travelogue.rating.toFixed(1)}
              </span>
              <span style={{ color: '#fbbf24', fontSize: '0.85rem' }}>★</span>
            </Box>
          )}

          {/* Video Play Overlay Icon */}
          {mediaIsVideo && (
            <Box
              sx={{
                position: 'absolute',
                top: 14,
                left: 14,
                bgcolor: 'rgba(15, 23, 42, 0.75)',
                backdropFilter: 'blur(4px)',
                color: '#fff',
                borderRadius: '10px',
                px: 1,
                py: 0.4,
                display: 'flex',
                alignItems: 'center',
                gap: 0.4,
                zIndex: 2,
                border: '1px solid rgba(255,255,255,0.1)'
              }}
            >
              <PlayArrowIcon sx={{ fontSize: 13 }} />
              <Typography variant="caption" fontWeight={700} sx={{ fontSize: '0.65rem', letterSpacing: '0.2px' }}>
                REEL
              </Typography>
            </Box>
          )}

          {/* Status Overlay */}
          {travelogue.status !== 'approved' && (
            <Chip
              label={travelogue.status.toUpperCase()}
              size="small"
              sx={{
                position: 'absolute',
                bottom: 14,
                left: 14,
                zIndex: 2,
                bgcolor: travelogue.status === 'pending' ? '#eab308' : '#ef4444',
                color: '#fff',
                fontWeight: 800,
                fontSize: '0.65rem',
                height: 20
              }}
            />
          )}
        </Box>

        {/* Content Details */}
        <CardContent sx={{ flexGrow: 1, p: 2.5, pb: 1 }}>
          {/* Author metadata panel */}
          <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
            <Avatar
              src={
                travelogue.userId?.avatar
                  ? buildImageUrl(travelogue.userId.avatar)
                  : '/default-avatar.png'
              }
              sx={{ width: 34, height: 34, border: '1px solid rgba(148,163,184,0.2)' }}
            />
            <Box sx={{ flexGrow: 1 }}>
              <Typography
                variant="body2"
                fontWeight={700}
                color="#1e293b"
                noWrap
                sx={{ fontSize: '0.85rem' }}
              >
                {travelogue.userId?.name || 'Anonymous Explorer'}
              </Typography>
              <Typography variant="caption" color="#64748B" sx={{ fontSize: '0.7rem' }}>
                {formatDate(travelogue.createdAt)}
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={handleMenuClick}
              sx={{ color: '#64748B' }}
            >
              <MoreVertIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* Travelogue Title */}
          <Typography
            variant="subtitle1"
            fontWeight={800}
            color="#0f172a"
            mb={1}
            sx={{
              fontFamily: '"Sora", sans-serif',
              lineHeight: 1.3,
              fontSize: '1.05rem',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              letterSpacing: '-0.2px'
            }}
          >
            {travelogue.title}
          </Typography>

          {/* Location details */}
          <Stack direction="row" spacing={2} mb={2} flexWrap="wrap" gap={1}>
            {travelogue.location && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <LocationOnIcon sx={{ fontSize: 15, color: '#4F8A8B' }} />
                <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: '0.75rem' }}>
                  {travelogue.location}
                </Typography>
              </Stack>
            )}
            {travelogue.duration && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                <CalendarTodayIcon sx={{ fontSize: 14, color: '#4F8A8B' }} />
                <Typography variant="caption" color="#64748B" fontWeight={700} sx={{ fontSize: '0.75rem' }}>
                  {travelogue.duration} days
                </Typography>
              </Stack>
            )}
          </Stack>

          {/* Intro Description */}
          <Typography
            variant="body2"
            color="#64748B"
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              mb: 2.5,
              lineHeight: 1.5,
              fontSize: '0.85rem'
            }}
          >
            {travelogue.description}
          </Typography>

          {/* Tags list */}
          {travelogue.tags && travelogue.tags.length > 0 && (
            <Stack direction="row" spacing={0.8} flexWrap="wrap" gap={0.8}>
              {travelogue.tags.slice(0, 3).map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  sx={{
                    fontSize: '0.7rem',
                    height: 22,
                    fontWeight: 700,
                    bgcolor: 'rgba(79,138,139,0.06)',
                    color: '#4F8A8B',
                    border: '1px solid rgba(79,138,139,0.1)'
                  }}
                />
              ))}
            </Stack>
          )}
        </CardContent>

        <Box sx={{ mt: 'auto' }}>
          {/* Quick Metrics Bar */}
          <Box sx={{ px: 2.5, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid rgba(148,163,184,0.1)' }}>
            <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
              <Stack direction="row" spacing={0.5} alignItems="center">
                <VisibilityIcon sx={{ fontSize: 14, color: '#64748B' }} />
                <Typography variant="caption" fontWeight={600} color="#64748B" sx={{ fontSize: '0.72rem' }}>
                  {travelogue.views || 0} views
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1.5}>
                <Typography variant="caption" fontWeight={700} color="#64748B" sx={{ fontSize: '0.72rem' }}>
                  {likeCount} likes
                </Typography>
                <Typography variant="caption" fontWeight={700} color="#64748B" sx={{ fontSize: '0.72rem' }}>
                  {travelogue.comments?.length || 0} comments
                </Typography>
              </Stack>
            </Stack>
          </Box>

          {/* Action Callouts */}
          <CardActions sx={{ p: 1.5, px: 2, justifyContent: 'space-between', borderTop: '1px solid rgba(148,163,184,0.08)' }}>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={liked ? 'Unlike' : 'Like'}>
                <IconButton
                  size="small"
                  onClick={handleLike}
                  sx={{
                    color: liked ? '#ef4444' : '#64748B',
                    '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.08)' }
                  }}
                >
                  {liked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="Comment">
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails?.(travelogue._id);
                  }}
                  sx={{
                    color: '#4F8A8B',
                    '&:hover': { bgcolor: 'rgba(79, 138, 139, 0.08)' }
                  }}
                >
                  <ChatBubbleOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title={saved ? 'Unsave' : 'Save'}>
                <IconButton
                  size="small"
                  onClick={handleSave}
                  sx={{
                    color: saved ? '#eab308' : '#64748B',
                    '&:hover': { bgcolor: 'rgba(234, 179, 8, 0.08)' }
                  }}
                >
                  {saved ? <BookmarkIcon fontSize="small" /> : <BookmarkBorderIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Stack>
            <Tooltip title="Share story">
              <IconButton
                size="small"
                onClick={handleMenuClick}
                sx={{
                  color: '#64748B',
                  '&:hover': { bgcolor: 'rgba(148,163,184,0.08)' }
                }}
              >
                <ShareIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </CardActions>
        </Box>

        {/* Menu sharing panel */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => setAnchorEl(null)}
          PaperProps={{
            sx: { 
              borderRadius: '12px', 
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              border: '1px solid rgba(148,163,184,0.1)'
            }
          }}
        >
          <MenuItem onClick={() => handleShare('whatsapp')} sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Share on WhatsApp</MenuItem>
          <MenuItem onClick={() => handleShare('facebook')} sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Share on Facebook</MenuItem>
          <MenuItem onClick={() => handleShare('twitter')} sx={{ fontSize: '0.85rem', fontWeight: 600 }}>Share on Twitter</MenuItem>
          <Divider sx={{ my: 0.5 }} />
          <MenuItem onClick={() => handleShare('copy')} sx={{ fontSize: '0.85rem', fontWeight: 600, color: '#4F8A8B' }}>Copy Link</MenuItem>
        </Menu>
      </Card>
    </motion.div>
  );
}
