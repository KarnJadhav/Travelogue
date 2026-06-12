import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Paper,
  Stack,
  Typography,
  Avatar,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  CircularProgress,
  Alert,
  Snackbar,
  Tooltip,
  useMediaQuery
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import FilterListIcon from '@mui/icons-material/FilterList';
import { motion } from 'framer-motion';
import API from '../../api';
import TravelogueCard from './TravelogueCard';
import TravelogueDetailView from './TravelogueDetailView';
import { buildImageUrl, isVideoFile } from '../../utils/imageHelper';

const STORY_DURATION_MS = 6000;

const FEED_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'photos', label: 'Photos' },
  { value: 'videos', label: 'Videos' },
  { value: 'mine', label: 'My Posts' }
];

function getOwnerId(item) {
  if (!item?.userId) return null;
  return typeof item.userId === 'string' ? item.userId : item.userId?._id || null;
}

function getStoryDisplayName(story) {
  if (!story?.userId) return 'Traveler';

  const rawName =
    typeof story.userId === 'string'
      ? ''
      : typeof story.userId.name === 'string'
      ? story.userId.name
      : '';

  if (!rawName.trim()) return 'Traveler';
  const first = rawName.trim().split(/\s+/)[0];
  return first || 'Traveler';
}

function normalizeMediaPath(entry) {
  if (typeof entry === 'string') return entry.trim();

  if (entry && typeof entry === 'object') {
    const candidates = [entry.url, entry.secure_url, entry.path, entry.src, entry.media];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }

  return '';
}

function getMediaList(item) {
  const source = item?.images;
  if (Array.isArray(source)) {
    return source.map(normalizeMediaPath).filter(Boolean);
  }

  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) return [];

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.map(normalizeMediaPath).filter(Boolean) : [];
      } catch (err) {
        // fall through to comma-based parsing.
      }
    }

    return trimmed
      .split(',')
      .map(normalizeMediaPath)
      .filter(Boolean);
  }

  return [];
}

