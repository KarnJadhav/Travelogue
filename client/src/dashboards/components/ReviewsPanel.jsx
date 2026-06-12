// ReviewsPanel.jsx - Reviews & Ratings UI for guides
import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Rating from '@mui/material/Rating';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import RefreshIcon from '@mui/icons-material/Refresh';
import api from '../../api';

export default function ReviewsPanel({ refreshTrigger = 0, onReviewSubmitted = () => {} }) {
  const [guides, setGuides] = useState([]);
  const [selectedGuide, setSelectedGuide] = useState(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [search, setSearch] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [availableToReview, setAvailableToReview] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [agentPrefill, setAgentPrefill] = useState(null);

  // Fetch guides where tour is completed and review request is accepted
  useEffect(() => {
    fetchBookedGuides();
  }, [refreshTrigger]);

  useEffect(() => {
    const handleAgentReviewPrefill = (event) => {
      setAgentPrefill(event?.detail || null);
    };
    window.addEventListener('agentReviewPrefill', handleAgentReviewPrefill);
    return () => window.removeEventListener('agentReviewPrefill', handleAgentReviewPrefill);
  }, []);

  const fetchBookedGuides = async () => {
    setIsFetching(true);
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      if (!user._id) {
        setGuides([]);
        setAvailableToReview(false);
        setIsFetching(false);
        return;
      }
      
      console.log('[ReviewsPanel] Fetching booked guides for tourist:', user._id);
      
      // Get bookings for this tourist
      const bookingsRes = await api.get(`/booking/tourist/${user._id}`);
      const bookings = bookingsRes.data.bookings || [];
      
      console.log('[ReviewsPanel] All bookings:', bookings.map(b => ({
        _id: b._id,
        status: b.status,
        reviewRequestSent: b.reviewRequestSent,
        reviewRequestStatus: b.reviewRequestStatus,
        reviewSubmitted: b.reviewSubmitted,
        guideName: b.guideId?.name || 'Unknown'
      })));
      
      // Only consider completed bookings where tourist accepted review request
      const eligibleBookings = bookings.filter(b => 
        b.status === 'completed' && 
        b.reviewRequestSent && 
        b.reviewRequestStatus === 'accepted' &&
        !b.reviewSubmitted
      );
      
      console.log('[ReviewsPanel] Eligible bookings after filter:', eligibleBookings.length);
      
      if (eligibleBookings.length === 0) {
        console.log('[ReviewsPanel] No eligible guides found');
        setGuides([]);
        setSelectedGuide(null);
        setAvailableToReview(false);
        setIsFetching(false);
        return;
      }
      
      // Extract unique guide IDs from eligible bookings
      const guideUserIds = [...new Set(eligibleBookings.map(b => {
        const guideId = b.guideId?._id || b.guideId;
        return typeof guideId === 'string' ? guideId : guideId?.toString();
      }))];
      
      console.log('[ReviewsPanel] Unique guide IDs:', guideUserIds);
      
      // Get all guides
      const guidesRes = await api.get('/guide');
      const allGuides = guidesRes.data.guides || [];
      
      console.log('[ReviewsPanel] All guides fetched:', allGuides.length);
      
      // Filter only guides that are in the user's eligible bookings
      const realGuides = allGuides
        .filter(g => {
          const guideUserId = (g.userId?._id || g.userId || '').toString();
          return guideUserIds.some(id => id.toString() === guideUserId);
        })
        .map(g => {
          const booking = eligibleBookings.find(b => {
            const bGuideId = (b.guideId?._id || b.guideId || '').toString();
            const gUserId = (g.userId?._id || g.userId || '').toString();
            return bGuideId === gUserId;
          });
          return {
            _id: g._id,
            userId: (g.userId?._id || g.userId || '').toString(),
            name: g.userId?.name || g.name,
            avatar: g.userId?.avatar || g.avatar || 'https://randomuser.me/api/portraits/men/1.jpg',
            rating: g.ratings || 0,
            reviews: 0,
            bookingId: booking?._id,
            destination: booking?.destination || 'Tour'
          };
        });
      
      console.log('[ReviewsPanel] Eligible guides found:', realGuides.length, realGuides);
      
      setGuides(realGuides);
      setAvailableToReview(realGuides.length > 0);
      
      if (realGuides.length > 0) {
        setSelectedGuide(realGuides[0]);
      } else {
        setSelectedGuide(null);
      }
      
    } catch (err) {
      console.error('[ReviewsPanel] Error fetching booked guides:', err);
      setGuides([]);
      setAvailableToReview(false);
    } finally {
      setIsFetching(false);
    }
  };

  // Fetch reviews for selected guide
  useEffect(() => {
    async function fetchReviews() {
      if (!selectedGuide) return;
      try {
        const res = await api.get(`/review/guide/${selectedGuide.userId}/reviews`);
        setReviews(res.data.reviews || []);
      } catch (err) {
        console.error('[ReviewsPanel] Error fetching reviews:', err);
        setReviews([]);
      }
    }
    fetchReviews();
  }, [selectedGuide]);

  useEffect(() => {
    if (!agentPrefill || !guides.length) return;

    const requestedGuideName = (agentPrefill.guideName || '').toLowerCase();
    const matchedGuide =
      guides.find((guide) => guide.name?.toLowerCase().includes(requestedGuideName)) || guides[0];

    if (matchedGuide) {
      setSelectedGuide(matchedGuide);
    }
    if (agentPrefill.rating) {
      setRating(agentPrefill.rating);
    }
    if (agentPrefill.comment) {
      setReview(agentPrefill.comment);
    }
  }, [agentPrefill, guides]);

  const handleSubmit = async () => {
    if (!selectedGuide || !rating || !review.trim()) {
      alert('Please provide a rating and comment');
      return;
    }
    
    setLoading(true);
    try {
      console.log('[ReviewsPanel] Submitting review:', {
        guideId: selectedGuide.userId,
        bookingId: selectedGuide.bookingId,
        rating,
        comment: review
      });

      await api.post('/review', {
        guideId: selectedGuide.userId,
        bookingId: selectedGuide.bookingId,
        place: selectedGuide.destination,
        rating,
        comment: review
      });
      
      alert('✅ Review submitted successfully! Thank you for your feedback.');
      
      onReviewSubmitted();
      window.dispatchEvent(new CustomEvent('guideReviewsUpdated', {
        detail: { guideId: selectedGuide.userId },
      }));

      // Remove reviewed guide from list
      const updatedGuides = guides.filter(g => g.userId !== selectedGuide.userId);
      setGuides(updatedGuides);
      setRating(0);
      setReview('');
      
      if (updatedGuides.length > 0) {
        setSelectedGuide(updatedGuides[0]);
      } else {
        setSelectedGuide(null);
        setAvailableToReview(false);
      }
      
    } catch (err) {
      console.error('[ReviewsPanel] Error submitting review:', err);
      alert('Failed to submit review: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h3" fontWeight={700} mb={1}>
            Reviews & Ratings
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Share your experience with guides who completed your tours
          </Typography>
        </Box>
        <Button
          startIcon={<RefreshIcon />}
          onClick={fetchBookedGuides}
          disabled={isFetching}
          variant="outlined"
          sx={{ borderRadius: 2 }}
        >
          {isFetching ? <CircularProgress size={20} /> : 'Refresh'}
        </Button>
      </Box>

      {/* Loading State */}
      {isFetching && guides.length === 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      )}

      {/* No Guides Available */}
      {!isFetching && !availableToReview && (
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
            📬 No guides available for review at this moment
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mb: 2 }}>
            To leave a review, your tour must be completed by the guide, and you must accept the review request through your notifications. 
          </Typography>
          <Typography variant="caption" color="textSecondary" sx={{ display: 'block' }}>
            Steps: 1️⃣ Check your notifications in the header bell icon 2️⃣ Click "Accept" on tour completion requests 3️⃣ Come back here to write reviews
          </Typography>
        </Alert>
      )}

      {/* Guides Available for Review */}
      {!isFetching && availableToReview && (
        <>
          <Box sx={{ mb: 4, p: 3, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #86efac' }}>
            <Typography variant="body2" sx={{ color: '#166534', fontWeight: 600 }}>
              ✅ {guides.length} guide{guides.length > 1 ? 's' : ''} ready for review!
            </Typography>
          </Box>

          <Typography fontWeight={600} mb={2} sx={{ fontSize: 16 }}>
            📋 Select a Guide to Review
          </Typography>

          {/* Search Box */}
          <Box sx={{ maxWidth: 340, mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Search guide by name..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              size="small"
              sx={{ bgcolor: '#fff', borderRadius: 2 }}
            />
          </Box>

          {/* Guide Selection Cards */}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
            {guides
              .filter(g => g.name?.toLowerCase().includes(search.toLowerCase()))
              .map((guide) => (
                <Box
                  key={guide.userId}
                  onClick={() => {
                    setSelectedGuide(guide);
                    setRating(0);
                    setReview('');
                  }}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 1.5,
                    px: 3,
                    py: 2.5,
                    width: { xs: '100%', sm: 'auto' },
                    minWidth: { xs: 0, sm: 200 },
                    borderRadius: 3,
                    border: selectedGuide?.userId === guide.userId ? '2px solid #10b981' : '1.5px solid #ececec',
                    bgcolor: selectedGuide?.userId === guide.userId ? '#f0fdf4' : '#fff',
                    boxShadow: selectedGuide?.userId === guide.userId ? 2 : 0,
                    cursor: 'pointer',
                    transition: 'all 0.18s',
                    '&:hover': {
                      borderColor: '#10b981',
                      boxShadow: 1
                    }
                  }}
                >
                  <Avatar src={guide.avatar} alt={guide.name} sx={{ width: 56, height: 56 }} />
                  <Typography fontWeight={700} textAlign="center">{guide.name}</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Rating value={guide.rating} precision={0.1} readOnly size="small" sx={{ color: '#FFD600' }} />
                    <Typography fontSize={13} color="text.secondary">
                      {guide.rating?.toFixed(1) || '0'}
                    </Typography>
                  </Box>
                </Box>
              ))}
          </Box>

          {/* Review Form */}
          {selectedGuide && (
            <>
              <Box sx={{ bgcolor: '#fff', borderRadius: 3, boxShadow: 1, p: 4, maxWidth: 900, mb: 4 }}>
                <Typography variant="h5" fontWeight={700} mb={2}>
                  ⭐ Write a Review for {selectedGuide.name}
                </Typography>
                
                <Box sx={{ mb: 3, p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #86efac' }}>
                  <Typography variant="body2" sx={{ color: '#166534' }}>
                    ✅ Tour: <strong>{selectedGuide.destination}</strong> <br/>
                    Your honest feedback helps guides improve and helps other tourists make informed decisions.
                  </Typography>
                </Box>

                <Typography fontWeight={600} mb={2}>
                  ⭐ Rating
                </Typography>
                <Rating
                  value={rating}
                  onChange={(_, newValue) => setRating(newValue)}
                  size="large"
                  sx={{ color: '#FFD600', mb: 3 }}
                />

                <Typography fontWeight={600} mb={2}>
                  💬 Your Review
                </Typography>
                <TextField
                  multiline
                  minRows={4}
                  fullWidth
                  placeholder={`Share your experience with this guide...`}
                  value={review}
                  onChange={e => setReview(e.target.value)}
                  sx={{ bgcolor: '#fcfdf8', borderRadius: 2, mb: 3 }}
                />

                <Box sx={{ display: 'flex', gap: 2 }}>
                  <Button
                    variant="contained"
                    color="primary"
                    size="large"
                    disabled={loading || !rating || !review.trim()}
                    sx={{ borderRadius: 3, px: 4, bgcolor: '#10b981', '&:hover': { bgcolor: '#059669' } }}
                    onClick={handleSubmit}
                  >
                    {loading ? 'Submitting...' : 'Submit Review'}
                  </Button>
                  <Button
                    variant="outlined"
                    size="large"
                    sx={{ borderRadius: 3, px: 4 }}
                    onClick={() => {
                      setSelectedGuide(null);
                      setRating(0);
                      setReview('');
                    }}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            </>
          )}

          {/* Reviews Display */}
          {selectedGuide && (
            <Box sx={{ bgcolor: '#fff', borderRadius: 3, boxShadow: 1, p: 4, maxWidth: 900 }}>
              <Typography variant="h5" fontWeight={700} mb={3}>
                📝 Reviews for {selectedGuide.name}
              </Typography>
              {reviews.length === 0 ? (
                <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
                  No reviews yet for this guide. Be the first to review!
                </Typography>
              ) : (
                reviews.map((r, idx) => (
                  <Box key={r._id || idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 3, p: 2, borderRadius: 3, boxShadow: 1, bgcolor: '#f9f9f9' }}>
                    <Avatar src={r.userId?.avatar || ''} sx={{ width: 48, height: 48 }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography fontWeight={700}>{r.userId?.name || 'Tourist'}</Typography>
                      <Rating value={r.rating} readOnly size="small" sx={{ mb: 0.5 }} />
                      <Typography fontSize={12} color="text.secondary" sx={{ mb: 1 }}>
                        {new Date(r.createdAt).toLocaleDateString()}
                      </Typography>
                      <Typography fontSize={15}>{r.comment}</Typography>
                    </Box>
                  </Box>
                ))
              )}
            </Box>
          )}
        </>
      )}
    </Box>
  );
}
