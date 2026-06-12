// Real Earnings Page with Charts
const getCollectedRevenue = (booking) => {
  const advanceCollected = booking?.advancePaymentStatus === 'verified' ? Number(booking?.advanceAmount || 0) : 0;
  const remainingCollected = booking?.remainingPaymentStatus === 'paid' ? Number(booking?.remainingAmount || 0) : 0;
  return advanceCollected + remainingCollected;
};

const getOutstandingRevenue = (booking) => {
  const advanceOutstanding = booking?.status === 'pending' && booking?.advancePaymentStatus !== 'verified'
    ? Number(booking?.advanceAmount || 0)
    : 0;
  const remainingOutstanding = ['confirmed', 'completed'].includes(String(booking?.status || '').toLowerCase()) && booking?.remainingPaymentStatus !== 'paid'
    ? Number(booking?.remainingAmount || 0)
    : 0;
  return advanceOutstanding + remainingOutstanding;
};

function EarningsPage({ bookings }) {
  const [loading, setLoading] = React.useState(false);

  // Calculate earnings metrics
  const totalEarnings = bookings
    .reduce((sum, booking) => sum + getCollectedRevenue(booking), 0);

  const thisMonth = bookings.filter(b => {
    const bookingMonth = new Date(b.startDateTime).getMonth();
    const currentMonth = new Date().getMonth();
    return bookingMonth === currentMonth;
  }).reduce((sum, booking) => sum + getCollectedRevenue(booking), 0);

  const pendingPayments = bookings
    .reduce((sum, booking) => sum + getOutstandingRevenue(booking), 0);

  const completedBookings = bookings.filter(b => b.status === 'completed').length;

  // Earnings by tour (destination)
  const earningsByDest = {};
  bookings
    .forEach((booking) => {
      const dest = booking.destination || 'Other';
      earningsByDest[dest] = (earningsByDest[dest] || 0) + getCollectedRevenue(booking);
    });

  // Daily earnings for last 7 days
  const dailyEarnings = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyEarnings[dateStr] = 0;
  }

  bookings
    .forEach((booking) => {
      const date = new Date(booking.startDateTime);
      const today = new Date();
      const daysDiff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
      if (daysDiff <= 6 && daysDiff >= 0) {
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyEarnings[dateStr] = (dailyEarnings[dateStr] || 0) + getCollectedRevenue(booking);
      }
    });

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>💰 Earnings & Revenue</Typography>

      {/* Key Metrics */}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, mb: 4 }}>
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>TOTAL EARNINGS</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#1976d2' }}>₹{totalEarnings.toFixed(2)}</Typography>
          <Typography variant="caption" color="success.main" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            📈 {completedBookings} completed tours
          </Typography>
        </Box>

        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>THIS MONTH</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#10b981' }}>₹{thisMonth.toFixed(2)}</Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            📅 {bookings.filter(b => new Date(b.startDateTime).getMonth() === new Date().getMonth()).length} bookings
          </Typography>
        </Box>

        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>PENDING PAYMENTS</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#f59e0b' }}>₹{pendingPayments.toFixed(2)}</Typography>
          <Typography variant="caption" color="warning.main" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            ⏳ {bookings.filter(b => b.status === 'pending' || b.status === 'confirmed').length} bookings
          </Typography>
        </Box>

        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>AVG PER BOOKING</Typography>
          <Typography variant="h4" fontWeight={800} sx={{ color: '#8b5cf6' }}>
            ₹{completedBookings > 0 ? (totalEarnings / completedBookings).toFixed(0) : '0'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
            💵 Revenue per tour
          </Typography>
        </Box>
      </Box>

      {/* Charts Section */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'repeat(2, 1fr)' }, mb: 4 }}>
        {/* Daily Earnings Chart */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="h6" fontWeight={700} mb={2}>Last 7 Days Earnings</Typography>
          <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 1.5, height: 200, justifyContent: 'space-around', pb: 2 }}>
            {Object.entries(dailyEarnings).map(([date, amount]) => (
              <Box key={date} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                <Box
                  sx={{
                    width: '100%',
                    height: Math.max(amount / Math.max(...Object.values(dailyEarnings), 1) * 150, 4),
                    bgcolor: '#1976d2',
                    borderRadius: 1.5,
                    transition: 'all 0.3s',
                    '&:hover': { bgcolor: '#1565c0', boxShadow: '0 4px 12px rgba(25, 118, 210, 0.4)' }
                  }}
                  title={`₹${amount.toFixed(2)}`}
                />
                <Typography variant="caption" sx={{ mt: 1, fontSize: 11, textAlign: 'center' }}>{date}</Typography>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Earnings by Destination */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="h6" fontWeight={700} mb={2}>Top Destinations</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {Object.entries(earningsByDest).slice(0, 5).map(([dest, amount]) => (
              <Box key={dest} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600}>{dest}</Typography>
                  <Box sx={{ width: '100%', height: 6, bgcolor: '#e5e7eb', borderRadius: 3, mt: 0.5, overflow: 'hidden' }}>
                    <Box sx={{
                      height: '100%',
                      bgcolor: '#10b981',
                      width: `${Math.min((amount / Math.max(...Object.values(earningsByDest), 1)) * 100, 100)}%`
                    }} />
                  </Box>
                </Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ minWidth: 70, textAlign: 'right' }}>₹{amount.toFixed(0)}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* Earnings History */}
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
        <Typography variant="h6" fontWeight={700} mb={2}>Recent Earnings</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#666' }}>Destination</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#666' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left', fontWeight: 700, color: '#666' }}>Status</th>
                <th style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#666' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {bookings
                .filter((b) => getCollectedRevenue(b) > 0)
                .sort((a, b) => new Date(b.startDateTime) - new Date(a.startDateTime))
                .slice(0, 10)
                .map(b => (
                  <tr key={b._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '12px' }}>📍 {b.destination || 'N/A'}</td>
                    <td style={{ padding: '12px' }}>{new Date(b.startDateTime).toLocaleDateString()}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        display: 'inline-block',
                        padding: '4px 12px',
                        borderRadius: 20,
                        fontSize: 12,
                        fontWeight: 600,
                        bgcolor: b.status === 'completed' ? '#d1fae5' : '#fef3c7',
                        color: b.status === 'completed' ? '#059669' : '#d97706'
                      }}>
                        {b.status.charAt(0).toUpperCase() + b.status.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#1976d2' }}>₹{b.price.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </Box>
      </Box>
    </Box>
  );
}

