import React, { useEffect, useState } from 'react';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Rating from '@mui/material/Rating';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import Modal from '@mui/material/Modal';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import VerifiedIcon from '@mui/icons-material/Verified';
import CollectionsIcon from '@mui/icons-material/Collections';
import PremiumImage from '../../components/PremiumImage';
import { buildMediaUrl } from '../../utils/media';

function getMediaKind(item) {
  const explicitType = item?.mediaType;
  if (explicitType === 'video' || explicitType === 'image') return explicitType;
  const source = String(item?.url || '').toLowerCase();
  return /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(source) ? 'video' : 'image';
}

function formatResponseTime(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) return 'Fast response';
  if (value <= 1) return 'Responds in 1 hour';
  if (value < 24) return `Responds in ${Math.round(value)} hours`;
  const days = Math.ceil(value / 24);
  return `Responds in ${days} day${days > 1 ? 's' : ''}`;
}

export default function GuideCard({
  guide,
  onBook,
  onViewReviews,
  isFavorite = false,
  onFavoriteToggle = () => {},
  viewMode = 'grid',
}) {
  const [liked, setLiked] = useState(Boolean(isFavorite));
  const [videoOpen, setVideoOpen] = useState(false);

  useEffect(() => {
    setLiked(Boolean(isFavorite));
  }, [isFavorite]);

  const tourMedia = Array.isArray(guide.tourMedia) ? guide.tourMedia.filter((item) => item?.url) : [];
  const coverMedia = (() => {
    if (tourMedia.length === 0) return null;
    const imageItem = tourMedia.find((item) => getMediaKind(item) === 'image');
    return imageItem || tourMedia[0];
  })();
  const coverKind = getMediaKind(coverMedia);
  const coverSrc = guide.avatar || coverMedia?.url || '';
  const serviceDestinations = Array.isArray(guide.serviceDestinations)
    ? guide.serviceDestinations.filter((item) => item?.destination)
    : [];
  const hasLocalDestinations = serviceDestinations.length > 0;
  const isAvailable = guide.isAvailable !== false;
  const isBookable = guide.manualAvailability !== false && hasLocalDestinations;
  const availabilityReason = guide.availabilityReason || (isAvailable ? 'available_now' : 'unavailable');
  const availabilityLabel = !hasLocalDestinations
    ? 'Destinations Pending'
    : availabilityReason === 'booked_now'
    ? 'Booked Now'
    : availabilityReason === 'manual_offline'
      ? 'Unavailable'
      : isAvailable
        ? 'Available'
        : 'Unavailable';
  const availabilityBg = !hasLocalDestinations
    ? 'rgba(71, 85, 105, 0.95)'
    : availabilityReason === 'booked_now'
    ? 'rgba(245, 158, 11, 0.95)'
    : isAvailable
      ? 'rgba(16, 185, 129, 0.95)'
      : 'rgba(100, 116, 139, 0.95)';

  const handleFavorite = (event) => {
    event.stopPropagation();
    setLiked((prev) => !prev);
    onFavoriteToggle(guide);
  };

  const handleBook = (event) => {
    event.stopPropagation();
    if (!isBookable) return;
    if (onBook) onBook(guide);
  };

  const handleViewProfile = (event) => {
    event.stopPropagation();
    if (onViewReviews) onViewReviews(guide);
  };

  return (
    <>
      <Card
        onClick={handleViewProfile}
        sx={{
          borderRadius: 3,
          border: '1px solid #dbe7df',
          boxShadow: '0 8px 24px rgba(7, 24, 36, 0.08)',
          overflow: 'hidden',
          height: '100%',
          display: 'flex',
          flexDirection: { xs: 'column', md: viewMode === 'list' ? 'row' : 'column' },
          minWidth: 0,
          transition: 'all 0.25s ease',
          cursor: 'pointer',
          '&:hover': {
            transform: 'translateY(-5px)',
            boxShadow: '0 16px 30px rgba(7, 24, 36, 0.14)',
            borderColor: '#bcd5c8',
          },
        }}
      >
        <Box
          sx={{
            position: 'relative',
            bgcolor: '#eef2f7',
            width: { xs: '100%', md: viewMode === 'list' ? 300 : '100%' },
            minWidth: { md: viewMode === 'list' ? 300 : 0 },
            flexShrink: 0,
            height: viewMode === 'list' ? { xs: 220, md: 'auto' } : 220,
            aspectRatio: viewMode === 'list' ? { xs: '16 / 10', md: '4 / 3' } : '16 / 10',
          }}
        >
          {coverKind === 'video' && coverMedia?.url ? (
            <Box
              component="video"
              src={buildMediaUrl(coverMedia.url)}
              muted
              preload="metadata"
              sx={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 30%', display: 'block' }}
            />
          ) : (
            <PremiumImage
              src={coverSrc}
              alt={guide.name}
              name={guide.name}
              height="100%"
              width="100%"
              showLabel={false}
              imgSx={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'center 25%',
              }}
            />
          )}

          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.04) 0%, rgba(15, 23, 42, 0.55) 100%)',
            }}
          />

          <Chip
            label={availabilityLabel}
            size="small"
            sx={{
              position: 'absolute',
              top: 12,
              left: 12,
              bgcolor: availabilityBg,
              color: '#ffffff',
              fontWeight: 800,
              zIndex: 2,
            }}
          />

          {tourMedia.length > 0 && (
            <Chip
              icon={<CollectionsIcon sx={{ color: '#e2e8f0 !important', fontSize: 16 }} />}
              label={`${tourMedia.length} media`}
              size="small"
              sx={{
                position: 'absolute',
                top: 12,
                right: 58,
                bgcolor: 'rgba(15, 23, 42, 0.72)',
                color: '#e2e8f0',
                fontWeight: 700,
                zIndex: 2,
              }}
            />
          )}

          <IconButton
            onClick={handleFavorite}
            size="small"
            sx={{
              position: 'absolute',
              top: 10,
              right: 10,
              bgcolor: 'rgba(255,255,255,0.94)',
              color: liked ? '#ef4444' : '#475569',
              zIndex: 2,
              '&:hover': { bgcolor: '#ffffff' },
            }}
          >
            {liked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
          </IconButton>

          {guide.guideVideo && (
            <IconButton
              onClick={(event) => {
                event.stopPropagation();
                setVideoOpen(true);
              }}
              sx={{
                position: 'absolute',
                bottom: 12,
                right: 12,
                bgcolor: 'rgba(15, 23, 42, 0.72)',
                color: '#ffffff',
                zIndex: 2,
                '&:hover': { bgcolor: 'rgba(15, 23, 42, 0.88)' },
              }}
            >
              <PlayCircleIcon />
            </IconButton>
          )}
        </Box>

        <Box sx={{ p: 1.8, display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" gap={0.6}>
            <Typography
              sx={{
                color: '#0f172a',
                fontWeight: 900,
                fontSize: '1.02rem',
                lineHeight: 1.2,
                flex: 1,
                minWidth: 0,
              }}
            >
              {guide.name}
            </Typography>
            {guide.verifiedID && (
              <Tooltip title="Identity verified">
                <VerifiedIcon sx={{ color: '#0f766e', fontSize: 18 }} />
              </Tooltip>
            )}
          </Stack>

          <Stack direction="row" alignItems="center" gap={0.5} sx={{ flexWrap: 'wrap' }}>
            <LocationOnIcon sx={{ color: '#64748b', fontSize: 15 }} />
            <Typography sx={{ color: '#475569', fontSize: '0.8rem', fontWeight: 600 }}>
              {guide.location || 'Global'}
            </Typography>
            <Typography sx={{ color: '#94a3b8', fontSize: '0.8rem' }}>
              {guide.experienceYears || 0} years exp
            </Typography>
          </Stack>

          <Stack direction="row" alignItems="center" gap={0.6} sx={{ flexWrap: 'wrap' }}>
            <Rating value={Math.round((Number(guide.rating || 0)) * 2) / 2} precision={0.5} readOnly size="small" />
            <Typography sx={{ color: '#475569', fontSize: '0.78rem', fontWeight: 600 }}>
              {guide.reviewCount > 0 ? `${Number(guide.rating || 0).toFixed(1)} (${guide.reviewCount} reviews)` : 'No reviews yet'}
            </Typography>
          </Stack>

          {Array.isArray(guide.languages) && guide.languages.length > 0 && (
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {guide.languages.slice(0, 3).map((lang, idx) => {
                const label = typeof lang === 'string' ? lang : lang?.name;
                if (!label) return null;
                return (
                  <Chip
                    key={`${label}-${idx}`}
                    label={label}
                    size="small"
                    sx={{
                      height: 23,
                      bgcolor: '#ecfeff',
                      color: '#0f766e',
                      border: '1px solid #99f6e4',
                      fontWeight: 700,
                      fontSize: '0.72rem',
                    }}
                  />
                );
              })}
              {guide.languages.length > 3 && (
                <Chip
                  label={`+${guide.languages.length - 3}`}
                  size="small"
                  sx={{
                    height: 23,
                    bgcolor: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.72rem',
                  }}
                />
              )}
            </Stack>
          )}

          {guide.description && (
            <Typography
              sx={{
                color: '#64748b',
                fontSize: '0.8rem',
                lineHeight: 1.4,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                minHeight: 36,
              }}
            >
              {guide.description}
            </Typography>
          )}

          {serviceDestinations.length > 0 && (
            <Stack direction="row" spacing={0.5} useFlexGap sx={{ flexWrap: 'wrap' }}>
              {serviceDestinations.slice(0, 2).map((item, idx) => (
                <Chip
                  key={`${item.destination}-${idx}`}
                  label={`${item.destination} · INR ${Number(item.price || 0)}`}
                  size="small"
                  sx={{
                    height: 23,
                    bgcolor: '#fff7ed',
                    color: '#9a3412',
                    border: '1px solid #fed7aa',
                    fontWeight: 700,
                    fontSize: '0.68rem',
                    maxWidth: '100%',
                  }}
                />
              ))}
              {serviceDestinations.length > 2 && (
                <Chip
                  label={`+${serviceDestinations.length - 2} more`}
                  size="small"
                  sx={{
                    height: 23,
                    bgcolor: '#f8fafc',
                    color: '#475569',
                    border: '1px solid #cbd5e1',
                    fontWeight: 700,
                    fontSize: '0.68rem'
                  }}
                />
              )}
            </Stack>
          )}

          <Stack direction="row" spacing={0.8} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {Array.isArray(guide.tourTypes) && guide.tourTypes.slice(0, 2).map((type, idx) => (
              <Chip
                key={`${type}-${idx}`}
                label={type}
                size="small"
                variant="outlined"
                sx={{
                  height: 22,
                  borderColor: '#bbf7d0',
                  color: '#166534',
                  fontWeight: 700,
                  bgcolor: '#f0fdf4',
                  fontSize: '0.7rem',
                }}
              />
            ))}
            {guide.guestSatisfaction > 0 && (
              <Tooltip title="Guest satisfaction based on average tourist rating">
                <Chip
                  label={`${guide.guestSatisfaction}% guest rating`}
                  size="small"
                  sx={{
                    height: 22,
                    bgcolor: '#ecfccb',
                    color: '#3f6212',
                    fontWeight: 800,
                    fontSize: '0.7rem',
                  }}
                />
              </Tooltip>
            )}
          </Stack>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mt: 0.3, pt: 1, borderTop: '1px solid #e2e8f0' }}
          >
            <Box>
              <Typography sx={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>
                Starting from
              </Typography>
              <Typography sx={{ color: '#0f766e', fontWeight: 900, fontSize: '1.08rem' }}>
                INR {guide.price}
                <Typography component="span" sx={{ ml: 0.5, color: '#64748b', fontWeight: 700, fontSize: '0.72rem' }}>
                  /{guide.rateType === 'hourly' ? 'hour' : 'day'}
                </Typography>
              </Typography>
            </Box>
            <Typography sx={{ color: '#64748b', fontSize: '0.72rem', textAlign: 'right' }}>
              {formatResponseTime(guide.averageResponseTime)}
            </Typography>
          </Stack>

          <Stack direction="row" spacing={0.8} sx={{ mt: 0.8 }}>
            <Button
              variant="contained"
              onClick={handleBook}
              disabled={!isBookable}
              sx={{
                flex: 1.2,
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '0.86rem',
                minHeight: 40,
                py: 0.65,
                borderRadius: 10,
                bgcolor: !isBookable ? '#cbd5e1' : '#0f766e',
                whiteSpace: 'nowrap',
                '&:hover': {
                  bgcolor: !isBookable ? '#cbd5e1' : '#0f5f59',
                },
              }}
            >
              {isBookable ? 'Book Guide' : hasLocalDestinations ? 'Unavailable' : 'Setup Pending'}
            </Button>
            <Button
              variant="outlined"
              onClick={handleViewProfile}
              sx={{
                flex: 1,
                textTransform: 'none',
                fontWeight: 800,
                fontSize: '0.84rem',
                minHeight: 40,
                py: 0.65,
                px: 1.2,
                borderRadius: 10,
                whiteSpace: 'nowrap',
                borderColor: '#cbd5e1',
                color: '#334155',
                '&:hover': {
                  borderColor: '#0f766e',
                  color: '#0f766e',
                  bgcolor: '#f0fdfa',
                },
              }}
            >
              View Profile
            </Button>
          </Stack>
        </Box>
      </Card>

      <Modal
        open={videoOpen}
        onClose={() => setVideoOpen(false)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(2, 6, 23, 0.84)',
        }}
      >
        <Box
          sx={{
            background: '#000000',
            borderRadius: 2,
            overflow: 'hidden',
            width: '92%',
            maxWidth: '760px',
          }}
        >
          <Box
            component="video"
            src={buildMediaUrl(guide.guideVideo)}
            controls
            autoPlay
            sx={{ width: '100%', display: 'block', maxHeight: '78vh' }}
          />
        </Box>
      </Modal>
    </>
  );
}
