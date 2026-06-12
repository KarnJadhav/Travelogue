import React, { useEffect, useState } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogContent,
  IconButton,
  LinearProgress,
  Paper,
  Rating,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import CloseIcon from '@mui/icons-material/Close';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import FavoriteIcon from '@mui/icons-material/Favorite';
import ShareIcon from '@mui/icons-material/Share';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LanguageIcon from '@mui/icons-material/Language';
import VerifiedIcon from '@mui/icons-material/Verified';
import PlayCircleIcon from '@mui/icons-material/PlayCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PremiumImage from '../../components/PremiumImage';
import { buildMediaUrl } from '../../utils/media';
import api from '../../api';

function getMediaKind(item) {
  const explicitType = item?.mediaType;
  if (explicitType === 'video' || explicitType === 'image') return explicitType;
  const source = String(item?.url || '').toLowerCase();
  return /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(source) ? 'video' : 'image';
}

function formatReviewDate(value) {
  if (!value) return 'Recently';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatResponseTime(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) return 'Fast response';
  if (value <= 1) return 'Within 1 hour';
  if (value < 24) return `Within ${Math.round(value)} hours`;
  const days = Math.ceil(value / 24);
  return `Within ${days} day${days > 1 ? 's' : ''}`;
}

function formatResponseBadge(hours) {
  const value = Number(hours);
  if (!Number.isFinite(value) || value <= 0) return 'Fast';
  if (value < 24) return `${Math.max(1, Math.round(value))}h`;
  return `${Math.ceil(value / 24)}d`;
}

function SectionCard({ title, subtitle = '', action = null, children }) {
  return (
    <Paper
      elevation={0}
      sx={{
        borderRadius: 2.5,
        border: '1px solid #dce7df',
        bgcolor: '#ffffff',
        p: { xs: 1.6, md: 2 },
      }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: subtitle ? 1.1 : 1.4 }}>
        <Box>
          <Typography sx={{ fontSize: '1rem', fontWeight: 900, color: '#0f172a' }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ fontSize: '0.82rem', color: '#64748b', mt: 0.2 }}>
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {action}
      </Stack>
      {children}
    </Paper>
  );
}