// Real Reviews Page
function ReviewsPage({ user, guideProfile }) {
  const [reviews, setReviews] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [averageRating, setAverageRating] = React.useState(0);
  const [ratingDistribution, setRatingDistribution] = React.useState({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
  const [replyingTo, setReplyingTo] = React.useState(null);
  const [replyText, setReplyText] = React.useState('');
  const [savingReply, setSavingReply] = React.useState(false);

  React.useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        // First try to fetch reviews for the guide
        let reviewsData = [];
        try {
          const res = await api.get(`/review/guide/${user._id}/reviews`);
          reviewsData = res.data.reviews || [];
        } catch (err) {
          // If guide ID pattern doesn't work, try with aggregation
          console.log('Could not fetch reviews:', err);
          reviewsData = [];
        }

        setReviews(reviewsData);

        // Calculate average rating and distribution
        if (reviewsData.length > 0) {
          const avg = reviewsData.reduce((sum, r) => sum + r.rating, 0) / reviewsData.length;
          setAverageRating(avg);

          const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
          reviewsData.forEach(r => {
            if (dist.hasOwnProperty(r.rating)) {
              dist[r.rating]++;
            }
          });
          setRatingDistribution(dist);
        } else {
          setAverageRating(0);
          setRatingDistribution({ 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 });
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?._id) fetchReviews();
  }, [user, guideProfile]);

  const handleReplyClick = (review) => {
    setReplyingTo(review._id);
    setReplyText(review.guideReply || '');
  };

  const handleSaveReply = async () => {
    if (!replyText.trim()) {
      alert('Reply cannot be empty');
      return;
    }

    setSavingReply(true);
    try {
      const res = await api.put(`/review/${replyingTo}/reply`, { guideReply: replyText });

      // Update review in state
      setReviews(reviews.map(r =>
        r._id === replyingTo
          ? { ...r, guideReply: res.data.review.guideReply, guideReplyDate: res.data.review.guideReplyDate }
          : r
      ));

      setReplyingTo(null);
      setReplyText('');
    } catch (err) {
      alert('Error saving reply: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingReply(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
  }

  const totalReviews = reviews.length;
  const displayRating = totalReviews > 0 ? averageRating : 0;

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>⭐ Reviews & Ratings</Typography>

      {/* Rating Summary */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '300px 1fr' }, mb: 4 }}>
        {/* Overall Rating Card */}
        <Box sx={{ p: 4, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', textAlign: 'center' }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <Typography variant="h2" fontWeight={900} sx={{ color: '#fbbf24' }}>
              {displayRating.toFixed(1)}
            </Typography>
            <Box>
              <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                {[...Array(5)].map((_, i) => (
                  <span key={i} style={{ color: i < Math.round(displayRating) ? '#fbbf24' : '#d1d5db', fontSize: 20 }}>★</span>
                ))}
              </Box>
              <Typography variant="caption" color="text.secondary">{totalReviews} reviews</Typography>
            </Box>
          </Box>
        </Box>

        {/* Rating Distribution */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" fontWeight={700} mb={2}>Rating Distribution</Typography>
          {[5, 4, 3, 2, 1].map(rating => (
            <Box key={rating} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
              <Box sx={{ display: 'flex', gap: 0.5, minWidth: 80 }}>
                <Typography variant="caption" fontWeight={600}>{rating}★</Typography>
                {[...Array(5 - rating)].map((_, i) => (
                  <span key={i} style={{ color: '#d1d5db', fontSize: 12 }}>☆</span>
                ))}
              </Box>
              <Box sx={{ flex: 1, height: 8, bgcolor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{
                  height: '100%',
                  bgcolor: rating >= 4 ? '#10b981' : rating >= 3 ? '#f59e0b' : '#ef4444',
                  width: totalReviews > 0 ? `${(ratingDistribution[rating] / totalReviews) * 100}%` : '0%'
                }} />
              </Box>
              <Typography variant="caption" fontWeight={600} sx={{ minWidth: 40, textAlign: 'right' }}>
                {ratingDistribution[rating]} ({totalReviews > 0 ? ((ratingDistribution[rating] / totalReviews) * 100).toFixed(0) : 0}%)
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Reviews List */}
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
        <Typography variant="h6" fontWeight={700} mb={3}>All Reviews</Typography>
        {reviews.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
            <ReviewsIcon sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} />
            <Typography variant="body2">No reviews yet. Complete more tours to receive feedback!</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {reviews.map(review => (
              <Box
                key={review._id}
                sx={{
                  p: 3,
                  bgcolor: '#fafbfa',
                  borderRadius: 2,
                  border: '1px solid #e5e7eb',
                  '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }
                }}
              >
                {/* Tourist Review */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 2 }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
                      {[...Array(5)].map((_, i) => (
                        <span key={i} style={{ color: i < review.rating ? '#fbbf24' : '#d1d5db', fontSize: 14 }}>★</span>
                      ))}
                    </Box>
                    <Typography variant="subtitle2" fontWeight={700}>{review.place || 'Unnamed Location'}</Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {review.userId?.name} • {new Date(review.createdAt).toLocaleDateString()}
                    </Typography>
                  </Box>
                </Box>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6, pl: 0 }}>
                  {review.comment || 'No comment provided'}
                </Typography>

                {/* Guide Reply Section */}
                {replyingTo === review._id ? (
                  <Box sx={{ p: 2, bgcolor: '#e8f5e9', borderRadius: 1, border: '1px solid #c8e6c9' }}>
                    <Typography variant="subtitle2" fontWeight={700} mb={1}>Your Reply</Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Write your reply to this review..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      sx={{ mb: 1 }}
                    />
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={handleSaveReply}
                        disabled={savingReply}
                        sx={{ bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                      >
                        {savingReply ? <CircularProgress size={20} /> : 'Save Reply'}
                      </Button>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => setReplyingTo(null)}
                        disabled={savingReply}
                      >
                        Cancel
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <>
                    {review.guideReply && (
                      <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 1, border: '1px solid #bfdbfe', mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#1e40af', mb: 1 }}>
                          Your Reply
                        </Typography>
                        <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.6 }}>
                          {review.guideReply}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Replied {new Date(review.guideReplyDate).toLocaleDateString()}
                        </Typography>
                      </Box>
                    )}
                    <Button
                      size="small"
                      variant={review.guideReply ? "outlined" : "contained"}
                      onClick={() => handleReplyClick(review)}
                      sx={{
                        bgcolor: review.guideReply ? 'transparent' : '#dbeafe',
                        color: review.guideReply ? '#1e40af' : '#1e40af',
                        border: '1px solid #bfdbfe',
                        '&:hover': { bgcolor: '#eff6ff' }
                      }}
                    >
                      {review.guideReply ? '✏️ Edit Reply' : '💬 Reply to Review'}
                    </Button>
                  </>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import { io } from 'socket.io-client';
import { SOCKET_BASE_URL, toAbsoluteAssetUrl } from '../config/runtime';
import { useNavigate } from 'react-router-dom';
import { styled, ThemeProvider, createTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import MuiDrawer from '@mui/material/Drawer';
import MuiAppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import List from '@mui/material/List';
import CssBaseline from '@mui/material/CssBaseline';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import Tooltip from '@mui/material/Tooltip';
import DashboardIcon from '@mui/icons-material/Dashboard';
import TourIcon from '@mui/icons-material/TravelExplore';
import BookingsIcon from '@mui/icons-material/BookOnline';
import CalendarIcon from '@mui/icons-material/CalendarMonth';
import MessageIcon from '@mui/icons-material/Chat';
import EarningsIcon from '@mui/icons-material/BarChart';
import ReviewsIcon from '@mui/icons-material/StarRate';
import ProfileIcon from '@mui/icons-material/Person';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import { alpha } from '@mui/material';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import useMediaQuery from '@mui/material/useMediaQuery';
import Badge from '@mui/material/Badge';
import { buildMediaUrl } from '../utils/media';

const drawerWidth = 272;
const collapsedDrawerWidth = 72;

const guideColors = {
  ink: '#172326',
  muted: '#61706d',
  primary: '#2f6f68',
  primaryDeep: '#173b38',
  secondary: '#7c8f68',
  accent: '#d89b5f',
  sidebarText: '#edf7f2',
  sidebarMuted: '#b7cec6',
  pageBackground: '#f6f4ee',
  sidebarBackground: '#173b38',
  activeNavBackground: '#d8e7e1',
  heroBackground: 'linear-gradient(135deg, #1b3f3c 0%, #2f6f68 100%)',
};

const navItems = [
  { label: 'Dashboard', icon: <DashboardIcon /> },
  { label: 'My Tours', icon: <TourIcon /> },
  { label: 'Bookings', icon: <BookingsIcon /> },
  { label: 'Calendar', icon: <CalendarIcon /> },
  { label: 'Messages', icon: <MessageIcon /> },
  { label: 'Earnings', icon: <EarningsIcon /> },
  { label: 'Reviews', icon: <ReviewsIcon /> },
  { label: 'Profile', icon: <ProfileIcon /> },
  { label: 'Settings', icon: <SettingsIcon /> },
];

const glassBg = theme => `
  linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.96)}, ${alpha('#f6f4ee', 0.92)})
`;

const GlassCard = styled(Box)(({ theme }) => ({
  background: glassBg(theme),
  boxShadow: '0 14px 34px rgba(23, 35, 38, 0.08)',
  borderRadius: 20,
  border: '1px solid rgba(23, 35, 38, 0.08)',
  backdropFilter: 'blur(10px)',
  padding: theme.spacing(3),
  transition: 'transform 0.2s, box-shadow 0.2s',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: '0 18px 42px rgba(23, 35, 38, 0.12)',
  },
}));

const Main = styled('main', { shouldForwardProp: prop => prop !== 'open' })(({ theme, open }) => ({
  flexGrow: 1,
  padding: theme.spacing(4),
  transition: theme.transitions.create('margin', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  marginLeft: `-${drawerWidth}px`,
  ...(open && {
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginLeft: 0,
  }),
}));

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: prop => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer + 1,
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: drawerWidth,
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}));

const Drawer = styled(MuiDrawer, { shouldForwardProp: prop => prop !== 'open' })
  (({ theme, open }) => ({
    '& .MuiDrawer-paper': {
      width: drawerWidth,
      boxSizing: 'border-box',
      background: guideColors.sidebarBackground,
      color: guideColors.sidebarText,
      borderRight: '1px solid rgba(237, 247, 242, 0.12)',
      boxShadow: '14px 0 30px rgba(23, 35, 38, 0.14)',
      transition: theme.transitions.create('width', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.enteringScreen,
      }),
      ...(open ? {} : {
        width: collapsedDrawerWidth,
        overflowX: 'hidden',
      }),
    },
  }));

const metrics = [
  { title: 'Total Bookings', value: 128, icon: <BookingsIcon fontSize="large" color="primary" />, color: 'primary.main', gradient: '#e3eee9' },
  { title: 'Monthly Earnings', value: '₹2,340', icon: <EarningsIcon fontSize="large" color="success" />, color: 'success.main', gradient: '#edf3e6' },
  { title: 'Upcoming Tours', value: 7, icon: <TourIcon fontSize="large" color="info" />, color: 'info.main', gradient: '#eee5d8' },
  { title: 'Rating', value: '4.9', icon: <ReviewsIcon fontSize="large" color="warning" />, color: 'warning.main', gradient: '#f4eadc' },
];

const guideDashboardFont = "'Trebuchet MS', 'Aptos', 'Segoe UI Variable', 'Segoe UI', sans-serif";

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: guideColors.primary },
    secondary: { main: guideColors.secondary },
    success: { main: '#16a34a' },
    warning: { main: '#f59e0b' },
    error: { main: '#dc2626' },
    info: { main: guideColors.secondary },
    background: { default: guideColors.pageBackground, paper: '#fff' },
    text: { primary: guideColors.ink, secondary: guideColors.muted },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: guideDashboardFont,
    h4: { fontWeight: 700, letterSpacing: 0 },
    h5: { fontWeight: 700, letterSpacing: 0 },
    h6: { fontWeight: 700 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        contained: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '10px 24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
          }
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          }
        }
      }
    }
  }
});