export default function TravelogueStories() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user._id || user.userId;
  const isMobile = useMediaQuery('(max-width:900px)');
  const baseVisibleCount = isMobile ? 4 : 6;

  const [travelogues, setTravelogues] = useState([]);
  const [storyTotalCount, setStoryTotalCount] = useState(0);
  const [myLatest, setMyLatest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [storyViewerOpen, setStoryViewerOpen] = useState(false);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const [composerOpen, setComposerOpen] = useState(false);
  const [storyForm, setStoryForm] = useState({
    title: '',
    description: '',
    destination: ''
  });
  const [storyMedia, setStoryMedia] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const [feedFilter, setFeedFilter] = useState('all');
  const [visibleCount, setVisibleCount] = useState(baseVisibleCount);
  const [selectedTravelogue, setSelectedTravelogue] = useState(null);
  const [selectedTravelogueId, setSelectedTravelogueId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fileInputRef = useRef(null);
  const feedSectionRef = useRef(null);

  useEffect(() => {
    fetchStories();
    fetchMyLatest();
  }, []);

  useEffect(() => {
    setVisibleCount(baseVisibleCount);
  }, [baseVisibleCount, feedFilter]);

  const fetchStories = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await API.get('/travelogue/all?sortBy=newest&page=1&limit=60');
      const list = response.data.travelogues || [];
      setTravelogues(list);
      setStoryTotalCount(Number(response.data?.pagination?.total) || list.length);
    } catch (err) {
      setError('Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyLatest = async () => {
    try {
      if (!userId) return;
      const response = await API.get(`/travelogue/user/${userId}?page=1&limit=1`);
      setMyLatest(response.data.travelogues?.[0] || null);
    } catch (err) {
      // Silent fail to keep feed usable.
    }
  };

  const normalizedTravelogues = useMemo(
    () =>
      travelogues.map((travelogue) => ({
        ...travelogue,
        images: getMediaList(travelogue)
      })),
    [travelogues]
  );

  const storyItems = useMemo(() => {
    const items = [];
    const myMedia = getMediaList(myLatest);
    if (myLatest && myMedia.length) {
      items.push({
        ...myLatest,
        images: myMedia,
        isMine: true,
        pending: myLatest.status !== 'approved'
      });
    }

    const others = normalizedTravelogues
      .filter((t) => t.images.length > 0)
      .filter((t) => t._id !== myLatest?._id);

    return [...items, ...others];
  }, [myLatest, normalizedTravelogues]);

  const myStoryIndex = useMemo(() => storyItems.findIndex((item) => item.isMine), [storyItems]);
  const myLatestMedia = useMemo(() => getMediaList(myLatest), [myLatest]);

  const filteredTravelogues = useMemo(() => {
    if (feedFilter === 'mine') {
      return normalizedTravelogues.filter((item) => getOwnerId(item) === userId);
    }

    if (feedFilter === 'photos') {
      return normalizedTravelogues.filter((item) => item.images.some((path) => !isVideoFile(path)));
    }

    if (feedFilter === 'videos') {
      return normalizedTravelogues.filter((item) => item.images.some((path) => isVideoFile(path)));
    }

    return normalizedTravelogues;
  }, [normalizedTravelogues, feedFilter, userId]);

  const visibleTravelogues = useMemo(
    () => filteredTravelogues.slice(0, visibleCount),
    [filteredTravelogues, visibleCount]
  );
  const hasMore = visibleCount < filteredTravelogues.length;

  const activeStory = storyItems[activeStoryIndex] || null;
  const activeMediaList = getMediaList(activeStory);
  const activeMediaPath = activeMediaList[activeMediaIndex] || '';
  const activeMediaUrl = buildImageUrl(activeMediaPath);
  const activeMediaIsVideo = isVideoFile(activeMediaPath);

  useEffect(() => {
    if (storyItems.length === 0) {
      setStoryViewerOpen(false);
      setActiveStoryIndex(0);
      setActiveMediaIndex(0);
      return;
    }

    if (activeStoryIndex >= storyItems.length) {
      setActiveStoryIndex(0);
      setActiveMediaIndex(0);
    }
  }, [storyItems.length, activeStoryIndex]);

  useEffect(() => {
    if (!storyViewerOpen || !activeStory) return undefined;
    const timer = setTimeout(() => {
      handleNextMedia();
    }, STORY_DURATION_MS);
    return () => clearTimeout(timer);
  }, [storyViewerOpen, activeStoryIndex, activeMediaIndex]);

  const openStory = (index) => {
    if (index < 0 || index >= storyItems.length) return;
    setActiveStoryIndex(index);
    setActiveMediaIndex(0);
    setStoryViewerOpen(true);
  };

  const handleNextMedia = () => {
    if (!activeStory) return;
    const mediaCount = getMediaList(activeStory).length;

    if (activeMediaIndex < mediaCount - 1) {
      setActiveMediaIndex((prev) => prev + 1);
      return;
    }

    if (activeStoryIndex < storyItems.length - 1) {
      setActiveStoryIndex((prev) => prev + 1);
      setActiveMediaIndex(0);
      return;
    }

    setStoryViewerOpen(false);
  };

  const handlePrevMedia = () => {
    if (!activeStory) return;

    if (activeMediaIndex > 0) {
      setActiveMediaIndex((prev) => prev - 1);
      return;
    }

    if (activeStoryIndex > 0) {
      const prevStoryIndex = activeStoryIndex - 1;
      const prevStory = storyItems[prevStoryIndex];
      setActiveStoryIndex(prevStoryIndex);
      setActiveMediaIndex(Math.max(getMediaList(prevStory).length - 1, 0));
    }
  };

  const handleMediaChange = (event) => {
    const files = Array.from(event.target.files || []);
    setStoryMedia((prev) => [...prev, ...files]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    const validFiles = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/'));
    setStoryMedia((prev) => [...prev, ...validFiles]);
  };

  const handleRemoveMedia = (index) => {
    setStoryMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitStory = async () => {
    if (!storyForm.description.trim()) {
      setSubmitError('Please add a caption for your story.');
      return;
    }

    if (storyMedia.length === 0) {
      setSubmitError('Please add at least one photo or video.');
      return;
    }

    setSubmitLoading(true);
    setSubmitError('');

    try {
      const submitData = new FormData();
      const storyTitle = storyForm.title || `Story from ${storyForm.destination || 'my trip'}`;

      submitData.append('title', storyTitle);
      submitData.append('description', storyForm.description);

      if (storyForm.destination) {
        submitData.append('destination', storyForm.destination);
        submitData.append('location', storyForm.destination);
      }

      submitData.append('tags', 'story');
      submitData.append('difficulty', 'easy');

      storyMedia.forEach((file) => {
        submitData.append('media', file);
      });

      await API.post('/travelogue/create', submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setComposerOpen(false);
      setStoryForm({ title: '', description: '', destination: '' });
      setStoryMedia([]);
      setSubmitSuccess('Story submitted for review. It will appear once approved.');
      fetchStories();
      fetchMyLatest();
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Failed to submit story.');
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleViewDetails = (travelogueId) => {
    const source = [...normalizedTravelogues, ...(myLatest ? [{ ...myLatest, images: getMediaList(myLatest) }] : [])];
    const match = source.find((item) => item._id === travelogueId) || null;
    setSelectedTravelogue(match);
    setSelectedTravelogueId(travelogueId);
    setDetailOpen(true);
  };

  return (
    <Box sx={{ width: '100%', pb: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 1.5, sm: 2, md: 2.5 } }}>
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <Paper
          elevation={0}
          sx={{
            borderRadius: '18px',
            p: { xs: 2, sm: 2.4 },
            mb: 2.2,
            border: '1px solid rgba(148,163,184,0.16)',
            background:
              'linear-gradient(145deg, rgba(255,255,255,1) 0%, rgba(248,250,252,1) 65%, rgba(240,253,250,0.85) 100%)'
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1.8}
            alignItems={{ xs: 'flex-start', md: 'center' }}
            justifyContent="space-between"
          >
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.3px', fontFamily: '"Sora", sans-serif' }}>
                Stories & Travel Feed
              </Typography>
              <Typography variant="body2" color="#64748B">
                Fast, familiar story posting with a cleaner feed that is easy to scan.
              </Typography>
            </Box>

            <Stack direction="row" spacing={1.2} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
              <Chip
                label={`${storyTotalCount || travelogues.length} live`}
                sx={{
                  bgcolor: 'rgba(79,138,139,0.08)',
                  color: '#0F766E',
                  fontWeight: 700,
                  border: '1px solid rgba(15,118,110,0.2)'
                }}
              />
              <Button
                variant="outlined"
                onClick={() => window.dispatchEvent(new CustomEvent('travelogueSubTab', { detail: { tab: 'create' } }))}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '12px',
                  borderColor: 'rgba(79,138,139,0.4)',
                  color: '#0F766E'
                }}
              >
                Write Travelogue
              </Button>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setComposerOpen(true)}
                sx={{
                  textTransform: 'none',
                  fontWeight: 700,
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #0F766E 0%, #1D9A92 100%)',
                  boxShadow: '0 8px 22px rgba(15,118,110,0.25)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #0d6d66 0%, #238f88 100%)'
                  }
                }}
              >
                Share Story
              </Button>
            </Stack>
          </Stack>
        </Paper>

        <Grid container spacing={2.2} alignItems="flex-start">
          <Grid item xs={12} lg={4}>
            <Paper
              elevation={0}
              sx={{
                borderRadius: '18px',
                p: 2.2,
                border: '1px solid rgba(148,163,184,0.16)',
                position: { lg: 'sticky' },
                top: { lg: 92 }
              }}
            >
              <Stack spacing={1.5}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      borderRadius: '10px',
                      bgcolor: 'rgba(15,118,110,0.1)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <AutoStoriesIcon sx={{ color: '#0F766E', fontSize: 20 }} />
                  </Box>
                  <Box>
                    <Typography fontWeight={800} color="#0F172A" sx={{ fontFamily: '"Sora", sans-serif' }}>
                      Quick Story Share
                    </Typography>
                    <Typography variant="caption" color="#64748B">
                      Like Instagram: caption + location + media.
                    </Typography>
                  </Box>
                </Stack>

                <Stack spacing={0.8}>
                  <Typography variant="body2" color="#334155">
                    1. Pick photos/videos
                  </Typography>
                  <Typography variant="body2" color="#334155">
                    2. Add a short caption
                  </Typography>
                  <Typography variant="body2" color="#334155">
                    3. Share to the community feed
                  </Typography>
                </Stack>

                {myLatest?.status && (
                  <Chip
                    label={`Your latest story: ${myLatest.status}`}
                    sx={{
                      alignSelf: 'flex-start',
                      fontWeight: 700,
                      textTransform: 'capitalize',
                      bgcolor: myLatest.status === 'approved' ? 'rgba(16,185,129,0.12)' : 'rgba(245,158,11,0.15)',
                      color: myLatest.status === 'approved' ? '#047857' : '#B45309'
                    }}
                  />
                )}

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => setComposerOpen(true)}
                  sx={{
                    mt: 0.6,
                    borderRadius: '12px',
                    py: 1.1,
                    textTransform: 'none',
                    fontWeight: 700,
                    background: 'linear-gradient(135deg, #0F766E 0%, #1D9A92 100%)'
                  }}
                >
                  Create New Story
                </Button>

                <Button
                  variant="text"
                  onClick={() => feedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                  sx={{ textTransform: 'none', fontWeight: 700, color: '#0F766E' }}
                >
                  Go to feed
                </Button>
              </Stack>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={8}>
            <Stack spacing={2.2}>
              <Paper
                elevation={0}
                sx={{
                  borderRadius: '18px',
                  p: 2,
                  border: '1px solid rgba(148,163,184,0.16)'
                }}
              >
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.8}>
                  <Box>
                    <Typography fontWeight={800} color="#0F172A" sx={{ fontFamily: '"Sora", sans-serif' }}>
                      Story Tray
                    </Typography>
                    <Typography variant="caption" color="#64748B">
                      Tap a story circle to open full-screen.
                    </Typography>
                  </Box>
                  <Button
                    size="small"
                    onClick={() => feedSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                    sx={{ textTransform: 'none', fontWeight: 700, color: '#0F766E' }}
                  >
                    Open Feed
                  </Button>
                </Stack>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
                    <CircularProgress sx={{ color: '#0F766E' }} />
                  </Box>
                ) : (
                  <Stack
                    direction="row"
                    spacing={2}
                    sx={{
                      overflowX: 'auto',
                      pb: 1,
                      '&::-webkit-scrollbar': { height: '5px' },
                      '&::-webkit-scrollbar-thumb': {
                        bgcolor: 'rgba(148,163,184,0.35)',
                        borderRadius: '999px'
                      }
                    }}
                  >
                    <Box
                      onClick={() => {
                        if (myStoryIndex >= 0) {
                          openStory(myStoryIndex);
                        } else {
                          setComposerOpen(true);
                        }
                      }}
                      sx={{
                        minWidth: 82,
                        textAlign: 'center',
                        cursor: 'pointer'
                      }}
                    >
                      <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} style={{ position: 'relative' }}>
                        <Box
                          sx={{
                            width: 76,
                            height: 76,
                            borderRadius: '50%',
                            p: '3px',
                            mb: 0.8,
                            background:
                              myStoryIndex >= 0
                                ? 'linear-gradient(45deg, #0EA5A4 0%, #14B8A6 100%)'
                                : 'linear-gradient(45deg, rgba(15,118,110,0.35), rgba(30,41,59,0.35))'
                          }}
                        >
                          <Box
                            sx={{
                              width: '100%',
                              height: '100%',
                              borderRadius: '50%',
                              overflow: 'hidden',
                              border: '2px solid #fff',
                              bgcolor: '#E2E8F0',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {myLatestMedia[0] ? (
                              <Box
                                component={isVideoFile(myLatestMedia[0]) ? 'video' : 'img'}
                                src={buildImageUrl(myLatestMedia[0])}
                                muted
                                playsInline
                                sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              <AddIcon sx={{ color: '#0F766E' }} />
                            )}
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.stopPropagation();
                            setComposerOpen(true);
                          }}
                          sx={{
                            position: 'absolute',
                            right: -2,
                            bottom: 6,
                            width: 22,
                            height: 22,
                            bgcolor: '#0F766E',
                            color: '#fff',
                            border: '2px solid #fff',
                            '&:hover': { bgcolor: '#1D9A92' }
                          }}
                        >
                          <AddIcon sx={{ fontSize: 13 }} />
                        </IconButton>
                      </motion.div>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
                        My Story
                      </Typography>
                    </Box>

                    {storyItems.map((story, index) => {
                      if (story.isMine) return null;

                      const storyMediaPath = story.images?.[0] || '';
                      const storyMediaUrl = buildImageUrl(storyMediaPath);
                      const storyIsVideo = isVideoFile(storyMediaPath);

                      return (
                        <Box
                          key={story._id}
                          onClick={() => openStory(index)}
                          sx={{
                            minWidth: 82,
                            textAlign: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
                            <Box
                              sx={{
                                width: 76,
                                height: 76,
                                borderRadius: '50%',
                                p: '3px',
                                background: 'linear-gradient(45deg, #FDBA74 0%, #0EA5A4 100%)',
                                mb: 0.8,
                                boxShadow: '0 6px 16px rgba(15,23,42,0.12)'
                              }}
                            >
                              <Tooltip title={story.title || 'Story'} placement="top" arrow>
                                <Box
                                  sx={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    border: '2px solid #fff'
                                  }}
                                >
                                  <Box
                                    component={storyIsVideo ? 'video' : 'img'}
                                    src={storyMediaUrl}
                                    muted
                                    playsInline
                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                  />
                                </Box>
                              </Tooltip>
                            </Box>
                          </motion.div>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: '#334155',
                              display: 'block',
                              maxWidth: 80,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {getStoryDisplayName(story)}
                          </Typography>
                          {storyIsVideo && (
                            <Typography variant="caption" color="#0F766E" sx={{ fontWeight: 700, fontSize: '0.65rem' }}>
                              VIDEO
                            </Typography>
                          )}
                        </Box>
                      );
                    })}
                  </Stack>
                )}
              </Paper>

              <Paper
                ref={feedSectionRef}
                elevation={0}
                sx={{
                  borderRadius: '18px',
                  p: { xs: 2, sm: 2.4 },
                  border: '1px solid rgba(148,163,184,0.16)'
                }}
              >
                <Stack
                  direction={{ xs: 'column', sm: 'row' }}
                  spacing={1.3}
                  alignItems={{ xs: 'flex-start', sm: 'center' }}
                  justifyContent="space-between"
                  mb={2}
                >
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: '-0.3px', fontFamily: '"Sora", sans-serif' }}>
                      Community Feed
                    </Typography>
                    <Typography variant="body2" color="#64748B">
                      Curated preview to keep browsing quick. Open more only when needed.
                    </Typography>
                  </Box>
                  <Chip
                    icon={<FilterListIcon sx={{ fontSize: '0.95rem !important' }} />}
                    label={`${filteredTravelogues.length} results`}
                    sx={{
                      fontWeight: 700,
                      bgcolor: 'rgba(15,118,110,0.09)',
                      color: '#0F766E',
                      border: '1px solid rgba(15,118,110,0.2)'
                    }}
                  />
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap gap={1} sx={{ mb: 2.2 }}>
                  {FEED_FILTERS.map((filter) => (
                    <Chip
                      key={filter.value}
                      label={filter.label}
                      clickable
                      onClick={() => setFeedFilter(filter.value)}
                      sx={{
                        fontWeight: 700,
                        borderRadius: '10px',
                        bgcolor: feedFilter === filter.value ? '#0F766E' : 'rgba(148,163,184,0.12)',
                        color: feedFilter === filter.value ? '#fff' : '#334155'
                      }}
                    />
                  ))}
                </Stack>

                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress sx={{ color: '#0F766E' }} />
                  </Box>
                ) : visibleTravelogues.length === 0 ? (
                  <Box
                    sx={{
                      textAlign: 'center',
                      py: 6,
                      borderRadius: '14px',
                      bgcolor: 'rgba(148,163,184,0.05)',
                      border: '1.5px dashed rgba(148,163,184,0.3)'
                    }}
                  >
                    <Typography fontWeight={700} color="#475569" mb={0.8}>
                      No stories in this filter yet.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => setComposerOpen(true)}
                      sx={{
                        textTransform: 'none',
                        fontWeight: 700,
                        borderRadius: '10px',
                        bgcolor: '#0F766E',
                        '&:hover': { bgcolor: '#1D9A92' }
                      }}
                    >
                      Share First Story
                    </Button>
                  </Box>
                ) : (
                  <>
                    <Grid container spacing={2}>
                      {visibleTravelogues.map((travelogue) => (
                        <Grid item xs={12} md={6} key={travelogue._id}>
                          <TravelogueCard travelogue={travelogue} onViewDetails={handleViewDetails} />
                        </Grid>
                      ))}
                    </Grid>

                    {hasMore && (
                      <Box sx={{ textAlign: 'center', mt: 2.5 }}>
                        <Button
                          variant="outlined"
                          onClick={() => setVisibleCount((prev) => prev + baseVisibleCount)}
                          sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 700,
                            borderColor: 'rgba(15,118,110,0.45)',
                            color: '#0F766E'
                          }}
                        >
                          Show More Stories
                        </Button>
                      </Box>
                    )}
                  </>
                )}
              </Paper>
            </Stack>
          </Grid>
        </Grid>
      </Box>

      <Dialog
        open={storyViewerOpen}
        onClose={() => setStoryViewerOpen(false)}
        fullWidth
        maxWidth="xs"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            overflow: 'hidden',
            bgcolor: '#0B1120',
            boxShadow: '0 24px 70px rgba(0,0,0,0.7)',
            border: '1px solid rgba(255,255,255,0.08)'
          }
        }}
      >
        {activeStory && (
          <DialogContent sx={{ p: 0, position: 'relative', bgcolor: '#090d16', display: 'flex', flexDirection: 'column', height: { xs: 560, sm: 660 } }}>
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                backgroundImage: `url(${activeMediaUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                filter: 'blur(30px) brightness(0.25)',
                opacity: 0.8,
                transform: 'scale(1.1)',
                pointerEvents: 'none',
                zIndex: 1
              }}
            />

            <Box sx={{ position: 'absolute', top: 14, left: 14, right: 14, zIndex: 10 }}>
              <Stack direction="row" spacing={0.8} alignItems="center" mb={1.6}>
                {activeMediaList.map((_, idx) => (
                  <Box
                    key={idx}
                    sx={{
                      flex: 1,
                      height: 3,
                      borderRadius: 999,
                      bgcolor: 'rgba(255,255,255,0.25)',
                      overflow: 'hidden'
                    }}
                  >
                    <Box
                      sx={{
                        width: idx < activeMediaIndex ? '100%' : idx === activeMediaIndex ? '100%' : '0%',
                        height: '100%',
                        bgcolor: '#FACC15',
                        transition: idx === activeMediaIndex ? `width ${STORY_DURATION_MS}ms linear` : 'none'
                      }}
                    />
                  </Box>
                ))}
              </Stack>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Stack direction="row" spacing={1.2} alignItems="center">
                  <Avatar
                    src={activeStory.userId?.avatar ? buildImageUrl(activeStory.userId.avatar) : '/default-avatar.png'}
                    sx={{ width: 36, height: 36, border: '2px solid rgba(255,255,255,0.75)' }}
                  />
                  <Box>
                    <Typography fontWeight={700} color="#fff" sx={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)', fontSize: '0.88rem' }}>
                      {activeStory.userId?.name || 'Traveler'}
                    </Typography>
                    {activeStory.destination && (
                      <Stack direction="row" spacing={0.3} alignItems="center">
                        <LocationOnIcon sx={{ color: '#FACC15', fontSize: 13 }} />
                        <Typography variant="caption" color="rgba(255,255,255,0.9)" sx={{ fontWeight: 600 }}>
                          {activeStory.destination}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                </Stack>
                <IconButton
                  onClick={() => setStoryViewerOpen(false)}
                  sx={{
                    color: '#fff',
                    bgcolor: 'rgba(255,255,255,0.12)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    width: 34,
                    height: 34,
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.22)' }
                  }}
                >
                  <CloseIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Stack>
            </Box>

            <Box
              sx={{
                position: 'relative',
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                zIndex: 2,
                mt: 8,
                mb: 1,
                px: 2
              }}
            >
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  boxShadow: '0 12px 30px rgba(0,0,0,0.45)',
                  bgcolor: '#020617',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}
              >
                {activeMediaIsVideo ? (
                  <video
                    key={`story-video-${activeMediaIndex}`}
                    src={activeMediaUrl}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    key={`story-image-${activeMediaIndex}`}
                    src={activeMediaUrl}
                    alt={activeStory.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </Box>

              <IconButton
                onClick={handlePrevMedia}
                sx={{
                  position: 'absolute',
                  left: 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.16)',
                  color: '#fff',
                  width: 34,
                  height: 34,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }
                }}
              >
                <ChevronLeftIcon />
              </IconButton>
              <IconButton
                onClick={handleNextMedia}
                sx={{
                  position: 'absolute',
                  right: 20,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255,255,255,0.16)',
                  color: '#fff',
                  width: 34,
                  height: 34,
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.28)' }
                }}
              >
                <ChevronRightIcon />
              </IconButton>
            </Box>

            <Box sx={{ p: 2.4, pt: 1.5, pb: 3.2, zIndex: 2, position: 'relative', background: 'linear-gradient(to top, rgba(9,13,22,1) 0%, rgba(9,13,22,0.86) 65%, rgba(9,13,22,0) 100%)' }}>
              <Typography color="#fff" fontWeight={800} variant="h6" mb={0.4} sx={{ letterSpacing: '-0.2px', fontFamily: '"Sora", sans-serif' }}>
                {activeStory.title}
              </Typography>
              <Typography color="rgba(255,255,255,0.86)" variant="body2" sx={{ lineHeight: 1.45, mb: 2.1 }}>
                {activeStory.description}
              </Typography>

              <Button
                variant="contained"
                fullWidth
                onClick={() => {
                  setStoryViewerOpen(false);
                  setSelectedTravelogue(activeStory);
                  setSelectedTravelogueId(activeStory?._id || null);
                  setDetailOpen(true);
                }}
                sx={{
                  borderRadius: '11px',
                  py: 1.1,
                  fontWeight: 700,
                  textTransform: 'none',
                  background: 'linear-gradient(135deg, #0F766E 0%, #1D9A92 100%)',
                  boxShadow: '0 8px 20px rgba(15,118,110,0.25)'
                }}
              >
                View Full Story
              </Button>
            </Box>
          </DialogContent>
        )}
      </Dialog>

      <Dialog
        open={composerOpen}
        onClose={() => setComposerOpen(false)}
        fullWidth
        maxWidth="sm"
        PaperProps={{
          sx: {
            borderRadius: '20px',
            boxShadow: '0 20px 50px rgba(15,23,42,0.15)',
            border: '1px solid rgba(148,163,184,0.15)',
            overflow: 'hidden'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0F172A', fontFamily: '"Sora", sans-serif', pt: 2.6, px: 2.6, pb: 1 }}>
          Create New Story
        </DialogTitle>
        <DialogContent sx={{ px: 2.6, py: 1 }}>
          {submitError && (
            <Alert severity="error" onClose={() => setSubmitError('')} sx={{ mb: 2, borderRadius: '10px' }}>
              {submitError}
            </Alert>
          )}

          <Stack spacing={2.1} sx={{ mt: 0.8 }}>
            <TextField
              label="Story title"
              placeholder="e.g. Sunset at Goa Beach"
              value={storyForm.title}
              onChange={(e) => setStoryForm((prev) => ({ ...prev, title: e.target.value }))}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&.Mui-focused fieldset': { borderColor: '#0F766E' }
                }
              }}
            />

            <TextField
              label="Caption"
              placeholder="Tell everyone what made this memory special."
              value={storyForm.description}
              onChange={(e) => setStoryForm((prev) => ({ ...prev, description: e.target.value }))}
              fullWidth
              multiline
              rows={3}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&.Mui-focused fieldset': { borderColor: '#0F766E' }
                }
              }}
            />

            <TextField
              label="Location"
              placeholder="e.g. Goa, India"
              value={storyForm.destination}
              onChange={(e) => setStoryForm((prev) => ({ ...prev, destination: e.target.value }))}
              fullWidth
              InputProps={{
                startAdornment: <LocationOnIcon sx={{ mr: 1, color: '#0F766E' }} />
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '12px',
                  '&.Mui-focused fieldset': { borderColor: '#0F766E' }
                }
              }}
            />

            <Box
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              sx={{
                border: isDragOver ? '2px dashed #0F766E' : '2px dashed rgba(148,163,184,0.4)',
                borderRadius: '14px',
                p: 3,
                textAlign: 'center',
                bgcolor: isDragOver ? 'rgba(15,118,110,0.05)' : 'rgba(148,163,184,0.03)',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              <input
                type="file"
                accept="image/*,video/*"
                hidden
                multiple
                ref={fileInputRef}
                onChange={handleMediaChange}
              />
              <CloudUploadIcon sx={{ color: isDragOver ? '#0F766E' : '#94A3B8', fontSize: 40, mb: 1 }} />
              <Typography fontWeight={700} color="#334155" sx={{ fontSize: '0.92rem' }} mb={0.4}>
                Drag & drop photos/videos
              </Typography>
              <Typography variant="caption" color="#64748B" fontWeight={500}>
                JPG, PNG, MP4 supported
              </Typography>
            </Box>

            {storyMedia.length > 0 && (
              <Stack spacing={1.2}>
                <Typography variant="caption" color="#475569" fontWeight={700}>
                  SELECTED FILES ({storyMedia.length})
                </Typography>
                <Stack direction="row" spacing={1.3} flexWrap="wrap" useFlexGap gap={1.3}>
                  {storyMedia.map((file, idx) => {
                    const isVideo = file.type.startsWith('video/');
                    return (
                      <Box
                        key={`${file.name}-${idx}`}
                        sx={{
                          position: 'relative',
                          width: 74,
                          height: 74,
                          borderRadius: '10px',
                          overflow: 'hidden',
                          border: '1px solid rgba(148,163,184,0.3)',
                          bgcolor: '#0f172a'
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMedia(idx);
                          }}
                          sx={{
                            position: 'absolute',
                            top: 2,
                            right: 2,
                            bgcolor: 'rgba(239,68,68,0.9)',
                            color: '#fff',
                            width: 18,
                            height: 18,
                            p: 0,
                            zIndex: 5,
                            '&:hover': { bgcolor: 'rgba(220,38,38,1)' }
                          }}
                        >
                          <CloseIcon sx={{ fontSize: 12 }} />
                        </IconButton>
                        {isVideo ? (
                          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <PlayArrowIcon sx={{ color: '#fff', fontSize: 24 }} />
                          </Box>
                        ) : (
                          <Box
                            component="img"
                            src={URL.createObjectURL(file)}
                            alt="preview"
                            sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        )}
                      </Box>
                    );
                  })}
                </Stack>
              </Stack>
            )}
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2.6, pt: 1 }}>
          <Button
            onClick={() => setComposerOpen(false)}
            variant="outlined"
            sx={{
              borderRadius: '10px',
              borderColor: 'rgba(148,163,184,0.35)',
              color: '#64748B',
              px: 2.5,
              py: 1,
              fontWeight: 700,
              textTransform: 'none'
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitStory}
            disabled={submitLoading}
            sx={{
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #0F766E 0%, #1D9A92 100%)',
              px: 3.4,
              py: 1.05,
              fontWeight: 700,
              textTransform: 'none'
            }}
          >
            {submitLoading ? 'Sharing...' : 'Share Story'}
          </Button>
        </DialogActions>
      </Dialog>

      {detailOpen && (selectedTravelogue || selectedTravelogueId) && (
        <TravelogueDetailView
          travelogue={selectedTravelogue}
          travelogueId={selectedTravelogueId}
          open={detailOpen}
          onClose={() => {
            setDetailOpen(false);
            setSelectedTravelogueId(null);
            setSelectedTravelogue(null);
          }}
        />
      )}

      <Snackbar
        open={!!submitSuccess}
        autoHideDuration={5000}
        onClose={() => setSubmitSuccess('')}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSubmitSuccess('')} sx={{ width: '100%', borderRadius: '10px' }}>
          {submitSuccess}
        </Alert>
      </Snackbar>
    </Box>
  );
}
