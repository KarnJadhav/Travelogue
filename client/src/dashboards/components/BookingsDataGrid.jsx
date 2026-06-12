import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Button from '../../common/Button';
import Modal from '@mui/material/Modal';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';


export default function BookingsDataGrid({ bookings = [], onStatusChange }) {
  const [openChat, setOpenChat] = useState(false);
  const [chatBookingId, setChatBookingId] = useState(null);
  const [openReviewDialog, setOpenReviewDialog] = useState(false);
  const [reviewMsg, setReviewMsg] = useState('Thank you for exploring Jaipur with me 😊\nIf you have a moment, I’d love to hear your feedback.');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [sending, setSending] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [openCompleteTourDialog, setOpenCompleteTourDialog] = useState(false);
  const [completeTourMessage, setCompleteTourMessage] = useState('Thank you for joining me on this amazing tour! Please share your feedback when you have a moment.');
  const api = require('../../api').default;

  const handleCompleteTour = async (bookingId) => {
    setSending(true);
    try {
      // Only call /booking/complete/:id - this endpoint creates the notification internally
      await api.post(`/booking/complete/${bookingId}`, { message: completeTourMessage });
      setOpenCompleteTourDialog(false);
      setCompleteTourMessage('Thank you for joining me on this amazing tour! Please share your feedback when you have a moment.');
      setSnackbar({ open: true, message: 'Tour marked as completed! Review request sent to tourist.', severity: 'success' });
      if (onStatusChange) onStatusChange();
    } catch (err) {
      console.error('[BookingsDataGrid] Error completing tour:', err);
      setSnackbar({ open: true, message: 'Failed to complete tour: ' + (err.response?.data?.message || err.message), severity: 'error' });
    } finally {
      setSending(false);
    }
  };

  return (
    <Box>
      {bookings.length === 0 ? (
        <Typography>No bookings found.</Typography>
      ) : (
        bookings.map((booking) => (
          <Box key={booking._id} sx={{ bgcolor: '#fff', borderRadius: 3, boxShadow: 2, p: 3, mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography fontWeight={700} fontSize={20} mb={1}>{booking.destination || 'Tour'}</Typography>
              <Chip label={booking.status} color={booking.status === 'pending' ? 'warning' : booking.status === 'confirmed' ? 'success' : booking.status === 'completed' ? 'info' : 'default'} size="small" sx={{ mb: 1 }} />
              <Typography fontSize={15} color="text.secondary">{new Date(booking.startDateTime).toLocaleDateString()} </Typography>
              <Typography fontSize={15} color="text.secondary">Tourist: {booking.touristId?.name || booking.touristId}</Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography fontWeight={700} color="green" fontSize={22}>₹{booking.price || 0}</Typography>
              <Typography fontSize={13} color="text.secondary">Total Price</Typography>
              <Box mt={2} sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <Button onClick={() => { setChatBookingId(booking._id); setOpenChat(true); }} className="bg-green-600 hover:bg-green-700">Chat</Button>
                
                {/* Show complete tour button for confirmed bookings */}
                {booking.status === 'confirmed' && !booking.reviewRequestSent && (
                  <Button 
                    onClick={() => { 
                      setSelectedBookingId(booking._id); 
                      setOpenCompleteTourDialog(true);
                      setCompleteTourMessage('Thank you for joining me on this amazing tour! Please share your feedback when you have a moment.');
                    }} 
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    Complete Tour
                  </Button>
                )}
                
                {/* Show review request button for completed bookings */}
                {booking.status === 'completed' && !booking.reviewRequestSent && (
                  <Button onClick={() => { setSelectedBookingId(booking._id); setOpenReviewDialog(true); setReviewMsg('Thank you for exploring with me 😊\nIf you have a moment, I'd love to hear your feedback.'); }} className="bg-blue-600 hover:bg-blue-700">Request Review</Button>
                )}
                
                {/* Show sent status if already sent */}
                {booking.reviewRequestSent && booking.reviewRequestStatus === 'accepted' && (
                  <Chip label="✅ Review Accepted" color="success" size="small" />
                )}
                {booking.reviewRequestSent && booking.reviewRequestStatus === 'declined' && (
                  <Tooltip title={booking.touristDeclineMessage || 'Tourist declined to leave a review'}>
                    <Chip 
                      label="❌ Review Declined" 
                      color="error" 
                      size="small"
                      sx={{ cursor: 'help' }}
                    />
                  </Tooltip>
                )}
                {booking.reviewRequestSent && !booking.reviewRequestStatus && (
                  <Chip label="⏳ Review Pending" color="warning" size="small" />
                )}
              </Box>
            </Box>
          </Box>
        ))
      )}
      
      {/* Chat Modal */}
      <Modal open={openChat} onClose={() => setOpenChat(false)}>
        <Box sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', bgcolor: '#f8fdf7', borderRadius: 2, boxShadow: 4, p: 0, minWidth: 700, minHeight: 500 }}>
          {openChat && chatBookingId && (
            <ChatPanel bookingId={chatBookingId} />
          )}
        </Box>
      </Modal>

      {/* Complete Tour Dialog */}
      <Dialog open={openCompleteTourDialog} onClose={() => setOpenCompleteTourDialog(false)}>
        <DialogTitle>Complete Tour & Request Review</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2, p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #86efac' }}>
            <Typography variant="body2" color="#166534" fontWeight={600}>
              ✅ This will mark the tour as completed and send a review request to the tourist
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
            Message to send to the tourist:
          </Typography>
          <TextField
            label="Review Request Message"
            multiline
            minRows={3}
            fullWidth
            value={completeTourMessage}
            onChange={e => setCompleteTourMessage(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCompleteTourDialog(false)} disabled={sending}>Cancel</Button>
          <Button
            onClick={() => handleCompleteTour(selectedBookingId)}
            disabled={sending}
            variant="contained"
            color="primary"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {sending ? 'Completing...' : 'Complete & Send Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Review Request Dialog */}
      <Dialog open={openReviewDialog} onClose={() => setOpenReviewDialog(false)}>
        <DialogTitle>Send Review Request</DialogTitle>
        <DialogContent>
          <TextField
            label="Message to Tourist"
            multiline
            minRows={3}
            fullWidth
            value={reviewMsg}
            onChange={e => setReviewMsg(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReviewDialog(false)}>Cancel</Button>
          <Button
            onClick={async () => {
              setSending(true);
              try {
                await api.post('/notifications/guide/complete-tour', {
                  bookingId: selectedBookingId,
                  message: reviewMsg
                });
                setOpenReviewDialog(false);
                setSelectedBookingId(null);
                setSnackbar({
                  open: true,
                  message: 'Review request sent to tourist!',
                  severity: 'success'
                });
                if (onStatusChange) onStatusChange();
              } catch (err) {
                setSnackbar({
                  open: true,
                  message: 'Failed to send review request: ' + (err.response?.data?.error || err.message),
                  severity: 'error'
                });
              } finally {
                setSending(false);
              }
            }}
            disabled={sending}
            variant="contained"
            color="primary"
          >
            {sending ? 'Sending...' : 'Send Request'}
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
