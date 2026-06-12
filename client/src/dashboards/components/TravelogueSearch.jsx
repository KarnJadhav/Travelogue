import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Grid, Card, CardContent, Stack, Chip, CircularProgress, Alert, TextField, MenuItem, InputAdornment, IconButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import SortIcon from '@mui/icons-material/Sort';
import TuneIcon from '@mui/icons-material/Tune';
import { motion } from 'framer-motion';
import API from '../../api';
import TravelogueDetailView from './TravelogueDetailView';
import { buildImageUrl, isVideoFile } from '../../utils/imageHelper';

const difficulties = ['Easy', 'Moderate', 'Challenging'];
const seasons = ['Spring', 'Summer', 'Autumn', 'Winter'];
const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'rated', label: 'Highly Rated' },
  { value: 'liked', label: 'Most Liked' }
];

export default function TravelogueSearch() {
  const [travelogues, setTravelogues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [filterSeason, setFilterSeason] = useState('');
  const [filterDestination, setFilterDestination] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState('');
  const [selectedTravelogue, setSelectedTravelogue] = useState(null);
  const [showDetailView, setShowDetailView] = useState(false);

  useEffect(() => {
    fetchTravelogues();
  }, [searchQuery, filterDifficulty, filterSeason, filterDestination, sortBy, page]);

  const fetchTravelogues = async () => {
    try {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page,
        limit: 12,
        ...(searchQuery && { search: searchQuery }),
        ...(filterDifficulty && { difficulty: filterDifficulty }),
        ...(filterSeason && { season: filterSeason }),
        ...(filterDestination && { destination: filterDestination }),
        ...(sortBy && { sortBy })
      });

      const response = await API.get(`/travelogue/all?${params}`);
      setTravelogues(response.data.travelogues || []);
      setTotalPages(response.data.pagination?.pages || 1);
    } catch (err) {
      setError('Failed to fetch travelogues');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setFilterDifficulty('');
    setFilterSeason('');
    setFilterDestination('');
    setSortBy('newest');
    setPage(1);
  };

  const handleViewDetails = (travelogue) => {
    setSelectedTravelogue(travelogue);
    setShowDetailView(true);
  };

  return (
    <Box sx={{ width: '100%', minHeight: '100vh', bgcolor: '#F8FAFB', pb: 4 }}>
      <Box sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 2.5, md: 3 } }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            borderRadius: '24px',
            overflow: 'hidden',
            boxShadow: '0 10px 40px rgba(79,138,139,0.12)',
            bgcolor: '#ffffff',
            mt: 1.5,
            mb: 3,
            p: { xs: 2, sm: 3, md: 4 }
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} justifyContent="space-between" mb={3}>
            <Box>
              <Typography
                variant="h4"
                fontWeight={800}
                color="#1a1a1a"
                mb={0.5}
                sx={{ letterSpacing: '0.5px', background: 'linear-gradient(135deg, #1a1a1a 0%, #4F8A8B 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
              >
                Discover Travelogues
              </Typography>
              <Typography variant="body2" color="#6B7280" fontWeight={500}>
                Explore amazing travel stories from around the world
              </Typography>
            </Box>
          </Stack>

        {/* Premium Filter Section */}
        <Box
          component={motion.div}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          sx={{
            background: 'linear-gradient(135deg, rgba(79,138,139,0.08) 0%, rgba(249,237,105,0.03) 100%)',
            borderRadius: '20px',
            p: { xs: 2.5, sm: 3.5, md: 4 },
            border: '1px solid rgba(79,138,139,0.15)',
            backdropFilter: 'blur(10px)',
            mb: 4
          }}
        >
          {/* Search Bar */}
          <TextField
            fullWidth
            placeholder="Search travelogues by title, destination, tags..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: '#4F8A8B', fontSize: 24 }} />
                </InputAdornment>
              )
            }}
            sx={{
              mb: 3.5,
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                borderColor: 'rgba(79,138,139,0.2)',
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(10px)',
                fontWeight: 500,
                fontSize: '1rem',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': { 
                  borderColor: '#4F8A8B',
                  background: 'rgba(255,255,255,0.9)',
                  boxShadow: '0 8px 24px rgba(79,138,139,0.1)'
                },
                '&.Mui-focused': { 
                  borderColor: '#4F8A8B',
                  background: '#ffffff',
                  boxShadow: '0 12px 32px rgba(79,138,139,0.15)'
                }
              },
              '& .MuiOutlinedInput-input::placeholder': {
                color: '#9CA3AF',
                opacity: 1
              }
            }}
          />

          {/* Filters Grid */}
          <Grid container spacing={2} alignItems="flex-end">
            {/* Destination Filter */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center" mb={1}>
                  <LocationOnIcon sx={{ fontSize: 18, color: '#4F8A8B', fontWeight: 700 }} />
                  <Typography variant="subtitle2" fontWeight={700} color="#1a1a1a" fontSize="0.85rem">
                    Location
                  </Typography>
                </Stack>
                <TextField
                  select
                  fullWidth
                  value={filterDestination}
                  onChange={(e) => {
                    setFilterDestination(e.target.value);
                    setPage(1);
                  }}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      borderColor: 'rgba(79,138,139,0.2)',
                      background: 'rgba(255,255,255,0.6)',
                      fontWeight: 500,
                      transition: 'all 0.3s ease',
                      '&:hover': { 
                        borderColor: '#4F8A8B',
                        background: 'rgba(255,255,255,0.8)',
                        boxShadow: '0 4px 12px rgba(79,138,139,0.08)'
                      },
                      '&.Mui-focused': { 
                        borderColor: '#4F8A8B',
                        background: '#ffffff',
                        boxShadow: '0 8px 20px rgba(79,138,139,0.12)'
                      }
                    }
                  }}
                >
                  <MenuItem value="">All Locations</MenuItem>
                  <MenuItem value="Asia">🌏 Asia</MenuItem>
                  <MenuItem value="Europe">🇪🇺 Europe</MenuItem>
                  <MenuItem value="Africa">🌍 Africa</MenuItem>
                  <MenuItem value="Americas">🇺🇸 Americas</MenuItem>
                  <MenuItem value="Oceania">🏝️ Oceania</MenuItem>
                </TextField>
              </Box>
            </Grid>

            {/* Difficulty Filter */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center" mb={1}>
                  <TuneIcon sx={{ fontSize: 18, color: '#4F8A8B' }} />
                  <Typography variant="subtitle2" fontWeight={700} color="#1a1a1a" fontSize="0.85rem">
                    Difficulty
                  </Typography>
                </Stack>
                <TextField
                  select
                  fullWidth
                  value={filterDifficulty}
                  onChange={(e) => {
                    setFilterDifficulty(e.target.value);
                    setPage(1);
                  }}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      borderColor: 'rgba(79,138,139,0.2)',
                      background: 'rgba(255,255,255,0.6)',
                      fontWeight: 500,
                      transition: 'all 0.3s ease',
                      '&:hover': { 
                        borderColor: '#4F8A8B',
                        background: 'rgba(255,255,255,0.8)',
                        boxShadow: '0 4px 12px rgba(79,138,139,0.08)'
                      },
                      '&.Mui-focused': { 
                        borderColor: '#4F8A8B',
                        background: '#ffffff',
                        boxShadow: '0 8px 20px rgba(79,138,139,0.12)'
                      }
                    }
                  }}
                >
                  <MenuItem value="">All Levels</MenuItem>
                  <MenuItem value="Easy">⭐ Easy</MenuItem>
                  <MenuItem value="Moderate">⭐⭐ Moderate</MenuItem>
                  <MenuItem value="Challenging">⭐⭐⭐ Challenging</MenuItem>
                </TextField>
              </Box>
            </Grid>

            {/* Season Filter */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center" mb={1}>
                  <CalendarTodayIcon sx={{ fontSize: 18, color: '#4F8A8B' }} />
                  <Typography variant="subtitle2" fontWeight={700} color="#1a1a1a" fontSize="0.85rem">
                    Season
                  </Typography>
                </Stack>
                <TextField
                  select
                  fullWidth
                  value={filterSeason}
                  onChange={(e) => {
                    setFilterSeason(e.target.value);
                    setPage(1);
                  }}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      borderColor: 'rgba(79,138,139,0.2)',
                      background: 'rgba(255,255,255,0.6)',
                      fontWeight: 500,
                      transition: 'all 0.3s ease',
                      '&:hover': { 
                        borderColor: '#4F8A8B',
                        background: 'rgba(255,255,255,0.8)',
                        boxShadow: '0 4px 12px rgba(79,138,139,0.08)'
                      },
                      '&.Mui-focused': { 
                        borderColor: '#4F8A8B',
                        background: '#ffffff',
                        boxShadow: '0 8px 20px rgba(79,138,139,0.12)'
                      }
                    }
                  }}
                >
                  <MenuItem value="">All Seasons</MenuItem>
                  <MenuItem value="Spring">🌸 Spring</MenuItem>
                  <MenuItem value="Summer">☀️ Summer</MenuItem>
                  <MenuItem value="Autumn">🍂 Autumn</MenuItem>
                  <MenuItem value="Winter">❄️ Winter</MenuItem>
                </TextField>
              </Box>
            </Grid>

            {/* Sort By Filter */}
            <Grid item xs={12} sm={6} md={2.4}>
              <Box>
                <Stack direction="row" spacing={0.5} alignItems="center" mb={1}>
                  <SortIcon sx={{ fontSize: 18, color: '#4F8A8B' }} />
                  <Typography variant="subtitle2" fontWeight={700} color="#1a1a1a" fontSize="0.85rem">
                    Sort By
                  </Typography>
                </Stack>
                <TextField
                  select
                  fullWidth
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value);
                    setPage(1);
                  }}
                  variant="outlined"
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      borderColor: 'rgba(79,138,139,0.2)',
                      background: 'rgba(255,255,255,0.6)',
                      fontWeight: 500,
                      transition: 'all 0.3s ease',
                      '&:hover': { 
                        borderColor: '#4F8A8B',
                        background: 'rgba(255,255,255,0.8)',
                        boxShadow: '0 4px 12px rgba(79,138,139,0.08)'
                      },
                      '&.Mui-focused': { 
                        borderColor: '#4F8A8B',
                        background: '#ffffff',
                        boxShadow: '0 8px 20px rgba(79,138,139,0.12)'
                      }
                    }
                  }}
                >
                  <MenuItem value="newest">✨ Newest First</MenuItem>
                  <MenuItem value="popular">🔥 Most Popular</MenuItem>
                  <MenuItem value="rated">⭐ Highly Rated</MenuItem>
                  <MenuItem value="liked">❤️ Most Liked</MenuItem>
                </TextField>
              </Box>
            </Grid>

            {/* Clear Filters Button */}
            <Grid item xs={12} md={0.8}>
              {(searchQuery || filterDifficulty || filterSeason || filterDestination || sortBy !== 'newest') && (
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    fullWidth
                    size="small"
                    onClick={handleReset}
                    sx={{
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      color: '#ef4444',
                      borderColor: '#fecaca',
                      border: '1.5px solid #fecaca',
                      background: 'rgba(239,68,68,0.05)',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: 'rgba(239,68,68,0.1)',
                        borderColor: '#ef4444',
                        boxShadow: '0 4px 12px rgba(239,68,68,0.15)'
                      }
                    }}
                    variant="outlined"
                  >
                    Reset
                  </Button>
                </motion.div>
              )}
            </Grid>
          </Grid>
        </Box>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {/* Results Count */}
        {!loading && travelogues.length > 0 && (
          <Typography variant="body2" color="#6B7280" fontWeight={600} mb={2.5} sx={{ pl: 1 }}>
            Found {travelogues.length} travel stories
          </Typography>
        )}

        {/* Loading */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : travelogues.length === 0 ? (
          <Card elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '16px', border: '2px dashed rgba(79,138,139,0.2)' }}>
            <TrendingUpIcon sx={{ fontSize: 48, color: '#4F8A8B', mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" color="#6B7280" mb={1}>
              No travelogues found
            </Typography>
            <Typography variant="body2" color="#6B7280">
              Try adjusting your search or filter criteria
            </Typography>
          </Card>
        ) : (
          <>
            {/* Travelogues Grid */}
            <Grid container spacing={2.5} mb={4}>
              {travelogues.map(travelogue => {
                const mediaPath = travelogue.images && travelogue.images[0] ? travelogue.images[0] : '';
                const thumbnailUrl = buildImageUrl(mediaPath);
                const mediaIsVideo = isVideoFile(mediaPath);

                return (
                  <Grid item xs={12} sm={6} md={4} key={travelogue._id}>
                    <Card
                      elevation={0}
                      onClick={() => handleViewDetails(travelogue)}
                      sx={{
                        borderRadius: '16px',
                        overflow: 'hidden',
                        border: '1px solid rgba(79,138,139,0.1)',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        transition: 'all 0.3s ease',
                        cursor: 'pointer',
                        '&:hover': {
                          boxShadow: '0 12px 32px rgba(79,138,139,0.15)',
                          transform: 'translateY(-4px)'
                        }
                      }}
                    >
                      {/* Thumbnail */}
                      <Box
                        sx={{
                          position: 'relative',
                          paddingBottom: '66.67%',
                          overflow: 'hidden',
                          bgcolor: '#f0f0f0'
                        }}
                      >
                        {mediaIsVideo ? (
                          <Box
                            component="video"
                            src={thumbnailUrl}
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
                            src={thumbnailUrl}
                            alt={travelogue.title}
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                            onError={(e) => {
                              e.target.src = '/no-image.png';
                            }}
                          />
                        )}

                        {/* Rating Badge */}
                        {travelogue.rating && (
                          <Chip
                            label={`⭐ ${travelogue.rating.toFixed(1)}`}
                            size="small"
                            sx={{
                              position: 'absolute',
                              top: 12,
                              left: 12,
                              zIndex: 2,
                              bgcolor: '#fff',
                              color: '#F9ED69',
                              fontWeight: 700,
                              fontSize: '0.75rem',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                            }}
                          />
                        )}
                      </Box>

                      {/* Content */}
                      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
                        <Typography
                          variant="h6"
                          fontWeight={700}
                          color="#1a1a1a"
                          mb={1}
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {travelogue.title}
                        </Typography>

                        <Stack direction="row" spacing={1} mb={2} flexWrap="wrap">
                          {travelogue.location && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <LocationOnIcon sx={{ fontSize: 16, color: '#4F8A8B' }} />
                              <Typography variant="caption" color="#6B7280" fontWeight={600}>
                                {travelogue.location}
                              </Typography>
                            </Stack>
                          )}
                          {travelogue.duration && (
                            <Stack direction="row" spacing={0.5} alignItems="center">
                              <CalendarTodayIcon sx={{ fontSize: 16, color: '#4F8A8B' }} />
                              <Typography variant="caption" color="#6B7280" fontWeight={600}>
                                {travelogue.duration}d
                              </Typography>
                            </Stack>
                          )}
                        </Stack>

                        {/* Tags */}
                        {travelogue.tags && travelogue.tags.length > 0 && (
                          <Stack direction="row" spacing={0.5} mb={2} flexWrap="wrap">
                            {travelogue.tags.slice(0, 3).map((tag, idx) => (
                              <Chip
                                key={idx}
                                label={tag}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  bgcolor: 'rgba(79,138,139,0.1)',
                                  color: '#4F8A8B',
                                  fontWeight: 600
                                }}
                              />
                            ))}
                          </Stack>
                        )}

                        <Typography
                          variant="body2"
                          color="#6B7280"
                          sx={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {travelogue.description}
                        </Typography>
                      </CardContent>

                      {/* Footer Stats */}
                      <Box sx={{ px: 2, py: 1.5, bgcolor: 'rgba(79,138,139,0.02)', borderTop: '1px solid rgba(79,138,139,0.1)' }}>
                        <Stack direction="row" spacing={2} justifyContent="space-around">
                          <Stack alignItems="center">
                            <Typography variant="caption" fontWeight={700} color="#4F8A8B">
                              {travelogue.views || 0}
                            </Typography>
                            <Typography variant="caption" color="#6B7280" fontSize="0.7rem">
                              Views
                            </Typography>
                          </Stack>
                          <Stack alignItems="center">
                            <Typography variant="caption" fontWeight={700} color="#ef4444">
                              {travelogue.likes?.length || 0}
                            </Typography>
                            <Typography variant="caption" color="#6B7280" fontSize="0.7rem">
                              Likes
                            </Typography>
                          </Stack>
                          <Stack alignItems="center">
                            <Typography variant="caption" fontWeight={700} color="#F9ED69">
                              {travelogue.comments?.length || 0}
                            </Typography>
                            <Typography variant="caption" color="#6B7280" fontSize="0.7rem">
                              Comments
                            </Typography>
                          </Stack>
                        </Stack>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
                <Button
                  disabled={page === 1}
                  onClick={() => setPage(page - 1)}
                  variant="outlined"
                  sx={{ borderRadius: '10px', borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  Previous
                </Button>
                <Typography sx={{ alignSelf: 'center', fontWeight: 700, color: '#6B7280' }}>
                  Page {page} of {totalPages}
                </Typography>
                <Button
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                  variant="outlined"
                  sx={{ borderRadius: '10px', borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  Next
                </Button>
              </Stack>
            )}
          </>
        )}
      </Box>

      {/* Detail View Dialog */}
      {showDetailView && selectedTravelogue && (
        <TravelogueDetailView
          travelogue={selectedTravelogue}
          open={showDetailView}
          onClose={() => setShowDetailView(false)}
        />
      )}
    </Box>
  );
}
