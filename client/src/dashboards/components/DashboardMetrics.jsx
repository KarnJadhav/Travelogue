// DashboardMetrics.jsx
// Dashboard metrics cards row for Tourist Dashboard with real data from API
import React, { useState, useEffect, useCallback } from 'react';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import PublicIcon from '@mui/icons-material/Public';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { motion } from 'framer-motion';
import api from '../../api';

const metricsConfig = [
  {
    title: 'Upcoming Trips',
    key: 'upcomingTrips',
    icon: <EventAvailableIcon sx={{ color: '#0ea5e9', fontSize: 24 }} />,
    color: '#f0f9ff',
    subColor: '#0ea5e9',
    glow: 'rgba(14, 165, 233, 0.15)',
    borderActive: 'rgba(14, 165, 233, 0.4)',
  },
  {
    title: 'Countries Visited',
    key: 'countriesVisited',
    icon: <PublicIcon sx={{ color: '#10b981', fontSize: 24 }} />,
    color: '#ecfdf5',
    subColor: '#10b981',
    glow: 'rgba(16, 185, 129, 0.15)',
    borderActive: 'rgba(16, 185, 129, 0.4)',
  },
  {
    title: 'Saved Destinations',
    key: 'savedDestinations',
    icon: <BookmarkIcon sx={{ color: '#f59e0b', fontSize: 24 }} />,
    color: '#fffbeb',
    subColor: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.15)',
    borderActive: 'rgba(245, 158, 11, 0.4)',
  },
  {
    title: 'Reward Points',
    key: 'rewardPoints',
    icon: <EmojiEventsIcon sx={{ color: '#ec4899', fontSize: 24 }} />,
    color: '#fdf2f8',
    subColor: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.15)',
    borderActive: 'rgba(236, 72, 153, 0.4)',
  },
];