function DashboardPage({ user, bookings, guideProfile, guideReviews, tours }) {
  // Calculate metrics
  const totalBookings = bookings.length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const upcomingTours = bookings.filter(b => new Date(b.startDateTime) > new Date()).length;
  const completedTours = bookings.filter(b => b.status === 'completed').length;
  const totalEarnings = bookings.reduce((sum, booking) => sum + getCollectedRevenue(booking), 0);
  const outstandingAmount = bookings.reduce((sum, booking) => sum + getOutstandingRevenue(booking), 0);

  const thisMonthBookings = bookings.filter(b => {
    const bookingMonth = new Date(b.startDateTime).getMonth();
    const currentMonth = new Date().getMonth();
    return bookingMonth === currentMonth && (b.status === 'confirmed' || b.status === 'completed');
  }).length;

  const responseRate = totalBookings > 0 ? 95 : 0; // Placeholder, should come from backend
  const completionRate = totalBookings > 0 ? Math.round((completedTours / totalBookings) * 100) : 0;
  const activeBookings = bookings.filter(b => ['pending', 'confirmed'].includes((b.status || '').toLowerCase())).length;
  const fetchedReviews = Array.isArray(guideReviews) ? guideReviews : [];
  const reviewCount = fetchedReviews.length || Number(guideProfile?.reviewCount || guideProfile?.reviewsCount || guideProfile?.totalReviews || 0);
  const ratingValue = fetchedReviews.length > 0
    ? fetchedReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / fetchedReviews.length
    : Number(guideProfile?.ratings || guideProfile?.rating || 0);
  const sortedBookings = [...bookings].sort((a, b) => new Date(b.createdAt || b.startDateTime || 0) - new Date(a.createdAt || a.startDateTime || 0));
  const upcomingBooking = [...bookings]
    .filter(b => new Date(b.startDateTime) >= new Date() && (b.status || '').toLowerCase() !== 'cancelled')
    .sort((a, b) => new Date(a.startDateTime) - new Date(b.startDateTime))[0];
  const formatCurrency = value => `INR ${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Number(value || 0))}`;
  const formatDate = value => value ? new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Not scheduled';
  const statusRows = ['pending', 'confirmed', 'completed'].map(status => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: bookings.filter(b => (b.status || '').toLowerCase() === status).length,
  }));
  const statCards = [
    { label: 'Bookings', value: totalBookings, meta: `${activeBookings} active`, tone: guideColors.primary, icon: <BookingsIcon /> },
    { label: 'Collected', value: formatCurrency(totalEarnings), meta: `${formatCurrency(outstandingAmount)} still due`, tone: '#16a34a', icon: <EarningsIcon /> },
    { label: 'Upcoming', value: upcomingTours, meta: upcomingBooking ? formatDate(upcomingBooking.startDateTime) : 'No upcoming tour', tone: guideColors.secondary, icon: <CalendarIcon /> },
    { label: 'Rating', value: reviewCount > 0 ? ratingValue.toFixed(1) : 'New', meta: `${reviewCount} reviews`, tone: '#f59e0b', icon: <ReviewsIcon /> },
  ];
  const cardSx = {
    bgcolor: '#fff',
    border: '1px solid #dbe3ef',
    borderRadius: 3,
    boxShadow: '0 18px 40px rgba(15, 23, 42, 0.06)',
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: 4,
          color: '#fff',
          background: guideColors.heroBackground,
          boxShadow: '0 22px 44px rgba(23, 59, 56, 0.18)',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
          gap: 2.5,
          alignItems: 'center',
        }}
      >
        <Box>
          <Typography variant="overline" sx={{ letterSpacing: 2.4, color: 'rgba(255,255,255,0.72)', fontWeight: 800 }}>
            Guide Workspace
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5 }}>
            Welcome back, {user?.name || 'Guide'}
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.78)', mt: 1 }}>
            Manage tourist requests, upcoming tours, messages, and profile readiness from one clean workspace.
          </Typography>
        </Box>
        <Box
          sx={{
            px: 3,
            py: 2,
            borderRadius: 3,
            bgcolor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.18)',
            minWidth: 220,
          }}
        >
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.72)', fontWeight: 700 }}>
            Next booking
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.5 }}>
            {upcomingBooking?.destination || 'No upcoming booking'}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.74)' }}>
            {upcomingBooking ? formatDate(upcomingBooking.startDateTime) : 'New requests will appear here'}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', xl: 'repeat(4, 1fr)' }, gap: 2.25 }}>
        {statCards.map(card => (
          <Box key={card.label} sx={{ ...cardSx, p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
              <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 1 }}>
                  {card.label}
                </Typography>
                <Typography variant="h4" sx={{ color: guideColors.ink, fontWeight: 900, mt: 0.5 }}>
                  {card.value}
                </Typography>
              </Box>
              <Box sx={{ width: 44, height: 44, borderRadius: 2.5, display: 'grid', placeItems: 'center', color: card.tone, bgcolor: alpha(card.tone, 0.1) }}>
                {card.icon}
              </Box>
            </Box>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 2 }}>
              {card.meta}
            </Typography>
          </Box>
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.35fr 0.65fr' }, gap: 2.25 }}>
        <Box sx={{ ...cardSx, p: { xs: 2.5, md: 3 } }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2.5 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Tourist Activity
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Latest guide bookings from tourists
              </Typography>
            </Box>
            <Chip label={`${pendingBookings} pending`} sx={{ bgcolor: '#eee5d8', color: '#8a5a2b', fontWeight: 800 }} />
          </Box>

          {sortedBookings.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', border: '1px dashed #cbd5e1', borderRadius: 3, color: 'text.secondary' }}>
              <BookingsIcon sx={{ fontSize: 44, color: '#94a3b8', mb: 1 }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#334155' }}>
                No tourist bookings yet
              </Typography>
              <Typography variant="body2">
                Bookings created by tourists will show here automatically.
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
              {sortedBookings.slice(0, 5).map(booking => {
                const status = (booking.status || 'pending').toLowerCase();
                const touristName = booking.touristId?.name || booking.tourist?.name || 'Tourist';
                const statusTone = status === 'completed' ? '#16a34a' : status === 'confirmed' ? guideColors.primary : status === 'rejected' ? '#dc2626' : guideColors.secondary;
                return (
                  <Box
                    key={booking._id}
                    sx={{
                      py: 2,
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: '1fr auto' },
                      gap: 1.5,
                      borderBottom: '1px solid #edf2f7',
                      '&:last-child': { borderBottom: 0 },
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: guideColors.ink }}>
                        {touristName} to {booking.destination || 'destination pending'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(booking.startDateTime)} | {formatCurrency(booking.price)}
                      </Typography>
                    </Box>
                    <Chip
                      label={status}
                      size="small"
                      sx={{ justifySelf: { xs: 'start', md: 'end' }, bgcolor: alpha(statusTone, 0.1), color: statusTone, fontWeight: 800, textTransform: 'capitalize' }}
                    />
                  </Box>
                );
              })}
            </Box>
          )}
        </Box>

        <Box sx={{ ...cardSx, p: { xs: 2.5, md: 3 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Booking Pipeline
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {statusRows.map(row => {
              const width = totalBookings > 0 ? Math.round((row.value / totalBookings) * 100) : 0;
              return (
                <Box key={row.label}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{row.label}</Typography>
                    <Typography variant="body2" color="text.secondary">{row.value}</Typography>
                  </Box>
                  <Box sx={{ height: 8, borderRadius: 999, bgcolor: '#e2e8f0', overflow: 'hidden' }}>
                    <Box sx={{ width: `${width}%`, minWidth: row.value > 0 ? 18 : 0, height: '100%', bgcolor: row.label === 'Completed' ? '#16a34a' : row.label === 'Confirmed' ? guideColors.primary : guideColors.secondary }} />
                  </Box>
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ my: 2.5 }} />
          <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
            Profile Readiness
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Chip size="small" label={guideProfile?.bio ? 'Bio added' : 'Bio missing'} color={guideProfile?.bio ? 'success' : 'warning'} variant="outlined" />
            <Chip size="small" label={guideProfile?.languages?.length || guideProfile?.language ? 'Languages added' : 'Languages missing'} color={guideProfile?.languages?.length || guideProfile?.language ? 'success' : 'warning'} variant="outlined" />
            <Chip size="small" label={guideProfile?.identityProof ? 'ID verified file' : 'ID proof missing'} color={guideProfile?.identityProof ? 'success' : 'warning'} variant="outlined" />
          </Box>
        </Box>
      </Box>
    </Box>
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={1}>
        👋 Welcome back, {user?.name || 'Guide'}!
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={4}>
        Here's your performance overview for today
      </Typography>

      {/* Primary Metrics - 2x2 Grid */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, mb: 4 }}>
        {/* Total Bookings */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(0,0,0,0.12)' } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>TOTAL BOOKINGS</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#1976d2' }}>{totalBookings}</Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#dbeafe', borderRadius: 2 }}>
              <BookingsIcon sx={{ color: '#1976d2', fontSize: 24 }} />
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            📈 {thisMonthBookings} this month
          </Typography>
        </Box>

        {/* Monthly Earnings */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(0,0,0,0.12)' } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>COLLECTED REVENUE</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#10b981' }}>₹{totalEarnings.toFixed(0)}</Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#dcfce7', borderRadius: 2 }}>
              <EarningsIcon sx={{ color: '#10b981', fontSize: 24 }} />
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            💰 {confirmedBookings} confirmed
          </Typography>
        </Box>

        {/* Upcoming Tours */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(0,0,0,0.12)' } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>UPCOMING TOURS</Typography>
              <Typography variant="h4" fontWeight={800} sx={{ color: '#06b6d4' }}>{upcomingTours}</Typography>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#cffafe', borderRadius: 2 }}>
              <TourIcon sx={{ color: '#06b6d4', fontSize: 24 }} />
            </Box>
          </Box>
          <Typography variant="caption" sx={{ color: '#0891b2', display: 'flex', alignItems: 'center', gap: 0.5 }}>
            📅 Next {Math.min(upcomingTours, 2)} coming up
          </Typography>
        </Box>

        {/* Rating */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(0,0,0,0.12)' } }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={1}>RATING</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h4" fontWeight={800} sx={{ color: '#fbbf24' }}>{guideProfile?.ratings?.toFixed(1) || '4.9'}</Typography>
                <Box sx={{ display: 'flex', gap: 0.25 }}>
                  {[...Array(5)].map((_, i) => (
                    <span key={i} style={{ color: i < Math.round(guideProfile?.ratings || 4.9) ? '#fbbf24' : '#d1d5db', fontSize: 14 }}>★</span>
                  ))}
                </Box>
              </Box>
            </Box>
            <Box sx={{ p: 1.5, bgcolor: '#fffbeb', borderRadius: 2 }}>
              <ReviewsIcon sx={{ color: '#fbbf24', fontSize: 24 }} />
            </Box>
          </Box>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            ⭐ {completedTours} completed tours
          </Typography>
        </Box>
      </Box>

      {/* Secondary Metrics */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, mb: 4 }}>
        {/* Response Rate */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={2}>RESPONSE RATE</Typography>
          <Box sx={{ position: 'relative', height: 60 }}>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#06b6d4', mb: 1 }}>{responseRate}%</Typography>
            <Box sx={{ width: '100%', height: 4, bgcolor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${responseRate}%`, bgcolor: '#06b6d4' }} />
            </Box>
            <Typography variant="caption" color="text.secondary">Quick replies to inquiries</Typography>
          </Box>
        </Box>

        {/* Completion Rate */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={2}>COMPLETION RATE</Typography>
          <Box sx={{ position: 'relative', height: 60 }}>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#10b981', mb: 1 }}>{completionRate}%</Typography>
            <Box sx={{ width: '100%', height: 4, bgcolor: '#e5e7eb', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${completionRate}%`, bgcolor: '#10b981' }} />
            </Box>
            <Typography variant="caption" color="text.secondary">Tours completed successfully</Typography>
          </Box>
        </Box>

        {/* Pending Approval */}
        <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
          <Typography variant="subtitle2" color="text.secondary" fontWeight={600} mb={2}>PENDING BOOKINGS</Typography>
          <Box sx={{ position: 'relative', height: 60 }}>
            <Typography variant="h5" fontWeight={800} sx={{ color: '#f59e0b', mb: 1 }}>{pendingBookings}</Typography>
            <Typography variant="caption" color="text.secondary">Awaiting your response</Typography>
          </Box>
        </Box>
      </Box>

      {/* Pricing Card */}
      <Box sx={{ p: 3, background: guideColors.heroBackground, borderRadius: 3, boxShadow: '0 18px 38px rgba(23, 59, 56, 0.18)', border: 'none', mb: 4, color: '#fff' }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={2} sx={{ opacity: 0.9 }}>YOUR PRICING</Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 2 }}>
              <Typography variant="h3" fontWeight={900} sx={{ color: '#fff' }}>
                ₹{guideProfile?.price || '0'}
              </Typography>
              <Typography variant="h6" fontWeight={600} sx={{ opacity: 0.9 }}>
                /{guideProfile?.rateType === 'hourly' ? 'hour' : 'day'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Chip
                label="Currency: INR"
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 }}
              />
              <Chip
                label={`${guideProfile?.rateType === 'hourly' ? 'Hourly' : 'Daily'} Rate`}
                size="small"
                sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600 }}
              />
            </Box>
          </Box>
          <Box sx={{ fontSize: '3rem' }}>💰</Box>
        </Box>
      </Box>

      {/* Recent Activity */}
      <Box sx={{ p: 3, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0' }}>
        <Typography variant="h6" fontWeight={700} mb={3}>📋 Recent Activity</Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {bookings.slice(0, 5).length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No recent activity. Start accepting bookings!
            </Typography>
          ) : (
            bookings
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .slice(0, 5)
              .map(booking => (
                <Box key={booking._id} sx={{ display: 'flex', gap: 3, pb: 2, borderBottom: '1px solid #f0f0f0', '&:last-child': { borderBottom: 'none' } }}>
                  <Box sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    bgcolor: booking.status === 'confirmed' ? '#dbeafe' : booking.status === 'completed' ? '#dcfce7' : '#fef3c7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <span style={{ fontSize: 18 }}>
                      {booking.status === 'confirmed' ? '📅' : booking.status === 'completed' ? '✓' : '⏳'}
                    </span>
                  </Box>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle2" fontWeight={600}>
                      {booking.status === 'confirmed' ? 'Booking Confirmed' : booking.status === 'completed' ? 'Tour Completed' : 'New Booking Request'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {booking.destination || 'Unknown destination'} • {new Date(booking.startDateTime).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '4px 12px',
                      borderRadius: 12,
                      fontSize: 11,
                      fontWeight: 600,
                      backgroundColor: booking.status === 'confirmed' ? '#e3eee9' : booking.status === 'completed' ? '#dcebdd' : '#f1e3cf',
                      color: booking.status === 'confirmed' ? guideColors.primary : booking.status === 'completed' ? '#16a34a' : '#b45309'
                    }}>
                      {booking.status.toUpperCase()}
                    </span>
                  </Box>
                </Box>
              ))
          )}
        </Box>
      </Box>
    </Box>
  );
}