export default function GuideDetailModal({
  open,
  guide,
  onClose,
  onBook,
  onReviewSubmitted = () => {},
  isFavorite = false,
  onFavoriteToggle = () => {},
}) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [liked, setLiked] = useState(isFavorite);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewPlace, setReviewPlace] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewMessage, setReviewMessage] = useState(null);
  const [previewMedia, setPreviewMedia] = useState(null);
  const [shareMessage, setShareMessage] = useState('');

  useEffect(() => {
    setLiked(isFavorite);
  }, [isFavorite]);

  useEffect(() => {
    setReviewRating(0);
    setReviewPlace(guide?.eligibleReviewBooking?.destination || '');
    setReviewComment('');
    setReviewMessage(null);
    setPreviewMedia(null);
    setShareMessage('');
  }, [guide?._id, guide?.eligibleReviewBooking?._id, guide?.eligibleReviewBooking?.destination, open]);

  if (!guide) return null;

  const tourMedia = Array.isArray(guide.tourMedia) ? guide.tourMedia.filter((item) => item?.url) : [];

  const galleryItems = (() => {
    const items = [...tourMedia];
    const videoExists = items.some(
      (item) => getMediaKind(item) === 'video' && String(item?.url || '') === String(guide.guideVideo || '')
    );

    if (guide.guideVideo && !videoExists) {
      items.unshift({
        _id: 'guide-video-cover',
        mediaType: 'video',
        url: guide.guideVideo,
        caption: 'Guide introduction video',
      });
    }

    if (items.length === 0 && guide.avatar) {
      items.push({
        _id: 'guide-profile-image',
        mediaType: 'image',
        url: guide.avatar,
        caption: 'Guide profile photo',
      });
    }

    return items;
  })();

  const languages = (Array.isArray(guide.languages) ? guide.languages : [])
    .map((lang) => {
      if (typeof lang === 'string') return { name: lang, level: 'Fluent' };
      return {
        name: lang?.name || '',
        level: lang?.level || 'Fluent',
      };
    })
    .filter((item) => item.name);

  const reviews = Array.isArray(guide.reviews) ? guide.reviews : [];
  const reviewCount = Number(guide.reviewCount || reviews.length || 0);
  const averageRating = reviewCount > 0 ? Number(guide.rating || 0) : 0;
  const eligibleReviewBooking = guide.eligibleReviewBooking || null;

  const reviewDistribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((review) => Math.round(Number(review.rating || 0)) === rating).length;
    const percentage = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
    return { rating, count, percentage };
  });

  const tourTypes = Array.isArray(guide.tourTypes) ? guide.tourTypes.filter(Boolean) : [];
  const highlights = Array.isArray(guide.highlights) ? guide.highlights.filter(Boolean) : [];
  const serviceDestinations = Array.isArray(guide.serviceDestinations)
    ? guide.serviceDestinations
      .map((item) => ({
        destination: String(item?.destination || '').trim(),
        price: Number(item?.price || 0)
      }))
      .filter((item) => item.destination && Number.isFinite(item.price) && item.price > 0)
    : [];

  const verificationItems = [
    { label: 'Identity verified', active: Boolean(guide.verifiedID) },
    { label: 'Phone verified', active: Boolean(guide.verifiedPhone) },
    { label: 'Payment verified', active: Boolean(guide.verifiedPayment) },
  ];

  const heroMedia = galleryItems[0];
  const heroKind = getMediaKind(heroMedia);
  const heroSrc = buildMediaUrl(heroMedia?.url || '');
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
    ? 'rgba(71, 85, 105, 0.96)'
    : availabilityReason === 'booked_now'
    ? 'rgba(245, 158, 11, 0.96)'
    : isAvailable
      ? 'rgba(16, 185, 129, 0.96)'
      : 'rgba(100, 116, 139, 0.96)';
  const responseBadge = formatResponseBadge(guide.averageResponseTime);

  const handleSubmitReview = async () => {
    if (!eligibleReviewBooking) return;
    if (!reviewRating || !reviewComment.trim()) {
      setReviewMessage({ severity: 'warning', text: 'Please add both a rating and a comment.' });
      return;
    }

    setReviewSubmitting(true);
    try {
      await api.post('/review', {
        guideId: guide.userId,
        bookingId: eligibleReviewBooking._id,
        place: reviewPlace || eligibleReviewBooking.destination,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });

      setReviewMessage({ severity: 'success', text: 'Your review is now visible for other tourists.' });
      setReviewRating(0);
      setReviewComment('');
      onReviewSubmitted(guide.userId);
      window.dispatchEvent(
        new CustomEvent('guideReviewsUpdated', {
          detail: { guideId: guide.userId },
        })
      );
    } catch (err) {
      setReviewMessage({
        severity: 'error',
        text: err.response?.data?.message || err.message || 'Failed to submit review.',
      });
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleShareProfile = async () => {
    const shareText = `${guide.name} - ${guide.location} - INR ${guide.price}/${guide.rateType === 'hourly' ? 'hour' : 'day'}`;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);
        setShareMessage('Guide details copied. You can now share them.');
      } else {
        setShareMessage('Copy is not supported in this browser.');
      }
    } catch {
      setShareMessage('Unable to copy guide details right now.');
    }
  };

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen={fullScreen}
        fullWidth
        maxWidth="lg"
        scroll="paper"
        PaperProps={{
          sx: {
            width: '100%',
            height: { xs: '100%', md: '92vh' },
            maxHeight: { xs: '100%', md: '92vh' },
            m: { xs: 0, md: 2 },
            borderRadius: { xs: 0, md: 3 },
            overflow: 'hidden',
            border: '1px solid #d7e5da',
            bgcolor: '#f6fbf8',
          },
        }}
      >
        <DialogContent sx={{ p: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ position: 'relative', height: { xs: 220, md: 280 }, flexShrink: 0, bgcolor: '#dde9e2' }}>
            {heroKind === 'video' && heroSrc ? (
              <Box
                component="video"
                src={heroSrc}
                autoPlay
                muted
                loop
                playsInline
                sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <PremiumImage
                src={heroMedia?.url || guide.avatar}
                alt={guide.name}
                name={guide.name}
                height="100%"
                width="100%"
                showLabel
                imgSx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            )}

            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(180deg, rgba(11, 18, 32, 0.2) 0%, rgba(11, 18, 32, 0.7) 100%)',
              }}
            />

            <Stack
              direction="row"
              spacing={1}
              sx={{ position: 'absolute', top: 12, right: 12, zIndex: 3 }}
            >
              <IconButton
                onClick={() => {
                  setLiked((prev) => !prev);
                  onFavoriteToggle(guide);
                }}
                size="small"
                sx={{
                  bgcolor: liked ? 'rgba(254, 226, 226, 0.95)' : 'rgba(255,255,255,0.94)',
                  color: liked ? '#dc2626' : '#334155',
                  '&:hover': { bgcolor: '#ffffff' },
                }}
              >
                {liked ? <FavoriteIcon fontSize="small" /> : <FavoriteBorderIcon fontSize="small" />}
              </IconButton>

              <IconButton
                onClick={handleShareProfile}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.94)',
                  color: '#334155',
                  '&:hover': { bgcolor: '#ffffff' },
                }}
              >
                <ShareIcon fontSize="small" />
              </IconButton>

              <IconButton
                onClick={onClose}
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.94)',
                  color: '#334155',
                  '&:hover': { bgcolor: '#ffffff' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Stack>

            <Chip
              label={availabilityLabel}
              size="small"
              sx={{
                position: 'absolute',
                top: 14,
                left: 14,
                zIndex: 3,
                bgcolor: availabilityBg,
                color: '#ffffff',
                fontWeight: 800,
              }}
            />

            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1.5}
              alignItems={{ xs: 'flex-start', sm: 'center' }}
              sx={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: 14,
                zIndex: 3,
              }}
            >
              <Avatar
                src={buildMediaUrl(guide.avatar)}
                alt={guide.name}
                sx={{
                  width: 74,
                  height: 74,
                  border: '3px solid rgba(255,255,255,0.95)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.26)',
                }}
              >
                {guide.name?.charAt(0)?.toUpperCase() || 'G'}
              </Avatar>

              <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                  <Typography
                    sx={{
                      color: '#ffffff',
                      fontWeight: 900,
                      fontSize: { xs: '1.2rem', md: '1.45rem' },
                      lineHeight: 1.2,
                    }}
                  >
                    {guide.name}
                  </Typography>
                  {guide.verifiedID ? (
                    <Tooltip title="Identity verified">
                      <VerifiedIcon sx={{ color: '#86efac', fontSize: 20 }} />
                    </Tooltip>
                  ) : null}
                </Stack>

                <Stack direction="row" alignItems="center" gap={0.7} sx={{ mt: 0.5 }} flexWrap="wrap">
                  <LocationOnIcon sx={{ color: '#d1fae5', fontSize: 15 }} />
                  <Typography sx={{ color: '#ecfdf5', fontSize: '0.86rem', fontWeight: 600 }}>
                    {guide.location || 'Global'}
                  </Typography>
                  <Typography sx={{ color: '#dcfce7', fontSize: '0.86rem' }}>
                    {guide.experienceYears || 0} years experience
                  </Typography>
                  <Typography sx={{ color: '#dcfce7', fontSize: '0.86rem' }}>
                    {formatResponseTime(guide.averageResponseTime)}
                  </Typography>
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 340px' },
              minHeight: 0,
              flex: 1,
            }}
          >
            <Box sx={{ overflowY: 'auto', p: { xs: 1.6, md: 2.3 } }}>
              {shareMessage ? (
                <Alert severity="success" sx={{ mb: 1.4 }}>
                  {shareMessage}
                </Alert>
              ) : null}

              <Stack spacing={1.4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 1.2,
                    borderRadius: 2.2,
                    border: '1px solid #dce7df',
                    bgcolor: '#ffffff',
                  }}
                >
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', md: 'repeat(4, minmax(0, 1fr))' },
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography sx={{ color: '#0f766e', fontWeight: 900, fontSize: '1.08rem' }}>
                        {averageRating > 0 ? averageRating.toFixed(1) : 'New'}
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.76rem' }}>
                        Average Rating
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#0f766e', fontWeight: 900, fontSize: '1.08rem' }}>
                        {reviewCount}
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.76rem' }}>
                        Tourist Reviews
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#0f766e', fontWeight: 900, fontSize: '1.08rem' }}>
                        {guide.bookings || 0}
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.76rem' }}>
                        Completed Tours
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ color: '#0f766e', fontWeight: 900, fontSize: '1.08rem' }}>
                        {responseBadge}
                      </Typography>
                      <Typography sx={{ color: '#64748b', fontWeight: 700, fontSize: '0.76rem' }}>
                        Response Speed
                      </Typography>
                    </Box>
                  </Box>
                </Paper>

                <SectionCard
                  title="About Guide"
                  subtitle="Professional profile details tourists need before booking"
                >
                  <Typography sx={{ color: '#334155', fontSize: '0.9rem', lineHeight: 1.72 }}>
                    {guide.description || 'Experienced local guide with personalized tour support and strong destination knowledge.'}
                  </Typography>
                </SectionCard>

                <SectionCard
                  title="Languages & Expertise"
                  subtitle="Communication clarity and tour specialization"
                >
                  <Stack spacing={1.2}>
                    <Box>
                      <Stack direction="row" alignItems="center" gap={0.6} sx={{ mb: 0.8 }}>
                        <LanguageIcon sx={{ color: '#0f766e', fontSize: 18 }} />
                        <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem' }}>
                          Languages
                        </Typography>
                      </Stack>
                      {languages.length === 0 ? (
                        <Typography sx={{ color: '#64748b', fontSize: '0.84rem' }}>
                          Languages are not added yet.
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={0.7} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          {languages.map((lang, idx) => (
                            <Chip
                              key={`${lang.name}-${idx}`}
                              label={`${lang.name} (${lang.level})`}
                              size="small"
                              sx={{
                                bgcolor: '#ecfeff',
                                color: '#0f766e',
                                border: '1px solid #99f6e4',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                              }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>

                    <Box>
                      <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem', mb: 0.8 }}>
                        Tour Types
                      </Typography>
                      {tourTypes.length === 0 ? (
                        <Typography sx={{ color: '#64748b', fontSize: '0.84rem' }}>
                          Tour categories are not added yet.
                        </Typography>
                      ) : (
                        <Stack direction="row" spacing={0.7} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          {tourTypes.map((type, idx) => (
                            <Chip
                              key={`${type}-${idx}`}
                              label={type}
                              size="small"
                              sx={{
                                bgcolor: '#f0fdf4',
                                color: '#166534',
                                border: '1px solid #bbf7d0',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                              }}
                            />
                          ))}
                        </Stack>
                      )}
                    </Box>

                    {highlights.length > 0 ? (
                      <Box>
                        <Typography sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.88rem', mb: 0.8 }}>
                          Profile Highlights
                        </Typography>
                        <Stack direction="row" spacing={0.7} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          {highlights.map((item, idx) => (
                            <Chip
                              key={`${item}-${idx}`}
                              label={item}
                              size="small"
                              variant="outlined"
                              sx={{
                                borderColor: '#cbd5e1',
                                color: '#334155',
                                fontWeight: 700,
                                fontSize: '0.72rem',
                              }}
                            />
                          ))}
                        </Stack>
                      </Box>
                    ) : null}
                  </Stack>
                </SectionCard>

                <SectionCard
                  title="Trust & Safety"
                  subtitle="Verification and policy information"
                >
                  <Stack spacing={1}>
                    {verificationItems.map((item) => (
                      <Stack key={item.label} direction="row" alignItems="center" justifyContent="space-between">
                        <Typography sx={{ color: '#334155', fontSize: '0.85rem', fontWeight: 700 }}>
                          {item.label}
                        </Typography>
                        <Chip
                          size="small"
                          label={item.active ? 'Verified' : 'Pending'}
                          color={item.active ? 'success' : 'default'}
                          variant={item.active ? 'filled' : 'outlined'}
                          sx={{ fontWeight: 700, minWidth: 82 }}
                        />
                      </Stack>
                    ))}

                    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ pt: 0.6 }}>
                      <Typography sx={{ color: '#334155', fontSize: '0.85rem', fontWeight: 700 }}>
                        Cancellation policy
                      </Typography>
                      <Typography sx={{ color: '#166534', fontSize: '0.85rem', fontWeight: 800 }}>
                        {guide.cancelPolicy || 'Moderate'}
                      </Typography>
                    </Stack>
                  </Stack>
                </SectionCard>

                <SectionCard
                  title="Photos & Videos"
                  subtitle="Real media from guide profile and completed tours"
                >
                  {galleryItems.length === 0 ? (
                    <Box
                      sx={{
                        border: '1px dashed #cbd5e1',
                        borderRadius: 2,
                        p: 2,
                        textAlign: 'center',
                        bgcolor: '#f8fafc',
                      }}
                    >
                      <Typography sx={{ color: '#334155', fontWeight: 700 }}>
                        No media uploaded yet
                      </Typography>
                    </Box>
                  ) : (
                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, minmax(0, 1fr))' },
                        gap: 1,
                      }}
                    >
                      {galleryItems.map((item, idx) => {
                        const kind = getMediaKind(item);
                        const mediaUrl = buildMediaUrl(item?.url || '');
                        return (
                          <Box
                            key={`${item?._id || mediaUrl}-${idx}`}
                            onClick={() => setPreviewMedia(item)}
                            sx={{
                              position: 'relative',
                              borderRadius: 2,
                              overflow: 'hidden',
                              border: '1px solid #dbe4ea',
                              bgcolor: '#f8fafc',
                              cursor: 'pointer',
                              minHeight: 112,
                            }}
                          >
                            {kind === 'video' ? (
                              <Box sx={{ position: 'relative' }}>
                                <Box
                                  component="video"
                                  src={mediaUrl}
                                  muted
                                  preload="metadata"
                                  sx={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                                />
                                <Box
                                  sx={{
                                    position: 'absolute',
                                    inset: 0,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(15, 23, 42, 0.3)',
                                  }}
                                >
                                  <PlayCircleIcon sx={{ color: '#ffffff', fontSize: 34 }} />
                                </Box>
                              </Box>
                            ) : (
                              <Box
                                component="img"
                                src={mediaUrl}
                                alt={item?.caption || `Guide media ${idx + 1}`}
                                loading="lazy"
                                sx={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }}
                              />
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </SectionCard>

                <SectionCard
                  title="Tourist Reviews"
                  subtitle={`${reviews.length} review${reviews.length === 1 ? '' : 's'} from completed tours`}
                >
                  <Stack spacing={1.3}>
                    {eligibleReviewBooking ? (
                      <Paper
                        elevation={0}
                        sx={{
                          p: 1.3,
                          borderRadius: 1.8,
                          border: '1px solid #fed7aa',
                          bgcolor: '#fff7ed',
                        }}
                      >
                        <Typography sx={{ fontWeight: 800, color: '#7c2d12', fontSize: '0.86rem', mb: 0.8 }}>
                          Write your review for completed tour
                        </Typography>
                        {reviewMessage ? (
                          <Alert severity={reviewMessage.severity} sx={{ mb: 1 }}>
                            {reviewMessage.text}
                          </Alert>
                        ) : null}
                        {reviewMessage?.severity !== 'success' ? (
                          <Stack spacing={1}>
                            <Rating value={reviewRating} onChange={(_, value) => setReviewRating(value || 0)} />
                            <TextField
                              size="small"
                              label="Place"
                              value={reviewPlace}
                              onChange={(event) => setReviewPlace(event.target.value)}
                            />
                            <TextField
                              size="small"
                              label="Your review"
                              value={reviewComment}
                              onChange={(event) => setReviewComment(event.target.value)}
                              multiline
                              minRows={3}
                            />
                            <Button
                              variant="contained"
                              onClick={handleSubmitReview}
                              disabled={reviewSubmitting}
                              sx={{
                                alignSelf: 'flex-start',
                                textTransform: 'none',
                                fontWeight: 700,
                                bgcolor: '#0f766e',
                                '&:hover': { bgcolor: '#0f5f59' },
                              }}
                            >
                              {reviewSubmitting ? 'Submitting...' : 'Submit review'}
                            </Button>
                          </Stack>
                        ) : null}
                      </Paper>
                    ) : null}

                    <Paper
                      elevation={0}
                      sx={{
                        p: 1.3,
                        borderRadius: 1.8,
                        border: '1px solid #e2e8f0',
                        bgcolor: '#f8fafc',
                      }}
                    >
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.4}>
                        <Box sx={{ minWidth: 110 }}>
                          <Typography sx={{ color: '#0f766e', fontSize: '1.34rem', fontWeight: 900 }}>
                            {averageRating > 0 ? averageRating.toFixed(1) : 'New'}
                          </Typography>
                          <Rating value={averageRating} precision={0.1} readOnly size="small" />
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          {reviewDistribution.map((item) => (
                            <Stack
                              key={item.rating}
                              direction="row"
                              alignItems="center"
                              gap={0.8}
                              sx={{ mb: 0.45 }}
                            >
                              <Typography sx={{ width: 16, fontSize: '0.72rem', color: '#64748b', fontWeight: 700 }}>
                                {item.rating}
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={item.percentage}
                                sx={{
                                  flex: 1,
                                  height: 7,
                                  borderRadius: 999,
                                  bgcolor: '#e2e8f0',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: '#f59e0b',
                                  },
                                }}
                              />
                              <Typography sx={{ width: 24, textAlign: 'right', fontSize: '0.72rem', color: '#64748b' }}>
                                {item.count}
                              </Typography>
                            </Stack>
                          ))}
                        </Box>
                      </Stack>
                    </Paper>

                    {reviews.length === 0 ? (
                      <Box
                        sx={{
                          p: 2,
                          border: '1px dashed #cbd5e1',
                          borderRadius: 2,
                          textAlign: 'center',
                          bgcolor: '#f8fafc',
                        }}
                      >
                        <Typography sx={{ fontWeight: 800, color: '#0f172a' }}>
                          No tourist reviews yet
                        </Typography>
                        <Typography sx={{ color: '#64748b', fontSize: '0.84rem', mt: 0.45 }}>
                          Completed tour feedback will appear here once tourists submit reviews.
                        </Typography>
                      </Box>
                    ) : (
                      reviews.map((review) => (
                        <Paper
                          key={review._id}
                          elevation={0}
                          sx={{
                            p: 1.25,
                            borderRadius: 1.8,
                            border: '1px solid #e2e8f0',
                            bgcolor: '#ffffff',
                          }}
                        >
                          <Stack direction="row" gap={1}>
                            <Avatar src={buildMediaUrl(review.touristAvatar)} sx={{ width: 34, height: 34 }}>
                              {review.touristName?.charAt(0)?.toUpperCase() || 'T'}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
                                <Typography sx={{ color: '#0f172a', fontWeight: 800, fontSize: '0.84rem' }}>
                                  {review.touristName || 'Tourist'}
                                </Typography>
                                <Typography sx={{ color: '#94a3b8', fontSize: '0.72rem' }}>
                                  {formatReviewDate(review.createdAt)}
                                </Typography>
                              </Stack>
                              <Stack direction="row" alignItems="center" gap={0.8} sx={{ mt: 0.2, flexWrap: 'wrap' }}>
                                <Rating value={Number(review.rating || 0)} readOnly size="small" />
                                {review.place ? (
                                  <Chip
                                    label={review.place}
                                    size="small"
                                    sx={{
                                      height: 20,
                                      bgcolor: '#eef2ff',
                                      color: '#4f46e5',
                                      fontWeight: 700,
                                      fontSize: '0.66rem',
                                    }}
                                  />
                                ) : null}
                              </Stack>
                              <Typography sx={{ color: '#475569', fontSize: '0.84rem', lineHeight: 1.6, mt: 0.7 }}>
                                {review.comment || 'No written comment provided.'}
                              </Typography>
                              {review.guideReply ? (
                                <Box
                                  sx={{
                                    mt: 0.95,
                                    p: 0.95,
                                    borderRadius: 1.4,
                                    bgcolor: '#f0fdf4',
                                    border: '1px solid #dcfce7',
                                  }}
                                >
                                  <Typography sx={{ color: '#15803d', fontWeight: 800, fontSize: '0.74rem' }}>
                                    Guide reply
                                  </Typography>
                                  <Typography sx={{ color: '#36574c', fontSize: '0.8rem', mt: 0.4, lineHeight: 1.5 }}>
                                    {review.guideReply}
                                  </Typography>
                                </Box>
                              ) : null}
                            </Box>
                          </Stack>
                        </Paper>
                      ))
                    )}
                  </Stack>
                </SectionCard>
              </Stack>
            </Box>

            <Box
              sx={{
                borderLeft: { xs: 'none', md: '1px solid #deeadf' },
                p: { xs: 1.6, md: 1.8 },
                borderTop: { xs: '1px solid #deeadf', md: 'none' },
                bgcolor: '#f8fcf9',
                overflowY: 'auto',
              }}
            >
              <Stack spacing={1.2}>
                <Paper
                  elevation={0}
                  sx={{
                    borderRadius: 2.5,
                    border: '1px solid #d5e4da',
                    bgcolor: '#ffffff',
                    p: 1.5,
                  }}
                >
                  <Typography sx={{ color: '#64748b', fontSize: '0.76rem', fontWeight: 700 }}>
                    STARTING PRICE
                  </Typography>
                  <Typography sx={{ color: '#0f766e', fontSize: '1.5rem', fontWeight: 900, lineHeight: 1.2, mt: 0.2 }}>
                    INR {guide.price}
                    <Typography component="span" sx={{ ml: 0.6, fontSize: '0.82rem', color: '#64748b', fontWeight: 700 }}>
                      /{guide.rateType === 'hourly' ? 'hour' : 'day'}
                    </Typography>
                  </Typography>

                  <Stack direction="row" alignItems="center" gap={0.7} sx={{ mt: 0.8, mb: 1 }}>
                    <Rating value={averageRating} precision={0.1} readOnly size="small" />
                    <Typography sx={{ color: '#475569', fontSize: '0.8rem', fontWeight: 700 }}>
                      {averageRating > 0 ? averageRating.toFixed(1) : 'New'} ({reviewCount})
                    </Typography>
                  </Stack>

                  <Chip
                    label={
                      !isBookable
                        ? (hasLocalDestinations ? 'Currently Unavailable' : 'Destinations Not Configured')
                        : availabilityReason === 'booked_now'
                          ? 'Busy Right Now'
                          : 'Available to Book'
                    }
                    size="small"
                    sx={{
                      bgcolor: !isBookable
                        ? '#e2e8f0'
                        : availabilityReason === 'booked_now'
                          ? '#ffedd5'
                          : '#dcfce7',
                      color: !isBookable
                        ? '#475569'
                        : availabilityReason === 'booked_now'
                          ? '#9a3412'
                          : '#166534',
                      fontWeight: 800,
                      mb: 1,
                    }}
                  />

                  <Stack spacing={0.8} sx={{ mb: 1.4 }}>
                    {[
                      `Response time: ${formatResponseTime(guide.averageResponseTime)}`,
                      `${guide.bookings || 0} completed tours`,
                      `${languages.length || 0} language${languages.length === 1 ? '' : 's'} spoken`,
                      `${serviceDestinations.length || 0} local destination${serviceDestinations.length === 1 ? '' : 's'} configured`,
                      `${guide.cancelPolicy || 'Moderate'} cancellation policy`,
                    ].map((item) => (
                      <Stack key={item} direction="row" alignItems="center" gap={0.7}>
                        <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 16 }} />
                        <Typography sx={{ color: '#334155', fontSize: '0.81rem', fontWeight: 600 }}>
                          {item}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>

                  {serviceDestinations.length > 0 ? (
                    <Box sx={{ mb: 1.4, p: 1, borderRadius: 1.4, border: '1px solid #fed7aa', bgcolor: '#fff7ed' }}>
                      <Typography sx={{ color: '#9a3412', fontSize: '0.76rem', fontWeight: 800, mb: 0.7 }}>
                        Available Local Destinations
                      </Typography>
                      <Stack spacing={0.5}>
                        {serviceDestinations.slice(0, 5).map((item) => (
                          <Stack
                            key={item.destination}
                            direction="row"
                            alignItems="center"
                            justifyContent="space-between"
                          >
                            <Typography sx={{ color: '#7c2d12', fontSize: '0.78rem', fontWeight: 700 }}>
                              {item.destination}
                            </Typography>
                            <Typography sx={{ color: '#9a3412', fontSize: '0.78rem', fontWeight: 800 }}>
                              INR {Math.round(item.price)}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                    </Box>
                  ) : null}

                  <Button
                    variant="contained"
                    fullWidth
                    disabled={!isBookable}
                    onClick={() => {
                      if (!isBookable) return;
                      if (onBook) onBook(guide);
                      onClose();
                    }}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 900,
                      py: 0.95,
                      borderRadius: 1.8,
                      fontSize: '0.9rem',
                      bgcolor: !isBookable ? '#cbd5e1' : '#0f766e',
                      '&:hover': {
                        bgcolor: !isBookable ? '#cbd5e1' : '#0f5f59',
                      },
                      '&.Mui-disabled': {
                        color: '#475569',
                      },
                    }}
                  >
                    {isBookable ? 'Book This Guide' : hasLocalDestinations ? 'Unavailable' : 'Setup Pending'}
                  </Button>

                  <Button
                    variant="text"
                    fullWidth
                    onClick={onClose}
                    sx={{
                      textTransform: 'none',
                      fontWeight: 700,
                      color: '#475569',
                      mt: 0.8,
                    }}
                  >
                    Close Profile
                  </Button>
                </Paper>
              </Stack>
            </Box>
          </Box>

          {fullScreen ? (
            <Box
              sx={{
                display: { xs: 'flex', md: 'none' },
                alignItems: 'center',
                gap: 1,
                px: 1.4,
                py: 1.05,
                borderTop: '1px solid #dbe7df',
                bgcolor: 'rgba(255,255,255,0.98)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>
                  FROM
                </Typography>
                <Typography sx={{ color: '#0f766e', fontWeight: 900, fontSize: '1.05rem', lineHeight: 1.2 }}>
                  INR {guide.price}
                  <Typography component="span" sx={{ ml: 0.4, color: '#64748b', fontSize: '0.72rem', fontWeight: 700 }}>
                    /{guide.rateType === 'hourly' ? 'hour' : 'day'}
                  </Typography>
                </Typography>
              </Box>
              <Button
                variant="contained"
                disabled={!isBookable}
                onClick={() => {
                  if (!isBookable) return;
                  if (onBook) onBook(guide);
                  onClose();
                }}
                sx={{
                  minWidth: 142,
                  textTransform: 'none',
                  fontWeight: 900,
                  fontSize: '0.86rem',
                  py: 0.8,
                  borderRadius: 999,
                  bgcolor: !isBookable ? '#cbd5e1' : '#0f766e',
                  '&:hover': {
                    bgcolor: !isBookable ? '#cbd5e1' : '#0f5f59',
                  },
                  '&.Mui-disabled': {
                    color: '#475569',
                  },
                }}
              >
                {isBookable ? 'Book Guide' : 'Unavailable'}
              </Button>
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(previewMedia)}
        onClose={() => setPreviewMedia(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            bgcolor: '#020617',
            overflow: 'hidden',
          },
        }}
      >
        {previewMedia ? (
          <Box sx={{ position: 'relative' }}>
            <IconButton
              onClick={() => setPreviewMedia(null)}
              size="small"
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                zIndex: 2,
                bgcolor: 'rgba(255,255,255,0.92)',
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>

            {getMediaKind(previewMedia) === 'video' ? (
              <Box
                component="video"
                src={buildMediaUrl(previewMedia.url)}
                controls
                autoPlay
                sx={{ width: '100%', maxHeight: '72vh', display: 'block', bgcolor: '#000000' }}
              />
            ) : (
              <Box
                component="img"
                src={buildMediaUrl(previewMedia.url)}
                alt={previewMedia.caption || 'Guide media'}
                sx={{ width: '100%', maxHeight: '72vh', objectFit: 'contain', display: 'block', bgcolor: '#000000' }}
              />
            )}

            {previewMedia.caption ? (
              <Box sx={{ p: 1.5, borderTop: '1px solid #1e293b', bgcolor: '#020617' }}>
                <Typography sx={{ color: '#cbd5e1', fontSize: '0.86rem' }}>
                  {previewMedia.caption}
                </Typography>
              </Box>
            ) : null}
          </Box>
        ) : null}
      </Dialog>
    </>
  );
}
