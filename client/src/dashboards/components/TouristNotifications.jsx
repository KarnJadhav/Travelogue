import React, { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Avatar from '@mui/material/Avatar';
import Chip from '@mui/material/Chip';
import Rating from '@mui/material/Rating';
import TextField from '@mui/material/TextField';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import api from '../../api';

export default function TouristNotifications({ onReview, onActionComplete }) {
  const [notifications, setNotifications] = useState([]);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [replyDialogOpen, setReplyDialogOpen] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const [replyValue, setReplyValue] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Review form states
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewStep, setReviewStep] = useState(0); // 0: confirmation, 1: form
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: '',
    place: ''
  });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [currentBookingId, setCurrentBookingId] = useState(null);
  const [currentGuideId, setCurrentGuideId] = useState(null);
  const [declineMessage, setDeclineMessage] = useState('');

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 10 seconds
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications/tourist');
      console.log('[TouristNotifications] Fetched notifications:', res.data.notifications);
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('[TouristNotifications] Failed to fetch notifications:', err);
      setNotifications([]);
    }
  };

  const handleDeclineClick = (notif) => {
    setSelectedNotif({ ...notif, action: 'decline' });
    setDeclineMessage('');
    setReplyDialogOpen(true);
  };

  const handleAcceptClick = (notif) => {
    setSelectedNotif(notif);
    setCurrentBookingId(notif.bookingId);
    setCurrentGuideId(notif.guideId);
    setReviewStep(0);
    setReviewForm({ rating: 0, comment: '', place: '' });
    setReviewDialogOpen(true);
  };

  const handleSendDecline = async () => {
    setLoading(true);
    try {
      console.log('[TouristNotifications] Sending decline response:', {
        notificationId: selectedNotif.id,
        action: 'decline',
        message: declineMessage
      });
      
      await api.post('/notifications/tourist/respond', {
        notificationId: selectedNotif.id,
        action: 'decline',
        message: declineMessage || 'I prefer not to leave a review at this time.'
      });
      
      setNotifications((prev) => prev.filter((n) => n.id !== selectedNotif.id));
      setReplyDialogOpen(false);
      setSnackbar({ 
        open: true, 
        message: 'You have declined to leave a review. The guide has been notified.',
        severity: 'info' 
      });
      
      // Trigger parent refresh
      if (onActionComplete) {
        console.log('[TouristNotifications] Calling onActionComplete callback after decline');
        onActionComplete();
      }
    } catch (err) {
      console.error('[TouristNotifications] Failed to send decline:', err);
      setSnackbar({ 
        open: true, 
        message: 'Failed to respond: ' + (err.response?.data?.error || err.message), 
        severity: 'error' 
      });
    }
    setLoading(false);
  };

  const handleAcceptTour = async () => {
    setLoading(true);
    try {
      console.log('[TouristNotifications] Accepting tour completion');
      
      await api.post('/notifications/tourist/respond', {
        notificationId: selectedNotif.id,
        action: 'accept',
        message: 'I confirm the tour is complete'
      });
      
      setReviewStep(1); // Move to form step
      setSnackbar({
        open: true,
        message: 'Thank you! Please share your review below.',
        severity: 'success'
      });
      
      // Trigger parent refresh to update ReviewsPanel
      if (onActionComplete) {
        console.log('[TouristNotifications] Calling onActionComplete callback');
        onActionComplete();
      }
    } catch (err) {
      console.error('[TouristNotifications] Failed to accept tour:', err);
      setSnackbar({
        open: true,
        message: 'Failed to confirm: ' + (err.response?.data?.error || err.message),
        severity: 'error'
      });
    }
    setLoading(false);
  };

  const handleSubmitReview = async () => {
    if (reviewForm.rating === 0 || !reviewForm.comment.trim()) {
      setSnackbar({
        open: true,
        message: 'Please provide a rating and comment',
        severity: 'warning'
      });
      return;
    }

    setReviewSubmitting(true);
    try {
      console.log('[TouristNotifications] Submitting review:', {
        bookingId: currentBookingId,
        ...reviewForm
      });
      
      await api.post('/review', {
        guideId: currentGuideId,
        bookingId: currentBookingId,
        place: reviewForm.place || selectedNotif.tourName,
        rating: reviewForm.rating,
        comment: reviewForm.comment
      });
      
      setNotifications((prev) => prev.filter((n) => n.id !== selectedNotif.id));
      setReviewDialogOpen(false);
      setReviewStep(0);
      setReviewForm({ rating: 0, comment: '', place: '' });
      
      setSnackbar({
        open: true,
        message: 'Review submitted successfully! Thank you for your feedback.',
        severity: 'success'
      });
      
      if (onReview) {
        onReview();
      }
      if (onActionComplete) {
        onActionComplete();
      }
      window.dispatchEvent(new CustomEvent('guideReviewsUpdated', {
        detail: { guideId: currentGuideId },
      }));
    } catch (err) {
      console.error('[TouristNotifications] Failed to submit review:', err);
      setSnackbar({
        open: true,
        message: 'Failed to submit review: ' + (err.response?.data?.message || err.message),
        severity: 'error'
      });
    }
    setReviewSubmitting(false);
  };

  return (
    <Box sx={{ p: 3, maxWidth: '900px', mx: 'auto' }}>
      <Typography variant="h5" fontWeight={700} mb={3}>📬 Notifications</Typography>
      
      {notifications.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f9fafb', border: '2px dashed #e5e7eb' }}>
          <Typography variant="body1" color="text.secondary" fontWeight={600}>
            ✨ No pending notifications
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            You'll see tour completion requests and other updates here
          </Typography>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {notifications.map((notif) => (
            <Paper 
              key={notif.id} 
              sx={{ 
                p: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 2,
                bgcolor: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 3,
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  borderColor: '#1976d2'
                }
              }}
            >
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <Box sx={{ display: 'flex', gap: 2, flex: 1 }}>
                  <Avatar sx={{ bgcolor: '#dbeafe', color: '#1976d2', fontWeight: 700, width: 48, height: 48 }}>
                    {notif.guideName?.charAt(0)?.toUpperCase() || '?'}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      📍 {notif.tourName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      From: <strong>{notif.guideName}</strong>
                    </Typography>
                  </Box>
                </Box>
                <Chip 
                  label="⏳ Pending" 
                  size="small"
                  sx={{ 
                    bgcolor: '#fef3c7', 
                    color: '#92400e',
                    fontWeight: 700
                  }} 
                />
              </Box>

              {/* Message */}
              <Box sx={{ 
                p: 2.5, 
                bgcolor: '#f9fafb', 
                borderRadius: 2, 
                borderLeft: '4px solid #1976d2',
                fontStyle: 'italic',
                color: '#374151'
              }}>
                <Typography variant="body2">
                  💬 {notif.message}
                </Typography>
              </Box>

              {/* Action Buttons */}
              <Stack 
                direction="row" 
                spacing={2} 
                sx={{ 
                  mt: 1,
                  flexWrap: 'wrap',
                  gap: 2
                }}
              >
                <Button 
                  variant="contained"
                  sx={{
                    flex: 1,
                    minWidth: 150,
                    bgcolor: '#10b981',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    padding: '10px 20px',
                    '&:hover': {
                      bgcolor: '#059669'
                    }
                  }}
                  onClick={() => handleAcceptClick(notif)}
                >
                  ✅ Yes, Tour is Complete
                </Button>

                <Button 
                  variant="outlined"
                  sx={{
                    flex: 1,
                    minWidth: 150,
                    borderColor: '#ef4444',
                    color: '#ef4444',
                    textTransform: 'none',
                    fontWeight: 700,
                    borderRadius: 2,
                    padding: '10px 20px',
                    '&:hover': {
                      bgcolor: '#fee2e2',
                      borderColor: '#ef4444'
                    }
                  }}
                  onClick={() => handleDeclineClick(notif)}
                >
                  ❌ Can't Review Now
                </Button>
              </Stack>

              {/* Info Text */}
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                💡 Confirm if tour is complete to proceed to review, or let us know if you need more time
              </Typography>
            </Paper>
          ))}
        </Stack>
      )}

      {/* Decline Dialog */}
      <Dialog open={replyDialogOpen} onClose={() => setReplyDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
          ❌ Can't Review Right Now?
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
            Tour: <strong>{selectedNotif?.tourName}</strong> - Guide: <strong>{selectedNotif?.guideName}</strong>
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Let the guide know why you're not ready to review (optional):
          </Typography>
          <Box
            component="textarea"
            sx={{
              width: '100%',
              p: 2,
              border: '1px solid #e5e7eb',
              borderRadius: 2,
              fontFamily: 'inherit',
              fontSize: '0.9rem',
              resize: 'vertical',
              minHeight: 100,
              '&:focus': {
                outline: 'none',
                borderColor: '#1976d2',
                boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.1)'
              }
            }}
            placeholder="Tell the guide politely (e.g., need more time to think, tour not fully completed yet, etc.)"
            value={declineMessage}
            onChange={(e) => setDeclineMessage(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => setReplyDialogOpen(false)} 
            disabled={loading}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSendDecline}
            variant="contained"
            disabled={loading}
            sx={{ 
              textTransform: 'none', 
              fontWeight: 700,
              minWidth: 120,
              bgcolor: '#ef4444',
              '&:hover': {
                bgcolor: '#dc2626'
              }
            }}
          >
            {loading ? 'Sending...' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onClose={() => setReviewDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18 }}>
          ⭐ {selectedNotif?.tourName}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {/* Stepper */}
          <Stepper activeStep={reviewStep} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>Confirm</StepLabel>
            </Step>
            <Step>
              <StepLabel>Review</StepLabel>
            </Step>
          </Stepper>

          {reviewStep === 0 ? (
            // Confirmation Step
            <Box>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                Guide: <strong>{selectedNotif?.guideName}</strong>
              </Typography>
              
              <Box sx={{ 
                p: 2.5, 
                bgcolor: '#f0fdf4', 
                borderRadius: 2, 
                border: '1px solid #86efac',
                mb: 2
              }}>
                <Typography variant="body2" sx={{ color: '#166534' }}>
                  ✅ By confirming, you agree that the tour is complete and you're ready to share your feedback.
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                Your honest review helps the guide improve and helps other tourists make informed decisions.
              </Typography>
            </Box>
          ) : (
            // Review Form Step
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Rating
                </Typography>
                <Rating
                  value={reviewForm.rating}
                  onChange={(_, newValue) => setReviewForm({ ...reviewForm, rating: newValue })}
                  size="large"
                  sx={{ color: '#fbbf24' }}
                />
              </Box>

              <TextField
                label="Location/Place"
                fullWidth
                placeholder="e.g., Jaipur, Taj Mahal tour"
                value={reviewForm.place}
                onChange={(e) => setReviewForm({ ...reviewForm, place: e.target.value })}
                size="small"
              />

              <Box>
                <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                  Your Review
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  placeholder="Share your experience with this guide..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                />
              </Box>

              <Box sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2, border: '1px solid #fcd34d' }}>
                <Typography variant="caption" sx={{ color: '#92400e' }}>
                  💡 Tip: Be specific about what you enjoyed or what could be improved
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => {
              if (reviewStep === 1) {
                setReviewStep(0);
              } else {
                setReviewDialogOpen(false);
              }
            }} 
            disabled={loading || reviewSubmitting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {reviewStep === 1 ? 'Back' : 'Cancel'}
          </Button>
          <Button
            onClick={reviewStep === 0 ? handleAcceptTour : handleSubmitReview}
            variant="contained"
            disabled={loading || reviewSubmitting}
            sx={{ 
              textTransform: 'none', 
              fontWeight: 700,
              minWidth: 120,
              bgcolor: '#10b981',
              '&:hover': {
                bgcolor: '#059669'
              }
            }}
          >
            {loading || reviewSubmitting ? 'Submitting...' : reviewStep === 0 ? 'Next' : 'Submit Review'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