// Enhanced Tour Card Component
function TourCard({ tour, onEdit, onDelete }) {
  const bookingCount = tour.bookings?.length || 0;
  const revenue = tour.bookings?.reduce((sum, booking) => sum + getCollectedRevenue(booking), 0) || 0;

  return (
    <Box
      sx={{
        p: 3,
        bgcolor: '#fff',
        borderRadius: 3,
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        border: '1px solid #f0f0f0',
        transition: 'transform 0.2s, box-shadow 0.2s, border-color 0.2s',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 24px rgba(0,0,0,0.12)',
          borderColor: '#1976d2'
        },
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      {/* Image Placeholder */}
      <Box
        sx={{
          width: '100%',
          height: 180,
          bgcolor: '#f3f4f6',
          borderRadius: 2,
          mb: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          color: '#d1d5db'
        }}
      >
        {tour.image ? (
          <img src={tour.image} alt={tour.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <TourIcon sx={{ fontSize: 48, color: '#d1d5db' }} />
        )}
      </Box>

      {/* Tour Info */}
      <Typography variant="subtitle1" fontWeight={700} mb={1} sx={{ lineHeight: 1.3 }}>
        {tour.title || 'Untitled Tour'}
      </Typography>

      <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {tour.description || 'No description available'}
      </Typography>

      {/* Stats */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, pb: 3, borderBottom: '1px solid #f0f0f0' }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>BOOKINGS</Typography>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#1976d2' }}>{bookingCount}</Typography>
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>REVENUE</Typography>
          <Typography variant="h6" fontWeight={700} sx={{ color: '#10b981' }}>₹{revenue.toFixed(0)}</Typography>
        </Box>
      </Box>

      {/* Price */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>PRICE PER DAY</Typography>
        <Typography variant="h5" fontWeight={800} sx={{ color: '#1976d2' }}>
          ₹{tour.price || '0'}
        </Typography>
      </Box>

      {/* Actions - Flex grow to push to bottom */}
      <Box sx={{ display: 'flex', gap: 2, mt: 'auto' }}>
        <Button
          variant="outlined"
          size="small"
          fullWidth
          onClick={onEdit}
          sx={{
            borderRadius: 2,
            fontWeight: 600,
            borderColor: '#1976d2',
            color: '#1976d2',
            '&:hover': { bgcolor: '#dbeafe' }
          }}
        >
          Edit
        </Button>
        <Button
          variant="outlined"
          color="error"
          size="small"
          fullWidth
          onClick={onDelete}
          sx={{
            borderRadius: 2,
            fontWeight: 600
          }}
        >
          Delete
        </Button>
      </Box>
    </Box>
  );
}

// Enhanced My Tours Page
const MyToursPage = ({ tours, onCreateTour }) => {
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({ title: '', price: '', duration: '', description: '', image: '' });
  const [editingId, setEditingId] = React.useState(null);

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: name === 'price' || name === 'duration' ? Number(value) : value }));
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (!form.title || !form.price) {
      alert('Please fill in title and price');
      return;
    }
    onCreateTour(form);
    setOpen(false);
    setForm({ title: '', price: '', duration: '', description: '', image: '' });
    setEditingId(null);
  };

  const handleOpenEdit = (tour) => {
    setForm({
      title: tour.title || '',
      price: tour.price || '',
      duration: tour.duration || '',
      description: tour.description || '',
      image: tour.image || ''
    });
    setEditingId(tour._id);
    setOpen(true);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', sm: 'center' }, justifyContent: 'space-between', gap: 1.5, flexDirection: { xs: 'column', sm: 'row' }, mb: 4 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} mb={0.5}>My Tours</Typography>
          <Typography variant="body2" color="text.secondary">Manage and create your tour experiences</Typography>
        </Box>
        <Button
          variant="contained"
          onClick={() => {
            setEditingId(null);
            setForm({ title: '', price: '', duration: '', description: '', image: '' });
            setOpen(true);
          }}
          sx={{ borderRadius: 2, fontWeight: 700, width: { xs: '100%', sm: 'auto' } }}
          size="large"
        >
          + Create Tour
        </Button>
      </Box>

      {/* Create/Edit Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
          {editingId ? 'Edit Tour' : 'Create New Tour'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
            <TextField
              label="Tour Title"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
              fullWidth
              placeholder="e.g., Morning City Tour"
            />
            <TextField
              label="Price per Day (₹)"
              name="price"
              value={form.price}
              onChange={handleChange}
              required
              fullWidth
              type="number"
              placeholder="e.g., 2500"
            />
            <TextField
              label="Duration (days)"
              name="duration"
              value={form.duration}
              onChange={handleChange}
              fullWidth
              type="number"
              placeholder="e.g., 5"
            />
            <TextField
              label="Description"
              name="description"
              value={form.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
              placeholder="Describe your tour experience..."
            />
            <TextField
              label="Image URL"
              name="image"
              value={form.image}
              onChange={handleChange}
              fullWidth
              placeholder="https://example.com/image.jpg"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, gap: 1 }}>
            <Button onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingId ? 'Update Tour' : 'Create Tour'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Tours Grid */}
      {tours.length === 0 ? (
        <Box sx={{ p: 6, textAlign: 'center', bgcolor: '#f9fafb', borderRadius: 3, border: '2px dashed #e5e7eb' }}>
          <TourIcon sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
          <Typography variant="h6" fontWeight={700} mb={1}>No tours yet</Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Create your first tour to start accepting bookings from tourists
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setEditingId(null);
              setForm({ title: '', price: '', duration: '', description: '', image: '' });
              setOpen(true);
            }}
          >
            Create Your First Tour
          </Button>
        </Box>
      ) : (
        <Box sx={{
          display: 'grid',
          gap: 3,
          gridTemplateColumns: {
            xs: '1fr',
            sm: 'repeat(2, 1fr)',
            md: 'repeat(3, 1fr)',
            lg: 'repeat(4, 1fr)'
          }
        }}>
          {tours.map(tour => (
            <TourCard
              key={tour._id || tour.id}
              tour={tour}
              onEdit={() => handleOpenEdit(tour)}
              onDelete={() => {
                if (confirm('Are you sure?')) {
                  // Call delete API
                }
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};
import BookingsDataGrid from '../components/BookingsDataGrid';
const BookingsPage = ({ bookings, refreshBookings, onOpenChat }) => {
  const counts = bookings.reduce((acc, booking) => {
    const status = (booking.status || 'pending').toLowerCase();
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box
        sx={{
          p: { xs: 2.5, md: 3 },
          borderRadius: 3,
          bgcolor: '#fff',
          border: '1px solid #dbe3ef',
          boxShadow: '0 18px 40px rgba(15, 23, 42, 0.05)',
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
          flexDirection: { xs: 'column', md: 'row' },
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={800}>Bookings</Typography>
          <Typography variant="body2" color="text.secondary" mt={0.5}>
            Tourist requests and confirmed guide tours
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          <Chip label={`${counts.pending || 0} pending`} sx={{ bgcolor: '#f1e3cf', color: '#8a5a2b', fontWeight: 800 }} />
          <Chip label={`${counts.confirmed || 0} confirmed`} sx={{ bgcolor: '#e3eee9', color: guideColors.primary, fontWeight: 800 }} />
          <Chip label={`${counts.completed || 0} completed`} sx={{ bgcolor: '#dcebdd', color: '#315f38', fontWeight: 800 }} />
        </Box>
      </Box>
      <BookingsDataGrid bookings={bookings} onStatusChange={refreshBookings} onChat={onOpenChat} />
    </Box>
  );
};
import BookingCalendar from '../components/BookingCalendar';
const CalendarPage = () => (
  <Box>
    <Typography variant="h5" fontWeight={700} mb={3}>Calendar</Typography>
    <BookingCalendar />
  </Box>
);

import GuideChatPanel from './components/GuideChatPanel';
import GuideTourManager from './components/GuideTourManager';

// Placeholder for MessagesPage
function MessagesPage({ user, preselectedTouristId, preselectToken, onTouristsChange }) {
  return user
    ? <GuideChatPanel guideId={user._id} preselectedTouristId={preselectedTouristId} preselectToken={preselectToken} onTouristsChange={onTouristsChange} />
    : null;
}



export default function GuideDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [guideProfile, setGuideProfile] = useState(null);
  const [guideReviews, setGuideReviews] = useState([]);
  const [tours, setTours] = useState([]);
  const [selected, setSelected] = useState('Dashboard');
  const [chatOpenRequest, setChatOpenRequest] = useState({ touristId: '', token: 0 });
  const [guideChatUnreadCount, setGuideChatUnreadCount] = useState(0);
  const [open, setOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const socketRef = useRef(null);
  // ...existing code...

  useEffect(() => {
    if (!isMobile) {
      setMobileDrawerOpen(false);
    }
  }, [isMobile]);

  // Move fetchGuideData to top-level so it's available in JSX
  const fetchGuideData = async () => {
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return;

    const userObj = JSON.parse(storedUser);
    let nextGuideProfile = null;

    try {
      const profileRes = await api.get('/guide/profile');
      nextGuideProfile = profileRes.data.guide;
      if (profileRes.data.user) {
        const mergedUser = {
          ...userObj,
          ...profileRes.data.user,
          _id: profileRes.data.user._id || userObj._id,
          role: profileRes.data.user.role || userObj.role,
        };
        setUser(mergedUser);
        localStorage.setItem('user', JSON.stringify(mergedUser));
      }
    } catch (err) {
      console.warn('Unable to refresh guide profile:', err.response?.data?.message || err.message);
    }

    try {
      const reviewsRes = await api.get(`/review/guide/${userObj._id}/reviews`);
      const reviewsData = reviewsRes.data.reviews || [];
      const averageRating = reviewsData.length > 0
        ? reviewsData.reduce((sum, review) => sum + Number(review.rating || 0), 0) / reviewsData.length
        : 0;

      setGuideReviews(reviewsData);
      if (nextGuideProfile) {
        nextGuideProfile = {
          ...nextGuideProfile,
          reviews: reviewsData,
          reviewCount: reviewsData.length,
          totalReviews: reviewsData.length,
          ratings: averageRating,
          rating: averageRating,
        };
      }
    } catch (err) {
      console.warn('Unable to refresh guide reviews:', err.response?.data?.message || err.message);
      setGuideReviews([]);
      if (nextGuideProfile) {
        nextGuideProfile = {
          ...nextGuideProfile,
          reviews: [],
          reviewCount: 0,
          totalReviews: 0,
        };
      }
    }

    if (nextGuideProfile) {
      setGuideProfile(nextGuideProfile);
    }

    try {
      const bookingsRes = await api.get(`/booking/guide/${userObj._id}`);
      setBookings(bookingsRes.data.bookings || []);
    } catch (err) {
      console.warn('Unable to refresh guide bookings:', err.response?.data?.message || err.message);
      setBookings([]);
    }

    try {
      const toursRes = await api.get(`/tour/guide/${userObj._id}`);
      setTours(toursRes.data.tours || []);
    } catch (err) {
      console.warn('Unable to refresh guide tours:', err.response?.data?.message || err.message);
      setTours([]);
    }
  };

  useEffect(() => {
    // Get user from localStorage
    const storedUser = localStorage.getItem('user');
    if (!storedUser) {
      navigate('/login', { replace: true });
      return;
    }
    const userObj = JSON.parse(storedUser);
    if ((userObj.role || '').toLowerCase() !== 'guide') {
      navigate('/login', { replace: true });
      return;
    }
    setUser(userObj);
    fetchGuideData();

    // Setup socket connection for real-time booking updates
    if (!socketRef.current) {
      socketRef.current = io(SOCKET_BASE_URL);
    }
    const socket = socketRef.current;

    // Emit guide online status
    socket.emit('guideOnline', { guideId: userObj._id });

    // Join guide room for real-time updates
    socket.emit('joinGuideRoom', { guideId: userObj._id });
    // Listen for booking updates
    socket.on('bookingUpdate', (data) => {
      // Only refresh if the update is for this guide
      if (data && data.guideId === userObj._id) {
        fetchGuideData();
      }
    });
    window.addEventListener('guideReviewsUpdated', fetchGuideData);
    return () => {
      window.removeEventListener('guideReviewsUpdated', fetchGuideData);
      if (socket) {
        socket.off('bookingUpdate');
        socket.disconnect();
      }
    };
  }, [navigate]);

  useEffect(() => {
    if (!user?._id) return;
    let isMounted = true;

    const syncUnreadMessages = async () => {
      try {
        const response = await api.get(`/chat/guide/${user._id}/tourists`);
        if (!isMounted) return;
        const tourists = response?.data?.tourists || [];
        const totalUnread = tourists.reduce((sum, item) => {
          const unread = Number(item?.unreadCount ?? item?.tourist?.unreadCount ?? 0);
          return sum + (Number.isFinite(unread) ? Math.max(0, unread) : 0);
        }, 0);
        setGuideChatUnreadCount(totalUnread);
      } catch (err) {
        if (!isMounted) return;
        console.warn('Unable to sync guide unread count:', err.response?.data?.message || err.message);
      }
    };

    syncUnreadMessages();
    const interval = setInterval(syncUnreadMessages, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [user?._id]);

  // ProfilePage now uses guideProfile
  const ProfilePage = () => {
    const getLanguagesText = (languages) => {
      if (!languages) return '';
      if (typeof languages === 'string') return languages;
      if (!Array.isArray(languages)) return '';
      return languages
        .map((language) => (typeof language === 'string' ? language : language?.name || ''))
        .filter(Boolean)
        .join(', ');
    };

    const account = guideProfile?.userId && typeof guideProfile.userId === 'object'
      ? guideProfile.userId
      : {};
    const languageText = getLanguagesText(guideProfile?.languages) || guideProfile?.language || '';
    const normalizeServiceDestinations = (list = [], fallbackPrice = 0) => {
      const rawList = Array.isArray(list) ? list : [];
      const seen = new Set();

      return rawList
        .map((item) => {
          const destination = String(item?.destination || '').trim();
          const price = Number(item?.price ?? fallbackPrice);
          if (!destination || !Number.isFinite(price) || price <= 0) return null;
          const key = destination.toLowerCase();
          if (seen.has(key)) return null;
          seen.add(key);
          return {
            _id: String(item?._id || ''),
            destination,
            price: Math.round(price),
          };
        })
        .filter(Boolean);
    };

    const getStartingPrice = (destinations = [], fallback = 0) => {
      const prices = (Array.isArray(destinations) ? destinations : [])
        .map((item) => Number(item?.price || 0))
        .filter((value) => Number.isFinite(value) && value > 0);
      if (prices.length === 0) return Number(fallback || 0);
      return Math.min(...prices);
    };

    const initialServiceDestinations = normalizeServiceDestinations(
      guideProfile?.serviceDestinations,
      guideProfile?.price ?? 0
    );
    const initialPrice = getStartingPrice(initialServiceDestinations, guideProfile?.price ?? 0);

    const [edit, setEdit] = useState(false);
    const [form, setForm] = useState({
      name: account?.name || guideProfile?.name || user?.name || '',
      email: account?.email || guideProfile?.email || user?.email || '',
      phone: guideProfile?.phone || account?.phone || user?.phone || '',
      country: account?.country || guideProfile?.country || user?.country || '',
      interests: account?.interests || guideProfile?.interests || user?.interests || '',
      language: languageText,
      bio: guideProfile?.bio || '',
      experienceYears: guideProfile?.experienceYears ?? 0,
      price: initialPrice,
      currency: 'INR',
      rateType: guideProfile?.rateType || 'daily',
      serviceDestinations: initialServiceDestinations,
      acceptManualUpi: Boolean(guideProfile?.acceptManualUpi),
      upiPayeeName: guideProfile?.upiPayeeName || '',
      upiId: guideProfile?.upiId || '',
      advancePaymentType: guideProfile?.advancePaymentType || 'percentage',
      advancePaymentValue: guideProfile?.advancePaymentValue ?? 20,
      advancePaymentNotes: guideProfile?.advancePaymentNotes || '',
      avatar: account?.avatar || guideProfile?.avatar || user?.avatar || '',
    });
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
    const [tourMedia, setTourMedia] = useState(Array.isArray(guideProfile?.tourMedia) ? guideProfile.tourMedia : []);
    const [uploading, setUploading] = useState(false);
    const [paymentQrUploading, setPaymentQrUploading] = useState(false);
    const [paymentQrDeleting, setPaymentQrDeleting] = useState(false);
    const [mediaUploading, setMediaUploading] = useState(false);
    const [mediaDeletingId, setMediaDeletingId] = useState('');
    const [successMsg, setSuccessMsg] = useState('');
    const [errorMsg, setErrorMsg] = useState('');
    const fileInputRef = React.useRef();
    const mediaInputRef = React.useRef();

    useEffect(() => {
      // Prefer avatar from user, fallback to guideProfile.userId.avatar if available
      const profileUser = guideProfile?.userId && typeof guideProfile.userId === 'object'
        ? guideProfile.userId
        : {};
      const avatar = profileUser?.avatar || guideProfile?.avatar || user?.avatar || '';

      const languageName = getLanguagesText(guideProfile?.languages) || guideProfile?.language || '';
      const normalizedServiceDestinations = normalizeServiceDestinations(
        guideProfile?.serviceDestinations,
        guideProfile?.price ?? 0
      );
      const startingPrice = getStartingPrice(normalizedServiceDestinations, guideProfile?.price ?? 0);

      setForm({
        name: profileUser?.name || guideProfile?.name || user?.name || '',
        email: profileUser?.email || guideProfile?.email || user?.email || '',
        phone: guideProfile?.phone || profileUser?.phone || user?.phone || '',
        country: profileUser?.country || guideProfile?.country || user?.country || '',
        interests: profileUser?.interests || guideProfile?.interests || user?.interests || '',
        language: languageName,
        bio: guideProfile?.bio || '',
        experienceYears: guideProfile?.experienceYears ?? 0,
        price: startingPrice,
        currency: 'INR',
        rateType: guideProfile?.rateType || 'daily',
        serviceDestinations: normalizedServiceDestinations,
        acceptManualUpi: Boolean(guideProfile?.acceptManualUpi),
        upiPayeeName: guideProfile?.upiPayeeName || '',
        upiId: guideProfile?.upiId || '',
        advancePaymentType: guideProfile?.advancePaymentType || 'percentage',
        advancePaymentValue: guideProfile?.advancePaymentValue ?? 20,
        advancePaymentNotes: guideProfile?.advancePaymentNotes || '',
        avatar,
      });
      setAvatarPreview(avatar);
      setTourMedia(Array.isArray(guideProfile?.tourMedia) ? guideProfile.tourMedia : []);
    }, [user, guideProfile]);

    const handleChange = e => {
      const { name, value } = e.target;
      setForm({
        ...form,
        [name]: ['price', 'experienceYears', 'advancePaymentValue'].includes(name)
          ? Number(value)
          : name === 'acceptManualUpi'
            ? value === 'true'
            : value
      });
    };

    const updateServiceDestinations = (nextDestinations) => {
      const normalized = Array.isArray(nextDestinations) ? nextDestinations : [];
      const nextPrice = getStartingPrice(normalized, 0);
      setForm((prev) => ({
        ...prev,
        serviceDestinations: normalized,
        price: nextPrice
      }));
    };

    const handleServiceDestinationChange = (index, field) => (event) => {
      const rawValue = event.target.value;
      const current = Array.isArray(form.serviceDestinations) ? [...form.serviceDestinations] : [];
      if (!current[index]) return;

      current[index] = {
        ...current[index],
        [field]: field === 'price' ? rawValue : rawValue
      };
      updateServiceDestinations(current);
    };

    const addServiceDestination = () => {
      const current = Array.isArray(form.serviceDestinations) ? [...form.serviceDestinations] : [];
      if (current.length >= 5) {
        setErrorMsg('You can add up to 5 local destinations.');
        return;
      }
      current.push({ destination: '', price: '' });
      updateServiceDestinations(current);
    };

    const removeServiceDestination = (index) => {
      const current = Array.isArray(form.serviceDestinations) ? [...form.serviceDestinations] : [];
      const next = current.filter((_, idx) => idx !== index);
      updateServiceDestinations(next);
    };

    const handleAvatarChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      setErrorMsg('');
      const formData = new FormData();
      formData.append('avatar', file);
      try {
        const res = await api.post('/guideAvatar/avatar', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        setForm(f => ({ ...f, avatar: res.data.avatar }));
        setAvatarPreview(res.data.avatar);
        setSuccessMsg('Photo updated!');
        // Update user in localStorage so avatar persists after refresh
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const userObj = JSON.parse(storedUser);
          userObj.avatar = res.data.avatar;
          localStorage.setItem('user', JSON.stringify(userObj));
        }
      } catch (err) {
        setErrorMsg('Failed to upload avatar');
      } finally {
        setUploading(false);
      }
    };

    const mediaUrl = (value) => buildMediaUrl(value);
    const paymentQrImageUrl = mediaUrl(guideProfile?.upiQrImage || '');

    const getMediaKind = (item) => {
      const explicitType = item?.mediaType;
      if (explicitType === 'video' || explicitType === 'image') return explicitType;
      const source = String(item?.url || '').toLowerCase();
      return /\.(mp4|webm|mov|m4v|avi|mkv)$/i.test(source) ? 'video' : 'image';
    };

    const handleTourMediaUpload = async (event) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) return;
      setMediaUploading(true);
      setErrorMsg('');
      setSuccessMsg('');
      try {
        const formData = new FormData();
        files.forEach((file) => formData.append('media', file));
        const response = await api.post('/guide/profile/media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data?.guide) {
          setGuideProfile(response.data.guide);
          setTourMedia(Array.isArray(response.data.guide.tourMedia) ? response.data.guide.tourMedia : []);
        }
        setSuccessMsg('Tour media uploaded successfully.');
      } catch (err) {
        console.error('Guide media upload error:', err.response?.data || err.message);
        setErrorMsg(err.response?.data?.message || 'Failed to upload tour media');
      } finally {
        setMediaUploading(false);
        if (mediaInputRef.current) mediaInputRef.current.value = '';
      }
    };

    const handleDeleteTourMedia = async (mediaId) => {
      if (!mediaId) return;
      setMediaDeletingId(mediaId);
      setErrorMsg('');
      setSuccessMsg('');
      try {
        const response = await api.delete(`/guide/profile/media/${mediaId}`);
        if (response.data?.guide) {
          setGuideProfile(response.data.guide);
          setTourMedia(Array.isArray(response.data.guide.tourMedia) ? response.data.guide.tourMedia : []);
        }
        setSuccessMsg('Tour media removed.');
      } catch (err) {
        console.error('Guide media delete error:', err.response?.data || err.message);
        setErrorMsg(err.response?.data?.message || 'Failed to remove media');
      } finally {
        setMediaDeletingId('');
      }
    };

    const handlePaymentQrUpload = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setPaymentQrUploading(true);
      setErrorMsg('');
      setSuccessMsg('');
      try {
        const formData = new FormData();
        formData.append('paymentQr', file);
        const response = await api.post('/guide/profile/payment-qr', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (response.data?.guide) {
          setGuideProfile(response.data.guide);
        }
        setSuccessMsg('Payment QR uploaded successfully.');
      } catch (err) {
        console.error('Guide payment QR upload error:', err.response?.data || err.message);
        setErrorMsg(err.response?.data?.message || 'Failed to upload payment QR');
      } finally {
        setPaymentQrUploading(false);
        event.target.value = '';
      }
    };

    const handleDeletePaymentQr = async () => {
      setPaymentQrDeleting(true);
      setErrorMsg('');
      setSuccessMsg('');
      try {
        const response = await api.delete('/guide/profile/payment-qr');
        if (response.data?.guide) {
          setGuideProfile(response.data.guide);
        }
        setSuccessMsg('Payment QR removed. Advance payment has been disabled.');
      } catch (err) {
        console.error('Guide payment QR delete error:', err.response?.data || err.message);
        setErrorMsg(err.response?.data?.message || 'Failed to remove payment QR');
      } finally {
        setPaymentQrDeleting(false);
      }
    };

    const handleSubmit = async e => {
      e.preventDefault();
      setErrorMsg('');
      setSuccessMsg('');
      try {
        const selectedLanguages = form.language
          .split(/[\n,]+/)
          .map((language) => language.trim())
          .filter(Boolean);

        if (selectedLanguages.length === 0) {
          setErrorMsg('Please enter at least one language');
          return;
        }

        const normalizedServiceDestinations = (Array.isArray(form.serviceDestinations) ? form.serviceDestinations : [])
          .map((item) => ({
            destination: String(item?.destination || '').trim(),
            price: Number(item?.price || 0)
          }))
          .filter((item) => item.destination);

        const uniqueDestinations = [];
        const seenDestinations = new Set();
        normalizedServiceDestinations.forEach((item) => {
          const key = item.destination.toLowerCase();
          if (seenDestinations.has(key)) return;
          seenDestinations.add(key);
          uniqueDestinations.push(item);
        });

        if (uniqueDestinations.length === 0) {
          setErrorMsg('Add at least one local destination with price.');
          return;
        }
        if (uniqueDestinations.length > 5) {
          setErrorMsg('You can add up to 5 local destinations.');
          return;
        }
        const invalidDestination = uniqueDestinations.find((item) => !Number.isFinite(item.price) || item.price <= 0);
        if (invalidDestination) {
          setErrorMsg('Each destination must have a valid price greater than 0.');
          return;
        }

        const startingPrice = getStartingPrice(uniqueDestinations, form.price);

        const payload = {
          name: form.name,
          bio: form.bio,
          languages: selectedLanguages,
          phone: form.phone,
          country: form.country,
          interests: form.interests,
          experienceYears: Number(form.experienceYears) || 0,
          price: Number(startingPrice) || 0,
          currency: 'INR',
          rateType: form.rateType,
          serviceDestinations: uniqueDestinations.map((item) => ({
            destination: item.destination,
            price: Math.round(item.price)
          })),
          acceptManualUpi: Boolean(form.acceptManualUpi),
          upiPayeeName: form.upiPayeeName,
          upiId: form.upiId,
          advancePaymentType: form.advancePaymentType,
          advancePaymentValue: Number(form.advancePaymentValue) || 0,
          advancePaymentNotes: form.advancePaymentNotes,
        };
        const response = await api.put('/guide/profile', payload);
        if (response.data.guide) {
          setGuideProfile(response.data.guide);
        }
        if (response.data.user) {
          const mergedUser = {
            ...(user || {}),
            ...response.data.user,
            _id: response.data.user._id || user?._id,
            role: response.data.user.role || user?.role,
          };
          setUser(mergedUser);
          localStorage.setItem('user', JSON.stringify(mergedUser));
        }
        setSuccessMsg('Profile updated!');
      } catch (err) {
        console.error('Update error:', err.response?.data || err.message);
        setErrorMsg(err.response?.data?.message || 'Failed to update profile');
      }
    };

    const inputSx = {
      '& .MuiOutlinedInput-root': {
        bgcolor: '#f8f8f2',
      },
    };
    const fieldLabelSx = { fontWeight: 700, mb: 0.75, color: '#1f2937' };
    const avatarSrc = avatarPreview
      ? toAbsoluteAssetUrl(avatarPreview)
      : '/avatar.png';

    return (
      <Box
        sx={{
          width: '100%',
          maxWidth: 1240,
          mx: 'auto',
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '320px minmax(0, 1fr)' },
          gap: { xs: 2.5, md: 3 },
          alignItems: 'start',
        }}
      >
        <Box
          sx={{
            bgcolor: '#fafaf6',
            p: { xs: 2.5, md: 3 },
            borderRadius: 4,
            boxShadow: 2,
            border: '1px solid #e7e5db',
            position: { lg: 'sticky' },
            top: { lg: 96 },
          }}
        >
          <Typography variant="h5" fontWeight={800} mb={0.75}>My Profile</Typography>
          <Typography variant="body2" color="text.secondary" mb={2.5}>
            Manage your account settings and pricing details.
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.6 }}>
            <Box
              component="img"
              src={avatarSrc}
              alt="Avatar"
              sx={{
                width: 112,
                height: 112,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '3px solid #dbe3ef',
                boxShadow: '0 10px 24px rgba(15, 23, 42, 0.12)',
              }}
            />
            <Button
              variant="outlined"
              component="label"
              disabled={uploading}
              sx={{ width: '100%', textTransform: 'none', fontWeight: 700 }}
            >
              {uploading ? 'Uploading...' : 'Change photo'}
              <input
                type="file"
                accept="image/*"
                hidden
                ref={fileInputRef}
                onChange={handleAvatarChange}
              />
            </Button>
          </Box>

          <Box sx={{ mt: 2.5, display: 'grid', gap: 1.25 }}>
            <Box sx={{ p: 1.2, borderRadius: 1.6, bgcolor: '#fff', border: '1px solid #e3e8ef' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>Email</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b', wordBreak: 'break-word' }}>
                {form.email || 'Not provided'}
              </Typography>
            </Box>
            <Box sx={{ p: 1.2, borderRadius: 1.6, bgcolor: '#fff', border: '1px solid #e3e8ef' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>Experience</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {Number(form.experienceYears || 0)} years
              </Typography>
            </Box>
            <Box sx={{ p: 1.2, borderRadius: 1.6, bgcolor: '#fff', border: '1px solid #e3e8ef' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>Starting Rate</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#1e293b' }}>
                INR {Number(form.price || 0)} / {form.rateType === 'hourly' ? 'hour' : 'day'}
              </Typography>
            </Box>
            <Box sx={{ p: 1.2, borderRadius: 1.6, bgcolor: '#fff', border: '1px solid #e3e8ef' }}>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700 }}>Advance Payments</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: form.acceptManualUpi ? '#166534' : '#92400e' }}>
                {form.acceptManualUpi ? 'Enabled' : 'Disabled'}
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
            bgcolor: '#fafaf6',
            p: { xs: 2.5, md: 3.25 },
            borderRadius: 4,
            boxShadow: 2,
            border: '1px solid #e7e5db',
          }}
        >
          {successMsg && (
            <Box
              sx={{
                mb: 2,
                p: 1.2,
                borderRadius: 1.6,
                border: '1px solid #86efac',
                bgcolor: '#f0fdf4',
                color: '#166534',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              {successMsg}
            </Box>
          )}
          {errorMsg && (
            <Box
              sx={{
                mb: 2,
                p: 1.2,
                borderRadius: 1.6,
                border: '1px solid #fca5a5',
                bgcolor: '#fef2f2',
                color: '#b91c1c',
                fontWeight: 700,
                fontSize: '0.9rem',
              }}
            >
              {errorMsg}
            </Box>
          )}

          <form onSubmit={handleSubmit}>
            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
              }}
            >
              <Box>
                <Typography sx={fieldLabelSx}><ProfileIcon sx={{ mr: 0.8, verticalAlign: 'middle', fontSize: '1rem' }} /> Full Name</Typography>
                <TextField fullWidth name="name" value={form.name} onChange={handleChange} sx={inputSx} />
              </Box>
              <Box>
                <Typography sx={fieldLabelSx}>Email Address</Typography>
                <TextField fullWidth name="email" value={form.email} disabled sx={inputSx} />
                <Typography variant="caption" color="text.secondary">Email cannot be changed</Typography>
              </Box>
              <Box>
                <Typography sx={fieldLabelSx}>Phone Number</Typography>
                <TextField fullWidth name="phone" value={form.phone} onChange={handleChange} sx={inputSx} />
              </Box>
              <Box>
                <Typography sx={fieldLabelSx}>Country</Typography>
                <TextField fullWidth name="country" value={form.country} onChange={handleChange} sx={inputSx} />
              </Box>
              <Box>
                <Typography sx={fieldLabelSx}>Interests</Typography>
                <TextField fullWidth name="interests" value={form.interests} onChange={handleChange} sx={inputSx} />
              </Box>
              <Box>
                <Typography sx={fieldLabelSx}>Known Languages</Typography>
                <TextField
                  fullWidth
                  name="language"
                  value={form.language}
                  onChange={handleChange}
                  placeholder="Hindi, English, Spanish"
                  helperText="Separate multiple languages with commas."
                  sx={inputSx}
                />
              </Box>
              <Box>
                <Typography sx={fieldLabelSx}>Experience (years)</Typography>
                <TextField
                  fullWidth
                  type="number"
                  name="experienceYears"
                  value={form.experienceYears}
                  onChange={handleChange}
                  inputProps={{ min: 0, step: 1 }}
                  sx={inputSx}
                />
              </Box>
              <Box sx={{ gridColumn: { xs: '1 / -1', md: '1 / -1' } }}>
                <Typography sx={fieldLabelSx}>Bio</Typography>
                <TextField fullWidth name="bio" value={form.bio} onChange={handleChange} multiline rows={3} sx={inputSx} />
              </Box>
            </Box>

            <Box sx={{ bgcolor: '#f3f7fb', p: { xs: 2, md: 2.5 }, borderRadius: 2, border: '1px solid #d9e4f5', mt: 2.4 }}>
              <Typography fontWeight={800} mb={1.7} sx={{ fontSize: '1rem', color: '#1f2937' }}>
                Pricing Settings
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', sm: '180px 120px auto' },
                }}
              >
                <TextField
                  select
                  label="Rate Type"
                  name="rateType"
                  value={form.rateType}
                  onChange={handleChange}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                >
                  <MenuItem value="hourly">Hour</MenuItem>
                  <MenuItem value="daily">Day</MenuItem>
                </TextField>
                <TextField
                  select
                  label="Currency"
                  name="currency"
                  value="INR"
                  disabled
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                >
                  <MenuItem value="INR">INR</MenuItem>
                </TextField>
                <Button
                  variant="outlined"
                  onClick={addServiceDestination}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  + Add Destination
                </Button>
              </Box>

              <Box sx={{ mt: 1.5, display: 'grid', gap: 1 }}>
                {(Array.isArray(form.serviceDestinations) ? form.serviceDestinations : []).map((item, index) => (
                  <Box
                    key={`${item?._id || 'new'}_${index}`}
                    sx={{
                      display: 'grid',
                      gap: 1,
                      gridTemplateColumns: { xs: '1fr', sm: 'minmax(0, 1fr) 150px auto' },
                      alignItems: 'center',
                    }}
                  >
                    <TextField
                      label={`Destination ${index + 1}`}
                      value={item?.destination || ''}
                      onChange={handleServiceDestinationChange(index, 'destination')}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                      placeholder="e.g., Kolhapur"
                    />
                    <TextField
                      label="Price (INR)"
                      type="number"
                      value={item?.price ?? ''}
                      onChange={handleServiceDestinationChange(index, 'price')}
                      inputProps={{ min: 1, step: 1 }}
                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                    />
                    <Button
                      variant="text"
                      color="error"
                      onClick={() => removeServiceDestination(index)}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      Remove
                    </Button>
                  </Box>
                ))}
              </Box>

              <Box sx={{ bgcolor: '#e8f5e9', p: 1.35, borderRadius: 1.5, border: '1px solid #81c784', mt: 1.5 }}>
                <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 700 }}>
                  Starting rate: INR {Number(form.price || 0)} per {form.rateType === 'hourly' ? 'hour' : 'day'} (based on your destination-wise pricing)
                </Typography>
                <Typography variant="caption" sx={{ color: '#2e7d32', display: 'block', mt: 0.4 }}>
                  Add up to 5 local destinations. Tourists can book you only for these destinations.
                </Typography>
              </Box>
            </Box>

            <Box sx={{ bgcolor: '#f8fafc', p: { xs: 2, md: 2.5 }, borderRadius: 2, border: '1px solid #d7e3f3', mt: 2.4 }}>
              <Typography fontWeight={800} mb={0.75} sx={{ fontSize: '1rem', color: '#1f2937' }}>
                UPI Advance Payments
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1.7}>
                Tourists will pay only the advance amount online using your UPI QR or UPI ID. They can pay the remaining amount directly during the tour.
              </Typography>

              <Box
                sx={{
                  display: 'grid',
                  gap: 1.5,
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
                }}
              >
                <TextField
                  select
                  label="Advance Payment Mode"
                  name="acceptManualUpi"
                  value={String(Boolean(form.acceptManualUpi))}
                  onChange={handleChange}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                >
                  <MenuItem value="false">Disabled</MenuItem>
                  <MenuItem value="true">Enabled</MenuItem>
                </TextField>
                <TextField
                  label="UPI Payee Name"
                  name="upiPayeeName"
                  value={form.upiPayeeName}
                  onChange={handleChange}
                  placeholder="Guide Name"
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                />
                <TextField
                  label="UPI ID"
                  name="upiId"
                  value={form.upiId}
                  onChange={handleChange}
                  placeholder="name@bank"
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                />
                <TextField
                  select
                  label="Advance Type"
                  name="advancePaymentType"
                  value={form.advancePaymentType}
                  onChange={handleChange}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                >
                  <MenuItem value="percentage">Percentage of booking</MenuItem>
                  <MenuItem value="fixed">Fixed amount</MenuItem>
                </TextField>
                <TextField
                  label={form.advancePaymentType === 'percentage' ? 'Advance Percentage' : 'Advance Amount'}
                  name="advancePaymentValue"
                  value={form.advancePaymentValue}
                  onChange={handleChange}
                  type="number"
                  inputProps={{
                    min: 1,
                    max: form.advancePaymentType === 'percentage' ? 100 : undefined,
                    step: 1,
                  }}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                />
                <TextField
                  label="Guide Notes for Tourist"
                  name="advancePaymentNotes"
                  value={form.advancePaymentNotes}
                  onChange={handleChange}
                  placeholder="Example: Please mention destination name in the UPI note."
                  multiline
                  minRows={2}
                  sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff' } }}
                />
              </Box>

              <Box sx={{ mt: 2, display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', md: '1fr auto' }, alignItems: 'start' }}>
                <Box sx={{ bgcolor: '#fff', border: '1px solid #dbe3ef', borderRadius: 2, p: 2 }}>
                  <Typography variant="subtitle2" fontWeight={800} mb={1}>
                    Payment QR
                  </Typography>
                  <Typography variant="body2" color="text.secondary" mb={1.5}>
                    Upload the QR that tourists can scan in Google Pay, PhonePe, Paytm, or any UPI app.
                  </Typography>
                  <Button
                    variant="outlined"
                    component="label"
                    disabled={paymentQrUploading}
                    sx={{ textTransform: 'none', fontWeight: 700, mr: 1 }}
                  >
                    {paymentQrUploading ? 'Uploading...' : 'Upload QR Image'}
                    <input
                      type="file"
                      accept="image/*"
                      hidden
                      onChange={handlePaymentQrUpload}
                    />
                  </Button>
                  {guideProfile?.upiQrImage && (
                    <Button
                      variant="text"
                      color="error"
                      disabled={paymentQrDeleting}
                      onClick={handleDeletePaymentQr}
                      sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                      {paymentQrDeleting ? 'Removing...' : 'Remove QR'}
                    </Button>
                  )}
                </Box>

                <Box sx={{ bgcolor: '#fff', border: '1px solid #dbe3ef', borderRadius: 2, p: 1.5, minWidth: { md: 220 } }}>
                  {paymentQrImageUrl ? (
                    <Box
                      component="img"
                      src={paymentQrImageUrl}
                      alt="Guide payment QR"
                      sx={{ width: '100%', maxWidth: 220, aspectRatio: '1 / 1', objectFit: 'cover', borderRadius: 1.5, display: 'block', mx: 'auto' }}
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No QR uploaded yet.
                    </Typography>
                  )}
                </Box>
              </Box>

              <Box sx={{ bgcolor: form.acceptManualUpi ? '#ecfdf3' : '#fff7ed', p: 1.35, borderRadius: 1.5, border: `1px solid ${form.acceptManualUpi ? '#86efac' : '#fdba74'}`, mt: 1.7 }}>
                <Typography variant="body2" sx={{ color: form.acceptManualUpi ? '#166534' : '#9a3412', fontWeight: 700 }}>
                  {form.acceptManualUpi
                    ? `Advance collection is enabled. Tourists will pay ${form.advancePaymentType === 'percentage' ? `${Number(form.advancePaymentValue || 0)}%` : `INR ${Number(form.advancePaymentValue || 0)}`} before you confirm the booking.`
                    : 'Advance collection is disabled. Enable it only after you add a valid UPI ID, payee name, and QR.'}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ bgcolor: '#f5f7ff', p: { xs: 2, md: 2.5 }, borderRadius: 2, border: '1px solid #dbe3ff', mt: 2.4 }}>
              <Typography fontWeight={800} mb={0.75} sx={{ fontSize: '1rem', color: '#1f2937' }}>
                Completed Tour Photos and Videos
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1.7}>
                Upload real highlights from completed tours so tourists can preview your work.
              </Typography>

              <Button
                variant="outlined"
                component="label"
                disabled={mediaUploading}
                sx={{ mb: 1.25 }}
              >
                {mediaUploading ? 'Uploading media...' : 'Upload photos or videos'}
                <input
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  hidden
                  ref={mediaInputRef}
                  onChange={handleTourMediaUpload}
                />
              </Button>

              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.4 }}>
                Supported: images and videos. You can select multiple files at once.
              </Typography>

              {tourMedia.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No tour media uploaded yet.
                </Typography>
              ) : (
                <Box
                  sx={{
                    display: 'grid',
                    gap: 1.2,
                    gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
                  }}
                >
                  {tourMedia.map((item) => {
                    const mediaId = String(item?._id || '');
                    const kind = getMediaKind(item);
                    const src = mediaUrl(item?.url || '');
                    return (
                      <Box
                        key={mediaId || src}
                        sx={{
                          border: '1px solid #d6deed',
                          borderRadius: 1.5,
                          overflow: 'hidden',
                          bgcolor: '#fff',
                        }}
                      >
                        {kind === 'video' ? (
                          <Box
                            component="video"
                            src={src}
                            controls
                            preload="metadata"
                            sx={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <Box
                            component="img"
                            src={src}
                            alt="Completed tour media"
                            sx={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }}
                          />
                        )}
                        <Box sx={{ p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155' }}>
                            {kind === 'video' ? 'Video' : 'Photo'}
                          </Typography>
                          <Button
                            size="small"
                            color="error"
                            disabled={mediaDeletingId === mediaId}
                            onClick={() => handleDeleteTourMedia(mediaId)}
                            sx={{ minWidth: 0, px: 1, fontSize: '0.72rem' }}
                          >
                            {mediaDeletingId === mediaId ? 'Removing...' : 'Remove'}
                          </Button>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>

            <Box sx={{ mt: 2.4, display: 'flex', justifyContent: { xs: 'stretch', md: 'flex-end' } }}>
              <Button
                type="submit"
                variant="contained"
                color="success"
                sx={{
                  borderRadius: 8,
                  py: 1.3,
                  px: 4,
                  fontWeight: 800,
                  fontSize: 16,
                  width: { xs: '100%', md: 'auto' },
                  minWidth: { md: 220 },
                }}
              >
                Save Changes
              </Button>
            </Box>
          </form>
        </Box>
      </Box>
    );
  };

  const SettingsPage = () => (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3}>⚙️ Settings</Typography>
      <Box sx={{ maxWidth: 600 }}>
        <Box sx={{ p: 4, bgcolor: '#fff', borderRadius: 3, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', border: '1px solid #f0f0f0', mb: 3 }}>
          <Typography variant="subtitle1" fontWeight={700} mb={3}>Account Settings</Typography>

          <Box mb={3}>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>Notifications</Typography>
            <Typography variant="body2" color="text.secondary">Manage how we communicate with you</Typography>
          </Box>

          <Box mb={3} pb={3} borderBottom="1px solid #e5e7eb">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 1.2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>Email Notifications</Typography>
                <Typography variant="caption" color="text.secondary">Receive updates about bookings</Typography>
              </Box>
              <Button size="small" variant="outlined">Enable</Button>
            </Box>
          </Box>

          <Box mb={3} pb={3} borderBottom="1px solid #e5e7eb">
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: 2, gap: 1.2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>SMS Alerts</Typography>
                <Typography variant="caption" color="text.secondary">Get instant alerts on your phone</Typography>
              </Box>
              <Button size="small" variant="outlined">Configure</Button>
            </Box>
          </Box>

          <Box mb={3}>
            <Typography variant="subtitle2" fontWeight={700} mb={3}>Security</Typography>
            <Button fullWidth variant="outlined" sx={{ mb: 2, justifyContent: 'flex-start' }}>
              🔐 Change Password
            </Button>
            <Button fullWidth variant="outlined" sx={{ justifyContent: 'flex-start' }}>
              🔑 Two-Factor Authentication
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );

  const handleOpenChatFromBooking = (booking) => {
    const touristId = booking?.touristId?._id || booking?.touristId;
    if (!touristId) return;
    setChatOpenRequest({
      touristId: String(touristId),
      token: Date.now(),
    });
    setSelected('Messages');
  };

  const handleSectionSelect = (sectionLabel) => {
    setSelected(sectionLabel);
    if (isMobile) {
      setMobileDrawerOpen(false);
    }
  };

  const handleGuideTouristsChange = (tourists = []) => {
    const totalUnread = tourists.reduce((sum, tourist) => sum + Number(tourist?.unreadCount || 0), 0);
    setGuideChatUnreadCount(totalUnread);
  };

  const pageMap = {
    Dashboard: <DashboardPage user={user} bookings={bookings} guideProfile={guideProfile} guideReviews={guideReviews} tours={tours} />,
    'My Tours': <GuideTourManager tours={tours} bookings={bookings} onToursChange={setTours} onRefreshTours={fetchGuideData} />,
    Bookings: <BookingsPage bookings={bookings} refreshBookings={fetchGuideData} onOpenChat={handleOpenChatFromBooking} />,
    Calendar: <CalendarPage />,
    Messages: <MessagesPage user={user} preselectedTouristId={chatOpenRequest.touristId} preselectToken={chatOpenRequest.token} onTouristsChange={handleGuideTouristsChange} />,
    Earnings: <EarningsPage bookings={bookings} />,
    Reviews: <ReviewsPage user={user} guideProfile={guideProfile} />,
    Profile: <ProfilePage />,
    Settings: <SettingsPage />,
  };

  // Loading state
  if (!user) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Typography variant="h5">Loading user...</Typography>
      </Box>
    );
  }

  // Error/fallback state
  if (!pageMap[selected]) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <Typography variant="h5" color="error">Invalid dashboard section: {selected}</Typography>
      </Box>
    );
  }

  const desktopDrawerWidth = open ? drawerWidth : collapsedDrawerWidth;
  const contentOffset = isMobile ? 0 : desktopDrawerWidth;
  const drawerExpanded = isMobile ? true : open;
  const avatarLetter = (user?.name || 'G').charAt(0).toUpperCase();
  const drawerContent = (
    <>
      <Box sx={{ px: drawerExpanded ? 2.25 : 1.25, py: 2.5, minHeight: 88, borderBottom: '1px solid rgba(148, 163, 184, 0.16)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: drawerExpanded ? 'flex-start' : 'center' }}>
          <Avatar sx={{ width: 42, height: 42, bgcolor: guideColors.accent, color: guideColors.ink, fontWeight: 900, boxShadow: '0 8px 18px rgba(23, 35, 38, 0.2)' }}>
            {avatarLetter}
          </Avatar>
          {drawerExpanded && (
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 900, lineHeight: 1.2 }} noWrap>
                {user?.name || 'Guide'}
              </Typography>
              <Typography variant="caption" sx={{ color: guideColors.sidebarMuted, fontWeight: 700 }}>
                Guide Dashboard
              </Typography>
            </Box>
          )}
        </Box>
      </Box>
      <List sx={{ px: 1.25, py: 2 }}>
        {navItems.map((item) => (
          <ListItem key={item.label} disablePadding sx={{ display: 'block' }}>
            <ListItemButton
              sx={{
                minHeight: 48,
                justifyContent: drawerExpanded ? 'initial' : 'center',
                px: 2.5,
                borderRadius: 2.5,
                my: 0.65,
                color: selected === item.label ? guideColors.ink : guideColors.sidebarText,
                background: selected === item.label ? guideColors.activeNavBackground : 'transparent',
                boxShadow: selected === item.label ? '0 10px 22px rgba(23, 35, 38, 0.16)' : 'none',
                transition: 'background 0.2s, color 0.2s, box-shadow 0.2s',
                '&:hover': {
                  bgcolor: selected === item.label ? undefined : 'rgba(216, 231, 225, 0.16)',
                },
              }}
              selected={selected === item.label}
              onClick={() => handleSectionSelect(item.label)}
            >
              <ListItemIcon sx={{ minWidth: 0, mr: drawerExpanded ? 2 : 'auto', justifyContent: 'center', color: 'inherit' }}>
                {item.label === 'Messages' ? (
                  <Badge color="error" badgeContent={guideChatUnreadCount} overlap="circular">
                    {item.icon}
                  </Badge>
                ) : (
                  item.icon
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.label}
                primaryTypographyProps={{ fontWeight: selected === item.label ? 900 : 700, fontSize: 14 }}
                sx={{ opacity: drawerExpanded ? 1 : 0, transition: 'opacity 0.2s' }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </>
  );

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: 'flex',
          minHeight: '100vh',
          bgcolor: 'background.default',
          background: guideColors.pageBackground,
          position: 'relative',
          fontFamily: guideDashboardFont,
        }}
      >
        <CssBaseline />
        {/* Desktop Sidebar */}
        {!isMobile && (
          <Drawer variant="permanent" open={open} sx={{ position: 'fixed', left: 0, top: 0, height: '100vh', zIndex: 1200 }}>
            {drawerContent}
          </Drawer>
        )}
        {/* Mobile Sidebar */}
        {isMobile && (
          <MuiDrawer
            variant="temporary"
            open={mobileDrawerOpen}
            onClose={() => setMobileDrawerOpen(false)}
            ModalProps={{ keepMounted: true }}
            sx={{
              display: { xs: 'block', md: 'none' },
              '& .MuiDrawer-paper': {
                width: { xs: '86vw', sm: 320 },
                maxWidth: drawerWidth,
                boxSizing: 'border-box',
                background: guideColors.sidebarBackground,
                color: guideColors.sidebarText,
                borderRight: '1px solid rgba(237, 247, 242, 0.12)',
                boxShadow: '14px 0 30px rgba(23, 35, 38, 0.2)',
              },
            }}
          >
            {drawerContent}
          </MuiDrawer>
        )}
        {/* Main Content */}
        <Box sx={{ flex: 1, marginLeft: isMobile ? 0 : `${desktopDrawerWidth}px`, width: isMobile ? '100%' : `calc(100% - ${desktopDrawerWidth}px)`, minHeight: '100vh', display: 'flex', flexDirection: 'column', transition: theme.transitions.create(['margin-left', 'width'], { duration: theme.transitions.duration.shorter }) }}>
          <AppBar
            position="fixed"
            open={open}
            elevation={0}
            color="inherit"
            sx={{
              marginLeft: 0,
              left: `${contentOffset}px`,
              width: isMobile ? '100%' : `calc(100% - ${contentOffset}px)`,
              backdropFilter: 'blur(18px)',
              background: glassBg(theme),
              borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
              boxShadow: '0 12px 34px rgba(15, 23, 42, 0.06)',
              transition: theme.transitions.create(['left', 'width'], { duration: theme.transitions.duration.shorter }),
            }}
          >
            <Toolbar sx={{ minHeight: 76, px: { xs: 2, md: 4 } }}>
              <IconButton
                color="inherit"
                aria-label="open drawer"
                onClick={() => {
                  if (isMobile) {
                    setMobileDrawerOpen(true);
                  } else {
                    setOpen(!open);
                  }
                }}
                edge="start"
                sx={{ mr: 2 }}
              >
                {isMobile ? <MenuIcon /> : open ? <ChevronLeftIcon /> : <MenuIcon />}
              </IconButton>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 900, color: guideColors.ink }}>
                  {selected}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                  Guide Dashboard
                </Typography>
              </Box>
              <Tooltip title="Profile">
                <Avatar sx={{ bgcolor: 'primary.main', boxShadow: '0 8px 20px rgba(47,111,104,0.22)', fontWeight: 900 }}>
                  {avatarLetter}
                </Avatar>
              </Tooltip>
            </Toolbar>
          </AppBar>
          <Main open={open} sx={{ pt: 12, px: { xs: 2, md: 4 }, maxWidth: '1680px', width: '100%', mx: 'auto', marginLeft: 0 }}>
            {isMobile && (
              <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', pb: 1, mb: 2, pr: 1, '&::-webkit-scrollbar': { display: 'none' }, scrollbarWidth: 'none' }}>
                {navItems.map((item) => (
                  <Button
                    key={item.label}
                    variant={selected === item.label ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => handleSectionSelect(item.label)}
                    sx={{
                      flexShrink: 0,
                      textTransform: 'none',
                      borderRadius: 999,
                      fontWeight: 700,
                      px: 1.75,
                      py: 0.6,
                      minHeight: 34,
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Box>
            )}
            {pageMap[selected]}
          </Main>
        </Box>
      </Box>
    </ThemeProvider>
  );
}