const normalizeCountryKey = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const extractCountryFromDestination = (destination = '') => {
  const parts = String(destination || '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return '';

  const candidate = parts[parts.length - 1];
  if (!candidate || /\d/.test(candidate)) return '';
  return candidate;
};

const resolveBookingCountry = (booking = {}) => {
  const guideCountry = String(booking?.guideId?.country || '').trim();
  if (guideCountry) return guideCountry;
  return extractCountryFromDestination(booking?.destination || '');
};

export default function DashboardMetrics() {
  const [metrics, setMetrics] = useState({
    upcomingTrips: 0,
    upcomingSubtext: 'this month',
    countriesVisited: 0,
    countriesSubtext: 'total',
    savedDestinations: 0,
    savedSubtext: 'bookmarked',
    rewardPoints: 0,
    rewardSubtext: 'total points',
  });
  const [loading, setLoading] = useState(true);

  const fetchMetrics = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const touristId = String(user?._id || user?.userId || '').trim();

      if (!touristId) {
        if (showLoader) setLoading(false);
        return;
      }

      const [bookingsRes, userRes] = await Promise.all([
        api.get(`/booking/tourist/${touristId}`).catch(() => ({ data: { bookings: [] } })),
        api.get(`/tourist/${touristId}`).catch(() => ({ data: {} })),
      ]);

      const bookingsData = bookingsRes?.data;
      const bookings = Array.isArray(bookingsData)
        ? bookingsData
        : Array.isArray(bookingsData?.bookings)
          ? bookingsData.bookings
          : [];
      const userData = userRes.data?.[0] || userRes.data || {};

      const now = new Date();
      const upcomingBookings = bookings.filter((b) =>
        b.status === 'confirmed' && new Date(b.startDateTime) > now
      );
      const thisMonthBookings = upcomingBookings.filter((b) => {
        const bookingDate = new Date(b.startDateTime);
        return bookingDate.getMonth() === now.getMonth() &&
               bookingDate.getFullYear() === now.getFullYear();
      });

      const completedBookings = bookings.filter((b) => b.status === 'completed');
      const visitedCountryKeys = new Set();
      completedBookings.forEach((booking) => {
        const country = resolveBookingCountry(booking);
        const key = normalizeCountryKey(country);
        if (key) visitedCountryKeys.add(key);
      });
      const countriesVisited = visitedCountryKeys.size;

      const savedDests = Array.isArray(userData.savedDestinations)
        ? userData.savedDestinations
        : Array.isArray(userData.favorites)
          ? userData.favorites
          : [];
      const newSavedThisMonth = savedDests.filter((d) => {
        if (!d.savedAt) return false;
        const savedDate = new Date(d.savedAt);
        return savedDate.getMonth() === now.getMonth() &&
               savedDate.getFullYear() === now.getFullYear();
      }).length;

      const rewardPoints = Number(userData.rewardPoints || 0);

      setMetrics({
        upcomingTrips: upcomingBookings.length,
        upcomingSubtext: `+${thisMonthBookings.length} new`,
        countriesVisited,
        countriesSubtext:
          completedBookings.length === 0
            ? '0 visited'
            : countriesVisited > 0
              ? `${countriesVisited} countries`
              : 'location details incomplete',
        savedDestinations: savedDests.length,
        savedSubtext: `${newSavedThisMonth} new`,
        rewardPoints: rewardPoints.toLocaleString(),
        rewardSubtext: `Active`,
      });
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics(true);

    const intervalId = setInterval(() => {
      fetchMetrics(false);
    }, 60000);

    const handleWindowFocus = () => fetchMetrics(false);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchMetrics(false);
      }
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [fetchMetrics]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress sx={{ color: '#4F8A8B' }} />
      </Box>
    );
  }

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {metricsConfig.map((config, idx) => (
        <Grid item xs={12} sm={6} md={3} key={config.key}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: idx * 0.08, type: 'spring', stiffness: 100 }}
          >
            <Paper
              elevation={0}
              sx={{
                borderRadius: '24px',
                bgcolor: (theme) => 
                  theme.palette.mode === 'dark' 
                    ? 'rgba(30, 41, 59, 0.5)' 
                    : '#ffffff',
                border: '1px solid rgba(148, 163, 184, 0.15)',
                p: 3,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 12px 30px rgba(15, 23, 42, 0.05)',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                backdropFilter: 'blur(10px)',
                '&:before': {
                  content: '""',
                  position: 'absolute',
                  top: -24,
                  right: -24,
                  width: 100,
                  height: 100,
                  background: config.color,
                  borderRadius: '50%',
                  opacity: 0.3,
                  transition: 'all 0.3s ease',
                },
                '&:hover': {
                  transform: 'translateY(-6px)',
                  borderColor: config.borderActive,
                  boxShadow: `0 20px 40px ${config.glow}`,
                  '&:before': {
                    transform: 'scale(1.2)',
                  },
                  '& .metric-icon-box': {
                    transform: 'scale(1.1) rotate(5deg)',
                    boxShadow: `0 8px 20px ${config.glow}`
                  }
                }
              }}
            >
              <Box sx={{ position: 'relative', zIndex: 1 }}>
                <Box display="flex" alignItems="center" justifyContent="space-between" mb={2.5}>
                  <Box
                    className="metric-icon-box"
                    sx={{
                      width: 44,
                      height: 44,
                      borderRadius: '12px',
                      bgcolor: config.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `1px solid ${config.subColor}20`,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    {config.icon}
                  </Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: config.subColor,
                      fontWeight: 700,
                      bgcolor: config.color,
                      border: `1px solid ${config.subColor}15`,
                      px: 1.5,
                      py: 0.5,
                      borderRadius: '30px',
                      fontSize: '0.75rem',
                      letterSpacing: '0.2px'
                    }}
                  >
                    {metrics[`${config.key}Subtext`]}
                  </Typography>
                </Box>
                <Typography variant="subtitle2" sx={{ color: 'text.secondary', fontWeight: 600, mb: 0.5, fontSize: '0.85rem' }}>
                  {config.title}
                </Typography>
                <Typography variant="h4" fontWeight={800} sx={{ color: 'text.primary', fontFamily: '"Sora", sans-serif', mb: 1.5 }}>
                  {metrics[config.key]}
                </Typography>
                
                {/* Pulsing Sync Dot */}
                <Box display="flex" alignItems="center" gap={1}>
                  <Box 
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: '#10b981',
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0.7)' },
                        '70%': { transform: 'scale(1)', boxShadow: '0 0 0 6px rgba(16, 185, 129, 0)' },
                        '100%': { transform: 'scale(0.95)', boxShadow: '0 0 0 0 rgba(16, 185, 129, 0)' },
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.7rem' }}>
                    Live synced
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </motion.div>
        </Grid>
      ))}
    </Grid>
  );
}
